export async function register() {
  if (process.env.RUNTIME_METRICS === "1" && process.env.NEXT_RUNTIME !== "edge") {
    const { registerRuntimeMetrics } = await import("./instrumentation.node");
    registerRuntimeMetrics();

    // Initialize the feature flags when the app server is started
    const { initiateFlags } = await import("@lib/flags/initialization");
    await initiateFlags();
  }
}
