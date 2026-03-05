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
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import StarsIcon from "@mui/icons-material/Stars";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import LocalCafeIcon from "@mui/icons-material/LocalCafe";
import MuseumIcon from "@mui/icons-material/Museum";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import api from "../api";
import type { Wallet, Transaction, TransactionType } from "../types/models/Wallet";

interface SponsorReward {
	title: string;
	sponsor: string;
	cost: number;
	description: string;
	icon: React.ReactNode;
	gradient: string;
}

const SPONSOR_REWARDS: SponsorReward[] = [
	{
		title: "Sconto Bus ATM",
		sponsor: "ATM Milano",
		cost: 50,
		description: "Abbonamento mensile scontato del 20% sul trasporto pubblico urbano.",
		icon: <DirectionsBusIcon sx={{ fontSize: 40 }} />,
		gradient: "linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)",
	},
	{
		title: "Buono Spesa",
		sponsor: "Coop Lombardia",
		cost: 80,
		description: "Buono spesa da €10 utilizzabile in tutti i punti vendita Coop.",
		icon: <ShoppingBagIcon sx={{ fontSize: 40 }} />,
		gradient: "linear-gradient(135deg, #E65100 0%, #FF9800 100%)",
	},
	{
		title: "Ingresso Museo Civico",
		sponsor: "Comune di Milano",
		cost: 30,
		description: "Ingresso gratuito ai musei civici per un'intera giornata.",
		icon: <MuseumIcon sx={{ fontSize: 40 }} />,
		gradient: "linear-gradient(135deg, #6A1B9A 0%, #AB47BC 100%)",
	},
	{
		title: "Caffè Sospeso",
		sponsor: "Bar Solidale",
		cost: 10,
		description: "Offri o ricevi un caffè sospeso presso i bar aderenti alla rete.",
		icon: <LocalCafeIcon sx={{ fontSize: 40 }} />,
		gradient: "linear-gradient(135deg, #4E342E 0%, #8D6E63 100%)",
	},
];

export default function WalletPage() {
	const [wallet, setWallet] = useState<Wallet | null>(null);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [walletNotFound, setWalletNotFound] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const walletRes = await api.get("/api/wallets/my");
				setWallet(walletRes.data);

				try {
					const txRes = await api.get("/api/wallets/my/transactions", { params: { page: 0, size: 50 } });
					setTransactions(txRes.data.data || []);
				} catch {
					// No transactions yet
				}
			} catch (err: any) {
				if (err?.response?.status === 404) {
					setWalletNotFound(true);
				}
				console.error("Error fetching wallet:", err);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

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
				return "Conversione Premio";
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
				Il tuo portafoglio digitale SOLI — accumula crediti e convertili in premi.
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
				<Box
					sx={{
						position: "absolute",
						top: -40,
						right: -40,
						width: 180,
						height: 180,
						borderRadius: "50%",
						background: "rgba(255,255,255,0.05)",
					}}
				/>
				<Box
					sx={{
						position: "absolute",
						bottom: -30,
						left: -30,
						width: 120,
						height: 120,
						borderRadius: "50%",
						background: "rgba(255,255,255,0.04)",
					}}
				/>
				<Box
					sx={{
						position: "absolute",
						top: 20,
						right: 60,
						width: 60,
						height: 60,
						borderRadius: "50%",
						background: "rgba(255,255,255,0.06)",
					}}
				/>

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
								sx={{
									fontSize: { xs: "3rem", md: "4.5rem" },
									letterSpacing: -2,
									lineHeight: 1,
									mb: 1,
								}}
							>
								{walletNotFound ? "—" : (wallet?.balance ?? 0)}
							</Typography>
							<Typography variant="h5" sx={{ opacity: 0.7, fontWeight: 500 }}>
								Crediti SOLI
							</Typography>
						</Grid>
						<Grid size={{ xs: 12, md: 5 }}>
							<Stack spacing={2}>
								<Paper
									sx={{
										p: 2,
										borderRadius: 2,
										background: "rgba(255,255,255,0.12)",
										backdropFilter: "blur(10px)",
										display: "flex",
										alignItems: "center",
										gap: 2,
									}}
								>
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
								<Paper
									sx={{
										p: 2,
										borderRadius: 2,
										background: "rgba(255,255,255,0.08)",
										backdropFilter: "blur(10px)",
										display: "flex",
										alignItems: "center",
										gap: 2,
									}}
								>
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
								.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
								.map((tx) => (
									<Card
										key={tx.id}
										sx={{
											borderRadius: 2,
											transition: "transform 0.15s",
											"&:hover": { transform: "translateX(4px)" },
										}}
									>
										<CardContent sx={{ py: 2, px: 3, "&:last-child": { pb: 2 } }}>
											<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
												<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
													{getTransactionIcon(tx.transactionType)}
													<Box>
														<Typography variant="body1" fontWeight={600}>
															{getTransactionLabel(tx.transactionType)}
														</Typography>
														<Typography variant="caption" color="text.secondary">
															{new Date(tx.timestamp).toLocaleString("it-IT")}
														</Typography>
													</Box>
												</Box>
												<Box sx={{ textAlign: "right" }}>
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
														{tx.transactionType === "EARN_TASK_REWARD"
															? "+"
															: tx.transactionType === "SPEND_DONATION"
																? "−"
																: ""}
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
				</Grid>

				{/* Marketplace / Sponsor Rewards */}
				<Grid size={{ xs: 12, md: 5 }}>
					<Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
						🎁 Premi & Sponsor
					</Typography>

					<Stack spacing={2}>
						{SPONSOR_REWARDS.map((reward) => (
							<Card
								key={reward.title}
								sx={{
									borderRadius: 3,
									overflow: "hidden",
									transition: "transform 0.2s, box-shadow 0.2s",
									"&:hover": { transform: "translateY(-3px)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" },
								}}
							>
								<Box
									sx={{
										background: reward.gradient,
										color: "white",
										p: 2.5,
										display: "flex",
										alignItems: "center",
										gap: 2,
									}}
								>
									{reward.icon}
									<Box sx={{ flexGrow: 1 }}>
										<Typography variant="subtitle1" fontWeight={700}>
											{reward.title}
										</Typography>
										<Typography variant="caption" sx={{ opacity: 0.85 }}>
											{reward.sponsor}
										</Typography>
									</Box>
									<Chip
										label={`${reward.cost} ⭐`}
										sx={{
											bgcolor: "rgba(255,255,255,0.2)",
											color: "white",
											fontWeight: 700,
											fontSize: "0.8rem",
										}}
									/>
								</Box>
								<CardContent sx={{ py: 2, px: 2.5 }}>
									<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
										{reward.description}
									</Typography>
									<Button
										variant="outlined"
										size="small"
										fullWidth
										disabled
										startIcon={<StorefrontIcon />}
										sx={{ borderRadius: 2 }}
									>
										Riscatta (Prossimamente)
									</Button>
								</CardContent>
							</Card>
						))}
					</Stack>
				</Grid>
			</Grid>
		</Box>
	);
}
