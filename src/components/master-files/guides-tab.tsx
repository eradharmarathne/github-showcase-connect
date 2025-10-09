import { Edit, Plus, Trash2, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";

type Guide = {
	id: string;
	name: string;
	phone?: string;
	email?: string;
	address?: string;
	license_number?: string;
	commission_rate: number;
	is_active: boolean;
	created_at: string;
};

export default function GuidesTab() {
	const [guides, setGuides] = useState<Guide[]>([]);
	const [loading, setLoading] = useState(true);
	const { tenant } = useTenant();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [guideToDelete, setGuideToDelete] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		phone: "",
		email: "",
		address: "",
		license_number: "",
		commission_rate: 0,
		is_active: true,
	});
	const { toast } = useToast();

	const fetchGuides = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			const { data, error } = await supabase
				.from("guides")
				.select("*")
				.eq("tenant_id", tenant?.id)
				.order("created_at", { ascending: false });

			if (error) throw error;
			setGuides(data || []);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch guides",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, toast]);

	useEffect(() => {
		fetchGuides();
	}, [fetchGuides]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			if (editingGuide) {
				const { error } = await supabase
					.from("guides")
					.update(formData)
					.eq("id", editingGuide.id);

				if (error) throw error;

				toast({
					title: "Success",
					description: "Guide updated successfully",
				});
			} else {
				const { error } = await supabase.from("guides").insert([
					{
						...formData,
						tenant_id: tenant?.id,
					},
				]);

				if (error) throw error;

				toast({
					title: "Success",
					description: "Guide created successfully",
				});
			}

			setIsDialogOpen(false);
			setEditingGuide(null);
			resetForm();
			fetchGuides();
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to save guide",
				variant: "destructive",
			});
		}
	};

	const resetForm = () => {
		setFormData({
			name: "",
			phone: "",
			email: "",
			address: "",
			license_number: "",
			commission_rate: 0,
			is_active: true,
		});
	};

	const handleEdit = (guide: Guide) => {
		setEditingGuide(guide);
		setFormData({
			name: guide.name,
			phone: guide.phone || "",
			email: guide.email || "",
			address: guide.address || "",
			license_number: guide.license_number || "",
			commission_rate: guide.commission_rate,
			is_active: guide.is_active,
		});
		setIsDialogOpen(true);
	};

	const handleDelete = (id: string) => {
		setGuideToDelete(id);
		setDeleteConfirmOpen(true);
	};

	const confirmDelete = async () => {
		if (!guideToDelete) return;

		try {
			const { error } = await supabase
				.from("guides")
				.delete()
				.eq("id", guideToDelete);

			if (error) throw error;

			toast({
				title: "Success",
				description: "Guide deleted successfully",
			});
			fetchGuides();
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete guide",
				variant: "destructive",
			});
		} finally {
			setDeleteConfirmOpen(false);
			setGuideToDelete(null);
		}
	};

	if (loading) {
		return null;
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<div>
					<h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
						<UserCheck className="size-6" />
						Tour Guides
					</h2>
					<p className="text-muted-foreground">
						Manage tour guides and their commission rates
					</p>
				</div>
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button
							onClick={() => {
								setEditingGuide(null);
								resetForm();
							}}
						>
							<Plus className="size-4 mr-2" />
							Add Guide
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>
								{editingGuide ? "Edit Guide" : "Add New Guide"}
							</DialogTitle>
							<DialogDescription>
								{editingGuide
									? "Update the guide details below."
									: "Enter the details for the new guide."}
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="name">Full Name</Label>
									<Input
										id="name"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										placeholder="Guide's full name"
										required
									/>
								</div>
								<div>
									<Label htmlFor="license_number">License Number</Label>
									<Input
										id="license_number"
										value={formData.license_number}
										onChange={(e) =>
											setFormData({
												...formData,
												license_number: e.target.value,
											})
										}
										placeholder="Tour guide license number"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="phone">Phone</Label>
									<PhoneInput
										id="phone"
										defaultCountry="LK"
										international
										value={formData.phone}
										onChange={(value) =>
											setFormData({ ...formData, phone: value || "" })
										}
										placeholder="Phone number"
									/>
								</div>
								<div>
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										type="email"
										value={formData.email}
										onChange={(e) =>
											setFormData({ ...formData, email: e.target.value })
										}
										placeholder="Email address"
									/>
								</div>
							</div>

							<div>
								<Label htmlFor="address">Address</Label>
								<Textarea
									id="address"
									value={formData.address}
									onChange={(e) =>
										setFormData({ ...formData, address: e.target.value })
									}
									placeholder="Full address"
									rows={2}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="commission_rate">Commission Rate (%)</Label>
									<Input
										id="commission_rate"
										type="number"
										min="0"
										max="100"
										step="0.01"
										value={formData.commission_rate}
										onChange={(e) =>
											setFormData({
												...formData,
												commission_rate: parseFloat(e.target.value) || 0,
											})
										}
										placeholder="0.00"
									/>
								</div>
								<div>
									<Label htmlFor="status">Status</Label>
									<Select
										value={formData.is_active ? "active" : "inactive"}
										onValueChange={(value) =>
											setFormData({
												...formData,
												is_active: value === "active",
											})
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="inactive">Inactive</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit">
									{editingGuide ? "Update" : "Create"} Guide
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="min-w-[120px]">Name</TableHead>
							<TableHead className="min-w-[120px] hidden sm:table-cell">
								License
							</TableHead>
							<TableHead className="min-w-[100px] hidden md:table-cell">
								Phone
							</TableHead>
							<TableHead className="min-w-[150px] hidden lg:table-cell">
								Email
							</TableHead>
							<TableHead className="min-w-[100px]">Commission %</TableHead>
							<TableHead className="min-w-[80px] hidden sm:table-cell">
								Status
							</TableHead>
							<TableHead className="min-w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{guides.map((guide) => (
							<TableRow key={guide.id}>
								<TableCell className="font-medium">{guide.name}</TableCell>
								<TableCell className="hidden sm:table-cell">
									{guide.license_number || "-"}
								</TableCell>
								<TableCell className="hidden md:table-cell">
									{guide.phone || "-"}
								</TableCell>
								<TableCell className="hidden lg:table-cell">
									{guide.email || "-"}
								</TableCell>
								<TableCell>{guide.commission_rate}%</TableCell>
								<TableCell className="hidden sm:table-cell">
									<Badge variant={guide.is_active ? "default" : "secondary"}>
										{guide.is_active ? "Active" : "Inactive"}
									</Badge>
								</TableCell>
								<TableCell>
									<div className="flex gap-1 sm:gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleEdit(guide)}
											className="p-1 sm:p-2"
										>
											<Edit className="size-3 sm:size-4" />
											<span className="sr-only">Edit</span>
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleDelete(guide.id)}
											className="p-1 sm:p-2"
										>
											<Trash2 className="size-3 sm:size-4" />
											<span className="sr-only">Delete</span>
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this guide? This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete}>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
