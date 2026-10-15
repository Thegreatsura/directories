"use server";

import { isAdmin } from "@/utils/admin";
import { getSession } from "@/utils/supabase/auth";
import { actionClient } from "./safe-action";

/**
 * Tells client components whether to render admin-only UI. Only a UI hint:
 * every admin action is checked again on the server.
 */
export const getAdminStatusAction = actionClient
  .metadata({ actionName: "get-admin-status" })
  .action(async () => {
    const session = await getSession();
    return { isAdmin: session ? await isAdmin(session.user.id) : false };
  });
