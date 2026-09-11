export async function register() {
  if (process.env.RUNTIME_METRICS === "1") {
    const { registerRuntimeMetrics } = await import("./instrumentation.node");
    registerRuntimeMetrics();
  }
}
