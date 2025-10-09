import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { addUserToLocation } from "@/lib/invite";
import type { InvitePermissions, Location } from "./types";
import { defaultInvitePermissions } from "./types";

interface InviteMemberDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	locations: Location[];
	tenant: { id: string } | null;
	currentUserId?: string;
	onInviteSuccess: () => void;
}

export function InviteMemberDialog({
	open,
	onOpenChange,
	locations,
	tenant,
	currentUserId,
	onInviteSuccess,
}: InviteMemberDialogProps) {
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteLocationId, setInviteLocationId] = useState("");
	const [invitePermissions, setInvitePermissions] = useState<InvitePermissions>(
		defaultInvitePermissions,
	);
	const [inviteLoading, setInviteLoading] = useState(false);

	const handleInviteMember = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!tenant?.id || !inviteEmail.trim() || !currentUserId) return;

		if (!inviteLocationId) {
			toast({
				title: "Location Required",
				description: "Please select a location to invite the user to",
				variant: "destructive",
			});
			return;
		}

		const locationData = locations.find((loc) => loc.id === inviteLocationId);
		if (!locationData) {
			toast({
				title: "Invalid Location",
				description: "Selected location not found",
				variant: "destructive",
			});
			return;
		}

		try {
			setInviteLoading(true);

			// Use the updated addUserToLocation function instead of RPC
			const result = await addUserToLocation({
				email: inviteEmail.trim().toLowerCase(),
				tenantId: tenant.id,
				locationId: inviteLocationId,
				addedBy: currentUserId,
				permissions: {
					access_dashboard: invitePermissions.access_dashboard,
					access_income: invitePermissions.access_income,
					access_expenses: invitePermissions.access_expenses,
					access_reports: invitePermissions.access_reports,
					access_calendar: invitePermissions.access_calendar,
					access_bookings: invitePermissions.access_bookings,
					access_rooms: invitePermissions.access_rooms,
					access_master_files: invitePermissions.access_master_files,
					access_accounts: invitePermissions.access_accounts,
					access_users: invitePermissions.access_users,
					access_settings: invitePermissions.access_settings,
					access_booking_channels: invitePermissions.access_booking_channels,
				},
			});

			if (!result.success) {
				throw new Error(result.error || "Failed to invite user");
			}

			console.log("Invitation result:", result);

			toast({
				title: "Invitation Sent",
				description: result.user_created
					? "New user created and login credentials have been emailed"
					: "User added to location and notification sent",
			});

			// Reset form
			setInviteEmail("");
			setInviteLocationId("");
			setInvitePermissions(defaultInvitePermissions);
			onOpenChange(false);
			onInviteSuccess();
		} catch (error: any) {
			console.error("Error inviting member:", error);

			let errorMessage = "Failed to send invitation";
			if (error.message) {
				if (error.message.includes("already has access")) {
					errorMessage = "User already has access to this location";
				} else if (error.message.includes("rate limit")) {
					errorMessage = "Too many invitations sent. Please try again later.";
				} else {
					errorMessage = error.message;
				}
			}

			toast({
				title: "Error",
				description: errorMessage,
				variant: "destructive",
			});
		} finally {
			setInviteLoading(false);
		}
	};

	const updatePermission = (key: keyof InvitePermissions, value: boolean) => {
		setInvitePermissions((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Invite Member</DialogTitle>
					<DialogDescription>
						Send an invitation to join your organization at a specific location.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleInviteMember} className="space-y-4">
					<div>
						<Label htmlFor="inviteEmail">Email Address</Label>
						<Input
							id="inviteEmail"
							type="email"
							placeholder="Enter email address"
							value={inviteEmail}
							onChange={(e) => setInviteEmail(e.target.value)}
							required
						/>
					</div>
					<div>
						<Label htmlFor="inviteLocation">Location</Label>
						<Select
							value={inviteLocationId}
							onValueChange={setInviteLocationId}
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

					{/* Permissions Section */}
					<div className="space-y-3">
						<Label>Permissions</Label>
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div className="flex items-center space-x-2">
								<Checkbox
									id="access_dashboard"
									checked={invitePermissions.access_dashboard}
									onCheckedChange={(checked) =>
										updatePermission("access_dashboard", !!checked)
									}
								/>
								<Label
									htmlFor="access_dashboard"
									className="text-sm font-normal"
								>
									Dashboard
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="access_income"
									checked={invitePermissions.access_income}
									onCheckedChange={(checked) =>
										updatePermission("access_income", !!checked)
									}
								/>
								<Label htmlFor="access_income" className="text-sm font-normal">
									Income
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="access_expenses"
									checked={invitePermissions.access_expenses}
									onCheckedChange={(checked) =>
										updatePermission("access_expenses", !!checked)
									}
								/>
								<Label
									htmlFor="access_expenses"
									className="text-sm font-normal"
								>
									Expenses
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="access_reports"
									checked={invitePermissions.access_reports}
									onCheckedChange={(checked) =>
										updatePermission("access_reports", !!checked)
									}
								/>
								<Label htmlFor="access_reports" className="text-sm font-normal">
									Reports
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="access_calendar"
									checked={invitePermissions.access_calendar}
									onCheckedChange={(checked) =>
										updatePermission("access_calendar", !!checked)
									}
								/>
								<Label
									htmlFor="access_calendar"
									className="text-sm font-normal"
								>
									Calendar
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="access_bookings"
									checked={invitePermissions.access_bookings}
									onCheckedChange={(checked) =>
										updatePermission("access_bookings", !!checked)
									}
								/>
								<Label
									htmlFor="access_bookings"
									className="text-sm font-normal"
								>
									Bookings
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="access_rooms"
									checked={invitePermissions.access_rooms}
									onCheckedChange={(checked) =>
										updatePermission("access_rooms", !!checked)
									}
								/>
								<Label htmlFor="access_rooms" className="text-sm font-normal">
									Rooms
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="access_master_files"
									checked={invitePermissions.access_master_files}
									onCheckedChange={(checked) =>
										updatePermission("access_master_files", !!checked)
									}
								/>
								<Label
									htmlFor="access_master_files"
									className="text-sm font-normal"
								>
									Master Files
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="access_accounts"
									checked={invitePermissions.access_accounts}
									onCheckedChange={(checked) =>
										updatePermission("access_accounts", !!checked)
									}
								/>
								<Label
									htmlFor="access_accounts"
									className="text-sm font-normal"
								>
									Accounts
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="access_users"
									checked={invitePermissions.access_users}
									onCheckedChange={(checked) =>
										updatePermission("access_users", !!checked)
									}
								/>
								<Label htmlFor="access_users" className="text-sm font-normal">
									Users
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="access_settings"
									checked={invitePermissions.access_settings}
									onCheckedChange={(checked) =>
										updatePermission("access_settings", !!checked)
									}
								/>
								<Label
									htmlFor="access_settings"
									className="text-sm font-normal"
								>
									Settings
								</Label>
							</div>
						</div>
					</div>

					<Button
						type="submit"
						disabled={inviteLoading || !inviteLocationId}
						className={!inviteLocationId ? "opacity-50 cursor-not-allowed" : ""}
					>
						{inviteLoading
							? "Sending..."
							: !inviteLocationId
								? "Select Location First"
								: "Send Invitation"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
