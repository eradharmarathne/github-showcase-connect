import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { ConfigurationForm } from "@/components/google-integration/configuration-form";
import { ConnectionStatusCard } from "@/components/google-integration/connection-status-card";
import { ManualSyncCard } from "@/components/google-integration/manual-sync-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type GoogleCredential = Tables<"google_business_credentials">;

export default function GoogleIntegrationSettings() {
	const { tenant, user } = useAuth();
	const { selectedLocation } = useLocationContext();
	const queryClient = useQueryClient();

	// Fetch existing credentials for selected location
	const { data: credentials, isLoading } = useQuery({
		queryKey: ["google-credentials", tenant?.id, selectedLocation],
		queryFn: async () => {
			if (!tenant?.id || !selectedLocation) return null;

			const { data, error } = await supabase
				.from("google_business_credentials")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.maybeSingle();

			if (error && error.code !== "PGRST116") throw error;
			return data as GoogleCredential | null;
		},
		enabled: !!tenant?.id && !!selectedLocation,
	});

	// Save/Update credentials
	const saveMutation = useMutation({
		mutationFn: async ({
			accountId,
			locationId,
		}: {
			accountId: string;
			locationId: string;
		}) => {
			if (!tenant?.id || !selectedLocation || !user?.id) {
				throw new Error("Missing required data");
			}

			if (!accountId.trim() || !locationId.trim()) {
				throw new Error("Please enter both Account ID and Location ID");
			}

			const credentialData = {
				tenant_id: tenant.id,
				location_id: selectedLocation,
				google_account_id: accountId.trim(),
				google_location_id: locationId.trim(),
				sync_status: "pending" as const,
				created_by: user.id,
			};

			if (credentials?.id) {
				// Update existing
				const { error } = await supabase
					.from("google_business_credentials")
					.update(credentialData)
					.eq("id", credentials.id);
				if (error) throw error;
			} else {
				// Insert new
				const { error } = await supabase
					.from("google_business_credentials")
					.insert(credentialData);
				if (error) throw error;
			}
		},
		onSuccess: () => {
			toast.success("Google credentials saved successfully");
			queryClient.invalidateQueries({ queryKey: ["google-credentials"] });
		},
		onError: (error) => {
			console.error("Failed to save credentials:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to save credentials",
			);
		},
	});

	// Disconnect/Delete credentials
	const disconnectMutation = useMutation({
		mutationFn: async () => {
			if (!credentials?.id) throw new Error("No credentials to disconnect");

			const { error } = await supabase
				.from("google_business_credentials")
				.delete()
				.eq("id", credentials.id);

			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Google Business Profile disconnected");
			queryClient.invalidateQueries({ queryKey: ["google-credentials"] });
		},
		onError: (error) => {
			console.error("Failed to disconnect:", error);
			toast.error("Failed to disconnect. Please try again.");
		},
	});

	// Trigger manual sync
	const syncMutation = useMutation({
		mutationFn: async () => {
			if (!credentials?.id) throw new Error("No credentials configured");

			// Update status to syncing
			await supabase
				.from("google_business_credentials")
				.update({
					sync_status: "syncing",
				})
				.eq("id", credentials.id);

			// Call Edge Function to sync reviews from Google Business Profile API v4
			const { data, error } = await supabase.functions.invoke(
				"sync-google-reviews",
				{
					body: { locationId: selectedLocation },
				},
			);

			if (error) throw error;

			if (!data?.success) {
				throw new Error(data?.error || "Failed to sync reviews from Google");
			}

			return data;
		},
		onSuccess: () => {
			toast.success("Reviews sync initiated successfully");
			queryClient.invalidateQueries({ queryKey: ["google-credentials"] });
			queryClient.invalidateQueries({ queryKey: ["google-reviews"] });
		},
		onError: (error) => {
			console.error("Sync failed:", error);
			toast.error("Failed to sync reviews. Please try again.");
		},
	});

	// Memoized callbacks to prevent unnecessary re-renders
	const handleSave = useCallback(
		(accountId: string, locationId: string) => {
			saveMutation.mutate({ accountId, locationId });
		},
		[saveMutation],
	);

	const handleDisconnect = useCallback(() => {
		disconnectMutation.mutate();
	}, [disconnectMutation]);

	const handleSync = useCallback(() => {
		syncMutation.mutate();
	}, [syncMutation]);

	if (!selectedLocation) {
		return (
			<div className="container py-8">
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						Please select a location to configure Google Business Profile
						integration.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="container space-y-6 py-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight">
					Google Business Profile Integration
				</h1>
				<p className="text-muted-foreground">
					Connect your Google Business Profile to manage reviews for{" "}
					{selectedLocation}
				</p>
			</div>

			{/* Connection Status */}
			<ConnectionStatusCard credentials={credentials} isLoading={isLoading} />

			{/* Configuration Form */}
			<ConfigurationForm
				credentials={credentials}
				onSave={handleSave}
				onDisconnect={handleDisconnect}
				isSaving={saveMutation.isPending}
				isDisconnecting={disconnectMutation.isPending}
			/>

			{/* Manual Sync */}
			{credentials?.id && (
				<ManualSyncCard
					onSync={handleSync}
					isSyncing={syncMutation.isPending}
				/>
			)}
		</div>
	);
}
