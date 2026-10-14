"use server";

import { z } from "zod";
import {
  dismissVerificationRequest,
  setPluginVerified,
  webModerationContext,
} from "@/lib/plugins/moderation";
import { adminActionClient } from "./safe-action";

const pluginIdSchema = z.object({ pluginId: z.string().uuid() });

export const setPluginVerifiedAction = adminActionClient
  .metadata({ actionName: "set-plugin-verified" })
  .schema(z.object({ pluginId: z.string().uuid(), verified: z.boolean() }))
  .action(async ({ parsedInput: { pluginId, verified }, ctx: { userId } }) => {
    await setPluginVerified(webModerationContext(userId), pluginId, verified);
    return { success: true };
  });

export const dismissVerificationRequestAction = adminActionClient
  .metadata({ actionName: "dismiss-verification-request" })
  .schema(pluginIdSchema)
  .action(async ({ parsedInput: { pluginId }, ctx: { userId } }) => {
    await dismissVerificationRequest(webModerationContext(userId), pluginId);
    return { success: true };
  });
