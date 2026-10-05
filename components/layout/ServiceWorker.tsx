"use client";
import { useEffect } from "react";

async function registerServiceWorker() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return navigator.serviceWorker.register(`${basePath}/service-worker.js`, {
    scope: basePath ?? "/",
    updateViaCache: "none",
  });
}

export default function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      registerServiceWorker();
    }
  }, []);

  return null;
}
