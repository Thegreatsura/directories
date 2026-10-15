import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { getMcpAuthorizationDetails, isMcpClient } from "@/lib/mcp/auth";
import { isAdmin } from "@/utils/admin";
import { getSession } from "@/utils/supabase/auth";
import { createClient } from "@/utils/supabase/server";
import { ConsentDecision } from "./consent-decision";

export const metadata: Metadata = {
  title: "Authorize access",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ authorization_id?: string | string[] }>;

const MCP_CAPABILITIES = [
  "View the moderation queues, plugin details, scan verdicts, and the moderation log",
  "Approve, unpublish, block, and re-scan plugins",
  "Grant or remove the verified badge and handle verification requests",
];

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-cursor">
      <h1 className="text-xl font-medium tracking-tight">{title}</h1>
      <div className="mt-3 space-y-3 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function HomeLink() {
  return (
    <div className="mt-6 flex justify-end">
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Back to Cursor Directory
      </Link>
    </div>
  );
}

function parseHttpUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * Supabase Auth sends users here (Site URL + authorization path) when an OAuth
 * client such as Cursor asks to connect to the Community Plugins MCP server.
 * Only admins can approve, and only for registered MCP clients; approval is
 * enforced again in the server action.
 */
async function ConsentContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { authorization_id } = await searchParams;
  const authorizationId =
    typeof authorization_id === "string" ? authorization_id : null;

  if (!authorizationId) {
    return (
      <Card title="Invalid authorization request">
        <p>
          The link is missing its authorization ID. Start again from Cursor.
        </p>
        <HomeLink />
      </Card>
    );
  }

  const session = await getSession();
  if (!session) {
    const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  const { data: details, error } = await getMcpAuthorizationDetails(
    supabase,
    authorizationId,
  );

  if (error || !details) {
    return (
      <Card title="Authorization request expired">
        <p>This request is no longer valid. Start again from Cursor.</p>
        <HomeLink />
      </Card>
    );
  }

  const admin = await isAdmin(session.user.id);
  const signedInAs = (
    <p>
      Signed in as{" "}
      <span className="text-foreground">
        {session.user.email ?? session.user.id}
      </span>
      .
    </p>
  );

  // The user approved this (allowlisted) client before, so the Auth server
  // already issued the authorization code when we fetched the details. Still
  // require a click instead of redirecting, so a crafted link can't silently
  // complete someone else's sign-in.
  if (!("authorization_id" in details)) {
    const continueUrl = parseHttpUrl(details.redirect_url);
    if (!admin || !continueUrl) {
      return (
        <Card title="Admins only">
          {signedInAs}
          <p>
            The Community Plugins MCP server is only available to Cursor
            Directory admins.
          </p>
          <HomeLink />
        </Card>
      );
    }
    return (
      <Card title="Continue connecting?">
        {signedInAs}
        <p>
          You approved this application before. Continue to finish signing in at{" "}
          <span className="font-mono text-foreground">{continueUrl.host}</span>.
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Cancel
          </Link>
          <a href={continueUrl.toString()} className={buttonVariants()}>
            Continue
          </a>
        </div>
      </Card>
    );
  }

  const { client } = details;

  if (!isMcpClient(client.id)) {
    return (
      <Card title="Unknown application">
        <p>
          <span className="text-foreground">{client.name}</span> is not an
          approved Cursor Directory application, so it can&apos;t be authorized
          here.
        </p>
        <ConsentDecision authorizationId={authorizationId} />
      </Card>
    );
  }

  if (!admin) {
    return (
      <Card title="Admins only">
        {signedInAs}
        <p>
          <span className="text-foreground">{client.name}</span> is asking to
          connect to the Community Plugins MCP server, which is only available
          to Cursor Directory admins.
        </p>
        <ConsentDecision authorizationId={authorizationId} />
      </Card>
    );
  }

  return (
    <Card title={`Authorize ${client.name}`}>
      {signedInAs}
      <p>
        <span className="text-foreground">{client.name}</span> will act as you
        on the Community Plugins MCP server and can:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        {MCP_CAPABILITIES.map((capability) => (
          <li key={capability}>{capability}</li>
        ))}
      </ul>
      <p>
        Every change is recorded in the moderation log under your account.
        Deleting plugins stays in the web admin.
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border border-border bg-muted/50 p-3 text-xs">
        <dt>Redirects to</dt>
        <dd className="break-all font-mono text-foreground">
          {details.redirect_uri}
        </dd>
        {details.scope.trim() && (
          <>
            <dt>Scopes</dt>
            <dd className="font-mono text-foreground">{details.scope}</dd>
          </>
        )}
      </dl>
      <ConsentDecision authorizationId={authorizationId} canApprove />
    </Card>
  );
}

export default function ConsentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 pt-24 pb-16">
      <div className="w-full max-w-md">
        <Suspense fallback={null}>
          <ConsentContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
