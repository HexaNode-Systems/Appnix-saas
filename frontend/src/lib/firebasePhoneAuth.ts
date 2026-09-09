import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";

/**
 * White-Label Partner Phone Verification Service
 *
 * Controlled by NEXT_PUBLIC_OTP_MODE:
 * - 'development' (Default until Firebase configured):
 *   - Uses static testing OTP: "111111"
 *   - Does NOT send real SMS
 *   - Rejects any code other than "111111"
 * - 'firebase' (Future Mode):
 *   - Uses live Firebase Phone Authentication via SMS
 *
 * TODO: When Firebase credentials are provided, switch NEXT_PUBLIC_OTP_MODE=firebase.
 */

const TEST_OTP_CODE = "111111";

let activeConfirmationResult: ConfirmationResult | null = null;
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;
let activeTargetPhone: string = "";

export function getOtpMode(): "development" | "firebase" {
  const envMode = process.env.NEXT_PUBLIC_OTP_MODE?.toLowerCase();
  if (envMode === "firebase" && isFirebaseConfigured()) {
    return "firebase";
  }
  return "development";
}

/**
 * Normalizes phone number to E.164 format (+[country_code][digits])
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return digits;
  }
  // Default to +91 (India) if 10-digit number without country code
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return `+${digits}`;
}

/**
 * Dispatches Phone OTP.
 * In development mode: Simulates OTP dispatch for testing (OTP: 111111).
 * In firebase mode: Dispatches real SMS OTP via Firebase Phone Auth.
 */
export async function sendFirebasePhoneOtp(
  phone: string,
  containerId = "firebase-recaptcha-container"
): Promise<{ success: boolean; message: string; isDevFallback?: boolean }> {
  const normalizedPhone = normalizePhoneNumber(phone);
  activeTargetPhone = normalizedPhone;

  const mode = getOtpMode();

  // Mode 1: Development Testing Mode (OTP = 111111)
  if (mode === "development") {
    activeConfirmationResult = null;
    return {
      success: true,
      message: `[TEST MODE] Verification code sent to ${normalizedPhone}. Testing OTP is: ${TEST_OTP_CODE}`,
      isDevFallback: true,
    };
  }

  // Mode 2: Real Firebase Phone Authentication
  // TODO: Production Firebase Phone Auth activation
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Authentication is not configured. Please set NEXT_PUBLIC_OTP_MODE=development or configure Firebase keys.");
  }

  try {
    if (activeRecaptchaVerifier) {
      try {
        activeRecaptchaVerifier.clear();
      } catch {
        // Ignore
      }
      activeRecaptchaVerifier = null;
    }

    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      container.style.display = "none";
      document.body.appendChild(container);
    }

    activeRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        // reCAPTCHA verified
      },
      "expired-callback": () => {
        console.warn("Firebase reCAPTCHA expired. Re-verification required.");
      },
    });

    await activeRecaptchaVerifier.render();

    activeConfirmationResult = await signInWithPhoneNumber(
      auth,
      normalizedPhone,
      activeRecaptchaVerifier
    );

    return {
      success: true,
      message: `Verification code sent to ${normalizedPhone} via Firebase Phone Auth.`,
    };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === "auth/invalid-phone-number") {
      throw new Error("Invalid phone number format. Please provide a valid mobile number with country code.");
    }
    if (error.code === "auth/too-many-requests") {
      throw new Error("Too many attempts. Please wait a few minutes before requesting another code.");
    }
    if (error.code === "auth/quota-exceeded") {
      throw new Error("SMS quota exceeded. Please contact platform administrator.");
    }
    throw new Error(error.message || "Failed to send verification SMS via Firebase.");
  }
}

/**
 * Confirms OTP code and returns verification token
 */
export async function confirmFirebasePhoneOtp(
  otpCode: string
): Promise<{ success: boolean; idToken: string; phoneNumber: string }> {
  const cleanOtp = otpCode.trim();

  if (!cleanOtp || cleanOtp.length < 6) {
    throw new Error("Please enter a valid 6-digit verification code.");
  }

  const mode = getOtpMode();

  // Mode 1: Development Testing Mode
  if (mode === "development") {
    // Strictly accept ONLY 111111 in testing mode
    if (cleanOtp !== TEST_OTP_CODE) {
      throw new Error("Invalid verification code. Please enter testing OTP: 111111");
    }

    // Generate verified development token incorporating phone number
    const nonce = Math.random().toString(36).substring(2, 10);
    const devToken = `dev-phone-otp-token:${activeTargetPhone}:${Date.now()}:${nonce}`;

    return {
      success: true,
      idToken: devToken,
      phoneNumber: activeTargetPhone || "+919876543210",
    };
  }

  // Mode 2: Real Firebase Confirmation
  // TODO: Production Firebase Phone Auth confirmation
  if (activeConfirmationResult) {
    try {
      const credential = await activeConfirmationResult.confirm(cleanOtp);
      const idToken = await credential.user.getIdToken(true);
      const phoneNumber = credential.user.phoneNumber || activeTargetPhone;

      if (activeRecaptchaVerifier) {
        try {
          activeRecaptchaVerifier.clear();
        } catch {
          // Ignore
        }
        activeRecaptchaVerifier = null;
      }
      activeConfirmationResult = null;

      return {
        success: true,
        idToken,
        phoneNumber,
      };
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/invalid-verification-code") {
        throw new Error("Invalid verification code. Please check the code and try again.");
      }
      if (error.code === "auth/code-expired") {
        throw new Error("The verification code has expired. Please click Resend Code to receive a new one.");
      }
      throw new Error(error.message || "Failed to verify OTP code.");
    }
  }

  throw new Error("No active verification session. Please request a new verification code.");
}
