import { createClient } from "./server";

export type VerifiedSession = {
  user: {
    id: string;
    email: string | undefined;
    user_metadata: Record<string, unknown>;
  };
};

/**
 * The signed-in user, read from the access token's verified claims.
 *
 * `supabase.auth.getSession()` returns whatever the session cookie contains
 * without checking the token signature, so its `user` must never back an
 * authorization decision on the server. `getClaims()` verifies the JWT
 * (against the project's JWKS, or via the Auth server for symmetric keys)
 * before we trust `sub`.
 *
 * Tokens that carry a `client_id` were issued to an OAuth client (the MCP
 * server) and only grant what that client allows, so they are not accepted
 * as website sessions.
 */
export async function getSession(): Promise<VerifiedSession | null> {
  const supabase = await createClient();
  // getClaims throws, rather than returning an error, for an expired token.
  const result = await supabase.auth.getClaims().catch(() => null);

  if (
    !result ||
    result.error ||
    !result.data?.claims.sub ||
    result.data.claims.client_id
  ) {
    return null;
  }

  const { claims } = result.data;

  return {
    user: {
      id: claims.sub,
      email: claims.email,
      user_metadata: claims.user_metadata ?? {},
    },
  };
}
