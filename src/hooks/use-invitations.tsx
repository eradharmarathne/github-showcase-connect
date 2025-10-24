import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";

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

export const useInvitations = () => {
	const { user } = useAuth();
	const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchInvitations = async () => {
		if (!user?.email) {
			console.log("⚠️ [USE-INVITATIONS] No user email available");
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			console.log("🔍 [USE-INVITATIONS] Fetching invitations for:", user.email);

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
				console.error(
					"❌ [USE-INVITATIONS] Error fetching invitations:",
					fetchError,
				);
				setError("Failed to load invitations. Please try again.");
				return;
			}

			console.log("📬 [USE-INVITATIONS] Found invitations:", data?.length || 0);

			const transformedData: PendingInvitation[] = (data || []).map(
				(inv: any) => ({
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
				}),
			);

			setInvitations(transformedData);

			if (transformedData.length === 0) {
				console.warn("⚠️ [USE-INVITATIONS] No pending invitations found");
			} else {
				console.log(
					"✅ [USE-INVITATIONS] Invitations loaded:",
					transformedData,
				);
			}
		} catch (err) {
			console.error(
				"❌ [USE-INVITATIONS] Exception fetching invitations:",
				err,
			);
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchInvitations();
	}, [user?.email]);

	return {
		invitations,
		loading,
		error,
		refetch: fetchInvitations,
		hasInvitations: invitations.length > 0,
	};
};
