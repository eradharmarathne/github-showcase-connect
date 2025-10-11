import { memo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";

type GoogleCredential = Tables<"google_business_credentials">;

interface ConfigurationFormProps {
	credentials: GoogleCredential | null;
	onSave: (accountId: string, locationId: string) => void;
	onDisconnect: () => void;
	isSaving: boolean;
	isDisconnecting: boolean;
}

export const ConfigurationForm = memo(function ConfigurationForm({
	credentials,
	onSave,
	onDisconnect,
	isSaving,
	isDisconnecting,
}: ConfigurationFormProps) {
	const [googleAccountId, setGoogleAccountId] = useState("");
	const [googleLocationId, setGoogleLocationId] = useState("");

	// Initialize form with existing credentials
	useEffect(() => {
		if (credentials) {
			setGoogleAccountId(credentials.google_account_id || "");
			setGoogleLocationId(credentials.google_location_id || "");
		}
	}, [credentials]);

	const handleSave = () => {
		onSave(googleAccountId, googleLocationId);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Google Business Profile Configuration</CardTitle>
				<CardDescription>
					Enter your Google Business Profile credentials to enable review
					management
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="google-account-id">Google Account ID</Label>
					<Input
						id="google-account-id"
						placeholder="e.g., 123456789012345678"
						value={googleAccountId}
						onChange={(e) => setGoogleAccountId(e.target.value)}
						disabled={isSaving}
					/>
					<p className="text-xs text-muted-foreground">
						Your Google Business Profile account number
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="google-location-id">Google Location ID</Label>
					<Input
						id="google-location-id"
						placeholder="e.g., 987654321098765432"
						value={googleLocationId}
						onChange={(e) => setGoogleLocationId(e.target.value)}
						disabled={isSaving}
					/>
					<p className="text-xs text-muted-foreground">
						The location ID for this specific property
					</p>
				</div>

				<div className="flex justify-end space-x-2">
					{credentials?.id && (
						<Button
							variant="outline"
							onClick={onDisconnect}
							disabled={isDisconnecting || isSaving}
						>
							Disconnect
						</Button>
					)}
					<Button
						onClick={handleSave}
						disabled={
							isSaving || !googleAccountId.trim() || !googleLocationId.trim()
						}
					>
						{isSaving
							? "Saving..."
							: credentials?.id
								? "Update"
								: "Save Configuration"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
});
