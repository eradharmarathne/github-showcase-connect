import { Calendar, MapPin, Search } from "lucide-react";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type Currency = Database["public"]["Enums"]["currency_type"];

interface Location {
	id: string;
	name: string;
}

interface ReservationsFiltersProps {
	locations: Location[];
	selectedLocation: string;
	onLocationChange: (value: string) => void;
	searchQuery: string;
	onSearchChange: (value: string) => void;
	statusFilter: string;
	onStatusFilterChange: (value: string) => void;
	selectedCurrency: Currency;
	onCurrencyChange: (currency: Currency) => void;
	onNewReservation: () => void;
}

export function ReservationsFilters({
	locations,
	selectedLocation,
	onLocationChange,
	searchQuery,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
	selectedCurrency,
	onCurrencyChange,
	onNewReservation,
}: ReservationsFiltersProps) {
	return (
		<div className="flex flex-col lg:flex-row gap-4">
			{locations.length > 1 && (
				<Select value={selectedLocation} onValueChange={onLocationChange}>
					<SelectTrigger className="w-full lg:w-48">
						<SelectValue placeholder="Select location" />
					</SelectTrigger>
					<SelectContent className="z-50 bg-background border">
						{locations.map((location) => (
							<SelectItem key={location.id} value={location.id}>
								{location.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			<div className="relative flex-1 lg:w-64">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
				<Input
					placeholder="Search reservations..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-10 w-full"
				/>
			</div>

			<Select value={statusFilter} onValueChange={onStatusFilterChange}>
				<SelectTrigger className="w-full lg:w-48">
					<SelectValue placeholder="Filter by status" />
				</SelectTrigger>
				<SelectContent className="z-50 bg-background border">
					<SelectItem value="all">All Statuses</SelectItem>
					<SelectItem value="confirmed">Confirmed</SelectItem>
					<SelectItem value="tentative">Tentative</SelectItem>
					<SelectItem value="pending">Pending</SelectItem>
					<SelectItem value="checked_in">Checked In</SelectItem>
					<SelectItem value="checked_out">Checked Out</SelectItem>
					<SelectItem value="cancelled">Cancelled</SelectItem>
				</SelectContent>
			</Select>

			<div className="w-full lg:w-48">
				<CurrencySelector
					currency={selectedCurrency}
					onCurrencyChange={onCurrencyChange}
				/>
			</div>

			<Button onClick={onNewReservation} className="flex-shrink-0">
				<Calendar className="size-4 mr-2" />
				New Reservation
			</Button>
		</div>
	);
}
