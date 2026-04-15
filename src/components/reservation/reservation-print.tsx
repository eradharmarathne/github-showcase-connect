import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type Reservation = any;
type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

interface IDPhoto {
	filePath: string;
	name: string;
	type: string;
}

async function getSignedPhotoUrls(
	photos: IDPhoto[],
): Promise<{ url: string; type: string }[]> {
	const results: { url: string; type: string }[] = [];
	for (const photo of photos) {
		try {
			const { data } = await supabase.storage
				.from("id-photos")
				.createSignedUrl(photo.filePath, 300);
			if (data?.signedUrl) {
				results.push({ url: data.signedUrl, type: photo.type });
			}
		} catch {
			// skip photos that fail
		}
	}
	return results;
}

function formatBookingSource(source: string | null | undefined): string {
	if (!source) return "N/A";
	const map: Record<string, string> = {
		direct: "Direct",
		airbnb: "Airbnb",
		booking_com: "Booking.com",
		expedia: "Expedia",
		agoda: "Agoda",
		beds24: "Beds24",
		manual: "Manual",
		online: "Online",
		phone: "Phone",
		email: "Email",
		walk_in: "Walk-in",
		ical: "iCal",
	};
	return (
		map[source] ||
		source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, " ")
	);
}

function getStatusLabel(status: string): string {
	const map: Record<string, string> = {
		tentative: "Tentative",
		confirmed: "Confirmed",
		checked_in: "Checked In",
		checked_out: "Checked Out",
		cancelled: "Cancelled",
		pending: "Pending",
	};
	return map[status] || status;
}

function getStatusColor(status: string): string {
	const map: Record<string, string> = {
		confirmed: "#059669",
		checked_in: "#2563EB",
		checked_out: "#6B7280",
		cancelled: "#DC2626",
		tentative: "#D97706",
		pending: "#D97706",
	};
	return map[status] || "#6B7280";
}

