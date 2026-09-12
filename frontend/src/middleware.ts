import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/proxy).*)'],
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get('host')?.toLowerCase().replace(/:\d+$/, '') || '';
  const pathname = url.pathname;
  const search = url.search;

  // 1. Static and Internal API routes pass through
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Immediate Logout Handler: Clears all authentication cookies
  if (
    pathname === '/logout' ||
    pathname === '/super-admin/logout' ||
    pathname === '/admin/logout' ||
    pathname === '/direct-admin/logout'
  ) {
    const isSuperAdminHost = host === 'superadmin.appnix.co.in' || host.startsWith('superadmin.');
    const isStaffAdminHost = host === 'admin.appnix.co.in' || host.startsWith('admin.');
    const isPartnersHost = host === 'partners.appnix.co.in' || host.startsWith('partners.');

    const targetPath = isSuperAdminHost
      ? '/login'
      : isStaffAdminHost
      ? '/login'
      : isPartnersHost
      ? '/login'
      : '/signin';

    const response = NextResponse.redirect(new URL(targetPath, req.url));
    const allAuthCookies = [
      'appnix_superadmin_token',
      'appnix_admin_token',
      'appnix_access_token',
      'appnix_auth_token',
      'appnix_impersonation_token',
      'appnix_refresh_token',
    ];
    allAuthCookies.forEach((name) => {
      response.cookies.delete(name);
      response.cookies.set(name, '', { path: '/', maxAge: 0 });
    });
    return response;
  }

  // 2. Main Marketing Site
  if (
    host === 'appnix.co.in' ||
    host === 'www.appnix.co.in' ||
    host === 'localhost' ||
    host === '127.0.0.1'
  ) {
    return NextResponse.rewrite(new URL(`/(marketing)${pathname}${search}`, req.url));
  }

  // 3. Direct Client Portal
  if (host === 'app.appnix.co.in' || host === 'app.localhost' || host === 'app.local') {
    return NextResponse.rewrite(new URL(`/(dashboard)${pathname}${search}`, req.url));
  }

  // 4. Direct Appnix Admin Portal
  if (host === 'admin.appnix.co.in' || host === 'admin.localhost' || host === 'admin.local') {
    return NextResponse.rewrite(new URL(`/(direct-admin)${pathname}${search}`, req.url));
  }

  // 5. Tier-0 Platform Super Admin
  if (
    host === 'superadmin.appnix.co.in' ||
    host === 'superadmin.localhost' ||
    host === 'superadmin.local'
  ) {
    return NextResponse.rewrite(new URL(`/(super-admin)${pathname}${search}`, req.url));
  }

  // 6. White-Label Reseller / Partner Admin
  if (
    host === 'partners.appnix.co.in' ||
    host === 'partners.localhost' ||
    host === 'partners.local'
  ) {
    return NextResponse.rewrite(new URL(`/(admin)${pathname}${search}`, req.url));
  }

  // 7. Custom White-Label Domains (e.g., xyz.com)
  // Rewrite to client dashboard route, attaching x-custom-domain header
  const response = NextResponse.rewrite(new URL(`/(dashboard)${pathname}${search}`, req.url));
  response.headers.set('x-custom-domain', host);
  return response;
}
