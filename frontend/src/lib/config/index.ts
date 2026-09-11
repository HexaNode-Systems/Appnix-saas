export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.appnix.co.in/api/v1",
    proxyPrefix: "/api/proxy",
    timeout: 30000,
  },
  app: {
    name: "Appnix",
    description: "Unified Business Messaging & Marketing Platform",
    url:
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://app.appnix.co.in"
        : "http://localhost:3000"),
    domains: {
      root: process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in",
      app: process.env.NEXT_PUBLIC_APP_DOMAIN || "app.appnix.co.in",
      admin: process.env.NEXT_PUBLIC_ADMIN_DOMAIN || "admin.appnix.co.in",
      superAdmin: process.env.NEXT_PUBLIC_SUPERADMIN_DOMAIN || "superadmin.appnix.co.in",
    },
  },
  auth: {
    tokenKey: "appnix_auth_token",
    refreshTokenKey: "appnix_refresh_token",
    userKey: "appnix_user",
    adminTokenKey: "appnix_admin_token",
    adminRefreshTokenKey: "appnix_admin_refresh_token",
    adminUserKey: "appnix_admin_user",
    superAdminTokenKey: "appnix_superadmin_token",
    superAdminRefreshTokenKey: "appnix_superadmin_refresh_token",
    superAdminUserKey: "appnix_superadmin_user",
    googleOAuthUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.appnix.co.in/api/v1"}/auth/google`,
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
    recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LfVco0tAAAAAGeR2tdcUwtC_vJvXWV_cZ2ZPW8R",
  },
  theme: {
    defaultTheme: "system",
    storageKey: "appnix_theme",
  },
} as const;

export type Config = typeof config;