import { Building2, Edit, Plus, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Location = {
	id: string;
	name: string;
	is_active: boolean;
	created_at: string;
};

export default function LocationsTab() {
	const [locations, setLocations] = useState<Location[]>([]);
	const [loading, setLoading] = useState(true);
	const [deletingLocationId, setDeletingLocationId] = useState<string | null>(
		null,
	);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingLocation, setEditingLocation] = useState<Location | null>(null);
	const [deleteAlert, setDeleteAlert] = useState<{
		open: boolean;
		locationId: string | null;
		locationName: string;
		dependencyDetails: string[];
		totalDependents: number;
	}>({
		open: false,
		locationId: null,
		locationName: "",
		dependencyDetails: [],
		totalDependents: 0,
	});
	const [formData, setFormData] = useState({
		name: "",
		is_active: true,
	});
	const { toast } = useToast();
	const { tenant } = useAuth();
	const { refetchLocations: refetchGlobalLocations } = useLocationContext();

	const fetchLocations = useCallback(async () => {
		if (!tenant?.id) {
			setLoading(false);
			return;
		}

		try {
			const { data, error } = await supabase
				.from("locations")
				.select("*")
				.eq("tenant_id", tenant.id)
				.order("created_at", { ascending: false });

			if (error) throw error;
			setLocations(data || []);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch locations",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, toast]);

	useEffect(() => {
		fetchLocations();
	}, [fetchLocations]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!tenant?.id) {
			toast({
				title: "Error",
				description: "No tenant information available",
				variant: "destructive",
			});
			return;
		}

		try {
			if (editingLocation) {
				const { error } = await supabase
					.from("locations")
					.update(formData)
					.eq("id", editingLocation.id)
					.eq("tenant_id", tenant.id); // Ensure user can only update their own tenant's locations

				if (error) throw error;

				toast({
					title: "Success",
					description: "Location updated successfully",
				});
			} else {
				const { error } = await supabase
					.from("locations")
					.insert([{ ...formData, tenant_id: tenant.id }]);

				if (error) throw error;

				toast({
					title: "Success",
					description: "Location created successfully",
				});
			}

			setIsDialogOpen(false);
			setEditingLocation(null);
			setFormData({ name: "", is_active: true });
			await Promise.all([fetchLocations(), refetchGlobalLocations()]);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to save location",
				variant: "destructive",
			});
		}
	};

	const handleEdit = (location: Location) => {
		setEditingLocation(location);
		setFormData({
			name: location.name,
			is_active: location.is_active,
		});
		setIsDialogOpen(true);
	};

	const handleDelete = async (id: string) => {
		if (!tenant?.id) {
			toast({
				title: "Error",
				description: "No tenant information available",
				variant: "destructive",
			});
			return;
		}

		// First, check for dependent records
		try {
			setDeletingLocationId(id);

			const [
				{ count: reservationsCount },
				{ count: incomeCount },
				{ count: expensesCount },
				{ count: bookingsCount },
				{ count: externalBookingsCount },
			] = await Promise.all([
				supabase
					.from("reservations")
					.select("*", { count: "exact", head: true })
					.eq("location_id", id),
				supabase
					.from("income")
					.select("*", { count: "exact", head: true })
					.eq("location_id", id),
				supabase
					.from("expenses")
					.select("*", { count: "exact", head: true })
					.eq("location_id", id),
				supabase
					.from("bookings")
					.select("*", { count: "exact", head: true })
					.eq("location_id", id),
				supabase
					.from("reservations")
					.select("*", { count: "exact", head: true })
					.eq("location_id", id)
					.eq("is_external", true),
			]);
			const totalDependents =
				(reservationsCount || 0) +
				(incomeCount || 0) +
				(expensesCount || 0) +
				(bookingsCount || 0) +
				(externalBookingsCount || 0);

			const dependencyDetails = [];
			if (reservationsCount)
				dependencyDetails.push(
					`${reservationsCount} reservation${reservationsCount > 1 ? "s" : ""}`,
				);
			if (incomeCount)
				dependencyDetails.push(
					`${incomeCount} income record${incomeCount > 1 ? "s" : ""}`,
				);
			if (expensesCount)
				dependencyDetails.push(
					`${expensesCount} expense record${expensesCount > 1 ? "s" : ""}`,
				);
			if (bookingsCount)
				dependencyDetails.push(
					`${bookingsCount} booking${bookingsCount > 1 ? "s" : ""}`,
				);
			if (externalBookingsCount)
				dependencyDetails.push(
					`${externalBookingsCount} external booking${externalBookingsCount > 1 ? "s" : ""}`,
				);

			const locationName =
				locations.find((loc) => loc.id === id)?.name || "this location";

			// Show alert dialog for confirmation
			setDeleteAlert({
				open: true,
				locationId: id,
				locationName,
				dependencyDetails,
				totalDependents,
			});
			setDeletingLocationId(null);
		} catch (error) {
			console.error("Error checking dependencies:", error);
			setDeletingLocationId(null);
			toast({
				title: "Error",
				description: "Failed to check location dependencies. Please try again.",
				variant: "destructive",
			});
		}
	};

	const confirmDelete = async () => {
		if (!deleteAlert.locationId || !tenant?.id) return;

		try {
			setDeletingLocationId(deleteAlert.locationId);
			setDeleteAlert({
				open: false,
				locationId: null,
				locationName: "",
				dependencyDetails: [],
				totalDependents: 0,
			});

			// Perform cascading delete in the correct order
			toast({
				title: "Deleting location...",
				description: "This may take a moment for locations with many records.",
			});

			// Delete dependent records that have NO ACTION constraints
			// Order matters: delete children before parents

			// 1. Delete booking payments first (references bookings)
			await supabase
				.from("booking_payments")
				.delete()
				.in(
					"booking_id",
					(
						await supabase
							.from("bookings")
							.select("id")
							.eq("tenant_id", tenant.id)
							.eq("location_id", deleteAlert.locationId)
					).data?.map((b) => b.id) || [],
				);

			// 2. Delete external bookings (from unified reservations table)
			await supabase
				.from("reservations")
				.delete()
				.eq("tenant_id", tenant.id)
				.eq("location_id", deleteAlert.locationId)
				.eq("is_external", true); // 3. Delete income records
			await supabase
				.from("income")
				.delete()
				.eq("tenant_id", tenant.id)
				.eq("location_id", deleteAlert.locationId);

			// 4. Delete expense records
			await supabase
				.from("expenses")
				.delete()
				.eq("tenant_id", tenant.id)
				.eq("location_id", deleteAlert.locationId);

			// 5. Delete bookings
			await supabase
				.from("bookings")
				.delete()
				.eq("tenant_id", tenant.id)
				.eq("location_id", deleteAlert.locationId);

			// 6. Delete reservations
			await supabase
				.from("reservations")
				.delete()
				.eq("tenant_id", tenant.id)
				.eq("location_id", deleteAlert.locationId);

			// 7. Finally delete the location (rooms and user_permissions will cascade automatically)
			const { error } = await supabase
				.from("locations")
				.delete()
				.eq("id", deleteAlert.locationId)
				.eq("tenant_id", tenant.id);

			if (error) throw error;

			toast({
				title: "Success",
				description: "Location and all associated records deleted successfully",
			});
			await Promise.all([fetchLocations(), refetchGlobalLocations()]);
		} catch (error) {
			console.error("Delete location error:", error);
			toast({
				title: "Error",
				description:
					"Failed to delete location. Please try again or contact support.",
				variant: "destructive",
			});
		} finally {
			setDeletingLocationId(null);
		}
	};

	if (loading) {
		return null;
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<div>
					<h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
						<Building2 className="size-6" />
						Hotel Locations
					</h2>
					<p className="text-muted-foreground">
						Manage your hotel buildings and locations
					</p>
				</div>
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button
							onClick={() => {
								setEditingLocation(null);
								setFormData({ name: "", is_active: true });
							}}
						>
							<Plus className="size-4 mr-2" />
							Add Location
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								{editingLocation ? "Edit Location" : "Add New Location"}
							</DialogTitle>
							<DialogDescription>
								{editingLocation
									? "Update the location details below."
									: "Enter the details for the new hotel location."}
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<Label htmlFor="name">Location Name</Label>
								<Input
									id="name"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									placeholder="e.g., Main Building, Annex, Pool Villa"
									required
								/>
							</div>
							<div>
								<Label htmlFor="status">Status</Label>
								<Select
									value={formData.is_active ? "active" : "inactive"}
									onValueChange={(value) =>
										setFormData({ ...formData, is_active: value === "active" })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="inactive">Inactive</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit">
									{editingLocation ? "Update" : "Create"} Location
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="min-w-[150px]">Location Name</TableHead>
							<TableHead className="min-w-[100px]">Status</TableHead>
							<TableHead className="min-w-[120px] hidden sm:table-cell">
								Created Date
							</TableHead>
							<TableHead className="min-w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{locations.map((location) => (
							<TableRow key={location.id}>
								<TableCell className="font-medium">{location.name}</TableCell>
								<TableCell>
									<Badge variant={location.is_active ? "default" : "secondary"}>
										{location.is_active ? "Active" : "Inactive"}
									</Badge>
								</TableCell>
								<TableCell className="hidden sm:table-cell">
									{new Date(location.created_at).toLocaleDateString()}
								</TableCell>
								<TableCell>
									<div className="flex gap-1 sm:gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleEdit(location)}
											className="p-1 sm:p-2"
										>
											<Edit className="size-3 sm:size-4" />
											<span className="sr-only">Edit</span>
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleDelete(location.id)}
											disabled={deletingLocationId === location.id}
											className="p-1 sm:p-2"
										>
											{deletingLocationId === location.id ? null : (
												<Trash2 className="size-3 sm:size-4" />
											)}
											<span className="sr-only">Delete</span>
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Delete Confirmation Alert Dialog */}
			<AlertDialog
				open={deleteAlert.open}
				onOpenChange={(open) => setDeleteAlert({ ...deleteAlert, open })}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{deleteAlert.totalDependents > 0
								? "Delete Location with Dependencies?"
								: "Delete Location?"}
						</AlertDialogTitle>
						<AlertDialogDescription className="space-y-2">
							{deleteAlert.totalDependents > 0 ? (
								<>
									<p>
										<strong>{deleteAlert.locationName}</strong> has{" "}
										{deleteAlert.dependencyDetails.join(", ")}.
									</p>
									<p>Deleting this location will permanently remove:</p>
									<ul className="list-disc list-inside space-y-1 text-sm">
										<li>All financial records (income/expenses)</li>
										<li>All booking data (reservations/bookings)</li>
										<li>All rooms and user permissions</li>
									</ul>
									<p className="font-semibold text-destructive">
										This action cannot be undone.
									</p>
								</>
							) : (
								<p>
									Are you sure you want to delete{" "}
									<strong>{deleteAlert.locationName}</strong>? This action
									cannot be undone.
								</p>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete Location
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
