import { format } from "date-fns";
import {
	Calendar,
	CheckCircle2,
	Download,
	Hotel,
	Loader2,
	Moon,
	ShieldCheck,
	User,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { IDPhotoUpload } from "@/components/media/id-photo-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { downloadGuestReceipt } from "@/lib/guest-receipt-pdf";
import type { GuestReceiptData } from "@/lib/guest-receipt-pdf";

interface IDPhoto {
	filePath: string;
	name: string;
	uploadedAt: Date;
	type: "passport" | "national_id" | "drivers_license" | "other";
}

interface ReservationData {
	id: string;
	reservation_number: string | null;
	guest_name: string;
	guest_email: string | null;
	guest_phone: string | null;
	guest_nationality: string | null;
	guest_passport_number: string | null;
	guest_id_number: string | null;
	guest_address: string | null;
	booking_source: string | null;
	adults: number;
	children: number;
	check_in_date: string;
	check_out_date: string;
	nights: number;
	room_rate: number | null;
	total_amount: number;
	advance_amount: number | null;
	paid_amount: number | null;
	balance_amount: number | null;
	currency: string;
	status: string;
	special_requests: string | null;
	arrival_time: string | null;
	guest_privacy_accepted_at: string | null;
	guest_id_photos: IDPhoto[] | null;
	created_at: string;
	rooms: { room_number: string; room_type: string } | null;
	locations: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
	tentative: "bg-yellow-100 text-yellow-800 border-yellow-200",
	pending: "bg-orange-100 text-orange-800 border-orange-200",
	confirmed: "bg-blue-100 text-blue-800 border-blue-200",
	checked_in: "bg-emerald-100 text-emerald-800 border-emerald-200",
	checked_out: "bg-gray-100 text-gray-800 border-gray-200",
	cancelled: "bg-red-100 text-red-800 border-red-200",
};

function formatStatus(status: string): string {
	return status
		.replace(/_/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function GuestPage() {
	const { token } = useParams<{ token: string }>();
	const { toast } = useToast();
	const [reservation, setReservation] = useState<ReservationData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [privacyAccepted, setPrivacyAccepted] = useState(false);
	const [acceptingPrivacy, setAcceptingPrivacy] = useState(false);
	const [idPhotos, setIdPhotos] = useState<IDPhoto[]>([]);

	const handlePhotosChange = async (photos: IDPhoto[]) => {
		setIdPhotos(photos);
		if (!token) return;
		try {
			await supabase
				.from("reservations")
				.update({ guest_id_photos: photos as unknown as any })
				.eq("guest_share_token", token);
		} catch (err) {
			console.error("Error persisting photos:", err);
		}
	};

	useEffect(() => {
		if (!token) {
			setError("Invalid link. No booking token provided.");
			setLoading(false);
			return;
		}

		const fetchReservation = async () => {
			try {
				const { data, error: fetchError } = await supabase
					.from("reservations")
					.select(
						`
						id,
						reservation_number,
						guest_name,
						guest_email,
						guest_phone,
						guest_nationality,
						guest_passport_number,
						guest_id_number,
						guest_address,
						booking_source,
						adults,
						children,
						check_in_date,
						check_out_date,
						nights,
						room_rate,
						total_amount,
						advance_amount,
						paid_amount,
						balance_amount,
						currency,
						status,
						special_requests,
						arrival_time,
						guest_privacy_accepted_at,
						guest_id_photos,
						created_at,
						rooms(room_number, room_type),
						locations(name)
					`,
					)
					.eq("guest_share_token", token)
					.single();

				if (fetchError || !data) {
					setError(
						"Booking not found. This link may be invalid or expired.",
					);
					return;
				}

				const resData = data as unknown as ReservationData;
				setReservation(resData);
				setPrivacyAccepted(!!data.guest_privacy_accepted_at);

				if (Array.isArray(resData.guest_id_photos)) {
					setIdPhotos(
						resData.guest_id_photos.map((p) => ({
							...p,
							uploadedAt: new Date(p.uploadedAt),
						})),
					);
				}
			} catch (err) {
				console.error("Error fetching reservation:", err);
				setError("Something went wrong. Please try again later.");
			} finally {
				setLoading(false);
			}
		};

		fetchReservation();
	}, [token]);

	const handleAcceptPrivacy = async () => {
		if (!reservation || !token) return;
		setAcceptingPrivacy(true);
		try {
			const { error: updateError } = await supabase
				.from("reservations")
				.update({
					guest_privacy_accepted_at: new Date().toISOString(),
				})
				.eq("guest_share_token", token);

			if (updateError) throw updateError;

			setPrivacyAccepted(true);
			setReservation({
				...reservation,
				guest_privacy_accepted_at: new Date().toISOString(),
			});
			toast({
				title: "Privacy policy accepted",
				description: "Thank you for accepting the privacy policy and booking guidelines.",
			});
		} catch (err: any) {
			console.error("Error accepting privacy:", err);
			toast({
				title: "Error",
				description: err.message || "Failed to save your acceptance. Please try again.",
				variant: "destructive",
			});
		} finally {
			setAcceptingPrivacy(false);
		}
	};

	const handleDownloadReceipt = () => {
		if (!reservation) return;
		const receiptData: GuestReceiptData = {
			reservation_number: reservation.reservation_number,
			guest_name: reservation.guest_name,
			guest_email: reservation.guest_email,
			guest_phone: reservation.guest_phone,
			guest_nationality: reservation.guest_nationality,
			guest_passport_number: reservation.guest_passport_number,
			guest_id_number: reservation.guest_id_number,
			guest_address: reservation.guest_address,
			booking_source: reservation.booking_source,
			adults: reservation.adults,
			children: reservation.children,
			check_in_date: reservation.check_in_date,
			check_out_date: reservation.check_out_date,
			nights: reservation.nights,
			room_rate: reservation.room_rate,
			total_amount: reservation.total_amount,
			advance_amount: reservation.advance_amount,
			paid_amount: reservation.paid_amount,
			balance_amount: reservation.balance_amount,
			currency: reservation.currency,
			status: reservation.status,
			special_requests: reservation.special_requests,
			arrival_time: reservation.arrival_time,
			room: reservation.rooms,
			location: reservation.locations,
			created_at: reservation.created_at,
		};
		downloadGuestReceipt(receiptData);
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="size-8 animate-spin text-blue-600" />
					<p className="text-muted-foreground">Loading your booking...</p>
				</div>
			</div>
		);
	}

	if (error || !reservation) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
				<Card className="max-w-md w-full">
					<CardHeader className="text-center">
						<CardTitle className="text-destructive">Booking Not Found</CardTitle>
						<CardDescription>{error}</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	const balance = (reservation.total_amount || 0) - (reservation.paid_amount || 0);

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-8 px-4">
			<div className="max-w-2xl mx-auto space-y-6">
				{/* Header */}
				<div className="text-center space-y-2">
					<div className="flex items-center justify-center gap-2">
						<Hotel className="size-6 text-blue-600" />
						<h1 className="text-2xl font-bold text-gray-900">
							{reservation.locations?.name || "Your Booking"}
						</h1>
					</div>
					{reservation.reservation_number && (
						<p className="text-muted-foreground">
							Confirmation #{reservation.reservation_number}
						</p>
					)}
				</div>

				{/* Booking Summary */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg">Booking Summary</CardTitle>
							<Badge
								variant="outline"
								className={STATUS_STYLES[reservation.status] || ""}
							>
								{formatStatus(reservation.status)}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="flex items-start gap-3">
								<User className="size-5 text-muted-foreground mt-0.5 shrink-0" />
								<div>
									<p className="text-sm text-muted-foreground">Guest</p>
									<p className="font-medium">{reservation.guest_name}</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Users className="size-5 text-muted-foreground mt-0.5 shrink-0" />
								<div>
									<p className="text-sm text-muted-foreground">Guests</p>
									<p className="font-medium">
										{reservation.adults} Adult{reservation.adults !== 1 ? "s" : ""}
										{reservation.children > 0 &&
											`, ${reservation.children} Child${reservation.children !== 1 ? "ren" : ""}`}
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Calendar className="size-5 text-muted-foreground mt-0.5 shrink-0" />
								<div>
									<p className="text-sm text-muted-foreground">Check-in</p>
									<p className="font-medium">
										{format(new Date(reservation.check_in_date), "EEE, MMM d, yyyy")}
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Calendar className="size-5 text-muted-foreground mt-0.5 shrink-0" />
								<div>
									<p className="text-sm text-muted-foreground">Check-out</p>
									<p className="font-medium">
										{format(new Date(reservation.check_out_date), "EEE, MMM d, yyyy")}
									</p>
								</div>
							</div>
							{reservation.rooms && (
								<div className="flex items-start gap-3">
									<Hotel className="size-5 text-muted-foreground mt-0.5 shrink-0" />
									<div>
										<p className="text-sm text-muted-foreground">Room</p>
										<p className="font-medium">
											{reservation.rooms.room_number} &mdash;{" "}
											{reservation.rooms.room_type}
										</p>
									</div>
								</div>
							)}
							<div className="flex items-start gap-3">
								<Moon className="size-5 text-muted-foreground mt-0.5 shrink-0" />
								<div>
									<p className="text-sm text-muted-foreground">Duration</p>
									<p className="font-medium">
										{reservation.nights} Night{reservation.nights !== 1 ? "s" : ""}
									</p>
								</div>
							</div>
						</div>

						{reservation.special_requests && (
							<>
								<Separator />
								<div>
									<p className="text-sm text-muted-foreground mb-1">
										Special Requests
									</p>
									<p className="text-sm">{reservation.special_requests}</p>
								</div>
							</>
						)}

						<Separator />

						{/* Financial Summary */}
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Total Amount</span>
								<span className="font-medium">
									{reservation.currency}{" "}
									{reservation.total_amount.toLocaleString()}
								</span>
							</div>
							{(reservation.paid_amount ?? 0) > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Paid</span>
									<span className="text-emerald-600 font-medium">
										{reservation.currency}{" "}
										{(reservation.paid_amount || 0).toLocaleString()}
									</span>
								</div>
							)}
							{balance > 0 && (
								<div className="flex justify-between text-sm font-semibold pt-1 border-t">
									<span>Balance Due</span>
									<span className="text-rose-600">
										{reservation.currency} {balance.toLocaleString()}
									</span>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* ID Photo Upload */}
				<IDPhotoUpload
					photos={idPhotos}
					onPhotosChange={handlePhotosChange}
					title="Upload Your ID Document"
					maxPhotos={3}
					uploadPathPrefix={`guest-uploads/${reservation.id}`}
				/>

				{/* Privacy & Guidelines */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<ShieldCheck className="size-5" />
							Privacy Policy & Booking Guidelines
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-sm text-muted-foreground space-y-3 bg-muted/50 p-4 rounded-lg">
							<p>
								By accepting below, you agree to the following terms:
							</p>
							<ul className="list-disc pl-5 space-y-1.5">
								<li>
									Your personal information will be used solely for the purpose of
									managing your reservation and providing hospitality services.
								</li>
								<li>
									ID documents uploaded will be securely stored and used for
									verification purposes in compliance with local regulations.
								</li>
								<li>
									Check-in time is from 2:00 PM and check-out time is by 12:00 PM
									unless otherwise arranged.
								</li>
								<li>
									Cancellation must be made at least 48 hours before the check-in
									date to avoid charges.
								</li>
								<li>
									The property is not responsible for valuables left unattended. A
									safe is available at the front desk.
								</li>
								<li>
									Guests are expected to maintain reasonable noise levels and respect
									other guests and staff.
								</li>
							</ul>
						</div>

						{privacyAccepted ? (
							<div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
								<CheckCircle2 className="size-5 shrink-0" />
								<span className="text-sm font-medium">
									Privacy policy accepted on{" "}
									{reservation.guest_privacy_accepted_at
										? format(
												new Date(reservation.guest_privacy_accepted_at),
												"MMM d, yyyy 'at' h:mm a",
											)
										: "just now"}
								</span>
							</div>
						) : (
							<div className="space-y-3">
								<div className="flex items-start gap-3">
									<Checkbox
										id="privacy-accept"
										checked={false}
										onCheckedChange={() => handleAcceptPrivacy()}
										disabled={acceptingPrivacy}
									/>
									<label
										htmlFor="privacy-accept"
										className="text-sm leading-relaxed cursor-pointer"
									>
										I have read and agree to the privacy policy and booking
										guidelines above.
									</label>
								</div>
								{acceptingPrivacy && (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Loader2 className="size-4 animate-spin" />
										Saving...
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Download Receipt */}
				<Card>
					<CardContent className="pt-6">
						<Button
							className="w-full"
							size="lg"
							onClick={handleDownloadReceipt}
						>
							<Download className="size-5 mr-2" />
							Download Booking Receipt (PDF)
						</Button>
					</CardContent>
				</Card>

				{/* Footer */}
				<div className="text-center text-xs text-muted-foreground pb-4">
					<p>
						Powered by{" "}
						<span className="font-medium">CheckingCheckout</span>
					</p>
				</div>
			</div>
		</div>
	);
}
