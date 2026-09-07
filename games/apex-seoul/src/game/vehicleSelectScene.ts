import Phaser from 'phaser';

import type { RunSetup } from './runSetup';
import { UI_THEME } from './uiTheme';

const COLORS = ['blue', 'red', 'silver', 'black'] as const;
const COLOR_HEX: Record<(typeof COLORS)[number], number> = {
    black: 0x252a34,
    blue: 0x2e74c9,
    red: 0xd55061,
    silver: 0xc9d2de,
};
const VEHICLES = [
    { id: 'raven-coupe', label: 'RAVEN COUPE', spec: 'STREET DOWNHILL SPEC' },
    { id: 'seorin-gt', label: 'SEORIN GT', spec: 'GRAND TOURING SPEC' },
    { id: 'mirae-gt', label: 'MIRAE GT', spec: 'APEX SPORT SPEC' },
] as const;
const TURNTABLE_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1] as const;
const TURNTABLE_FLIPS = [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
] as const;

type SetupStep = 0 | 1 | 2 | 3;

/** Garage flow: vehicle, colour, course, then a final start confirmation. */
export class VehicleSelectScene extends Phaser.Scene {
    private colorIndex = 0;
    private lastPreviewFrame = -1;
    private previewShadow!: Phaser.GameObjects.Image;
    private previewVehicle!: Phaser.GameObjects.Image;
    private step: SetupStep = 0;
    private vehicleIndex = 0;

    constructor() {
        super('vehicle-select');
    }

