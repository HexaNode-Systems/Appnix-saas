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
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxyRequest(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxyRequest(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxyRequest(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxyRequest(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxyRequest(request, await params);
}

async function handleProxyRequest(
  request: NextRequest,
  params: { path: string[] }
) {
  const path = params.path.join("/");
  const targetUrl = `${config.api.baseUrl}/${path}`;

  const searchParams = request.nextUrl.searchParams.toString();
  const url = searchParams ? `${targetUrl}?${searchParams}` : targetUrl;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!["host", "connection", "content-length"].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  headers.set("x-forwarded-for", request.headers.get("x-forwarded-for") || "unknown");
  headers.set("x-forwarded-proto", request.headers.get("x-forwarded-proto") || "https");

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