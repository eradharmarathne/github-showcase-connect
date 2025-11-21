import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useTenant } from "./use-tenant";
import { useToast } from "./use-toast";

type PrintSettings = Tables<"print_settings">;
type PrintSettingsInsert = Omit<
	PrintSettings,
	"id" | "created_at" | "updated_at"
>;
type PrintSettingsUpdate = Partial<
	Omit<PrintSettings, "id" | "tenant_id" | "created_at" | "updated_at">
>;

export function usePrintSettings() {
	const { tenant } = useTenant();
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const {
		data: printSettings,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["print-settings", tenant?.id],
		queryFn: async () => {
			if (!tenant?.id) throw new Error("No tenant ID");

			const { data, error } = await supabase
				.from("print_settings")
				.select("*")
				.eq("tenant_id", tenant.id)
				.single();

			if (error) {
				// If no settings exist, return default settings
				if (error.code === "PGRST116") {
					return null;
				}
				throw error;
			}

			return data as PrintSettings;
		},
		enabled: !!tenant?.id,
	});

	const createMutation = useMutation({
		mutationFn: async (settings: PrintSettingsUpdate) => {
			if (!tenant?.id) throw new Error("No tenant ID");

			const { data, error } = await supabase
				.from("print_settings")
				.insert({
					tenant_id: tenant.id,
					...settings,
				} as PrintSettingsInsert)
				.select()
				.single();

			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["print-settings", tenant?.id],
			});
			toast({
				title: "Success",
				description: "Print settings created successfully",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (settings: PrintSettingsUpdate) => {
			if (!tenant?.id) throw new Error("No tenant ID");

			const { data, error } = await supabase
				.from("print_settings")
				.update(settings)
				.eq("tenant_id", tenant.id)
				.select()
				.single();

			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["print-settings", tenant?.id],
			});
			toast({
				title: "Success",
				description: "Print settings updated successfully",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const saveSettings = async (settings: PrintSettingsUpdate) => {
		if (printSettings) {
			return updateMutation.mutateAsync(settings);
		} else {
			return createMutation.mutateAsync(settings);
		}
	};

	return {
		printSettings,
		isLoading,
		error,
		saveSettings,
		isSubmitting: createMutation.isPending || updateMutation.isPending,
	};
}
