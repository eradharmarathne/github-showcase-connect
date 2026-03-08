import { Bed, Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencySymbol } from "@/utils/currency";

type Room = {
	id: string;
	room_number: string;
	room_type: string;
	property_type: string;
	bed_type: string;
	max_occupancy: number;
	base_price: number;
	currency: "USD" | "LKR" | "EUR" | "GBP";
	location_id: string;
	description?: string;
	amenities?: string[];
	is_active: boolean;
	created_at: string;
};

type Location = {
	id: string;
	name: string;
	is_active: boolean;
};

export default function RoomsTab() {
	const [rooms, setRooms] = useState<Room[]>([]);
	const [locations, setLocations] = useState<Location[]>([]);
	const [loading, setLoading] = useState(true);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingRoom, setEditingRoom] = useState<Room | null>(null);
	const [formData, setFormData] = useState({
		room_number: "",
		room_type: "",
		property_type: "Room",
		bed_type: "",
		max_occupancy: 2,
		base_price: 0,
		currency: "USD" as "USD" | "LKR" | "EUR" | "GBP",
		location_id: "",
		description: "",
		amenities: [] as string[],
		is_active: true,
	});

	const availableAmenities = [
		"Air Conditioning",
		"WiFi",
		"TV",
		"Mini Bar",
		"Safe",
		"Balcony",
		"Sea View",
		"Pool View",
		"Garden View",
		"Room Service",
		"Jacuzzi",
		"Kitchen",
		"Washing Machine",
		"Hair Dryer",
		"Private Pool",
		"BBQ Area",
	];
	const { toast } = useToast();
	const { tenant } = useAuth();
	const { hasPermission } = usePermissions();
	const canManageRooms =
		hasPermission("access_rooms") || hasPermission("access_master_files");

	const fetchRooms = useCallback(async () => {
		if (!tenant?.id) {
			setLoading(false);
			return;
		}

		try {
			const { data, error } = await supabase
				.from("rooms")
				.select(`
          *,
          locations!inner(name)
        `)
				.eq("tenant_id", tenant.id)
				.order("created_at", { ascending: false });

			if (error) throw error;
			setRooms(data || []);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch rooms",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, toast]);

	const fetchLocations = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			const { data, error } = await supabase
				.from("locations")
				.select("id, name, is_active")
				.eq("tenant_id", tenant.id)
				.eq("is_active", true)
				.order("name");

			if (error) throw error;
			setLocations(data || []);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch locations",
				variant: "destructive",
			});
		}
	}, [tenant?.id, toast]);

	useEffect(() => {
		fetchRooms();
		fetchLocations();
	}, [fetchRooms, fetchLocations]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Check permission before allowing edit/create
		if (!canManageRooms) {
			toast({
				title: "Error",
				description: "You don't have permission to manage rooms",
				variant: "destructive",
			});
			return;
		}

		if (!tenant?.id) {
			toast({
				title: "Error",
				description: "No tenant information available",
				variant: "destructive",
			});
			return;
		}

		try {
			if (editingRoom) {
				const { error } = await supabase
					.from("rooms")
					.update(formData)
					.eq("id", editingRoom.id)
					.eq("tenant_id", tenant.id); // Ensure user can only update their own tenant's rooms

				if (error) throw error;

				toast({
					title: "Success",
					description: "Room updated successfully",
				});
			} else {
				const { error } = await supabase
					.from("rooms")
					.insert([{ ...formData, tenant_id: tenant.id }]);

				if (error) throw error;

				toast({
					title: "Success",
					description: "Room created successfully",
				});
			}

			setIsDialogOpen(false);
			setEditingRoom(null);
			resetForm();
			fetchRooms();
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to save room",
				variant: "destructive",
			});
		}
	};

	const resetForm = () => {
		setFormData({
			room_number: "",
			room_type: "",
			property_type: "Room",
			bed_type: "",
			max_occupancy: 2,
			base_price: 0,
			currency: "USD",
			location_id: "",
			description: "",
			amenities: [],
			is_active: true,
		});
	};

	const handleEdit = (room: Room) => {
		setEditingRoom(room);
		setFormData({
			room_number: room.room_number,
			room_type: room.room_type,
			property_type: room.property_type,
			bed_type: room.bed_type,
			max_occupancy: room.max_occupancy,
			base_price: room.base_price,
			currency: room.currency,
			location_id: room.location_id,
			description: room.description || "",
			amenities: room.amenities || [],
			is_active: room.is_active,
		});
		setIsDialogOpen(true);
	};

	const handleDelete = async (id: string) => {
		// Check permission before allowing delete
		if (!canManageRooms) {
			toast({
				title: "Error",
				description: "You don't have permission to delete rooms",
				variant: "destructive",
			});
			return;
		}

		if (!tenant?.id) {
			toast({
				title: "Error",
				description: "No tenant information available",
				variant: "destructive",
			});
			return;
		}

		try {
			const { error } = await supabase
				.from("rooms")
				.delete()
				.eq("id", id)
				.eq("tenant_id", tenant.id); // Ensure user can only delete their own tenant's rooms

			if (error) throw error;

			toast({
				title: "Success",
				description: "Room deleted successfully",
			});
			fetchRooms();
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete room",
				variant: "destructive",
			});
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
						<Bed className="size-6" />
						Room Management
					</h2>
					<p className="text-muted-foreground">
						Manage hotel rooms and their configurations
					</p>
				</div>
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button
							onClick={() => {
								setEditingRoom(null);
								resetForm();
							}}
						>
							<Plus className="size-4 mr-2" />
							Add Room
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>
								{editingRoom ? "Edit Room" : "Add New Room"}
							</DialogTitle>
							<DialogDescription>
								{editingRoom
									? "Update the room details below."
									: "Enter the details for the new room."}
							</DialogDescription>
						</DialogHeader>
						<form
							onSubmit={handleSubmit}
							className="space-y-4 max-h-[70vh] overflow-y-auto"
						>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="room_number">Room Number</Label>
									<Input
										id="room_number"
										value={formData.room_number}
										onChange={(e) =>
											setFormData({ ...formData, room_number: e.target.value })
										}
										placeholder="e.g., 101, A-201"
										required
									/>
								</div>
								<div>
									<Label htmlFor="location_id">Location</Label>
									<Select
										value={formData.location_id}
										onValueChange={(value) =>
											setFormData({ ...formData, location_id: value })
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select location" />
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
							</div>

							<div>
								<Label htmlFor="property_type">Property Type</Label>
								<Select
									value={formData.property_type}
									onValueChange={(value) =>
										setFormData({ ...formData, property_type: value })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Room">Room</SelectItem>
										<SelectItem value="Villa">Villa</SelectItem>
										<SelectItem value="Apartment">Apartment</SelectItem>
										<SelectItem value="Suite">Suite</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="room_type">Room/Property Type</Label>
									<Select
										value={formData.room_type}
										onValueChange={(value) =>
											setFormData({ ...formData, room_type: value })
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Standard">Standard</SelectItem>
											<SelectItem value="Deluxe">Deluxe</SelectItem>
											<SelectItem value="Suite">Suite</SelectItem>
											<SelectItem value="Presidential">Presidential</SelectItem>
											<SelectItem value="Villa">Villa</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label htmlFor="bed_type">Bed Type</Label>
									<Select
										value={formData.bed_type}
										onValueChange={(value) =>
											setFormData({ ...formData, bed_type: value })
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select bed type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Single">Single</SelectItem>
											<SelectItem value="Double">Double</SelectItem>
											<SelectItem value="Queen">Queen</SelectItem>
											<SelectItem value="King">King</SelectItem>
											<SelectItem value="Twin">Twin</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div>
									<Label htmlFor="max_occupancy">Max Occupancy</Label>
									<Input
										id="max_occupancy"
										type="number"
										min="1"
										value={formData.max_occupancy}
										onChange={(e) =>
											setFormData({
												...formData,
												max_occupancy: parseInt(e.target.value),
											})
										}
										required
									/>
								</div>
								<div>
									<Label htmlFor="base_price">Base Price</Label>
									<Input
										id="base_price"
										type="number"
										min="0"
										step="0.01"
										value={formData.base_price}
										onChange={(e) =>
											setFormData({
												...formData,
												base_price: parseFloat(e.target.value),
											})
										}
										required
									/>
								</div>
								<div>
									<Label htmlFor="currency">Currency</Label>
									<Select
										value={formData.currency}
										onValueChange={(value) =>
											setFormData({
												...formData,
												currency: value as "USD" | "LKR" | "EUR" | "GBP",
											})
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="USD">USD</SelectItem>
											<SelectItem value="LKR">LKR</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div>
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									value={formData.description}
									onChange={(e) =>
										setFormData({ ...formData, description: e.target.value })
									}
									placeholder="Room description..."
									rows={3}
								/>
							</div>

							<div>
								<Label>Amenities</Label>
								<div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
									{availableAmenities.map((amenity) => (
										<div key={amenity} className="flex items-center space-x-2">
											<Checkbox
												id={amenity}
												checked={formData.amenities.includes(amenity)}
												onCheckedChange={(checked) => {
													if (checked) {
														setFormData({
															...formData,
															amenities: [...formData.amenities, amenity],
														});
													} else {
														setFormData({
															...formData,
															amenities: formData.amenities.filter(
																(a) => a !== amenity,
															),
														});
													}
												}}
											/>
											<Label htmlFor={amenity} className="text-sm font-normal">
												{amenity}
											</Label>
										</div>
									))}
								</div>
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

							<div className="flex justify-end gap-2 pt-4 border-t">
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit">
									{editingRoom ? "Update" : "Create"} Room
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
							<TableHead className="min-w-[120px]">Room Number</TableHead>
							<TableHead className="min-w-[100px]">Type</TableHead>
							<TableHead className="min-w-[120px] hidden sm:table-cell">
								Location
							</TableHead>
							<TableHead className="min-w-[100px] hidden md:table-cell">
								Occupancy
							</TableHead>
							<TableHead className="min-w-[100px]">Base Price</TableHead>
							<TableHead className="min-w-[80px] hidden lg:table-cell">
								Status
							</TableHead>
							<TableHead className="min-w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rooms.map((room) => (
							<TableRow key={room.id}>
								<TableCell className="font-medium">
									{room.room_number}
								</TableCell>
								<TableCell>{room.room_type}</TableCell>
								<TableCell className="hidden sm:table-cell">
									{(room as any).locations?.name}
								</TableCell>
								<TableCell className="hidden md:table-cell">
									{room.max_occupancy}
								</TableCell>
								<TableCell>
									{getCurrencySymbol(room.currency)}
									{room.base_price}
								</TableCell>
								<TableCell className="hidden lg:table-cell">
									<Badge variant={room.is_active ? "default" : "secondary"}>
										{room.is_active ? "Active" : "Inactive"}
									</Badge>
								</TableCell>
								<TableCell>
									<div className="flex gap-1 sm:gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleEdit(room)}
											className="p-1 sm:p-2"
										>
											<Edit className="size-3 sm:size-4" />
											<span className="sr-only">Edit</span>
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleDelete(room.id)}
											className="p-1 sm:p-2"
										>
											<Trash2 className="size-3 sm:size-4" />
											<span className="sr-only">Delete</span>
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
