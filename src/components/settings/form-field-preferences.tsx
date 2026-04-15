import { Bell, Edit, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useFormFieldPreferences } from "@/hooks/use-form-field-preferences";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";

interface LocationContactSummary {
	location_id: string;
	location_name: string;
	active_contacts: number;
	reservation_contacts: number;
}

function useSmsNotificationSummary(tenantId: string | undefined) {
	const [summaries, setSummaries] = useState<LocationContactSummary[]>([]);
	const [loading, setLoading] = useState(true);

	const fetch = useCallback(async () => {
		if (!tenantId) return;
		try {
			const { data: locations } = await supabase
				.from("locations")
				.select("id, name")
				.eq("tenant_id", tenantId)
				.eq("is_active", true)
				.order("name");

			if (!locations?.length) {
				setSummaries([]);
				return;
			}

			const { data: contacts } = await (supabase as any)
				.from("location_notification_contacts")
				.select("location_id, is_active, notify_on_reservation")
				.eq("tenant_id", tenantId);

			const contactList = (contacts ?? []) as Array<{
				location_id: string;
				is_active: boolean;
				notify_on_reservation: boolean;
			}>;

			setSummaries(
				locations.map((loc) => {
					const locContacts = contactList.filter(
						(c) => c.location_id === loc.id,
					);
					return {
						location_id: loc.id,
						location_name: loc.name,
						active_contacts: locContacts.filter((c) => c.is_active).length,
						reservation_contacts: locContacts.filter(
							(c) => c.is_active && c.notify_on_reservation,
						).length,
					};
				}),
			);
		} catch (error) {
			console.error("Error fetching SMS notification summary:", error);
		} finally {
			setLoading(false);
		}
	}, [tenantId]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	return { summaries, loading };
}

export function FormFieldPreferences() {
	const { tenant } = useTenant();
	const {
		preferences: formPreferences,
		updatePreferences: updateFormPreferences,
		loading: formPreferencesLoading,
	} = useFormFieldPreferences();
	const { summaries, loading: summaryLoading } = useSmsNotificationSummary(
		tenant?.id,
	);

	const smsEnabled = (formPreferences as any)?.sms_on_new_reservation ?? true;

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

						{/* SMS Notification Settings */}
						<div className="mt-8 border-t pt-6">
							<h3 className="font-medium text-base flex items-center gap-2 mb-4">
								<Bell className="h-5 w-5" />
								SMS Notification Settings
							</h3>

							<div className="space-y-4">
								<div className="flex items-center justify-between p-4 border rounded-lg">
									<div>
										<p className="font-medium text-sm">
											Send SMS on New Reservation
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											When enabled, SMS notifications are sent to configured
											contacts when a new reservation is created.
										</p>
									</div>
									<Switch
										checked={smsEnabled}
										onCheckedChange={(checked) =>
											updateFormPreferences({
												sms_on_new_reservation: checked,
											} as any)
										}
									/>
								</div>

								{summaryLoading ? (
									<div className="text-sm text-muted-foreground">
										Loading contact summary...
									</div>
								) : summaries.length > 0 ? (
									<div className="space-y-2">
										<p className="text-sm font-medium">
											Notification Contacts per Location
										</p>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
											{summaries.map((s) => (
												<div
													key={s.location_id}
													className="flex items-center justify-between p-3 border rounded-lg text-sm"
												>
													<span className="font-medium">
														{s.location_name}
													</span>
													<span className="text-muted-foreground">
														{s.reservation_contacts > 0 ? (
															<span className="text-green-600">
																{s.reservation_contacts} contact
																{s.reservation_contacts !== 1 ? "s" : ""} for
																reservations
															</span>
														) : (
															<span className="text-amber-600">
																No reservation contacts
															</span>
														)}
													</span>
												</div>
											))}
										</div>
										<p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
											<ExternalLink className="h-3 w-3" />
											Manage contacts in Location Management settings above.
										</p>
									</div>
								) : (
									<div className="p-3 bg-amber-50 rounded-lg">
										<p className="text-sm text-amber-800">
											No locations configured. Add locations and notification
											contacts in Location Management to enable SMS
											notifications.
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
