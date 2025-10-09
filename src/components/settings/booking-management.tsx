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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Location } from "./types";

export function BookingManagement() {
	const { tenant } = useTenant();
	const [locations, setLocations] = useState<Location[]>([]);
	const [selectedLocationId, setSelectedLocationId] = useState("");
	const [clearBookingsConfirmOpen, setClearBookingsConfirmOpen] =
		useState(false);

	const fetchLocations = useCallback(async () => {
		if (!tenant?.id) return;

		const { data, error } = await supabase
			.from("locations")
			.select("*")
			.eq("tenant_id", tenant.id)
			.order("name");

		if (error) {
			console.error("Error fetching locations:", error);
			toast({
				title: "Error",
				description: "Failed to fetch locations",
				variant: "destructive",
			});
		} else {
			setLocations(data || []);
		}
	}, [tenant?.id]);

	useEffect(() => {
		fetchLocations();
	}, [fetchLocations]);

	const clearLocationBookings = () => {
		if (!selectedLocationId) {
			toast({
				title: "Error",
				description: "Please select a location first",
				variant: "destructive",
			});
			return;
		}

		setClearBookingsConfirmOpen(true);
	};

	const confirmClearBookings = async () => {
		if (!selectedLocationId) return;

		const selectedLocation = locations.find((l) => l.id === selectedLocationId);
		if (!selectedLocation) return;

		try {
			const { data, error } = await supabase.functions.invoke(
				"clear-bookings",
				{
					body: { locationId: selectedLocationId },
				},
			);

			if (error) throw error;

			toast({
				title: "Success",
				description: `Cleared ${data.deletedCount} bookings from ${selectedLocation.name}`,
			});
		} catch (error) {
			console.error("Error clearing bookings:", error);
			toast({
				title: "Error",
				description: "Failed to clear bookings",
				variant: "destructive",
			});
		} finally {
			setClearBookingsConfirmOpen(false);
		}
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Booking Management</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
							<h3 className="font-medium text-yellow-800 mb-2">
								Clear All Bookings
							</h3>
							<p className="text-sm text-yellow-700 mb-4">
								This will permanently delete all bookings for the selected
								location. Use this before re-syncing from iCal to avoid
								duplicates.
							</p>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="location">Select Location</Label>
									<Select
										value={selectedLocationId}
										onValueChange={setSelectedLocationId}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select location to clear" />
										</SelectTrigger>
										<SelectContent>
											{locations.map((location) => (
												<SelectItem key={location.id} value={location.id}>
													{location.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex items-end">
									<Button
										onClick={clearLocationBookings}
										variant="destructive"
										className="w-full"
										disabled={!selectedLocationId}
									>
										<Trash2 className="size-4 mr-2" />
										Clear All Bookings
									</Button>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Clear Bookings Confirmation */}
			<AlertDialog
				open={clearBookingsConfirmOpen}
				onOpenChange={setClearBookingsConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Clear All Bookings</AlertDialogTitle>
						<AlertDialogDescription>
							{selectedLocationId &&
								locations.find((l) => l.id === selectedLocationId) && (
									<>
										Are you sure you want to clear ALL bookings for{" "}
										<strong>
											{locations.find((l) => l.id === selectedLocationId)?.name}
										</strong>
										? This action cannot be undone.
									</>
								)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmClearBookings}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Clear All Bookings
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
