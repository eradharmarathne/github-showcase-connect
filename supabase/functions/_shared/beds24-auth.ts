/**
 * Shared Beds24 Authentication Utilities
 * 
 * Handles token refresh and authentication for Beds24 API V2
 * Based on official Beds24 Wiki documentation:
 * https://wiki.beds24.com/index.php/Category:API_V2
 */

// Beds24 API URLs - Authentication uses different base URL!
export const BEDS24_AUTH_URL = "https://beds24.com/api/v2";
export const BEDS24_API_URL = "https://api.beds24.com/v2";

interface TokenRefreshResult {
	token: string;
	expiresAt: Date;
}

/**
 * Refresh Beds24 access token using refresh token
 * 
 * IMPORTANT: Uses GET method with refreshToken in header (not POST with body)
 * Token expires after 24 hours
 * 
 * @param supabase - Supabase client for database updates
 * @param credentialId - UUID of beds24_credentials record
 * @param refreshToken - Long-lived refresh token
 * @returns New access token and expiry date
 */
export async function refreshBeds24Token(
	supabase: any,
	credentialId: string,
	refreshToken: string,
): Promise<TokenRefreshResult> {
	console.log("🔄 Refreshing Beds24 access token...");

	// Official Beds24 API V2 token refresh endpoint
	// Method: GET (not POST!)
	// Header: refreshToken (not in body!)
	const response = await fetch(
		`${BEDS24_AUTH_URL}/authentication/token`,
		{
			method: "GET", // ✅ Correct: GET method
			headers: {
				accept: "application/json",
				refreshToken: refreshToken, // ✅ Correct: In header, not body
			},
		},
	);

	if (!response.ok) {
		const errorText = await response.text();
		console.error("❌ Token refresh failed:", response.status, errorText);
		throw new Error(
			`Token refresh failed: ${response.status} ${response.statusText}`,
		);
	}

	const tokenData = await response.json();
	const newAccessToken = tokenData.token;
	const expiresIn = tokenData.expiresIn || 3600; // Default 1 hour

	// Calculate expiry with 60 second buffer
	const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000);

	console.log(
		`✅ Token refreshed successfully. Expires at: ${expiresAt.toISOString()}`,
	);

	// Update database with new token
	const { error: updateError } = await supabase
		.from("beds24_credentials")
		.update({
			access_token: newAccessToken,
			token_expires_at: expiresAt.toISOString(),
		})
		.eq("id", credentialId);

	if (updateError) {
		console.error(
			"⚠️ Failed to update access token in database:",
			updateError,
		);
		// Don't throw - we can still use the token for this request
	}

	return { token: newAccessToken, expiresAt };
}

/**
 * Get valid Beds24 access token, refreshing if needed
 * 
 * Checks token expiry with 5-minute buffer and refreshes if needed
 * 
 * @param supabase - Supabase client
 * @param credentialId - UUID of beds24_credentials record
 * @param currentToken - Current access token (may be expired)
 * @param tokenExpiresAt - Token expiry date
 * @param refreshToken - Refresh token for getting new access token
 * @returns Valid access token
 */
export async function getBeds24Token(
	supabase: any,
	credentialId: string,
	currentToken: string | null,
	tokenExpiresAt: Date | null,
	refreshToken: string,
): Promise<string> {
	// Check if token is expired or about to expire (5 min buffer)
	const now = Date.now();
	const expiryTime = tokenExpiresAt ? tokenExpiresAt.getTime() : 0;
	const bufferTime = 5 * 60 * 1000; // 5 minutes

	if (!currentToken || now > expiryTime - bufferTime) {
		console.log("🔑 Token expired or missing, refreshing...");
		const { token } = await refreshBeds24Token(
			supabase,
			credentialId,
			refreshToken,
		);
		return token;
	}

	console.log("✅ Using existing valid token");
	return currentToken;
}

/**
 * Make authenticated request to Beds24 API with automatic token refresh
 * 
 * Includes rate limit monitoring and response validation
 * 
 * @param path - API path (e.g., "/bookings", "/properties")
 * @param supabase - Supabase client
 * @param credentialId - UUID of beds24_credentials record
 * @param accessToken - Current access token
 * @param tokenExpiresAt - Token expiry date
 * @param refreshToken - Refresh token
 * @param options - Fetch options (method, body, etc.)
 * @returns API response data
 */
export async function beds24ApiRequest(
	path: string,
	supabase: any,
	credentialId: string,
	accessToken: string | null,
	tokenExpiresAt: Date | null,
	refreshToken: string,
	options: RequestInit = {},
): Promise<any> {
	// Get valid token
	let currentToken = await getBeds24Token(
		supabase,
		credentialId,
		accessToken,
		tokenExpiresAt,
		refreshToken,
	);

	// Make request with token
	let response = await fetch(`${BEDS24_API_URL}${path}`, {
		...options,
		headers: {
			accept: "application/json",
			token: currentToken, // ✅ Token in header
			...options.headers,
		},
	});

	// Monitor rate limits
	const remaining = response.headers.get("X-FiveMinCreditLimit-Remaining");
	const resetIn = response.headers.get("X-FiveMinCreditLimit-ResetsIn");
	const requestCost = response.headers.get("X-RequestCost");

	if (remaining) {
		const remainingInt = Number.parseInt(remaining);
		if (remainingInt < 10) {
			console.warn(
				`⚠️ Low API credits: ${remaining} remaining, resets in ${resetIn}s, cost: ${requestCost}`,
			);
		} else {
			console.log(
				`📊 API credits: ${remaining} remaining, cost: ${requestCost}`,
			);
		}
	}

	// If 401, try refreshing token once more
	if (response.status === 401) {
		console.log("🔄 Got 401, refreshing token and retrying...");
		const { token } = await refreshBeds24Token(
			supabase,
			credentialId,
			refreshToken,
		);
		currentToken = token;

		response = await fetch(`${BEDS24_API_URL}${path}`, {
			...options,
			headers: {
				accept: "application/json",
				token: currentToken,
				...options.headers,
			},
		});
	}

	if (!response.ok) {
		const errorText = await response.text();
		console.error(
			`❌ Beds24 API request failed: ${response.status}`,
			errorText,
		);
		throw new Error(
			`Beds24 API request failed: ${response.status} ${response.statusText}`,
		);
	}

	const data = await response.json();

	// Validate response structure (Beds24 API v2 returns {success: true/false})
	if (data.success === false) {
		console.error("❌ Beds24 API returned error:", data);
		throw new Error(`Beds24 API error: ${JSON.stringify(data)}`);
	}

	return data;
}
