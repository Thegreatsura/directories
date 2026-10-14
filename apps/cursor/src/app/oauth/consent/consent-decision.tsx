"use client";

import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import {
  approveOAuthAuthorizationAction,
  denyOAuthAuthorizationAction,
} from "@/actions/oauth-consent";
import { Button } from "@/components/ui/button";

type Props = {
  authorizationId: string;
  /** Show the approve button; without it the user can only deny. */
  canApprove?: boolean;
};

export function ConsentDecision({
  authorizationId,
  canApprove = false,
}: Props) {
  const [leaving, setLeaving] = useState(false);

  // Both decisions end with a redirect back to the OAuth client (an
  // authorization code on approve, error=access_denied on deny).
  const goToClient = ({ data }: { data?: { redirectUrl: string } }) => {
    if (!data?.redirectUrl) return;
    setLeaving(true);
    window.location.assign(data.redirectUrl);
  };

  const approve = useAction(approveOAuthAuthorizationAction, {
    onSuccess: goToClient,
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not approve the request.");
    },
  });

  const deny = useAction(denyOAuthAuthorizationAction, {
    onSuccess: goToClient,
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not deny the request.");
    },
  });

  const busy = approve.isExecuting || deny.isExecuting || leaving;

  return (
    <div className="mt-6 flex items-center justify-end gap-2">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => deny.execute({ authorizationId })}
      >
        {deny.isExecuting && (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        )}
        {canApprove ? "Deny" : "Cancel"}
      </Button>
      {canApprove && (
        <Button
          disabled={busy}
          onClick={() => approve.execute({ authorizationId })}
        >
          {(approve.isExecuting || leaving) && (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          )}
          Approve
        </Button>
      )}
    </div>
  );
}
