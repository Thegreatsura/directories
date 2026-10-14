import "server-only";
import { createClient } from "@/utils/supabase/admin-client";

/**
 * Whether the user is an admin (web admin and the Community Plugins MCP
 * server). Admins are rows in `public.admins`, matched by user ID or by an
 * email that Google or GitHub verified for one of the user's identities; see
 * the `is_admin` SQL function. Any lookup failure counts as "not an admin".
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[admin] is_admin lookup failed:", error.message);
    return false;
  }

  return data === true;
}
