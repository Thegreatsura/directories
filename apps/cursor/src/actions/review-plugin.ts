"use server";

import { z } from "zod";
import {
  approvePlugin,
  deletePlugin,
  unpublishPlugin,
  webModerationContext,
} from "@/lib/plugins/moderation";
import { adminActionClient } from "./safe-action";

const pluginIdSchema = z.object({ pluginId: z.string().uuid() });

export const approvePluginAction = adminActionClient
  .metadata({ actionName: "approve-plugin" })
  .schema(pluginIdSchema)
  .action(async ({ parsedInput: { pluginId }, ctx: { userId } }) => {
    await approvePlugin(webModerationContext(userId), pluginId);
    return { success: true };
  });

/**
 * Admin counterpart to the owner's unpublish: hides the plugin from the
 * directory without blocking it, so the owner (or an admin) can re-publish.
 * Use `confirmFlagAction` instead when the plugin should stay down.
 */
export const unpublishPluginAction = adminActionClient
  .metadata({ actionName: "unpublish-plugin" })
  .schema(pluginIdSchema)
  .action(async ({ parsedInput: { pluginId }, ctx: { userId } }) => {
    await unpublishPlugin(webModerationContext(userId), pluginId);
    return { success: true };
  });

export const declinePluginAction = adminActionClient
  .metadata({ actionName: "decline-plugin" })
  .schema(pluginIdSchema)
  .action(async ({ parsedInput: { pluginId }, ctx: { userId } }) => {
    await deletePlugin(webModerationContext(userId), pluginId);
    return { success: true };
  });
