
import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

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

	// Use refs to track current state and prevent stale closures
	const profileRef = useRef<Profile | null>(null);
	const tenantIdRef = useRef<string | null>(null);

	const fetchProfile = async (userId: string) => {
		logger.debug("Fetching profile for user", { userId });
		setProfileLoading(true);
		try {
			const { data, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single();

			if (error) {
				logger.error("Error fetching profile", error);
				return null;
			}

			logger.debug("Profile fetched", {
				id: data.id,
				email: data.email,
				tenant_id: data.tenant_id,
				tenant_role: data.tenant_role,
			});
			setProfile(data);
			return data;
		} catch (error) {
			logger.error("Exception fetching profile", error);
			return null;
		} finally {
			setProfileLoading(false);
		}
	};

	const fetchTenant = async (tenantId: string) => {
		logger.debug("Fetching tenant", { tenantId });
		setTenantLoading(true);
		try {
			const { data, error } = await supabase
				.from("tenants")
				.select("*")
				.eq("id", tenantId)
				.single();

			if (error) {
				logger.error("Error fetching tenant", error);
				return null;
			}

			logger.debug("Tenant fetched", {
				id: data.id,
				name: data.name,
				onboarding_completed: data.onboarding_completed,
			});
			setTenant(data);
			return data;
		} catch (error) {
			logger.error("Exception fetching tenant", error);
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
				logger.error("Error fetching subscription", error);
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
			logger.error("Exception fetching subscription", error);
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

	// Keep refs in sync with state to prevent stale closures
	useEffect(() => {
		profileRef.current = profile;
		if (profile?.tenant_id !== tenantIdRef.current) {
			tenantIdRef.current = profile?.tenant_id || null;
		}
	}, [profile, tenant]);

	// Separate effect to fetch tenant data when tenant_id changes
	useEffect(() => {
		const fetchTenantData = async () => {
			if (profile?.tenant_id && profile.tenant_id !== tenantIdRef.current) {
				tenantIdRef.current = profile.tenant_id;
				await fetchTenant(profile.tenant_id);
				await fetchSubscription(profile.tenant_id);
			}
		};

		fetchTenantData();
	}, [profile?.tenant_id]);

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
					logger.debug("SIGNED_IN event", { email: session.user.email });
					// Only create/update profile if we don't already have one for this user
					// Use ref to avoid stale closure issues
					const currentProfile = profileRef.current;
					if (!currentProfile || currentProfile.id !== session.user.id) {
						// Small delay to ensure the auth state is fully set
						setTimeout(async () => {
							try {
								logger.debug("Checking profile for user", { email: session.user.email });

								// First, try to fetch the existing profile (trigger might have created it)
								let profileData = await fetchProfile(session.user.id);

								// If profile doesn't exist, create it (fallback)
								if (!profileData) {
									logger.debug("Profile not found, creating new profile...");

									const newProfileData = {
										id: session.user.id,
										email: session.user.email!,
										name:
											session.user.user_metadata?.name ||
											session.user.user_metadata?.full_name ||
											session.user.email!.split("@")[0],
									};

									// Insert profile (don't use upsert to avoid conflicts)
									const { error: profileError } = await supabase
										.from("profiles")
										.insert(newProfileData);

									if (profileError) {
										logger.error("Error creating profile", profileError);
										// If error is duplicate, that's okay - fetch it instead
										if (profileError.code === "23505") {
											logger.debug("Profile already exists, fetching...");
											profileData = await fetchProfile(session.user.id);
										}
									} else {
										logger.info("Profile created successfully", { email: session.user.email });
										// Fetch the newly created profile
										profileData = await fetchProfile(session.user.id);
									}
								} else {
									logger.debug("Profile already exists", { email: session.user.email });
								}

								// If the profile has a tenant_id, fetch tenant and subscription data
								if (profileData?.tenant_id) {
									logger.debug("Profile has tenant_id, fetching tenant data...");
									await fetchTenant(profileData.tenant_id);
									await fetchSubscription(profileData.tenant_id);
								} else {
									logger.warn("Profile has NO tenant_id - user will be redirected to pending-invitation");
								}
							} catch (err) {
								logger.error("Exception during profile creation", err);
								// Don't sign out on profile creation errors in SaaS mode
								logger.warn("Continuing despite profile creation error");
							}
						}, 0);
					} else {
						// Profile already exists for this user, just ensure tenant data is loaded
						logger.debug("Profile exists, checking tenant data...");
						// Fetch the profile again to get latest data
						const latestProfile = await fetchProfile(session.user.id);
						if (latestProfile?.tenant_id) {
							await fetchTenant(latestProfile.tenant_id);
							await fetchSubscription(latestProfile.tenant_id);
						}
					}
				}
			},
		);

		// THEN check for existing session
		supabase.auth.getSession().then(async ({ data: { session } }) => {
			setSession(session);
			setUser(session?.user ?? null);

			if (session?.user) {
				// Fetch profile data for existing session
				const profileData = await fetchProfile(session.user.id);

				// If the profile has a tenant_id, fetch tenant and subscription data
				if (profileData?.tenant_id) {
					await fetchTenant(profileData.tenant_id);
					await fetchSubscription(profileData.tenant_id);
				}
			}

			setLoading(false);
		});

		return () => subscription.data.subscription.unsubscribe();
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
