import { DollarSign, Edit, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
	addCustomCurrency,
	getCurrencyConversionSearchUrl,
	getCurrencyDetails,
	removeCustomCurrency,
	updateCurrencyRate,
} from "@/utils/currency";
import { CurrencyRate } from "./types";

export function CurrencyManagement() {
	const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
	const [newCurrencyCode, setNewCurrencyCode] = useState("");
	const [newCurrencyRate, setNewCurrencyRate] = useState<number>(1);
	const [isAddingCurrency, setIsAddingCurrency] = useState(false);
	const [deleteCurrencyConfirmOpen, setDeleteCurrencyConfirmOpen] =
		useState(false);
	const [currencyToDelete, setCurrencyToDelete] = useState<string | null>(null);

	const fetchCurrencyRates = useCallback(async () => {
		try {
			const rates = await getCurrencyDetails();
			setCurrencyRates(rates);
		} catch (error) {
			console.error("Error fetching currency rates:", error);
		}
	}, []);

	useEffect(() => {
		fetchCurrencyRates();
	}, [fetchCurrencyRates]);

	const addCurrency = async () => {
		if (!newCurrencyCode.trim() || newCurrencyRate <= 0) {
			toast({
				title: "Error",
				description: "Please provide a valid currency code and rate",
				variant: "destructive",
			});
			return;
		}

		setIsAddingCurrency(true);
		try {
			const result = await addCustomCurrency(
				newCurrencyCode.trim().toUpperCase(),
				newCurrencyRate,
			);

			if (result.success) {
				toast({
					title: "Success",
					description: "Currency added successfully",
				});
				setNewCurrencyCode("");
				setNewCurrencyRate(1);
				await fetchCurrencyRates();
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to add currency",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error adding currency:", error);
			toast({
				title: "Error",
				description: "Failed to add currency",
				variant: "destructive",
			});
		} finally {
			setIsAddingCurrency(false);
		}
	};

	const updateCurrency = async (currencyCode: string, newRate: number) => {
		try {
			const result = await updateCurrencyRate(currencyCode, newRate);
			if (result.success) {
				toast({
					title: "Success",
					description: "Currency rate updated successfully",
				});
				await fetchCurrencyRates();
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to update currency rate",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error updating currency:", error);
			toast({
				title: "Error",
				description: "Failed to update currency rate",
				variant: "destructive",
			});
		}
	};

	const deleteCurrency = (currencyCode: string) => {
		setCurrencyToDelete(currencyCode);
		setDeleteCurrencyConfirmOpen(true);
	};

	const confirmDeleteCurrency = async () => {
		if (!currencyToDelete) return;

		try {
			const result = await removeCustomCurrency(currencyToDelete);
			if (result.success) {
				toast({
					title: "Success",
					description: "Currency deleted successfully",
				});
				await fetchCurrencyRates();
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to delete currency",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error deleting currency:", error);
			toast({
				title: "Error",
				description: "Failed to delete currency",
				variant: "destructive",
			});
		} finally {
			setDeleteCurrencyConfirmOpen(false);
			setCurrencyToDelete(null);
		}
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<DollarSign className="size-5 text-primary" />
						Currency Management
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						<div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
							<h3 className="font-medium text-blue-800 mb-2">
								USD-Based Currency System
							</h3>
							<p className="text-sm text-blue-700 mb-4">
								All currency conversions are based on USD exchange rates. Add
								custom currencies with their USD rates for automatic
								cross-currency conversions.
							</p>
						</div>

						{/* Add New Currency */}
						<Card>
							<CardHeader>
								<CardTitle className="text-base md:text-lg lg:text-xl">Add Custom Currency</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
									<div className="space-y-2">
										<Label htmlFor="newCurrencyCode">Currency Code</Label>
										<Input
											id="newCurrencyCode"
											value={newCurrencyCode}
											onChange={(e) =>
												setNewCurrencyCode(e.target.value.toUpperCase())
											}
											placeholder="e.g. LKR, EUR, GBP"
											maxLength={5}
											className="uppercase"
										/>
										<p className="text-xs text-muted-foreground">
											3-5 uppercase letters
										</p>
									</div>
									<div className="space-y-2">
										<Label htmlFor="newCurrencyRate">USD Rate</Label>
										<Input
											id="newCurrencyRate"
											type="number"
											step="0.001"
											min="0.001"
											value={newCurrencyRate}
											onChange={(e) =>
												setNewCurrencyRate(Number(e.target.value))
											}
											placeholder="e.g. 300.50"
										/>
										<p className="text-xs text-muted-foreground">
											1 USD = {newCurrencyRate} {newCurrencyCode || "XXX"}
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											onClick={addCurrency}
											disabled={
												isAddingCurrency ||
												!newCurrencyCode.trim() ||
												newCurrencyRate <= 0
											}
											className="flex-1"
										>
											{isAddingCurrency ? "Adding..." : "Add Currency"}
										</Button>
										{newCurrencyCode && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() =>
													window.open(
														getCurrencyConversionSearchUrl(newCurrencyCode),
														"_blank",
													)
												}
												title={`Search USD to ${newCurrencyCode} conversion rate`}
											>
												Search Rate
											</Button>
										)}
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Current Currencies */}
						<Card>
							<CardHeader>
								<CardTitle className="text-base md:text-lg lg:text-xl">Current Currencies</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{currencyRates.length === 0 ? (
										<p className="text-muted-foreground text-center py-8">
											No currencies found. Add a custom currency to get started.
										</p>
									) : (
										currencyRates.map((currency) => (
											<div
												key={currency.currency_code}
												className="flex items-center justify-between p-4 border rounded-lg"
											>
												<div className="flex items-center gap-4">
													<div className="font-medium text-lg">
														{currency.currency_code}
													</div>
													<div className="text-sm text-muted-foreground">
														{currency.currency_code === "USD"
															? "US Dollar (Base Currency)"
															: currency.is_custom
																? "Custom Currency"
																: currency.currency_code}
													</div>
												</div>
												<div className="flex items-center gap-4">
													<div className="text-right">
														<div className="font-medium">
															1 USD = {currency.usd_rate}
														</div>
														<div className="text-xs text-muted-foreground">
															Last updated:{" "}
															{new Date(
																currency.updated_at,
															).toLocaleDateString()}
														</div>
													</div>
													<div className="flex gap-2">
														{currency.currency_code !== "USD" && (
															<>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => {
																		const newRate = prompt(
																			`Enter new USD rate for ${currency.currency_code}:`,
																			currency.usd_rate.toString(),
																		);
																		if (newRate && Number(newRate) > 0) {
																			updateCurrency(
																				currency.currency_code,
																				Number(newRate),
																			);
																		}
																	}}
																>
																	<Edit className="size-4" />
																</Button>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() =>
																		window.open(
																			getCurrencyConversionSearchUrl(
																				currency.currency_code,
																			),
																			"_blank",
																		)
																	}
																	title={`Search USD to ${currency.currency_code} conversion rate`}
																>
																	Search
																</Button>
																{currency.is_custom && (
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => {
																			deleteCurrency(currency.currency_code);
																		}}
																	>
																		<Trash2 className="size-4" />
																	</Button>
																)}
															</>
														)}
													</div>
												</div>
											</div>
										))
									)}
								</div>
							</CardContent>
						</Card>

						<div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
							<h4 className="font-medium text-amber-800 mb-2">
								Important Notes
							</h4>
							<ul className="text-sm text-amber-700 space-y-1">
								<li>
									• USD is the base currency and cannot be modified or deleted
								</li>
								<li>• All currency conversions are calculated via USD rates</li>
								<li>
									• Use the "Search Rate" button to find current exchange rates
									on Google
								</li>
								<li>• Custom currencies can be edited or deleted anytime</li>
								<li>
									• Changes apply to all reports and calculations immediately
								</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Delete Currency Confirmation */}
			<AlertDialog
				open={deleteCurrencyConfirmOpen}
				onOpenChange={setDeleteCurrencyConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Currency</AlertDialogTitle>
						<AlertDialogDescription>
							{currencyToDelete && (
								<>
									Are you sure you want to delete{" "}
									<strong>{currencyToDelete}</strong>? This action cannot be
									undone.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteCurrency}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
