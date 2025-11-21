import type { Tables } from "@/integrations/supabase/types";

export type Plan = Tables<"plans">;
export type Subscription = Tables<"subscriptions">;
export type Tenant = Tables<"tenants">;

export interface PolarProduct {
	id: string;
	name: string;
	price_id: string;
}

export interface PlanWithPolarProduct extends Plan {
	polarProduct?: PolarProduct | null;
}

export interface Invoice {
	id: string;
	amount: number;
	currency: string;
	status: "paid" | "open" | "failed" | "draft";
	created: string;
	due_date?: string;
	invoice_pdf?: string;
	description?: string;
}

export interface PaymentMethod {
	id: string;
	type: "card" | "bank_account";
	last4: string;
	brand?: string;
	exp_month?: number;
	exp_year?: number;
	is_default: boolean;
}

export interface UsageData {
	period: string;
	usage: number;
	limit?: number;
	unit: string;
}
