import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const execFileAsync = promisify(execFile);

const config = {
    bbox: {
        east: 127.022,
        north: 37.607,
        south: 37.590,
        west: 126.964,
    },
    courseId: 'bugak-ridge-downhill',
    courseName: 'Bugak Ridge Downhill',
    demEndpoint: 'https://api.opentopodata.org/v1/srtm30m',
    elevationBatchSize: 50,
    maxElevationSamples: 90,
    outputPath: 'assets/tracks/reference/bugak-ridge-downhill-reference.json',
    overpassEndpoints: [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.openstreetmap.ru/api/interpreter',
    ],
    skipDem: false,
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--output' && next) {
        config.outputPath = next;
        index += 1;
    } else if (arg === '--max-elevation-samples' && next) {
        const value = Number(next);

        if (!Number.isInteger(value) || value < 1) {
            throw new Error(`Invalid --max-elevation-samples value: ${next}`);
        }

        config.maxElevationSamples = value;
        index += 1;
    } else if (arg === '--overpass-url' && next) {
        config.overpassEndpoints = [next];
        index += 1;
    } else if (arg === '--skip-dem') {
        config.skipDem = true;
    }
}

const osm = await fetchOsmReference(config.bbox);
const roadWays = osm.elements.filter((element) => element.type === 'way' && element.tags?.highway);
const landmarkWays = osm.elements.filter((element) => element.type === 'way' && !element.tags?.highway);
const elevationSamples = config.skipDem
    ? []
    : await fetchElevationSamples(buildElevationSamplePoints(roadWays, config.maxElevationSamples));

const output = {
    courseId: config.courseId,
    courseName: config.courseName,
    generatedAt: new Date().toISOString(),
    intent: 'Reference-only data for a Bukak Skyway-inspired fictional downhill course. Do not treat this as final runtime track data.',
    sourceNotes: [
        'Road geometry is fetched from OpenStreetMap via Overpass API.',
        'Elevation samples are fetched from OpenTopodata SRTM 30m when --skip-dem is not set.',
        'Use this file to study curve rhythm and grade, then hand-author game TrackSection data.',
    ],
    licenseNotes: {
        dem: 'OpenTopodata SRTM 30m service; verify dataset terms before redistributing derived elevation datasets.',
        osm: 'OpenStreetMap data is licensed under ODbL and requires attribution. Avoid shipping direct OSM-derived route geometry unless the project is ready to comply with ODbL obligations.',
    },
    sourceLinks: {
        openStreetMapCopyright: 'https://www.openstreetmap.org/copyright',
        openTopoData: 'https://www.opentopodata.org/',
        openTopoDataSrtm: 'https://www.opentopodata.org/datasets/srtm/',
    },
    bbox: config.bbox,
    osm: {
        elementCount: osm.elements.length,
        roadWays: roadWays.map(summarizeWay),
        landmarks: landmarkWays.map(summarizeWay),
    },
    elevationSamples,
    gameTranslationHints: [
        'Keep the course name fictional: Bugak Ridge Downhill.',
        'Compress the real route into short arcade sections instead of preserving exact distances.',
        'Use OSM geometry to spot curve rhythm, not to generate final segment coordinates.',
        'Use DEM samples to decide broad uphill/downhill arcs, then exaggerate elevation for readability.',
        'Place a viewpoint/checkpoint near the Palgakjeong-inspired high point before the main downhill.',
    ],
};

const outputPath = path.resolve(projectRoot, config.outputPath);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
console.log(`OSM road ways: ${roadWays.length}`);
console.log(`Elevation samples: ${elevationSamples.length}`);

async function fetchOsmReference(bbox) {
    const query = `
[out:json][timeout:25];
(
  way["highway"]["name"="북악산로"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["highway"]["alt_name"="북악스카이웨이"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["man_made"="bridge"]["name"~"북악스카이웨이"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["leisure"="park"]["name"="북악 팔각정"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out body geom;
`.trim();

    const errors = [];

    for (const endpoint of config.overpassEndpoints) {
        try {
            return await fetchJson(endpoint, {
                body: query,
                headers: {
                    'content-type': 'text/plain; charset=utf-8',
                },
                method: 'POST',
            }, [
                '-fsSL',
                '--max-time',
                '45',
                '-X',
                'POST',
                '-H',
                'content-type: text/plain; charset=utf-8',
                '--data-binary',
                query,
                endpoint,
            ]);
        } catch (error) {
            errors.push(`${endpoint}: ${error.message}`);
            console.warn(`Overpass request failed for ${endpoint}: ${error.message}`);
        }
    }

    throw new Error(`Failed to fetch Overpass data from all endpoints.\n${errors.join('\n')}`);
}

function summarizeWay(way) {
    const geometry = Array.isArray(way.geometry)
        ? way.geometry.map((point) => ({
            lat: round(point.lat, 7),
            lon: round(point.lon, 7),
        }))
        : [];

    return {
        geometry,
        id: way.id,
        pointCount: geometry.length,
        tags: pickTags(way.tags ?? {}),
    };
}

function pickTags(tags) {
    const keys = [
        'alt_name',
        'bridge',
        'bridge:name',
        'highway',
        'lanes',
        'layer',
        'leisure',
        'man_made',
        'maxspeed',
        'name',
        'name:en',
        'name:ko',
        'oneway',
        'surface',
    ];

    return Object.fromEntries(keys.filter((key) => tags[key] !== undefined).map((key) => [key, tags[key]]));
}

function buildElevationSamplePoints(ways, maxSamples) {
    const points = [];

    for (const way of ways) {
        if (!Array.isArray(way.geometry)) continue;

        for (const point of way.geometry) {
            points.push({
                lat: point.lat,
                lon: point.lon,
                osmWayId: way.id,
            });
        }
    }

    if (points.length <= maxSamples) {
        return points;
    }

    const sampled = [];
    const step = (points.length - 1) / (maxSamples - 1);

    for (let index = 0; index < maxSamples; index += 1) {
        sampled.push(points[Math.round(index * step)]);
    }

    return sampled;
}

async function fetchElevationSamples(points) {
    if (points.length === 0) {
        return [];
    }

    const batches = [];

    for (let index = 0; index < points.length; index += config.elevationBatchSize) {
        batches.push(points.slice(index, index + config.elevationBatchSize));
    }

    const samples = [];

    for (const batch of batches) {
        const locations = batch.map((point) => `${point.lat},${point.lon}`).join('|');
        const url = `${config.demEndpoint}?locations=${encodeURIComponent(locations)}`;
        const json = await fetchJson(url, {}, ['-fsSL', '--max-time', '45', url]);

        if (json.status !== 'OK') {
            throw new Error(`Elevation service returned ${json.status}: ${json.error ?? 'unknown error'}`);
        }

        for (let index = 0; index < json.results.length; index += 1) {
            const point = batch[index];
            const result = json.results[index];

            samples.push({
                elevation: result.elevation,
                lat: round(point.lat, 7),
                lon: round(point.lon, 7),
                osmWayId: point.osmWayId,
            });
        }
    }

    return samples;
}

async function fetchJson(url, fetchOptions, curlArgs) {
    try {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
        }

        return response.json();
    } catch (fetchError) {
        const { stdout } = await execFileAsync('curl', curlArgs, {
            maxBuffer: 10 * 1024 * 1024,
        });

        try {
            return JSON.parse(stdout);
        } catch (parseError) {
            throw new Error(`fetch failed (${fetchError.message}); curl returned invalid JSON (${parseError.message})`);
        }
    }
}

function round(value, digits) {
    const multiplier = 10 ** digits;

    return Math.round(value * multiplier) / multiplier;
}
