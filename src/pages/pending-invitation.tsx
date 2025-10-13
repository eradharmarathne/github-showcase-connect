import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

interface PendingInvitation {
	id: string;
	tenant_id: string;
	email: string;
	role: string;
	permissions: Record<string, boolean>;
	location_id: string | null;
	invited_by: string | null;
	created_at: string;
	expires_at: string;
	tenant_name?: string;
	location_name?: string;
}

export default function PendingInvitation() {
	const { user, profile, refreshProfile, refreshTenant } = useAuth();
	const navigate = useNavigate();
	const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
	const [loading, setLoading] = useState(true);
	const [accepting, setAccepting] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!user || !profile) return;

		// If user already has tenant_id, redirect to dashboard
		if (profile.tenant_id) {
			navigate("/dashboard", { replace: true });
			return;
		}

		fetchPendingInvitations();
	}, [user, profile, navigate]);

	const fetchPendingInvitations = async () => {
		if (!user?.email) return;

		try {
			setLoading(true);
			setError(null);

			// Fetch pending invitations for this user's email
			const { data, error: fetchError } = await supabase
				.from("user_invitations")
				.select(`
					id,
					tenant_id,
					email,
					role,
					permissions,
					location_id,
					invited_by,
					created_at,
					expires_at,
					tenants!inner(name),
					locations(name)
				`)
				.eq("email", user.email)
				.is("accepted_at", null)
				.gt("expires_at", new Date().toISOString())
				.order("created_at", { ascending: false });

			if (fetchError) {
				console.error("Error fetching invitations:", fetchError);
				setError("Failed to load invitations. Please try again.");
				return;
			}

			// Transform the data
			const transformedData: PendingInvitation[] = (data || []).map((inv: any) => ({
				id: inv.id,
				tenant_id: inv.tenant_id,
				email: inv.email,
				role: inv.role,
				permissions: inv.permissions || {},
				location_id: inv.location_id,
				invited_by: inv.invited_by,
				created_at: inv.created_at,
				expires_at: inv.expires_at,
				tenant_name: inv.tenants?.name,
				location_name: inv.locations?.name,
			}));

			setInvitations(transformedData);

			// If no invitations found, show appropriate message
			if (transformedData.length === 0) {
				setError(
					"No pending invitations found. Please contact your organization administrator.",
				);
			}
		} catch (err) {
			console.error("Exception fetching invitations:", err);
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const acceptInvitation = async (invitation: PendingInvitation) => {
		if (!user || !profile) return;

		setAccepting(invitation.id);
		setError(null);

		try {
			// Update the profile with tenant_id
			const { error: profileError } = await supabase
				.from("profiles")
				.update({
					tenant_id: invitation.tenant_id,
					tenant_role: invitation.role as Database["public"]["Enums"]["tenant_role"],
				})
				.eq("id", user.id);

			if (profileError) {
				console.error("Error updating profile:", profileError);
				toast.error("Failed to accept invitation. Please try again.");
				return;
			}

			// Create user permissions for the location
			if (invitation.location_id) {
				const permissionsData = {
					user_id: user.id,
					tenant_id: invitation.tenant_id,
					location_id: invitation.location_id,
					tenant_role: invitation.role as Database["public"]["Enums"]["tenant_role"],
					is_tenant_admin: false,
					access_dashboard: invitation.permissions.access_dashboard ?? true,
					access_income: invitation.permissions.access_income ?? false,
					access_expenses: invitation.permissions.access_expenses ?? false,
					access_reports: invitation.permissions.access_reports ?? false,
					access_calendar: invitation.permissions.access_calendar ?? true,
					access_bookings: invitation.permissions.access_bookings ?? true,
					access_rooms: invitation.permissions.access_rooms ?? false,
					access_master_files: invitation.permissions.access_master_files ?? false,
					access_accounts: invitation.permissions.access_accounts ?? false,
					access_users: invitation.permissions.access_users ?? false,
					access_settings: invitation.permissions.access_settings ?? false,
					access_booking_channels: invitation.permissions.access_booking_channels ?? false,
				};

				const { error: permissionsError } = await supabase
					.from("user_permissions")
					.upsert(permissionsData, {
						onConflict: "user_id,location_id",
					});

				if (permissionsError) {
					console.error("Error creating permissions:", permissionsError);
					// Don't fail the whole operation if permissions creation fails
					toast.warning("Invitation accepted but permissions may need manual setup.");
				}
			}

			// Mark invitation as accepted
			const { error: invitationError } = await supabase
				.from("user_invitations")
				.update({
					accepted_at: new Date().toISOString(),
					accepted_by: user.id,
				})
				.eq("id", invitation.id);

			if (invitationError) {
				console.error("Error updating invitation:", invitationError);
				// Don't fail if marking accepted fails - user is already added
			}

			// Refresh profile and tenant data
			await refreshProfile();
			await refreshTenant();

			toast.success(`Successfully joined ${invitation.tenant_name}!`);

			// Redirect to dashboard
			setTimeout(() => {
				navigate("/dashboard", { replace: true });
			}, 1000);
		} catch (err) {
			console.error("Exception accepting invitation:", err);
			toast.error("An unexpected error occurred. Please try again.");
		} finally {
			setAccepting(null);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<div className="flex flex-col items-center gap-4">
							<Loader2 className="h-8 w-8 animate-spin text-primary" />
							<p className="text-muted-foreground">Loading invitations...</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
			<Card className="w-full max-w-2xl">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Mail className="h-6 w-6" />
						Pending Invitations
					</CardTitle>
					<CardDescription>
						You have been invited to join an organization. Accept an invitation below to
						continue.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{invitations.length === 0 && !error && (
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>No Pending Invitations</AlertTitle>
							<AlertDescription>
								You don't have any pending invitations at the moment. If you believe this is
								an error, please contact your organization administrator. Alternatively, you can
								create your own organization.
							</AlertDescription>
						</Alert>
					)}

					{invitations.length === 0 && !error && (
						<div className="flex justify-center pt-4">
							<Button
								onClick={() => navigate("/onboarding")}
								disabled={accepting !== null}
								variant="default"
							>
								Create New Organization
							</Button>
						</div>
					)}

					{invitations.map((invitation) => (
						<Card key={invitation.id} className="border-2">
							<CardContent className="pt-6">
								<div className="space-y-4">
									<div>
										<h3 className="font-semibold text-lg">{invitation.tenant_name}</h3>
										{invitation.location_name && (
											<p className="text-sm text-muted-foreground">
												Location: {invitation.location_name}
											</p>
										)}
										<p className="text-sm text-muted-foreground">Role: {invitation.role}</p>
									</div>

									<div className="text-sm">
										<p className="text-muted-foreground">
											Invited: {new Date(invitation.created_at).toLocaleDateString()}
										</p>
										<p className="text-muted-foreground">
											Expires: {new Date(invitation.expires_at).toLocaleDateString()}
										</p>
									</div>

									<Button
										onClick={() => acceptInvitation(invitation)}
										disabled={accepting !== null}
										className="w-full"
									>
										{accepting === invitation.id ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Accepting...
											</>
										) : (
											"Accept Invitation"
										)}
									</Button>
								</div>
							</CardContent>
						</Card>
					))}

					<div className="flex justify-between items-center pt-4">
						<Button
							variant="outline"
							onClick={fetchPendingInvitations}
							disabled={loading || accepting !== null}
						>
							<RefreshCw className="mr-2 h-4 w-4" />
							Refresh
						</Button>

						<Button
							variant="ghost"
							onClick={async () => {
								await supabase.auth.signOut();
								navigate("/", { replace: true });
							}}
							disabled={accepting !== null}
						>
							Sign Out
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
