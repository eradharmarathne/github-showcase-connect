import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

export interface PrintableReservationData {
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
	advance_amount?: number;
	paid_amount?: number;
	balance_amount?: number;
	currency: string;
	status: string;
	special_requests?: string | null;
	arrival_time?: string | null;
	created_by?: string | null;
	grc_approved: boolean;
	grc_approved_by?: string | null;
	grc_approved_at?: string | null;
	created_at: string;
	updated_at: string;
	guide_id?: string | null;
	agent_id?: string | null;
	guide_commission?: number;
	agent_commission?: number;
	booking_source: string;
	// Enhanced hotel/tenant information
	tenant_name?: string;
	hotel_name?: string;
	hotel_address?: string;
	hotel_phone?: string;
	hotel_email?: string;
	hotel_website?: string | null;
	logo_url?: string | null;
	// Enhanced location information
	location_name?: string;
	location_address?: string;
	location_phone?: string;
	location_email?: string;
	// Room details
	room_number?: string;
	room_type?: string;
	bed_type?: string;
	room_description?: string;
	amenities?: string[];
	// Guide information
	guide_name?: string;
	guide_phone?: string;
	guide_email?: string;
	guide_address?: string;
	guide_license?: string;
	// Agent information
	agent_name?: string;
	agent_phone?: string;
	agent_email?: string;
	agency_name?: string;
	// Legacy structure for backward compatibility
	locations?: {
		id: string;
		name: string;
		is_active: boolean;
		created_at: string;
	};
	rooms?: {
		id: string;
		bed_type: string;
		currency: string;
		amenities: string[];
		is_active: boolean;
		room_type: string;
		base_price: number;
		created_at: string;
		updated_at: string;
		description: string;
		location_id: string;
		room_number: string;
		max_occupancy: number;
		property_type: string;
	};
}

/**
 * Custom hook for printing reservations
 * Provides a ref and print function that can be used with ReservationPrintableView
 */
export const useReservationPrint = () => {
	const printRef = useRef<HTMLDivElement>(null);

	const handlePrint = useReactToPrint({
		contentRef: printRef,
		pageStyle: `
      @page {
        size: A4;
        margin: 1cm;
      }
      @media print {
        html, body {
          height: initial !important;
          overflow: initial !important;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
      }
    `,
	});

	const printReservation = (reservation: PrintableReservationData) => {
		// Update document title for the specific reservation
		const originalTitle = document.title;
		document.title = `Reservation-${reservation.reservation_number}`;

		// Call the print function
		if (handlePrint) {
			handlePrint();
		}

		// Restore original title after a delay
		setTimeout(() => {
			document.title = originalTitle;
		}, 1000);
	};

	return {
		printRef,
		printReservation,
		handlePrint,
	};
};

export default useReservationPrint;
