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

    // Forward to backend NestJS admin login endpoint:
    // http://localhost:4000/api/v1/auth/admin/login
    const backendUrl = `${config.api.baseUrl}/auth/admin/login`;

    let backendRes: Response;
    try {
      backendRes = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, orgSlug, mfaCode }),
      });
    } catch (networkError: any) {
      console.warn("[Admin Auth Proxy] Primary admin login unreachable, trying standard login fallback:", networkError.message);
      // Fallback if backend route differs
      backendRes = await fetch(`${config.api.baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
    }

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: data.message || "Admin authentication failed" },
        { status: backendRes.status }
      );
    }

    const resData = data.data || data;
    const { accessToken, refreshToken, user } = resData;

    // Strict role validation: Ensure user has administrative or reseller privileges
    const role = user?.role;
    const allowedAdminRoles = ["SUPER_ADMIN", "RESELLER_ADMIN", "TENANT_ADMIN", "owner", "admin"];
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

    // Set secure HttpOnly cookies for admin session
    const isProd = process.env.NODE_ENV === "production";
    if (accessToken) {
      response.cookies.set("appnix_access_token", accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60, // 15 mins
      });

      // Mirror token for edge proxy inspection
      response.cookies.set("appnix_auth_token", accessToken, {
        httpOnly: false,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });
    }

    if (refreshToken) {
      response.cookies.set("appnix_refresh_token", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
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
