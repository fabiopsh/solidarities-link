import { useState, useEffect } from "react";
import {
	Box,
	Typography,
	Card,
	CardContent,
	Grid,
	Button,
	CircularProgress,
	Chip,
	Stack,
	Paper,
	Alert,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Snackbar,
	Divider,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import StarsIcon from "@mui/icons-material/Stars";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import RedeemIcon from "@mui/icons-material/Redeem";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import api from "../api";
import type { Wallet, Transaction, TransactionType } from "../types/models/Wallet";
import type { Charity, Redemption } from "../types/models/Charity";

// Gradient per cause, so each charity card has a coherent look.
const CAUSE_GRADIENT: Record<string, string> = {
	Alimentare: "linear-gradient(135deg, #E65100 0%, #FF9800 100%)",
	Sanità: "linear-gradient(135deg, #C62828 0%, #EF5350 100%)",
	Ambiente: "linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)",
};
const DEFAULT_GRADIENT = "linear-gradient(135deg, #00796B 0%, #26A69A 100%)";

export default function WalletPage() {
	const [wallet, setWallet] = useState<Wallet | null>(null);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [charities, setCharities] = useState<Charity[]>([]);
	const [redemptions, setRedemptions] = useState<Redemption[]>([]);
	const [loading, setLoading] = useState(true);
	const [walletNotFound, setWalletNotFound] = useState(false);

	// Redeem dialog state (two-step confirmation)
	const [selectedCharity, setSelectedCharity] = useState<Charity | null>(null);
	const [redeemStep, setRedeemStep] = useState<0 | 1>(0);
	const [redeeming, setRedeeming] = useState(false);
	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
		open: false,
		message: "",
		severity: "success",
	});

	const balance = wallet?.balance ?? 0;

	const fetchData = async () => {
		try {
			try {
				const walletRes = await api.get("/api/wallets/my");
				setWallet(walletRes.data);
				setWalletNotFound(false);
			} catch (err: any) {
				if (err?.response?.status === 404) {
					setWalletNotFound(true);
					setWallet(null);
				} else {
					throw err;
				}
			}

			try {
				const txRes = await api.get("/api/wallets/my/transactions", { params: { page: 0, size: 50 } });
				setTransactions(txRes.data.data || []);
			} catch {
				// No wallet/transactions yet
			}

			try {
				const charRes = await api.get("/api/charities", { params: { page: 0, size: 50 } });
				setCharities(charRes.data.data || []);
			} catch {
				// Charities unavailable
			}

			try {
				const redRes = await api.get("/api/charities/my/redemptions", { params: { page: 0, size: 50 } });
				setRedemptions(redRes.data.data || []);
			} catch {
				// No redemptions yet
			}
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const openRedeem = (charity: Charity) => {
		setSelectedCharity(charity);
		setRedeemStep(0);
	};

	const closeRedeem = () => {
		if (redeeming) return;
		setSelectedCharity(null);
		setRedeemStep(0);
	};

	const handleConfirmRedeem = async () => {
		if (!selectedCharity) return;
		setRedeeming(true);
		try {
			const res = await api.post(`/api/charities/${selectedCharity.id}/redeem`);
			const voucher: Redemption = res.data;
			setSnackbar({
				open: true,
				message: `Riscatto completato! Codice buono: ${voucher.voucherCode}`,
				severity: "success",
			});
			setSelectedCharity(null);
			setRedeemStep(0);
			await fetchData();
		} catch (err: any) {
			const errorMsg = err?.response?.data?.error || "Errore durante il riscatto.";
			setSnackbar({ open: true, message: errorMsg, severity: "error" });
		} finally {
			setRedeeming(false);
		}
	};

	const getTransactionIcon = (type: TransactionType) => {
		switch (type) {
			case "EARN_TASK_REWARD":
				return <ArrowUpwardIcon sx={{ color: "#2E7D32" }} />;
			case "SPEND_DONATION":
				return <ArrowDownwardIcon sx={{ color: "#E65100" }} />;
			case "ADJUSTMENT":
				return <SwapHorizIcon sx={{ color: "#757575" }} />;
		}
	};

	const getTransactionLabel = (type: TransactionType) => {
		switch (type) {
			case "EARN_TASK_REWARD":
				return "Ricompensa Task";
			case "SPEND_DONATION":
				return "Riscatto buono";
			case "ADJUSTMENT":
				return "Aggiustamento";
		}
	};

	const getTransactionChipColor = (type: TransactionType): "success" | "warning" | "default" => {
		switch (type) {
			case "EARN_TASK_REWARD":
				return "success";
			case "SPEND_DONATION":
				return "warning";
			case "ADJUSTMENT":
				return "default";
		}
	};

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box sx={{ maxWidth: 1000, mx: "auto" }}>
			<Typography variant="h4" fontWeight={700} gutterBottom>
				Wallet 💰
			</Typography>
			<Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
				Il tuo portafoglio digitale SOLI — accumula crediti e convertili in buoni degli enti benefici.
			</Typography>

			{/* Balance Hero Section */}
			<Paper
				elevation={8}
				sx={{
					mb: 5,
					borderRadius: 4,
					overflow: "hidden",
					background: "linear-gradient(135deg, #00796B 0%, #004D40 50%, #00695C 100%)",
					color: "white",
					position: "relative",
				}}
			>
				{/* Decorative circles */}
				<Box sx={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
				<Box sx={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
				<Box sx={{ position: "absolute", top: 20, right: 60, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />

				<Box sx={{ p: { xs: 4, md: 6 }, position: "relative", zIndex: 1 }}>
					<Grid container spacing={4} alignItems="center">
						<Grid size={{ xs: 12, md: 7 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
								<AccountBalanceWalletIcon sx={{ fontSize: 48, opacity: 0.9 }} />
								<Typography variant="body1" sx={{ opacity: 0.85, fontWeight: 500 }}>
									Saldo Disponibile
								</Typography>
							</Box>
							<Typography
								variant="h1"
								fontWeight={900}
								sx={{ fontSize: { xs: "3rem", md: "4.5rem" }, letterSpacing: -2, lineHeight: 1, mb: 1 }}
							>
								{walletNotFound ? "—" : balance}
							</Typography>
							<Typography variant="h5" sx={{ opacity: 0.7, fontWeight: 500 }}>
								Crediti SOLI
							</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 5 }}>
							<Stack spacing={2}>
								<Paper sx={{ p: 2, borderRadius: 2, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", gap: 2 }}>
									<TrendingUpIcon />
									<Box>
										<Typography variant="body2" sx={{ opacity: 0.7 }}>
											Guadagnati
										</Typography>
										<Typography variant="h6" fontWeight={700}>
											{transactions
												.filter((t) => t.transactionType === "EARN_TASK_REWARD")
												.reduce((sum, t) => sum + t.amount, 0)}
										</Typography>
									</Box>
								</Paper>
								<Paper sx={{ p: 2, borderRadius: 2, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", gap: 2 }}>
									<StarsIcon />
									<Box>
										<Typography variant="body2" sx={{ opacity: 0.7 }}>
											Transazioni
										</Typography>
										<Typography variant="h6" fontWeight={700}>
											{transactions.length}
										</Typography>
									</Box>
								</Paper>
							</Stack>
						</Grid>
					</Grid>
				</Box>
			</Paper>

			{walletNotFound && (
				<Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
					Il tuo wallet verrà creato automaticamente al completamento del primo task come volontario.
				</Alert>
			)}

			<Grid container spacing={4}>
				{/* Transaction History */}
				<Grid size={{ xs: 12, md: 7 }}>
					<Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
						📊 Storico Transazioni
					</Typography>

					{transactions.length === 0 ? (
						<Card sx={{ borderRadius: 3, p: 4, textAlign: "center" }}>
							<AccountBalanceWalletIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
							<Typography variant="h6" color="text.secondary">
								Nessuna transazione ancora.
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
								Completa dei task come volontario per iniziare a guadagnare crediti!
							</Typography>
						</Card>
					) : (
						<Stack spacing={1.5}>
							{transactions
								.slice()
								.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
								.map((tx) => (
									<Card
										key={tx.id}
										sx={{ borderRadius: 2, transition: "transform 0.15s", "&:hover": { transform: "translateX(4px)" } }}
									>
										<CardContent sx={{ py: 2, px: 3, "&:last-child": { pb: 2 } }}>
											<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
												<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
													{getTransactionIcon(tx.transactionType)}
													<Box>
														<Typography variant="body1" fontWeight={600} sx={{ wordBreak: "break-word" }}>
															{getTransactionLabel(tx.transactionType)}
														</Typography>
														<Typography variant="caption" color="text.secondary">
															{new Date(tx.timestamp).toLocaleString("it-IT")}
														</Typography>
													</Box>
												</Box>
												<Box sx={{ textAlign: { xs: "left", sm: "right" }, width: { xs: "100%", sm: "auto" } }}>
													<Typography
														variant="h6"
														fontWeight={700}
														color={
															tx.transactionType === "EARN_TASK_REWARD"
																? "success.main"
																: tx.transactionType === "SPEND_DONATION"
																	? "warning.main"
																	: "text.primary"
														}
													>
														{tx.amount > 0 ? "+" : ""}
														{tx.amount}
													</Typography>
													<Chip
														label={getTransactionLabel(tx.transactionType)}
														color={getTransactionChipColor(tx.transactionType)}
														size="small"
														sx={{ fontSize: "0.65rem" }}
													/>
												</Box>
											</Box>
										</CardContent>
									</Card>
								))}
						</Stack>
					)}

					{/* My redeemed vouchers */}
					{redemptions.length > 0 && (
						<Box sx={{ mt: 5 }}>
							<Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
								🎟️ I miei buoni
							</Typography>
							<Stack spacing={1.5}>
								{redemptions
									.slice()
									.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
									.map((r) => {
										const charity = charities.find((c) => c.id === r.charityId);
										return (
											<Card key={r.id} sx={{ borderRadius: 2 }}>
												<CardContent sx={{ py: 2, px: 3, "&:last-child": { pb: 2 } }}>
													<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
														<ConfirmationNumberIcon sx={{ color: "secondary.main" }} />
														<Box sx={{ flexGrow: 1, minWidth: 160 }}>
															<Typography variant="body1" fontWeight={700}>
																{charity ? charity.voucherLabel : "Buono"}
															</Typography>
															<Typography variant="caption" color="text.secondary">
																{charity ? charity.name : ""} · {new Date(r.createdAt).toLocaleDateString("it-IT")}
															</Typography>
														</Box>
														<Chip
															label={r.voucherCode}
															color="secondary"
															variant="outlined"
															sx={{ fontWeight: 700, fontFamily: "monospace" }}
														/>
													</Box>
												</CardContent>
											</Card>
										);
									})}
							</Stack>
						</Box>
					)}
				</Grid>

				{/* Benefit organizations marketplace */}
				<Grid size={{ xs: 12, md: 5 }}>
					<Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
						🎁 Enti benefici
					</Typography>

					{charities.length === 0 ? (
						<Card sx={{ borderRadius: 3, p: 4, textAlign: "center" }}>
							<VolunteerActivismIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
							<Typography variant="body2" color="text.secondary">
								Nessun ente disponibile al momento.
							</Typography>
						</Card>
					) : (
						<Stack spacing={2}>
							{charities.map((charity) => {
								const outOfStock = charity.stockRemaining <= 0;
								const notEnough = balance < charity.costInCredits;
								return (
									<Card
										key={charity.id}
										sx={{
											borderRadius: 3,
											overflow: "hidden",
											transition: "transform 0.2s, box-shadow 0.2s",
											"&:hover": { transform: "translateY(-3px)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" },
										}}
									>
										<Box sx={{ background: CAUSE_GRADIENT[charity.cause] || DEFAULT_GRADIENT, color: "white", p: 2.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
											<VolunteerActivismIcon sx={{ fontSize: 40 }} />
											<Box sx={{ flexGrow: 1, minWidth: 150 }}>
												<Typography variant="subtitle1" fontWeight={700} sx={{ wordBreak: "break-word" }}>
													{charity.name}
												</Typography>
												<Typography variant="caption" sx={{ opacity: 0.85 }}>
													{charity.cause}
												</Typography>
											</Box>
											<Chip
												label={`${charity.costInCredits} ⭐`}
												sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 700, fontSize: "0.8rem" }}
											/>
										</Box>
										<CardContent sx={{ py: 2, px: 2.5 }}>
											<Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
												Buono: {charity.voucherLabel}
											</Typography>
											{charity.description && (
												<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
													{charity.description}
												</Typography>
											)}
											<Typography variant="caption" color={outOfStock ? "error" : "text.secondary"} sx={{ display: "block", mb: 1.5 }}>
												{outOfStock ? "Buoni esauriti" : `${charity.stockRemaining} buoni disponibili`}
											</Typography>
											<Button
												variant="contained"
												size="small"
												fullWidth
												disabled={outOfStock || notEnough}
												startIcon={<RedeemIcon />}
												onClick={() => openRedeem(charity)}
												sx={{ borderRadius: 2 }}
											>
												{notEnough && !outOfStock ? "Crediti insufficienti" : "Riscatta"}
											</Button>
										</CardContent>
									</Card>
								);
							})}
						</Stack>
					)}
				</Grid>
			</Grid>

			{/* Two-step redeem confirmation dialog */}
			<Dialog open={Boolean(selectedCharity)} onClose={closeRedeem} fullWidth maxWidth="xs">
				{selectedCharity && (
					<>
						<DialogTitle>{redeemStep === 0 ? "Conferma riscatto" : "Sei sicuro?"}</DialogTitle>
						<DialogContent>
							{redeemStep === 0 ? (
								<Stack spacing={1} sx={{ mt: 0.5 }}>
									<Typography variant="body2">
										Ente: <strong>{selectedCharity.name}</strong>
									</Typography>
									<Typography variant="body2">
										Buono: <strong>{selectedCharity.voucherLabel}</strong>
									</Typography>
									<Typography variant="body2">
										Costo: <strong>{selectedCharity.costInCredits} crediti</strong>
									</Typography>
									<Divider sx={{ my: 1 }} />
									<Typography variant="body2" color="text.secondary">
										Saldo attuale: {balance} → dopo il riscatto: {balance - selectedCharity.costInCredits} crediti
									</Typography>
								</Stack>
							) : (
								<Typography variant="body2">
									Confermi il riscatto del buono <strong>{selectedCharity.voucherLabel}</strong> per{" "}
									<strong>{selectedCharity.costInCredits} crediti</strong>? L'operazione scala i crediti dal tuo wallet e non è reversibile.
								</Typography>
							)}
						</DialogContent>
						<DialogActions sx={{ p: 2 }}>
							<Button onClick={closeRedeem} disabled={redeeming}>
								Annulla
							</Button>
							{redeemStep === 0 ? (
								<Button variant="contained" onClick={() => setRedeemStep(1)}>
									Procedi
								</Button>
							) : (
								<Button
									variant="contained"
									color="secondary"
									onClick={handleConfirmRedeem}
									disabled={redeeming}
									startIcon={redeeming ? <CircularProgress size={16} color="inherit" /> : <RedeemIcon />}
								>
									{redeeming ? "Riscatto..." : "Conferma riscatto"}
								</Button>
							)}
						</DialogActions>
					</>
				)}
			</Dialog>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={6000}
				onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					severity={snackbar.severity}
					onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
					variant="filled"
					sx={{ width: "100%" }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	);
}
