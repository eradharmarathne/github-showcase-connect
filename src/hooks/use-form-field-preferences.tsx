import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type FormFieldPreferences = Tables<"form_field_preferences">;

export function useFormFieldPreferences() {
	const { tenant } = useTenant();
	const { toast } = useToast();
	const [preferences, setPreferences] = useState<FormFieldPreferences | null>(
		null,
	);
	const [loading, setLoading] = useState(true);

	const fetchPreferences = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			setLoading(true);
			const { data, error } = await supabase
				.from("form_field_preferences")
				.select("*")
				.eq("tenant_id", tenant.id)
				.single();

			if (error && error.code !== "PGRST116") {
				// PGRST116 is "not found" error
				throw error;
			}

			if (data) {
				setPreferences(data);
			} else {
				// Create default preferences if none exist
				const defaultPreferences = {
					tenant_id: tenant.id,
					show_guest_email: true,
					show_guest_phone: true,
					show_guest_address: true,
					show_guest_nationality: true,
					show_guest_passport_number: true,
					show_guest_id_number: false,
					show_adults: true,
					show_children: true,
					show_arrival_time: false,
					show_special_requests: true,
					show_advance_amount: true,
					show_paid_amount: true,
					show_guide: true,
					show_agent: true,
					show_booking_source: false,
					show_id_photos: false,
					show_guest_signature: false,
				};

				const { data: newData, error: insertError } = await supabase
					.from("form_field_preferences")
					.insert(defaultPreferences)
					.select()
					.single();

				if (insertError) throw insertError;
				setPreferences(newData);
			}
		} catch (error) {
			console.error("Error fetching form field preferences:", error);
			toast({
				title: "Error",
				description: "Failed to load form preferences",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, toast]);

	const updatePreferences = async (updates: Partial<FormFieldPreferences>) => {
		if (!tenant?.id || !preferences) return;

		try {
			const { data, error } = await supabase
				.from("form_field_preferences")
				.update({
					...updates,
					updated_at: new Date().toISOString(),
				})
				.eq("tenant_id", tenant.id)
				.select()
				.single();

			if (error) throw error;

			setPreferences(data);
			toast({
				title: "Success",
				description: "Form preferences updated successfully",
			});
		} catch (error) {
			console.error("Error updating form field preferences:", error);
			toast({
				title: "Error",
				description: "Failed to update form preferences",
				variant: "destructive",
			});
		}
	};

	useEffect(() => {
		fetchPreferences();
	}, [tenant?.id, fetchPreferences]);

	return {
		preferences,
		loading,
		updatePreferences,
		refetch: fetchPreferences,
	};
}
