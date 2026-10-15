"use client";

import { useSearchParams } from "next/navigation";
import { GoogleIcon } from "@/components/icons/google-icon";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";

export function GoogleSignin({ redirectTo }: { redirectTo?: string }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? redirectTo ?? "/";

  return (
    <Button
      variant="outline"
      className="border border-border rounded-full"
      onClick={() => {
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
      }}
    >
      <span className="flex items-center gap-2">
        <GoogleIcon className="size-4" />
        Sign in with Google
      </span>
    </Button>
  );
}
