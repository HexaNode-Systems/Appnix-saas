import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "appnix_access_token";
const ADMIN_COOKIE = "appnix_admin_token";
const SUPERADMIN_COOKIE = "appnix_superadmin_token";

interface DecodedToken {
  sub?: string;
  role?: string;
  tenantId?: string;
  orgPath?: string;
  tier?: string;
  exp?: number;
}

function decodeJwt(token: string | undefined): DecodedToken | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized));
    if (payload.exp && typeof payload.exp === "number") {
      // Check expiration (with 5s clock skew tolerance)
      if (payload.exp * 1000 < Date.now() - 5000) {
        return null;
      }
    }
    return payload;
  } catch {
    return null;
  }
}

function getSubdomainUrl(
  subdomain: "app" | "admin" | "superadmin",
  pathWithSearch: string,
  req: NextRequest
): string {
  const hostname = req.headers.get("host") || "";
  const [hostWithoutPort, port] = hostname.split(":");
  const portSuffix = port ? `:${port}` : "";
  const isLocal =
    process.env.NODE_ENV !== "production" &&
    (hostWithoutPort.includes("localhost") ||
      hostWithoutPort.includes("127.0.0.1") ||
      hostWithoutPort.endsWith(".local"));

  if (isLocal) {
    return `${req.nextUrl.protocol}//${subdomain}.localhost${portSuffix}${pathWithSearch}`;
  }

  // Production
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
  const envDomainMap: Record<string, string | undefined> = {
    app: process.env.NEXT_PUBLIC_APP_DOMAIN,
    admin: process.env.NEXT_PUBLIC_ADMIN_DOMAIN,
    superadmin: process.env.NEXT_PUBLIC_SUPERADMIN_DOMAIN,
  };
  const targetDomain = envDomainMap[subdomain] || `${subdomain}.${rootDomain}`;
  return `https://${targetDomain}${pathWithSearch}`;
}

