import { monitorEventLoopDelay, performance, PerformanceObserver } from "node:perf_hooks";

import { logMessage } from "@lib/logger";

const METRICS_INTERVAL_MS = 30_000;
const NANOSECONDS_PER_MILLISECOND = 1_000_000;
const BYTES_PER_MEGABYTE = 1024 * 1024;
const PRESSURE_WARNING_INTERVALS = 2;
const EVENT_LOOP_DELAY_P99_WARNING_MS = 200;
const EVENT_LOOP_DELAY_MAX_WARNING_MS = 1_000;
const EVENT_LOOP_UTILIZATION_WARNING = 0.9;

export function registerRuntimeMetrics() {
  const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
  let previousCpuUsage = process.cpuUsage();
  let previousEventLoopUtilization = performance.eventLoopUtilization();
  let previousSampleTime = performance.now();
  let garbageCollectionCount = 0;
  let garbageCollectionDurationMs = 0;
  let consecutivePressureIntervals = 0;

  const garbageCollectionObserver = new PerformanceObserver((entries) => {
    for (const entry of entries.getEntries()) {
      garbageCollectionCount += 1;
      garbageCollectionDurationMs += entry.duration;
    }
  });

  garbageCollectionObserver.observe({ type: "gc" });
  eventLoopDelay.enable();

  const timer = setInterval(() => {
    try {
      const sampleTime = performance.now();
      const elapsedMs = sampleTime - previousSampleTime;
      const cpuUsage = process.cpuUsage(previousCpuUsage);
      const currentEventLoopUtilization = performance.eventLoopUtilization();
      const eventLoopUtilization = performance.eventLoopUtilization(
        currentEventLoopUtilization,
        previousEventLoopUtilization
      );
      const memoryUsage = process.memoryUsage();
      const eventLoopDelayP99Ms =
        eventLoopDelay.count > 0 ? eventLoopDelay.percentile(99) / NANOSECONDS_PER_MILLISECOND : 0;
      const eventLoopDelayMaxMs =
        eventLoopDelay.count > 0 ? eventLoopDelay.max / NANOSECONDS_PER_MILLISECOND : 0;

      const pressure = [
        eventLoopDelayP99Ms >= EVENT_LOOP_DELAY_P99_WARNING_MS ? "event_loop_delay_p99" : null,
        eventLoopDelayMaxMs >= EVENT_LOOP_DELAY_MAX_WARNING_MS ? "event_loop_delay_max" : null,
        eventLoopUtilization.utilization >= EVENT_LOOP_UTILIZATION_WARNING
          ? "event_loop_utilization"
          : null,
      ].filter((reason): reason is string => reason !== null);

      consecutivePressureIntervals = pressure.length > 0 ? consecutivePressureIntervals + 1 : 0;

      const metrics = {
        event: "runtime_metrics",
        uptimeSeconds: Math.round(process.uptime()),
        CpuPercentOfOneCore: Number(
          (((cpuUsage.user + cpuUsage.system) / (elapsedMs * 1_000)) * 100).toFixed(2)
        ),
        EventLoopUtilization: Number((eventLoopUtilization.utilization * 100).toFixed(2)),
        EventLoopDelayP50: Number(
          (eventLoopDelay.percentile(50) / NANOSECONDS_PER_MILLISECOND).toFixed(2)
        ),
        EventLoopDelayP95: Number(
          (eventLoopDelay.percentile(95) / NANOSECONDS_PER_MILLISECOND).toFixed(2)
        ),
        EventLoopDelayP99: Number(eventLoopDelayP99Ms.toFixed(2)),
        EventLoopDelayMax: Number(eventLoopDelayMaxMs.toFixed(2)),
        RssMemoryMB: Number((memoryUsage.rss / BYTES_PER_MEGABYTE).toFixed(2)),
        HeapUsedMB: Number((memoryUsage.heapUsed / BYTES_PER_MEGABYTE).toFixed(2)),
        AvailableMemoryMB: Number((process.availableMemory() / BYTES_PER_MEGABYTE).toFixed(2)),
        GarbageCollectionCount: garbageCollectionCount,
        GarbageCollectionDuration: Number(garbageCollectionDurationMs.toFixed(2)),
        heapTotalMB: Number((memoryUsage.heapTotal / BYTES_PER_MEGABYTE).toFixed(2)),
        externalMB: Number((memoryUsage.external / BYTES_PER_MEGABYTE).toFixed(2)),
        arrayBuffersMB: Number((memoryUsage.arrayBuffers / BYTES_PER_MEGABYTE).toFixed(2)),
        pressure,
      };

      if (consecutivePressureIntervals >= PRESSURE_WARNING_INTERVALS) {
        logMessage.warn("Runtime pressure detected", metrics);
      } else {
        logMessage.info("Runtime metrics", metrics);
      }

      previousCpuUsage = process.cpuUsage();
      previousEventLoopUtilization = currentEventLoopUtilization;
      previousSampleTime = sampleTime;
      garbageCollectionCount = 0;
      garbageCollectionDurationMs = 0;
      eventLoopDelay.reset();
    } catch (error) {
      logMessage.error("Failed to collect runtime metrics", error);
    }
  }, METRICS_INTERVAL_MS);

  timer.unref();
}
