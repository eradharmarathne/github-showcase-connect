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
		<PrintTemplate qrCodeData={sampleReservation.reservation_number} documentType="Reservation" printSettingsOverride={printSettings}>
			<div className="space-y-6">
				{/* Document Title */}
				<div className="text-center border-b-2 border-black pb-4">
					<h1 className="text-2xl font-bold mb-2 uppercase tracking-wide">
						Reservation Confirmation
					</h1>
					<div className="text-lg font-semibold">
						{sampleReservation.location.name}
					</div>
					<div className="text-sm mt-2">
						Confirmation Number:{" "}
						<span className="font-bold">{sampleReservation.reservation_number}</span>
					</div>
					<div className="text-xs mt-1">
						Issued: {format(new Date(sampleReservation.created_at), "PPP")}
					</div>
				</div>

				{/* Guest Information */}
				<div>
					<h2 className="text-base font-bold mb-3 pb-1 border-b border-gray-400 uppercase tracking-wide">
						Guest Information
					</h2>
					<table className="w-full text-sm">
						<tbody>
							<tr className="border-b border-gray-200">
								<td className="py-2 w-1/3 font-semibold">Guest Name:</td>
								<td className="py-2">{sampleReservation.guest_name}</td>
							</tr>
							<tr className="border-b border-gray-200">
								<td className="py-2 font-semibold">Email Address:</td>
								<td className="py-2">{sampleReservation.guest_email}</td>
							</tr>
							<tr className="border-b border-gray-200">
								<td className="py-2 font-semibold">Phone Number:</td>
								<td className="py-2">{sampleReservation.guest_phone}</td>
							</tr>
							<tr className="border-b border-gray-200">
								<td className="py-2 font-semibold">Nationality:</td>
								<td className="py-2">{sampleReservation.guest_nationality}</td>
							</tr>
							<tr className="border-b border-gray-200">
								<td className="py-2 font-semibold">Number of Guests:</td>
								<td className="py-2">
									{sampleReservation.adults} Adult(s), {sampleReservation.children} Child(ren)
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				{/* Reservation Details */}
				<div>
					<h2 className="text-base font-bold mb-3 pb-1 border-b border-gray-400 uppercase tracking-wide">
						Reservation Details
					</h2>
					<table className="w-full text-sm">
						<tbody>
							<tr className="border-b border-gray-200">
								<td className="py-2 w-1/3 font-semibold">Room Number:</td>
								<td className="py-2">{sampleReservation.room.room_number}</td>
							</tr>
							<tr className="border-b border-gray-200">
								<td className="py-2 font-semibold">Room Type:</td>
								<td className="py-2">{sampleReservation.room.room_type}</td>
							</tr>
							<tr className="border-b border-gray-200">
								<td className="py-2 font-semibold">Check-In Date:</td>
								<td className="py-2">
									{format(new Date(sampleReservation.check_in_date), "EEEE, MMMM d, yyyy")}
								</td>
							</tr>
							<tr className="border-b border-gray-200">
								<td className="py-2 font-semibold">Check-Out Date:</td>
								<td className="py-2">
									{format(new Date(sampleReservation.check_out_date), "EEEE, MMMM d, yyyy")}
								</td>
							</tr>
							<tr className="border-b border-gray-200">
								<td className="py-2 font-semibold">Length of Stay:</td>
								<td className="py-2">{sampleReservation.nights} Night(s)</td>
							</tr>
							<tr className="border-b border-gray-200">
								<td className="py-2 font-semibold">Reservation Status:</td>
								<td className="py-2 uppercase font-semibold">{sampleReservation.status}</td>
							</tr>
						</tbody>
					</table>
					{sampleReservation.special_requests && (
						<div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
							<div className="text-xs font-semibold uppercase mb-1">Special Requests:</div>
							<div className="text-sm">{sampleReservation.special_requests}</div>
						</div>
					)}
				</div>

				{/* Payment Summary */}
				<div>
					<h2 className="text-base font-bold mb-3 pb-1 border-b border-gray-400 uppercase tracking-wide">
						Payment Summary
					</h2>
					<table className="w-full text-sm">
						<tbody>
							<tr className="border-b border-gray-200">
								<td className="py-2 w-2/3">
									Room Rate ({getCurrencySymbol(sampleReservation.currency)}
									{sampleReservation.room_rate} × {sampleReservation.nights} night(s))
								</td>
								<td className="py-2 text-right font-semibold">
									{getCurrencySymbol(sampleReservation.currency)}
									{sampleReservation.total_amount.toFixed(2)}
								</td>
							</tr>
							<tr className="border-b border-gray-200">
								<td className="py-2">Advance Payment</td>
								<td className="py-2 text-right">
									{getCurrencySymbol(sampleReservation.currency)}
									{sampleReservation.advance_amount?.toFixed(2)}
								</td>
							</tr>
							<tr className="border-b border-gray-200">
								<td className="py-2">Amount Paid</td>
								<td className="py-2 text-right">
									{getCurrencySymbol(sampleReservation.currency)}
									{sampleReservation.paid_amount?.toFixed(2)}
								</td>
							</tr>
							<tr className="border-t-2 border-black">
								<td className="py-3 text-base font-bold">BALANCE DUE</td>
								<td className="py-3 text-right text-base font-bold">
									{getCurrencySymbol(sampleReservation.currency)}
									{sampleReservation.balance_amount?.toFixed(2)}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				{/* Important Information */}
				<div className="mt-6 pt-4 border-t border-gray-300">
					<h3 className="text-sm font-bold mb-2">IMPORTANT INFORMATION</h3>
					<ul className="text-xs space-y-1 list-disc list-inside">
						<li>Check-in time: 2:00 PM | Check-out time: 12:00 PM</li>
						<li>Valid photo ID and credit card required at check-in</li>
						<li>Cancellation policy applies as per booking terms</li>
						<li>Please present this confirmation upon arrival</li>
					</ul>
				</div>

				{/* Footer Note */}
				<div className="text-xs text-center text-gray-600 mt-6 pt-4 border-t border-gray-200">
					<p className="mb-1">
						Thank you for choosing {sampleReservation.location.name}.
					</p>
					<p>
						We look forward to welcoming you and providing you with an exceptional experience.
					</p>
					<p className="mt-2">
						For inquiries or modifications, please contact us with your confirmation number.
					</p>
				</div>
			</div>
		</PrintTemplate>
	);
}
