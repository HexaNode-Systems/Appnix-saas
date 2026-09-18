"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/landing/language-selector";
import { config } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Lock,
  Building,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  BarChart3,
} from "lucide-react";

const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    workspaceName: z
      .string()
      .min(2, "Workspace name must be at least 2 characters"),
    termsAccepted: z
      .boolean()
      .refine(
        (val) => val === true,
        "You must accept the terms and conditions",
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      termsAccepted: false,
    },
  });

  const password = watch("password");

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd?.length >= 8) strength++;
    if (/[A-Z]/.test(pwd || "")) strength++;
    if (/[a-z]/.test(pwd || "")) strength++;
    if (/[0-9]/.test(pwd || "")) strength++;
    if (/[^A-Za-z0-9]/.test(pwd || "")) strength++;
    return strength;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = [
    "bg-red-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500",
  ];

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      await signup({
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        workspaceName: data.workspaceName,
        termsAccepted: data.termsAccepted,
      });
      toast({
        title: "Account created!",
        description: "Welcome aboard. Let's get you started.",
        variant: "success",
      });
      // Direct client portal registration lands on /dashboard
      const destination = callbackUrl && callbackUrl !== "/subscription" ? callbackUrl : "/dashboard";
      router.push(destination);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed";
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell lg:p-8 relative">
      {/* Top right language selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col lg:flex-row">
        {/* ================= LEFT PANEL (Branding) ================= */}
        <div className="relative flex flex-col justify-between bg-primary p-8 sm:p-10 lg:w-[45%] lg:p-12">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-md border border-white/15">
              <Image
                src="/logo-favicon.png"
                alt="Appnix Logo"
                width={28}
                height={28}
                className="object-contain"
              />
              <span className="text-sm font-bold text-white tracking-tight">Appnix Platform</span>
            </Link>

            <h1 className="mt-8 text-3xl font-bold leading-tight text-white sm:text-4xl">
              Unify your business messaging & scale growth.
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-blue-100/90 sm:text-base">
              Appnix provides an integrated SaaS platform to orchestrate WhatsApp Cloud API, Instagram Direct, RCS, and CRM workflows.
            </p>
          </div>

          <div className="relative mt-10 hidden overflow-hidden rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md lg:block">
            <div className="flex items-center gap-2 text-blue-200">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium text-white">Platform Capabilities</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-white/10 p-3 border border-white/5">
                <div className="text-base font-bold text-white">Multi-Channel</div>
                <div className="text-[10px] text-blue-200">Supported Integrations</div>
              </div>
              <div className="rounded-lg bg-white/10 p-3 border border-white/5">
                <div className="text-base font-bold text-white">Isolated</div>
                <div className="text-[10px] text-blue-200">Tenant Architecture</div>
              </div>
              <div className="rounded-lg bg-white/10 p-3 border border-white/5 flex items-end gap-1">
                <div className="h-4 w-1.5 rounded-full bg-blue-300/60" />
                <div className="h-6 w-1.5 rounded-full bg-blue-300/80" />
                <div className="h-3 w-1.5 rounded-full bg-blue-300/50" />
                <div className="h-8 w-1.5 rounded-full bg-blue-300" />
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANEL (Form) ================= */}
        <div className="flex-1 p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {t.auth.createAccount}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {t.auth.signUpSubtitle}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name">{t.auth.fullName}</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Sam Sharma"
                    className="pl-10"
                    {...register("name")}
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Business Email */}
              <div className="space-y-2">
                <Label htmlFor="email">{t.auth.email}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    className="pl-10"
                    {...register("email")}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Workspace Name */}
              <div className="space-y-2">
                <Label htmlFor="workspaceName">{t.auth.workspaceName}</Label>
                <div className="relative">
                  <Building className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="workspaceName"
                    type="text"
                    placeholder="Acme Inc."
                    className="pl-10"
                    {...register("workspaceName")}
                    disabled={isLoading}
                  />
                </div>
                {errors.workspaceName && (
                  <p className="text-sm text-red-600">
                    {errors.workspaceName.message}
                  </p>
                )}
              </div>

              {/* Password + Confirm Password */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">{t.auth.password}</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10"
                      {...register("password")}
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      className="pl-10"
                      {...register("confirmPassword")}
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password strength meter */}
              {password && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strengthColors[strength - 1] || "bg-red-500"
                      }`}
                      style={{ width: `${(strength / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Strength: {strengthLabels[strength - 1] || "Very Weak"}
                  </p>
                </div>
              )}

              {/* Terms checkbox */}
              <div className="flex items-start gap-2 pt-1">
                <Controller
                  name="termsAccepted"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="termsAccepted"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-0.5"
                      disabled={isLoading}
                    />
                  )}
                />
                <Label
                  htmlFor="termsAccepted"
                  className="text-sm font-normal leading-snug text-slate-600"
                >
                  I agree to the{" "}
                  <Link href="/terms-and-conditions" target="_blank" className="text-primary hover:underline font-medium">
                    Terms &amp; Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy-policy" target="_blank" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.termsAccepted && (
                <p className="text-sm text-red-600">
                  {errors.termsAccepted.message}
                </p>
              )}

              {/* Submit button */}
              <Button type="submit" disabled={isLoading} className="w-full h-11 font-semibold cursor-pointer">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.auth.creatingAccount}
                  </>
                ) : (
                  <>
                    {t.auth.signUpButton}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400 uppercase">
                {t.auth.orContinueWith}
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Social button */}
            <div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 text-sm font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all duration-150 flex items-center justify-center cursor-pointer"
                onClick={() => {
                  const baseGoogleUrl = config.auth.googleOAuthUrl || "/api/proxy/auth/google";
                  try {
                    const url = new URL(baseGoogleUrl, window.location.origin);
                    url.searchParams.set("origin", window.location.origin);
                    window.location.href = url.toString();
                  } catch {
                    window.location.href = baseGoogleUrl;
                  }
                }}
                disabled={isLoading}
              >
                <svg className="mr-3 h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {t.auth.signInWithGoogle}
              </Button>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              {t.auth.alreadyHaveAccount}{" "}
              <Link href="/signin" className="auth-link font-semibold text-primary">
                {t.auth.signInButton}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