export const useReservationPrint = () => {
	const generatePrintContent = (
		reservation: Reservation,
		tenant: Tenant | null,
		photoUrls: { url: string; type: string }[] = [],
	): string => {
		const hotelName = (tenant as any)?.hotel_name || tenant?.name || "Hotel";
		const hotelAddress = (tenant as any)?.hotel_address || "";
		const hotelPhone = (tenant as any)?.hotel_phone || "";
		const hotelEmail = (tenant as any)?.hotel_email || "";
		const hotelWebsite = (tenant as any)?.hotel_website || "";
		const locationName = reservation.locations?.name || "";
		const roomNumber = reservation.rooms?.room_number || "N/A";
		const roomType = reservation.rooms?.room_type || "N/A";

		const statusColor = getStatusColor(reservation.status);
		const statusLabel = getStatusLabel(reservation.status);

		const guestRows = [
			{ label: "Guest Name", value: reservation.guest_name },
			{ label: "Email", value: reservation.guest_email },
			{ label: "Phone", value: reservation.guest_phone },
			{ label: "Nationality", value: reservation.guest_nationality },
			{ label: "Passport Number", value: reservation.guest_passport_number },
			{ label: "ID Number", value: reservation.guest_id_number },
			{ label: "Address", value: reservation.guest_address },
			{
				label: "Guests",
				value: `${reservation.adults} Adult${reservation.adults !== 1 ? "s" : ""}${reservation.children > 0 ? `, ${reservation.children} Child${reservation.children !== 1 ? "ren" : ""}` : ""}`,
			},
		]
			.filter((r) => r.value)
			.map(
				(r) =>
					`<tr>
					<td style="padding: 10px 16px; font-size: 12px; color: #6B7280; border-bottom: 1px solid #F3F4F6; width: 35%;">${r.label}</td>
					<td style="padding: 10px 16px; font-size: 13px; color: #111827; border-bottom: 1px solid #F3F4F6; font-weight: 500;">${r.value}</td>
				</tr>`,
			)
			.join("");

		const photoSection =
			photoUrls.length > 0
				? `
			<div style="margin-top: 24px;">
				<div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
					<div style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; background: #F3F4F6;">
						<h3 style="margin: 0; font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">ID Documents / Passport</h3>
					</div>
					<div style="padding: 16px; text-align: center;">
						${photoUrls
							.map(
								(p) =>
									`<div style="display: inline-block; margin: 8px; text-align: center; vertical-align: top;">
								<div style="border: 2px solid #E5E7EB; border-radius: 8px; overflow: hidden; background: white; padding: 4px;">
									<img src="${p.url}" style="max-width: 240px; max-height: 180px; display: block; border-radius: 4px;" />
								</div>
								<p style="margin: 6px 0 0; font-size: 11px; color: #6B7280; text-transform: capitalize; font-weight: 500;">${p.type.replace(/_/g, " ")}</p>
							</div>`,
							)
							.join("")}
					</div>
				</div>
			</div>`
				: "";

		const totalRoom =
			reservation.convertedAmounts?.roomAmount ||
			reservation.total_amount ||
			reservation.room_rate * reservation.nights;
		const expenses = reservation.convertedAmounts?.expensesAmount || 0;
		const subtotal = totalRoom + expenses;
		const paidAmount =
			reservation.convertedAmounts?.paidAmount ||
			reservation.paid_amount ||
			0;
		const balanceDue =
			reservation.convertedAmounts?.balanceAmount ?? subtotal - paidAmount;
		const currency =
			reservation.selectedCurrency || reservation.currency || "LKR";

		return `
		<div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 780px; margin: 0 auto; padding: 24px; color: #111827;">

			<!-- Header -->
			<div style="text-align: center; padding-bottom: 20px; margin-bottom: 24px; border-bottom: 3px solid #1F2937;">
				<h1 style="margin: 0 0 4px; font-size: 26px; font-weight: 700; color: #111827; letter-spacing: 0.5px;">${hotelName}</h1>
				${locationName ? `<p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #4F46E5;">${locationName}</p>` : ""}
				${hotelAddress ? `<p style="margin: 2px 0; font-size: 11px; color: #6B7280;">${hotelAddress}</p>` : ""}
				<p style="margin: 2px 0; font-size: 11px; color: #6B7280;">
					${[hotelPhone ? `Tel: ${hotelPhone}` : "", hotelEmail ? `Email: ${hotelEmail}` : "", hotelWebsite || ""].filter(Boolean).join("  |  ")}
				</p>
			</div>

			<!-- Title + Confirmation -->
			<div style="text-align: center; margin-bottom: 24px;">
				<div style="display: inline-block; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 32px;">
					<h2 style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #1F2937; text-transform: uppercase; letter-spacing: 1px;">Reservation Receipt</h2>
					<p style="margin: 0; font-size: 18px; font-weight: 700; color: #4F46E5;">#${reservation.reservation_number}</p>
				</div>
				<div style="margin-top: 10px;">
					<span style="display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; color: white; background: ${statusColor};">${statusLabel}</span>
				</div>
			</div>

			<!-- Two-column: Guest Info + Booking Details -->
			<table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 24px;">
				<tr>
					<td style="width: 50%; vertical-align: top;">
						<div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
							<div style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; background: #F8FAFC;">
								<h3 style="margin: 0; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Guest Information</h3>
							</div>
							<table style="width: 100%; border-collapse: collapse;">${guestRowsHtml}</table>
						</div>
					</td>
					<td style="width: 50%; vertical-align: top;">
						<div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
							<div style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; background: #F8FAFC;">
								<h3 style="margin: 0; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Booking Details</h3>
							</div>
							<table style="width: 100%; border-collapse: collapse;">
								<tr>
									<td style="padding: 10px 16px; font-size: 12px; color: #6B7280; border-bottom: 1px solid #F3F4F6; width: 40%;">Room</td>
									<td style="padding: 10px 16px; font-size: 13px; color: #111827; border-bottom: 1px solid #F3F4F6; font-weight: 600;">${roomNumber} - ${roomType}</td>
								</tr>
								<tr>
									<td style="padding: 10px 16px; font-size: 12px; color: #6B7280; border-bottom: 1px solid #F3F4F6;">Check-in</td>
									<td style="padding: 10px 16px; font-size: 13px; color: #111827; border-bottom: 1px solid #F3F4F6; font-weight: 500;">${new Date(reservation.check_in_date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</td>
								</tr>
								<tr>
									<td style="padding: 10px 16px; font-size: 12px; color: #6B7280; border-bottom: 1px solid #F3F4F6;">Check-out</td>
									<td style="padding: 10px 16px; font-size: 13px; color: #111827; border-bottom: 1px solid #F3F4F6; font-weight: 500;">${new Date(reservation.check_out_date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</td>
								</tr>
								<tr>
									<td style="padding: 10px 16px; font-size: 12px; color: #6B7280; border-bottom: 1px solid #F3F4F6;">Duration</td>
									<td style="padding: 10px 16px; font-size: 13px; color: #111827; border-bottom: 1px solid #F3F4F6; font-weight: 500;">${reservation.nights} Night${reservation.nights !== 1 ? "s" : ""}</td>
								</tr>
								<tr>
									<td style="padding: 10px 16px; font-size: 12px; color: #6B7280; border-bottom: 1px solid #F3F4F6;">Source</td>
									<td style="padding: 10px 16px; font-size: 13px; color: #111827; border-bottom: 1px solid #F3F4F6; font-weight: 500;">${formatBookingSource(reservation.booking_source)}</td>
								</tr>
								${reservation.arrival_time ? `<tr>
									<td style="padding: 10px 16px; font-size: 12px; color: #6B7280;">Arrival Time</td>
									<td style="padding: 10px 16px; font-size: 13px; color: #111827; font-weight: 500;">${reservation.arrival_time}</td>
								</tr>` : ""}
							</table>
						</div>
					</td>
				</tr>
			</table>

			<!-- Financial Summary -->
			<div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
				<div style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; background: #F8FAFC;">
					<h3 style="margin: 0; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Financial Summary</h3>
				</div>
				<table style="width: 100%; border-collapse: collapse;">
					<tr>
						<td style="padding: 12px 16px; font-size: 13px; color: #374151; border-bottom: 1px solid #F3F4F6;">Room Charges (${reservation.nights} night${reservation.nights !== 1 ? "s" : ""} × ${currency} ${Number(reservation.room_rate).toLocaleString()})</td>
						<td style="padding: 12px 16px; font-size: 13px; color: #111827; font-weight: 600; text-align: right; border-bottom: 1px solid #F3F4F6;">${currency} ${Number(totalRoom).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
					</tr>
					${expenses > 0 ? `<tr>
						<td style="padding: 12px 16px; font-size: 13px; color: #374151; border-bottom: 1px solid #F3F4F6;">Additional Charges</td>
						<td style="padding: 12px 16px; font-size: 13px; color: #111827; font-weight: 600; text-align: right; border-bottom: 1px solid #F3F4F6;">${currency} ${Number(expenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
					</tr>` : ""}
					<tr style="background: #F9FAFB;">
						<td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #E5E7EB;">Subtotal</td>
						<td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #111827; text-align: right; border-bottom: 1px solid #E5E7EB;">${currency} ${Number(subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
					</tr>
					<tr>
						<td style="padding: 12px 16px; font-size: 13px; color: #059669; border-bottom: 1px solid #F3F4F6;">Amount Paid</td>
						<td style="padding: 12px 16px; font-size: 13px; color: #059669; font-weight: 600; text-align: right; border-bottom: 1px solid #F3F4F6;">- ${currency} ${Number(paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
					</tr>
					<tr style="background: ${balanceDue > 0 ? "#FEF2F2" : "#F0FDF4"};">
						<td style="padding: 14px 16px; font-size: 16px; font-weight: 700; color: ${balanceDue > 0 ? "#DC2626" : "#059669"};">BALANCE DUE</td>
						<td style="padding: 14px 16px; font-size: 16px; font-weight: 700; color: ${balanceDue > 0 ? "#DC2626" : "#059669"}; text-align: right;">${currency} ${Number(balanceDue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
					</tr>
				</table>
			</div>

			${reservation.special_requests ? `
			<div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
				<h3 style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">Special Requests</h3>
				<p style="margin: 0; font-size: 13px; color: #78350F; line-height: 1.5;">${reservation.special_requests}</p>
			</div>` : ""}

			${photoSection}

			<!-- Footer -->
			<div style="margin-top: 32px; padding-top: 16px; border-top: 2px solid #E5E7EB; text-align: center;">
				<p style="margin: 0 0 4px; font-size: 13px; color: #374151; font-weight: 600;">Thank you for choosing ${hotelName}!</p>
				<p style="margin: 0 0 4px; font-size: 11px; color: #9CA3AF;">For inquiries, contact us at ${hotelPhone || hotelEmail || "hotel reception"}.</p>
				<p style="margin: 8px 0 0; font-size: 10px; color: #D1D5DB;">Printed on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${new Date().toLocaleTimeString()}</p>
			</div>
		</div>
		`;
	};

	const printReservation = async (
		reservation: Reservation,
		tenant: Tenant | null,
	) => {
		let photoUrls: { url: string; type: string }[] = [];
		if (reservation.guest_id_photos) {
			const photos: IDPhoto[] =
				typeof reservation.guest_id_photos === "string"
					? JSON.parse(reservation.guest_id_photos)
					: reservation.guest_id_photos;
			if (Array.isArray(photos) && photos.length > 0) {
				photoUrls = await getSignedPhotoUrls(photos);
			}
		}

		const printContent = generatePrintContent(reservation, tenant, photoUrls);

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
							margin: 10mm;
						}
						@media print {
							body { 
								margin: 0; 
								padding: 0; 
								-webkit-print-color-adjust: exact;
								print-color-adjust: exact;
								color-adjust: exact;
							}
							table { 
								page-break-inside: avoid; 
							}
						}
						body {
							font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
							line-height: 1.4;
							color: #111827;
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

			const images = iframeDoc.querySelectorAll("img");
			if (images.length > 0) {
				await Promise.all(
					Array.from(images).map(
						(img) =>
							new Promise<void>((resolve) => {
								if (img.complete) {
									resolve();
								} else {
									img.onload = () => resolve();
									img.onerror = () => resolve();
								}
							}),
					),
				);
			}

			iframe.contentWindow?.print();

			setTimeout(() => {
				document.body.removeChild(iframe);
			}, 1000);
		}
	};

	const downloadReservationPdf = async (
		reservation: Reservation,
		tenant: Tenant | null,
	) => {
		let photoUrls: { url: string; type: string }[] = [];
		if (reservation.guest_id_photos) {
			const photos: IDPhoto[] =
				typeof reservation.guest_id_photos === "string"
					? JSON.parse(reservation.guest_id_photos)
					: reservation.guest_id_photos;
			if (Array.isArray(photos) && photos.length > 0) {
				photoUrls = await getSignedPhotoUrls(photos);
			}
		}

		const printContent = generatePrintContent(reservation, tenant, photoUrls);

		const fullHtml = `<!DOCTYPE html><html><head>
			<title>Reservation Receipt - ${reservation.reservation_number}</title>
			<style>
				@page { size: A4; margin: 10mm; }
				body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.4; margin: 0; padding: 0; color: #111827; }
				table { border-collapse: collapse; }
			</style>
		</head><body>${printContent}</body></html>`;

		const iframe = document.createElement("iframe");
		iframe.style.position = "fixed";
		iframe.style.left = "-9999px";
		iframe.style.width = "210mm";
		iframe.style.height = "297mm";
		document.body.appendChild(iframe);

		const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
		if (!iframeDoc) {
			document.body.removeChild(iframe);
			return;
		}

		iframeDoc.open();
		iframeDoc.write(fullHtml);
		iframeDoc.close();

		const images = iframeDoc.querySelectorAll("img");
		if (images.length > 0) {
			await Promise.all(
				Array.from(images).map(
					(img) =>
						new Promise<void>((resolve) => {
							if (img.complete) resolve();
							else {
								img.onload = () => resolve();
								img.onerror = () => resolve();
							}
						}),
				),
			);
		}

		iframe.contentWindow?.print();
		setTimeout(() => {
			document.body.removeChild(iframe);
		}, 1000);
	};

	return { printReservation, downloadReservationPdf, generatePrintContent };
};
