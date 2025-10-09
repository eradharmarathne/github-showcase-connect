import { Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormFieldPreferences } from "@/hooks/useFormFieldPreferences";

export function FormFieldPreferences() {
	const {
		preferences: formPreferences,
		updatePreferences: updateFormPreferences,
		loading: formPreferencesLoading,
	} = useFormFieldPreferences();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Edit className="h-5 w-5" />
					Reservation Form Field Preferences
				</CardTitle>
			</CardHeader>
			<CardContent>
				{formPreferencesLoading ? (
					<div className="flex items-center justify-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
					</div>
				) : (
					<div className="space-y-6">
						<div className="text-sm text-muted-foreground mb-4">
							Select which fields to show in the reservation form. Unchecked
							fields will be hidden from the form.
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{/* Guest Information Fields */}
							<div className="space-y-4">
								<h3 className="font-medium text-sm text-gray-900">
									Guest Information
								</h3>
								<div className="space-y-3">
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_guest_email"
											checked={formPreferences?.show_guest_email ?? true}
											onChange={(e) =>
												updateFormPreferences({
													show_guest_email: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_guest_email" className="text-sm">
											Guest Email
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_guest_phone"
											checked={formPreferences?.show_guest_phone ?? true}
											onChange={(e) =>
												updateFormPreferences({
													show_guest_phone: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_guest_phone" className="text-sm">
											Guest Phone
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_guest_address"
											checked={formPreferences?.show_guest_address ?? true}
											onChange={(e) =>
												updateFormPreferences({
													show_guest_address: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_guest_address" className="text-sm">
											Guest Address
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_guest_nationality"
											checked={formPreferences?.show_guest_nationality ?? true}
											onChange={(e) =>
												updateFormPreferences({
													show_guest_nationality: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_guest_nationality" className="text-sm">
											Guest Nationality
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_guest_passport_number"
											checked={
												formPreferences?.show_guest_passport_number ?? true
											}
											onChange={(e) =>
												updateFormPreferences({
													show_guest_passport_number: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label
											htmlFor="show_guest_passport_number"
											className="text-sm"
										>
											Passport Number
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_guest_id_number"
											checked={formPreferences?.show_guest_id_number ?? false}
											onChange={(e) =>
												updateFormPreferences({
													show_guest_id_number: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_guest_id_number" className="text-sm">
											ID Number
										</label>
									</div>
								</div>
							</div>

							{/* Booking Details Fields */}
							<div className="space-y-4">
								<h3 className="font-medium text-sm text-gray-900">
									Booking Details
								</h3>
								<div className="space-y-3">
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_adults"
											checked={formPreferences?.show_adults ?? true}
											onChange={(e) =>
												updateFormPreferences({
													show_adults: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_adults" className="text-sm">
											Number of Adults
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_children"
											checked={formPreferences?.show_children ?? true}
											onChange={(e) =>
												updateFormPreferences({
													show_children: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_children" className="text-sm">
											Number of Children
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_arrival_time"
											checked={formPreferences?.show_arrival_time ?? false}
											onChange={(e) =>
												updateFormPreferences({
													show_arrival_time: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_arrival_time" className="text-sm">
											Arrival Time
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_special_requests"
											checked={formPreferences?.show_special_requests ?? true}
											onChange={(e) =>
												updateFormPreferences({
													show_special_requests: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_special_requests" className="text-sm">
											Special Requests
										</label>
									</div>
								</div>
							</div>

							{/* Financial & Commission Fields */}
							<div className="space-y-4">
								<h3 className="font-medium text-sm text-gray-900">
									Financial & Commission
								</h3>
								<div className="space-y-3">
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_advance_amount"
											checked={formPreferences?.show_advance_amount ?? true}
											onChange={(e) =>
												updateFormPreferences({
													show_advance_amount: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_advance_amount" className="text-sm">
											Advance Amount
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_paid_amount"
											checked={formPreferences?.show_paid_amount ?? true}
											onChange={(e) =>
												updateFormPreferences({
													show_paid_amount: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_paid_amount" className="text-sm">
											Paid Amount
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_guide"
											checked={formPreferences?.show_guide ?? true}
											onChange={(e) =>
												updateFormPreferences({
													show_guide: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_guide" className="text-sm">
											Guide Selection
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_agent"
											checked={formPreferences?.show_agent ?? true}
											onChange={(e) =>
												updateFormPreferences({
													show_agent: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_agent" className="text-sm">
											Agent Selection
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_booking_source"
											checked={formPreferences?.show_booking_source ?? false}
											onChange={(e) =>
												updateFormPreferences({
													show_booking_source: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_booking_source" className="text-sm">
											Booking Source
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_id_photos"
											checked={formPreferences?.show_id_photos ?? false}
											onChange={(e) =>
												updateFormPreferences({
													show_id_photos: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_id_photos" className="text-sm">
											ID Photo Upload
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="show_guest_signature"
											checked={formPreferences?.show_guest_signature ?? false}
											onChange={(e) =>
												updateFormPreferences({
													show_guest_signature: e.target.checked,
												})
											}
											className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
										/>
										<label htmlFor="show_guest_signature" className="text-sm">
											Guest Signature
										</label>
									</div>
								</div>
							</div>
						</div>

						<div className="mt-6 p-4 bg-blue-50 rounded-lg">
							<p className="text-sm text-blue-800">
								<strong>Note:</strong> Required fields like Guest Name, Room,
								Check-in/Check-out dates, and Room Rate are always visible and
								cannot be hidden.
							</p>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
