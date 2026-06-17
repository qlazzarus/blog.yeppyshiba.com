---
title: Phaser 4 Isometric Minesweeper 4편 — 난이도, 타이머, 렌더링 polish 넣기
date: 2026-06-17T09:00:00+09:00
summary: 지뢰찾기에 난이도 선택과 타이머를 붙이고, 텍스트로 표시하던 깃발과 지뢰를 Phaser Graphics 기반 아이콘으로 바꿔 게임다운 화면으로 다듬었습니다.
image: /images/posts/202606/isometric-minesweeper-difficulty-timer-polish.png
category: coding
tags:
    - phaser
    - phaser4
    - ecs
    - isometric
    - minesweeper
    - webgame
    - game-dev
    - typescript
---

## 들어가며

[지난 글](/article/phaser4-isometric-minesweeper-reveal-cascade-reset/)에서는 Isometric Minesweeper에 빈 칸 연쇄 오픈과 새 게임 흐름을 넣었다.

그때까지 구현한 내용은 다음과 같았다.

- 첫 클릭 이후 지뢰 배치
- 첫 클릭 주변 안전 처리
- 주변 지뢰 수 계산
- 좌클릭 reveal
- 우클릭 flag
- 빈 칸 연쇄 오픈
- 새 게임 버튼
- 남은 지뢰 수 UI

이 정도면 규칙만 놓고 봤을 때는 꽤 지뢰찾기다워졌다.

하지만 실제로 플레이해보면 아직 데모 냄새가 강했다.

보드는 항상 10x10이었고, 시간도 없었고, 깃발과 지뢰는 `F`, `M` 텍스트로 표시했다.

기능은 있는데 게임처럼 보이지는 않았다.

그래서 이번에는 두 방향을 같이 진행했다.

- 난이도 선택과 타이머를 넣어 게임의 기본 틀을 만든다.
- 숫자, 깃발, 지뢰, 타일 색상을 다듬어 화면을 조금 더 게임답게 만든다.

현재 데모는 아래에서 볼 수 있다.

[Isometric Minesweeper 데모 보기](/games/isometric-minesweeper/)

<div style="position: relative; width: 100%; height: min(70vh, 560px); margin: 24px 0;">
    <iframe
        src="/play/isometric-minesweeper/"
        title="Isometric Minesweeper"
        loading="lazy"
        style="position: absolute; inset: 0; width: 100%; height: 100%; border: 1px solid #26343c; border-radius: 8px; background: #10161a;"
    ></iframe>
</div>

이번 구현 범위는 다음과 같다.

- Beginner / Standard / Expert 난이도 추가
- 난이도별 보드 크기와 지뢰 수 적용
- 큰 보드가 화면 안에 들어오도록 타일 크기 조정
- 첫 reveal 이후 타이머 시작
- 승리/패배 시 타이머 정지
- 새 게임과 난이도 변경 시 타이머 초기화
- 깃발과 지뢰를 Phaser Graphics로 직접 렌더링
- 숫자 라벨 크기와 색상 정리
- 타일 상태별 색상과 테두리 개선
- 게임 상태별 status text 색상 변경

처음에는 난이도와 타이머만 넣으려고 했다.

그런데 막상 구현해보니 블로그 한 편으로 쓰기에는 조금 얇았다. 기능적으로는 중요하지만, 화면 변화는 버튼과 시간 표시 정도였기 때문이다.

그래서 렌더링 polish 1차까지 묶었다.

이번 글의 주제는 “작동하는 지뢰찾기”를 “플레이하고 싶은 지뢰찾기” 쪽으로 한 번 밀어보는 것이다.

## 난이도 config 추가하기

지금까지 보드 크기와 지뢰 수는 상수였다.

```ts
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 10;
export const MINE_COUNT = 14;
```

처음 구현할 때는 이게 편하다.

하지만 난이도 선택이 들어오면 보드 크기와 지뢰 수가 한 묶음으로 움직여야 한다.

그래서 `DifficultyConfig`를 추가했다.

