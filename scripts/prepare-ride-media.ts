import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

type CliOptions = {
    frameIntervalSec: number;
    gpxPath: string;
    outRoot: string;
    slug: string;
    videoPath: string;
    videoStartTime: string | null;
};

type RoutePoint = {
    body: string;
    cadence: number | null;
    distanceKm: number;
    ele: number | null;
    heartRate: number | null;
    lat: number;
    lng: number;
    raw: string;
    speedKmh: number | null;
    time: number;
};

type FrameManifestEntry = {
    cadence: number | null;
    distanceKm: number;
    elapsedSec: number;
    heading: number | null;
    heartRate: number | null;
    index: number;
    lat: number;
    lng: number;
    speedKmh: number | null;
    src: string;
    time: string;
};

async function main() {
    const options = parseArgs(process.argv.slice(2));

    const videoStartTime =
        options.videoStartTime ?? (await readVideoStartTime(options.videoPath));
    const videoStartMs = Date.parse(videoStartTime);
    if (!Number.isFinite(videoStartMs)) {
        throw new Error(`Invalid video start time: ${videoStartTime}`);
    }

    const gpxXml = await fs.promises.readFile(options.gpxPath, 'utf8');
    const routePoints = parseRoutePoints(gpxXml);
    if (routePoints.length < 2) {
        throw new Error('The GPX file must contain at least two timed track points.');
    }

    prepareRouteMetrics(routePoints);

    const gpxStartMs = routePoints[0].time;
    const gpxEndMs = routePoints[routePoints.length - 1].time;
    const viewerStartMs = Math.max(gpxStartMs, videoStartMs);
    const videoOffsetSec = Math.max(0, (viewerStartMs - videoStartMs) / 1000);
    const trimmedPoints = routePoints.filter((point) => point.time >= viewerStartMs);

    if (trimmedPoints.length < 2) {
        throw new Error('No usable GPX points remain after trimming to video start.');
    }

    const month = monthFromTimestamp(viewerStartMs);
    const trimmedGpxPublicPath = `/gpx/${month}/${options.slug}.trimmed.gpx`;
    const manifestPublicPath = `/rides/${month}/${options.slug}/media.json`;
    const framePublicDir = `/images/posts/${month}/${options.slug}/frames`;

    const trimmedGpxOut = path.join(
        options.outRoot,
        trimmedGpxPublicPath.replace(/^\//, ''),
    );
    const manifestOut = path.join(
        options.outRoot,
        manifestPublicPath.replace(/^\//, ''),
    );
    const frameOutDir = path.join(options.outRoot, framePublicDir.replace(/^\//, ''));

    await fs.promises.mkdir(path.dirname(trimmedGpxOut), { recursive: true });
    await fs.promises.mkdir(path.dirname(manifestOut), { recursive: true });
    await fs.promises.mkdir(frameOutDir, { recursive: true });

    await fs.promises.writeFile(
        trimmedGpxOut,
        buildTrimmedGpx(gpxXml, trimmedPoints),
        'utf8',
    );

    await extractFrames({
        frameIntervalSec: options.frameIntervalSec,
        outDir: frameOutDir,
        startOffsetSec: videoOffsetSec,
        videoPath: options.videoPath,
    });

    const frameFiles = (await fs.promises.readdir(frameOutDir))
        .filter((file) => /^frame-\d+\.jpg$/i.test(file))
        .sort();

    if (!frameFiles.length) {
        throw new Error('ffmpeg did not produce any frame images.');
    }

    const frames = frameFiles.map((file, fileIndex) => {
        const elapsedSec = fileIndex * options.frameIntervalSec;
        const frameTime = viewerStartMs + elapsedSec * 1000;
        const point = nearestPoint(trimmedPoints, frameTime);

        return {
            cadence: point.cadence,
            distanceKm: round(point.distanceKm, 3),
            elapsedSec,
            heading: headingForPoint(trimmedPoints, point),
            heartRate: point.heartRate,
            index: fileIndex + 1,
            lat: round(point.lat, 6),
            lng: round(point.lng, 6),
            speedKmh: point.speedKmh === null ? null : round(point.speedKmh, 1),
            src: `${framePublicDir}/${file}`,
            time: new Date(frameTime).toISOString(),
        } satisfies FrameManifestEntry;
    });

    const manifest = {
        frameIntervalSec: options.frameIntervalSec,
        frames,
        gpxEndTime: new Date(gpxEndMs).toISOString(),
        gpxStartTime: new Date(gpxStartMs).toISOString(),
        highlights: [],
        slug: options.slug,
        sourceGpx: path.basename(options.gpxPath),
        sourceVideo: path.basename(options.videoPath),
        trimmedGpxUrl: trimmedGpxPublicPath,
        version: 1,
        videoStartTime: new Date(videoStartMs).toISOString(),
        viewerStartTime: new Date(viewerStartMs).toISOString(),
    };

    await fs.promises.writeFile(manifestOut, JSON.stringify(manifest, null, 2), 'utf8');

    console.log(`Wrote ${trimmedGpxOut}`);
    console.log(`Wrote ${manifestOut}`);
    console.log(`Wrote ${frameFiles.length} frames to ${frameOutDir}`);
    console.log('\nAdd this to the ride frontmatter:');
    console.log(`gpxUrl: ${trimmedGpxPublicPath}`);
    console.log(`mediaManifestUrl: ${manifestPublicPath}`);
}

function parseArgs(args: string[]): CliOptions {
    if (args.includes('--help') || args.includes('-h')) {
        printHelp();
        process.exit(0);
    }

    const values = new Map<string, string>();
    for (let i = 0; i < args.length; i += 1) {
        const item = args[i];
        if (!item.startsWith('--')) continue;

        const [key, inlineValue] = item.slice(2).split('=', 2);
        const value = inlineValue ?? args[i + 1];
        if (!value || value.startsWith('--')) {
            throw new Error(`Missing value for --${key}`);
        }

        values.set(key, value);
        if (inlineValue === undefined) i += 1;
    }

    const videoPath = required(values, 'video');
    const gpxPath = required(values, 'gpx');
    const slug = required(values, 'slug');
    const videoStartTime = values.get('video-start') ?? null;
    const frameIntervalSec = Number(values.get('frame-interval') ?? 5);
    const outRoot = values.get('out-root') ?? 'public';

    if (!Number.isFinite(frameIntervalSec) || frameIntervalSec <= 0) {
        throw new Error('--frame-interval must be a positive number.');
    }

    return {
        frameIntervalSec,
        gpxPath,
        outRoot,
        slug,
        videoPath,
        videoStartTime,
    };
}

function required(values: Map<string, string>, key: string) {
    const value = values.get(key);
    if (!value) throw new Error(`Missing required option --${key}`);
    return value;
}

function printHelp() {
    console.log(`Usage:
  npm run ride:prepare -- \\
    --video ./raw/GX010123.MP4 \\
    --gpx ./raw/ride.gpx \\
    --slug 20260601-morning-ride \\
    --video-start 2026-06-01T07:20:00+09:00 \\
    --frame-interval 5

Options:
  --video            GoPro video file path
  --gpx              Source GPX file path
  --slug             Ride slug used for output paths
  --video-start      GoPro recording start time with timezone.
                     If omitted, the script tries ffprobe creation_time metadata.
  --frame-interval   Seconds between extracted frames, default 5
  --out-root         Static asset root, default public
`);
}

function parseRoutePoints(xml: string): RoutePoint[] {
    const matches = xml.matchAll(
        /<trkpt\b[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g,
    );

    return Array.from(matches)
        .map((match) => {
            const [, lat, lng, body] = match;
            const time = Date.parse(readTag(body, 'time'));

            return {
                body,
                cadence: readNumber(body, 'cad'),
                distanceKm: 0,
                ele: readNumber(body, 'ele'),
                heartRate: readNumber(body, 'hr'),
                lat: Number(lat),
                lng: Number(lng),
                raw: match[0],
                speedKmh: null,
                time,
            };
        })
        .filter(
            (point) =>
                Number.isFinite(point.lat) &&
                Number.isFinite(point.lng) &&
                Number.isFinite(point.time),
        )
        .sort((a, b) => a.time - b.time);
}

function readTag(source: string, tagName: string) {
    return (
        source.match(new RegExp(`<[^:>/]*:?${tagName}[^>]*>([^<]*)</[^>]+>`))?.[1] ?? ''
    );
}

function readNumber(source: string, tagName: string) {
    const value = Number(readTag(source, tagName));
    return Number.isFinite(value) ? value : null;
}

function prepareRouteMetrics(points: RoutePoint[]) {
    points[0].distanceKm = 0;

    for (let i = 1; i < points.length; i += 1) {
        points[i].distanceKm =
            points[i - 1].distanceKm + haversine(points[i - 1], points[i]);
    }

    for (let i = 0; i < points.length; i += 1) {
        const from = points[Math.max(0, i - 3)];
        const to = points[Math.min(points.length - 1, i + 3)];
        const hours = (to.time - from.time) / 3600000;
        points[i].speedKmh =
            hours > 0 ? (to.distanceKm - from.distanceKm) / hours : null;
    }
}

function buildTrimmedGpx(originalXml: string, points: RoutePoint[]) {
    const trackPointXml = points.map((point) => `    ${point.raw}`).join('\n');
    const updated = originalXml.replace(
        /<trkseg>[\s\S]*?<\/trkseg>/,
        `<trkseg>\n${trackPointXml}\n   </trkseg>`,
    );

    return updated;
}

async function extractFrames(options: {
    frameIntervalSec: number;
    outDir: string;
    startOffsetSec: number;
    videoPath: string;
}) {
    const outputPattern = path.join(options.outDir, 'frame-%06d.jpg');
    const args = [
        '-hide_banner',
        '-y',
        '-ss',
        String(options.startOffsetSec),
        '-i',
        options.videoPath,
        '-vf',
        `fps=1/${options.frameIntervalSec},scale='min(1600,iw)':-2`,
        '-q:v',
        '5',
        outputPattern,
    ];

    await runCommand('ffmpeg', args);
}

async function readVideoStartTime(videoPath: string) {
    const output = await runCommandAndCapture('ffprobe', [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        videoPath,
    ]);
    const data = JSON.parse(output) as {
        format?: { tags?: Record<string, string> };
        streams?: { tags?: Record<string, string> }[];
    };
    const candidates = [
        data.format?.tags?.creation_time,
        ...(data.streams ?? []).map((stream) => stream.tags?.creation_time),
    ].filter((value): value is string => Boolean(value));

    const videoStartTime = candidates.find((value) =>
        Number.isFinite(Date.parse(value)),
    );
    if (!videoStartTime) {
        throw new Error(
            'Could not infer video start time from ffprobe metadata. Pass --video-start explicitly.',
        );
    }

    return videoStartTime;
}

function runCommand(command: string, args: string[]) {
    return new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'inherit' });
        child.on('error', (error) => {
            if ('code' in error && error.code === 'ENOENT') {
                reject(new Error(`${command} is required but was not found in PATH.`));
                return;
            }

            reject(error);
        });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${command} exited with code ${code}`));
        });
    });
}

function runCommandAndCapture(command: string, args: string[]) {
    return new Promise<string>((resolve, reject) => {
        const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];

        child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
        child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
        child.on('error', (error) => {
            if ('code' in error && error.code === 'ENOENT') {
                reject(new Error(`${command} is required but was not found in PATH.`));
                return;
            }

            reject(error);
        });
        child.on('close', (code) => {
            if (code === 0) {
                resolve(Buffer.concat(stdout).toString('utf8'));
                return;
            }

            reject(
                new Error(
                    `${command} exited with code ${code}: ${Buffer.concat(
                        stderr,
                    ).toString('utf8')}`,
                ),
            );
        });
    });
}

function nearestPoint(points: RoutePoint[], targetTime: number) {
    let low = 0;
    let high = points.length - 1;

    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (points[mid].time < targetTime) low = mid + 1;
        else high = mid;
    }

    const previous = points[Math.max(0, low - 1)];
    const current = points[low];
    return Math.abs(previous.time - targetTime) < Math.abs(current.time - targetTime)
        ? previous
        : current;
}

function headingForPoint(points: RoutePoint[], point: RoutePoint) {
    const index = points.indexOf(point);
    if (index < 0) return null;

    const next = points[Math.min(points.length - 1, index + 4)];
    const previous = points[Math.max(0, index - 4)];
    if (next !== point) return round(bearing(point, next), 1);
    if (previous !== point) return round(bearing(previous, point), 1);
    return null;
}

function bearing(a: RoutePoint, b: RoutePoint) {
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const dLng = toRad(b.lng - a.lng);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function haversine(a: RoutePoint, b: RoutePoint) {
    const radiusKm = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

function monthFromTimestamp(timestamp: number) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function round(value: number, digits: number) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function toRad(value: number) {
    return (value * Math.PI) / 180;
}

function toDeg(value: number) {
    return (value * 180) / Math.PI;
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
