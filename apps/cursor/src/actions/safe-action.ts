import {
  createSafeActionClient,
  DEFAULT_SERVER_ERROR_MESSAGE,
} from "next-safe-action";
import { z } from "zod";
import { ModerationError } from "@/lib/plugins/moderation";
import { isAdmin } from "@/utils/admin";
import { getSession } from "@/utils/supabase/auth";

export class ActionError extends Error {}

// Base client.
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error("Action error:", e.message);

    if (e instanceof ActionError || e instanceof ModerationError) {
      return e.message;
    }

    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
  defineMetadataSchema() {
    return z.object({
      actionName: z.string(),
    });
  },
}).use(async ({ next, metadata }) => {
  const result = await next();

  // Log failures only — never inputs or results, which can contain user PII
  // (emails, profile fields). Server errors are already logged with their
  // message in handleServerError; this adds which action failed.
  if (result.serverError || result.validationErrors) {
    console.error(`[action:${metadata?.actionName}] failed`, {
      serverError: result.serverError,
      validationErrors: result.validationErrors,
    });
  }

  return result;
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await getSession();

  if (!session) {
    throw new Error("Session not found!");
  }

  return next({
    ctx: {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata.name,
    },
  });
});

export const adminActionClient = authActionClient.use(async ({ next, ctx }) => {
  if (!isAdmin(ctx.userId)) {
    throw new ActionError("Unauthorized: admin access required");
  }

  return next({ ctx });
});