```ts
export type DifficultyId = 'beginner' | 'standard' | 'expert';

export type DifficultyConfig = {
    boardHeight: number;
    boardWidth: number;
    id: DifficultyId;
    label: string;
    mineCount: number;
};

export const DIFFICULTIES: DifficultyConfig[] = [
    {
        boardHeight: 8,
        boardWidth: 8,
        id: 'beginner',
        label: 'Beginner',
        mineCount: 10,
    },
    {
        boardHeight: BOARD_HEIGHT,
        boardWidth: BOARD_WIDTH,
        id: 'standard',
        label: 'Standard',
        mineCount: MINE_COUNT,
    },
    {
        boardHeight: 14,
        boardWidth: 14,
        id: 'expert',
        label: 'Expert',
        mineCount: 32,
    },
];
```

현재는 세 단계만 넣었다.

- Beginner: 8x8, 지뢰 10개
- Standard: 10x10, 지뢰 14개
- Expert: 14x14, 지뢰 32개

윈도우 지뢰찾기의 전통적인 난이도와 정확히 같지는 않다.

이 게임은 isometric 화면이라 보드가 정사각형으로 커질수록 가로 폭이 빨리 넓어진다. 그래서 현재 iframe 크기에서 무리 없이 보이는 범위로 먼저 잡았다.

## BoardLayout은 난이도를 받아서 만든다

기존 `createBoardLayout`은 viewport width만 받았다.

```ts
export function createBoardLayout(viewportWidth: number): BoardLayout {
    return {
        boardHeight: BOARD_HEIGHT,
        boardWidth: BOARD_WIDTH,
        mineCount: MINE_COUNT,
        originX: viewportWidth / 2,
        originY: BOARD_ORIGIN_Y,
        tileHeight: TILE_HEIGHT,
        tileWidth: TILE_WIDTH,
    };
}
```

이제는 난이도를 받아서 보드 크기와 지뢰 수를 결정한다.

```ts
export function createBoardLayout(
    viewportWidth: number,
    difficulty: DifficultyConfig = DIFFICULTIES[1],
): BoardLayout {
    const maxTileWidth = Math.floor((viewportWidth - 72) / difficulty.boardWidth);
    const tileWidth = Math.max(46, Math.min(TILE_WIDTH, maxTileWidth));
    const tileHeight = Math.round(tileWidth / 2);

    return {
        boardHeight: difficulty.boardHeight,
        boardWidth: difficulty.boardWidth,
        difficulty,
        hoverInset: HOVER_INSET,
        mineCount: difficulty.mineCount,
        originX: viewportWidth / 2,
        originY: BOARD_ORIGIN_Y,
        tileHeight,
        tileWidth,
    };
}
```

여기서 같이 처리한 것이 타일 크기다.

보드가 14x14가 되면 기존 72px 타일로는 화면에 꽉 차거나 넘칠 수 있다.

그래서 `viewportWidth`와 `boardWidth`를 기준으로 최대 타일 크기를 계산했다.

```ts
const maxTileWidth = Math.floor((viewportWidth - 72) / difficulty.boardWidth);
const tileWidth = Math.max(46, Math.min(TILE_WIDTH, maxTileWidth));
const tileHeight = Math.round(tileWidth / 2);
```

최대 크기는 기존 `TILE_WIDTH`를 넘지 않게 하고, 너무 작아지지 않도록 최소값은 46px로 막았다.

아직 완전한 반응형 대응은 아니다.

브라우저 resize 이벤트를 처리하지 않고, 시작 시점의 scale width를 기준으로 보드를 만든다. 그래도 난이도 변경에 따라 보드가 화면 밖으로 튀어나가는 문제는 줄일 수 있다.

## Scene은 현재 난이도를 들고 있다

난이도는 게임 규칙 그 자체라기보다는 현재 플레이 세션의 설정에 가깝다.

그래서 `World`에 넣지 않고 Phaser Scene이 들고 있게 했다.

```ts
class BootScene extends Phaser.Scene {
    private boardLayout!: BoardLayout;
    private difficulty: DifficultyConfig = DIFFICULTIES[1];
    private difficultyButtons: Phaser.GameObjects.Text[] = [];
    private world: World = createWorld();
}
```

