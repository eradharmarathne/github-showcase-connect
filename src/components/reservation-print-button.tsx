import { Printer } from "lucide-react";
import React from "react";
import { PrintableReservation } from "@/components/ReservationPrintableView";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
	PrintableReservationData,
	useReservationPrint,
} from "@/hooks/useReservationPrint";

// Enhanced reservation type from ReservationsList - matches what Supabase returns
type EnhancedReservation = {
	id: string;
	reservation_number: string;
	location_id: string;
	room_id: string;
	guest_name: string;
	guest_email?: string | null;
	guest_phone?: string | null;
	guest_address?: string | null;
	guest_id_number?: string | null;
	guest_nationality?: string | null;
	adults: number;
	children: number;
	check_in_date: string;
	check_out_date: string;
	nights: number;
	room_rate: number;
	total_amount: number;
	advance_amount?: number | null;
	paid_amount?: number | null;
	balance_amount?: number | null;
	currency: "LKR" | "USD" | "EUR" | "GBP";
	status:
		| "pending"
		| "confirmed"
		| "checked_in"
		| "checked_out"
		| "cancelled"
		| "tentative";
	special_requests?: string | null;
	arrival_time?: string | null;
	created_by?: string | null;
	grc_approved: boolean;
	grc_approved_by?: string | null;
	grc_approved_at?: string | null;
	created_at: string;
	updated_at: string;
	tenant_id?: string | null;
	guide_id?: string | null;
	agent_id?: string | null;
	guide_commission?: number | null;
	agent_commission?: number | null;
	booking_source: string;
	locations: {
		id: string;
		name: string;
		address: string | null;
		phone: string | null;
		email: string | null;
		property_type: string | null;
		tenant_id: string;
		is_active: boolean;
		created_at: string;
	} | null;
	rooms: {
		id: string;
		room_number: string;
		room_type: string;
		bed_type: string;
		description: string | null;
		amenities: string[] | null;
		base_price: number;
		max_occupancy: number;
		property_type: string;
		currency: string;
		location_id: string;
		tenant_id: string;
		is_active: boolean;
		created_at: string;
		updated_at: string;
	} | null;
	guides?: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		address: string | null;
		license_number: string | null;
		is_active: boolean;
	} | null;
	agents?: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		agency_name: string | null;
		is_active: boolean;
	} | null;
};

/**
 * Transform enhanced reservation data to printable format
 */
const transformToPrintableData = (
	reservation: EnhancedReservation,
	tenantData?: any,
): PrintableReservationData => {
	const transformed = {
		// Base reservation data
		...reservation,

		// Enhanced hotel/tenant information from context
		tenant_name: tenantData?.hotel_name || tenantData?.name,
		hotel_name: tenantData?.hotel_name || tenantData?.name,
		hotel_address: tenantData?.hotel_address || tenantData?.address,
		hotel_phone: tenantData?.hotel_phone || tenantData?.phone,
		hotel_email: tenantData?.hotel_email || tenantData?.email,
		hotel_website: tenantData?.hotel_website || tenantData?.website,
		logo_url: tenantData?.logo_url,

		// Enhanced location information
		location_name: reservation.locations?.name || "Unknown Location",
		location_address: reservation.locations?.address || null,
		location_phone: reservation.locations?.phone || null,
		location_email: reservation.locations?.email || null,

		// Room details
		room_number: reservation.rooms?.room_number || "Unknown Room",
		room_type: reservation.rooms?.room_type || "Unknown Type",
		bed_type: reservation.rooms?.bed_type || "Unknown Bed",
		room_description: reservation.rooms?.description || null,
		amenities: reservation.rooms?.amenities || [],

		// Guide information
		guide_name: reservation.guides?.name,
		guide_phone: reservation.guides?.phone,
		guide_email: reservation.guides?.email,
		guide_address: reservation.guides?.address,
		guide_license: reservation.guides?.license_number,

		// Agent information
		agent_name: reservation.agents?.name,
		agent_phone: reservation.agents?.phone,
		agent_email: reservation.agents?.email,
		agency_name: reservation.agents?.agency_name,

		// Legacy structure for backward compatibility
		locations: reservation.locations
			? {
					id: reservation.locations.id,
					name: reservation.locations.name,
					is_active: reservation.locations.is_active,
					created_at: reservation.locations.created_at,
				}
			: null,
		rooms: reservation.rooms
			? {
					id: reservation.rooms.id,
					bed_type: reservation.rooms.bed_type,
					currency: reservation.rooms.currency,
					amenities: reservation.rooms.amenities || [],
					is_active: reservation.rooms.is_active,
					room_type: reservation.rooms.room_type,
					base_price: reservation.rooms.base_price,
					created_at: reservation.rooms.created_at,
					updated_at: reservation.rooms.updated_at,
					description: reservation.rooms.description || "",
					location_id: reservation.rooms.location_id,
					room_number: reservation.rooms.room_number,
					max_occupancy: reservation.rooms.max_occupancy,
					property_type: reservation.rooms.property_type,
				}
			: null,
	};

	return transformed;
};

interface ReservationPrintButtonProps {
	reservation: PrintableReservationData | EnhancedReservation;
	buttonText?: string;
	buttonVariant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";
	buttonSize?: "default" | "sm" | "lg" | "icon";
	showIcon?: boolean;
	className?: string;
}

/**
 * Reusable component that renders a print button and handles printing logic
 * Can be easily integrated into any component that needs to print reservation details
 */
export const ReservationPrintButton: React.FC<ReservationPrintButtonProps> = ({
	reservation,
	buttonText = "Print",
	buttonVariant = "outline",
	buttonSize = "sm",
	showIcon = true,
	className = "",
}) => {
	const { printRef, printReservation } = useReservationPrint();
	const { tenant } = useAuth();

	const handlePrint = () => {
		// Check if reservation has enhanced data structure and transform if needed
		const printableData =
			"guides" in reservation
				? transformToPrintableData(reservation as EnhancedReservation, tenant)
				: (reservation as PrintableReservationData);

		printReservation(printableData);
	};

	// Prepare data for the hidden printable component
	const printableReservation =
		"guides" in reservation
			? transformToPrintableData(reservation as EnhancedReservation, tenant)
			: (reservation as PrintableReservationData);

	return (
		<>
			<Button
				onClick={handlePrint}
				variant={buttonVariant}
				size={buttonSize}
				className={`flex items-center gap-2 ${className}`}
			>
				{showIcon && <Printer className="h-4 w-4" />}
				{buttonText}
			</Button>

			{/* Hidden printable component - using print-only styles instead of display:none */}
			<div style={{ display: "none" }}>
				<PrintableReservation
					ref={printRef}
					reservation={printableReservation}
				/>
			</div>
		</>
	);
};

export default ReservationPrintButton;
