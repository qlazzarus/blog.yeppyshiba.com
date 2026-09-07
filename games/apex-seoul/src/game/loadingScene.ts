import Phaser from 'phaser';
import { getStartupAssetCount, queueStartupAssets } from './startupAssetManifest';
import { UI_THEME } from './uiTheme';

export class LoadingScene extends Phaser.Scene {
    constructor() { super('loading'); }

    preload() {
        const { width, height } = this.scale;
        const barWidth = Math.min(420, width - 64);
        const barX = (width - barWidth) / 2;
        const barY = height / 2 + 26;
        const progressBar = this.add.graphics();
        const title = this.add.text(width / 2, height / 2 - 48, 'APEX SEOUL', { color: UI_THEME.textMainHex, fontFamily: 'Arial, sans-serif', fontSize: '30px', fontStyle: 'bold' }).setOrigin(0.5);
        const status = this.add.text(width / 2, height / 2 - 8, 'STARTUP ASSETS  0%', { color: UI_THEME.loadingProgressHex, fontFamily: 'monospace', fontSize: '14px' }).setOrigin(0.5);
        const currentFile = this.add.text(width / 2, barY + 26, 'Preparing manifest…', { color: UI_THEME.loadingMutedHex, fontFamily: 'monospace', fontSize: '12px' }).setOrigin(0.5);
        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        progressBar.lineStyle(2, UI_THEME.loadingBorder, 1).strokeRect(barX, barY, barWidth, 12);
        this.load.on('progress', (value: number) => {
            progressBar.fillStyle(UI_THEME.loadingAccent, 1).fillRect(barX + 2, barY + 2, (barWidth - 4) * value, 8);
            status.setText(`STARTUP ASSETS  ${Math.round(value * 100)}%`);
        });
        this.load.on('fileprogress', (file: Phaser.Loader.File) => currentFile.setText(file.key));
        this.load.on('loaderror', (file: Phaser.Loader.File) => currentFile.setText(`Failed: ${file.key}`));
        currentFile.setText(`${getStartupAssetCount()} runtime assets queued`);
        queueStartupAssets(this.load);
        void title;
    }

    create() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('launch') === 'time-attack') {
            params.delete('launch');
            window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
            this.scene.start('time-attack');
            return;
        }
        this.scene.start('main');
    }
}
