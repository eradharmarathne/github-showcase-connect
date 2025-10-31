import { format } from "date-fns";
import { PrintTemplate } from "@/components/common/print-template";

interface PrintPreviewSampleProps {
	printSettings?: any;
}

export function PrintPreviewSample({ printSettings }: PrintPreviewSampleProps) {
	// Sample reservation data for preview
	const sampleReservation = {
		reservation_number: "RES-2024-001",
		guest_name: "John Doe",
		guest_email: "john.doe@example.com",
		guest_phone: "+1 234 567 8900",
		guest_nationality: "United States",
		adults: 2,
		children: 1,
		check_in_date: "2024-11-15",
		check_out_date: "2024-11-18",
		nights: 3,
		room_rate: 150,
		total_amount: 450,
		advance_amount: 150,
		paid_amount: 150,
		balance_amount: 300,
		currency: "USD",
		status: "confirmed",
		special_requests: "Late check-in requested",
		room: {
			room_number: "101",
			room_type: "Deluxe Room",
		},
		location: {
			name: "Sample Hotel",
		},
		created_at: new Date().toISOString(),
	};

	const getCurrencySymbol = (currency: string) => {
		const symbols = { USD: "$", LKR: "Rs. ", EUR: "€", GBP: "£" };
		return symbols[currency as keyof typeof symbols] || currency;
	};

	return (
		<PrintTemplate qrCodeData={sampleReservation.reservation_number} documentType="Reservation">
			<div className="space-y-6">
				{/* Header */}
				<div className="text-center border-b-2 border-gray-300 pb-4">
					<h1 className="text-2xl font-bold mb-2">RESERVATION CONFIRMATION</h1>
					<div className="text-xl font-semibold text-gray-700">
						{sampleReservation.location.name}
					</div>
					<div className="text-sm text-gray-600 mt-2">
						Confirmation Number:{" "}
						<span className="font-bold">{sampleReservation.reservation_number}</span>
					</div>
				</div>

				{/* Guest Information */}
				<div>
					<h2 className="text-lg font-bold mb-3 bg-gray-100 p-2 border-l-4 border-blue-500">
						Guest Information
					</h2>
					<div className="grid grid-cols-2 gap-3 text-sm">
						<div>
							<span className="font-semibold">Name:</span> {sampleReservation.guest_name}
						</div>
						<div>
							<span className="font-semibold">Email:</span> {sampleReservation.guest_email}
						</div>
						<div>
							<span className="font-semibold">Phone:</span> {sampleReservation.guest_phone}
						</div>
						<div>
							<span className="font-semibold">Nationality:</span>{" "}
							{sampleReservation.guest_nationality}
						</div>
						<div>
							<span className="font-semibold">Adults:</span> {sampleReservation.adults}
						</div>
						<div>
							<span className="font-semibold">Children:</span> {sampleReservation.children}
						</div>
					</div>
				</div>

				{/* Reservation Details */}
				<div>
					<h2 className="text-lg font-bold mb-3 bg-gray-100 p-2 border-l-4 border-blue-500">
						Reservation Details
					</h2>
					<div className="grid grid-cols-2 gap-3 text-sm">
						<div>
							<span className="font-semibold">Room:</span>{" "}
							{sampleReservation.room.room_number} - {sampleReservation.room.room_type}
						</div>
						<div>
							<span className="font-semibold">Status:</span>{" "}
							<span className="capitalize">{sampleReservation.status}</span>
						</div>
						<div>
							<span className="font-semibold">Check-in:</span>{" "}
							{format(new Date(sampleReservation.check_in_date), "PPP")}
						</div>
						<div>
							<span className="font-semibold">Check-out:</span>{" "}
							{format(new Date(sampleReservation.check_out_date), "PPP")}
						</div>
						<div>
							<span className="font-semibold">Nights:</span> {sampleReservation.nights}
						</div>
						<div>
							<span className="font-semibold">Room Rate:</span>{" "}
							{getCurrencySymbol(sampleReservation.currency)}
							{sampleReservation.room_rate} per night
						</div>
					</div>
					{sampleReservation.special_requests && (
						<div className="mt-3 text-sm">
							<span className="font-semibold">Special Requests:</span>{" "}
							{sampleReservation.special_requests}
						</div>
					)}
				</div>

				{/* Payment Summary */}
				<div>
					<h2 className="text-lg font-bold mb-3 bg-gray-100 p-2 border-l-4 border-blue-500">
						Payment Summary
					</h2>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span>Total Amount:</span>
							<span className="font-semibold">
								{getCurrencySymbol(sampleReservation.currency)}
								{sampleReservation.total_amount.toFixed(2)}
							</span>
						</div>
						<div className="flex justify-between">
							<span>Advance Payment:</span>
							<span>
								{getCurrencySymbol(sampleReservation.currency)}
								{sampleReservation.advance_amount?.toFixed(2)}
							</span>
						</div>
						<div className="flex justify-between">
							<span>Paid Amount:</span>
							<span>
								{getCurrencySymbol(sampleReservation.currency)}
								{sampleReservation.paid_amount?.toFixed(2)}
							</span>
						</div>
						<div className="flex justify-between border-t-2 border-gray-300 pt-2 font-bold">
							<span>Balance Due:</span>
							<span>
								{getCurrencySymbol(sampleReservation.currency)}
								{sampleReservation.balance_amount?.toFixed(2)}
							</span>
						</div>
					</div>
				</div>

				{/* Additional Notes */}
				<div className="text-xs text-gray-600 border-t pt-4">
					<p>
						Thank you for choosing {sampleReservation.location.name}. We look forward to
						welcoming you!
					</p>
					<p className="mt-2">
						For any questions or changes to your reservation, please contact us.
					</p>
				</div>
			</div>
		</PrintTemplate>
	);
}
