"use client";

import { useEffect } from "react";
import { config } from "@/lib/config";

const isFirstPartyHost = (host: string) =>
  host === "appnix.co.in" || host.endsWith(".appnix.co.in") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local");

/** Applies verified reseller branding when the current host is a custom domain. */
export function TenantBrandingHydrator() {
  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    if (isFirstPartyHost(host)) return;

    fetch(`${config.api.proxyPrefix}/public/tenant-branding?domain=${encodeURIComponent(host)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((response) => {
        const branding = response?.data || response;
        if (!branding?.tenantId) return;
        document.title = branding.brandName || "Client Portal";
        if (branding.faviconUrl) {
          let favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
          if (!favicon) { favicon = document.createElement("link"); favicon.rel = "icon"; document.head.appendChild(favicon); }
          favicon.href = branding.faviconUrl;
        }
        if (branding.primaryColor) document.documentElement.style.setProperty("--primary", branding.primaryColor);
        window.dispatchEvent(new CustomEvent("appnix:tenant-branding", { detail: branding }));
      })
      .catch(() => {});
  }, []);
  return null;
}