    create() {
        const { width, height } = this.scale;
        const compact = width < 680;
        const panelWidth = compact ? width - 48 : Math.min(430, width * 0.38);
        const panelX = compact ? 24 : width - panelWidth - 46;
        const previewX = compact ? width * 0.36 : width * 0.35;
        const previewY = height * 0.52;
        const previewSize = compact ? 310 : 420;
        const panelObjects: Phaser.GameObjects.GameObject[] = [];
        const stepLabels: Phaser.GameObjects.Text[] = [];
        const stepNumbers: Phaser.GameObjects.Text[] = [];
        const selectedName = this.add
            .text(compact ? 30 : 58, height * 0.25, '', {
                color: UI_THEME.textMainHex,
                fontFamily: 'Arial, sans-serif',
                fontSize: compact ? '24px' : '31px',
                fontStyle: 'bold italic',
            })
            .setDepth(1);
        const selectedSpec = this.add
            .text(compact ? 30 : 58, height * 0.25 + 36, '', {
                color: UI_THEME.secondaryTextHex,
                fontFamily: 'monospace',
                fontSize: '11px',
                letterSpacing: 1,
            })
            .setDepth(1);
        const footerHint = this.add
            .text(width / 2, height - 30, '', {
                color: UI_THEME.hintHex,
                fontFamily: 'monospace',
                fontSize: '10px',
                letterSpacing: 1,
            })
            .setOrigin(0.5)
            .setDepth(1);

        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        const graphics = this.add.graphics();
        graphics.fillStyle(UI_THEME.background, 1).fillRect(0, 0, width, height);
        graphics.fillStyle(UI_THEME.nightBlue, 0.88).fillRect(0, 0, width, 126);
        graphics.lineStyle(2, UI_THEME.amber, 0.9).lineBetween(0, 124, width, 124);
        graphics
            .fillStyle(UI_THEME.panel, 0.94)
            .fillRoundedRect(panelX, 160, panelWidth, height - 244, 4);
        graphics
            .lineStyle(1, UI_THEME.borderMuted, 1)
            .strokeRoundedRect(panelX, 160, panelWidth, height - 244, 4);
        graphics
            .fillStyle(0x0d2740, 0.45)
            .fillEllipse(
                previewX,
                previewY + previewSize * 0.34,
                compact ? 340 : 520,
                compact ? 70 : 92,
            );
        graphics.lineStyle(1, UI_THEME.amber, 0.22);
        for (let x = 0; x < (compact ? width : panelX - 28); x += 42)
            graphics.lineBetween(x, height, x + 120, 126);

        this.add
            .text(width / 2, 43, 'RACE SETUP', {
                color: UI_THEME.textMainHex,
                fontFamily: 'Arial, sans-serif',
                fontSize: compact ? '34px' : '42px',
                fontStyle: 'bold italic',
                letterSpacing: 3,
                stroke: UI_THEME.titleShadowHex,
                strokeThickness: 2,
            })
            .setOrigin(0.5);
        const steps = ['VEHICLE', 'COLOUR', 'COURSE'];
        steps.forEach((label, index) => {
            const x = panelX + 34 + index * ((panelWidth - 68) / 3);
            stepNumbers.push(
                this.add.text(x, 184, `0${index + 1}`, {
                    color: UI_THEME.secondaryTextHex,
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    fontStyle: 'bold',
                }),
            );
            stepLabels.push(
                this.add.text(x, 202, label, {
                    color: UI_THEME.secondaryTextHex,
                    fontFamily: 'monospace',
                    fontSize: compact ? '9px' : '10px',
                    fontStyle: 'bold',
                    letterSpacing: 1,
                }),
            );
            if (index < steps.length - 1)
                graphics
                    .lineStyle(1, UI_THEME.borderMuted, 0.8)
                    .lineBetween(x + 70, 189, x + (panelWidth - 68) / 3 - 14, 189);
        });

        this.previewShadow = this.add
            .image(previewX, previewY, 'player-vehicle-raven-coupe-shadow', 0)
            .setDisplaySize(previewSize, previewSize)
            .setAlpha(0.58);
        this.previewVehicle = this.add
            .image(previewX, previewY, 'player-vehicle-raven-coupe-blue', 0)
            .setDisplaySize(previewSize, previewSize);

        const currentVehicle = () => VEHICLES[this.vehicleIndex];
        const currentColor = () => COLORS[this.colorIndex];
        const clearPanel = () => {
            while (panelObjects.length) panelObjects.pop()?.destroy();
        };
        const addPanel = <T extends Phaser.GameObjects.GameObject>(object: T) => {
            panelObjects.push(object);
            return object;
        };
        const button = (
            x: number,
            y: number,
            buttonWidth: number,
            buttonHeight: number,
            label: string,
            active: boolean,
            onClick: () => void,
        ) => {
            const rectangle = addPanel(
                this.add
                    .rectangle(
                        x,
                        y,
                        buttonWidth,
                        buttonHeight,
                        active ? UI_THEME.amber : UI_THEME.background,
                    )
                    .setStrokeStyle(
                        1,
                        active ? UI_THEME.amberHighlight : UI_THEME.borderMuted,
                    )
                    .setInteractive({ useHandCursor: true }),
            );
            const text = addPanel(
                this.add
                    .text(x, y, label, {
                        color: active
                            ? UI_THEME.menuSelectedTextHex
                            : UI_THEME.menuTextHex,
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '13px',
                        fontStyle: 'bold',
                    })
                    .setOrigin(0.5),
            );
            rectangle.on('pointerover', () => {
                rectangle.setStrokeStyle(2, UI_THEME.amberHighlight);
                text.setColor(
                    active ? UI_THEME.menuSelectedTextHex : UI_THEME.textMainHex,
                );
            });
            rectangle.on('pointerout', () => {
                rectangle.setStrokeStyle(
                    1,
                    active ? UI_THEME.amberHighlight : UI_THEME.borderMuted,
                );
                text.setColor(
                    active ? UI_THEME.menuSelectedTextHex : UI_THEME.menuTextHex,
                );
            });
            rectangle.on('pointerup', onClick);
        };
        const refreshPreview = () => {
            const vehicle = currentVehicle();
            const color = currentColor();
            this.previewVehicle.setTexture(`player-vehicle-${vehicle.id}-${color}`, 0);
            this.previewShadow.setTexture(`player-vehicle-${vehicle.id}-shadow`, 0);
            selectedName.setText(vehicle.label);
            selectedSpec.setText(
                `VEHICLE ${String(this.vehicleIndex + 1).padStart(2, '0')}  //  ${vehicle.spec}`,
            );
            this.lastPreviewFrame = -1;
        };
        const selectVehicle = (index: number) => {
            this.vehicleIndex = Phaser.Math.Wrap(index, 0, VEHICLES.length);
            refreshPreview();
            renderPanel();
        };
        const selectColor = (index: number) => {
            this.colorIndex = Phaser.Math.Wrap(index, 0, COLORS.length);
            refreshPreview();
            renderPanel();
        };
        const launch = () => {
            const runSetup: RunSetup = {
                trackId: 'bugak-ridge-downhill',
                vehicleColor: currentColor(),
                vehicleId: currentVehicle().id,
            };
            this.scene.start('time-attack', runSetup);
        };
        const nextStep = () => {
            if (this.step === 3) launch();
            else {
                this.step = (this.step + 1) as SetupStep;
                renderPanel();
            }
        };
        const previousStep = () => {
            if (this.step === 0) this.scene.start('main');
            else {
                this.step = (this.step - 1) as SetupStep;
                renderPanel();
            }
        };
        const renderPanel = () => {
            clearPanel();
            refreshPreview();
            stepLabels.forEach((label, index) =>
                label.setColor(
                    index === this.step
                        ? UI_THEME.amberHex
                        : index < this.step
                          ? UI_THEME.textMainHex
                          : UI_THEME.secondaryTextHex,
                ),
            );
            stepNumbers.forEach((label, index) =>
                label.setColor(
                    index === this.step
                        ? UI_THEME.amberHighlightHex
                        : index < this.step
                          ? UI_THEME.textMainHex
                          : UI_THEME.secondaryTextHex,
                ),
            );
            const innerX = panelX + 26;
            const innerWidth = panelWidth - 52;
            if (this.step === 0) {
                addPanel(
                    this.add.text(innerX, 246, 'SELECT VEHICLE', {
                        color: UI_THEME.amberHex,
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        letterSpacing: 2,
                    }),
                );
                addPanel(
                    this.add.text(innerX, 274, 'CHOOSE YOUR DOWNHILL MACHINE', {
                        color: UI_THEME.secondaryTextHex,
                        fontFamily: 'monospace',
                        fontSize: '10px',
                    }),
                );
                VEHICLES.forEach((vehicle, index) =>
                    button(
                        panelX + panelWidth / 2,
                        324 + index * 60,
                        innerWidth,
                        46,
                        vehicle.label,
                        index === this.vehicleIndex,
                        () => selectVehicle(index),
                    ),
                );
                button(
                    panelX + panelWidth / 2,
                    height - 126,
                    innerWidth,
                    48,
                    'CONFIRM VEHICLE  ›',
                    true,
                    nextStep,
                );
                footerHint.setText(
                    '← → ↑ ↓  CHOOSE VEHICLE     ENTER  CONFIRM     ESC  BACK',
                );
            } else if (this.step === 1) {
                addPanel(
                    this.add.text(innerX, 246, 'SELECT COLOUR', {
                        color: UI_THEME.amberHex,
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        letterSpacing: 2,
                    }),
                );
                addPanel(
                    this.add.text(
                        innerX,
                        274,
                        `${currentVehicle().label}  //  BODY PALETTE`,
                        {
                            color: UI_THEME.secondaryTextHex,
                            fontFamily: 'monospace',
                            fontSize: '10px',
                        },
                    ),
                );
                COLORS.forEach((color, index) => {
                    const column = index % 2;
                    const row = Math.floor(index / 2);
                    const x = innerX + column * (innerWidth / 2) + innerWidth / 4;
                    const y = 334 + row * 76;
                    const active = index === this.colorIndex;
                    const swatch = addPanel(
                        this.add
                            .rectangle(
                                x,
                                y,
                                innerWidth / 2 - 12,
                                58,
                                active ? UI_THEME.amber : UI_THEME.background,
                            )
                            .setStrokeStyle(
                                1,
                                active ? UI_THEME.amberHighlight : UI_THEME.borderMuted,
                            )
                            .setInteractive({ useHandCursor: true }),
                    );
                    addPanel(
                        this.add
                            .rectangle(x - 34, y, 30, 30, COLOR_HEX[color])
                            .setStrokeStyle(
                                active ? 2 : 1,
                                active ? UI_THEME.textMainHex : UI_THEME.borderMuted,
                            ),
                    );
                    addPanel(
                        this.add
                            .text(x + 2, y, color.toUpperCase(), {
                                color: active
                                    ? UI_THEME.menuSelectedTextHex
                                    : UI_THEME.menuTextHex,
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                fontStyle: 'bold',
                            })
                            .setOrigin(0, 0.5),
                    );
                    swatch.on('pointerup', () => selectColor(index));
                });
                button(
                    panelX + panelWidth / 2,
                    height - 126,
                    innerWidth,
                    48,
                    'CONFIRM COLOUR  ›',
                    true,
                    nextStep,
                );
                footerHint.setText(
                    '← → ↑ ↓  CHOOSE COLOUR     ENTER  CONFIRM     ESC  BACK',
                );
            } else if (this.step === 2) {
                addPanel(
                    this.add.text(innerX, 246, 'SELECT COURSE', {
                        color: UI_THEME.amberHex,
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        letterSpacing: 2,
                    }),
                );
                addPanel(
                    this.add.text(innerX, 274, 'ONE COURSE AVAILABLE IN THIS BUILD', {
                        color: UI_THEME.secondaryTextHex,
                        fontFamily: 'monospace',
                        fontSize: '10px',
                    }),
                );
                addPanel(
                    this.add
                        .rectangle(
                            panelX + panelWidth / 2,
                            350,
                            innerWidth,
                            112,
                            UI_THEME.amber,
                        )
                        .setStrokeStyle(2, UI_THEME.amberHighlight),
                );
                addPanel(
                    this.add.text(innerX + 16, 322, 'BUGAK RIDGE DOWNHILL', {
                        color: UI_THEME.menuSelectedTextHex,
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '18px',
                        fontStyle: 'bold',
                    }),
                );
                addPanel(
                    this.add.text(
                        innerX + 16,
                        356,
                        'NIGHT  //  1 LAP  //  TIME ATTACK',
                        {
                            color: UI_THEME.menuSelectedTextHex,
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            fontStyle: 'bold',
                        },
                    ),
                );
                addPanel(
                    this.add.text(innerX + 16, 382, 'SEOUL · BUGAK MOUNTAIN RIDGE', {
                        color: UI_THEME.menuSelectedTextHex,
                        fontFamily: 'monospace',
                        fontSize: '10px',
                    }),
                );
                button(
                    panelX + panelWidth / 2,
                    height - 126,
                    innerWidth,
                    48,
                    'CONFIRM COURSE  ›',
                    true,
                    nextStep,
                );
                footerHint.setText('ENTER  CONFIRM COURSE     ESC  BACK');
            } else {
                addPanel(
                    this.add.text(innerX, 246, 'RUN READY', {
                        color: UI_THEME.amberHex,
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        letterSpacing: 2,
                    }),
                );
                const summary = [
                    currentVehicle().label,
                    currentColor().toUpperCase(),
                    'BUGAK RIDGE DOWNHILL',
                ];
                summary.forEach((entry, index) => {
                    const y = 300 + index * 48;
                    addPanel(
                        this.add.text(
                            innerX,
                            y,
                            ['VEHICLE', 'COLOUR', 'COURSE'][index],
                            {
                                color: UI_THEME.secondaryTextHex,
                                fontFamily: 'monospace',
                                fontSize: '10px',
                                letterSpacing: 1,
                            },
                        ),
                    );
                    addPanel(
                        this.add.text(innerX, y + 18, entry, {
                            color: UI_THEME.textMainHex,
                            fontFamily: 'Arial, sans-serif',
                            fontSize: '16px',
                            fontStyle: 'bold',
                        }),
                    );
                });
                button(
                    panelX + panelWidth / 2,
                    height - 126,
                    innerWidth,
                    52,
                    'START TIME ATTACK  ›',
                    true,
                    launch,
                );
                footerHint.setText('ENTER  START TIME ATTACK     ESC  CHANGE COURSE');
            }
        };

        refreshPreview();
        renderPanel();
        this.input.keyboard?.on('keydown-LEFT', () => {
            if (this.step === 0) selectVehicle(this.vehicleIndex - 1);
            if (this.step === 1)
                selectColor(
                    this.colorIndex % 2 === 0
                        ? this.colorIndex + 1
                        : this.colorIndex - 1,
                );
        });
        this.input.keyboard?.on('keydown-RIGHT', () => {
            if (this.step === 0) selectVehicle(this.vehicleIndex + 1);
            if (this.step === 1)
                selectColor(
                    this.colorIndex % 2 === 0
                        ? this.colorIndex + 1
                        : this.colorIndex - 1,
                );
        });
        this.input.keyboard?.on('keydown-UP', () => {
            if (this.step === 0) selectVehicle(this.vehicleIndex - 1);
            if (this.step === 1) selectColor((this.colorIndex + 2) % COLORS.length);
        });
        this.input.keyboard?.on('keydown-DOWN', () => {
            if (this.step === 0) selectVehicle(this.vehicleIndex + 1);
            if (this.step === 1) selectColor((this.colorIndex + 2) % COLORS.length);
        });
        this.input.keyboard?.on('keydown-ENTER', nextStep);
        this.input.keyboard?.on('keydown-SPACE', nextStep);
        this.input.keyboard?.on('keydown-ESC', previousStep);
    }

    update(time: number) {
        const frameIndex =
            Math.floor(time / (this.step === 2 ? 190 : 115)) % TURNTABLE_FRAMES.length;
        if (frameIndex === this.lastPreviewFrame) return;
        this.lastPreviewFrame = frameIndex;
        const frame = TURNTABLE_FRAMES[frameIndex];
        const flipX = TURNTABLE_FLIPS[frameIndex];
        this.previewVehicle?.setFrame(frame).setFlipX(flipX);
        this.previewShadow?.setFrame(frame).setFlipX(flipX);
    }
}
