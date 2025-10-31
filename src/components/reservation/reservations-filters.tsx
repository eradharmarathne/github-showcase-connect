import { Calendar, ChevronDown, MapPin, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CurrencySelector } from "@/components/common/currency-selector";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Currency = string;

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
	onNewCompactReservation?: () => void;
}

export function ReservationsFilters({
	searchQuery,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
	selectedCurrency,
	onCurrencyChange,
	onNewReservation,
	onNewCompactReservation,
}: ReservationsFiltersProps) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col lg:flex-row gap-4">
			<div className="relative flex-1 lg:w-64">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
				<Input
					placeholder={t("reservations.filters.searchPlaceholder")}
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-10 w-full"
				/>
			</div>

			<Select value={statusFilter} onValueChange={onStatusFilterChange}>
				<SelectTrigger className="w-full lg:w-48">
					<SelectValue placeholder={t("reservations.filters.filterByStatus")} />
				</SelectTrigger>
				<SelectContent className="z-50 bg-background border">
					<SelectItem value="all">
						{t("reservations.filters.allStatuses")}
					</SelectItem>
					<SelectItem value="confirmed">
						{t("reservations.status.confirmed")}
					</SelectItem>
					<SelectItem value="tentative">
						{t("reservations.status.tentative")}
					</SelectItem>
					<SelectItem value="pending">
						{t("reservations.status.pending")}
					</SelectItem>
					<SelectItem value="checked_in">
						{t("reservations.status.checked_in")}
					</SelectItem>
					<SelectItem value="checked_out">
						{t("reservations.status.checked_out")}
					</SelectItem>
					<SelectItem value="cancelled">
						{t("reservations.status.cancelled")}
					</SelectItem>
				</SelectContent>
			</Select>

			<div className="w-full lg:w-48">
				<CurrencySelector
					currency={selectedCurrency}
					onCurrencyChange={onCurrencyChange}
				/>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button className="flex-shrink-0" data-testid="add-reservation-btn">
						<Calendar className="size-4 mr-2" />
						{t("reservations.filters.newReservation")}
						<ChevronDown className="size-4 ml-2" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{onNewCompactReservation && (
						<DropdownMenuItem onClick={onNewCompactReservation}>
							<Calendar className="size-4 mr-2" />
							Quick Reservation
						</DropdownMenuItem>
					)}
					<DropdownMenuItem onClick={onNewReservation}>
						<Calendar className="size-4 mr-2" />
						Full Reservation Form
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