새 게임을 시작할 때는 현재 난이도는 유지하고 `World`만 새로 만든다.

```ts
private resetGame() {
    this.resetTimer();
    this.world = createWorld();
    createBoardSystem(this.world, this.boardLayout);
    this.renderGame();
}
```

난이도를 바꿀 때는 `difficulty`와 `boardLayout`을 바꾼 뒤 같은 reset 흐름을 탄다.

```ts
private setDifficulty(difficulty: DifficultyConfig) {
    if (this.difficulty.id === difficulty.id) return;

    this.difficulty = difficulty;
    this.boardLayout = createBoardLayout(this.scale.width, difficulty);
    this.updateDifficultyButtons();
    this.resetGame();
}
```

이렇게 해두면 새 게임과 난이도 변경이 거의 같은 길을 지나간다.

차이는 난이도 변경에서는 layout을 먼저 다시 만든다는 것뿐이다.

## 타이머는 첫 reveal 이후에 시작한다

타이머는 언제 시작해야 할까?

페이지가 열리자마자 시작하면 사용자가 난이도를 고르거나 화면을 보는 시간까지 포함된다.

지뢰찾기에서는 보통 첫 클릭부터 시간을 잰다.

그래서 `revealTileSystem`이 처음으로 지뢰밭을 준비한 직후 타이머를 시작하도록 했다.

입력 처리 쪽에서는 클릭 전 상태를 기억해둔다.

```ts
const previousStatus = this.world.resources.gameStatus;
const result =
    pointer.rightButtonDown() || pointer.button === 2
        ? toggleFlagSystem(this.world, hoveredTile)
        : revealTileSystem(this.world, hoveredTile, this.boardLayout);

if (!result.changed) return;

this.syncTimerAfterAction(previousStatus);
this.renderGame();
```

그리고 action 이후 상태를 보고 타이머를 동기화한다.

```ts
private syncTimerAfterAction(previousStatus: string) {
    if (
        previousStatus === 'ready' &&
        this.world.resources.minefieldReady &&
        this.timerStartedAt === null
    ) {
        this.startTimer();
    }

    if (
        this.world.resources.gameStatus === 'won' ||
        this.world.resources.gameStatus === 'lost'
    ) {
        this.stopTimer();
    }
}
```

첫 reveal 전 상태가 `ready`였고, action 이후 `minefieldReady`가 true가 되었다면 그 클릭이 첫 reveal이다.

그때 타이머를 시작한다.

반대로 게임 상태가 `won` 또는 `lost`가 되면 타이머를 멈춘다.

## elapsedSeconds와 timerStartedAt을 분리했다

타이머 상태는 두 값으로 관리했다.

```ts
private elapsedSeconds = 0;
private timerStartedAt: number | null = null;
```

`timerStartedAt`이 있으면 현재 플레이 중이고, 없으면 타이머가 멈춘 상태다.

```ts
private getElapsedSeconds() {
    if (this.timerStartedAt === null) return this.elapsedSeconds;

    return Math.floor((this.time.now - this.timerStartedAt) / 1000);
}
```

게임이 끝나면 현재 값을 `elapsedSeconds`에 고정하고 `timerStartedAt`을 비운다.

```ts
private stopTimer() {
    this.elapsedSeconds = this.getElapsedSeconds();
    this.timerStartedAt = null;
}
```

새 게임을 시작하거나 난이도를 바꾸면 둘 다 초기화한다.

```ts
private resetTimer() {
    this.elapsedSeconds = 0;
    this.timerStartedAt = null;
}
```

이 구조는 나중에 localStorage 기록 저장으로 이어가기 좋다.

게임이 끝났을 때 `elapsedSeconds`와 `difficulty.id`를 같이 저장하면 난이도별 최고 기록을 만들 수 있다.

## UI는 아직 Phaser Text로 처리한다

난이도 버튼과 새 게임 버튼은 아직 Phaser `Text`로 만들었다.

