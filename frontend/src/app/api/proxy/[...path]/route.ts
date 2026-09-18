import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

const ALLOWED_ORIGINS = [
  "http://localhost:4000",
  "http://localhost:3000",
  "http://localhost:8000",
  "http://localhost:3001",
  "https://api.appnix.co.in",
  "https://app.appnix.co.in",
  "https://admin.appnix.co.in",
  "https://superadmin.appnix.co.in",
  "https://www.appnix.co.in",
  "https://appnix.co.in",
  "https://api.appnix.com",
  "https://staging-api.appnix.com",
];

export async function GET(
  request: NextRequest,
  context: any
) {
  const params = await context.params;
  return handleProxyRequest(request, params);
}

export async function POST(
  request: NextRequest,
  context: any
) {
  const params = await context.params;
  return handleProxyRequest(request, params);
}

export async function PUT(
  request: NextRequest,
  context: any
) {
  const params = await context.params;
  return handleProxyRequest(request, params);
}

export async function PATCH(
  request: NextRequest,
  context: any
) {
  const params = await context.params;
  return handleProxyRequest(request, params);
}

export async function DELETE(
  request: NextRequest,
  context: any
) {
  const params = await context.params;
  return handleProxyRequest(request, params);
}

async function handleProxyRequest(
  request: NextRequest,
  params: { path: string[] }
) {
  const path = params.path.join("/");
  const targetUrl = `${config.api.baseUrl}/${path}`;
  console.log("[API PROXY] Forwarding to:", targetUrl);

  const searchParams = request.nextUrl.searchParams.toString();
  const url = searchParams ? `${targetUrl}?${searchParams}` : targetUrl;

  const headers = new Headers();
  // Do not pass client connection framing through to the server-side fetch.
  // Node's fetch rejects headers such as transfer-encoding when it creates a
  // new request body, which previously made every proxied POST return 502.
  const hopByHopHeaders = new Set([
    "host", "connection", "content-length", "transfer-encoding", "keep-alive",
    "upgrade", "expect", "te", "trailer", "proxy-authenticate", "proxy-authorization",
  ]);
  request.headers.forEach((value, key) => {
    if (!hopByHopHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  headers.set("x-forwarded-for", request.headers.get("x-forwarded-for") || "unknown");
  headers.set("x-forwarded-proto", request.headers.get("x-forwarded-proto") || "https");
  const incomingHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "app.appnix.co.in";
  headers.set("x-forwarded-host", incomingHost);

  // If authorization header is missing, extract token from cookies and inject into upstream request
  if (!headers.has("authorization")) {
    const host = (request.headers.get("host") || "").toLowerCase();
    const isApp = host.startsWith("app.") || host.includes("app.localhost");
    const isSuperAdmin = host.startsWith("superadmin.") || host.includes("superadmin.localhost");
    const isAdminOrPartner =
      host.startsWith("admin.") ||
      host.startsWith("partners.") ||
      host.includes("partners.localhost") ||
      host.includes("admin.localhost");

    let token: string | undefined;
    if (isSuperAdmin) {
      token =
        request.cookies.get("appnix_superadmin_token")?.value ||
        request.cookies.get("appnix_access_token")?.value;
    } else if (isAdminOrPartner) {
      token =
        request.cookies.get("appnix_admin_token")?.value ||
        request.cookies.get("appnix_access_token")?.value;
    } else if (isApp) {
      token =
        request.cookies.get("appnix_access_token")?.value ||
        request.cookies.get("appnix_auth_token")?.value;
    } else {
      token =
        request.cookies.get("appnix_access_token")?.value ||
        request.cookies.get("appnix_auth_token")?.value ||
        request.cookies.get("appnix_admin_token")?.value;
    }

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  let body: BodyInit | undefined;
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      body = JSON.stringify(await request.json());
    } else if (contentType?.includes("multipart/form-data")) {
      body = await request.formData();
    } else {
      body = await request.text();
    }
  }

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body,
      credentials: "include",
    });

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!["transfer-encoding", "content-encoding", "set-cookie"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    const data = await response.arrayBuffer();

    const nextResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

    // Forward Set-Cookie headers properly without merging them
    if (typeof (response.headers as any).getSetCookie === "function") {
      const setCookies = (response.headers as any).getSetCookie();
      setCookies.forEach((cookieStr: string) => {
        nextResponse.headers.append("set-cookie", cookieStr);
      });
    } else {
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        nextResponse.headers.set("set-cookie", setCookie);
      }
    }

    return nextResponse;
  } catch (error) {
    console.error("[Proxy Error]", error);
    return NextResponse.json(
      { error: "Proxy request failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    );
  }
}
