import { Building2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { COUNTRIES } from "./constants";
import { OnboardingStepProps } from "./types";

export function CompanyInfoStep({
	formData,
	setFormData,
}: OnboardingStepProps) {
	return (
		<div className="space-y-6">
			<div className="grid md:grid-cols-2 gap-4">
				<div>
					<Label htmlFor="companyName">Company/Hotel Name *</Label>
					<Input
						id="companyName"
						value={formData.companyName}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								companyName: e.target.value,
							}))
						}
						placeholder="e.g., Oceanview Resort"
					/>
				</div>
				<div>
					<Label htmlFor="contactName">Contact Person *</Label>
					<Input
						id="contactName"
						value={formData.contactName}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								contactName: e.target.value,
							}))
						}
						placeholder="Your full name"
					/>
				</div>
			</div>

			<div className="grid md:grid-cols-2 gap-4">
				<div>
					<Label htmlFor="email">Business Email *</Label>
					<Input
						id="email"
						type="email"
						value={formData.email}
						onChange={(e) =>
							setFormData((prev) => ({ ...prev, email: e.target.value }))
						}
						placeholder="contact@yourhotel.com"
					/>
				</div>
				<div>
					<Label htmlFor="phone">Phone Number</Label>
					<PhoneInput
						id="phone"
						defaultCountry="LK"
						international
						value={formData.phone}
						onChange={(value) =>
							setFormData((prev) => ({ ...prev, phone: value || "" }))
						}
						placeholder="Enter a phone number"
					/>
				</div>
			</div>

			<div>
				<Label htmlFor="address">Business Address</Label>
				<Textarea
					id="address"
					value={formData.address}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, address: e.target.value }))
					}
					placeholder="Street address, city, state/province, country"
					rows={3}
				/>
			</div>

			<div>
				<Label htmlFor="country">Country</Label>
				<Select
					value={formData.country}
					onValueChange={(value) =>
						setFormData((prev) => ({ ...prev, country: value }))
					}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select your country" />
					</SelectTrigger>
					<SelectContent>
						{COUNTRIES.map((country) => (
							<SelectItem key={country} value={country}>
								{country}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