```ts
this.difficultyButtons = DIFFICULTIES.map((difficulty, index) =>
    this.add
        .text(486 + index * 94, 24, difficulty.label, {
            align: 'center',
            backgroundColor: '#26343c',
            color: '#d7ded8',
            fixedWidth: 86,
            fontFamily: 'system-ui, sans-serif',
            fontSize: '12px',
            fontStyle: '700',
            padding: {
                bottom: 8,
                left: 8,
                right: 8,
                top: 8,
            },
        })
        .setDepth(10)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.setDifficulty(difficulty);
        }),
);
```

선택된 난이도는 배경색과 글자색을 바꿔 표시한다.

```ts
private updateDifficultyButtons() {
    this.difficultyButtons.forEach((button, index) => {
        const selected = DIFFICULTIES[index].id === this.difficulty.id;

        button.setStyle({
            backgroundColor: selected ? '#d9b85f' : '#26343c',
            color: selected ? '#182026' : '#d7ded8',
        });
    });
}
```

지금 단계에서는 충분하다.

다만 UI가 조금씩 늘어나고 있으니, 다음에 모바일 대응을 할 때는 HUD 영역을 따로 정리해야 할 것 같다.

현재는 버튼 위치가 고정 좌표라 작은 화면에서는 답답해질 수 있다.

## 상태 문구도 게임 상태에 맞춰 바꾼다

상단 상태 문구에는 난이도, 시간, 게임 상태, 남은 지뢰 수, flag 수를 같이 표시했다.

```ts
private getStatusText() {
    const flagCount = this.world.flags.size;
    const minesLeft = getMinesLeft(this.world, this.boardLayout);
    const elapsedTime = this.formatElapsedTime();
    const prefix = `${this.difficulty.label} | ${elapsedTime}`;

    if (this.world.resources.gameStatus === 'ready') {
        return `${prefix} | Ready | Mines left ${minesLeft} | Flags ${flagCount}`;
    }

    if (this.world.resources.gameStatus === 'lost') {
        return `${prefix} | Game over | Mines left ${minesLeft} | Flags ${flagCount}`;
    }

    if (this.world.resources.gameStatus === 'won') {
        return `${prefix} | Clear | Mines left ${minesLeft} | Flags ${flagCount}`;
    }

    return `${prefix} | Playing | Mines left ${minesLeft} | Flags ${flagCount}`;
}
```

상태에 따라 색도 바꿨다.

```ts
private getStatusColor() {
    if (this.world.resources.gameStatus === 'lost') return '#f0a6a6';
    if (this.world.resources.gameStatus === 'won') return '#f3d36b';
    if (this.world.resources.gameStatus === 'playing') return '#d7ded8';

    return '#aeb8b4';
}
```

작은 변화지만 체감이 있다.

패배했을 때는 붉은색, 클리어했을 때는 노란색으로 바뀌어 게임이 끝났다는 느낌이 더 명확해졌다.

## 텍스트 F, M을 없애고 Graphics로 그리기

지난 구현에서는 깃발과 지뢰를 텍스트로 표시했다.

```ts
if (!revealed) return world.flags.has(entityId) ? 'F' : '';
if (world.mines.has(entityId)) return 'M';
```

기능 확인에는 충분했다.

하지만 화면에 `F`, `M`이 떠 있는 순간 아무래도 프로토타입처럼 보인다.

이번에는 숫자만 텍스트로 남기고, 깃발과 지뢰는 Phaser `Graphics`로 직접 그렸다.

그래서 tile content 렌더링 상태를 아래처럼 분리했다.

```ts
export type TileContentRenderState = {
    graphics: Phaser.GameObjects.Graphics;
    labels: Phaser.GameObjects.Text[];
};
```

숫자는 매번 Text object를 새로 만들고, 깃발/지뢰는 하나의 Graphics layer에 그린다.

