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
import { supabase } from "@/integrations/supabase/client";
import { IncomeType } from "./types";

export function IncomeManagement() {
	const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
	const [newIncomeType, setNewIncomeType] = useState("");
	const [incomeTypeToDelete, setIncomeTypeToDelete] = useState<string | null>(
		null,
	);
	const [deleteIncomeConfirmOpen, setDeleteIncomeConfirmOpen] = useState(false);

	const fetchIncomeTypes = useCallback(async () => {
		const { data, error } = await supabase
			.from("income_types")
			.select("*")
			.order("type_name");

		if (error) {
			console.error("Error fetching income types:", error);
			toast({
				title: "Error",
				description: "Failed to fetch income types",
				variant: "destructive",
			});
		} else {
			setIncomeTypes(data || []);
		}
	}, []);

	useEffect(() => {
		fetchIncomeTypes();
	}, [fetchIncomeTypes]);

	const addIncomeType = async () => {
		if (!newIncomeType.trim()) {
			toast({
				title: "Error",
				description: "Please fill in the income type",
				variant: "destructive",
			});
			return;
		}

		const { error } = await supabase
			.from("income_types")
			.insert([{ type_name: newIncomeType.trim() }]);

		if (error) {
			console.error("Error adding income type:", error);
			toast({
				title: "Error",
				description: "Failed to add income type",
				variant: "destructive",
			});
		} else {
			toast({
				title: "Success",
				description: "Income type added successfully",
			});
			setNewIncomeType("");
			fetchIncomeTypes();
		}
	};

	const deleteIncomeType = (id: string) => {
		setIncomeTypeToDelete(id);
		setDeleteIncomeConfirmOpen(true);
	};

	const confirmDeleteIncomeType = async () => {
		if (!incomeTypeToDelete) return;

		try {
			const { error } = await supabase
				.from("income_types")
				.delete()
				.eq("id", incomeTypeToDelete);
			if (error) throw error;
			toast({
				title: "Success",
				description: "Income type deleted successfully",
			});
			fetchIncomeTypes();
		} catch (error) {
			console.error("Error deleting income type:", error);
			toast({
				title: "Error",
				description: "Failed to delete income type",
				variant: "destructive",
			});
		} finally {
			setDeleteIncomeConfirmOpen(false);
			setIncomeTypeToDelete(null);
		}
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Income Types</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="incomeType">Income Type</Label>
								<Input
									id="incomeType"
									value={newIncomeType}
									onChange={(e) => setNewIncomeType(e.target.value)}
									placeholder="e.g., Booking, Food, Laundry"
								/>
							</div>
							<div className="flex items-end">
								<Button onClick={addIncomeType} className="w-full">
									Add Income Type
								</Button>
							</div>
						</div>

						<div className="space-y-2 max-h-96 overflow-y-auto">
							{incomeTypes.map((type) => (
								<div
									key={type.id}
									className="flex items-center justify-between p-3 border rounded-lg group hover:bg-gray-50"
								>
									<div className="flex-1">
										<div className="font-medium">{type.type_name}</div>
									</div>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => deleteIncomeType(type.id)}
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

			{/* Delete Income Type Confirmation */}
			<AlertDialog
				open={deleteIncomeConfirmOpen}
				onOpenChange={setDeleteIncomeConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Income Type</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this income type? This action
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteIncomeType}
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
