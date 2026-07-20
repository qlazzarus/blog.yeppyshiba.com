import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export type Game = {
    description: string;
    eyebrow: string;
    packageName: string;
    slug: string;
    summary: string;
    title: string;
};

export type PlayableGame = Pick<Game, 'slug' | 'title'>;

type GameManifest = Omit<Game, 'packageName' | 'slug'> & {
    published?: boolean;
};

type GamePackage = {
    game?: GameManifest;
    name?: string;
    scripts?: Record<string, string>;
};

const gamesDir = path.join(process.cwd(), 'games');

/** Returns only games that opted into the public games hub. */
export async function getGames(): Promise<Game[]> {
    const entries = await readdir(gamesDir, { withFileTypes: true }).catch(() => []);
    const games = await Promise.all(
        entries
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
            .map((entry) => getGameBySlug(entry.name)),
    );

    return games.filter((game): game is Game => game !== null).sort((a, b) =>
        a.title.localeCompare(b.title, 'ko'),
    );
}

/** Returns every buildable game, including projects not listed on the public hub. */
export async function getPlayableGames(): Promise<PlayableGame[]> {
    const entries = await readdir(gamesDir, { withFileTypes: true }).catch(() => []);
    const games = await Promise.all(
        entries
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
            .map(async (entry) => {
                const packageJson = await readGamePackage(entry.name);

                if (!packageJson?.name || !packageJson.scripts?.build) return null;

                return {
                    slug: entry.name,
                    title: packageJson.game?.title ?? packageJson.name,
                };
            }),
    );

    return games.filter((game): game is PlayableGame => game !== null);
}

export async function getGameBySlug(slug: string): Promise<Game | null> {
    if (!/^[a-z0-9-]+$/u.test(slug)) return null;

    const packageJson = await readGamePackage(slug);
    const manifest = packageJson?.game;

    if (!packageJson?.name || !packageJson.scripts?.build || !manifest || manifest.published === false) {
        return null;
    }

    return {
        description: manifest.description,
        eyebrow: manifest.eyebrow,
        packageName: packageJson.name,
        slug,
        summary: manifest.summary,
        title: manifest.title,
    };
}

async function readGamePackage(slug: string): Promise<GamePackage | null> {
    try {
        return JSON.parse(
            await readFile(path.join(gamesDir, slug, 'package.json'), 'utf8'),
        ) as GamePackage;
    } catch {
        return null;
    }
}
