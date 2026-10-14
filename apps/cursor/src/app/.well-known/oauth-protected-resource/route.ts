import {
  getPublicOrigin,
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";
import {
  getMcpAuthorizationServerUrl,
  MCP_RESOURCE_PATH,
} from "@/lib/mcp/auth";

// Clients that only probe the root location get the same document as
// /.well-known/oauth-protected-resource/api/mcp.
export function GET(req: Request) {
  return protectedResourceHandler({
    authServerUrls: [getMcpAuthorizationServerUrl()],
    resourceUrl: `${getPublicOrigin(req)}${MCP_RESOURCE_PATH}`,
  })(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
