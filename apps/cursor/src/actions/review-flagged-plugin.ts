"use server";

import { z } from "zod";
import {
  approveFlaggedPlugin,
  blockPlugin,
  rescanPlugin,
  webModerationContext,
} from "@/lib/plugins/moderation";
import { adminActionClient } from "./safe-action";

const pluginIdSchema = z.object({ pluginId: z.string().uuid() });

export const approveFlaggedPluginAction = adminActionClient
  .metadata({ actionName: "approve-flagged-plugin" })
  .schema(pluginIdSchema)
  .action(async ({ parsedInput: { pluginId }, ctx: { userId } }) => {
    await approveFlaggedPlugin(webModerationContext(userId), pluginId);
    return { success: true };
  });

export const confirmFlagAction = adminActionClient
  .metadata({ actionName: "confirm-flag" })
  .schema(pluginIdSchema)
  .action(async ({ parsedInput: { pluginId }, ctx: { userId } }) => {
    await blockPlugin(webModerationContext(userId), pluginId);
    return { success: true };
  });

export const rescanPluginAction = adminActionClient
  .metadata({ actionName: "rescan-plugin" })
  .schema(pluginIdSchema)
  .action(async ({ parsedInput: { pluginId }, ctx: { userId } }) => {
    await rescanPlugin(webModerationContext(userId), pluginId);
    return { success: true };
  });
