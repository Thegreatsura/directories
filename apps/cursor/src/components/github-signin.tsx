"use client";

import { useSearchParams } from "next/navigation";
import { GithubIcon } from "@/components/icons/github-icon";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";

export function GithubSignin({ redirectTo }: { redirectTo?: string }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? redirectTo ?? "/";

  return (
    <Button
      variant="outline"
      className="border border-border rounded-full"
      onClick={() => {
        supabase.auth.signInWithOAuth({
          provider: "github",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
      }}
    >
      <span className="flex items-center gap-2">
        <GithubIcon className="size-4" />
        Sign in with GitHub
      </span>
    </Button>
  );
}
