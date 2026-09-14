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
      // Check expiration with 5s clock skew tolerance
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
  subdomain: "app" | "admin" | "partners" | "superadmin",
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
  const isLocal =
    process.env.NODE_ENV !== "production" &&
    (host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      host.endsWith(".local"));

  // 1. Skip static assets, Next.js internal files, api routes, and global auth flows
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Identify Subdomain & Domain Topology
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
  const superAdminDomain = (process.env.NEXT_PUBLIC_SUPERADMIN_DOMAIN || `superadmin.${rootDomain}`).toLowerCase();
  const adminDomain = (process.env.NEXT_PUBLIC_ADMIN_DOMAIN || `admin.${rootDomain}`).toLowerCase();
  const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || `app.${rootDomain}`).toLowerCase();

  const isSuperAdminSubdomain =
    host === superAdminDomain ||
    host === "superadmin.appnix.co.in" ||
    host.startsWith("superadmin.localhost") ||
    host === "superadmin.local";

  const isStaffAdminSubdomain =
    host === adminDomain ||
    host === "admin.appnix.co.in" ||
    host.startsWith("admin.localhost") ||
    host === "admin.local";

  const isPartnersSubdomain =
    host === "partners.appnix.co.in" ||
    host.startsWith("partners.localhost") ||
    host === "partners.local";

  const isAppSubdomain =
    host === appDomain ||
    host === "app.appnix.co.in" ||
    host.startsWith("app.localhost") ||
    host === "app.local";

  const isMarketingDomain =
    host === "www.appnix.co.in" ||
    host === "appnix.co.in" ||
    host === "localhost" ||
    host === "127.0.0.1";

  const isCustomDomain =
    !isSuperAdminSubdomain &&
    !isStaffAdminSubdomain &&
    !isPartnersSubdomain &&
    !isAppSubdomain &&
    !isMarketingDomain;

  // 3. Immediate Logout Handler: Clears all HTTP authentication cookies
  const isLogoutPath =
    pathname === "/logout" ||
    pathname === "/super-admin/logout" ||
    pathname === "/admin/logout" ||
    pathname === "/direct-admin/logout";

  if (isLogoutPath) {
    const targetUrl = isSuperAdminSubdomain
      ? "/login"
      : isStaffAdminSubdomain
      ? "/login"
      : isPartnersSubdomain
      ? "/login"
      : pathname.includes("super-admin")
      ? "/super-admin/login"
      : pathname.includes("direct-admin")
      ? "/direct-admin/login"
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

  // 4. Subdomain Enforcement from Public Marketing Root Domain (www.appnix.co.in / appnix.co.in)
  if (isMarketingDomain) {
    if (pathname.startsWith("/super-admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("superadmin", pathWithSearch, request)));
    }
    if (pathname.startsWith("/direct-admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("admin", pathWithSearch, request)));
    }
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("partners", pathWithSearch, request)));
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
      const normalizedPath =
        pathname === "/app" || pathname.startsWith("/app/")
          ? pathname.replace(/^\/app/, "/dashboard") || "/dashboard"
          : pathname === "/login"
          ? "/signin"
          : pathname;
      return NextResponse.redirect(
        new URL(getSubdomainUrl("app", `${normalizedPath}${search}`, request))
      );
    }

    // Showcase, legal, and public marketing only on root domain
    return NextResponse.next();
  }

  // 5. Tier-0 Platform Super Admin Subdomain (superadmin.appnix.co.in)
  if (isSuperAdminSubdomain) {
    if (pathname.startsWith("/direct-admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("admin", pathWithSearch, request)));
    }
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("partners", pathWithSearch, request)));
    }

    // Legacy / alias redirects
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

    // Resellers are strictly isolated
    if (superAdminDecoded?.role === "RESELLER_ADMIN") {
      return NextResponse.redirect(
        new URL(getSubdomainUrl("partners", "/admin/dashboard", request))
      );
    }

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
      const loginUrl = new URL("/login", request.url);
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
    return NextResponse.next();
  }

  // 6. Direct Appnix Staff Admin Subdomain (admin.appnix.co.in)
  if (isStaffAdminSubdomain) {
    if (pathname.startsWith("/super-admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("superadmin", pathWithSearch, request)));
    }

    const staffToken =
      request.cookies.get(ADMIN_COOKIE)?.value ||
      request.cookies.get(AUTH_COOKIE)?.value ||
      request.cookies.get("appnix_auth_token")?.value;

    const staffDecoded = decodeJwt(staffToken);
    const isStaffAuth = !!staffDecoded?.sub;
    const staffRole = staffDecoded?.role;

    // Strict Reseller Isolation: RESELLER_ADMIN is strictly blocked from Direct Staff Admin!
    if (staffRole === "RESELLER_ADMIN") {
      return NextResponse.redirect(
        new URL(getSubdomainUrl("partners", "/admin/dashboard?notice=reseller_isolated", request))
      );
    }

    // Permitted user roles: SUPER_ADMIN, APP_ADMIN, owner
    const isStaffRole =
      staffRole === "SUPER_ADMIN" || staffRole === "APP_ADMIN" || staffRole === "owner";

    const isLoginPath =
      pathname === "/login" ||
      pathname === "/signin" ||
      pathname === "/admin/login" ||
      pathname === "/direct-admin/login";

    if (isLoginPath) {
      if (isStaffAuth && isStaffRole) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.rewrite(new URL(`/admin/login${search}`, request.url));
    }

    if (!isStaffAuth || !isStaffRole) {
      const loginUrl = new URL("/login", request.url);
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

    if (pathname === "/" || pathname === "/dashboard") {
      return NextResponse.rewrite(new URL(`/admin/dashboard${search}`, request.url));
    }
    if (pathname === "/clients") {
      return NextResponse.rewrite(new URL(`/admin/clients${search}`, request.url));
    }
    if (pathname === "/system-health") {
      return NextResponse.rewrite(new URL(`/admin/system-health${search}`, request.url));
    }
    if (pathname === "/audit-logs") {
      return NextResponse.rewrite(new URL(`/admin/audit-logs${search}`, request.url));
    }
    if (pathname === "/support") {
      return NextResponse.rewrite(new URL(`/admin/support${search}`, request.url));
    }
    if (!pathname.startsWith("/admin")) {
      return NextResponse.rewrite(new URL(`/admin${pathname}${search}`, request.url));
    }
    return NextResponse.next();
  }

  // 7. White-Label Reseller Admin Subdomain (partners.appnix.co.in)
  if (isPartnersSubdomain) {
    if (pathname.startsWith("/super-admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("superadmin", pathWithSearch, request)));
    }
    if (pathname.startsWith("/direct-admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("admin", pathWithSearch, request)));
    }

    const partnerToken =
      request.cookies.get(ADMIN_COOKIE)?.value ||
      request.cookies.get(AUTH_COOKIE)?.value ||
      request.cookies.get("appnix_auth_token")?.value;

    const partnerDecoded = decodeJwt(partnerToken);
    const isPartnerAuth = !!partnerDecoded?.sub;
    const partnerRole = partnerDecoded?.role;

    // Permitted user roles: RESELLER_ADMIN (and SUPER_ADMIN for support inspection)
    const isResellerRole =
      partnerRole === "RESELLER_ADMIN" || partnerRole === "SUPER_ADMIN" || partnerRole === "owner";

    // Block direct end-clients from partner admin portal
    if (partnerDecoded?.sub && (partnerRole === "CLIENT_USER" || (partnerRole === "TENANT_ADMIN" && partnerDecoded.orgPath === "root"))) {
      return NextResponse.redirect(new URL(getSubdomainUrl("app", "/dashboard", request)));
    }

    const isLoginPath =
      pathname === "/login" ||
      pathname === "/signin" ||
      pathname === "/signup" ||
      pathname === "/admin/login" ||
      pathname === "/admin/signup";

    if (isLoginPath) {
      if (isPartnerAuth && isResellerRole) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.rewrite(new URL(`/admin/login${search}`, request.url));
    }

    if (!isPartnerAuth || !isResellerRole) {
      const loginUrl = new URL("/login", request.url);
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

    if (pathname === "/" || pathname === "/dashboard") {
      return NextResponse.rewrite(new URL(`/admin/dashboard${search}`, request.url));
    }
    if (!pathname.startsWith("/admin")) {
      return NextResponse.rewrite(new URL(`/admin${pathname}${search}`, request.url));
    }
    return NextResponse.next();
  }

  // 8. Direct Appnix Client Portal Subdomain (app.appnix.co.in)
  if (isAppSubdomain) {
    if (pathname.startsWith("/super-admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("superadmin", pathWithSearch, request)));
    }
    if (pathname.startsWith("/direct-admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("admin", pathWithSearch, request)));
    }
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL(getSubdomainUrl("partners", pathWithSearch, request)));
    }

    const clientToken =
      request.cookies.get(AUTH_COOKIE)?.value ||
      request.cookies.get("appnix_auth_token")?.value;

    const clientDecoded = decodeJwt(clientToken);

    // Resellers are strictly isolated from Direct Appnix client portal
    if (clientDecoded?.role === "RESELLER_ADMIN") {
      return NextResponse.redirect(
        new URL(getSubdomainUrl("partners", "/admin/dashboard", request))
      );
    }

    // Check if client belongs to a reseller workspace (reseller isolation rule)
    if (!isLocal && clientDecoded?.orgPath && clientDecoded.orgPath.split(".").length > 2) {
      // User belongs to a downstream partner workspace, block on direct app
      if (pathname.startsWith("/dashboard") || pathname.startsWith("/crm") || pathname.startsWith("/campaigns")) {
        const redirectRes = NextResponse.redirect(
          new URL("/signin?error=partner_workspace_account", request.url)
        );
        [AUTH_COOKIE, "appnix_auth_token", "appnix_access_token"].forEach((c) => {
          redirectRes.cookies.delete(c);
          redirectRes.cookies.set(c, "", { path: "/", maxAge: 0 });
        });
        return redirectRes;
      }
    }

    if (pathname === "/") {
      return NextResponse.rewrite(new URL(`/dashboard${search}`, request.url));
    }
    if (pathname === "/login") {
      return NextResponse.redirect(new URL(`/signin${search}`, request.url));
    }
  }

  // 9. Custom Domains (e.g. xyz.com, client.partner.in)
  if (isCustomDomain) {
    if (pathname.startsWith("/super-admin") || pathname.startsWith("/direct-admin") || pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (pathname === "/") {
      const response = NextResponse.rewrite(new URL(`/dashboard${search}`, request.url));
      response.headers.set("x-tenant-host", host);
      response.headers.set("x-custom-domain", "true");
      return response;
    }
    if (pathname === "/login") {
      return NextResponse.redirect(new URL(`/signin${search}`, request.url));
    }
  }

  // 10. Scoped Client Route Authentication Guards
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
            : clientDecoded.role === "APP_ADMIN"
            ? "/direct-admin/dashboard"
            : "/dashboard";
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    return NextResponse.next();
  }

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
  if (isCustomDomain) {
    response.headers.set("x-custom-domain", "true");
  }
  return response;
}

export const middleware = proxy;

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|[\\w-]+\\.\\w+).*)",
  ],
};
