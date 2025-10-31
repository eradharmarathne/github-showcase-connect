import type { Database } from "@/integrations/supabase/types";

type Reservation = any; // You can make this more specific based on your reservation type
type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

interface ReservationPrintProps {
	reservation: Reservation;
	tenant: Tenant | null;
}

export const useReservationPrint = () => {
	const generatePrintContent = (
		reservation: Reservation,
		tenant: Tenant | null,
	): string => {
		// Transform reservation data with tenant and location information
		const printableData = {
			...reservation,
			// Enhanced hotel/tenant information from context
			tenant_name: tenant?.hotel_name || tenant?.name,
			hotel_name: tenant?.hotel_name || tenant?.name,
			hotel_address: tenant?.hotel_address,
			hotel_phone: tenant?.hotel_phone,
			hotel_email: tenant?.hotel_email,
			hotel_website: tenant?.hotel_website,
			logo_url: tenant?.logo_url,

			// Enhanced location information
			location_name: reservation.locations?.name || "Unknown Location",
			location_address: reservation.locations?.address || null,
			location_phone: reservation.locations?.phone || null,
			location_email: reservation.locations?.email || null,

			// Room details
			room_number: reservation.rooms?.room_number || "Unknown Room",
			room_type: reservation.rooms?.room_type || "Unknown Type",
			bed_type: reservation.rooms?.bed_type || null,
			room_description: reservation.rooms?.description || null,
			amenities: reservation.rooms?.amenities || [],
		};

		// Create a professional receipt-style printable content
		return `
			<div style="font-family: 'Courier New', monospace; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.4;">
				<!-- Header -->
				<div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
					<h1 style="margin: 0; font-size: 24px; font-weight: bold;">${printableData.hotel_name || "HOTEL RESERVATION"}</h1>
					${printableData.hotel_address ? `<p style="margin: 5px 0; font-size: 12px;">${printableData.hotel_address}</p>` : ""}
					${printableData.hotel_phone ? `<p style="margin: 2px 0; font-size: 12px;">Tel: ${printableData.hotel_phone}</p>` : ""}
					${printableData.hotel_email ? `<p style="margin: 2px 0; font-size: 12px;">Email: ${printableData.hotel_email}</p>` : ""}
				</div>

				<!-- Reservation Info -->
				<div style="text-align: center; margin-bottom: 20px;">
					<h2 style="margin: 0; font-size: 18px; font-weight: bold;">RESERVATION RECEIPT</h2>
					<p style="margin: 10px 0; font-size: 14px; font-weight: bold;">Confirmation #: ${reservation.reservation_number}</p>
					<p style="margin: 5px 0; font-size: 12px;">Date: ${new Date().toLocaleDateString()}</p>
				</div>

				<!-- Guest Information Table -->
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
					<tr style="border-bottom: 1px solid #000;">
						<td colspan="2" style="padding: 8px 0; font-weight: bold; text-align: center; background-color: #f0f0f0;">GUEST INFORMATION</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; width: 30%; font-weight: bold;">Guest Name:</td>
						<td style="padding: 5px 0;">${reservation.guest_name}</td>
					</tr>
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 5px 0; font-weight: bold;">Email:</td>
						<td style="padding: 5px 0;">${reservation.guest_email || "N/A"}</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; font-weight: bold;">Phone:</td>
						<td style="padding: 5px 0;">${reservation.guest_phone || "N/A"}</td>
					</tr>
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 5px 0; font-weight: bold;">Nationality:</td>
						<td style="padding: 5px 0;">${reservation.guest_nationality || "N/A"}</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; font-weight: bold;">Guests:</td>
						<td style="padding: 5px 0;">${reservation.adults} Adults${reservation.children > 0 ? `, ${reservation.children} Children` : ""}</td>
					</tr>
				</table>

				<!-- Booking Details Table -->
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
					<tr style="border-bottom: 1px solid #000;">
						<td colspan="2" style="padding: 8px 0; font-weight: bold; text-align: center; background-color: #f0f0f0;">BOOKING DETAILS</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; width: 30%; font-weight: bold;">Room:</td>
						<td style="padding: 5px 0;">${printableData.room_number} - ${printableData.room_type}</td>
					</tr>
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 5px 0; font-weight: bold;">Check-in:</td>
						<td style="padding: 5px 0;">${new Date(reservation.check_in_date).toLocaleDateString()}</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; font-weight: bold;">Check-out:</td>
						<td style="padding: 5px 0;">${new Date(reservation.check_out_date).toLocaleDateString()}</td>
					</tr>
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 5px 0; font-weight: bold;">Duration:</td>
						<td style="padding: 5px 0;">${reservation.nights} Night${reservation.nights !== 1 ? "s" : ""}</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; font-weight: bold;">Status:</td>
						<td style="padding: 5px 0; text-transform: uppercase;">${reservation.status}</td>
					</tr>
				</table>

				<!-- Financial Summary Table -->
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
					<tr style="border-bottom: 2px solid #000;">
						<td colspan="3" style="padding: 8px 0; font-weight: bold; text-align: center; background-color: #f0f0f0;">FINANCIAL SUMMARY</td>
					</tr>
					<tr style="border-bottom: 1px solid #ccc;">
						<td style="padding: 5px 0; width: 50%; font-weight: bold;">Description</td>
						<td style="padding: 5px 0; width: 20%; text-align: center; font-weight: bold;">Rate</td>
						<td style="padding: 5px 0; width: 30%; text-align: right; font-weight: bold;">Amount</td>
					</tr>
					<tr>
						<td style="padding: 8px 0;">Room Charges (${reservation.nights} night${reservation.nights !== 1 ? "s" : ""})</td>
						<td style="padding: 8px 0; text-align: center;">${reservation.selectedCurrency || reservation.currency} ${reservation.room_rate}</td>
						<td style="padding: 8px 0; text-align: right; font-weight: bold;">${reservation.selectedCurrency || reservation.currency} ${reservation.convertedAmounts?.roomAmount?.toFixed(2) || reservation.total_amount || reservation.room_rate * reservation.nights}</td>
					</tr>
					${
						reservation.convertedAmounts?.expensesAmount &&
						reservation.convertedAmounts.expensesAmount > 0
							? `
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 8px 0;">Additional Expenses & Services</td>
						<td style="padding: 8px 0; text-align: center;">-</td>
						<td style="padding: 8px 0; text-align: right; font-weight: bold;">${reservation.selectedCurrency || reservation.currency} ${reservation.convertedAmounts.expensesAmount.toFixed(2)}</td>
					</tr>
					`
							: ""
					}
					<tr style="border-top: 1px solid #ccc;">
						<td style="padding: 8px 0; font-weight: bold;">SUBTOTAL</td>
						<td style="padding: 8px 0;"></td>
						<td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 14px;">${reservation.selectedCurrency || reservation.currency} ${((reservation.convertedAmounts?.roomAmount || reservation.total_amount || reservation.room_rate * reservation.nights) + (reservation.convertedAmounts?.expensesAmount || 0)).toFixed(2)}</td>
					</tr>
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 8px 0; font-weight: bold;">Amount Paid</td>
						<td style="padding: 8px 0;"></td>
						<td style="padding: 8px 0; text-align: right; color: green; font-weight: bold;">-${reservation.selectedCurrency || reservation.currency} ${reservation.convertedAmounts?.paidAmount?.toFixed(2) || reservation.paid_amount || 0}</td>
					</tr>
					<tr style="border-top: 2px solid #000;">
						<td style="padding: 8px 0; font-weight: bold; font-size: 14px;">BALANCE DUE</td>
						<td style="padding: 8px 0;"></td>
						<td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 14px; color: ${reservation.convertedAmounts?.balanceAmount ? (reservation.convertedAmounts.balanceAmount > 0 ? "red" : "green") : (reservation.total_amount || reservation.room_rate * reservation.nights) + (reservation.expenses_usd || 0) - (reservation.paid_amount || 0) > 0 ? "red" : "green"};">${reservation.selectedCurrency || reservation.currency} ${reservation.convertedAmounts?.balanceAmount?.toFixed(2) || ((reservation.total_amount || reservation.room_rate * reservation.nights) + (reservation.expenses_usd || 0) - (reservation.paid_amount || 0)).toFixed(2)}</td>
					</tr>
				</table>

				${
					reservation.special_requests
						? `
				<!-- Special Requests -->
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
					<tr style="border-bottom: 1px solid #000;">
						<td style="padding: 8px 0; font-weight: bold; text-align: center; background-color: #f0f0f0;">SPECIAL REQUESTS</td>
					</tr>
					<tr>
						<td style="padding: 10px 0; line-height: 1.5;">${reservation.special_requests}</td>
					</tr>
				</table>
				`
						: ""
				}

				<!-- Footer -->
				<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; text-align: center; font-size: 10px;">
					<p style="margin: 5px 0;">Thank you for choosing ${printableData.hotel_name || "our hotel"}!</p>
					<p style="margin: 5px 0;">For any inquiries, please contact us at ${printableData.hotel_phone || "hotel reception"}.</p>
					<p style="margin: 15px 0 0 0; font-style: italic;">This is an official reservation confirmation.</p>
				</div>

				<!-- Print Timestamp -->
				<div style="margin-top: 20px; text-align: center; font-size: 8px; color: #666;">
					Printed on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
				</div>
			</div>
		`;
	};

	const printReservation = (reservation: Reservation, tenant: Tenant | null) => {
		const printContent = generatePrintContent(reservation, tenant);

		// Create a hidden iframe for printing
		const iframe = document.createElement("iframe");
		iframe.style.display = "none";
		document.body.appendChild(iframe);

		const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
		if (iframeDoc) {
			iframeDoc.open();
			iframeDoc.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Reservation Receipt - ${reservation.reservation_number}</title>
					<style>
						@page {
							size: A4;
							margin: 0.5cm;
						}
						@media print {
							body { 
								margin: 0; 
								padding: 0; 
								-webkit-print-color-adjust: exact;
								color-adjust: exact;
							}
							table { 
								page-break-inside: avoid; 
							}
						}
						body {
							font-family: 'Courier New', monospace;
							line-height: 1.3;
						}
						table {
							border-collapse: collapse;
						}
					</style>
				</head>
				<body>
					${printContent}
				</body>
				</html>
			`);
			iframeDoc.close();

			// Trigger print dialog directly
			iframe.contentWindow?.print();

			// Clean up the iframe after printing
			setTimeout(() => {
				document.body.removeChild(iframe);
			}, 1000);
		}
	};

	return { printReservation, generatePrintContent };
};