```ts
export function renderTileContentSystem(
    world: World,
    scene: Phaser.Scene,
    previousState: TileContentRenderState,
    layout: BoardLayout,
) {
    previousState.labels.forEach((label) => label.destroy());
    previousState.graphics.clear();

    const nextLabels: Phaser.GameObjects.Text[] = [];

    getRenderableEntities(world).forEach((entityId) => {
        const render = world.renders.get(entityId);
        const tile = world.tiles.get(entityId);
        if (!render || !tile) return;

        if (!tile.revealed && world.flags.has(entityId)) {
            drawFlagIcon(
                previousState.graphics,
                render.screenX,
                render.screenY,
                layout,
            );
            return;
        }

        if (tile.revealed && world.mines.has(entityId)) {
            drawMineIcon(
                previousState.graphics,
                render.screenX,
                render.screenY,
                layout,
            );
            return;
        }

        const labelText = getTileLabel(world, entityId, tile.revealed);
        if (!labelText) return;

        // 숫자 Text 생성
    });

    return {
        graphics: previousState.graphics,
        labels: nextLabels,
    };
}
```

여기서 중요한 변화는 content layer의 책임이 둘로 나뉜 점이다.

- 숫자: Text object
- 깃발/지뢰: Graphics drawing

이렇게 해두면 나중에 sprite atlas로 바꿀 때도 경로가 보인다.

`drawFlagIcon`, `drawMineIcon`만 sprite 생성으로 바꾸면 된다.

## 깃발은 다이아몬드 타일 위에 세운다

깃발은 간단한 선과 삼각형으로 그렸다.

```ts
function drawFlagIcon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    layout: BoardLayout,
) {
    const poleHeight = layout.tileHeight * 0.72;
    const poleTop = y - layout.tileHeight * 0.56;
    const poleBottom = poleTop + poleHeight;
    const flagWidth = layout.tileWidth * 0.24;
    const flagHeight = layout.tileHeight * 0.34;

    graphics.lineStyle(3, 0x253238, 1);
    graphics.beginPath();
    graphics.moveTo(x - 4, poleTop);
    graphics.lineTo(x - 4, poleBottom);
    graphics.strokePath();

    graphics.fillStyle(0xf2c94c, 1);
    graphics.lineStyle(1, 0x815f16, 1);
    graphics.beginPath();
    graphics.moveTo(x - 2, poleTop + 2);
    graphics.lineTo(x + flagWidth, poleTop + flagHeight * 0.45);
    graphics.lineTo(x - 2, poleTop + flagHeight);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
}
```

좌표는 타일 중심을 기준으로 살짝 위에 잡았다.

isometric 타일은 화면상 높이가 낮기 때문에, 아이콘을 정중앙에 두면 아래쪽이 답답해 보인다.

그래서 `y - layout.tileHeight * 0.56` 근처에서 깃대가 시작되게 했다.

## 지뢰는 원과 가시로 그린다

지뢰는 원 하나만 그리면 조금 심심하다.

그래서 중심 원을 그리고, 8방향으로 짧은 선을 뻗었다.

```ts
function drawMineIcon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    layout: BoardLayout,
) {
    const radius = Math.max(7, layout.tileWidth * 0.14);
    const centerY = y - layout.tileHeight * 0.2;

    graphics.lineStyle(2, 0x1f1717, 1);
    for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8;
        const innerX = x + Math.cos(angle) * (radius * 0.7);
        const innerY = centerY + Math.sin(angle) * (radius * 0.7);
        const outerX = x + Math.cos(angle) * (radius * 1.35);
        const outerY = centerY + Math.sin(angle) * (radius * 1.1);

        graphics.beginPath();
        graphics.moveTo(innerX, innerY);
        graphics.lineTo(outerX, outerY);
        graphics.strokePath();
    }

    graphics.fillStyle(0x2b2423, 1);
    graphics.lineStyle(2, 0x14100f, 1);
    graphics.fillCircle(x, centerY, radius);
    graphics.strokeCircle(x, centerY, radius);
}
```

정교한 sprite는 아니지만 `M` 텍스트보다는 훨씬 낫다.

무엇보다 외부 asset 없이 코드만으로 처리할 수 있어서, 이번 글의 범위에 잘 맞았다.

## 숫자 라벨은 보드 크기에 맞춰 줄인다

난이도가 생기면서 타일 크기가 변한다.

그러면 숫자 크기도 고정 18px로 두기 애매하다.

