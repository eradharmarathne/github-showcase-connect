import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NationalityCombobox } from "@/components/ui/nationality-combobox";
import { PhoneInput } from "@/components/ui/phone-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFormFieldPreferences } from "@/hooks/use-form-field-preferences";

interface GuestData {
	guest_name: string;
	guest_email: string;
	guest_phone: string;
	guest_address: string;
	guest_nationality: string;
	guest_passport_number: string;
	guest_id_number: string;
	special_requests: string;
	booking_source: string;
}

interface GuestInformationStepProps {
	guestData: GuestData;
	onGuestDataChange: (field: string, value: any) => void;
}

export function GuestInformationStep({
	guestData,
	onGuestDataChange,
}: GuestInformationStepProps) {
	const { preferences: fieldPreferences } = useFormFieldPreferences();

	return (
		<div className="space-y-4">
			<h3 className="text-base md:text-lg lg:text-xl font-semibold">
				Guest Information
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="md:col-span-2 space-y-2">
					<Label htmlFor="guest_name">Guest Name *</Label>
					<Input
						id="guest_name"
						value={guestData.guest_name}
						onChange={(e) => onGuestDataChange("guest_name", e.target.value)}
						placeholder="Enter guest name"
						required
					/>
				</div>

				{fieldPreferences?.show_guest_email !== false && (
					<div className="space-y-2">
						<Label htmlFor="guest_email">Email</Label>
						<Input
							id="guest_email"
							type="email"
							value={guestData.guest_email}
							onChange={(e) => onGuestDataChange("guest_email", e.target.value)}
							placeholder="Enter email address"
						/>
					</div>
				)}

				{fieldPreferences?.show_guest_phone !== false && (
					<div className="space-y-2">
						<Label htmlFor="guest_phone">Phone</Label>
						<PhoneInput
							defaultCountry="LK"
							international
							value={guestData.guest_phone}
							onChange={(value) =>
								onGuestDataChange("guest_phone", value || "")
							}
							placeholder="Enter phone number"
						/>
					</div>
				)}

				{fieldPreferences?.show_guest_nationality !== false && (
					<div className="space-y-2">
						<Label htmlFor="guest_nationality">Nationality</Label>
						<NationalityCombobox
							value={guestData.guest_nationality}
							onValueChange={(val) =>
								onGuestDataChange("guest_nationality", val)
							}
							placeholder="Select nationality"
						/>
					</div>
				)}

				{fieldPreferences?.show_guest_passport_number !== false && (
					<div className="space-y-2">
						<Label htmlFor="guest_passport_number">Passport Number</Label>
						<Input
							id="guest_passport_number"
							value={guestData.guest_passport_number}
							onChange={(e) =>
								onGuestDataChange("guest_passport_number", e.target.value)
							}
							placeholder="Enter passport number"
						/>
					</div>
				)}

				{fieldPreferences?.show_guest_id_number !== false && (
					<div className="space-y-2">
						<Label htmlFor="guest_id_number">ID Number</Label>
						<Input
							id="guest_id_number"
							value={guestData.guest_id_number}
							onChange={(e) =>
								onGuestDataChange("guest_id_number", e.target.value)
							}
							placeholder="Enter ID number"
						/>
					</div>
				)}

				{fieldPreferences?.show_guest_address !== false && (
					<div className="md:col-span-2 space-y-2">
						<Label htmlFor="guest_address">Address</Label>
						<Textarea
							id="guest_address"
							value={guestData.guest_address}
							onChange={(e) =>
								onGuestDataChange("guest_address", e.target.value)
							}
							placeholder="Enter address"
							rows={3}
						/>
					</div>
				)}
			</div>

			{/* Booking Source */}
			{fieldPreferences?.show_booking_source !== false && (
				<div className="space-y-2">
					<Label htmlFor="booking_source">Booking Source</Label>
					<Select
						value={guestData.booking_source}
						onValueChange={(value) =>
							onGuestDataChange("booking_source", value)
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select booking source" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="direct">Direct</SelectItem>
							<SelectItem value="airbnb">Airbnb</SelectItem>
							<SelectItem value="booking_com">Booking.com</SelectItem>
							<SelectItem value="expedia">Expedia</SelectItem>
							<SelectItem value="agoda">Agoda</SelectItem>
							<SelectItem value="beds24">Beds24</SelectItem>
							<SelectItem value="manual">Manual</SelectItem>
							<SelectItem value="online">Online</SelectItem>
							<SelectItem value="phone">Phone</SelectItem>
							<SelectItem value="email">Email</SelectItem>
							<SelectItem value="walk_in">Walk-in</SelectItem>
							<SelectItem value="ical">iCal</SelectItem>
						</SelectContent>
					</Select>
				</div>
			)}

			{/* Special Requests */}
			{fieldPreferences?.show_special_requests !== false && (
				<div className="space-y-2">
					<Label htmlFor="special_requests">Special Requests</Label>
					<Textarea
						id="special_requests"
						value={guestData.special_requests}
						onChange={(e) =>
							onGuestDataChange("special_requests", e.target.value)
						}
						placeholder="Any special requests or notes"
					/>
				</div>
			)}
		</div>
	);
}

export type { GuestData };
