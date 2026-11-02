import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Send } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
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
	const [newPassword, setNewPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [sendCredentials, setSendCredentials] = useState(true);

	useEffect(() => {
		setEditingUser(user ? { ...user } : null);
		setNewPassword("");
		setShowPassword(false);
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

	const handleResetPassword = async () => {
		if (!editingUser || !newPassword.trim()) return;

		if (newPassword.trim().length < 6) {
			toast({
				title: "Password Too Short",
				description: "Password must be at least 6 characters",
				variant: "destructive",
			});
			return;
		}

		setPasswordLoading(true);
		try {
			const { data, error } = await supabase.rpc(
				"admin_reset_user_password",
				{
					target_user_id: editingUser.id,
					new_password: newPassword.trim(),
				},
			);

			if (error) throw error;
			const result = data as { success?: boolean; error?: string } | null;
			if (result && !result.success) {
				throw new Error(result.error || "Failed to reset password");
			}

			if (sendCredentials) {
				try {
					await supabase.functions.invoke("send-user-credentials", {
						body: {
							to: editingUser.email,
							email: editingUser.email,
							password: newPassword.trim(),
							loginUrl: `${window.location.origin}/auth`,
							organizationName: "CheckingCheckout",
							emailType: "new_user_credentials",
						},
					});
				} catch (emailErr) {
					console.error("Failed to send credentials email:", emailErr);
				}
			}

			toast({
				title: "Password Updated",
				description: sendCredentials
					? `New password set and emailed to ${editingUser.email}`
					: `Password updated for ${editingUser.email}`,
			});
			setNewPassword("");
			setShowPassword(false);
		} catch (error: any) {
			console.error("Error resetting password:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to reset password",
				variant: "destructive",
			});
		} finally {
			setPasswordLoading(false);
		}
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
						access_dashboard: permissions.access_dashboard || false,
						access_income: permissions.access_income || false,
						access_expenses: permissions.access_expenses || false,
						access_reports: permissions.access_reports || false,
						access_calendar: permissions.access_calendar || false,
						access_bookings: permissions.access_bookings || false,
						access_rooms: permissions.access_rooms || false,
						access_master_files: permissions.access_master_files || false,
						access_accounts: permissions.access_accounts || false,
						access_users: permissions.access_users || false,
						access_settings: permissions.access_settings || false,
						access_booking_channels: permissions.access_booking_channels || false,
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

						<Separator />

						<div className="space-y-3">
							<Label className="text-base font-semibold flex items-center gap-2">
								<KeyRound className="h-4 w-4" />
								Reset Password
							</Label>
							<div className="flex gap-2">
								<div className="relative flex-1">
									<Input
										type={showPassword ? "text" : "password"}
										placeholder="Enter new password"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										className="pr-10"
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
										onClick={() => setShowPassword(!showPassword)}
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4 text-muted-foreground" />
										) : (
											<Eye className="h-4 w-4 text-muted-foreground" />
										)}
									</Button>
								</div>
								<Button
									type="button"
									variant="secondary"
									disabled={!newPassword.trim() || passwordLoading}
									onClick={handleResetPassword}
								>
									{passwordLoading ? (
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
									) : (
										<KeyRound className="h-4 w-4 mr-2" />
									)}
									Update
								</Button>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="send-credentials"
									checked={sendCredentials}
									onCheckedChange={(checked) =>
										setSendCredentials(checked as boolean)
									}
								/>
								<Label
									htmlFor="send-credentials"
									className="text-sm font-normal flex items-center gap-1.5"
								>
									<Send className="h-3 w-3" />
									Email new credentials to user
								</Label>
							</div>
						</div>

						<Separator />

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
