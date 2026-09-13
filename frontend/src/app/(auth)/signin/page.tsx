"use client";

import { useState, useEffect, Suspense } from "react";
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
import { verifySubscriptionStatus, hasActiveSubscription } from "@/lib/subscription";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/landing/language-selector";
import { config } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type SignInFormData = z.infer<typeof signInSchema>;

function GoogleIcon() {
  return (
    <svg
      className="h-5 w-5 mr-3 shrink-0"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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
  );
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl = rawCallbackUrl && !rawCallbackUrl.includes("/subscription") ? rawCallbackUrl : "/dashboard";

  // If already authenticated, redirect active subscriptions to dashboard, otherwise to subscription
  useEffect(() => {
    const isSwitch = searchParams.get("switch") === "true";
    if (isSwitch) return;

    if (!isAuthLoading && isAuthenticated && user) {
      if (user.role === "owner" || (user as any).role === "SUPER_ADMIN") {
        router.replace("/super-admin/dashboard");
        return;
      }
      if (
        user.role === "admin" ||
        (user as any).role === "RESELLER_ADMIN" ||
        (user as any).tier === "PRIMARY_RESELLER"
      ) {
        router.replace("/admin/dashboard");
        return;
      }
      hasActiveSubscription(user.workspaceId).then((active) => {
        if (active) {
          router.replace(callbackUrl);
        } else {
          router.replace("/subscription");
        }
      });
    }
  }, [isAuthLoading, isAuthenticated, user, router, callbackUrl, searchParams]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password, data.rememberMe);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
        variant: "success",
      });

      // Check workspace subscription status immediately after successful login
      const storedUser = typeof window !== "undefined" ? localStorage.getItem("appnix_user") : null;
      let parsedUser: any = null;
      try {
        parsedUser = storedUser ? JSON.parse(storedUser) : null;
      } catch {}

      if (parsedUser?.role === "owner" || parsedUser?.role === "SUPER_ADMIN") {
        router.push("/super-admin/dashboard");
      } else if (
        parsedUser?.role === "admin" ||
        parsedUser?.role === "RESELLER_ADMIN" ||
        parsedUser?.tier === "PRIMARY_RESELLER"
      ) {
        router.push("/admin/dashboard");
      } else {
        const workspaceId = parsedUser?.workspaceId || parsedUser?.tenantId;
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("appnix_auth_token") || localStorage.getItem("token") || undefined
            : undefined;

        const active = await hasActiveSubscription(workspaceId, token);

        // Active subscription: go directly to dashboard on every login.
        // Inactive / expired / cancelled / suspended: show subscription page.
        if (active) {
          router.push(callbackUrl);
        } else {
          router.push("/subscription");
        }
      }
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid email or password";
      toast({
        title: "Sign in failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    const baseGoogleUrl = config.auth.googleOAuthUrl || "/api/proxy/auth/google";
    try {
      const url = new URL(baseGoogleUrl, window.location.origin);
      url.searchParams.set("origin", window.location.origin);
      window.location.href = url.toString();
    } catch {
      window.location.href = baseGoogleUrl;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gradient-to-b from-slate-50 via-slate-50/80 to-blue-50/40 p-4 sm:p-6 lg:p-8 relative">
      {/* Top right language selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      {/* Background ambient lighting effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-[400px] h-[300px] bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[440px] space-y-6">
        {/* ================= LOGO + BRAND HEADER ================= */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link
            href="/"
            className="group flex items-center justify-center p-2 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 hover:ring-primary/40 transition-all duration-200"
          >
            <Image
              src="/logo-favicon.png"
              alt="Appnix Logo"
              width={40}
              height={40}
              className="object-contain transition-transform group-hover:scale-105"
              priority
            />
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t.auth.welcomeBack}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {t.auth.signInSubtitle}
            </p>
          </div>
        </div>

        {/* ================= FORM CARD ================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
          {/* Google Sign-in Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            className="w-full h-11 text-sm font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all duration-150 flex items-center justify-center"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon />
                <span>{t.auth.signInWithGoogle}</span>
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {t.auth.orContinueWith}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold text-slate-700 uppercase tracking-wide"
              >
                {t.auth.email}
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white text-sm transition-colors"
                  {...register("email")}
                  disabled={isLoading || isGoogleLoading}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold text-slate-700 uppercase tracking-wide"
                >
                  {t.auth.password}
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                  {t.auth.forgotPassword}
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white text-sm transition-colors"
                  {...register("password")}
                  disabled={isLoading || isGoogleLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading || isGoogleLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Keep me logged in */}
            <div className="flex items-center gap-2 pt-1 pb-1">
              <Controller
                name="rememberMe"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="keepLoggedIn"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading || isGoogleLoading}
                    className="border-slate-300"
                  />
                )}
              />
              <Label
                htmlFor="keepLoggedIn"
                className="text-xs font-medium text-slate-600 cursor-pointer select-none"
              >
                {t.auth.rememberMe}
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 font-semibold text-sm shadow-sm hover:shadow transition-all bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.auth.signingIn}
                </>
              ) : (
                <>
                  <span>{t.auth.signInButton}</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* ================= FOOTER LINKS & SECURITY BADGE ================= */}
        <div className="space-y-4 text-center">
          <p className="text-sm text-slate-500">
            {t.auth.dontHaveAccount}{" "}
            <Link
              href="/signup"
              className="font-semibold text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              {t.auth.signUpButton}
            </Link>
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span>Secure SSL encrypted connection</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SigninPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}