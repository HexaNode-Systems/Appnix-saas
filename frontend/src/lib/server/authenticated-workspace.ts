import { NextRequest } from "next/server";

const backendBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

/** Resolves the workspace from the backend-verified bearer session. Never use a
 * request body or query parameter as a payment order's workspace identity. */
export async function getAuthenticatedWorkspace(request: NextRequest): Promise<{
  authorization: string;
  workspaceId: string;
} | null> {
  let authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    const cookieToken =
      request.cookies.get("appnix_access_token")?.value ||
      request.cookies.get("appnix_auth_token")?.value ||
      request.cookies.get("token")?.value ||
      request.cookies.get("access_token")?.value;
    if (cookieToken) {
      authorization = `Bearer ${cookieToken}`;
    }
  }
  if (!authorization?.startsWith("Bearer ")) return null;

  const response = await fetch(`${backendBaseUrl}/auth/me`, {
    headers: { Authorization: authorization },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const payload = await response.json();
  const user = payload?.data || payload;
  const workspaceId = user?.workspaceId || user?.tenantId;
  return workspaceId ? { authorization, workspaceId } : null;
}
