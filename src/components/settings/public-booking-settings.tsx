import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Check,
	Copy,
	ExternalLink,
	Globe,
	Info,
	Loader2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { useToast } from "@/hooks/use-toast";
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

	const [locationSlugInput, setLocationSlugInput] = useState("");
	const [slugError, setSlugError] = useState("");
	const [isCheckingSlug, setIsCheckingSlug] = useState(false);
	const [copied, setCopied] = useState(false);

	const [settings, setSettings] = useState<PublicBookingSettings>({
		public_booking_enabled: false,
		public_booking_message: null,
		public_booking_email: null,
		public_booking_phone: null,
		show_room_prices: false,
		require_booking_approval: true,
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
					slug,
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
		if (locationData) {
			setSettings({
				public_booking_enabled: locationData.public_booking_enabled ?? false,
				public_booking_message: locationData.public_booking_message,
				public_booking_email: locationData.public_booking_email,
				public_booking_phone: locationData.public_booking_phone,
				show_room_prices: locationData.show_room_prices ?? false,
				require_booking_approval: locationData.require_booking_approval ?? true,
			});
			setLocationSlugInput(locationData.slug || "");
		}
	}, [locationData]);

	// Update location settings mutation (includes slug)
	const updateSettingsMutation = useMutation({
		mutationFn: async (
			newSettings: Partial<PublicBookingSettings> & { slug?: string },
		) => {
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

	const handleSlugBlur = async () => {
		if (locationSlugInput && locationSlugInput !== locationData?.slug) {
			updateSettingsMutation.mutate({ slug: locationSlugInput });
		}
	};

	const handleSettingChange = (
		key: keyof PublicBookingSettings,
		value: any,
	) => {
		const newSettings = { ...settings, [key]: value };
		setSettings(newSettings);
		updateSettingsMutation.mutate({ [key]: value });
	};

	const currentLocation = locations.find((l) => l.id === selectedLocation);
	const locationSlug = locationData?.slug || "";
	const publicUrl = locationSlug
		? `${window.location.origin}/r/${locationSlug}`
		: "";

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

	if (loadingLocation) {
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
						<Badge
							variant={
								settings.public_booking_enabled ? "default" : "secondary"
							}
						>
							{settings.public_booking_enabled ? "Enabled" : "Disabled"}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Location Slug */}
					<div className="space-y-2">
						<Label htmlFor="locationSlug">
							Location Slug <span className="text-red-500">*</span>
						</Label>
						<div className="flex gap-2">
							<div className="flex-1 flex items-center gap-2">
								<span className="text-sm text-muted-foreground">
									checkingcheckout.com/r/
								</span>
								<Input
									id="locationSlug"
									value={locationSlugInput}
									onChange={(e) => {
										const value = e.target.value
											.toLowerCase()
											.replace(/[^a-z0-9_-]/g, "");
										setLocationSlugInput(value);
										setSlugError("");
									}}
									onBlur={handleSlugBlur}
									placeholder="beach-resort"
									className={slugError ? "border-red-500" : ""}
								/>
							</div>
						</div>
						{slugError && (
							<p className="text-sm text-red-500 mt-1 flex items-center gap-1">
								<X className="h-3 w-3" />
								{slugError}
							</p>
						)}
						<p className="text-xs text-muted-foreground">
							Unique URL path for this location. Use lowercase letters, numbers,
							hyphens, or underscores.
						</p>
					</div>

					{/* Public URL Display */}
					{settings.public_booking_enabled && publicUrl && (
						<div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
							<div className="flex items-start gap-2 mb-2">
								<Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
								<div className="flex-1">
									<p className="text-sm font-medium text-blue-900 dark:text-blue-100">
										Your Public Booking URL
									</p>
									<p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
										This is the unique URL for this location's public booking
										page.
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
							onCheckedChange={(checked) =>
								handleSettingChange("public_booking_enabled", checked)
							}
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
									onChange={(e) =>
										setSettings({
											...settings,
											public_booking_message: e.target.value,
										})
									}
									onBlur={() =>
										handleSettingChange(
											"public_booking_message",
											settings.public_booking_message,
										)
									}
									placeholder="Welcome to our hotel! Fill out the form below to request a booking..."
									rows={3}
								/>
								<p className="text-xs text-muted-foreground">
									This message will be displayed at the top of your public
									booking page
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
										onChange={(e) =>
											setSettings({
												...settings,
												public_booking_email: e.target.value,
											})
										}
										onBlur={() =>
											handleSettingChange(
												"public_booking_email",
												settings.public_booking_email,
											)
										}
										placeholder="bookings@yourhotel.com"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="phone">Contact Phone</Label>
									<Input
										id="phone"
										type="tel"
										value={settings.public_booking_phone || ""}
										onChange={(e) =>
											setSettings({
												...settings,
												public_booking_phone: e.target.value,
											})
										}
										onBlur={() =>
											handleSettingChange(
												"public_booking_phone",
												settings.public_booking_phone,
											)
										}
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
										onCheckedChange={(checked) =>
											handleSettingChange("show_room_prices", checked)
										}
									/>
								</div>

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Require Approval</Label>
										<p className="text-sm text-muted-foreground">
											Booking requests will be marked as pending for manual
											approval
										</p>
									</div>
									<Switch
										checked={settings.require_booking_approval}
										onCheckedChange={(checked) =>
											handleSettingChange("require_booking_approval", checked)
										}
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
