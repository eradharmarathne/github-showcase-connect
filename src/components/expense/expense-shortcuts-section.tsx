import { useTranslation } from "react-i18next";
import { ExpenseShortcuts } from "@/components/ExpenseShortcuts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;

interface ExpenseShortcutsSectionProps {
	locationId: string;
	accounts: Account[];
	onQuickFill: (data: {
		mainCategory: string;
		subCategory: string;
		amount: string;
		accountId: string;
		date: string;
		note: string;
	}) => void;
}

export function ExpenseShortcutsSection({
	locationId,
	accounts,
	onQuickFill,
}: ExpenseShortcutsSectionProps) {
	const { t } = useTranslation();

	if (!locationId) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("expense.shortcuts.title")}</CardTitle>
			</CardHeader>
			<CardContent>
				<ExpenseShortcuts
					locationId={locationId}
					accounts={accounts}
					onQuickFill={onQuickFill}
				/>
			</CardContent>
		</Card>
	);
}
