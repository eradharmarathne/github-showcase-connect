import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Globe, Info, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { supabase } from "@/integrations/supabase/client";

interface PublicBookingSettings {
	public_booking_enabled: boolean;
	public_booking_message: string | null;
	public_booking_email: string | null;
	public_booking_phone: string | null;
	show_room_prices: boolean;
	require_booking_approval: boolean;
}

export function PublicBookingSettings() {
	const { toast } = useToast();
	const { tenant } = useAuth();
	const { selectedLocation, locations } = useLocationContext();
	const queryClient = useQueryClient();
	
	const [username, setUsername] = useState("");
	const [usernameError, setUsernameError] = useState("");
	const [isCheckingUsername, setIsCheckingUsername] = useState(false);
	const [copied, setCopied] = useState(false);
	
	const [settings, setSettings] = useState<PublicBookingSettings>({
		public_booking_enabled: false,
		public_booking_message: null,
		public_booking_email: null,
		public_booking_phone: null,
		show_room_prices: false,
		require_booking_approval: true,
	});

	// Fetch tenant username
	const { data: tenantData, isLoading: loadingTenant } = useQuery({
		queryKey: ["tenant-username", tenant?.id],
		queryFn: async () => {
			if (!tenant?.id) return null;
			
			const { data, error } = await supabase
				.from("tenants")
				.select("username")
				.eq("id", tenant.id)
				.single();
			
			if (error) throw error;
			return data;
		},
		enabled: !!tenant?.id,
	});

	// Fetch location settings
	const { data: locationData, isLoading: loadingLocation } = useQuery({
		queryKey: ["location-public-booking", selectedLocation],
		queryFn: async () => {
			if (!selectedLocation) return null;
			
			const { data, error } = await supabase
				.from("locations")
				.select(`
					id,
					name,
					public_booking_enabled,
					public_booking_message,
					public_booking_email,
					public_booking_phone,
					show_room_prices,
					require_booking_approval
				`)
				.eq("id", selectedLocation)
				.single();
			
			if (error) throw error;
			return data;
		},
		enabled: !!selectedLocation,
	});

	// Set initial values
	useEffect(() => {
		if (tenantData?.username) {
			setUsername(tenantData.username);
		}
	}, [tenantData]);

	useEffect(() => {
		if (locationData) {
			setSettings({
				public_booking_enabled: locationData.public_booking_enabled ?? false,
				public_booking_message: locationData.public_booking_message,
				public_booking_email: locationData.public_booking_email,
				public_booking_phone: locationData.public_booking_phone,
				show_room_prices: locationData.show_room_prices ?? false,
				require_booking_approval: locationData.require_booking_approval ?? true,
			});
		}
	}, [locationData]);

	// Check username availability
	const checkUsername = async (value: string) => {
		if (!value || value === tenantData?.username) {
			setUsernameError("");
			return true;
		}

		// Validate format
		const usernameRegex = /^[a-z0-9_-]{3,30}$/;
		if (!usernameRegex.test(value)) {
			setUsernameError("Username must be 3-30 characters, lowercase letters, numbers, hyphens, or underscores only");
			return false;
		}

		setIsCheckingUsername(true);
		try {
			const { data, error } = await supabase
				.from("tenants")
				.select("id")
				.eq("username", value)
				.maybeSingle();

			if (error) throw error;

			if (data) {
				setUsernameError("Username is already taken");
				return false;
			}

			setUsernameError("");
			return true;
		} catch (error) {
			console.error("Error checking username:", error);
			setUsernameError("Error checking availability");
			return false;
		} finally {
			setIsCheckingUsername(false);
		}
	};

	// Update username mutation
	const updateUsernameMutation = useMutation({
		mutationFn: async (newUsername: string) => {
			const { error } = await supabase
				.from("tenants")
				.update({ username: newUsername })
				.eq("id", tenant?.id);

			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tenant-username"] });
			toast({
				title: "Username Updated",
				description: "Your public booking URL has been updated.",
			});
		},
		onError: (error: any) => {
			toast({
				title: "Error",
				description: error.message || "Failed to update username.",
				variant: "destructive",
			});
		},
	});

	// Update location settings mutation
	const updateSettingsMutation = useMutation({
		mutationFn: async (newSettings: Partial<PublicBookingSettings>) => {
			const { error } = await supabase
				.from("locations")
				.update(newSettings)
				.eq("id", selectedLocation)
				.eq("tenant_id", tenant?.id);

			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["location-public-booking"] });
			toast({
				title: "Settings Updated",
				description: "Public booking settings have been saved.",
			});
		},
		onError: (error: any) => {
			toast({
				title: "Error",
				description: error.message || "Failed to update settings.",
				variant: "destructive",
			});
		},
	});

	const handleUsernameBlur = async () => {
		if (username !== tenantData?.username) {
			const isValid = await checkUsername(username);
			if (isValid && !usernameError) {
				updateUsernameMutation.mutate(username);
			}
		}
	};

	const handleSettingChange = (key: keyof PublicBookingSettings, value: any) => {
		const newSettings = { ...settings, [key]: value };
		setSettings(newSettings);
		updateSettingsMutation.mutate({ [key]: value });
	};

	const currentLocation = locations.find(l => l.id === selectedLocation);
	const publicUrl = `${window.location.origin}/r/${username}`;

	const copyToClipboard = () => {
		navigator.clipboard.writeText(publicUrl);
		setCopied(true);
		toast({
			title: "Copied!",
			description: "Public booking URL copied to clipboard.",
		});
		setTimeout(() => setCopied(false), 2000);
	};

	const openPublicPage = () => {
		window.open(publicUrl, "_blank");
	};

	if (loadingTenant || loadingLocation) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Globe className="h-5 w-5" />
						Public Booking Page
					</CardTitle>
				</CardHeader>
				<CardContent className="flex items-center justify-center py-8">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Username Settings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Globe className="h-5 w-5" />
						Public Booking Username
					</CardTitle>
					<CardDescription>
						Set your unique username for public booking URLs. This will be used across all locations.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<Label htmlFor="username">Username</Label>
						<div className="flex gap-2 mt-1">
							<div className="flex-1 flex items-center gap-2">
								<span className="text-sm text-muted-foreground">checkingcheckout.com/r/</span>
								<Input
									id="username"
									value={username}
									onChange={(e) => {
										const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
										setUsername(value);
										setUsernameError("");
									}}
									onBlur={handleUsernameBlur}
									placeholder="yourhotel"
									className={usernameError ? "border-red-500" : ""}
									disabled={updateUsernameMutation.isPending}
								/>
								{isCheckingUsername && (
									<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
								)}
							</div>
						</div>
						{usernameError && (
							<p className="text-sm text-red-500 mt-1 flex items-center gap-1">
								<X className="h-3 w-3" />
								{usernameError}
							</p>
						)}
						{username && !usernameError && !isCheckingUsername && username !== tenantData?.username && (
							<p className="text-sm text-green-600 mt-1 flex items-center gap-1">
								<Check className="h-3 w-3" />
								Username is available
							</p>
						)}
						<p className="text-xs text-muted-foreground mt-2">
							3-30 characters, lowercase letters, numbers, hyphens, or underscores only
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Location Settings */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Public Booking Settings</CardTitle>
							<CardDescription>
								Configure public booking page for {currentLocation?.name}
							</CardDescription>
						</div>
						<Badge variant={settings.public_booking_enabled ? "default" : "secondary"}>
							{settings.public_booking_enabled ? "Enabled" : "Disabled"}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Public URL Display */}
					{settings.public_booking_enabled && (
						<div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
							<div className="flex items-start gap-2 mb-2">
								<Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
								<div className="flex-1">
									<p className="text-sm font-medium text-blue-900 dark:text-blue-100">
										Your Public Booking URL
									</p>
									<p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
										This URL is shared across all your locations. Guests can select their preferred location on the booking page.
									</p>
									<div className="flex items-center gap-2 mt-2">
										<code className="flex-1 text-sm bg-white dark:bg-gray-800 px-3 py-2 rounded border">
											{publicUrl}
										</code>
										<Button
											variant="outline"
											size="sm"
											onClick={copyToClipboard}
											className="shrink-0"
										>
											{copied ? (
												<Check className="h-4 w-4" />
											) : (
												<Copy className="h-4 w-4" />
											)}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={openPublicPage}
											className="shrink-0"
										>
											<ExternalLink className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Enable/Disable Toggle */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>Enable Public Booking</Label>
							<p className="text-sm text-muted-foreground">
								Allow guests to submit booking requests through your public page
							</p>
						</div>
						<Switch
							checked={settings.public_booking_enabled}
							onCheckedChange={(checked) => handleSettingChange("public_booking_enabled", checked)}
						/>
					</div>

					{settings.public_booking_enabled && (
						<>
							{/* Welcome Message */}
							<div className="space-y-2">
								<Label htmlFor="message">Welcome Message</Label>
								<Textarea
									id="message"
									value={settings.public_booking_message || ""}
									onChange={(e) => setSettings({ ...settings, public_booking_message: e.target.value })}
									onBlur={() => handleSettingChange("public_booking_message", settings.public_booking_message)}
									placeholder="Welcome to our hotel! Fill out the form below to request a booking..."
									rows={3}
								/>
								<p className="text-xs text-muted-foreground">
									This message will be displayed at the top of your public booking page
								</p>
							</div>

							{/* Contact Information */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="email">Contact Email</Label>
									<Input
										id="email"
										type="email"
										value={settings.public_booking_email || ""}
										onChange={(e) => setSettings({ ...settings, public_booking_email: e.target.value })}
										onBlur={() => handleSettingChange("public_booking_email", settings.public_booking_email)}
										placeholder="bookings@yourhotel.com"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="phone">Contact Phone</Label>
									<Input
										id="phone"
										type="tel"
										value={settings.public_booking_phone || ""}
										onChange={(e) => setSettings({ ...settings, public_booking_phone: e.target.value })}
										onBlur={() => handleSettingChange("public_booking_phone", settings.public_booking_phone)}
										placeholder="+1 234 567 8900"
									/>
								</div>
							</div>

							{/* Additional Settings */}
							<div className="space-y-4 pt-4 border-t">
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Show Room Prices</Label>
										<p className="text-sm text-muted-foreground">
											Display room rates on the public booking page
										</p>
									</div>
									<Switch
										checked={settings.show_room_prices}
										onCheckedChange={(checked) => handleSettingChange("show_room_prices", checked)}
									/>
								</div>

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Require Approval</Label>
										<p className="text-sm text-muted-foreground">
											Booking requests will be marked as pending for manual approval
										</p>
									</div>
									<Switch
										checked={settings.require_booking_approval}
										onCheckedChange={(checked) => handleSettingChange("require_booking_approval", checked)}
									/>
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
