import type { RuntimeTelemetryConfig } from './runtimeConfig';

type RuntimeTelemetryEvent = {
    payload: Record<string, unknown>;
    sessionId: string;
    t: number;
    type: string;
};

export class RuntimeTelemetryRecorder {
    private readonly events: RuntimeTelemetryEvent[] = [];
    private nextSampleSec = 0;
    readonly sessionId = createTelemetrySessionId();

    constructor(
        private readonly config: RuntimeTelemetryConfig,
        private readonly getState: () => unknown,
    ) {
        if (!config.enabled) return;

        this.pushEvent('session_start', 0, {
            config,
            url: window.location.href,
            userAgent: navigator.userAgent,
        });
    }

    update(elapsedSec: number) {
        if (!this.config.enabled) return;

        if (elapsedSec >= this.nextSampleSec) {
            this.record('drive_sample', this.getStatePayload());
            this.nextSampleSec = elapsedSec + 1 / this.config.sampleHz;
        }

        if (this.config.autoExport && elapsedSec >= this.config.durationSec) {
            this.downloadJsonl('auto_duration_complete');
            this.config.autoExport = false;
        }
    }

    downloadJsonl(reason = 'manual') {
        if (!this.config.enabled) return;

        this.record('telemetry_export_requested', {
            eventCountBeforeExport: this.events.length,
            reason,
        });

        const jsonl = `${this.events.map((event) => JSON.stringify(event)).join('\n')}\n`;
        const blob = new Blob([jsonl], {
            type: 'application/x-ndjson',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.href = url;
        link.download = `apex-seoul-drive-${this.sessionId}.jsonl`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    getEventCount() {
        return this.events.length;
    }

    private record(type: string, payload: Record<string, unknown>) {
        const state = this.getState() as { elapsedSec?: number } | null;

        this.pushEvent(type, Number((state?.elapsedSec ?? 0).toFixed(3)), payload);
    }

    private getStatePayload() {
        const state = this.getState();

        return state && typeof state === 'object'
            ? state as Record<string, unknown>
            : { state };
    }

    private pushEvent(type: string, t: number, payload: Record<string, unknown>) {
        this.events.push({
            payload,
            sessionId: this.sessionId,
            t,
            type,
        });
    }
}

function createTelemetrySessionId() {
    const randomPart = Math.random().toString(36).slice(2, 8);
    const timePart = new Date().toISOString().replace(/[:.]/g, '-');

    return `${timePart}_${randomPart}`;
}
