import { jsPDF } from "jspdf";
import { format } from "date-fns";

export interface GuestReceiptData {
	reservation_number: string | null;
	guest_name: string;
	guest_email?: string | null;
	guest_phone?: string | null;
	guest_nationality?: string | null;
	guest_passport_number?: string | null;
	guest_id_number?: string | null;
	guest_address?: string | null;
	booking_source?: string | null;
	adults: number;
	children: number;
	check_in_date: string;
	check_out_date: string;
	nights: number;
	room_rate: number | null;
	total_amount: number;
	advance_amount?: number | null;
	paid_amount?: number | null;
	balance_amount?: number | null;
	currency: string;
	status: string;
	special_requests?: string | null;
	arrival_time?: string | null;
	room?: {
		room_number: string;
		room_type: string;
	} | null;
	location?: {
		name: string;
	} | null;
	created_at: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
	USD: "$",
	LKR: "Rs. ",
	EUR: "€",
	GBP: "£",
};

function getCurrencySymbol(currency: string): string {
	return CURRENCY_SYMBOLS[currency] || `${currency} `;
}

function formatAmount(currency: string, amount: number): string {
	return `${getCurrencySymbol(currency)}${amount.toLocaleString()}`;
}

export function generateGuestReceiptPdf(data: GuestReceiptData): jsPDF {
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = 20;
	const contentWidth = pageWidth - margin * 2;
	let y = margin;

	const colors = {
		primary: [33, 37, 41] as [number, number, number],
		secondary: [108, 117, 125] as [number, number, number],
		accent: [13, 110, 253] as [number, number, number],
		divider: [206, 212, 218] as [number, number, number],
		bg: [248, 249, 250] as [number, number, number],
	};

	// --- Header ---
	doc.setFillColor(...colors.accent);
	doc.rect(0, 0, pageWidth, 36, "F");

	doc.setTextColor(255, 255, 255);
	doc.setFontSize(20);
	doc.setFont("helvetica", "bold");
	doc.text("BOOKING RECEIPT", pageWidth / 2, 16, { align: "center" });

	doc.setFontSize(11);
	doc.setFont("helvetica", "normal");
	doc.text(data.location?.name || "Hotel", pageWidth / 2, 24, {
		align: "center",
	});

	if (data.reservation_number) {
		doc.setFontSize(9);
		doc.text(
			`Confirmation #${data.reservation_number}`,
			pageWidth / 2,
			31,
			{ align: "center" },
		);
	}

	y = 46;

	// --- Guest Information Section ---
	y = drawSectionHeader(doc, "Guest Information", margin, y, contentWidth, colors);

	const guestRows: [string, string][] = [
		["Name", data.guest_name],
		["Email", data.guest_email || "N/A"],
		["Phone", data.guest_phone || "N/A"],
		["Nationality", data.guest_nationality || "N/A"],
		...(data.guest_passport_number
			? [["Passport No.", data.guest_passport_number] as [string, string]]
			: []),
		...(data.guest_id_number
			? [["ID Number", data.guest_id_number] as [string, string]]
			: []),
		...(data.guest_address
			? [["Address", data.guest_address] as [string, string]]
			: []),
		["Guests", `${data.adults} Adult(s)${data.children > 0 ? `, ${data.children} Child(ren)` : ""}`],
	];

	y = drawKeyValueRows(doc, guestRows, margin, y, contentWidth, colors);
	y += 6;

	// --- Booking Details Section ---
	y = drawSectionHeader(doc, "Booking Details", margin, y, contentWidth, colors);

	const formatSource = (s: string | null | undefined) => {
		if (!s) return "N/A";
		const map: Record<string, string> = {
			direct: "Direct", airbnb: "Airbnb", booking_com: "Booking.com",
			expedia: "Expedia", agoda: "Agoda", beds24: "Beds24", manual: "Manual",
			online: "Online", phone: "Phone", email: "Email", walk_in: "Walk-in", ical: "iCal",
		};
		return map[s] || s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
	};

	const bookingRows: [string, string][] = [
		[
			"Room",
			data.room
				? `${data.room.room_number} — ${data.room.room_type}`
				: "N/A",
		],
		[
			"Check-in",
			format(new Date(data.check_in_date), "EEEE, MMMM do, yyyy"),
		],
		[
			"Check-out",
			format(new Date(data.check_out_date), "EEEE, MMMM do, yyyy"),
		],
		["Nights", String(data.nights)],
		["Arrival Time", data.arrival_time || "TBD"],
		["Status", data.status.charAt(0).toUpperCase() + data.status.slice(1).replace(/_/g, " ")],
		["Booking Source", formatSource(data.booking_source)],
	];

	y = drawKeyValueRows(doc, bookingRows, margin, y, contentWidth, colors);
	y += 6;

	// --- Special Requests ---
	if (data.special_requests) {
		y = drawSectionHeader(doc, "Special Requests", margin, y, contentWidth, colors);
		doc.setTextColor(...colors.primary);
		doc.setFontSize(9);
		doc.setFont("helvetica", "normal");
		const lines = doc.splitTextToSize(data.special_requests, contentWidth - 8);
		doc.setFillColor(...colors.bg);
		doc.roundedRect(margin, y, contentWidth, lines.length * 4.5 + 6, 2, 2, "F");
		doc.text(lines, margin + 4, y + 5);
		y += lines.length * 4.5 + 10;
	}

	// --- Financial Summary Section ---
	y = drawSectionHeader(doc, "Financial Summary", margin, y, contentWidth, colors);

	doc.setFillColor(...colors.bg);
	doc.roundedRect(margin, y, contentWidth, 52, 2, 2, "F");

	const finY = y + 6;
	const labelX = margin + 6;
	const valueX = margin + contentWidth - 6;

	const finRows: [string, string, boolean][] = [
		["Room Rate (per night)", formatAmount(data.currency, data.room_rate || 0), false],
		["Number of Nights", String(data.nights), false],
		["Total Amount", formatAmount(data.currency, data.total_amount), true],
		["Paid Amount", formatAmount(data.currency, data.paid_amount || 0), false],
		["Balance Due", formatAmount(data.currency, data.balance_amount || 0), true],
	];

	let fY = finY;
	for (const [label, value, bold] of finRows) {
		doc.setFont("helvetica", bold ? "bold" : "normal");
		doc.setFontSize(bold ? 10 : 9);
		doc.setTextColor(...colors.primary);
		doc.text(label, labelX, fY);
		doc.text(value, valueX, fY, { align: "right" });

		if (label === "Number of Nights" || label === "Paid Amount") {
			fY += 2;
			doc.setDrawColor(...colors.divider);
			doc.setLineWidth(0.3);
			doc.line(labelX, fY, valueX, fY);
			fY += 2;
		}

		fY += 8;
	}

	y += 56;

	// --- Terms & Conditions ---
	y = drawSectionHeader(doc, "Terms & Conditions", margin, y, contentWidth, colors);

	const terms = [
		"Check-in time: 2:00 PM  |  Check-out time: 12:00 PM",
		"Early check-in and late check-out subject to availability",
		"Cancellation must be made 48 hours before arrival",
		"Valid ID / Passport required at check-in",
		"Additional charges may apply for extra services",
	];

	doc.setFontSize(8);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(...colors.secondary);
	for (const term of terms) {
		doc.text(`•  ${term}`, margin + 4, y);
		y += 4.5;
	}
	y += 4;

	// --- Footer ---
	doc.setDrawColor(...colors.divider);
	doc.setLineWidth(0.5);
	doc.line(margin, y, margin + contentWidth, y);
	y += 6;

	doc.setTextColor(...colors.secondary);
	doc.setFontSize(8);
	doc.setFont("helvetica", "normal");
	doc.text(
		`Thank you for choosing ${data.location?.name || "our hotel"}!`,
		pageWidth / 2,
		y,
		{ align: "center" },
	);
	y += 5;
	doc.text(
		`Generated on ${format(new Date(), "MMMM do, yyyy 'at' h:mm a")}`,
		pageWidth / 2,
		y,
		{ align: "center" },
	);
	y += 5;
	doc.setFontSize(7);
	doc.setFont("helvetica", "italic");
	doc.text(
		"This is a system-generated receipt. No signature required.",
		pageWidth / 2,
		y,
		{ align: "center" },
	);

	return doc;
}

