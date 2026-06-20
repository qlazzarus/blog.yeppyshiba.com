type PerformanceSample = {
    count: number;
    maxMs: number;
    totalMs: number;
};

type PerformanceProfilerConfig = {
    readonly enabled?: boolean;
    readonly reportIntervalSec?: number;
    readonly slowFrameMs?: number;
};

const DEFAULT_REPORT_INTERVAL_SEC = 1.5;
const DEFAULT_SLOW_FRAME_MS = 16.7;
const SUMMARY_LABEL_LIMIT = 5;

export class PerformanceProfiler {
    private readonly enabled: boolean;
    private readonly reportIntervalSec: number;
    private readonly slowFrameMs: number;
    private frameCount = 0;
    private frameMaxMs = 0;
    private frameTotalMs = 0;
    private nextReportAtSec = 0;
    private recentSummary = 'perf warming up';
    private readonly samples = new Map<string, PerformanceSample>();

    constructor(config: PerformanceProfilerConfig = {}) {
        this.enabled = config.enabled ?? true;
        this.reportIntervalSec =
            config.reportIntervalSec ?? DEFAULT_REPORT_INTERVAL_SEC;
        this.slowFrameMs = config.slowFrameMs ?? DEFAULT_SLOW_FRAME_MS;
    }

    beginFrame(deltaMs: number) {
        if (!this.enabled) return;

        this.frameCount += 1;
        this.frameTotalMs += deltaMs;
        this.frameMaxMs = Math.max(this.frameMaxMs, deltaMs);
    }

    measure<T>(label: string, fn: () => T): T {
        if (!this.enabled) return fn();

        const startedAt = performance.now();
        try {
            return fn();
        } finally {
            this.record(label, performance.now() - startedAt);
        }
    }

    record(label: string, elapsedMs: number) {
        if (!this.enabled) return;

        const sample = this.samples.get(label) ?? {
            count: 0,
            maxMs: 0,
            totalMs: 0,
        };
        sample.count += 1;
        sample.totalMs += elapsedMs;
        sample.maxMs = Math.max(sample.maxMs, elapsedMs);
        this.samples.set(label, sample);
    }

    endFrame(elapsedSec: number) {
        if (!this.enabled || elapsedSec < this.nextReportAtSec) return;

        const frameAvgMs = this.frameCount > 0 ? this.frameTotalMs / this.frameCount : 0;
        const slowFrame =
            this.frameMaxMs >= this.slowFrameMs
                ? ` slow max ${this.frameMaxMs.toFixed(1)}ms`
                : '';
        const hotLabels = [...this.samples.entries()]
            .sort((a, b) => b[1].totalMs - a[1].totalMs)
            .slice(0, SUMMARY_LABEL_LIMIT)
            .map(([label, sample]) => {
                const avgMs = sample.count > 0 ? sample.totalMs / sample.count : 0;
                return `${label} avg ${avgMs.toFixed(2)} max ${sample.maxMs.toFixed(
                    2,
                )}`;
            });

        this.recentSummary = `perf frame avg ${frameAvgMs.toFixed(
            1,
        )}ms max ${this.frameMaxMs.toFixed(1)}ms${slowFrame}${
            hotLabels.length ? ` | ${hotLabels.join(' | ')}` : ''
        }`;
        this.samples.clear();
        this.frameCount = 0;
        this.frameTotalMs = 0;
        this.frameMaxMs = 0;
        this.nextReportAtSec = elapsedSec + this.reportIntervalSec;
    }

    getOverlayText() {
        return this.enabled ? this.recentSummary : 'perf disabled';
    }
}
