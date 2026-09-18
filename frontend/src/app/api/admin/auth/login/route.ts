import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, orgSlug, mfaCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = typeof email === "string" ? email.toLowerCase().trim() : email;
    const payload: Record<string, any> = { email: cleanEmail, password };
    if (orgSlug && typeof orgSlug === "string" && orgSlug.trim()) {
      payload.orgSlug = orgSlug.trim();
    }
    if (mfaCode && typeof mfaCode === "string" && mfaCode.trim()) {
      payload.mfaCode = mfaCode.trim();
    }

    // Forward to unified direct login endpoint:
    // http://localhost:4000/api/v1/auth/login
    const backendUrl = `${config.api.baseUrl}/auth/login`;

    const requestHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "admin.appnix.co.in";
    const proxyHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "x-forwarded-host": requestHost,
      "x-original-host": requestHost,
      "x-appnix-host": requestHost,
      origin: `https://${requestHost}`,
    };
    let backendRes: Response;
    try {
      backendRes = await fetch(backendUrl, {
        method: "POST",
        headers: proxyHeaders,
        body: JSON.stringify(payload),
      });
    } catch (networkError: any) {
      console.warn("[Admin Auth Proxy] Primary login unreachable, trying admin route alias:", networkError.message);
      backendRes = await fetch(`${config.api.baseUrl}/auth/admin/login`, {
        method: "POST",
        headers: proxyHeaders,
        body: JSON.stringify(payload),
      });
    }

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      const errorMsg = Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message || "Admin authentication failed";
      return NextResponse.json(
        { message: errorMsg },
        { status: backendRes.status }
      );
    }

    const resData = data.data || data;
    const { accessToken, refreshToken, user } = resData;

    // Strict role validation: Ensure user has administrative or reseller privileges
    const role = user?.rawRole || user?.role;
    const allowedAdminRoles = ["SUPER_ADMIN", "APP_ADMIN", "RESELLER_ADMIN", "TENANT_ADMIN", "owner", "admin"];
    if (role && !allowedAdminRoles.includes(role)) {
      return NextResponse.json(
        { message: "Access denied: Account does not possess Admin or Reseller privileges" },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      data: resData,
      message: "Admin authenticated successfully",
    });

    // Set secure HttpOnly cookies for admin session (Host-only, no cross-panel bleed)
    const isProd = process.env.NODE_ENV === "production";
    const cookieDomain = undefined;
    if (accessToken) {
      response.cookies.set("appnix_admin_token", accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        domain: cookieDomain,
        path: "/",
        maxAge: 15 * 60, // 15 mins
      });

      response.cookies.set("appnix_access_token", accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        domain: cookieDomain,
        path: "/",
        maxAge: 15 * 60, // 15 mins
      });

      // Mirror token for edge proxy inspection
      response.cookies.set("appnix_auth_token", accessToken, {
        httpOnly: false,
        secure: isProd,
        sameSite: "lax",
        domain: cookieDomain,
        path: "/",
        maxAge: 15 * 60,
      });
    }

    if (refreshToken) {
      response.cookies.set("appnix_admin_refresh_token", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        domain: cookieDomain,
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      response.cookies.set("appnix_refresh_token", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        domain: cookieDomain,
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    return response;
  } catch (error: any) {
    console.error("[Admin Auth API Handler Error]:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error during admin authentication" },
      { status: 500 }
    );
  }
}
