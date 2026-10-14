import { useEffect, useState } from "react";
import { getAdminStatusAction } from "@/actions/admin-status";
import { createClient } from "@/utils/supabase/client";

// Shared by every admin-only component on a page so they make one lookup;
// fetched again when a different user is signed in.
let cached: { userId: string; isAdmin: Promise<boolean> } | null = null;

async function fetchIsAdmin(): Promise<boolean> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const userId = session?.user.id;
  if (!userId) return false;

  if (cached?.userId !== userId) {
    cached = {
      userId,
      isAdmin: getAdminStatusAction().then(
        (result) => result?.data?.isAdmin === true,
        () => false,
      ),
    };
  }
  return cached.isAdmin;
}

/** Whether to show admin-only UI. The server enforces every admin action. */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    fetchIsAdmin().then((value) => {
      if (active) setIsAdmin(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return isAdmin;
}
