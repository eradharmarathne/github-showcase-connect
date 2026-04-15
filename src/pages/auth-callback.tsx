/**
 * OAuth callback page used by the mobile app (Expo web) for Google sign-in.
 * Supabase redirects here after Google auth. This page extracts tokens from the URL hash
 * and postMessages them to the opener (mobile app popup parent), then closes.
 * This allows the mobile app on a different port (e.g. 8082) to receive auth tokens
 * even though Supabase only redirects to the web app (8080).
 */
import { useEffect, useState } from "react";

export default function AuthCallback() {
	const [status, setStatus] = useState<"processing" | "success" | "error">(
		"processing",
	);

	useEffect(() => {
		const hash = window.location.hash;
		if (!hash) {
			setStatus("error");
			return;
		}

		const params = new URLSearchParams(hash.substring(1));
		const accessToken = params.get("access_token");
		const refreshToken = params.get("refresh_token");
		const searchParams = new URLSearchParams(window.location.search);
		const returnOrigin = searchParams.get("return_origin");
		const returnUrl = searchParams.get("return_url");

		if (!accessToken || !refreshToken) {
			setStatus("error");
			return;
		}

		// Native app (Expo/React Native): redirect to app deep link with tokens in hash
		if (returnUrl && (returnUrl.startsWith("exp://") || returnUrl.startsWith("myapp://"))) {
			window.location.replace(`${returnUrl}${hash.startsWith("#") ? hash : `#${hash}`}`);
			setStatus("success");
			return;
		}

		// Web (mobile app in browser): postMessage to opener
		if (window.opener && returnOrigin) {
			window.opener.postMessage(
				{
					type: "supabase-auth-callback",
					accessToken,
					refreshToken,
				},
				returnOrigin,
			);
			setStatus("success");
			window.close();
		} else {
			// Opened directly (e.g. web app OAuth) - let Supabase handle it
			window.location.replace(`/smart-redirect${hash ? `#${hash}` : ""}`);
		}
	}, []);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="text-center">
				{status === "processing" && (
					<p className="text-muted-foreground">Completing sign in...</p>
				)}
				{status === "success" && (
					<p className="text-muted-foreground">
						Sign in complete. You can close this window.
					</p>
				)}
				{status === "error" && (
					<p className="text-destructive">Authentication failed.</p>
				)}
			</div>
		</div>
	);
}
