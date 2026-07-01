package it.soli.service;

import it.soli.entity.Charity;
import it.soli.entity.Redemption;
import it.soli.entity.Task;
import it.soli.entity.Transaction;
import it.soli.entity.TransactionType;
import it.soli.entity.Wallet;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;

import java.time.Duration;
import java.util.UUID;

@ApplicationScoped
public class WalletService {

    /**
     * Calculates earned credits, retrieves or creates the user's wallet,
     * updates the balance, and registers the transaction.
     */
    // Base rate: credits earned per hour of effective service (FR-13)
    private static final double BASE_CREDITS_PER_HOUR = 6.0;

    // Upper bound on the effective duration used for credit calculation (8 hours)
    private static final long MAX_CREDITED_MINUTES = 8 * 60;

    // Joins the caller's transaction (task completion) so credits are committed atomically
    // with the COMPLETED status change.
    @Transactional
    public void assignCreditsForTask(Task task) {
        if (task.volunteerId == null) {
            return;
        }

        // 1. Calculate credits (FR-13)
        // A pre-set rewardCredits (> 0) acts as a manual override (e.g. admin-defined);
        // otherwise credits are derived from the effective check-in/check-out duration.
        int earnedCredits = task.rewardCredits != null && task.rewardCredits > 0
                ? task.rewardCredits
                : calculateCreditsFromDuration(task);

        if (earnedCredits <= 0) {
            return;
        }

        // Persist the final amount on the task so it can be shown in the UI / audited.
        // Reload within this transaction to update the managed entity.
        Task managedTask = Task.findById(task.id);
        if (managedTask != null) {
            managedTask.rewardCredits = earnedCredits;
        }

        // 2. Retrieve or create Wallet
        Wallet wallet = Wallet.find("userId", task.volunteerId).firstResult();
        if (wallet == null) {
            wallet = new Wallet();
            wallet.userId = task.volunteerId;
            wallet.balance = 0;
            wallet.persist();
        }

        // 3. Update balance
        wallet.balance += earnedCredits;

        // 4. Record transaction (FR-17)
        Transaction transaction = new Transaction();
        transaction.walletId = wallet.id;
        transaction.amount = earnedCredits;
        transaction.transactionType = TransactionType.EARN_TASK_REWARD;
        transaction.referenceId = task.id; // Link to the task
        transaction.persist();
    }

    /**
     * Credits = effective duration (check-out - check-in) at {@link #BASE_CREDITS_PER_HOUR}
     * credits/hour, scaled by the task's criticality and category multipliers (FR-13).
     * Minimum 1 credit for any completed task with a positive duration.
     */
    private int calculateCreditsFromDuration(Task task) {
        if (task.checkInAt == null || task.checkOutAt == null) {
            return 0;
        }

        // Use seconds so that short (sub-minute) tasks still earn the minimum 1 credit.
        long seconds = Duration.between(task.checkInAt, task.checkOutAt).getSeconds();
        if (seconds <= 0) {
            return 0;
        }
        // Safeguard: cap the effective duration so a long gap between acceptance and
        // completion (double-confirmation flow) cannot produce an abnormal credit amount.
        double minutes = Math.min(seconds / 60.0, (double) MAX_CREDITED_MINUTES);

        double base = (minutes / 60.0) * BASE_CREDITS_PER_HOUR;
        double credits = base
                * task.urgencyLevel.getCreditMultiplier()
                * task.category.getCreditMultiplier();

        return Math.max(1, (int) Math.round(credits));
    }

    /**
     * Atomically redeems a voucher from a benefit organization: locks the wallet,
     * validates funds and stock, debits the credits, decrements the stock, issues a
     * voucher ({@link Redemption}) and records a SPEND_DONATION transaction referencing
     * the charity. The whole operation runs in a single transaction, so it is atomic and
     * consistent (any failure rolls everything back).
     *
     * @throws IllegalArgumentException if the wallet or charity does not exist (→ 404)
     * @throws IllegalStateException    if the charity is inactive, out of stock, or the
     *                                  balance is insufficient (→ 409)
     */
    @Transactional
    public Redemption redeemCharity(UUID userId, UUID charityId) {
        // Pessimistic lock on the wallet prevents concurrent double-spending.
        Wallet wallet = Wallet.find("userId", userId).withLock(LockModeType.PESSIMISTIC_WRITE).firstResult();
        if (wallet == null) {
            throw new IllegalArgumentException("Wallet not found.");
        }

        Charity charity = Charity.findById(charityId);
        if (charity == null) {
            throw new IllegalArgumentException("Charity not found.");
        }
        if (!Boolean.TRUE.equals(charity.isActive)) {
            throw new IllegalStateException("Questo ente benefico non è più disponibile.");
        }
        if (charity.stockRemaining == null || charity.stockRemaining <= 0) {
            throw new IllegalStateException("Buoni esauriti per questo ente.");
        }
        if (wallet.balance < charity.costInCredits) {
            throw new IllegalStateException("Crediti insufficienti per il riscatto.");
        }

        // Debit credits and decrement stock
        wallet.balance -= charity.costInCredits;
        charity.stockRemaining -= 1;

        // Issue the voucher
        Redemption redemption = new Redemption();
        redemption.userId = userId;
        redemption.charityId = charity.id;
        redemption.voucherCode = generateVoucherCode();
        redemption.creditsSpent = charity.costInCredits;
        redemption.persist();

        // Record the spend transaction, referencing the charity (the benefit entity)
        Transaction transaction = new Transaction();
        transaction.walletId = wallet.id;
        transaction.amount = -charity.costInCredits;
        transaction.transactionType = TransactionType.SPEND_DONATION;
        transaction.referenceId = charity.id;
        transaction.persist();

        return redemption;
    }

    private String generateVoucherCode() {
        return "SOLI-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }
}
