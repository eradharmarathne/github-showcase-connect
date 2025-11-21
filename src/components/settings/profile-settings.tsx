import { CheckCircle2, Edit, Phone, Save, User, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { useProfile } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PhoneVerification } from "../auth/phone-verification";

export function ProfileSettings() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const {
    profile,
    loading: profileLoading,
    refetch: refetchProfile,
  } = useProfile();

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [originalPhone, setOriginalPhone] = useState("");
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  // Profile management functions
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });
      setOriginalPhone(profile.phone || "");
    }
  }, [profile]);

  const handleProfileEdit = () => {
    setIsEditingProfile(true);
  };

  const handleProfileSave = async () => {
    try {
      const phoneChanged = profileForm.phone !== originalPhone;
      const updateData: any = {
        name: profileForm.name,
        phone: profileForm.phone,
      };

      // If phone number changed, reset verification status
      if (phoneChanged) {
        updateData.is_phone_verified = false;
        updateData.verification_code = null;
        updateData.verification_code_expires = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profile?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: phoneChanged
          ? "Profile updated successfully. Please verify your new phone number."
          : "Profile updated successfully",
      });

      setIsEditingProfile(false);
      setOriginalPhone(profileForm.phone);
      refetchProfile();

      // Show phone verification if phone was changed
      if (phoneChanged && profileForm.phone) {
        setShowPhoneVerification(true);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleProfileCancel = () => {
    if (profile) {
      setProfileForm({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });
      setOriginalPhone(profile.phone || "");
    }
    setIsEditingProfile(false);
  };

  const handlePhoneVerificationClick = () => {
    setShowPhoneVerification(true);
  };

  const handlePhoneVerificationSuccess = () => {
    setShowPhoneVerification(false);
    refetchProfile();
    toast({
      title: "Success",
      description: "Phone number verified successfully",
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("settings.profileSettings")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("settings.name")}</Label>
                <Input
                  id="name"
                  type="text"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                  disabled={!isEditingProfile}
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("settings.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  disabled={true}
                  placeholder="Your email address"
                  className="bg-gray-50"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  {t("settings.phone")}
                  {profile?.is_phone_verified ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </Label>
                <PhoneInput
                  placeholder="Enter your phone number"
                  value={profileForm.phone}
                  onChange={(value) =>
                    setProfileForm({ ...profileForm, phone: value || "" })
                  }
                  disabled={!isEditingProfile}
                />
                {profile?.phone && !profile?.is_phone_verified && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-orange-600">
                      Phone not verified
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handlePhoneVerificationClick}
                      className="text-xs p-0 h-auto"
                    >
                      Verify Now
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!isEditingProfile ? (
                <Button onClick={handleProfileEdit} variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button onClick={handleProfileSave} disabled={profileLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {t("settings.save")}
                  </Button>
                  <Button
                    onClick={handleProfileCancel}
                    variant="outline"
                    disabled={profileLoading}
                  >
                    {t("settings.cancel")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone Verification Section */}
      {profile?.phone && !profile?.is_phone_verified && (
        <div className="mt-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-orange-600" />
                <div>
                  <h3 className="font-medium text-orange-900">
                    Phone Verification Required
                  </h3>
                  <p className="text-sm text-orange-700">
                    Your phone number is not verified. Please verify to receive
                    SMS notifications.
                  </p>
                </div>
                <Button
                  onClick={handlePhoneVerificationClick}
                  variant="outline"
                  size="sm"
                  className="ml-auto border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  Verify Phone
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Phone Verification Dialog */}
      <Dialog
        open={showPhoneVerification}
        onOpenChange={setShowPhoneVerification}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Verify Phone Number
            </DialogTitle>
            <DialogDescription>
              Enter the verification code sent to your phone number to complete
              verification.
            </DialogDescription>
          </DialogHeader>
          <PhoneVerification
            phone={profile?.phone}
            isVerified={profile?.is_phone_verified || false}
            onVerificationSuccess={handlePhoneVerificationSuccess}
            showAsCard={false}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
