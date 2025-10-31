export interface PaymentFormData {
	payment_type: string;
	payment_method: string;
	amount: number;
	account_id: string;
	notes: string;
	currency: string;
	reference_number: string;
}

export interface PaymentAccount {
	id: string;
	name: string;
	currency: string;
}