const protectedClientPrefixes = [
  "/dashboard",
  "/crm",
  "/campaigns",
  "/channels",
  "/automations",
  "/chatbots",
  "/workspace",
  "/settings",
  "/products",
  "/notifications",
  "/whatsapp-mini-apps",
  "/voice-ai-agent",
  "/subscription",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const pathWithSearch = `${pathname}${search}`;
  const hostname = request.headers.get("host") || "";
  const host = hostname.split(":")[0].toLowerCase();

  // 1. Skip static assets, Next.js internal files, and api routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Identify subdomain
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
  const superAdminDomain = (process.env.NEXT_PUBLIC_SUPERADMIN_DOMAIN || `superadmin.${rootDomain}`).toLowerCase();
  const adminDomain = (process.env.NEXT_PUBLIC_ADMIN_DOMAIN || `admin.${rootDomain}`).toLowerCase();
  const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || `app.${rootDomain}`).toLowerCase();

  const isSuperAdminSubdomain =
    host === superAdminDomain ||
    host === "superadmin.appnix.co.in" ||
    host.startsWith("superadmin.localhost") ||
    host === "superadmin.local";

  const isAdminSubdomain =
    host === adminDomain ||
    host === "admin.appnix.co.in" ||
    host.startsWith("admin.localhost") ||
    host === "admin.local";

  const isAppSubdomain =
    host === appDomain ||
    host === "app.appnix.co.in" ||
    host.startsWith("app.localhost") ||
    host === "app.local";

  const isRootDomain = !isSuperAdminSubdomain && !isAdminSubdomain && !isAppSubdomain;

  // 3. Immediate Logout Handler: Clears all HTTP authentication cookies via response headers
  const isLogoutPath =
    pathname === "/logout" ||
    pathname === "/super-admin/logout" ||
    pathname === "/admin/logout";

  if (isLogoutPath) {
    const targetUrl = isSuperAdminSubdomain
      ? "/login"
      : isAdminSubdomain
      ? "/login"
      : pathname.includes("super-admin")
      ? "/super-admin/login"
      : pathname.includes("admin")
      ? "/admin/login"
      : "/signin";

    const response = NextResponse.redirect(new URL(`${targetUrl}${search}`, request.url));
    const allAuthCookies = [
      SUPERADMIN_COOKIE,
      ADMIN_COOKIE,
      AUTH_COOKIE,
      "appnix_access_token",
      "appnix_auth_token",
      "appnix_superadmin_refresh_token",
      "appnix_admin_refresh_token",
      "appnix_refresh_token",
    ];
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
    const domainsToClear = ["", `.${rootDomain}`];
    allAuthCookies.forEach((name) => {
      response.cookies.delete(name);
      domainsToClear.forEach((dom) => {
        response.cookies.set(name, "", { path: "/", maxAge: 0, domain: dom || undefined });
      });
    });
    return response;
  }

  // 3. Subdomain enforcement from root domain:
  // When accessing portal routes from root domain (e.g. localhost:3000 or appnix.co.in),
  // automatically redirect so the browser URL adds "app.", "admin.", or "superadmin."!
  if (isRootDomain) {
    if (pathname.startsWith("/super-admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("superadmin", pathWithSearch, request)));
    }
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("admin", pathWithSearch, request)));
    }

    const isAppRoute =
      pathname === "/app" ||
      pathname.startsWith("/app/") ||
      pathname === "/login" ||
      pathname === "/signin" ||
      pathname === "/signup" ||
      pathname === "/auth" ||
      pathname.startsWith("/auth/") ||
      protectedClientPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      );

    if (isAppRoute) {
      const normalizedPath = pathname === "/app" || pathname.startsWith("/app/")
        ? pathname.replace(/^\/app/, "/dashboard") || "/dashboard"
        : pathname === "/login"
        ? "/signin"
        : pathname;
      return NextResponse.redirect(
        new URL(getSubdomainUrl("app", `${normalizedPath}${search}`, request))
      );
    }
    // Landing page on root domain
    return NextResponse.next();
  }

  // 4. Subdomain internal routing and isolation
  if (isSuperAdminSubdomain) {
    // Cross-portal isolation: prevent superadmin subdomain from accessing admin portal routes directly
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("admin", pathWithSearch, request)));
    }

    // Alias redirects for legacy / shortened routes
    if (pathname === "/billing" || pathname === "/super-admin/billing") {
      return NextResponse.redirect(new URL(`/super-admin/subscriptions${search}`, request.url));
    }
    if (pathname === "/system-health" || pathname === "/super-admin/system-health") {
      return NextResponse.redirect(new URL(`/super-admin/health${search}`, request.url));
    }

    const superAdminToken =
      request.cookies.get(SUPERADMIN_COOKIE)?.value ||
      request.cookies.get(AUTH_COOKIE)?.value ||
      request.cookies.get("appnix_auth_token")?.value;

    const superAdminDecoded = decodeJwt(superAdminToken);
    const isSuperAdminAuth = !!superAdminDecoded?.sub;
    const isSuperAdminRole =
      superAdminDecoded?.role === "SUPER_ADMIN" || superAdminDecoded?.role === "owner";

    const isLoginPath =
      pathname === "/login" ||
      pathname === "/signin" ||
      pathname === "/super-admin/login";

    if (isLoginPath) {
      if (isSuperAdminAuth && isSuperAdminRole) {
        return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
      }
      return NextResponse.rewrite(new URL(`/super-admin/login${search}`, request.url));
    }

    if (!isSuperAdminAuth || !isSuperAdminRole) {
      const loginUrl = new URL(isSuperAdminSubdomain ? "/login" : "/super-admin/login", request.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      const response = NextResponse.redirect(loginUrl);
      [
        SUPERADMIN_COOKIE,
        AUTH_COOKIE,
        "appnix_auth_token",
        "appnix_superadmin_refresh_token",
        "appnix_refresh_token",
      ].forEach((c) => {
        response.cookies.delete(c);
        response.cookies.set(c, "", { path: "/", maxAge: 0 });
      });
      return response;
    }

    if (pathname === "/subscription") {
      return NextResponse.redirect(new URL(`/super-admin/subscriptions${search}`, request.url));
    }
    if (pathname === "/" || pathname === "/dashboard") {
      return NextResponse.rewrite(new URL(`/super-admin/dashboard${search}`, request.url));
    }
    if (!pathname.startsWith("/super-admin")) {
      return NextResponse.rewrite(new URL(`/super-admin${pathname}${search}`, request.url));
    }
  } else if (isAdminSubdomain) {
    // Cross-portal isolation: prevent admin subdomain from accessing superadmin portal routes directly
    if (pathname.startsWith("/super-admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("superadmin", pathWithSearch, request)));
    }

    const adminToken =
      request.cookies.get(ADMIN_COOKIE)?.value ||
      request.cookies.get(AUTH_COOKIE)?.value ||
      request.cookies.get("appnix_auth_token")?.value;

    const adminDecoded = decodeJwt(adminToken);
    const isAdminAuth = !!adminDecoded?.sub;
    const adminRole = adminDecoded?.role;
    const isAdminRole =
      adminRole === "SUPER_ADMIN" ||
      adminRole === "RESELLER_ADMIN" ||
      adminRole === "TENANT_ADMIN" ||
      adminRole === "owner" ||
      adminRole === "admin";

    const isLoginPath =
      pathname === "/login" ||
      pathname === "/signin" ||
      pathname === "/admin/login";

    if (isLoginPath) {
      const isSwitch = request.nextUrl.searchParams.get("switch") === "true" || request.nextUrl.searchParams.has("error");
      if (isAdminAuth && isAdminRole && !isSwitch) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.rewrite(new URL(`/admin/login${search}`, request.url));
    }

    if (!isAdminAuth || !isAdminRole) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      const response = NextResponse.redirect(loginUrl);
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
      const domainsToClear = ["", `.${rootDomain}`];
      [
        ADMIN_COOKIE,
        AUTH_COOKIE,
        "appnix_access_token",
        "appnix_auth_token",
        "appnix_admin_refresh_token",
        "appnix_refresh_token",
      ].forEach((c) => {
        response.cookies.delete(c);
        domainsToClear.forEach((dom) => {
          response.cookies.set(c, "", { path: "/", maxAge: 0, domain: dom || undefined });
        });
      });
      return response;
    }

    if (pathname === "/subscription") {
      return NextResponse.redirect(new URL(`/admin/dashboard${search}`, request.url));
    }
    if (pathname === "/" || pathname === "/dashboard") {
      return NextResponse.rewrite(new URL(`/admin/dashboard${search}`, request.url));
    }
    if (!pathname.startsWith("/admin")) {
      return NextResponse.rewrite(new URL(`/admin${pathname}${search}`, request.url));
    }
  } else if (isAppSubdomain) {
    // Cross-portal isolation: prevent app subdomain from reaching admin portals directly
    if (pathname.startsWith("/super-admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("superadmin", pathWithSearch, request)));
    }
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("admin", pathWithSearch, request)));
    }
    if (pathname === "/") {
      return NextResponse.rewrite(new URL(`/dashboard${search}`, request.url));
    }
  }

  // 5. Handle Legacy / App aliases on subdomains
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const target = pathname.replace(/^\/app/, "/dashboard") || "/dashboard";
    return NextResponse.redirect(new URL(`${target}${search}`, request.url));
  }
  if (pathname === "/login") {
    return NextResponse.redirect(new URL(`/signin${search}`, request.url));
  }

  // 6. Scoped Role & Auth Verification
  // --- Super-Admin Routes ---
  if (pathname.startsWith("/super-admin")) {
    const superAdminToken =
      request.cookies.get(SUPERADMIN_COOKIE)?.value ||
      request.cookies.get(AUTH_COOKIE)?.value ||
      request.cookies.get("appnix_auth_token")?.value;

    const superAdminDecoded = decodeJwt(superAdminToken);
    const isSuperAdminAuth = !!superAdminDecoded?.sub;
    const isSuperAdminRole =
      superAdminDecoded?.role === "SUPER_ADMIN" || superAdminDecoded?.role === "owner";

    if (pathname === "/super-admin/login") {
      if (isSuperAdminAuth && isSuperAdminRole) {
        return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    // Protected super-admin routes
    if (!isSuperAdminAuth || !isSuperAdminRole) {
      // NEVER redirect to /dashboard! Redirect to super-admin login!
      const loginUrl = new URL("/super-admin/login", request.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      const response = NextResponse.redirect(loginUrl);
      [
        SUPERADMIN_COOKIE,
        AUTH_COOKIE,
        "appnix_access_token",
        "appnix_auth_token",
        "appnix_superadmin_refresh_token",
        "appnix_refresh_token",
      ].forEach((c) => {
        response.cookies.delete(c);
        response.cookies.set(c, "", { path: "/", maxAge: 0 });
      });
      return response;
    }

    const response = NextResponse.next();
    response.headers.set("x-tenant-host", host);
    return response;
  }

  // --- Admin Routes ---
  if (pathname.startsWith("/admin")) {
    const adminToken =
      request.cookies.get(ADMIN_COOKIE)?.value ||
      request.cookies.get(AUTH_COOKIE)?.value ||
      request.cookies.get("appnix_auth_token")?.value;

    const adminDecoded = decodeJwt(adminToken);
    const isAdminAuth = !!adminDecoded?.sub;
    const adminRole = adminDecoded?.role;
    const isAdminRole =
      adminRole === "SUPER_ADMIN" ||
      adminRole === "RESELLER_ADMIN" ||
      adminRole === "TENANT_ADMIN" ||
      adminRole === "owner" ||
      adminRole === "admin";

    if (pathname === "/admin/login") {
      if (isAdminAuth && isAdminRole) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    // Protected admin routes
    if (!isAdminAuth || !isAdminRole) {
      // NEVER redirect to /dashboard! Redirect to admin login!
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      const response = NextResponse.redirect(loginUrl);
      [
        ADMIN_COOKIE,
        AUTH_COOKIE,
        "appnix_access_token",
        "appnix_auth_token",
        "appnix_admin_refresh_token",
        "appnix_refresh_token",
      ].forEach((c) => {
        response.cookies.delete(c);
        response.cookies.set(c, "", { path: "/", maxAge: 0 });
      });
      return response;
    }

    const response = NextResponse.next();
    response.headers.set("x-tenant-host", host);
    return response;
  }

  // --- Client Auth Routes (/signin, /signup) ---
  if (pathname === "/signin" || pathname === "/signup") {
    const isSwitch = request.nextUrl.searchParams.get("switch") === "true";
    if (!isSwitch) {
      const clientToken =
        request.cookies.get(AUTH_COOKIE)?.value ||
        request.cookies.get("appnix_auth_token")?.value;
      const clientDecoded = decodeJwt(clientToken);
      if (clientDecoded?.sub) {
        const redirectPath =
          clientDecoded.role === "SUPER_ADMIN" || clientDecoded.role === "owner"
            ? "/super-admin/dashboard"
            : clientDecoded.role === "RESELLER_ADMIN"
            ? "/admin/dashboard"
            : "/dashboard";
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    return NextResponse.next();
  }

  // --- Protected Client Application Routes ---
  const isOAuthCallback =
    (pathname.includes("/channels/") && pathname.endsWith("/callback")) ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/");

  const isProtectedClientRoute =
    !isOAuthCallback &&
    protectedClientPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    );

  if (isProtectedClientRoute) {
    const clientToken =
      request.cookies.get(AUTH_COOKIE)?.value ||
      request.cookies.get("appnix_auth_token")?.value;
    const clientDecoded = decodeJwt(clientToken);
    if (!clientDecoded?.sub) {
      const signinUrl = new URL("/signin", request.url);
      signinUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(signinUrl);
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-tenant-host", host);
  return response;
}

export const middleware = proxy;

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|[\\w-]+\\.\\w+).*)",
  ],
};