그래서 타일 폭에 맞춰 숫자 크기를 계산했다.

```ts
const label = scene.add
    .text(render.screenX, render.screenY - layout.tileHeight * 0.25, labelText, {
        align: 'center',
        color: getTileLabelColor(world, entityId),
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.max(15, Math.floor(layout.tileWidth * 0.27))}px`,
        fontStyle: '800',
    })
    .setDepth(6)
    .setOrigin(0.5);
```

타일이 작아져도 최소 15px은 유지하고, 기본 크기에서는 19px 정도가 된다.

숫자 위치도 중앙보다 살짝 위로 올렸다.

```ts
render.screenY - layout.tileHeight * 0.25;
```

isometric 타일은 시각적으로 위쪽 면에 내용이 올라간 것처럼 보여야 자연스럽다.

그래서 텍스트를 다이아몬드 중앙보다 조금 위에 놓았다.

## 타일 색상도 상태별로 정리했다

렌더링 polish의 큰 부분은 색상이다.

현재 타일은 상태에 따라 다른 fill과 stroke를 사용한다.

```ts
function getTileFill(
    world: World,
    entityId: number,
    revealed: boolean,
    mineRevealed: boolean,
) {
    if (mineRevealed)
        return world.resources.gameStatus === 'lost' ? 0x9f5050 : 0x776b60;
    if (revealed) return 0xc3d0bc;
    if (world.flags.has(entityId)) return 0x5f7780;

    return 0x5f8d72;
}
```

열리지 않은 기본 타일은 녹색 계열로 두고, 열린 타일은 밝은 회색-녹색으로 뺐다.

flag가 꽂힌 타일은 조금 더 푸른색으로 바꿔 구분했다.

지뢰가 드러났을 때는 게임 패배 상태라면 붉은색으로 보여준다.

```ts
function getTileStroke(
    world: World,
    entityId: number,
    revealed: boolean,
    mineRevealed: boolean,
) {
    if (mineRevealed)
        return world.resources.gameStatus === 'lost' ? 0xe0a0a0 : 0x4e4944;
    if (world.flags.has(entityId)) return 0xaec6c9;
    if (revealed) return 0x53645e;

    return 0x2c463c;
}
```

단순히 색을 예쁘게 바꾸는 것보다 중요한 것은 상태 차이가 빨리 읽히는 것이다.

지뢰찾기는 한눈에 많은 칸을 훑어야 하는 게임이라, 닫힌 칸과 열린 칸이 확실히 달라야 한다.

## 아직 남은 것

이번 구현으로 게임이 조금 더 그럴듯해졌다.

하지만 아직 완성이라고 하기에는 남은 것이 많다.

- 모바일 long press flag
- 브라우저 크기 변경 시 board layout 재계산
- localStorage 최고 기록 저장
- 난이도별 기록 분리
- chord reveal
- sprite atlas 기반 icon 교체
- 클릭 애니메이션
- 사운드

특히 다음에 하고 싶은 것은 모바일 대응이다.

지금은 우클릭으로 flag를 꽂는다. 데스크톱에서는 괜찮지만, 모바일에서는 입력 방법이 없다.

long press로 flag를 꽂고, 일반 tap으로 reveal하는 흐름을 만들어야 실제로 블로그 iframe 안에서 편하게 플레이할 수 있다.

## 마치며

이번 구현은 지뢰찾기의 규칙을 크게 바꾸지는 않았다.

대신 게임의 껍질을 조금 더 게임답게 만들었다.

난이도 선택이 들어오면서 보드 layout이 설정에 따라 바뀌기 시작했고, 타이머가 들어오면서 플레이 세션이라는 개념이 생겼다.

그리고 `F`, `M` 텍스트를 없애고 깃발과 지뢰를 직접 그리면서 화면의 프로토타입 느낌이 조금 줄었다.

아직 작은 웹게임이지만, 이제는 “규칙이 동작하는 데모”에서 “조금씩 완성되어 가는 게임”으로 넘어가는 느낌이 든다.

다음에는 모바일 입력과 반응형 layout을 다뤄볼 생각이다.
