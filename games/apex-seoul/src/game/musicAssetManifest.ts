export type MusicAsset = {
    fileName: string;
    id: 'garage-night' | 'race-base' | 'race-intensity' | 'race-accent' | 'result-sting';
    label: string;
    role: string;
};

/**
 * The sound lab and the future runtime mixer share these public filenames.
 * Files are intentionally absent until a licensed, approved music pass exists.
 */
export const MUSIC_ASSETS: readonly MusicAsset[] = [
    { id: 'garage-night', fileName: 'garage-night.ogg', label: 'Garage Night', role: 'Menu / garage stereo loop' },
    { id: 'race-base', fileName: 'race-base.ogg', label: 'Race Base', role: '16-bar race foundation loop' },
    { id: 'race-intensity', fileName: 'race-intensity.ogg', label: 'Race Intensity', role: 'Race stem layered over base' },
    { id: 'race-accent', fileName: 'race-accent.ogg', label: 'Race Accent', role: 'Optional sparse high-energy stem' },
    { id: 'result-sting', fileName: 'result-sting.ogg', label: 'Result Sting', role: 'Short finish / PB one-shot' },
] as const;

export function getMusicAssetUrl(asset: MusicAsset) {
    return `${import.meta.env.BASE_URL}audio/music/${asset.fileName}`;
}
