import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tables } from "@/integrations/supabase/types";

type ExpenseType = Tables<"expense_types">;

interface ExpenseFormData {
	mainCategory: string;
	subCategory: string;
	amount: string;
	accountId: string;
	date: string;
	note: string;
	currency: string;
}

interface ExpenseCategoriesProps {
	formData: ExpenseFormData;
	expenseTypes: ExpenseType[];
	onFormDataChange: (data: Partial<ExpenseFormData>) => void;
}

export function ExpenseCategories({
	formData,
	expenseTypes,
	onFormDataChange,
}: ExpenseCategoriesProps) {
	const { t } = useTranslation();

	const mainCategories = [...new Set(expenseTypes.map((et) => et.main_type))];
	const subCategories = expenseTypes
		.filter((et) => et.main_type === formData.mainCategory)
		.map((et) => et.sub_type);

	const handleMainCategoryChange = (value: string) => {
		const newSubCategory =
			formData.subCategory && subCategories.includes(formData.subCategory)
				? formData.subCategory
				: "";

		onFormDataChange({
			mainCategory: value,
			subCategory: newSubCategory,
		});
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div className="space-y-2">
				<Label htmlFor="mainCategory">
					{t("expense.form.fields.mainCategory")}
				</Label>
				<Select
					key={`main-${formData.mainCategory}`}
					value={formData.mainCategory}
					onValueChange={handleMainCategoryChange}
				>
					<SelectTrigger>
						<SelectValue
							placeholder={t("expense.form.placeholders.mainCategory")}
						/>
					</SelectTrigger>
					<SelectContent>
						{mainCategories.map((category) => (
							<SelectItem key={category} value={category}>
								{category}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label htmlFor="subCategory">
					{t("expense.form.fields.subCategory")}
				</Label>
				<Select
					key={`sub-${formData.subCategory}`}
					value={formData.subCategory}
					onValueChange={(value) => onFormDataChange({ subCategory: value })}
					disabled={!formData.mainCategory}
				>
					<SelectTrigger>
						<SelectValue
							placeholder={t("expense.form.placeholders.subCategory")}
						/>
					</SelectTrigger>
					<SelectContent>
						{subCategories.map((subCategory) => (
							<SelectItem key={subCategory} value={subCategory}>
								{subCategory}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
