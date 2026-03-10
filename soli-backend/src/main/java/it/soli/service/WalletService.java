package it.soli.service;

import it.soli.entity.Task;
import it.soli.entity.Transaction;
import it.soli.entity.TransactionType;
import it.soli.entity.Wallet;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

@ApplicationScoped
public class WalletService {

    /**
     * Calculates earned credits, retrieves or creates the user's wallet,
     * updates the balance, and registers the transaction.
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    @jakarta.enterprise.context.control.ActivateRequestContext
    public void assignCreditsForTask(Task task) {
        if (task.volunteerId == null) {
            return;
        }

        // 1. Calculate credits (FR-13)
        // For testing/simplicity we use rewardCredits if set, otherwise calculate based on time or fixed
        int earnedCredits = task.rewardCredits != null && task.rewardCredits > 0 ? task.rewardCredits : calculateCreditsFromDuration(task);

        if (earnedCredits <= 0) {
            return;
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

    private int calculateCreditsFromDuration(Task task) {
        // Fallback: in a real implementation this would check checkIn time vs checkOut time
        // Since we didn't add timestamp fields for checkin/checkout we assign a fixed amount
        return 10;
    }
}
