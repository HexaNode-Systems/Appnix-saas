"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage, type SupportedLanguageCode } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/auth-context";
import { api } from "@/lib/api/axios";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  ArrowLeft,
  ShieldCheck,
  Pencil,
  Copy,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Key,
  Sparkles,
  Eye,
  EyeOff,
  RotateCw,
  Check,
  Loader2,
} from "lucide-react";

// ---------- Tabs ----------
const TABS = ["Personal Details", "API Details", "Beta Access"] as const;
type Tab = (typeof TABS)[number];

interface PersonalDetailsState {
  firstName: string;
  lastName: string;
  name: string;
  primaryEmail: string;
  secondaryEmail: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  language: string;
  avatar?: string;
  role: string;
  joiningDate: string;
}

interface BetaAccessItem {
  feature: string;
  description: string;
  status: string;
}

// ---------- Helper Functions ----------
function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

function formatJoiningDate(dateStr?: string): string {
  if (!dateStr) return "Mar 18th, 2026";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
        ? "rd"
        : "th";
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${month} ${day}${suffix}, ${year}`;
  } catch {
    return dateStr;
  }
}

// ---------- Page Component ----------
export default function AccountSettingsPage() {
  const { currentLanguage, setLanguage, supportedLanguages } = useLanguage();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("Personal Details");
  const [isLoading, setIsLoading] = useState(false);

  // Profile data states
  const [personalDetails, setPersonalDetails] = useState<PersonalDetailsState>({
    firstName: "",
    lastName: "",
    name: "",
    primaryEmail: "",
    secondaryEmail: "",
    phone: "",
    city: "Mumbai",
    state: "Maharashtra",
    country: "india",
    zipCode: "400001",
    language: "en",
    role: "WORKSPACE ADMIN",
    joiningDate: "Mar 18th, 2026",
  });

  // Editable form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [city, setCity] = useState("Mumbai");
  const [stateName, setStateName] = useState("Maharashtra");
  const [country, setCountry] = useState("india");
  const [zipCode, setZipCode] = useState("400001");
  const [secondaryEmail, setSecondaryEmail] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Security / Password update states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isToggling2FA, setIsToggling2FA] = useState(false);

  // API credentials states
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("https://api.appnix.io/api/v1/webhooks/workspace-production");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  // Beta access state
  const [betaAccessList, setBetaAccessList] = useState<BetaAccessItem[]>([
    {
      feature: "Voice AI Agent Studio 2.0",
      description: "Ultra-low latency conversational voice streaming engine",
      status: "Active in Beta",
    },
  ]);

  // Sync initial fields from user when auth context is ready
  useEffect(() => {
    if (user) {
      const parts = (user.name || "").trim().split(/\s+/);
      const parsedFirst = parts[0] || "";
      const parsedLast = parts.slice(1).join(" ") || "";

      setPersonalDetails((prev) => ({
        ...prev,
        firstName: parsedFirst || prev.firstName,
        lastName: parsedLast || prev.lastName,
        name: user.name || prev.name,
        primaryEmail: user.email || prev.primaryEmail,
        role: (user.role || user.rawRole || "WORKSPACE ADMIN").toUpperCase().replace(/_/g, " "),
        joiningDate: user.createdAt || prev.joiningDate,
      }));

      setFirstName((prev) => prev || parsedFirst);
      setLastName((prev) => prev || parsedLast);
    }
  }, [user]);

  // Load account settings from backend API
  const fetchAccountSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/workspace/account-settings");
      if (res.data?.success && res.data?.data) {
        const { personalDetails: p, apiDetails: a, security: s, betaAccess: b } = res.data.data;

        if (p) {
          setPersonalDetails(p);
          if (p.firstName) setFirstName(p.firstName);
          if (p.lastName) setLastName(p.lastName);
          if (p.city) setCity(p.city);
          if (p.state) setStateName(p.state);
          if (p.country) setCountry(p.country);
          if (p.zipCode) setZipCode(p.zipCode);
          if (p.secondaryEmail) setSecondaryEmail(p.secondaryEmail);
          if (p.language) {
            setSelectedLanguage(p.language);
          }
        }

        if (a) {
          if (a.apiKey) setApiKey(a.apiKey);
          if (a.webhookUrl) setWebhookUrl(a.webhookUrl);
        }

        if (s && typeof s.twoFactorEnabled === "boolean") {
          setTwoFactorEnabled(s.twoFactorEnabled);
        }

        if (b && Array.isArray(b) && b.length > 0) {
          setBetaAccessList(b);
        }
      }
    } catch (err) {
      console.warn("Could not load /workspace/account-settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccountSettings();
  }, [fetchAccountSettings]);

  // Handle Save General & Communication Details
  const handleSaveGeneralDetails = async () => {
    setIsSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const payload = {
        name: fullName || personalDetails.name,
        city,
        state: stateName,
        country,
        zipCode,
        secondaryEmail,
        language: selectedLanguage,
      };

      await api.put("/workspace/account-settings", payload);

      setPersonalDetails((prev) => ({
        ...prev,
        firstName,
        lastName,
        name: fullName || prev.name,
        city,
        state: stateName,
        country,
        zipCode,
        secondaryEmail,
        language: selectedLanguage,
      }));

      if (selectedLanguage && selectedLanguage !== currentLanguage) {
        setLanguage(selectedLanguage as SupportedLanguageCode);
      }

      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your account details have been saved successfully.",
      });

      await refreshUser();
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err?.response?.data?.message || "Failed to save account details.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Cancel Edit Info
  const handleCancelEdit = () => {
    setFirstName(personalDetails.firstName || personalDetails.name?.split(" ")[0] || "");
    setLastName(personalDetails.lastName || personalDetails.name?.split(" ").slice(1).join(" ") || "");
    setCity(personalDetails.city || "Mumbai");
    setStateName(personalDetails.state || "Maharashtra");
    setCountry(personalDetails.country || "india");
    setZipCode(personalDetails.zipCode || "400001");
    setSecondaryEmail(personalDetails.secondaryEmail || "");
    setSelectedLanguage(personalDetails.language || "en");
    setIsEditing(false);
  };

  // Handle Password Update
  const handleUpdatePassword = async () => {
    if (!oldPassword) {
      toast({
        title: "Validation Error",
        description: "Please enter your current password.",
        variant: "destructive",
      });
      return;
    }
    if (!newPassword) {
      toast({
        title: "Validation Error",
        description: "Please enter a new password.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match. Please re-enter.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      let message = "Password updated successfully!";
      try {
        const res = await api.post("/auth/change-password", {
          oldPassword,
          newPassword,
        });
        if (res.data?.message) message = res.data.message;
      } catch (authErr: any) {
        // Fallback to security controller route if auth route fails
        const res = await api.post("/settings/security/change-password", {
          oldPassword,
          newPassword,
        });
        if (res.data?.message) message = res.data.message;
      }

      toast({
        title: "Success",
        description: message,
      });

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Password Update Failed",
        description: err?.response?.data?.message || "Incorrect current password or server error.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle 2FA Toggle
  const handleToggle2FA = async () => {
    setIsToggling2FA(true);
    const nextState = !twoFactorEnabled;
    try {
      try {
        await api.put("/workspace/account-settings", { twoFactorEnabled: nextState });
      } catch {
        await api.post("/settings/security/2fa", { enabled: nextState });
      }

      setTwoFactorEnabled(nextState);
      toast({
        title: nextState ? "2FA Enabled" : "2FA Disabled",
        description: nextState
          ? "Two-Factor Authentication is now enabled on your workspace account."
          : "Two-Factor Authentication has been disabled.",
      });

      await refreshUser();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to update Two-Factor Authentication status.",
        variant: "destructive",
      });
    } finally {
      setIsToggling2FA(false);
    }
  };

  // Handle API Key Copy
  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true);
    toast({
      title: "Copied to Clipboard",
      description: "Production API Key copied successfully.",
    });
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  // Handle Webhook URL Copy
  const handleCopyWebhook = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    toast({
      title: "Copied to Clipboard",
      description: "Webhook URL copied successfully.",
    });
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  // Handle Regenerate Key
  const handleRegenerateKey = async () => {
    if (!confirmRegenerate) {
      setConfirmRegenerate(true);
      return;
    }

    setIsRegeneratingKey(true);
    try {
      const res = await api.post("/workspace/api-keys/regenerate");
      if (res.data?.apiKey) {
        setApiKey(res.data.apiKey);
      }
      setConfirmRegenerate(false);
      toast({
        title: "API Key Regenerated",
        description: "New production secret key generated. Ensure you update external integrations.",
      });
    } catch (err: any) {
      toast({
        title: "Regeneration Failed",
        description: err?.response?.data?.message || "Failed to regenerate API key.",
        variant: "destructive",
      });
    } finally {
      setIsRegeneratingKey(false);
    }
  };

  // Display values
  const displayName = personalDetails.name || user?.name || "Workspace Admin";
  const initials = getInitials(displayName, user?.email || personalDetails.primaryEmail);
  const roleDisplay = (personalDetails.role || user?.role || user?.rawRole || "WORKSPACE ADMIN")
    .toUpperCase()
    .replace(/_/g, " ");
  const activePrimaryEmail = user?.email || personalDetails.primaryEmail || "";
  const joinedDateFormatted = formatJoiningDate(user?.createdAt || personalDetails.joiningDate);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          href="/workspace"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Workspace</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-primary">Account Settings</span>
      </nav>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex items-center gap-8">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors cursor-pointer",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "Personal Details" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Avatar card */}
            <div className="rounded-xl border bg-card p-6 text-center shadow-xs">
              <div className="relative mx-auto w-fit">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground select-none">
                  {initials}
                </div>
                <button
                  type="button"
                  aria-label="Change photo"
                  onClick={() =>
                    toast({
                      title: "Profile Avatar",
                      description: "Custom photo upload will be available in an upcoming update.",
                    })
                  }
                  className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <h2 className="mt-4 text-lg font-bold text-foreground">{displayName}</h2>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                {roleDisplay}
              </p>
            </div>

            {/* 2FA card */}
            <div className="space-y-3 rounded-xl border bg-card p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Two Factor Authentication
                </h3>
                <Badge
                  className={cn(
                    "rounded-md px-1.5 py-0 text-[10px] font-bold text-white",
                    twoFactorEnabled
                      ? "bg-emerald-600 hover:bg-emerald-600"
                      : "bg-amber-600 hover:bg-amber-600"
                  )}
                >
                  {twoFactorEnabled ? "ACTIVE" : "NEW"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {twoFactorEnabled
                  ? "Two-factor authentication is active on your workspace account."
                  : "Secure your workspace logins with an authenticator app."}
              </p>
              <Button
                type="button"
                onClick={handleToggle2FA}
                disabled={isToggling2FA}
                variant={twoFactorEnabled ? "outline" : "default"}
                className={cn(
                  "w-full justify-center gap-2 font-medium cursor-pointer",
                  !twoFactorEnabled && "bg-primary text-primary-foreground"
                )}
              >
                {isToggling2FA ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {isToggling2FA
                  ? "Updating..."
                  : twoFactorEnabled
                  ? "Disable 2FA"
                  : "Enable 2FA"}
              </Button>
            </div>

            {/* Security card */}
            <div className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
              <h3 className="text-sm font-bold text-foreground">Security</h3>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Old Password<span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  New Password<span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Confirm Password<span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                />
              </div>

              <Button
                type="button"
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword}
                className="w-full justify-center bg-primary text-primary-foreground font-semibold cursor-pointer gap-2"
              >
                {isUpdatingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isUpdatingPassword ? "Updating Password..." : "Update Password"}
              </Button>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* General Details */}
            <div className="rounded-xl border bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  General Details
                </h3>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Info
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="h-8 px-3 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveGeneralDetails}
                      disabled={isSaving}
                      className="h-8 px-3 text-xs bg-primary text-primary-foreground font-semibold gap-1.5"
                    >
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="First Name">
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="First Name"
                  />
                </Field>
                <Field label="Last Name">
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Last Name"
                  />
                </Field>

                <Field label="Language">
                  <Select
                    value={selectedLanguage}
                    onValueChange={(val) => {
                      setSelectedLanguage(val);
                      if (!isEditing) {
                        setLanguage(val as SupportedLanguageCode);
                      }
                    }}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedLanguages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.nativeName} ({lang.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="City">
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!isEditing}
                    placeholder="City"
                  />
                </Field>

                <Field label="State">
                  <Input
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="State"
                  />
                </Field>

                <Field label="Country">
                  <Select
                    value={country}
                    onValueChange={(val) => setCountry(val)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="india">India</SelectItem>
                      <SelectItem value="usa">United States</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="uae">United Arab Emirates</SelectItem>
                      <SelectItem value="canada">Canada</SelectItem>
                      <SelectItem value="australia">Australia</SelectItem>
                      <SelectItem value="singapore">Singapore</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Zip Code">
                  <Input
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Zip / Postal Code"
                  />
                </Field>
              </div>
            </div>

            {/* Communication Details */}
            <div className="rounded-xl border bg-card p-6 shadow-xs">
              <h3 className="text-base font-bold text-foreground">
                Communication Details
              </h3>

              <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Secondary Email Address">
                  <Input
                    value={secondaryEmail}
                    onChange={(e) => setSecondaryEmail(e.target.value)}
                    disabled={!isEditing}
                    placeholder="e.g. secondary@domain.com"
                    className="text-foreground"
                  />
                </Field>

                <Field label="Primary Email Address">
                  <div className="relative">
                    <Input
                      value={activePrimaryEmail}
                      disabled
                      readOnly
                      className="pr-9 text-foreground"
                    />
                    <button
                      type="button"
                      aria-label="Copy email"
                      onClick={() => {
                        if (!activePrimaryEmail) return;
                        navigator.clipboard.writeText(activePrimaryEmail);
                        toast({
                          title: "Copied to Clipboard",
                          description: "Primary email copied to clipboard.",
                        });
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </Field>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Calendar className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Joining Date
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {joinedDateFormatted}
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "API Details" && (
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-foreground">API Credentials & Webhooks</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Use your API secret keys to authenticate requests from your custom services and webhooks.
              </p>
            </div>
            {confirmRegenerate ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRegenerate(false)}
                  disabled={isRegeneratingKey}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRegenerateKey}
                  disabled={isRegeneratingKey}
                  className="h-8 text-xs gap-1.5"
                >
                  {isRegeneratingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {isRegeneratingKey ? "Regenerating..." : "Confirm Regenerate"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmRegenerate(true)}
                className="shrink-0 gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Regenerate Key
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Production Secret API Key
            </label>
            <div className="flex items-center gap-2 max-w-lg">
              <Input
                type={showApiKey ? "text" : "password"}
                value={apiKey || (isLoading ? "Loading API key..." : "appnix_live_sk_...")}
                readOnly
                className="font-mono text-xs bg-muted/30"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
                className="shrink-0 cursor-pointer"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyKey}
                className="shrink-0 text-xs gap-1 cursor-pointer"
              >
                {apiKeyCopied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {apiKeyCopied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-muted/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Key className="h-4 w-4 text-primary" /> Webhook Endpoint
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyWebhook}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {webhookCopied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {webhookCopied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-muted-foreground font-mono break-all">
              {webhookUrl}
            </p>
          </div>
        </div>
      )}

      {activeTab === "Beta Access" && (
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-bold text-foreground">Beta Feature Previews</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Get early access to upcoming AI Voice Agents, Autonomous Multimodal Chatbots, and Advanced Workflow Datastores.
          </p>
          {betaAccessList.map((item, idx) => (
            <div
              key={idx}
              className="p-4 border rounded-lg bg-muted/20 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-sm text-foreground">{item.feature}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Badge className="bg-emerald-600 text-white shrink-0">{item.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Small helper ----------
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
