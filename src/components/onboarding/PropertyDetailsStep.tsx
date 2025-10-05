import { Hotel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OnboardingStepProps } from "./types";
import { PROPERTY_TYPES, PROPERTY_COUNT_OPTIONS, ROOM_COUNT_OPTIONS } from "./constants";

export function PropertyDetailsStep({ formData, setFormData }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Hotel className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-lg sm:text-2xl font-bold mb-2">
          Property Information
        </h2>
        <p className="text-muted-foreground">
          Help us understand your property setup
        </p>
      </div>

      <div>
        <Label className="text-base font-medium mb-4 block">
          What type of property do you manage? *
        </Label>
        <div className="grid md:grid-cols-2 gap-4">
          {PROPERTY_TYPES.map((type) => (
            <Button
              key={type.id}
              variant="outline"
              className={`h-auto p-4 flex flex-col items-center gap-3 text-left ${
                formData.propertyType === type.id ? "bg-primary/10 border-2 border-primary" : ""
              }`}
              onClick={() =>
                setFormData((prev) => ({ ...prev, propertyType: type.id }))
              }
            >
              <type.icon className="h-8 w-8" />
              <div className="flex flex-col items-center">
                <span className="font-medium">{type.label}</span>
                <span className="text-sm text-muted-foreground text-center">
                  {type.description}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="propertyCount">Number of Properties *</Label>
          <Select
            value={formData.propertyCount}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, propertyCount: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select number of properties" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_COUNT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="totalRooms">Total Rooms/Units *</Label>
          <Select
            value={formData.totalRooms}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, totalRooms: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select total rooms" />
            </SelectTrigger>
            <SelectContent>
              {ROOM_COUNT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Brief Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
          placeholder="Tell us about your property, target guests, special features..."
          rows={4}
        />
      </div>
    </div>
  );
}