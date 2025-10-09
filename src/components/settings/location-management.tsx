import { Edit, MapPin, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Location } from "./types";

export function LocationManagement() {
	const { tenant } = useTenant();
	const [locations, setLocations] = useState<Location[]>([]);
	const [isEditingLocation, setIsEditingLocation] = useState(false);
	const [editingLocationId, setEditingLocationId] = useState<string | null>(
		null,
	);
	const [locationForm, setLocationForm] = useState({
		name: "",
		address: "",
		phone: "",
		email: "",
	});

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

	const handleLocationEdit = (location: Location) => {
		setEditingLocationId(location.id);
		setLocationForm({
			name: location.name,
			address: location.address || "",
			phone: location.phone || "",
			email: location.email || "",
		});
		setIsEditingLocation(true);
	};

	const handleLocationSave = async () => {
		try {
			const { error } = await supabase
				.from("locations")
				.update({
					name: locationForm.name,
					address: locationForm.address,
					phone: locationForm.phone,
					email: locationForm.email,
				})
				.eq("id", editingLocationId);

			if (error) throw error;

			toast({
				title: "Success",
				description: "Location updated successfully",
			});

			setIsEditingLocation(false);
			setEditingLocationId(null);
			fetchLocations();
		} catch (error) {
			console.error("Error updating location:", error);
			toast({
				title: "Error",
				description: "Failed to update location",
				variant: "destructive",
			});
		}
	};

	const handleLocationCancel = () => {
		setLocationForm({
			name: "",
			address: "",
			phone: "",
			email: "",
		});
		setIsEditingLocation(false);
		setEditingLocationId(null);
	};

	const handleAddNewLocation = async () => {
		try {
			const { error } = await supabase.from("locations").insert([
				{
					name: locationForm.name,
					address: locationForm.address,
					phone: locationForm.phone,
					email: locationForm.email,
					tenant_id: tenant?.id,
					is_active: true,
				},
			]);

			if (error) throw error;

			toast({
				title: "Success",
				description: "Location added successfully",
			});

			setLocationForm({
				name: "",
				address: "",
				phone: "",
				email: "",
			});
			fetchLocations();
		} catch (error) {
			console.error("Error adding location:", error);
			toast({
				title: "Error",
				description: "Failed to add location",
				variant: "destructive",
			});
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<MapPin className="h-5 w-5" />
					Location Management
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					{/* Add New Location Form */}
					{!isEditingLocation && (
						<div className="border rounded-lg p-4 bg-gray-50">
							<h3 className="font-medium mb-4">Add New Location</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="newLocationName">Location Name</Label>
									<Input
										id="newLocationName"
										value={locationForm.name}
										onChange={(e) =>
											setLocationForm((prev) => ({
												...prev,
												name: e.target.value,
											}))
										}
										placeholder="Enter location name"
									/>
								</div>
								<div>
									<Label htmlFor="newLocationAddress">Address</Label>
									<Input
										id="newLocationAddress"
										value={locationForm.address}
										onChange={(e) =>
											setLocationForm((prev) => ({
												...prev,
												address: e.target.value,
											}))
										}
										placeholder="Enter location address"
									/>
								</div>
								<div>
									<Label htmlFor="newLocationPhone">Phone</Label>
									<PhoneInput
										defaultCountry="LK"
										international
										value={locationForm.phone}
										onChange={(value) =>
											setLocationForm((prev) => ({
												...prev,
												phone: value,
											}))
										}
										placeholder="Enter location phone"
									/>
								</div>
								<div>
									<Label htmlFor="newLocationEmail">Email</Label>
									<Input
										id="newLocationEmail"
										type="email"
										value={locationForm.email}
										onChange={(e) =>
											setLocationForm((prev) => ({
												...prev,
												email: e.target.value,
											}))
										}
										placeholder="Enter location email"
									/>
								</div>
							</div>
							<Button
								onClick={handleAddNewLocation}
								className="mt-4"
								disabled={!locationForm.name.trim()}
							>
								Add Location
							</Button>
						</div>
					)}

					{/* Existing Locations */}
					<div>
						<h3 className="font-medium mb-4">Existing Locations</h3>
						<div className="space-y-4">
							{locations.map((location) => (
								<div key={location.id} className="border rounded-lg p-4">
									{editingLocationId === location.id && isEditingLocation ? (
										<div className="space-y-4">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<Label htmlFor="editLocationName">
														Location Name
													</Label>
													<Input
														id="editLocationName"
														value={locationForm.name}
														onChange={(e) =>
															setLocationForm((prev) => ({
																...prev,
																name: e.target.value,
															}))
														}
														placeholder="Enter location name"
													/>
												</div>
												<div>
													<Label htmlFor="editLocationAddress">Address</Label>
													<Input
														id="editLocationAddress"
														value={locationForm.address}
														onChange={(e) =>
															setLocationForm((prev) => ({
																...prev,
																address: e.target.value,
															}))
														}
														placeholder="Enter location address"
													/>
												</div>
												<div>
													<Label htmlFor="editLocationPhone">Phone</Label>
													<PhoneInput
														defaultCountry="LK"
														international
														value={locationForm.phone}
														onChange={(value) =>
															setLocationForm((prev) => ({
																...prev,
																phone: value,
															}))
														}
														placeholder="Enter location phone"
													/>
												</div>
												<div>
													<Label htmlFor="editLocationEmail">Email</Label>
													<Input
														id="editLocationEmail"
														type="email"
														value={locationForm.email}
														onChange={(e) =>
															setLocationForm((prev) => ({
																...prev,
																email: e.target.value,
															}))
														}
														placeholder="Enter location email"
													/>
												</div>
											</div>
											<div className="flex gap-2">
												<Button
													onClick={handleLocationSave}
													className="flex items-center gap-2"
												>
													<Save className="h-4 w-4" />
													Save Changes
												</Button>
												<Button
													variant="outline"
													onClick={handleLocationCancel}
												>
													Cancel
												</Button>
											</div>
										</div>
									) : (
										<div className="flex items-center justify-between">
											<div>
												<h4 className="font-medium">{location.name}</h4>
												<p className="text-sm text-gray-500">
													{location.is_active ? "Active" : "Inactive"}
												</p>
											</div>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleLocationEdit(location)}
												className="flex items-center gap-2"
											>
												<Edit className="h-4 w-4" />
												Edit
											</Button>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
