"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouterDebugger() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    console.log(`Route changed to: ${pathname}?${searchParams}`);
    // You can also send this data to a logging service
  }, [pathname, searchParams]);

  return null; // This component doesn't render anything
}
