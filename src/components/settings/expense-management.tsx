import { Trash2 } from "lucide-react";
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
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { ExpenseType } from "./types";

export function ExpenseManagement() {
	const { tenant } = useTenant();
	const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
	const [newMainType, setNewMainType] = useState("");
	const [newSubType, setNewSubType] = useState("");
	const [expenseTypeToDelete, setExpenseTypeToDelete] = useState<string | null>(
		null,
	);
	const [deleteExpenseConfirmOpen, setDeleteExpenseConfirmOpen] =
		useState(false);

	const fetchExpenseTypes = useCallback(async () => {
		if (!tenant?.id) return;

		const { data, error } = await supabase
			.from("expense_types")
			.select("*")
			.eq("tenant_id", tenant.id)
			.order("main_type, sub_type");

		if (error) {
			console.error("Error fetching expense types:", error);
			toast({
				title: "Error",
				description: "Failed to fetch expense types",
				variant: "destructive",
			});
		} else {
			setExpenseTypes(data || []);
		}
	}, [tenant?.id]);

	useEffect(() => {
		fetchExpenseTypes();
	}, [fetchExpenseTypes]);

	const addExpenseType = async () => {
		if (!newMainType.trim() || !newSubType.trim()) {
			toast({
				title: "Error",
				description: "Please fill in both main type and sub type",
				variant: "destructive",
			});
			return;
		}

		if (!tenant?.id) {
			toast({
				title: "Error",
				description: "No tenant context available",
				variant: "destructive",
			});
			return;
		}

		const { error } = await supabase.from("expense_types").insert([
			{
				main_type: newMainType.trim(),
				sub_type: newSubType.trim(),
				tenant_id: tenant.id,
			},
		]);

		if (error) {
			console.error("Error adding expense type:", error);
			toast({
				title: "Error",
				description: "Failed to add expense type",
				variant: "destructive",
			});
		} else {
			toast({
				title: "Success",
				description: "Expense type added successfully",
			});
			setNewMainType("");
			setNewSubType("");
			fetchExpenseTypes();
		}
	};

	const deleteExpenseType = (id: string) => {
		setExpenseTypeToDelete(id);
		setDeleteExpenseConfirmOpen(true);
	};

	const confirmDeleteExpenseType = async () => {
		if (!expenseTypeToDelete || !tenant?.id) return;

		try {
			const { error } = await supabase
				.from("expense_types")
				.delete()
				.eq("id", expenseTypeToDelete)
				.eq("tenant_id", tenant.id);
			if (error) throw error;
			toast({
				title: "Success",
				description: "Expense type deleted successfully",
			});
			fetchExpenseTypes();
		} catch (error) {
			console.error("Error deleting expense type:", error);
			toast({
				title: "Error",
				description: "Failed to delete expense type",
				variant: "destructive",
			});
		} finally {
			setDeleteExpenseConfirmOpen(false);
			setExpenseTypeToDelete(null);
		}
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Expense Categories</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<Label htmlFor="mainType">Main Type</Label>
								<Input
									id="mainType"
									value={newMainType}
									onChange={(e) => setNewMainType(e.target.value)}
									placeholder="e.g., Utilities"
								/>
							</div>
							<div>
								<Label htmlFor="subType">Sub Type</Label>
								<Input
									id="subType"
									value={newSubType}
									onChange={(e) => setNewSubType(e.target.value)}
									placeholder="e.g., Electricity"
								/>
							</div>
							<div className="flex items-end">
								<Button onClick={addExpenseType} className="w-full">
									Add Expense Type
								</Button>
							</div>
						</div>

						<div className="space-y-2 max-h-96 overflow-y-auto">
							{expenseTypes.map((type) => (
								<div
									key={type.id}
									className="flex items-center justify-between p-3 border rounded-lg group hover:bg-gray-50"
								>
									<div className="flex-1">
										<div className="font-medium">{type.main_type}</div>
										<div className="text-sm text-muted-foreground">
											{type.sub_type}
										</div>
									</div>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => deleteExpenseType(type.id)}
										className="opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Delete Expense Type Confirmation */}
			<AlertDialog
				open={deleteExpenseConfirmOpen}
				onOpenChange={setDeleteExpenseConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Expense Type</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this expense type? This action
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteExpenseType}
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
