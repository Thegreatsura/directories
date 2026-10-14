"use server";

import { z } from "zod";
import { getMcpAuthorizationDetails, isMcpClient } from "@/lib/mcp/auth";
import { createClient } from "@/utils/supabase/server";
import {
  ActionError,
  adminActionClient,
  authActionClient,
} from "./safe-action";

const authorizationSchema = z.object({
  authorizationId: z.string().trim().min(1).max(200),
});

/**
 * Approves an OAuth authorization request from the consent page. Re-checks
 * what the page showed instead of trusting it: the signed-in user is an admin
 * (adminActionClient) and the requesting client is a registered MCP client.
 */
export const approveOAuthAuthorizationAction = adminActionClient
  .metadata({ actionName: "approve-oauth-authorization" })
  .schema(authorizationSchema)
  .action(async ({ parsedInput: { authorizationId } }) => {
    const supabase = await createClient();
    const { data: details, error } = await getMcpAuthorizationDetails(
      supabase,
      authorizationId,
    );

    if (error || !details) {
      throw new ActionError(
        "This authorization request has expired. Start again from Cursor.",
      );
    }

    // Already approved earlier (only possible for allowlisted clients): the
    // Auth server has issued the redirect.
    if (!("authorization_id" in details)) {
      return { redirectUrl: details.redirect_url };
    }

    if (!isMcpClient(details.client.id)) {
      throw new ActionError("This application is not allowed to connect.");
    }

    const { data, error: approveError } =
      await supabase.auth.oauth.approveAuthorization(authorizationId);

    if (approveError || !data) {
      throw new ActionError(
        "Could not approve the request. Start again from Cursor.",
      );
    }

    return { redirectUrl: data.redirect_url };
  });

export const denyOAuthAuthorizationAction = authActionClient
  .metadata({ actionName: "deny-oauth-authorization" })
  .schema(authorizationSchema)
  .action(async ({ parsedInput: { authorizationId } }) => {
    const supabase = await createClient();
    const { data, error } =
      await supabase.auth.oauth.denyAuthorization(authorizationId);

    if (error || !data) {
      throw new ActionError("This authorization request has expired.");
    }

    return { redirectUrl: data.redirect_url };
  });
