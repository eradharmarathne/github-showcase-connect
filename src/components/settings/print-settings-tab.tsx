import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePrintSettings } from "@/hooks/use-print-settings";
import { Loader2, Printer, Upload } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function PrintSettingsTab() {
	const { printSettings, saveSettings, isSubmitting, isLoading } = usePrintSettings();
	const { tenant, refetch: refreshTenant } = useTenant();
	const { toast } = useToast();
	
	const [formData, setFormData] = useState({
		show_logo: true,
		logo_position: "left" as "left" | "center" | "right",
		header_text: "",
		show_hotel_info: true,
		show_qr_code: false,
		qr_code_content: "reservation_number",
		show_terms_and_conditions: true,
		terms_and_conditions: "",
		footer_text: "",
		show_signature_line: true,
		signature_label: "Authorized Signature",
		primary_color: "#000000",
		font_family: "Arial, sans-serif",
		font_size: "medium" as "small" | "medium" | "large",
		paper_size: "A4" as "A4" | "Letter" | "A5",
		show_border: false,
		custom_css: "",
	});

	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [uploadingLogo, setUploadingLogo] = useState(false);

	useEffect(() => {
		if (printSettings) {
			setFormData({
				show_logo: printSettings.show_logo ?? true,
				logo_position: (printSettings.logo_position as "left" | "center" | "right") ?? "left",
				header_text: printSettings.header_text ?? "",
				show_hotel_info: printSettings.show_hotel_info ?? true,
				show_qr_code: printSettings.show_qr_code ?? false,
				qr_code_content: printSettings.qr_code_content ?? "reservation_number",
				show_terms_and_conditions: printSettings.show_terms_and_conditions ?? true,
				terms_and_conditions: printSettings.terms_and_conditions ?? "",
				footer_text: printSettings.footer_text ?? "",
				show_signature_line: printSettings.show_signature_line ?? true,
				signature_label: printSettings.signature_label ?? "Authorized Signature",
				primary_color: printSettings.primary_color ?? "#000000",
				font_family: printSettings.font_family ?? "Arial, sans-serif",
				font_size: (printSettings.font_size as "small" | "medium" | "large") ?? "medium",
				paper_size: (printSettings.paper_size as "A4" | "Letter" | "A5") ?? "A4",
				show_border: printSettings.show_border ?? false,
				custom_css: printSettings.custom_css ?? "",
			});
		}
	}, [printSettings]);

	const handleLogoUpload = async () => {
		if (!logoFile || !tenant?.id) return;

		setUploadingLogo(true);
		try {
			const fileExt = logoFile.name.split(".").pop();
			const fileName = `${tenant.id}/logo.${fileExt}`;
			const filePath = `logos/${fileName}`;

			const { error: uploadError } = await supabase.storage
				.from("tenant-assets")
				.upload(filePath, logoFile, { upsert: true });

			if (uploadError) throw uploadError;

			const { data: { publicUrl } } = supabase.storage
				.from("tenant-assets")
				.getPublicUrl(filePath);

			// Update tenant logo_url
			const { error: updateError } = await supabase
				.from("tenants")
				.update({ logo_url: publicUrl })
				.eq("id", tenant.id);

			if (updateError) throw updateError;

			// Refresh tenant data to get the new logo URL
			await refreshTenant();

			toast({
				title: "Success",
				description: "Logo uploaded successfully",
			});

			setLogoFile(null);
		} catch (error) {
			console.error("Error uploading logo:", error);
			toast({
				title: "Error",
				description: "Failed to upload logo",
				variant: "destructive",
			});
		} finally {
			setUploadingLogo(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await saveSettings(formData);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Printer className="h-5 w-5" />
						Print Template Settings
					</CardTitle>
					<CardDescription>
						Customize how your printed documents (invoices, reservations, receipts) appear
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="header" className="w-full">
						<TabsList className="grid w-full grid-cols-4">
							<TabsTrigger value="header">Header</TabsTrigger>
							<TabsTrigger value="content">Content</TabsTrigger>
							<TabsTrigger value="footer">Footer</TabsTrigger>
							<TabsTrigger value="styling">Styling</TabsTrigger>
						</TabsList>

						{/* Header Tab */}
						<TabsContent value="header" className="space-y-4 mt-4">
							<div className="space-y-4">
								{/* Logo Upload */}
								<div className="space-y-2">
									<Label>Business Logo</Label>
									<div className="flex items-center gap-4">
										{tenant?.logo_url && (
											<img 
												src={tenant.logo_url} 
												alt="Current logo" 
												className="h-16 w-auto object-contain border rounded p-2"
											/>
										)}
										<div className="flex-1">
											<Input
												type="file"
												accept="image/*"
												onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
											/>
										</div>
										<Button
											type="button"
											onClick={handleLogoUpload}
											disabled={!logoFile || uploadingLogo}
											variant="outline"
										>
											{uploadingLogo ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<Upload className="h-4 w-4" />
											)}
											Upload
										</Button>
									</div>
								</div>

								{/* Show Logo Toggle */}
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Show Logo on Prints</Label>
										<p className="text-sm text-muted-foreground">
											Display your business logo on printed documents
										</p>
									</div>
									<Switch
										checked={formData.show_logo}
										onCheckedChange={(checked) =>
											setFormData({ ...formData, show_logo: checked })
										}
									/>
								</div>

							{/* Logo Position */}
							<div className="space-y-2">
								<Label>Logo Position</Label>
								<Select
									value={formData.logo_position}
									onValueChange={(value: string) =>
										setFormData({ ...formData, logo_position: value as "left" | "center" | "right" })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="left">Left</SelectItem>
										<SelectItem value="center">Center</SelectItem>
										<SelectItem value="right">Right</SelectItem>
									</SelectContent>
								</Select>
							</div>								{/* Header Text */}
								<div className="space-y-2">
									<Label>Header Text</Label>
									<Input
										placeholder="e.g., Tax Invoice, Official Receipt"
										value={formData.header_text}
										onChange={(e) =>
											setFormData({ ...formData, header_text: e.target.value })
										}
									/>
								</div>

								{/* Show Hotel Info */}
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Show Hotel Information</Label>
										<p className="text-sm text-muted-foreground">
											Display hotel name, address, phone, email on prints
										</p>
									</div>
									<Switch
										checked={formData.show_hotel_info}
										onCheckedChange={(checked) =>
											setFormData({ ...formData, show_hotel_info: checked })
										}
									/>
								</div>
							</div>
						</TabsContent>

						{/* Content Tab */}
						<TabsContent value="content" className="space-y-4 mt-4">
							<div className="space-y-4">
								{/* Show QR Code */}
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Show QR Code</Label>
										<p className="text-sm text-muted-foreground">
											Add a QR code to printed documents for easy scanning
										</p>
									</div>
									<Switch
										checked={formData.show_qr_code}
										onCheckedChange={(checked) =>
											setFormData({ ...formData, show_qr_code: checked })
										}
									/>
								</div>

								{/* QR Code Content */}
								{formData.show_qr_code && (
									<div className="space-y-2">
										<Label>QR Code Content</Label>
										<Select
											value={formData.qr_code_content}
											onValueChange={(value: string) =>
												setFormData({ ...formData, qr_code_content: value })
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="reservation_number">Reservation Number</SelectItem>
												<SelectItem value="hotel_website">Hotel Website</SelectItem>
												<SelectItem value="hotel_email">Hotel Email</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}

								{/* Show Terms and Conditions */}
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Show Terms & Conditions</Label>
										<p className="text-sm text-muted-foreground">
											Display terms and conditions at the bottom
										</p>
									</div>
									<Switch
										checked={formData.show_terms_and_conditions}
										onCheckedChange={(checked) =>
											setFormData({ ...formData, show_terms_and_conditions: checked })
										}
									/>
								</div>

								{/* Terms and Conditions Text */}
								{formData.show_terms_and_conditions && (
									<div className="space-y-2">
										<Label>Terms & Conditions</Label>
										<Textarea
											placeholder="Enter your terms and conditions here..."
											value={formData.terms_and_conditions}
											onChange={(e) =>
												setFormData({ ...formData, terms_and_conditions: e.target.value })
											}
											rows={5}
										/>
									</div>
								)}
							</div>
						</TabsContent>

						{/* Footer Tab */}
						<TabsContent value="footer" className="space-y-4 mt-4">
							<div className="space-y-4">
								{/* Footer Text */}
								<div className="space-y-2">
									<Label>Footer Text</Label>
									<Input
										placeholder="e.g., Thank you for your business!"
										value={formData.footer_text}
										onChange={(e) =>
											setFormData({ ...formData, footer_text: e.target.value })
										}
									/>
								</div>

								{/* Show Signature Line */}
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Show Signature Line</Label>
										<p className="text-sm text-muted-foreground">
											Add a signature line at the bottom
										</p>
									</div>
									<Switch
										checked={formData.show_signature_line}
										onCheckedChange={(checked) =>
											setFormData({ ...formData, show_signature_line: checked })
										}
									/>
								</div>

								{/* Signature Label */}
								{formData.show_signature_line && (
									<div className="space-y-2">
										<Label>Signature Label</Label>
										<Input
											placeholder="e.g., Authorized Signature"
											value={formData.signature_label}
											onChange={(e) =>
												setFormData({ ...formData, signature_label: e.target.value })
											}
										/>
									</div>
								)}
							</div>
						</TabsContent>

						{/* Styling Tab */}
						<TabsContent value="styling" className="space-y-4 mt-4">
							<div className="space-y-4">
								{/* Primary Color */}
								<div className="space-y-2">
									<Label>Primary Color</Label>
									<div className="flex gap-2">
										<Input
											type="color"
											value={formData.primary_color}
											onChange={(e) =>
												setFormData({ ...formData, primary_color: e.target.value })
											}
											className="w-20 h-10"
										/>
										<Input
											type="text"
											value={formData.primary_color}
											onChange={(e) =>
												setFormData({ ...formData, primary_color: e.target.value })
											}
											placeholder="#000000"
										/>
									</div>
								</div>

								{/* Font Family */}
								<div className="space-y-2">
									<Label>Font Family</Label>
									<Select
										value={formData.font_family}
										onValueChange={(value: string) =>
											setFormData({ ...formData, font_family: value })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Arial, sans-serif">Arial</SelectItem>
											<SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
											<SelectItem value="'Courier New', monospace">Courier New</SelectItem>
											<SelectItem value="Georgia, serif">Georgia</SelectItem>
											<SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{/* Font Size */}
								<div className="space-y-2">
									<Label>Font Size</Label>
									<Select
										value={formData.font_size}
										onValueChange={(value: string) =>
											setFormData({ ...formData, font_size: value as "small" | "medium" | "large" })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="small">Small</SelectItem>
											<SelectItem value="medium">Medium</SelectItem>
											<SelectItem value="large">Large</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{/* Paper Size */}
								<div className="space-y-2">
									<Label>Paper Size</Label>
									<Select
										value={formData.paper_size}
										onValueChange={(value: string) =>
											setFormData({ ...formData, paper_size: value as "A4" | "Letter" | "A5" })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
											<SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
											<SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{/* Show Border */}
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Show Border</Label>
										<p className="text-sm text-muted-foreground">
											Add a border around the printed document
										</p>
									</div>
									<Switch
										checked={formData.show_border}
										onCheckedChange={(checked) =>
											setFormData({ ...formData, show_border: checked })
										}
									/>
								</div>

								{/* Custom CSS */}
								<div className="space-y-2">
									<Label>Custom CSS (Advanced)</Label>
									<Textarea
										placeholder="Add custom CSS styles here..."
										value={formData.custom_css}
										onChange={(e) =>
											setFormData({ ...formData, custom_css: e.target.value })
										}
										rows={5}
										className="font-mono text-sm"
									/>
									<p className="text-xs text-muted-foreground">
										For advanced users: Add custom CSS to further customize print templates
									</p>
								</div>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			<div className="flex justify-end">
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Save Print Settings
				</Button>
			</div>
		</form>
	);
}
