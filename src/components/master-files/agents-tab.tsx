import { Edit, Plus, Trash2, Users } from "lucide-react";
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
import { usePermissions } from "@/hooks/use-permissions";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Agent = {
	id: string;
	name: string;
	phone?: string;
	email?: string;
	agency_name?: string;
	commission_rate: number;
	is_active: boolean;
	created_at: string;
};

export default function AgentsTab() {
	const [agents, setAgents] = useState<Agent[]>([]);
	const [loading, setLoading] = useState(true);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		phone: "",
		email: "",
		agency_name: "",
		commission_rate: 0,
		is_active: true,
	});
	const { toast } = useToast();
	const { tenant } = useTenant();
	const { hasPermission } = usePermissions();

	const fetchAgents = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			const { data, error } = await supabase
				.from("agents")
				.select("*")
				.eq("tenant_id", tenant.id)
				.order("created_at", { ascending: false });

			if (error) throw error;
			setAgents(data || []);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch agents",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, toast]);

	useEffect(() => {
		fetchAgents();
	}, [fetchAgents]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		// Check permission before allowing edit/create
		if (!hasPermission("access_master_files")) {
			toast({
				title: "Error",
				description: "You don't have permission to manage agents",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			if (editingAgent) {
				const { error } = await supabase
					.from("agents")
					.update(formData)
					.eq("id", editingAgent.id);

				if (error) throw error;

				toast({
					title: "Success",
					description: "Agent updated successfully",
				});
			} else {
				if (!tenant?.id) {
					throw new Error("No tenant selected");
				}

				const { error } = await supabase.from("agents").insert([
					{
						...formData,
						tenant_id: tenant.id,
					},
				]);

				if (error) throw error;

				toast({
					title: "Success",
					description: "Agent created successfully",
				});
			}

			setIsDialogOpen(false);
			setEditingAgent(null);
			resetForm();
			fetchAgents();
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to save agent",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetForm = () => {
		setFormData({
			name: "",
			phone: "",
			email: "",
			agency_name: "",
			commission_rate: 0,
			is_active: true,
		});
	};

	const handleEdit = (agent: Agent) => {
		setEditingAgent(agent);
		setFormData({
			name: agent.name,
			phone: agent.phone || "",
			email: agent.email || "",
			agency_name: agent.agency_name || "",
			commission_rate: agent.commission_rate,
			is_active: agent.is_active,
		});
		setIsDialogOpen(true);
	};

	const handleDelete = (id: string) => {
		setAgentToDelete(id);
		setDeleteConfirmOpen(true);
	};

	const confirmDelete = async () => {
		if (!agentToDelete || isDeleting) return;

		// Check permission before allowing delete
		if (!hasPermission("access_master_files")) {
			toast({
				title: "Error",
				description: "You don't have permission to delete agents",
				variant: "destructive",
			});
			setDeleteConfirmOpen(false);
			setAgentToDelete(null);
			return;
		}

		setIsDeleting(true);

		try {
			const { error } = await supabase
				.from("agents")
				.delete()
				.eq("id", agentToDelete);

			if (error) throw error;

			toast({
				title: "Success",
				description: "Agent deleted successfully",
			});
			fetchAgents();
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete agent",
				variant: "destructive",
			});
		} finally {
			setDeleteConfirmOpen(false);
			setAgentToDelete(null);
			setIsDeleting(false);
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
						<Users className="size-6" />
						Travel Agents
					</h2>
					<p className="text-muted-foreground">
						Manage travel agents and their commission rates
					</p>
				</div>
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button
							onClick={() => {
								setEditingAgent(null);
								resetForm();
							}}
						>
							<Plus className="size-4 mr-2" />
							Add Agent
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>
								{editingAgent ? "Edit Agent" : "Add New Agent"}
							</DialogTitle>
							<DialogDescription>
								{editingAgent
									? "Update the agent details below."
									: "Enter the details for the new agent."}
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="name">Agent Name</Label>
									<Input
										id="name"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										placeholder="Agent's full name"
										required
									/>
								</div>
								<div>
									<Label htmlFor="agency_name">Agency Name</Label>
									<Input
										id="agency_name"
										value={formData.agency_name}
										onChange={(e) =>
											setFormData({ ...formData, agency_name: e.target.value })
										}
										placeholder="Travel agency name"
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
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting
										? editingAgent
											? "Updating..."
											: "Creating..."
										: editingAgent
											? "Update"
											: "Create"}{" "}
									Agent
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
								Agency
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
						{agents.map((agent) => (
							<TableRow key={agent.id}>
								<TableCell className="font-medium">{agent.name}</TableCell>
								<TableCell className="hidden sm:table-cell">
									{agent.agency_name || "-"}
								</TableCell>
								<TableCell className="hidden md:table-cell">
									{agent.phone || "-"}
								</TableCell>
								<TableCell className="hidden lg:table-cell">
									{agent.email || "-"}
								</TableCell>
								<TableCell>{agent.commission_rate}%</TableCell>
								<TableCell className="hidden sm:table-cell">
									<Badge variant={agent.is_active ? "default" : "secondary"}>
										{agent.is_active ? "Active" : "Inactive"}
									</Badge>
								</TableCell>
								<TableCell>
									<div className="flex gap-1 sm:gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleEdit(agent)}
											className="p-1 sm:p-2"
										>
											<Edit className="size-3 sm:size-4" />
											<span className="sr-only">Edit</span>
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleDelete(agent.id)}
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
							Are you sure you want to delete this agent? This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
							{isDeleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
