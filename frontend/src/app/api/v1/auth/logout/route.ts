import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

const ALL_AUTH_COOKIES = [
  "appnix_access_token",
  "appnix_auth_token",
  "appnix_refresh_token",
  "appnix_admin_token",
  "appnix_admin_refresh_token",
  "appnix_superadmin_token",
  "appnix_superadmin_refresh_token",
];

async function handleLogout(request: NextRequest) {
  // 1. Notify backend NestJS API to invalidate refresh token in database
  try {
    const backendUrl = `${config.api.baseUrl}/auth/logout`;
    const authHeader = request.headers.get("authorization");
    const cookieHeader = request.headers.get("cookie");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authHeader) headers["authorization"] = authHeader;
    if (cookieHeader) headers["cookie"] = cookieHeader;

    await fetch(backendUrl, {
      method: "POST",
      headers,
    }).catch((err) => {
      console.warn("[Logout Route] Backend notification notice:", err?.message);
    });
  } catch (err: any) {
    console.warn("[Logout Route] Backend notification error:", err?.message);
  }

  // 2. Clear all authentication cookies via Set-Cookie headers in the response
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
  const isProd = process.env.NODE_ENV === "production";
  const domainsToClear = isProd ? ["", `.${rootDomain}`] : [""];

  ALL_AUTH_COOKIES.forEach((name) => {
    response.cookies.delete(name);
    domainsToClear.forEach((dom) => {
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
        domain: dom || undefined,
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
      });
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
        domain: dom || undefined,
        httpOnly: false,
        secure: isProd,
        sameSite: "lax",
      });
    });
  });

  return response;
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}
