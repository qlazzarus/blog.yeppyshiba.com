import Phaser from 'phaser';
import { ASSET_ATTRIBUTIONS } from './assetAttributions';
import { UI_THEME } from './uiTheme';

export class AssetNoticesScene extends Phaser.Scene {
    constructor() { super('asset-notices'); }

    create() {
        const { width, height } = this.scale;
        const compact = width < 680;
        const left = Math.max(20, (width - 940) / 2);
        const right = width - left;
        const rowHeight = compact ? 48 : 54;
        const listTop = 118;
        const listBottom = height - 56;
        const visibleRowCount = Math.max(1, Math.floor((listBottom - listTop) / rowHeight));
        let scrollIndex = 0;
        let backSelected = false;
        let dragPointerId: number | null = null;
        let dragLastY = 0;

        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        const graphics = this.add.graphics();
        graphics.fillStyle(UI_THEME.background, 1).fillRect(0, 0, width, height);
        graphics.fillStyle(UI_THEME.nightBlue, 0.82).fillRect(0, 0, width, 94);
        graphics.lineStyle(2, UI_THEME.amber, 0.9).lineBetween(0, 92, width, 92);
        this.add.text(width / 2, 32, 'CREDITS & LICENSES', {
            color: UI_THEME.textMainHex, fontFamily: 'Arial, sans-serif',
            fontSize: compact ? '27px' : '34px', fontStyle: 'bold italic', letterSpacing: 2,
            stroke: UI_THEME.titleShadowHex, strokeThickness: 2,
        }).setOrigin(0.5);
        this.add.text(width / 2, 73, 'EXTERNAL ASSETS AND OPEN-SOURCE SOFTWARE', {
            color: UI_THEME.secondaryTextHex, fontFamily: 'monospace', fontSize: compact ? '9px' : '11px',
        }).setOrigin(0.5);

        const rows = Array.from({ length: visibleRowCount }, (_, index) => {
            const y = listTop + index * rowHeight;
            const line = this.add.graphics();
            const title = this.add.text(left, y + 7, '', {
                color: UI_THEME.textMainHex, fontFamily: 'Arial, sans-serif',
                fontSize: compact ? '11px' : '13px', fontStyle: 'bold',
            });
            const details = this.add.text(left, y + 25, '', {
                color: UI_THEME.amberHighlightHex, fontFamily: 'monospace', fontSize: compact ? '8px' : '10px',
            });
            const source = this.add.text(left, y + 38, '', {
                color: UI_THEME.secondaryTextHex, fontFamily: 'monospace', fontSize: compact ? '7px' : '8px',
            });
            return { details, line, source, title };
        });

        const render = () => rows.forEach((row, index) => {
            const notice = ASSET_ATTRIBUTIONS[scrollIndex + index];
            row.line.clear();
            row.title.setVisible(Boolean(notice));
            row.details.setVisible(Boolean(notice));
            row.source.setVisible(Boolean(notice));
            if (!notice) return;
            row.line.lineStyle(1, UI_THEME.borderMuted, 0.7).lineBetween(left, listTop + index * rowHeight, right, listTop + index * rowHeight);
            row.title.setText(notice.name);
            row.details.setText(`${notice.author}  |  ${notice.license}`);
            row.source.setText(notice.sourceUrl.replace(/^https:\/\//, ''));
        });

        const back = this.add.rectangle(width / 2, height - 26, 190, 30, UI_THEME.panel)
            .setStrokeStyle(1, UI_THEME.borderMuted).setInteractive({ useHandCursor: true });
        const backLabel = this.add.text(width / 2, height - 26, '‹  BACK TO MENU', {
            color: UI_THEME.menuTextHex, fontFamily: 'Arial, sans-serif', fontSize: '13px', fontStyle: 'bold',
        }).setOrigin(0.5);
        const returnToMain = () => this.scene.start('main');
        const setBackSelected = (selected: boolean) => {
            backSelected = selected;
            back.setFillStyle(selected ? UI_THEME.amber : UI_THEME.panel);
            back.setStrokeStyle(1, selected ? UI_THEME.amberHighlight : UI_THEME.borderMuted);
            backLabel.setColor(selected ? UI_THEME.menuSelectedTextHex : UI_THEME.menuTextHex);
        };
        const scroll = (direction: number) => {
            const next = Phaser.Math.Clamp(scrollIndex + Math.sign(direction), 0, Math.max(0, ASSET_ATTRIBUTIONS.length - visibleRowCount));
            if (next !== scrollIndex) { scrollIndex = next; render(); }
        };
        const onWheel = (_pointer: Phaser.Input.Pointer, _over: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => scroll(deltaY);
        back.on('pointerup', returnToMain);
        back.on('pointerover', () => {
            setBackSelected(true);
        });
        back.on('pointerout', () => {
            setBackSelected(false);
        });
        const scrollUp = () => {
            if (backSelected) { setBackSelected(false); return; }
            scrollIndex = Phaser.Math.Clamp(scrollIndex - 1, 0, Math.max(0, ASSET_ATTRIBUTIONS.length - visibleRowCount));
            render();
        };
        const scrollDown = () => {
            const lastScrollIndex = Math.max(0, ASSET_ATTRIBUTIONS.length - visibleRowCount);
            if (scrollIndex >= lastScrollIndex) setBackSelected(true);
            else {
                scrollIndex = Phaser.Math.Clamp(scrollIndex + 1, 0, lastScrollIndex);
                render();
            }
        };
        const activate = () => { if (backSelected) returnToMain(); };
        const focusBack = () => setBackSelected(true);
        const onPointerDown = (pointer: Phaser.Input.Pointer) => {
            if (pointer.y < listTop || pointer.y > listBottom) return;
            dragPointerId = pointer.id;
            dragLastY = pointer.y;
        };
        const onPointerMove = (pointer: Phaser.Input.Pointer) => {
            if (dragPointerId !== pointer.id) return;
            const distance = dragLastY - pointer.y;
            if (Math.abs(distance) < rowHeight) return;
            scroll(distance);
            dragLastY = pointer.y;
        };
        const onPointerEnd = (pointer: Phaser.Input.Pointer) => {
            if (dragPointerId !== pointer.id) return;
            if (Math.abs(dragLastY - pointer.y) >= rowHeight / 3)
                scroll(dragLastY - pointer.y);
            dragPointerId = null;
        };
        this.input.on('wheel', onWheel);
        this.input.on('pointerdown', onPointerDown);
        this.input.on('pointermove', onPointerMove);
        this.input.on('pointerup', onPointerEnd);
        this.input.on('pointerupoutside', onPointerEnd);
        this.input.keyboard?.on('keydown-UP', scrollUp);
        this.input.keyboard?.on('keydown-DOWN', scrollDown);
        this.input.keyboard?.on('keydown-TAB', focusBack);
        this.input.keyboard?.on('keydown-ENTER', activate);
        this.input.keyboard?.on('keydown-SPACE', activate);
        this.input.keyboard?.on('keydown-ESC', returnToMain);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.off('wheel', onWheel);
            this.input.off('pointerdown', onPointerDown);
            this.input.off('pointermove', onPointerMove);
            this.input.off('pointerup', onPointerEnd);
            this.input.off('pointerupoutside', onPointerEnd);
            this.input.keyboard?.off('keydown-UP', scrollUp);
            this.input.keyboard?.off('keydown-DOWN', scrollDown);
            this.input.keyboard?.off('keydown-TAB', focusBack);
            this.input.keyboard?.off('keydown-ENTER', activate);
            this.input.keyboard?.off('keydown-SPACE', activate);
            this.input.keyboard?.off('keydown-ESC', returnToMain);
        });
        render();
    }
}
