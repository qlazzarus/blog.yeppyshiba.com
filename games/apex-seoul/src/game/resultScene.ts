import { splitLines, finishRecordLabel, formatDelta, type BestSnapshots } from './runComparison';
import type { RunSetup } from './runSetup';
import { runRecordStore, type SaveStatus } from './runRecord';
import Phaser from 'phaser';
import { getSceneMobileDisplayMetrics } from './platform/mobileDisplay';
import { UI_THEME } from './uiTheme';

export type TimeAttackResult = {
    recordRunId?: string; // Present when the run was accepted, including memory-only storage.
    bestSnapshot?: BestSnapshots;
    recoveryCount?: number;
    bestTimeSec: number | null;
    previousBestTimeSec: number | null;
    runSetup: RunSetup;
    recordStatus: SaveStatus;
    checkpointTimesSec: Array<number | null>;
    color: string;
    courseName: string;
    deltaSec: number | null;
    finishTimeSec: number;
    isNewBest: boolean;
    vehicleName: string;
};

function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds - minutes * 60).toFixed(2).padStart(5, '0')}`;
}

/** Result actions and optional name entry for an accepted finish. */
export class ResultScene extends Phaser.Scene {
    constructor() { super('result'); }

    create(result: TimeAttackResult) {
        let selectedIndex = 0;
        let leaving = false;
        let nameEntryOpen = false;
        const activate = () => {
            if (leaving || nameEntryOpen) return;
            leaving = true;
            if (selectedIndex === 0) this.scene.start('time-attack', result.runSetup);
            else this.scene.start('main');
        };

        const select = (index: number) => {
            selectedIndex = index;
            updateSelection(selectedIndex);
        };
        let updateSelection = this.drawResult(result, select, activate);
        const layout = () => {
            for (const child of this.children.getChildren().slice()) child.destroy();
            updateSelection = this.drawResult(result, select, activate);
            updateSelection(selectedIndex);
        };
        this.scale.on('resize', layout);
        const move = (event: KeyboardEvent) => {
            if (!nameEntryOpen && !event.repeat) select(1 - selectedIndex);
        };
        const confirm = (event: KeyboardEvent) => {
            if (!event.repeat) activate();
        };
        const keyboard = this.input.keyboard;
        keyboard?.on('keydown-UP', move);
        keyboard?.on('keydown-DOWN', move);
        keyboard?.on('keydown-ENTER', confirm);
        keyboard?.on('keydown-SPACE', confirm);
        let closeNameEntry = () => {};
        if (result.recordRunId && ['saved', 'memory-only'].includes(result.recordStatus)) {
            nameEntryOpen = true;
            const keyboardEnabled = keyboard?.enabled ?? false;
            if (keyboard) keyboard.enabled = false;
            closeNameEntry = this.showNameEntry(result.recordRunId, () => {
                nameEntryOpen = false;
                if (keyboard) keyboard.enabled = keyboardEnabled;
            }, () => { result.recordStatus = 'saved'; layout(); });
        }
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            closeNameEntry();
            this.scale.off('resize', layout);
            keyboard?.off('keydown-UP', move);
            keyboard?.off('keydown-DOWN', move);
            keyboard?.off('keydown-ENTER', confirm);
            keyboard?.off('keydown-SPACE', confirm);
        });
    }

    private showNameEntry(runId: string, onClose: () => void, onRecordSaved: () => void) {
        const dialog = document.createElement('dialog');
        dialog.setAttribute('aria-label', 'Record name');
        dialog.style.cssText = `background:${UI_THEME.backgroundHex};color:${UI_THEME.textMainHex};
            border:2px solid ${UI_THEME.amberHex};border-radius:8px;padding:16px;
            width:min(360px,calc(100vw - 64px));max-height:calc(100dvh - 64px);overflow:auto;
            font:16px Arial,sans-serif;box-sizing:border-box;`;
        const heading = document.createElement('h2');
        heading.textContent = 'RECORD NAME';
        heading.style.cssText = 'font-size:20px;margin:0 0 12px';
        dialog.append(heading);
        const letters = document.createElement('div');
        letters.style.cssText = 'display:flex;gap:12px;justify-content:center';
        const saved = runRecordStore.getLastPlayerName();
        const initial = /^[A-Z]{3}$/.test(saved) ? saved : 'AAA';
        const selectors: HTMLSelectElement[] = [];
        for (let index = 0; index < 3; index++) {
            const select = document.createElement('select');
            select.setAttribute('aria-label', `Letter ${index + 1}`);
            select.style.cssText = 'font-size:24px;min-width:64px;min-height:48px;text-align:center';
            for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') select.add(new Option(letter, letter));
            select.value = initial[index];
            selectors.push(select);
            letters.append(select);
        }
        dialog.append(letters);
        const status = document.createElement('p');
        status.setAttribute('role', 'status');
        status.style.cssText = 'font-size:14px;margin:12px 0;line-height:1.4';
        status.textContent = 'Choose three letters. Use left/right to move.';
        dialog.append(status);
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:12px';
        const save = document.createElement('button');
        save.textContent = 'SAVE NAME';
        const skip = document.createElement('button');
        skip.textContent = 'SKIP';
        for (const button of [save, skip]) {
            button.type = 'button';
            button.style.cssText = 'min-height:48px;flex:1;font-size:16px';
            actions.append(button);
        }
        dialog.append(actions);
        let closed = false;
        const close = () => {
            if (closed) return;
            closed = true;
            dialog.close();
            dialog.remove();
            onClose();
        };
        const submit = () => {
            if (closed) return;
            const result = runRecordStore.updateRunName(runId, selectors.map(select => select.value).join(''));
            if (result.recordStatus === 'saved') onRecordSaved();
            if (result.recordStatus === 'saved' && result.profileStatus === 'saved') {
                close();
                return;
            }
            status.textContent = result.recordStatus === 'saved'
                ? 'Record name saved. Last name preference could not be saved. Retry or continue.'
                : result.recordStatus === 'memory-only'
                    ? 'Name kept for this session. Browser storage failed. Retry or continue.'
                    : 'Name could not be updated. Your completed run is kept. Continue to results.';
            skip.textContent = 'CONTINUE';
        };
        save.addEventListener('click', submit);
        skip.addEventListener('click', close);
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
        dialog.addEventListener('keydown', event => {
            event.stopPropagation();
            if (event.repeat) { event.preventDefault(); return; }
            const index = selectors.indexOf(document.activeElement as HTMLSelectElement);
            if (index >= 0 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                event.preventDefault();
                selectors[(index + (event.key === 'ArrowLeft' ? 2 : 1)) % 3].focus();
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                if (document.activeElement === skip) close();
                else submit();
            }
        });
        document.body.append(dialog);
        dialog.showModal();
        selectors[0].focus();
        return close;
    }

    private drawResult(result: TimeAttackResult, select: (index: number) => void, activate: () => void) {
        const { width, height } = this.scale;
        const { cssWidth, cssHeight } = getSceneMobileDisplayMetrics(this);
        const compact = cssWidth < 680 || cssHeight < 480;
        const panelWidth = compact ? width - 48 : Math.min(580, width - 48);
        const panelX = (width - panelWidth) / 2;
        const graphics = this.add.graphics();

        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        graphics.fillStyle(UI_THEME.background, 1).fillRect(0, 0, width, height);
        graphics.fillStyle(UI_THEME.nightBlue, 0.86).fillRect(0, 0, width, compact ? 184 : 156);
        graphics.lineStyle(2, UI_THEME.amber, 0.9).lineBetween(0, compact ? 182 : 154, width, compact ? 182 : 154);
        graphics.fillStyle(UI_THEME.panel, 0.97).fillRoundedRect(panelX, compact ? 218 : 184, panelWidth, height - (compact ? 246 : 272), 4);
        graphics.lineStyle(1, UI_THEME.borderMuted, 1).strokeRoundedRect(panelX, compact ? 218 : 184, panelWidth, height - (compact ? 246 : 272), 4);

        this.add.text(width / 2, 38, result.isNewBest ? (result.previousBestTimeSec === null ? 'FIRST RECORD' : 'NEW BEST') : 'TIME ATTACK COMPLETE', {
            color: result.isNewBest ? UI_THEME.amberHighlightHex : UI_THEME.textMainHex,
            fontFamily: 'Arial, sans-serif', fontSize: '38px', fontStyle: 'bold italic', letterSpacing: 3,
            stroke: UI_THEME.titleShadowHex, strokeThickness: 2,
        }).setOrigin(0.5);
        this.add.text(width / 2, 96, formatTime(result.finishTimeSec), {
            color: UI_THEME.textMainHex, fontFamily: 'Arial, sans-serif', fontSize: '56px', fontStyle: 'bold italic',
            stroke: UI_THEME.titleShadowHex, strokeThickness: 2,
        }).setOrigin(0.5);

        const bestLine = result.recordStatus === 'excluded' ? 'PRACTICE RUN' : result.previousBestTimeSec === null
            ? 'FIRST RECORDED RUN'
            : result.isNewBest
                ? `PREVIOUS BEST  ${formatTime(result.previousBestTimeSec)}`
                : `BEST  ${formatTime(result.bestTimeSec ?? result.finishTimeSec)}`;
        const snapshot = result.bestSnapshot ?? { overall: null, vehicle: null };
        const deltaLine = result.deltaSec === null ? 'NO PREVIOUS RECORD' : `${result.deltaSec <= 0 ? '-' : '+'}${formatTime(Math.abs(result.deltaSec))} FROM BEST`;
        this.add.text(width / 2, compact ? 152 : 138, result.bestSnapshot ? splitLines(snapshot, result.finishTimeSec) : `${bestLine}  //  ${deltaLine}`, {
            color: UI_THEME.secondaryTextHex, fontFamily: 'monospace', fontSize: compact ? '21px' : '11px', letterSpacing: 1,
        }).setOrigin(0.5);
        if (result.recordStatus !== 'saved') this.add.text(width / 2, compact ? 201 : 172, result.recordStatus === 'excluded' ? 'PRACTICE — RECORD NOT SAVED' : 'RECORD NOT SAVED TO BROWSER', {
            color: UI_THEME.amberHex, fontFamily: 'monospace', fontSize: compact ? '20px' : '11px',
        }).setOrigin(0.5);
        this.add.text(panelX + 28, compact ? 232 : 214, result.courseName.toUpperCase(), {
            color: UI_THEME.amberHex, fontFamily: 'monospace', fontSize: compact ? '22px' : '12px', letterSpacing: 2,
        });
        this.add.text(panelX + 28, compact ? 263 : 242, `${result.vehicleName.toUpperCase()}  //  ${result.color.toUpperCase()}`, {
            color: UI_THEME.menuTextHex, fontFamily: 'Arial, sans-serif', fontSize: compact ? '28px' : '18px', fontStyle: 'bold',
        });
        this.add.text(panelX + 28, compact ? 305 : 276, `${result.recordStatus === 'excluded' ? 'PRACTICE' : `ALL ${finishRecordLabel(result.finishTimeSec, snapshot.overall)} · CAR ${finishRecordLabel(result.finishTimeSec, snapshot.vehicle)}`} · RECOVERIES ${result.recoveryCount ?? 0}`, { color: UI_THEME.amberHex, fontFamily: 'monospace', fontSize: compact ? '22px' : '11px' });
        this.add.text(panelX + 28, compact ? 352 : 303, 'CHECKPOINT SPLITS · ALL / CAR', {
            color: UI_THEME.amberHex, fontFamily: 'monospace', fontSize: compact ? '22px' : '12px', letterSpacing: 2,
        });
        result.checkpointTimesSec.forEach((time, index) => {
            const y = compact ? 396 + index * 46 : 330 + index * 36;
            this.add.text(panelX + 28, y, `CP ${index + 1}`, {
                color: UI_THEME.secondaryTextHex, fontFamily: 'monospace', fontSize: compact ? '22px' : '12px',
            });
            this.add.text(panelX + panelWidth - 28, y, `${time === null ? '--:--.--' : formatTime(time)}${compact ? '     ' : '\n'}${formatDelta(time, snapshot.overall?.checkpointTimesSec[index])} / ${formatDelta(time, snapshot.vehicle?.checkpointTimesSec[index])}`, {
                color: UI_THEME.textMainHex, fontFamily: 'monospace', fontSize: compact ? '22px' : '11px',
            }).setOrigin(1, 0);
        });

        const actionLabels = ['RETRY', 'MAIN MENU'] as const;
        const actionButtons: Phaser.GameObjects.Rectangle[] = [];
        const actionText: Phaser.GameObjects.Text[] = [];
        actionLabels.forEach((label, index) => {
            const buttonHeight = compact ? Math.max(96, Math.ceil(46 * height / cssHeight)) : 42;
            const buttonWidth = compact ? (panelWidth - 80) / 2 : panelWidth - 56;
            const x = compact ? panelX + 28 + buttonWidth / 2 + index * (buttonWidth + 24) : width / 2;
            const y = compact ? height - 44 - buttonHeight / 2 : height - 142 + index * 56;
            const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, index === 0 ? UI_THEME.amber : UI_THEME.background)
                .setStrokeStyle(1, index === 0 ? UI_THEME.amberHighlight : UI_THEME.borderMuted)
                .setInteractive({ useHandCursor: true });
            const text = this.add.text(x, y, `${label}${index === 0 ? '  ›' : ''}`, {
                color: index === 0 ? UI_THEME.menuSelectedTextHex : UI_THEME.menuTextHex,
                fontFamily: 'Arial, sans-serif', fontSize: compact ? '30px' : '17px', fontStyle: 'bold', letterSpacing: 2,
            }).setOrigin(0.5);
            button.on('pointerover', () => select(index));
            button.on('pointerup', () => { select(index); activate(); });
            actionButtons.push(button);
            actionText.push(text);
        });
        return (selectedIndex: number) => {
            actionButtons.forEach((button, index) => button.setFillStyle(index === selectedIndex ? UI_THEME.amber : UI_THEME.background));
            actionText.forEach((label, index) => label.setColor(index === selectedIndex ? UI_THEME.menuSelectedTextHex : UI_THEME.menuTextHex));
        };
    }
}
