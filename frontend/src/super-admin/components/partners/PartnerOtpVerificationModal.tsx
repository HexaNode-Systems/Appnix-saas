"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import {
  sendFirebasePhoneOtp,
  confirmFirebasePhoneOtp,
  getOtpMode,
} from "@/lib/firebasePhoneAuth";

export interface PartnerOtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  onVerified: (firebaseIdToken: string) => void;
}

const COOLDOWN_SECONDS = 60;

function OtpDialogForm({
  phone,
  onClose,
  onVerified,
}: {
  phone: string;
  onClose: () => void;
  onVerified: (firebaseIdToken: string) => void;
}) {
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    `Verification code sent to ${phone}`
  );

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const result = await confirmFirebasePhoneOtp(otp.trim());
      if (result.success && result.idToken) {
        onVerified(result.idToken);
      } else {
        throw new Error("Phone verification failed. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify code. Please check and try again.";
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);

    try {
      const res = await sendFirebasePhoneOtp(phone);
      setStatusMessage(res.message || `New code sent to ${phone}`);
      setCooldown(COOLDOWN_SECONDS);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend verification code.";
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleVerify} className="space-y-4 pt-1">
      {statusMessage && !error && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          {statusMessage}
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <p className="flex-1 leading-snug">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-foreground">
          Enter 6-Digit Verification Code <span className="text-rose-500">*</span>
        </label>
        <Input
          type="text"
          autoFocus
          inputMode="numeric"
          maxLength={6}
          placeholder="111111"
          value={otp}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
            setOtp(val);
            if (error) setError(null);
          }}
          className="h-11 text-center font-mono text-lg tracking-widest font-bold"
        />
        <p className="text-[11px] text-muted-foreground text-center">
          Target Phone: <strong className="font-mono text-foreground">{phone}</strong>
          {getOtpMode() === "development" && (
            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
              Testing Mode: Enter 111111
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1 text-xs">
        <button
          type="button"
          disabled={cooldown > 0 || resending}
          onClick={handleResend}
          className={`inline-flex items-center gap-1 font-medium transition-colors ${
            cooldown > 0 || resending
              ? "text-muted-foreground cursor-not-allowed"
              : "text-amber-600 hover:text-amber-700 dark:text-amber-400 cursor-pointer underline"
          }`}
        >
          <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
          <span>
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `Resend Code in ${cooldown}s`
              : "Resend Code"}
          </span>
        </button>
      </div>

      {/* Invisible container for Firebase reCAPTCHA */}
      <div id="firebase-recaptcha-container" />

      <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-4 border-t mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={verifying}
          className="h-9 px-4 text-xs cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={verifying || otp.length < 6}
          className="h-9 px-5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 cursor-pointer shadow-xs"
        >
          {verifying ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Verifying OTP...</span>
            </>
          ) : (
            <span>Verify OTP</span>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PartnerOtpVerificationModal({
  isOpen,
  onClose,
  phone,
  onVerified,
}: PartnerOtpVerificationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md p-6 sm:rounded-xl border bg-card shadow-2xl z-[70]">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Verify Contact Phone / WhatsApp
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Firebase Phone Authentication OTP
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isOpen && (
          <OtpDialogForm
            key={phone}
            phone={phone}
            onClose={onClose}
            onVerified={onVerified}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
