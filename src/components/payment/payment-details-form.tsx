import { CurrencySelector } from "@/components/common/currency-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PaymentAccount, PaymentFormData } from "@/types/payment";

interface PaymentDetailsFormProps {
	formData: PaymentFormData;
	accounts: PaymentAccount[];
	compatibleAccounts: PaymentAccount[];
	onFormChange: (field: keyof PaymentFormData, value: any) => void;
	onCurrencyChange: (currency: string) => void;
}

export function PaymentDetailsForm({
	formData,
	accounts,
	compatibleAccounts,
	onFormChange,
	onCurrencyChange,
}: PaymentDetailsFormProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Payment Details</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label>Payment Type</Label>
						<Select
							value={formData.payment_type}
							onValueChange={(value) => onFormChange("payment_type", value)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="room_payment">Room Payment</SelectItem>
								<SelectItem value="advance_payment">Advance Payment</SelectItem>
								<SelectItem value="balance_payment">Balance Payment</SelectItem>
								<SelectItem value="Payment Type">Payment Type</SelectItem>
								<SelectItem value="refund">Refund</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label>Payment Method *</Label>
						<Select
							value={formData.payment_method || undefined}
							onValueChange={(value) => onFormChange("payment_method", value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select method" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="cash">Cash</SelectItem>
								<SelectItem value="bank_transfer">Bank Transfer</SelectItem>
								<SelectItem value="card">Credit/Debit Card</SelectItem>
								<SelectItem value="cheque">Cheque</SelectItem>
								<SelectItem value="online">Online Payment</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<CurrencySelector
							currency={formData.currency}
							onCurrencyChange={onCurrencyChange}
							label="Payment Currency"
						/>
					</div>

					<div>
						<Label htmlFor="amount">Amount *</Label>
						<Input
							id="amount"
							type="number"
							step="0.01"
							min="0"
							value={formData.amount}
							onChange={(e) =>
								onFormChange("amount", parseFloat(e.target.value) || 0)
							}
							required
						/>
					</div>
				</div>

				<div>
					<Label>Account *</Label>
					<Select
						value={formData.account_id || undefined}
						onValueChange={(value) => onFormChange("account_id", value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select account" />
						</SelectTrigger>
						<SelectContent>
							{compatibleAccounts.map((account) => (
								<SelectItem key={account.id} value={account.id}>
									{account.name} ({account.currency})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{compatibleAccounts.length === 0 && (
						<p className="text-sm text-red-600 mt-1">
							No {formData.currency} accounts available. Please create a{" "}
							{formData.currency} account first.
						</p>
					)}
				</div>

				<div>
					<Label htmlFor="reference_number">Reference Number</Label>
					<Input
						id="reference_number"
						value={formData.reference_number}
						onChange={(e) => onFormChange("reference_number", e.target.value)}
						placeholder="Optional reference number"
					/>
				</div>

				<div>
					<Label htmlFor="notes">Notes</Label>
					<Textarea
						id="notes"
						value={formData.notes}
						onChange={(e) => onFormChange("notes", e.target.value)}
						placeholder="Additional notes..."
					/>
				</div>
			</CardContent>
		</Card>
	);
}
