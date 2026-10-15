import "server-only";
import type { AuthInfo } from "@modelcontextprotocol/server";
import {
  type AuthOAuthAuthorizationDetailsResponse,
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { isAdmin } from "@/utils/admin";

export const MCP_RESOURCE_PATH = "/api/mcp";

// RFC 9728 path-suffixed metadata location for the resource above.
export const MCP_RESOURCE_METADATA_PATH = `/.well-known/oauth-protected-resource${MCP_RESOURCE_PATH}`;

/** Supabase Auth acts as the OAuth 2.1 authorization server for the MCP. */
export function getMcpAuthorizationServerUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`;
}

// "Cursor (Community Plugins MCP)", the public client registered in the
// production Supabase project. Not a secret: admins put it in their mcp.json.
const PRODUCTION_MCP_CLIENT_ID = "12bb4179-e29a-4f99-a718-335ef4d0edb2";

/**
 * OAuth client IDs whose access tokens the MCP server accepts and that the
 * consent page lets admins approve. A comma-separated `MCP_OAUTH_CLIENT_IDS`
 * replaces the production client, e.g. for a local Supabase stack. Empty
 * counts as unset, since Vercel and `.env` files keep empty values.
 */
export function getMcpClientIds(): string[] {
  return (process.env.MCP_OAUTH_CLIENT_IDS || PRODUCTION_MCP_CLIENT_ID)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isMcpClient(clientId: string | null | undefined): boolean {
  return !!clientId && getMcpClientIds().includes(clientId);
}

/**
 * `getAuthorizationDetails` for the consent flow. For a client the user
 * approved before, the Auth server approves on this call and returns only the
 * redirect URL, without the client. Revoking the user's grants to clients
 * outside the allowlist first means only allowlisted clients are ever
 * approved that way; any other client comes back as a pending request, which
 * the consent page refuses.
 */
export async function getMcpAuthorizationDetails(
  supabase: SupabaseClient,
  authorizationId: string,
): Promise<AuthOAuthAuthorizationDetailsResponse> {
  const { data: grants, error } = await supabase.auth.oauth.listGrants();
  if (error) return { data: null, error };

  for (const { client } of grants) {
    if (isMcpClient(client.id)) continue;
    const { error: revokeError } = await supabase.auth.oauth.revokeGrant({
      clientId: client.id,
    });
    if (revokeError) return { data: null, error: revokeError };
  }

  return supabase.auth.oauth.getAuthorizationDetails(authorizationId);
}

export type McpAuthExtra = {
  userId: string;
  email: string | null;
  isAdmin: boolean;
};

let verifier: SupabaseClient | null = null;

// Tokens are always passed explicitly and never stored, so one stateless
// client is safe to share across requests (and keeps the JWKS cache warm).
function getVerifier(): SupabaseClient {
  verifier ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  return verifier;
}

/**
 * `withMcpAuth` verifier. Returns `undefined` (→ 401 with an RFC 9728
 * challenge) unless the bearer token is a live Supabase access token issued
 * to one of the registered MCP OAuth clients. Admin status is reported in
 * `extra` and enforced by the route.
 */
export async function verifyMcpAccessToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const supabase = getVerifier();
  // getClaims throws, rather than returning an error, for an expired token.
  const result = await supabase.auth.getClaims(bearerToken).catch(() => null);
  if (!result || result.error || !result.data) return undefined;

  const { claims } = result.data;
  const clientId =
    typeof claims.client_id === "string" ? claims.client_id : undefined;

  // Website session tokens have no client_id, and tokens minted for any other
  // OAuth client are not valid for this resource.
  if (!clientId || !isMcpClient(clientId)) return undefined;
  if (claims.role !== "authenticated" || !claims.sub) return undefined;

  // getClaims checks the signature and expiry; getUser additionally confirms
  // with the Auth server that the session hasn't been signed out or revoked
  // and the user still exists.
  const { data: userData, error: userError } =
    await supabase.auth.getUser(bearerToken);
  if (userError || userData.user?.id !== claims.sub) return undefined;

  const extra: McpAuthExtra = {
    userId: claims.sub,
    email: claims.email ?? null,
    isAdmin: await isAdmin(claims.sub),
  };

  return {
    token: bearerToken,
    clientId,
    scopes:
      typeof claims.scope === "string"
        ? claims.scope.split(" ").filter(Boolean)
        : [],
    expiresAt: claims.exp,
    extra,
  };
}