export function downloadGuestReceipt(data: GuestReceiptData): void {
	const doc = generateGuestReceiptPdf(data);
	const filename = `booking-receipt-${data.reservation_number || "draft"}.pdf`;
	doc.save(filename);
}

// --- Drawing helpers ---

function drawSectionHeader(
	doc: jsPDF,
	title: string,
	x: number,
	y: number,
	width: number,
	colors: Record<string, [number, number, number]>,
): number {
	doc.setFillColor(...colors.accent);
	doc.rect(x, y, 3, 6, "F");
	doc.setTextColor(...colors.primary);
	doc.setFontSize(11);
	doc.setFont("helvetica", "bold");
	doc.text(title, x + 6, y + 5);
	y += 10;
	return y;
}

function drawKeyValueRows(
	doc: jsPDF,
	rows: [string, string][],
	x: number,
	y: number,
	width: number,
	colors: Record<string, [number, number, number]>,
): number {
	const labelX = x + 4;
	const valueX = x + 48;
	const rowHeight = 6;

	for (let i = 0; i < rows.length; i++) {
		const [label, value] = rows[i];

		if (i % 2 === 0) {
			doc.setFillColor(...colors.bg);
			doc.rect(x, y - 3.5, width, rowHeight, "F");
		}

		doc.setFont("helvetica", "bold");
		doc.setFontSize(9);
		doc.setTextColor(...colors.secondary);
		doc.text(label, labelX, y);

		doc.setFont("helvetica", "normal");
		doc.setTextColor(...colors.primary);
		doc.text(value, valueX, y);

		y += rowHeight;
	}

	return y;
}
