import { format } from "date-fns";
import React from "react";

interface ReservationPrintData {
	reservation_number: string;
	guest_name: string;
	guest_email?: string;
	guest_phone?: string;
	guest_address?: string;
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
	currency: string;
	status: string;
	special_requests?: string;
	arrival_time?: string;
	room?: {
		room_number: string;
		room_type: string;
	};
	location?: {
		name: string;
	};
	created_at: string;
}

interface ReservationPrintViewProps {
	reservation: ReservationPrintData;
}

export const ReservationPrintView: React.FC<ReservationPrintViewProps> = ({
	reservation,
}) => {
	const getCurrencySymbol = (currency: string) => {
		const symbols = { USD: "$", LKR: "Rs. ", EUR: "€", GBP: "£" };
		return symbols[currency as keyof typeof symbols] || currency;
	};

	return (
		<div
			className="print-container max-w-4xl mx-auto p-8 bg-white text-black"
			style={{ minHeight: "297mm" }}
		>
			{/* Print Styles */}
			<style>{`
        @media print {
          .print-container {
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
          
          .no-print {
            display: none !important;
          }
          
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

			{/* Header */}
			<div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
				<h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2">
					RESERVATION CONFIRMATION
				</h1>
				<div className="text-xl font-semibold text-gray-700">
					{reservation.location?.name || "Hotel"}
				</div>
				<div className="text-sm text-gray-600 mt-2">
					Confirmation Number:{" "}
					<span className="font-bold">{reservation.reservation_number}</span>
				</div>
			</div>

			{/* Guest Information */}
			<div className="mb-8">
				<h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-4 pb-2 border-b border-gray-200 uppercase tracking-wide">
					Guest Information
				</h2>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<div className="mb-3">
							<span className="font-semibold">Name:</span>{" "}
							{reservation.guest_name}
						</div>
						<div className="mb-3">
							<span className="font-semibold">Email:</span>{" "}
							{reservation.guest_email || "N/A"}
						</div>
						<div className="mb-3">
							<span className="font-semibold">Phone:</span>{" "}
							{reservation.guest_phone || "N/A"}
						</div>
					</div>
					<div>
						<div className="mb-3">
							<span className="font-semibold">Nationality:</span>{" "}
							{reservation.guest_nationality || "N/A"}
						</div>
						<div className="mb-3">
							<span className="font-semibold">Adults:</span>{" "}
							{reservation.adults}
						</div>
						<div className="mb-3">
							<span className="font-semibold">Children:</span>{" "}
							{reservation.children}
						</div>
					</div>
				</div>
				{reservation.guest_address && (
					<div className="mt-4">
						<span className="font-semibold">Address:</span>{" "}
						{reservation.guest_address}
					</div>
				)}
			</div>

			{/* Booking Details */}
			<div className="mb-8">
				<h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-4 pb-2 border-b border-gray-200 uppercase tracking-wide">
					Booking Details
				</h2>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<div className="mb-3">
							<span className="font-semibold">Room:</span>{" "}
							{reservation.room?.room_number} - {reservation.room?.room_type}
						</div>
						<div className="mb-3">
							<span className="font-semibold">Check-in:</span>{" "}
							{format(
								new Date(reservation.check_in_date),
								"EEEE, MMMM do, yyyy",
							)}
						</div>
						<div className="mb-3">
							<span className="font-semibold">Check-out:</span>{" "}
							{format(
								new Date(reservation.check_out_date),
								"EEEE, MMMM do, yyyy",
							)}
						</div>
					</div>
					<div>
						<div className="mb-3">
							<span className="font-semibold">Nights:</span>{" "}
							{reservation.nights}
						</div>
						<div className="mb-3">
							<span className="font-semibold">Arrival Time:</span>{" "}
							{reservation.arrival_time || "TBD"}
						</div>
						<div className="mb-3">
							<span className="font-semibold">Status:</span>
							<span
								className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
									reservation.status === "confirmed"
										? "bg-green-100 text-green-800"
										: reservation.status === "tentative"
											? "bg-yellow-100 text-yellow-800"
											: reservation.status === "pending"
												? "bg-blue-100 text-blue-800"
												: "bg-gray-100 text-gray-800"
								}`}
							>
								{reservation.status.toUpperCase()}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Special Requests */}
			{reservation.special_requests && (
				<div className="mb-8">
					<h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-4 pb-2 border-b border-gray-200 uppercase tracking-wide">
						Special Requests
					</h2>
					<div className="p-3 rounded border border-gray-200 bg-white text-sm">
						{reservation.special_requests}
					</div>
				</div>
			)}

			{/* Financial Summary */}
			<div className="mb-8">
				<h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-4 pb-2 border-b border-gray-200 uppercase tracking-wide">
					Financial Summary
				</h2>
				<div className="p-4 rounded border border-gray-200 bg-white">
					<table className="w-full">
						<tbody>
							<tr className="border-b">
								<td className="py-2 font-semibold">Room Rate (per night):</td>
								<td className="py-2 text-right">
									{getCurrencySymbol(reservation.currency)}
									{reservation.room_rate.toLocaleString()}
								</td>
							</tr>
							<tr className="border-b">
								<td className="py-2 font-semibold">Number of Nights:</td>
								<td className="py-2 text-right">{reservation.nights}</td>
							</tr>
							<tr className="border-b border-gray-400">
								<td className="py-2 font-bold text-lg">Total Amount:</td>
								<td className="py-2 text-right font-bold text-lg">
									{getCurrencySymbol(reservation.currency)}
									{reservation.total_amount.toLocaleString()}
								</td>
							</tr>
							<tr className="border-b">
								<td className="py-2 font-semibold">Paid Amount:</td>
								<td className="py-2 text-right">
									{getCurrencySymbol(reservation.currency)}
									{(reservation.paid_amount || 0).toLocaleString()}
								</td>
							</tr>
							<tr>
								<td className="py-2 font-bold">Balance Due:</td>
								<td className="py-2 text-right font-bold">
									{getCurrencySymbol(reservation.currency)}
									{(reservation.balance_amount || 0).toLocaleString()}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Terms and Conditions */}
			<div className="mb-8">
				<h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-4 bg-gray-100 p-3 border-l-4 border-yellow-500">
					Terms and Conditions
				</h2>
				<div className="text-sm space-y-2">
					<p>• Check-in time: 2:00 PM | Check-out time: 12:00 PM</p>
					<p>• Early check-in and late check-out subject to availability</p>
					<p>• Cancellation must be made 48 hours before arrival</p>
					<p>• Valid ID required at check-in</p>
					<p>• Additional charges may apply for extra services</p>
					<p>• Management reserves the right to refuse service</p>
				</div>
			</div>

			{/* Footer */}
			<div className="border-t-2 border-gray-300 pt-6 text-center text-sm text-gray-600">
				<p className="mb-2">
					Thank you for choosing {reservation.location?.name || "our hotel"}!
				</p>
				<p>Generated on {format(new Date(), "MMMM do, yyyy 'at' h:mm a")}</p>
				<p className="mt-4 italic">
					This is a system-generated confirmation. No signature required.
				</p>
			</div>
		</div>
	);
};
