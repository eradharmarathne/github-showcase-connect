import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { usePrintSettings } from "@/hooks/use-print-settings";
import { useTenant } from "@/hooks/use-tenant";
import { Tables } from "@/integrations/supabase/types";

type PrintSettings = Tables<"print_settings">;

interface PrintTemplateProps {
	children: React.ReactNode;
	qrCodeData?: string;
	documentType?: string;
	// optional override so previews can pass unsaved settings
	printSettingsOverride?: any;
}

export function PrintTemplate({
	children,
	qrCodeData,
	documentType = "Document",
	printSettingsOverride,
}: PrintTemplateProps) {
	const { printSettings } = usePrintSettings();
	// allow preview to pass unsaved form state
	const settings = printSettingsOverride ?? printSettings;
	const { tenant } = useTenant();
	const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

	// Generate QR code if enabled
	useEffect(() => {
		if (settings?.show_qr_code && qrCodeData) {
			QRCode.toDataURL(qrCodeData, { width: 150 })
				.then(setQrCodeUrl)
				.catch(console.error);
		}
	}, [settings?.show_qr_code, qrCodeData]);

	// Get font size class
	const getFontSizeClass = () => {
		switch (settings?.font_size) {
			case "small":
				return "text-xs";
			case "large":
				return "text-base";
			default:
				return "text-sm";
		}
	};

	// Get paper size class
	const getPaperSizeClass = () => {
		switch (settings?.paper_size) {
			case "Letter":
				return "w-[8.5in] min-h-[11in]";
			case "A5":
				return "w-[148mm] min-h-[210mm]";
			default: // A4
				return "w-[210mm] min-h-[297mm]";
		}
	};

	return (
		<div
			className={`bg-white mx-auto p-8 print:p-8 ${getPaperSizeClass()} ${getFontSizeClass()} ${
				settings?.show_border ? "border-2 border-gray-300" : ""
			}`}
			style={{
				fontFamily: settings?.font_family || "Arial, sans-serif",
			}}
		>
			<style>
				{`
					@media print {
						body {
							margin: 0;
							padding: 0;
						}
						@page {
							size: ${printSettings?.paper_size || "A4"};
							margin: 0;
						}
					}
					${printSettings?.custom_css || ""}
				`}
			</style>

			{/* Header Section */}
			<div
				className="mb-6 pb-4 border-b-2"
				style={{ borderColor: printSettings?.primary_color || "#000" }}
			>
				<div className="flex items-start justify-between">
					{/* Logo */}
					{settings?.show_logo && tenant?.logo_url && (
						<div
							className={`${
								settings.logo_position === "center"
									? "mx-auto"
									: settings.logo_position === "right"
										? "ml-auto"
										: ""
							}`}
						>
							<img
								src={tenant.logo_url}
								alt="Logo"
								className="h-16 w-auto object-contain"
							/>
						</div>
					)}

					{/* Header Text */}
					{settings?.header_text && (
						<div className="text-center flex-1">
							<h1 className="text-2xl font-bold" style={{ color: "#000" }}>
								{settings.header_text}
							</h1>
						</div>
					)}

					{/* QR Code */}
					{printSettings?.show_qr_code && qrCodeUrl && (
						<div className="ml-auto">
							<img src={qrCodeUrl} alt="QR Code" className="w-24 h-24" />
						</div>
					)}
				</div>

				{/* Hotel Info */}
				{printSettings?.show_hotel_info && (
					<div className="mt-4 text-center">
						{tenant?.hotel_name && (
							<h2 className="text-lg font-semibold">{tenant.hotel_name}</h2>
						)}
						{tenant?.hotel_address && (
							<p className="text-sm">{tenant.hotel_address}</p>
						)}
						<div className="flex justify-center gap-4 text-sm mt-1">
							{tenant?.hotel_phone && <span>Tel: {tenant.hotel_phone}</span>}
							{tenant?.hotel_email && <span>Email: {tenant.hotel_email}</span>}
						</div>
						{tenant?.hotel_website && (
							<p className="text-sm">Website: {tenant.hotel_website}</p>
						)}
					</div>
				)}
			</div>

			{/* Main Content */}
			<div className="mb-6">{children}</div>

			{/* Terms and Conditions */}
			{printSettings?.show_terms_and_conditions &&
				printSettings?.terms_and_conditions && (
					<div className="mt-8 pt-4 border-t">
						<h3 className="font-semibold mb-2">Terms & Conditions</h3>
						<p className="text-xs whitespace-pre-wrap">
							{printSettings.terms_and_conditions}
						</p>
					</div>
				)}

			{/* Footer Section */}
			<div className="mt-8 pt-4 border-t">
				{printSettings?.footer_text && (
					<p className="text-center text-sm mb-4">
						{printSettings.footer_text}
					</p>
				)}

				{printSettings?.show_signature_line && (
					<div className="mt-8 flex justify-end">
						<div className="text-center">
							<div className="border-t border-black w-48 mb-2"></div>
							<p className="text-sm">
								{printSettings.signature_label || "Authorized Signature"}
							</p>
						</div>
					</div>
				)}

				<p className="text-center text-xs text-gray-500 mt-4">
					Printed on {new Date().toLocaleDateString()} at{" "}
					{new Date().toLocaleTimeString()}
				</p>
			</div>
		</div>
	);
}
