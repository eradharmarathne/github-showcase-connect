import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Location, User, UserPermissions } from "./types";
import { permissionTypes } from "./types";

interface EditUserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: User | null;
	locations: Location[];
	tenant: { id: string } | null;
	onEditSuccess: () => void;
}

export function EditUserDialog({
	open,
	onOpenChange,
	user,
	locations,
	tenant,
	onEditSuccess,
}: EditUserDialogProps) {
	const { hasPermission } = usePermissions();
	const [editingUser, setEditingUser] = useState<User | null>(user);

	// Update editing user when user prop changes
	useEffect(() => {
		setEditingUser(user ? { ...user } : null);
	}, [user]);

	const updateEditUserPermission = (
		locationName: string,
		permissionKey: string,
		value: boolean,
	) => {
		if (!editingUser) return;

		setEditingUser({
			...editingUser,
			permissions: {
				...editingUser.permissions,
				[locationName]: {
					...editingUser.permissions[locationName],
					[permissionKey]: value,
				},
			},
		});
	};

	const handleSaveEditUser = async () => {
		if (!editingUser || !tenant?.id) return;

		// Check permission before allowing edit
		if (!hasPermission("access_users")) {
			toast({
				title: "Error",
				description: "You don't have permission to edit users",
				variant: "destructive",
			});
			return;
		}

		try {
			// Update user basic info if needed (name, etc.)
			const { error: profileError } = await supabase
				.from("profiles")
				.update({
					name: editingUser.name,
				})
				.eq("id", editingUser.id);

			if (profileError) throw profileError;

			// Update permissions for each location
			for (const [locationName, permissions] of Object.entries(
				editingUser.permissions,
			)) {
				const location = locations.find((loc) => loc.name === locationName);
				if (!location) continue;

				const { error: permissionError } = await supabase
					.from("user_permissions")
					.update({
						access_dashboard: permissions.dashboard || false,
						access_income: permissions.income || false,
						access_expenses: permissions.expenses || false,
						access_reports: permissions.reports || false,
						access_calendar: permissions.calendar || false,
						access_bookings: permissions.bookings || false,
						access_rooms: permissions.rooms || false,
						access_master_files: permissions.master_files || false,
						access_accounts: permissions.accounts || false,
						access_users: permissions.users || false,
						access_settings: permissions.settings || false,
						access_booking_channels: permissions.booking_channels || false,
					})
					.eq("user_id", editingUser.id)
					.eq("location_id", location.id)
					.eq("tenant_id", tenant.id);

				if (permissionError) throw permissionError;
			}

			onOpenChange(false);
			setEditingUser(null);
			onEditSuccess();

			toast({
				title: "User Updated",
				description: `${editingUser.name}'s permissions have been updated.`,
			});
		} catch (error: any) {
			console.error("Error updating user:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to update user",
				variant: "destructive",
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[380px] sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit User Permissions</DialogTitle>
					<DialogDescription>
						Modify user details and configure their permissions for different
						locations and application features.
					</DialogDescription>
				</DialogHeader>
				{editingUser && (
					<div className="space-y-6">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Full Name</Label>
								<Input
									placeholder="John Doe"
									value={editingUser.name}
									onChange={(e) =>
										setEditingUser({
											...editingUser,
											name: e.target.value,
										})
									}
								/>
							</div>

							<div className="space-y-2">
								<Label>Email Address</Label>
								<Input
									type="email"
									value={editingUser.email}
									disabled
									className="bg-muted"
								/>
							</div>
						</div>

						<div className="space-y-4">
							<Label className="text-base font-semibold">
								Location Permissions
							</Label>
							{locations.map((location) => (
								<Card key={location.id} className="p-4">
									<h3 className="font-semibold mb-3">{location.name}</h3>
									<div className="grid grid-cols-2 gap-3">
										{permissionTypes.map((permission) => (
											<div
												key={permission.key}
												className="flex items-center space-x-2"
											>
												<Checkbox
													id={`edit-${location.name}-${permission.key}`}
													checked={
														editingUser.permissions[location.name]?.[
															permission.key as keyof UserPermissions
														] || false
													}
													onCheckedChange={(checked) =>
														updateEditUserPermission(
															location.name,
															permission.key,
															checked as boolean,
														)
													}
												/>
												<Label
													htmlFor={`edit-${location.name}-${permission.key}`}
													className="text-sm font-normal"
												>
													{permission.label}
												</Label>
											</div>
										))}
									</div>
								</Card>
							))}
						</div>

						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => onOpenChange(false)}
								className="flex-1"
							>
								Cancel
							</Button>
							<Button onClick={handleSaveEditUser} className="flex-1">
								Save Changes
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
