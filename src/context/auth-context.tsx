import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Tenant = Tables<"tenants">;
type Subscription = Tables<"subscriptions">;

interface AuthContextType {
	user: User | null;
	session: Session | null;
	profile: Profile | null;
	tenant: Tenant | null;
	subscription: Subscription | null;
	loading: boolean;
	profileLoading: boolean;
	tenantLoading: boolean;
	signOut: () => Promise<void>;
	refreshProfile: () => Promise<void>;
	refreshTenant: () => Promise<void>;
	hasActiveTrial: boolean;
	hasActiveSubscription: boolean;
	isOwner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [tenant, setTenant] = useState<Tenant | null>(null);
	const [subscription, setSubscription] = useState<Subscription | null>(null);
	const [loading, setLoading] = useState(true);
	const [profileLoading, setProfileLoading] = useState(false);
	const [tenantLoading, setTenantLoading] = useState(false);

	const fetchProfile = async (userId: string) => {
		setProfileLoading(true);
		try {
			const { data, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single();

			if (error) {
				console.error("Error fetching profile:", error);
				return null;
			}

			setProfile(data);
			return data;
		} catch (error) {
			console.error("Exception fetching profile:", error);
			return null;
		} finally {
			setProfileLoading(false);
		}
	};

	const fetchTenant = async (tenantId: string) => {
		setTenantLoading(true);
		try {
			const { data, error } = await supabase
				.from("tenants")
				.select("*")
				.eq("id", tenantId)
				.single();

			if (error) {
				console.error("Error fetching tenant:", error);
				return null;
			}

			setTenant(data);
			return data;
		} catch (error) {
			console.error("Exception fetching tenant:", error);
			return null;
		} finally {
			setTenantLoading(false);
		}
	};

	const fetchSubscription = async (tenantId: string) => {
		try {
			const { data, error } = await supabase
				.from("subscriptions")
				.select("*")
				.eq("tenant_id", tenantId)
				.in("status", ["active", "trialing"])
				.maybeSingle(); // Use maybeSingle to handle no results gracefully

			if (error) {
				console.error("Error fetching subscription:", error);
				// Don't set subscription to null for 406 errors - they're expected when no subscription exists
				if (
					!error.message?.includes("406") &&
					!error.message?.includes("Not Acceptable")
				) {
					setSubscription(null);
				}
				return null;
			}

			setSubscription(data);
			return data;
		} catch (error) {
			console.error("Exception fetching subscription:", error);
			return null;
		}
	};
	const refreshProfile = async () => {
		if (user) {
			await fetchProfile(user.id);
		}
	};

	const refreshTenant = async () => {
		if (profile?.tenant_id) {
			await fetchTenant(profile.tenant_id);
			await fetchSubscription(profile.tenant_id);
		}
	};

	// These functions only depend on stable setter functions, safe to omit from dependencies
	// biome-ignore lint/correctness/useExhaustiveDependencies: Functions only depend on stable setters
	useEffect(() => {
		const subscription = supabase.auth.onAuthStateChange(
			async (event, session) => {
				setSession(session);
				setUser(session?.user ?? null);

				if (event === "SIGNED_OUT") {
					setProfile(null);
					setTenant(null);
					setSubscription(null);
				}

				if (event === "SIGNED_IN" && session?.user) {
					// Only create/update profile if we don't already have one for this user
					if (!profile || profile.id !== session.user.id) {
						// Small delay to ensure the auth state is fully set
						setTimeout(async () => {
							try {
								console.log(
									"Creating/updating profile for user:",
									session.user.email,
								);

								// Create or update profile
								const profileData = {
									id: session.user.id,
									email: session.user.email!,
									name:
										session.user.user_metadata?.name ||
										session.user.user_metadata?.full_name ||
										session.user.email!,
								};

								// Create profile - use upsert to handle existing profiles gracefully
								const { error: profileError } = await supabase
									.from("profiles")
									.upsert(profileData, {
										onConflict: "id",
									});

								if (profileError) {
									console.error(
										"Error creating/updating profile:",
										profileError,
									);
								} else {
									console.log(
										"Profile created/updated successfully for:",
										session.user.email,
									);

									// Fetch the profile data after creation/update
									const profileData = await fetchProfile(session.user.id);

									// If the profile has a tenant_id, fetch tenant and subscription data
									if (profileData?.tenant_id) {
										await fetchTenant(profileData.tenant_id);
										await fetchSubscription(profileData.tenant_id);
									}
								}
							} catch (err) {
								console.error("Exception during profile creation:", err);
								// Don't sign out on profile creation errors in SaaS mode
								console.warn("Continuing despite profile creation error");
							}
						}, 0);
					} else {
						// Profile already exists for this user, just ensure tenant data is loaded
						if (profile.tenant_id) {
							await fetchTenant(profile.tenant_id);
							await fetchSubscription(profile.tenant_id);
						}
					}
				}
			},
		);

		// THEN check for existing session
		supabase.auth.getSession().then(async ({ data: { session } }) => {
			console.log("Auth: Initial session check", { 
				hasSession: !!session, 
				userId: session?.user?.id,
				email: session?.user?.email 
			});
			
			setSession(session);
			setUser(session?.user ?? null);

			if (session?.user) {
				// Fetch profile data for existing session
				console.log("Auth: Fetching profile for existing session");
				const profileData = await fetchProfile(session.user.id);

				// If the profile has a tenant_id, fetch tenant and subscription data
				if (profileData?.tenant_id) {
					console.log("Auth: Fetching tenant and subscription data");
					await fetchTenant(profileData.tenant_id);
					await fetchSubscription(profileData.tenant_id);
				} else {
					console.log("Auth: No tenant_id in profile, user may need onboarding");
				}
			}

			console.log("Auth: Setting loading to false");
			setLoading(false);
		});

		return () => subscription.data.subscription.unsubscribe();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const signOut = async () => {
		setProfile(null);
		setTenant(null);
		setSubscription(null);
		await supabase.auth.signOut();
	};

	// Computed values for subscription status
	const hasActiveTrial = tenant?.trial_ends_at
		? new Date(tenant.trial_ends_at) > new Date()
		: false;
	const hasActiveSubscription =
		subscription?.status === "active" || subscription?.status === "trialing";
	const isOwner = profile?.id === tenant?.owner_profile_id;

	const value = {
		user,
		session,
		profile,
		tenant,
		subscription,
		loading,
		profileLoading,
		tenantLoading,
		signOut,
		refreshProfile,
		refreshTenant,
		hasActiveTrial,
		hasActiveSubscription,
		isOwner,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
export { useAuth };
