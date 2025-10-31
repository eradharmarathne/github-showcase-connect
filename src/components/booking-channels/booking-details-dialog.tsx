import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	calculateNights,
	formatDate,
	formatPrice,
	getEmail,
	getGuestName,
	getPaymentInfo,
	getSourceColor,
	getStatusColor,
} from "@/lib/booking-channels/helpers";
import type { ExternalBooking } from "@/types/booking-channels";

interface BookingDetailsDialogProps {
	booking: ExternalBooking | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function BookingDetailsDialog({
	booking,
	open,
	onOpenChange,
}: BookingDetailsDialogProps) {
	const { t } = useTranslation();

	if (!booking) return null;

	const paymentInfo = getPaymentInfo(booking);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Booking Details</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
								Guest Details
							</h4>
							<div className="mt-1">
								<p className="font-medium">{getGuestName(booking)}</p>
								{getEmail(booking) && (
									<p className="text-sm text-muted-foreground">
										{getEmail(booking)}
									</p>
								)}
							</div>
						</div>
						<div>
							<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
								{t("bookingChannels.bookingDialog.propertyRoom")}
							</h4>
							<div className="mt-1">
								<p className="font-medium">
									{booking.room_id && booking.room
										? `${booking.room.room_number} - ${booking.room.room_type}`
										: booking.room_name ||
											t("bookingChannels.bookingDialog.unknownProperty")}
								</p>
								<p className="text-sm text-muted-foreground">
									{booking.mappedLocation?.name ||
										booking.location?.name ||
										t("bookingChannels.bookingDialog.unmappedLocation")}
								</p>
								{!booking.room_id && (
									<Badge variant="secondary" className="text-xs mt-1">
										{t("bookingChannels.bookingDialog.notMappedToRoom")}
									</Badge>
								)}
							</div>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
								Check-in / Check-out
							</h4>
							<div className="mt-1">
								<p className="font-medium">
									{formatDate(booking.check_in)} -{" "}
									{formatDate(booking.check_out)}
								</p>
								<p className="text-sm text-muted-foreground">
									{calculateNights(booking.check_in, booking.check_out)} nights
								</p>
							</div>
						</div>
						<div>
							<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
								Guests
							</h4>
							<div className="mt-1">
								<p className="font-medium">
									{booking.adults + booking.children} total
								</p>
								<p className="text-sm text-muted-foreground">
									{booking.adults} adults, {booking.children} children
								</p>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
								Source & Status
							</h4>
							<div className="mt-1 flex gap-2">
								<Badge className={getSourceColor(booking.source)}>
									{booking.source.replace("_", ".")}
								</Badge>
								<Badge className={getStatusColor(booking.status)}>
									{booking.status.replace("_", " ")}
								</Badge>
							</div>
						</div>
						<div>
							<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
								Amount
							</h4>
							<div className="mt-1">
								<p className="font-medium">{formatPrice(booking)}</p>
								{paymentInfo && (
									<p className="text-sm text-green-600">
										Expected Payout: {paymentInfo.payout} LKR
									</p>
								)}
							</div>
						</div>
					</div>

					{paymentInfo?.type === "airbnb" && (
						<div>
							<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground mb-2">
								Payment Breakdown
							</h4>
							<div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
								<div className="flex justify-between">
									<span>Base Price:</span>
									<span>{paymentInfo.basePrice} LKR</span>
								</div>
								<div className="flex justify-between text-red-600">
									<span>Host Fee:</span>
									<span>-{paymentInfo.hostFee} LKR</span>
								</div>
								<div className="border-t pt-1 flex justify-between font-medium text-green-600">
									<span>Expected Payout:</span>
									<span>{paymentInfo.payout} LKR</span>
								</div>
							</div>
						</div>
					)}

					<div>
						<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground mb-2">
							Booking Details
						</h4>
						<div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
							<div className="flex justify-between">
								<span>External ID:</span>
								<span className="font-mono">{booking.external_id}</span>
							</div>
							<div className="flex justify-between">
								<span>Property ID:</span>
								<span className="font-mono">{booking.property_id}</span>
							</div>
							{booking.last_synced_at && (
								<div className="flex justify-between">
									<span>Last Synced:</span>
									<span>
										{format(
											new Date(booking.last_synced_at),
											"MMM dd, yyyy HH:mm",
										)}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
