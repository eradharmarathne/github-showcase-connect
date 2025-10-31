import { addDays, format, isAfter, isBefore } from "date-fns";
import { Calendar as CalendarIcon, Hotel, Loader2, Mail, MapPin, Phone, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Location {
	id: string;
	name: string;
	address?: string;
	public_booking_enabled: boolean;
	public_booking_message?: string | null;
	public_booking_email?: string | null;
	public_booking_phone?: string | null;
	show_room_prices: boolean;
}

interface Tenant {
	id: string;
	name: string;
	username: string;
}

interface BookingFormData {
	guestName: string;
	guestEmail: string;
	guestPhone: string;
	guestAddress: string;
	guestNationality: string;
	checkInDate: Date | undefined;
	checkOutDate: Date | undefined;
	adults: number;
	children: number;
	roomTypePreference: string;
	specialRequests: string;
}

export default function PublicBookingPage() {
	const { locationSlug } = useParams<{ locationSlug: string }>();
	const { toast } = useToast();

	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [tenant, setTenant] = useState<Tenant | null>(null);
	const [location, setLocation] = useState<Location | null>(null);
	const [roomTypes, setRoomTypes] = useState<string[]>([]);

	const [formData, setFormData] = useState<BookingFormData>({
		guestName: "",
		guestEmail: "",
		guestPhone: "",
		guestAddress: "",
		guestNationality: "",
		checkInDate: undefined,
		checkOutDate: undefined,
		adults: 1,
		children: 0,
		roomTypePreference: "",
		specialRequests: "",
	});

	// Fetch location data by slug
	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);

				// Fetch location by slug
				const { data: locationData, error: locationError } = await supabase
					.from("locations")
					.select(`
						id, 
						name, 
						address,
						tenant_id,
						public_booking_enabled,
						public_booking_message,
						public_booking_email,
						public_booking_phone,
						show_room_prices
					`)
					.eq("slug", locationSlug)
					.eq("public_booking_enabled", true)
					.single();

				if (locationError) throw locationError;
				
				if (!locationData) {
					throw new Error("Location not found or public booking is not enabled");
				}
				
				setLocation(locationData);

				// Fetch tenant info
				const { data: tenantData, error: tenantError } = await supabase
					.from("tenants")
					.select("id, name, username")
					.eq("id", locationData.tenant_id)
					.single();

				if (tenantError) throw tenantError;
				setTenant(tenantData);

				// Fetch available room types for this location
				const { data: roomsData, error: roomsError } = await supabase
					.from("rooms")
					.select("room_type")
					.eq("tenant_id", locationData.tenant_id)
					.eq("location_id", locationData.id)
					.eq("is_active", true);

				if (roomsError) throw roomsError;

				// Get unique room types
				const uniqueTypes = [...new Set(roomsData?.map((r) => r.room_type) || [])];
				setRoomTypes(uniqueTypes);
			} catch (error) {
				console.error("Error fetching data:", error);
				toast({
					title: "Error",
					description: error instanceof Error ? error.message : "Failed to load booking information. Please try again.",
					variant: "destructive",
				});
			} finally {
				setLoading(false);
			}
		};

		if (locationSlug) {
			fetchData();
		}
	}, [locationSlug, toast]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate location exists
		if (!location) {
			toast({
				title: "Location Not Found",
				description: "Invalid booking page.",
				variant: "destructive",
			});
			return;
		}

		// Validate required fields
		if (!formData.guestName || !formData.guestEmail || !formData.checkInDate || !formData.checkOutDate) {
			toast({
				title: "Missing Information",
				description: "Please fill in all required fields.",
				variant: "destructive",
			});
			return;
		}

		// Validate email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formData.guestEmail)) {
			toast({
				title: "Invalid Email",
				description: "Please enter a valid email address.",
				variant: "destructive",
			});
			return;
		}

		setSubmitting(true);

		try {
			const response = await fetch(
				`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-public-booking`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
					},
					body: JSON.stringify({
						locationSlug,
						guestName: formData.guestName,
						guestEmail: formData.guestEmail,
						guestPhone: formData.guestPhone || undefined,
						guestAddress: formData.guestAddress || undefined,
						guestNationality: formData.guestNationality || undefined,
						checkInDate: format(formData.checkInDate, "yyyy-MM-dd"),
						checkOutDate: format(formData.checkOutDate, "yyyy-MM-dd"),
						adults: formData.adults,
						children: formData.children,
						roomTypePreference: formData.roomTypePreference || undefined,
						specialRequests: formData.specialRequests || undefined,
					}),
				},
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to submit booking request");
			}

			toast({
				title: "Booking Request Submitted!",
				description: result.message || "The hotel will contact you soon to confirm your booking.",
			});

			// Reset form
			setFormData({
				guestName: "",
				guestEmail: "",
				guestPhone: "",
				guestAddress: "",
				guestNationality: "",
				checkInDate: undefined,
				checkOutDate: undefined,
				adults: 1,
				children: 0,
				roomTypePreference: "",
				specialRequests: "",
			});
		} catch (error) {
			console.error("Error submitting booking:", error);
			toast({
				title: "Submission Failed",
				description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	const calculateNights = () => {
		if (formData.checkInDate && formData.checkOutDate) {
			const diff = formData.checkOutDate.getTime() - formData.checkInDate.getTime();
			return Math.ceil(diff / (1000 * 60 * 60 * 24));
		}
		return 0;
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-muted-foreground">Loading booking form...</p>
				</div>
			</div>
		);
	}

	if (!tenant) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
				<Card className="max-w-md">
					<CardHeader>
						<CardTitle>Hotel Not Found</CardTitle>
						<CardDescription>
							The booking page you're looking for doesn't exist or has been removed.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	const nights = calculateNights();

	return (
		<div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 py-8 px-4">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<Card className="mb-6">
					<CardHeader className="text-center">
						<div className="flex justify-center mb-4">
							<div className="p-3 bg-primary/10 rounded-full">
								<Hotel className="h-8 w-8 text-primary" />
							</div>
						</div>
						<CardTitle className="text-3xl">{tenant.name}</CardTitle>
						<CardDescription className="text-base">
							Book your stay with us
						</CardDescription>
					</CardHeader>
				</Card>

				{/* Booking Form */}
				<Card>
					<CardHeader>
						<CardTitle>Make a Booking Request</CardTitle>
						<CardDescription>
							Fill in your details below and we'll get back to you shortly to confirm your reservation.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Show location info */}
							{location && (
								<div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
									<MapPin className="h-4 w-4 text-primary" />
									<div>
										<p className="font-medium">{location.name}</p>
										{location.address && <p className="text-sm text-muted-foreground">{location.address}</p>}
									</div>
								</div>
							)}

							{location?.public_booking_message && (
								<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
									<p className="text-sm text-blue-900">{location.public_booking_message}</p>
								</div>
							)}

							{/* Guest Information */}
							<div className="space-y-4">
								<h3 className="text-lg font-semibold flex items-center gap-2">
									<User className="h-5 w-5" />
									Guest Information
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="md:col-span-2">
										<Label htmlFor="guestName">
											Full Name <span className="text-red-500">*</span>
										</Label>
										<Input
											id="guestName"
											placeholder="John Doe"
											value={formData.guestName}
											onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
											required
										/>
									</div>

									<div>
										<Label htmlFor="guestEmail">
											Email <span className="text-red-500">*</span>
										</Label>
										<div className="relative">
											<Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
											<Input
												id="guestEmail"
												type="email"
												placeholder="john@example.com"
												className="pl-9"
												value={formData.guestEmail}
												onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
												required
											/>
										</div>
									</div>

									<div>
										<Label htmlFor="guestPhone">Phone</Label>
										<div className="relative">
											<Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
											<Input
												id="guestPhone"
												type="tel"
												placeholder="+1 234 567 8900"
												className="pl-9"
												value={formData.guestPhone}
												onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
											/>
										</div>
									</div>

									<div>
										<Label htmlFor="guestNationality">Nationality</Label>
										<Input
											id="guestNationality"
											placeholder="USA"
											value={formData.guestNationality}
											onChange={(e) => setFormData({ ...formData, guestNationality: e.target.value })}
										/>
									</div>

									<div>
										<Label htmlFor="guestAddress">Address</Label>
										<Input
											id="guestAddress"
											placeholder="123 Main St, City"
											value={formData.guestAddress}
											onChange={(e) => setFormData({ ...formData, guestAddress: e.target.value })}
										/>
									</div>
								</div>
							</div>

							{/* Booking Details */}
							<div className="space-y-4">
								<h3 className="text-lg font-semibold flex items-center gap-2">
									<CalendarIcon className="h-5 w-5" />
									Booking Details
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{/* Check-in Date */}
									<div>
										<Label>
											Check-in Date <span className="text-red-500">*</span>
										</Label>
										<Popover>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal",
														!formData.checkInDate && "text-muted-foreground",
													)}
												>
													<CalendarIcon className="mr-2 h-4 w-4" />
													{formData.checkInDate ? (
														format(formData.checkInDate, "PPP")
													) : (
														<span>Pick a date</span>
													)}
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="start">
												<Calendar
													mode="single"
													selected={formData.checkInDate}
													onSelect={(date) => {
														setFormData({ ...formData, checkInDate: date });
														// Auto-set checkout to next day if not set
														if (date && !formData.checkOutDate) {
															setFormData({
																...formData,
																checkInDate: date,
																checkOutDate: addDays(date, 1),
															});
														}
													}}
													disabled={(date) => isBefore(date, new Date()) && !isAfter(date, new Date())}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
									</div>

									{/* Check-out Date */}
									<div>
										<Label>
											Check-out Date <span className="text-red-500">*</span>
										</Label>
										<Popover>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal",
														!formData.checkOutDate && "text-muted-foreground",
													)}
												>
													<CalendarIcon className="mr-2 h-4 w-4" />
													{formData.checkOutDate ? (
														format(formData.checkOutDate, "PPP")
													) : (
														<span>Pick a date</span>
													)}
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="start">
												<Calendar
													mode="single"
													selected={formData.checkOutDate}
													onSelect={(date) => setFormData({ ...formData, checkOutDate: date })}
													disabled={(date) =>
														isBefore(date, formData.checkInDate || new Date()) ||
														date <= (formData.checkInDate || new Date())
													}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
									</div>

									{/* Guests */}
									<div>
										<Label htmlFor="adults">Adults</Label>
										<Select
											value={formData.adults.toString()}
											onValueChange={(value) => setFormData({ ...formData, adults: parseInt(value) })}
										>
											<SelectTrigger id="adults">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{[1, 2, 3, 4, 5, 6].map((num) => (
													<SelectItem key={num} value={num.toString()}>
														{num} {num === 1 ? "Adult" : "Adults"}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor="children">Children</Label>
										<Select
											value={formData.children.toString()}
											onValueChange={(value) => setFormData({ ...formData, children: parseInt(value) })}
										>
											<SelectTrigger id="children">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{[0, 1, 2, 3, 4].map((num) => (
													<SelectItem key={num} value={num.toString()}>
														{num} {num === 1 ? "Child" : "Children"}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{/* Room Type Preference */}
									{roomTypes.length > 0 && (
										<div className="md:col-span-2">
											<Label htmlFor="roomType">Room Type Preference (Optional)</Label>
											<Select
												value={formData.roomTypePreference}
												onValueChange={(value) => setFormData({ ...formData, roomTypePreference: value })}
											>
												<SelectTrigger id="roomType">
													<SelectValue placeholder="Select room type (optional)" />
												</SelectTrigger>
												<SelectContent>
													{roomTypes.map((type) => (
														<SelectItem key={type} value={type}>
															{type}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}
								</div>

								{/* Show nights if dates selected */}
								{nights > 0 && (
									<div className="p-4 bg-primary/5 rounded-lg">
										<p className="text-sm font-medium flex items-center gap-2">
											<Users className="h-4 w-4" />
											{formData.adults} {formData.adults === 1 ? "Adult" : "Adults"}
											{formData.children > 0 && (
												<>
													, {formData.children} {formData.children === 1 ? "Child" : "Children"}
												</>
											)}{" "}
											• {nights} {nights === 1 ? "Night" : "Nights"}
										</p>
									</div>
								)}

								{/* Special Requests */}
								<div>
									<Label htmlFor="specialRequests">Special Requests</Label>
									<Textarea
										id="specialRequests"
										placeholder="Any special requirements or requests..."
										rows={4}
										value={formData.specialRequests}
										onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
									/>
								</div>
							</div>

							{/* Submit Button */}
							<Button type="submit" className="w-full" size="lg" disabled={submitting}>
								{submitting ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Submitting...
									</>
								) : (
									"Submit Booking Request"
								)}
							</Button>

							<p className="text-sm text-center text-muted-foreground">
								By submitting this form, you agree to be contacted by the hotel regarding your booking request.
							</p>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
