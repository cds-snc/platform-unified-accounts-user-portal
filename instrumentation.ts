export async function register() {
  if (process.env.NEXT_RUNTIME !== "edge") {
    if (process.env.RUNTIME_METRICS === "1") {
      const { registerRuntimeMetrics } = await import("./instrumentation.node");
      registerRuntimeMetrics();
    }

    // Initialize the feature flags when the app server is started
    const { initiateFlags } = await import("@lib/flags/initialization");
    await initiateFlags();
  }
}
