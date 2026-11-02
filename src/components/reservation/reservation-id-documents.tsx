import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	type IDPhoto,
	IDPhotoUpload,
	parseIdPhotos,
	serializeIdPhotos,
} from "@/components/media/id-photo-upload";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReservationIdDocumentsProps {
	reservationId: string;
	title?: string;
	className?: string;
	onChange?: (photos: IDPhoto[]) => void;
}

/**
 * Loads and saves passport / ID photos for an existing reservation.
 * Changes are saved to the reservation immediately so uploads are never lost
 * if the surrounding dialog is closed without pressing Save.
 */
export function ReservationIdDocuments({
	reservationId,
	title = "Passport / ID Documents",
	className,
	onChange,
}: ReservationIdDocumentsProps) {
	const { toast } = useToast();
	const { tenant } = useTenant();
	const [photos, setPhotos] = useState<IDPhoto[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			const { data, error } = await supabase
				.from("reservations")
				.select("guest_id_photos")
				.eq("id", reservationId)
				.maybeSingle();
			if (cancelled) return;
			if (error) {
				console.error("Error loading ID documents:", error);
			}
			setPhotos(parseIdPhotos(data?.guest_id_photos));
			setLoading(false);
		};
		if (reservationId) load();
		return () => {
			cancelled = true;
		};
	}, [reservationId]);

	const handleChange = async (next: IDPhoto[]) => {
		const previous = photos;
		setPhotos(next);
		const { error } = await supabase
			.from("reservations")
			.update({ guest_id_photos: serializeIdPhotos(next) })
			.eq("id", reservationId);
		if (error) {
			console.error("Error saving ID documents:", error);
			setPhotos(previous);
			toast({
				title: "Could not save ID documents",
				description: error.message,
				variant: "destructive",
			});
			return;
		}
		onChange?.(next);
	};

	if (loading) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
				<Loader2 className="size-4 animate-spin" />
				Loading ID documents...
			</div>
		);
	}

	return (
		<IDPhotoUpload
			photos={photos}
			onPhotosChange={handleChange}
			title={title}
			maxPhotos={6}
			className={className}
			uploadPathPrefix={
				tenant?.id
					? `${tenant.id}/id-photos/${reservationId}`
					: `id-photos/${reservationId}`
			}
		/>
	);
}
