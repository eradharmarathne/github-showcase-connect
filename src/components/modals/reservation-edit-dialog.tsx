import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Link, Loader2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NationalityCombobox } from "@/components/ui/nationality-combobox";
import { PhoneInput } from "@/components/ui/phone-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocationContext } from "@/context/location-context";
import { useProfile } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { convertCurrency } from "@/utils/currency";
import { OTPVerification } from "../auth/otp-verification";

interface Reservation {
	id: string;
	reservation_number: string;
	guest_name: string;
	guest_email?: string;
	guest_phone?: string;
	guest_address?: string;
	guest_id_number?: string;
	guest_nationality?: string;
	adults: number;
	children: number;
	check_in_date: string;
	check_out_date: string;
	nights: number;
	room_rate: number;
	total_amount: number;
	advance_amount?: number;
	paid_amount?: number;
	balance_amount?: number;
	currency: "USD" | "LKR" | "EUR" | "GBP";
	status:
		| "pending"
		| "confirmed"
		| "checked_in"
		| "checked_out"
		| "cancelled"
		| "tentative";
	special_requests?: string;
	arrival_time?: string;
	room_id: string;
	location_id: string;
	tenant_id?: string;
	agent_id?: string;
	guide_id?: string;
	agent_commission?: number;
	guide_commission?: number;
	booking_source?: string;
	guest_share_token?: string | null;
}

interface ReservationEditDialogProps {
	reservation: Reservation | null;
	isOpen: boolean;
	onClose: () => void;
	onUpdate: () => void;
}

