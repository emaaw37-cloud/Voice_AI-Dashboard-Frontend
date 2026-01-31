"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /billing to /dashbord/billing for consistency
 */
export default function BillingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashbord/billing");
  }, [router]);
  return null;
}
