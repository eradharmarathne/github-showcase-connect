import { Bell, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NotificationContact {
	id: string;
	tenant_id: string;
	location_id: string;
	name: string;
	phone: string;
	category: string;
	notify_on_reservation: boolean;
	notify_on_check_in: boolean;
	notify_on_check_out: boolean;
	notify_on_payment: boolean;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

const CATEGORY_OPTIONS = [
	{ value: "management", label: "Management" },
	{ value: "admin", label: "Admin" },
	{ value: "reception", label: "Reception" },
	{ value: "owner", label: "Owner" },
	{ value: "other", label: "Other" },
] as const;

const EMPTY_FORM = {
	name: "",
	phone: "",
	category: "management",
	notify_on_reservation: true,
	notify_on_check_in: false,
	notify_on_check_out: false,
	notify_on_payment: false,
};

interface NotificationContactsProps {
	locationId: string;
	tenantId: string;
}

export function NotificationContacts({
	locationId,
	tenantId,
}: NotificationContactsProps) {
	const [contacts, setContacts] = useState<NotificationContact[]>([]);
	const [loading, setLoading] = useState(true);
	const [showAddForm, setShowAddForm] = useState(false);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);

	const fetchContacts = useCallback(async () => {
		try {
			const { data, error } = await (supabase as any)
				.from("location_notification_contacts")
				.select("*")
				.eq("tenant_id", tenantId)
				.eq("location_id", locationId)
				.order("created_at", { ascending: true });

			if (error) throw error;
			setContacts(data ?? []);
		} catch (error) {
			console.error("Error fetching notification contacts:", error);
		} finally {
			setLoading(false);
		}
	}, [tenantId, locationId]);

	useEffect(() => {
		fetchContacts();
	}, [fetchContacts]);

	const handleAdd = async () => {
		if (!form.name.trim() || !form.phone.trim()) {
			toast({
				title: "Validation Error",
				description: "Name and phone are required",
				variant: "destructive",
			});
			return;
		}

		setSaving(true);
		try {
			const { error } = await (supabase as any)
				.from("location_notification_contacts")
				.insert({
					tenant_id: tenantId,
					location_id: locationId,
					name: form.name,
					phone: form.phone,
					category: form.category,
					notify_on_reservation: form.notify_on_reservation,
					notify_on_check_in: form.notify_on_check_in,
					notify_on_check_out: form.notify_on_check_out,
					notify_on_payment: form.notify_on_payment,
					is_active: true,
				});

			if (error) throw error;

			toast({ title: "Success", description: "Contact added" });
			setForm(EMPTY_FORM);
			setShowAddForm(false);
			fetchContacts();
		} catch (error) {
			console.error("Error adding contact:", error);
			toast({
				title: "Error",
				description: "Failed to add contact",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleToggle = async (
		contactId: string,
		field: keyof Pick<
			NotificationContact,
			| "notify_on_reservation"
			| "notify_on_check_in"
			| "notify_on_check_out"
			| "notify_on_payment"
			| "is_active"
		>,
		value: boolean,
	) => {
		try {
			const { error } = await (supabase as any)
				.from("location_notification_contacts")
				.update({ [field]: value, updated_at: new Date().toISOString() })
				.eq("id", contactId);

			if (error) throw error;

			setContacts((prev) =>
				prev.map((c) => (c.id === contactId ? { ...c, [field]: value } : c)),
			);
		} catch (error) {
			console.error("Error updating contact:", error);
			toast({
				title: "Error",
				description: "Failed to update contact",
				variant: "destructive",
			});
		}
	};

	const handleDelete = async (contactId: string) => {
		try {
			const { error } = await (supabase as any)
				.from("location_notification_contacts")
				.delete()
				.eq("id", contactId);

			if (error) throw error;

			setContacts((prev) => prev.filter((c) => c.id !== contactId));
			toast({ title: "Success", description: "Contact removed" });
		} catch (error) {
			console.error("Error deleting contact:", error);
			toast({
				title: "Error",
				description: "Failed to remove contact",
				variant: "destructive",
			});
		}
	};

	if (loading) {
		return (
			<div className="mt-4 border-t pt-4">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Bell className="h-4 w-4" />
					Loading notification contacts...
				</div>
			</div>
		);
	}

	return (
		<div className="mt-4 border-t pt-4">
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-sm font-medium flex items-center gap-2">
					<Bell className="h-4 w-4" />
					SMS Notification Contacts
				</h4>
				{!showAddForm && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowAddForm(true)}
					>
						<Plus className="h-3 w-3 mr-1" />
						Add Contact
					</Button>
				)}
			</div>

			{showAddForm && (
				<div className="border rounded-lg p-3 mb-3 bg-muted/30">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div>
							<Label className="text-xs">Name</Label>
							<Input
								value={form.name}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, name: e.target.value }))
								}
								placeholder="Contact name"
								className="h-8 text-sm"
							/>
						</div>
						<div>
							<Label className="text-xs">Phone</Label>
							<PhoneInput
								defaultCountry="LK"
								international
								value={form.phone}
								onChange={(value) =>
									setForm((prev) => ({ ...prev, phone: value }))
								}
								placeholder="Phone number"
							/>
						</div>
						<div>
							<Label className="text-xs">Category</Label>
							<Select
								value={form.category}
								onValueChange={(value) =>
									setForm((prev) => ({ ...prev, category: value }))
								}
							>
								<SelectTrigger className="h-8 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CATEGORY_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="flex flex-wrap gap-4 mt-3">
						<label className="flex items-center gap-2 text-xs">
							<Switch
								checked={form.notify_on_reservation}
								onCheckedChange={(v) =>
									setForm((prev) => ({ ...prev, notify_on_reservation: v }))
								}
							/>
							Reservations
						</label>
						<label className="flex items-center gap-2 text-xs">
							<Switch
								checked={form.notify_on_check_in}
								onCheckedChange={(v) =>
									setForm((prev) => ({ ...prev, notify_on_check_in: v }))
								}
							/>
							Check-in
						</label>
						<label className="flex items-center gap-2 text-xs">
							<Switch
								checked={form.notify_on_check_out}
								onCheckedChange={(v) =>
									setForm((prev) => ({ ...prev, notify_on_check_out: v }))
								}
							/>
							Check-out
						</label>
						<label className="flex items-center gap-2 text-xs">
							<Switch
								checked={form.notify_on_payment}
								onCheckedChange={(v) =>
									setForm((prev) => ({ ...prev, notify_on_payment: v }))
								}
							/>
							Payments
						</label>
					</div>
					<div className="flex gap-2 mt-3">
						<Button
							size="sm"
							onClick={handleAdd}
							disabled={saving || !form.name.trim() || !form.phone.trim()}
						>
							{saving ? "Saving..." : "Save Contact"}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setShowAddForm(false);
								setForm(EMPTY_FORM);
							}}
						>
							<X className="h-3 w-3 mr-1" />
							Cancel
						</Button>
					</div>
				</div>
			)}

			{contacts.length === 0 && !showAddForm ? (
				<p className="text-xs text-muted-foreground">
					No notification contacts configured. Add contacts to receive SMS
					alerts for this location.
				</p>
			) : (
				<div className="space-y-2">
					{contacts.map((contact) => (
						<div
							key={contact.id}
							className={`border rounded-lg p-3 text-sm ${!contact.is_active ? "opacity-50" : ""}`}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-medium">{contact.name}</span>
										<span className="text-xs text-muted-foreground">
											{contact.phone}
										</span>
										<span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded capitalize">
											{contact.category}
										</span>
									</div>
									<div className="flex flex-wrap gap-3 mt-2">
										<label className="flex items-center gap-1.5 text-xs">
											<Switch
												checked={contact.notify_on_reservation}
												onCheckedChange={(v) =>
													handleToggle(
														contact.id,
														"notify_on_reservation",
														v,
													)
												}
												className="scale-75"
											/>
											Reservations
										</label>
										<label className="flex items-center gap-1.5 text-xs">
											<Switch
												checked={contact.notify_on_check_in}
												onCheckedChange={(v) =>
													handleToggle(contact.id, "notify_on_check_in", v)
												}
												className="scale-75"
											/>
											Check-in
										</label>
										<label className="flex items-center gap-1.5 text-xs">
											<Switch
												checked={contact.notify_on_check_out}
												onCheckedChange={(v) =>
													handleToggle(contact.id, "notify_on_check_out", v)
												}
												className="scale-75"
											/>
											Check-out
										</label>
										<label className="flex items-center gap-1.5 text-xs">
											<Switch
												checked={contact.notify_on_payment}
												onCheckedChange={(v) =>
													handleToggle(contact.id, "notify_on_payment", v)
												}
												className="scale-75"
											/>
											Payments
										</label>
									</div>
								</div>
								<div className="flex items-center gap-1 shrink-0">
									<Switch
										checked={contact.is_active}
										onCheckedChange={(v) =>
											handleToggle(contact.id, "is_active", v)
										}
										aria-label="Toggle active"
									/>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 text-destructive hover:text-destructive"
										onClick={() => handleDelete(contact.id)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