export function ReservationEditDialog({
	reservation,
	isOpen,
	onClose,
	onUpdate,
}: ReservationEditDialogProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const [isOTPVerified, setIsOTPVerified] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isGeneratingLink, setIsGeneratingLink] = useState(false);
	const [guestLink, setGuestLink] = useState<string | null>(null);
	const [linkCopied, setLinkCopied] = useState(false);
	const [formData, setFormData] = useState<Partial<Reservation>>({});
	const [rooms, setRooms] = useState<any[]>([]);
	const [agents, setAgents] = useState<any[]>([]);
	const [guides, setGuides] = useState<any[]>([]);
	const [location, setLocation] = useState<any>(null);
	const { profile } = useProfile();
	const { selectedLocation } = useLocationContext();

	useEffect(() => {
		const fetchRooms = async () => {
			if (!selectedLocation) {
				console.log("No selected location, skipping room fetch");
				return;
			}

			try {
				const { data, error } = await supabase
					.from("rooms")
					.select(
						"id, room_number, room_type, location_id, base_price, currency",
					)
					.eq("is_active", true)
					.eq("location_id", selectedLocation);

				if (error) {
					console.error("Error fetching rooms:", error);
					toast({
						title: "Connection Error",
						description:
							"Unable to load rooms. Please check your internet connection.",
						variant: "destructive",
					});
					return;
				}

				console.log(
					"Fetched rooms for selected location:",
					selectedLocation,
					data,
				);
				setRooms(data || []);
			} catch (networkError) {
				console.error("Network error fetching rooms:", networkError);
				toast({
					title: "Network Error",
					description:
						"Unable to connect to the server. Please check your internet connection and try again.",
					variant: "destructive",
				});
			}
		};

		const fetchAgents = async () => {
			if (!profile?.tenant_id) return;

			try {
				const { data, error } = await supabase
					.from("agents")
					.select("id, name, commission_rate")
					.eq("tenant_id", profile.tenant_id)
					.eq("is_active", true);

				if (error) {
					console.error("Error fetching agents:", error);
					return;
				}

				setAgents(data || []);
			} catch (networkError) {
				console.error("Network error fetching agents:", networkError);
			}
		};

		const fetchGuides = async () => {
			if (!profile?.tenant_id) return;

			try {
				const { data, error } = await supabase
					.from("guides")
					.select("id, name, commission_rate")
					.eq("tenant_id", profile.tenant_id)
					.eq("is_active", true);

				if (error) {
					console.error("Error fetching guides:", error);
					return;
				}

				setGuides(data || []);
			} catch (networkError) {
				console.error("Network error fetching guides:", networkError);
			}
		};

		const fetchLocation = async () => {
			if (!reservation?.location_id) return;

			try {
				const { data, error } = await supabase
					.from("locations")
					.select("id, name, phone, email")
					.eq("id", reservation.location_id)
					.single();

				if (error) {
					console.error("Error fetching location:", error);
					return;
				}

				setLocation(data);
			} catch (networkError) {
				console.error("Network error fetching location:", networkError);
			}
		};

		if (reservation && isOpen) {
			console.log("Initializing form with reservation:", reservation);
			console.log("Selected location:", selectedLocation);

			// Initialize form data with reservation
			const initialFormData = { ...reservation };

			// If the reservation is for a different location than currently selected,
			// clear the room_id to force user to select a new room
			if (reservation.location_id !== selectedLocation) {
				console.log(
					"Reservation location differs from selected location, clearing room_id",
				);
				initialFormData.room_id = null;
			}

			setFormData(initialFormData);
			if (reservation.guest_share_token) {
				const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
				setGuestLink(
					`${baseUrl}/guest/${reservation.guest_share_token}`,
				);
			} else {
				setGuestLink(null);
			}
			fetchRooms();
			fetchAgents();
			fetchGuides();
			fetchLocation();
		}
	}, [reservation, isOpen, selectedLocation, toast]);

	const handleOTPVerified = () => {
		setIsOTPVerified(true);
	};

	const handleSubmit = async () => {
		if (!isOTPVerified) {
			toast({
				title: "Verification Required",
				description: "Please verify OTP before saving changes.",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);
		try {
			// Filter formData to only include valid database fields
			const updateData = {
				guest_name: formData.guest_name,
				guest_email: formData.guest_email,
				guest_phone: formData.guest_phone,
				guest_address: formData.guest_address,
				guest_id_number: formData.guest_id_number,
				guest_nationality: formData.guest_nationality,
				adults: formData.adults,
				children: formData.children,
				check_in_date: formData.check_in_date,
				check_out_date: formData.check_out_date,
				nights: formData.nights,
				room_rate: formData.room_rate,
				total_amount: formData.total_amount,
				advance_amount: formData.advance_amount,
				paid_amount: formData.paid_amount,
				balance_amount: formData.balance_amount,
				currency: formData.currency,
				status: formData.status,
				special_requests: formData.special_requests,
				arrival_time: formData.arrival_time,
				room_id: formData.room_id === "" ? null : formData.room_id,
				agent_id:
					formData.agent_id === "none" || formData.agent_id === ""
						? null
						: formData.agent_id,
				guide_id:
					formData.guide_id === "none" || formData.guide_id === ""
						? null
						: formData.guide_id,
				agent_commission: formData.agent_commission,
				guide_commission: formData.guide_commission,
				booking_source: formData.booking_source,
			};

			console.log("Updating reservation with data:", updateData);

			const { error } = await supabase
				.from("reservations")
				.update(updateData)
				.eq("id", reservation?.id);

			if (error) throw error;

			// Send SMS notification after successful update
			if (reservation.guest_phone) {
				try {
					// Get room details for SMS
					const { data: roomData } = await supabase
						.from("rooms")
						.select("room_number")
						.eq("id", formData.room_id || reservation.room_id)
						.single();

					// Send SMS notification about the update
					await supabase.functions.invoke("send-sms-notification", {
						body: {
							type: "reservation",
							phoneNumber: reservation.guest_phone,
							guestName: formData.guest_name || reservation.guest_name,
							reservationNumber: reservation.reservation_number,
							roomNumber: roomData?.room_number || "N/A",
							checkIn: formData.check_in_date || reservation.check_in_date,
							checkOut: formData.check_out_date || reservation.check_out_date,
							amount: formData.total_amount || reservation.total_amount,
							currency: formData.currency || reservation.currency,
							status: "UPDATED",
						},
					});

					console.log(
						"SMS notification sent successfully for reservation update",
					);
				} catch (smsError) {
					console.error("Error sending SMS notification:", smsError);
					// Don't show error to user as the main operation succeeded
				}
			}

			toast({
				title: "Success",
				description: "Reservation updated successfully",
			});

			onUpdate();
			onClose();
			setIsOTPVerified(false);
		} catch (error: any) {
			console.error("Error updating reservation:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to update reservation",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!reservation) return;
		setIsDeleting(true);
		try {
			await (supabase as any)
				.from("booking_payments")
				.delete()
				.eq("reservation_id", reservation.id);

			await (supabase as any)
				.from("income")
				.delete()
				.eq("reservation_id", reservation.id);

			await supabase
				.from("additional_services")
				.delete()
				.eq("reservation_id", reservation.id);

			const { error } = await supabase
				.from("reservations")
				.delete()
				.eq("id", reservation.id);

			if (error) throw error;

			toast({
				title: t("common.success"),
				description: t("reservations.messages.deleteSuccess"),
			});

			onUpdate();
			onClose();
		} catch (error: any) {
			console.error("Error deleting reservation:", error);
			toast({
				title: t("common.error"),
				description: error.message || t("reservations.messages.deleteError"),
				variant: "destructive",
			});
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	const handleShareGuestLink = async () => {
		if (!reservation) return;
		setIsGeneratingLink(true);
		try {
			let token = reservation.guest_share_token;

			if (!token) {
				token = crypto.randomUUID().replace(/-/g, "") + Date.now().toString(36);
				const { error } = await supabase
					.from("reservations")
					.update({ guest_share_token: token })
					.eq("id", reservation.id);

				if (error) throw error;
			}

			const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
			const url = `${baseUrl}/guest/${token}`;
			setGuestLink(url);

			await navigator.clipboard.writeText(url);
			setLinkCopied(true);
			setTimeout(() => setLinkCopied(false), 2000);

			toast({
				title: "Guest link copied",
				description: "The guest self-service link has been copied to your clipboard.",
			});
		} catch (error: any) {
			console.error("Error generating guest link:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to generate guest link",
				variant: "destructive",
			});
		} finally {
			setIsGeneratingLink(false);
		}
	};

	const handleCopyGuestLink = async () => {
		if (!guestLink) return;
		await navigator.clipboard.writeText(guestLink);
		setLinkCopied(true);
		setTimeout(() => setLinkCopied(false), 2000);
		toast({
			title: "Copied",
			description: "Guest link copied to clipboard.",
		});
	};

	const handleClose = () => {
		setIsOTPVerified(false);
		setGuestLink(null);
		setLinkCopied(false);
		onClose();
	};

	const canDelete = reservation?.status !== "checked_out";

	if (!reservation) return null;

	return (
		<>
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{t("reservations.dialog.editTitle")} -{" "}
						{reservation.reservation_number}
					</DialogTitle>
					<DialogDescription>
						{t("reservations.dialog.editDescription")}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Share Guest Link */}
					<div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleShareGuestLink}
							disabled={isGeneratingLink}
						>
							{isGeneratingLink ? (
								<Loader2 className="size-4 mr-2 animate-spin" />
							) : (
								<Link className="size-4 mr-2" />
							)}
							{guestLink ? "Regenerate Guest Link" : "Share Guest Link"}
						</Button>
						{guestLink && (
							<div className="flex items-center gap-2 flex-1 min-w-0">
								<Input
									value={guestLink}
									readOnly
									className="h-8 text-xs flex-1 min-w-0"
									onClick={(e) => (e.target as HTMLInputElement).select()}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-8 shrink-0"
									onClick={handleCopyGuestLink}
								>
									{linkCopied ? (
										<Check className="size-4 text-emerald-500" />
									) : (
										<Copy className="size-4" />
									)}
								</Button>
							</div>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>{t("reservations.form.guestName")}</Label>
							<Input
								value={formData.guest_name || ""}
								onChange={(e) =>
									setFormData({ ...formData, guest_name: e.target.value })
								}
							/>
						</div>
						<div>
							<Label>{t("reservations.form.guestEmail")}</Label>
							<Input
								type="email"
								value={formData.guest_email || ""}
								onChange={(e) =>
									setFormData({ ...formData, guest_email: e.target.value })
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>{t("reservations.form.guestPhone")}</Label>
							<PhoneInput
								defaultCountry="LK"
								international
								value={formData.guest_phone || ""}
								onChange={(value) =>
									setFormData({ ...formData, guest_phone: value || "" })
								}
							/>
						</div>
						<div>
							<Label>{t("reservations.form.guestNationality")}</Label>
							<NationalityCombobox
								value={formData.guest_nationality || ""}
								onValueChange={(val) =>
									setFormData({
										...formData,
										guest_nationality: val,
									})
								}
							/>
						</div>
					</div>

					<div>
						<Label>{t("reservations.form.guestAddress")}</Label>
						<Textarea
							value={formData.guest_address || ""}
							onChange={(e) =>
								setFormData({ ...formData, guest_address: e.target.value })
							}
						/>
					</div>

					<div>
						<Label>{t("reservations.form.bookingSource")}</Label>
						<Select
							value={formData.booking_source || ""}
							onValueChange={(value) =>
								setFormData({ ...formData, booking_source: value })
							}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={t("reservations.form.selectBookingSource")}
								/>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="direct">Direct</SelectItem>
								<SelectItem value="airbnb">Airbnb</SelectItem>
								<SelectItem value="booking_com">Booking.com</SelectItem>
								<SelectItem value="expedia">Expedia</SelectItem>
								<SelectItem value="agoda">Agoda</SelectItem>
								<SelectItem value="beds24">Beds24</SelectItem>
								<SelectItem value="manual">Manual</SelectItem>
								<SelectItem value="online">Online</SelectItem>
								<SelectItem value="phone">Phone</SelectItem>
								<SelectItem value="email">Email</SelectItem>
								<SelectItem value="walk_in">Walk-in</SelectItem>
								<SelectItem value="ical">iCal</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div>
							<Label>{t("reservations.form.adults")}</Label>
							<Input
								type="number"
								min="1"
								value={formData.adults || 1}
								onChange={(e) =>
									setFormData({ ...formData, adults: parseInt(e.target.value) })
								}
							/>
						</div>
						<div>
							<Label>{t("reservations.form.children")}</Label>
							<Input
								type="number"
								min="0"
								value={formData.children || 0}
								onChange={(e) =>
									setFormData({
										...formData,
										children: parseInt(e.target.value),
									})
								}
							/>
						</div>
						<div>
							<Label>{t("reservations.form.arrivalTime")}</Label>
							<Input
								type="time"
								value={formData.arrival_time || ""}
								onChange={(e) =>
									setFormData({ ...formData, arrival_time: e.target.value })
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="check_in_date">
								{t("reservations.form.checkInDate")}
							</Label>
							<DatePicker
								value={formData.check_in_date || ""}
								onChange={(value) => {
									// Parse dates as local dates to avoid timezone issues
									const parseLocalDate = (dateStr: string) => {
										const [year, month, day] = dateStr.split("-").map(Number);
										return new Date(year, month - 1, day);
									};

									const checkInDate = parseLocalDate(value);
									const checkOutDate = formData.check_out_date
										? parseLocalDate(formData.check_out_date)
										: null;
									let nights = 1;
									if (checkOutDate) {
										nights = Math.max(
											1,
											Math.ceil(
												(checkOutDate.getTime() - checkInDate.getTime()) /
													(1000 * 60 * 60 * 24),
											),
										);
									}
									setFormData({
										...formData,
										check_in_date: value,
										nights,
										total_amount: (formData.room_rate || 0) * nights,
									});
								}}
								placeholder="Select check-in date"
								min={(() => {
									const today = new Date();
									const year = today.getFullYear();
									const month = String(today.getMonth() + 1).padStart(2, "0");
									const day = String(today.getDate()).padStart(2, "0");
									return `${year}-${month}-${day}`;
								})()}
								className="w-full"
							/>
						</div>
						<div>
							<Label htmlFor="check_out_date">
								{t("reservations.form.checkOutDate")}
							</Label>
							<DatePicker
								value={formData.check_out_date || ""}
								onChange={(value) => {
									// Parse dates as local dates to avoid timezone issues
									const parseLocalDate = (dateStr: string) => {
										const [year, month, day] = dateStr.split("-").map(Number);
										return new Date(year, month - 1, day);
									};

									const checkInDate = formData.check_in_date
										? parseLocalDate(formData.check_in_date)
										: new Date();
									const checkOutDate = parseLocalDate(value);
									const nights = Math.max(
										1,
										Math.ceil(
											(checkOutDate.getTime() - checkInDate.getTime()) /
												(1000 * 60 * 60 * 24),
										),
									);
									setFormData({
										...formData,
										check_out_date: value,
										nights,
										total_amount: (formData.room_rate || 0) * nights,
									});
								}}
								placeholder="Select check-out date"
								min={
									formData.check_in_date ||
									(() => {
										const today = new Date();
										const year = today.getFullYear();
										const month = String(today.getMonth() + 1).padStart(2, "0");
										const day = String(today.getDate()).padStart(2, "0");
										return `${year}-${month}-${day}`;
									})()
								}
								className="w-full"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>{t("reservations.form.room")}</Label>
							<Select
								value={formData.room_id || ""}
								onValueChange={(value) => {
									const selectedRoom = rooms.find((r) => r.id === value);
									if (selectedRoom) {
										// Convert room price from room's currency to reservation currency
										convertCurrency(
											selectedRoom.base_price,
											selectedRoom.currency,
											formData.currency || "USD",
											reservation?.tenant_id || "",
											selectedLocation || "",
										)
											.then((convertedPrice) => {
												setFormData({
													...formData,
													room_id: value,
													room_rate: convertedPrice,
													total_amount: convertedPrice * (formData.nights || 1),
												});
											})
											.catch((error) => {
												console.error("Currency conversion failed:", error);
												// Fallback to original price
												setFormData({
													...formData,
													room_id: value,
													room_rate: selectedRoom.base_price,
													total_amount:
														selectedRoom.base_price * (formData.nights || 1),
												});
											});
									} else {
										setFormData({ ...formData, room_id: value });
									}
								}}
							>
								<SelectTrigger>
									<SelectValue
										placeholder={t("reservations.form.selectRoom")}
									/>
								</SelectTrigger>
								<SelectContent>
									{rooms.map((room) => (
										<SelectItem key={room.id} value={room.id}>
											{room.room_number} - {room.room_type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>{t("reservations.form.roomRate")}</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.room_rate || 0}
								onChange={(e) => {
									const rate = parseFloat(e.target.value);
									setFormData({
										...formData,
										room_rate: rate,
										total_amount: rate * (formData.nights || 1),
									});
								}}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>{t("reservations.form.agent")}</Label>
							<Select
								value={formData.agent_id || "none"}
								onValueChange={(value) => {
									const selectedAgent = agents.find((a) => a.id === value);
									setFormData({
										...formData,
										agent_id: value === "none" ? undefined : value,
										agent_commission: selectedAgent?.commission_rate || 0,
									});
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select agent (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">
										{t("reservations.form.noAgent")}
									</SelectItem>
									{agents.map((agent) => (
										<SelectItem key={agent.id} value={agent.id}>
											{agent.name} ({agent.commission_rate}%)
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>{t("reservations.form.guide")}</Label>
							<Select
								value={formData.guide_id || "none"}
								onValueChange={(value) => {
									const selectedGuide = guides.find((g) => g.id === value);
									setFormData({
										...formData,
										guide_id: value === "none" ? undefined : value,
										guide_commission: selectedGuide?.commission_rate || 0,
									});
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select guide (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">
										{t("reservations.form.noGuide")}
									</SelectItem>
									{guides.map((guide) => (
										<SelectItem key={guide.id} value={guide.id}>
											{guide.name} ({guide.commission_rate}%)
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div>
						<Label>{t("reservations.form.specialRequests")}</Label>
						<Textarea
							value={formData.special_requests || ""}
							onChange={(e) =>
								setFormData({ ...formData, special_requests: e.target.value })
							}
							placeholder={t("reservations.form.specialRequestsPlaceholder")}
						/>
					</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label>{t("reservations.table.headers.status")}</Label>
						<Select
							value={formData.status || ""}
							onValueChange={(value) =>
								setFormData({
									...formData,
									status: value as Reservation["status"],
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="tentative">
									{t("reservations.status.tentative")}
								</SelectItem>
								<SelectItem value="pending">
									{t("reservations.status.pending")}
								</SelectItem>
								<SelectItem value="confirmed">
									{t("reservations.status.confirmed")}
								</SelectItem>
								<SelectItem value="checked_in">
									{t("reservations.status.checked_in")}
								</SelectItem>
								<SelectItem value="checked_out">
									{t("reservations.status.checked_out")}
								</SelectItem>
								<SelectItem value="cancelled">
									{t("reservations.status.cancelled")}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>{t("reservations.form.currency")}</Label>
						<Select
							value={formData.currency || "USD"}
							onValueChange={(value) =>
								setFormData({
									...formData,
									currency: value as Reservation["currency"],
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="LKR">LKR</SelectItem>
								<SelectItem value="USD">USD</SelectItem>
								<SelectItem value="EUR">EUR</SelectItem>
								<SelectItem value="GBP">GBP</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="bg-muted p-4 rounded-lg space-y-4">
					<div className="grid grid-cols-3 gap-4">
						<div>
							<Label>{t("reservations.viewDialog.totalAmount")}</Label>
							<div className="text-lg font-medium mt-1">
								{formData.currency} {(formData.total_amount || 0).toLocaleString()}
							</div>
						</div>
						<div>
							<Label>{t("reservations.form.advanceAmount")}</Label>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={formData.advance_amount || 0}
								onChange={(e) => {
									const advance = parseFloat(e.target.value) || 0;
									setFormData({
										...formData,
										advance_amount: advance,
									});
								}}
								className="mt-1"
							/>
						</div>
						<div>
							<Label>{t("reservations.form.paidAmount")}</Label>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={formData.paid_amount || 0}
								onChange={(e) => {
									const paid = parseFloat(e.target.value) || 0;
									setFormData({
										...formData,
										paid_amount: paid,
										balance_amount: (formData.total_amount || 0) - paid,
									});
								}}
								className="mt-1"
							/>
						</div>
					</div>
					<div className="flex justify-between text-sm pt-2 border-t">
						<span className="font-medium">
							{t("reservations.viewDialog.balanceAmount")}:
						</span>
						<span
							className={`font-semibold ${
								(formData.total_amount || 0) - (formData.paid_amount || 0) > 0
									? "text-rose-600"
									: "text-emerald-600"
							}`}
						>
							{formData.currency}{" "}
							{((formData.total_amount || 0) - (formData.paid_amount || 0)).toLocaleString()}
						</span>
					</div>
				</div>

				<div className="flex justify-between pt-4">
					<div className="flex gap-2">
						{canDelete && (
							<Button
								variant="destructive"
								onClick={() => setShowDeleteConfirm(true)}
								disabled={isDeleting}
							>
								{t("reservations.dialog.deleteButton")}
							</Button>
						)}
						<Button variant="outline" onClick={handleClose}>
							{t("common.cancel")}
						</Button>
					</div>

					<div className="flex gap-2">
						{!isOTPVerified ? (
							<OTPVerification
								onVerified={handleOTPVerified}
								phoneNumber={location?.phone || profile?.phone || ""}
								locationId={reservation?.location_id}
								triggerComponent={
									<Button variant="default">
										{t("reservations.dialog.verifyAndEnableEditing")}
									</Button>
								}
							/>
						) : (
							<Button onClick={handleSubmit} disabled={isSubmitting}>
								{isSubmitting
									? t("reservations.dialog.saving")
									: t("reservations.dialog.saveButton")}
							</Button>
						)}
					</div>
				</div>
				</div>
			</DialogContent>
		</Dialog>

		<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{t("reservations.dialog.deleteTitle")}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{t("reservations.dialog.deleteConfirmation")}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>
						{t("reservations.dialog.cancelButton")}
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isDeleting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isDeleting
							? t("common.deleting", "Deleting...")
							: t("reservations.dialog.deleteButton")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
		</>
	);
}
