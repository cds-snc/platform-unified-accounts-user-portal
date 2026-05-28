"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouterDebugger() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.entries().reduce((prev, curr, index) => {
      return `${prev}${index !== 0 ? "&" : "?"}${curr[0]}=${curr[1]}`;
    }, "");
    console.log(`Route changed to: ${pathname}${params}`);
    // You can also send this data to a logging service
  }, [pathname, searchParams]);

  return null; // This component doesn't render anything
}
