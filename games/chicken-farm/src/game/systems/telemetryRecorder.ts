type TelemetryPayload = Record<string, unknown>;

type TelemetryEvent = {
    readonly payload: TelemetryPayload;
    readonly sessionId: string;
    readonly t: number;
    readonly type: string;
};

type TelemetryRecorderConfig = {
    readonly gameId: string;
    readonly getTimeSec: () => number;
    readonly mapId: string;
};

export class TelemetryRecorder {
    private readonly events: TelemetryEvent[] = [];
    private readonly gameId: string;
    private readonly getTimeSec: () => number;
    private readonly mapId: string;
    readonly sessionId: string;

    constructor(config: TelemetryRecorderConfig) {
        this.gameId = config.gameId;
        this.getTimeSec = config.getTimeSec;
        this.mapId = config.mapId;
        this.sessionId = this.createSessionId();
        this.record('session_start', {
            gameId: this.gameId,
            mapId: this.mapId,
            userAgent: navigator.userAgent,
        });
    }

    record(type: string, payload: TelemetryPayload = {}) {
        this.events.push({
            payload,
            sessionId: this.sessionId,
            t: Number(this.getTimeSec().toFixed(3)),
            type,
        });
    }

    async downloadCompressed() {
        this.record('telemetry_export_requested', {
            eventCountBeforeExport: this.events.length,
        });

        const jsonl = this.toJsonl();
        const filenameBase = `${this.gameId}_${this.sessionId}`;

        if ('CompressionStream' in globalThis) {
            const stream = new Blob([jsonl], {
                type: 'application/x-ndjson',
            })
                .stream()
                .pipeThrough(new CompressionStream('gzip'));
            const compressed = await new Response(stream).blob();
            this.downloadBlob(
                compressed,
                `${filenameBase}.jsonl.gz`,
                'application/gzip',
            );
            return;
        }

        this.downloadBlob(
            new Blob([jsonl], { type: 'application/x-ndjson' }),
            `${filenameBase}.jsonl`,
            'application/x-ndjson',
        );
    }

    getEventCount() {
        return this.events.length;
    }

    private createSessionId() {
        const randomPart = Math.random().toString(36).slice(2, 8);
        const timePart = new Date().toISOString().replace(/[:.]/g, '-');

        return `${timePart}_${randomPart}`;
    }

    private downloadBlob(blob: Blob, filename: string, mimeType: string) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    private toJsonl() {
        return `${this.events.map((event) => JSON.stringify(event)).join('\n')}\n`;
    }
}
