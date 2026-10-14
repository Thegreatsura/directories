import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";
import { getMcpAuthorizationServerUrl } from "@/lib/mcp/auth";

// RFC 9728 metadata for /api/mcp; the resource URL is derived from this path.
const handler = protectedResourceHandler({
  authServerUrls: [getMcpAuthorizationServerUrl()],
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { corsHandler as OPTIONS, handler as GET };
