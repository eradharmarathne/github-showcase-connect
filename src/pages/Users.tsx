import { useState } from "react";
import { UsersSkeleton } from "@/components/skeleton/UsersSkeleton";
import { Button } from "@/components/ui/button";
import {
	EditUserDialog,
	InviteMemberDialog,
	PermissionMatrix,
	type User,
	UsersList,
} from "@/components/users";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { type User as UsersDataUser, useUsersData } from "@/hooks/useUsersData";

export default function Users() {
	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [showEditUser, setShowEditUser] = useState(false);
	const { user: currentUser, tenant } = useAuth();
	const { hasPermission } = usePermissions();
	const { locations } = useLocationContext();
	const { loading } = useUsersData();

	const handleEditUser = (user: UsersDataUser) => {
		// Convert to component User type
		const convertedUser: User = {
			id: user.id,
			name: user.name,
			email: user.email,
			is_tenant_admin: user.is_tenant_admin,
			created_at: user.created_at,
			last_sign_in_at: user.last_sign_in_at,
			phone: user.phone,
			avatar_url: user.avatar_url,
			tenant_role: user.tenant_role,
			permissions: user.permissions,
			location_count: user.location_count,
			total_permissions: user.total_permissions,
		};
		setEditingUser(convertedUser);
		setShowEditUser(true);
	};

	const handleInviteSuccess = () => {
		// The components will refresh their own data
		setShowInviteDialog(false);
	};

	const handleEditSuccess = () => {
		// The components will refresh their own data
		setShowEditUser(false);
		setEditingUser(null);
	};

	if (loading) {
		return <UsersSkeleton />;
	}

	return (
		<div className="w-full pb-20 sm:pb-8 px-4 sm:px-6 mx-auto space-y-6 animate-fade-in">
			{/* Header */}
			<div className="flex justify-between items-center pt-8">
				<h1 className="text-2xl font-bold">Users</h1>
				{hasPermission("access_users") && (
					<Button onClick={() => setShowInviteDialog(true)}>
						Invite Member
					</Button>
				)}
			</div>

			{/* Users List */}
			<UsersList onEditUser={handleEditUser} />

			{/* Permission Matrix */}
			<PermissionMatrix onEditUser={handleEditUser} />

			{/* Invite Member Dialog */}
			<InviteMemberDialog
				open={showInviteDialog}
				onOpenChange={setShowInviteDialog}
				locations={locations}
				tenant={tenant}
				currentUserId={currentUser?.id}
				onInviteSuccess={handleInviteSuccess}
			/>

			{/* Edit User Dialog */}
			<EditUserDialog
				open={showEditUser}
				onOpenChange={setShowEditUser}
				user={editingUser}
				locations={locations}
				tenant={tenant}
				onEditSuccess={handleEditSuccess}
			/>
		</div>
	);
}
