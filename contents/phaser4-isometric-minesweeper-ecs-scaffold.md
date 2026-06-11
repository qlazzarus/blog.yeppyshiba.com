---
title: Phaser 4로 Isometric Minesweeper 만들기 — ECS 기본 구조부터 커서 hover 문제까지
date: 2026-06-11T12:00:00+09:00
summary: Phaser 4 기반 웹게임을 블로그에서 iframe으로 서비스하기 위한 첫 실험으로, Isometric Minesweeper의 ECS scaffold와 isometric 타일 hover 문제를 정리했습니다.
image: /images/posts/202606/isometric-minesweeper.png
category: coding
tags:
    - phaser
    - phaser4
    - ecs
    - isometric
    - webgame
    - game-dev
    - typescript
---

## 들어가며

블로그에 웹게임을 여러 개 서비스해보고 싶다는 생각을 하면서, 첫 실험 대상으로 **Isometric Minesweeper**를 잡았다.

처음부터 완성된 게임을 만드는 것보다 먼저 확인하고 싶었던 것은 두 가지였다.

- Phaser 4 프로젝트를 블로그 안에서 iframe으로 서비스할 수 있는가?
- Scene 안에 모든 코드를 몰아넣지 않고, ECS 기본 구조로 분리할 수 있는가?

결과물은 아직 지뢰찾기 게임이라기보다는 **isometric 보드와 ECS scaffold를 검증하는 초기 단계**에 가깝다.

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

관련해서 이전에 정리했던 글도 같이 이어진다.

- [Phaser 4 완전 정리 — Phaser 3와 뭐가 달라졌나?](/article/phaser4-overview/)
- [Phaser 3 -> 4 실전 코드 변환편 (이동/점프/공격 로직)](/article/phaser3-to-4-ecs-code-conversion/)
- [2.5D 구현하기 - 쿼터뷰](/article/quarter-view/)

이번 글은 그 글들의 연장선에서, 실제 블로그 프로젝트 안에 작은 게임 하나를 올리며 겪은 구현 과정을 정리한다.

## 왜 바로 게임 로직이 아니라 ECS scaffold부터 잡았나?

Phaser로 간단한 게임을 만들 때는 Scene 하나에 전부 넣어도 일단 동작한다.

하지만 그렇게 시작하면 금방 이런 상태가 된다.

- Scene이 입력 처리도 한다.
- Scene이 게임 상태도 들고 있다.
- Scene이 렌더링도 한다.
- Scene이 좌표 변환도 한다.
- Scene이 게임 규칙도 처리한다.

작은 예제에서는 편하지만, 지뢰찾기처럼 상태가 늘어나는 게임에서는 금방 답답해진다.

그래서 이번에는 처음부터 최소한의 ECS 형태를 잡았다.

핵심은 다음 세 가지다.

- Entity: 게임 안의 대상을 나타내는 ID
- Component: Entity가 가진 데이터
- System: Component를 읽고 처리하는 로직

현재 `World`는 이렇게 생겼다.

```ts
export type EntityId = number;

export type PositionComponent = TilePoint;

export type TileComponent = {
    revealed: boolean;
};

export type RenderComponent = {
    order: number;
    screenX: number;
    screenY: number;
};

export type World = {
    nextEntityId: EntityId;
    positions: Map<EntityId, PositionComponent>;
    renders: Map<EntityId, RenderComponent>;
    resources: WorldResources;
    tiles: Map<EntityId, TileComponent>;
};
```

아직은 단순하다.

하지만 이 정도만 해도 중요한 차이가 생긴다.

타일은 Phaser의 `GameObject`가 아니라 `EntityId`로 존재하고, 좌표나 상태는 component map에 나뉘어 들어간다.

```ts
export function createTileEntity(
    world: World,
    position: PositionComponent,
    render: RenderComponent,
) {
    const entityId = world.nextEntityId;

    world.nextEntityId += 1;
    world.positions.set(entityId, position);
    world.tiles.set(entityId, { revealed: false });
    world.renders.set(entityId, render);

    return entityId;
}
```

이렇게 해두면 나중에 지뢰찾기 기능을 붙일 때도 구조가 자연스럽다.

- `MineComponent`
- `FlagComponent`
- `AdjacentMineCountComponent`
- `RevealedComponent`

같은 상태를 추가할 수 있고, 각 시스템은 필요한 component만 읽으면 된다.

## Scene은 얇게 유지한다

처음 구현에서는 Scene 안에 보드 생성, hover 계산, 렌더링 코드가 모두 들어 있었다.

이 상태는 엄밀히 말하면 ECS라기보다 **Scene 안에 ECS 흉내를 낸 데이터 구조가 있는 상태**에 가까웠다.

그래서 파일을 아래처럼 분리했다.

```txt
src/
  ecs/
    world.ts
  game/
    config.ts
  systems/
    board.ts
    isometric.ts
    pointer.ts
    render.ts
  main.ts
```

이제 `main.ts`의 Scene은 거의 wiring만 담당한다.

```ts
create() {
    this.cameras.main.setBackgroundColor('#182026');
    this.boardLayout = createBoardLayout(this.scale.width);
    this.boardGraphics = this.add.graphics();
    this.hoverGraphics = this.add.graphics().setDepth(5);
    this.world = createWorld();

    createBoardSystem(this.world, this.boardLayout);
    renderBoardSystem(this.world, this.boardGraphics, this.boardLayout);
    this.renderUi();

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        const hoverChanged = updateHoveredTileSystem(
            this.world,
            pointer.worldX,
            pointer.worldY,
            this.boardLayout,
        );

        if (hoverChanged) {
            renderHoverSystem(this.world, this.hoverGraphics, this.boardLayout);
        }
    });
}
```

Scene은 Phaser의 생명주기와 입력 이벤트를 받아서 system을 호출한다.

반대로 보드가 어떻게 만들어지는지, hover가 어떻게 계산되는지, 다이아몬드가 어떻게 그려지는지는 Scene 바깥으로 빠졌다.

이 정도가 되어야 블로그에 “ECS 기본 scaffold를 만들었다”고 적어도 덜 민망하다.

## Isometric 좌표는 x - y, x + y에서 시작한다

isometric 타일 배치는 예전에 [쿼터뷰 글](/article/quarter-view/)에서도 정리했듯이, 일반적인 2D grid 좌표를 화면 좌표로 바꾸는 문제다.

현재 구현은 타일 하나의 크기를 기준으로 아래처럼 변환한다.

```ts
export function isoToScreen(x: number, y: number, layout: BoardLayout) {
    return {
        x: layout.originX + (x - y) * (layout.tileWidth / 2),
        y: layout.originY + (x + y) * (layout.tileHeight / 2),
    };
}
```

핵심은 이 부분이다.

```ts
x: originX + (x - y) * halfTileWidth
y: originY + (x + y) * halfTileHeight
```

`x - y`는 좌우 방향을 만들고, `x + y`는 아래로 내려가는 방향을 만든다.

이렇게 하면 2D 배열로 관리하는 보드를 화면에서는 다이아몬드 형태로 배치할 수 있다.

보드 생성 시스템은 이 변환 결과를 `RenderComponent`에 저장한다.

```ts
export function createBoardSystem(world: World, layout: BoardLayout) {
    for (let y = 0; y < layout.boardHeight; y += 1) {
        for (let x = 0; x < layout.boardWidth; x += 1) {
            const point = isoToScreen(x, y, layout);

            createTileEntity(
                world,
                { x, y },
                {
                    order: (x + y) * layout.boardWidth + x,
                    screenX: point.x,
                    screenY: point.y,
                },
            );
        }
    }
}
```

여기서 `order`는 렌더링 순서를 위한 값이다.

isometric은 타일이 서로 겹쳐 보이는 구조라서, 그리는 순서가 중요하다. 지금은 `(x + y)` 기준으로 뒤쪽 타일부터 앞쪽 타일 순서에 가깝게 그리도록 했다.

## 커서 hover는 단순 좌표 변환만으로 부족했다

처음에는 마우스 좌표를 바로 grid 좌표로 역변환하려고 했다.

대략 이런 방식이었다.

```ts
const tileX = Math.floor(localY / tileHeight + localX / tileWidth);
const tileY = Math.floor(localY / tileHeight - localX / tileWidth);
```

수식으로는 그럴듯한데, 실제로 마우스를 움직여보면 모서리 근처에서 hover가 어색했다.

이유는 간단하다.

isometric 타일은 사각형이 아니라 다이아몬드다.

그런데 `floor` 기반 역변환은 화면을 보이지 않는 사각 격자로 나눈 것처럼 동작한다. 그래서 타일 모서리에 가까운 영역에서 실제 다이아몬드 모양과 hover 판정이 어긋난다.

그래서 현재는 모든 렌더 타일을 뒤에서부터 순회하면서, 마우스가 실제 다이아몬드 내부에 있는지 검사한다.

```ts
function pickTile(
    world: World,
    screenX: number,
    screenY: number,
    layout: BoardLayout,
): TilePoint | null {
    for (const entityId of [...getRenderableEntities(world)].reverse()) {
        const position = world.positions.get(entityId);
        const render = world.renders.get(entityId);

        if (!position || !render) continue;
        if (isInsideIsoTile(screenX, screenY, render.screenX, render.screenY, layout)) {
            return position;
        }
    }

    return null;
}
```

다이아몬드 내부 판정은 아래처럼 한다.

```ts
export function isInsideIsoTile(
    screenX: number,
    screenY: number,
    tileCenterX: number,
    tileCenterY: number,
    layout: BoardLayout,
) {
    const dx = Math.abs(screenX - tileCenterX) / (layout.tileWidth / 2);
    const dy = Math.abs(screenY - tileCenterY) / (layout.tileHeight / 2);

    return dx + dy <= 1;
}
```

다이아몬드는 중심에서 멀어질수록 `x`와 `y` 방향 여유가 같이 줄어든다.

그래서 정규화한 `dx + dy`가 1 이하이면 다이아몬드 내부라고 볼 수 있다.

이 방식으로 바꾸니 커서가 타일 모서리 근처에 있을 때도 hover가 훨씬 자연스러워졌다.

## 다이아몬드가 삼각형처럼 보였던 문제

구현 중에 생각보다 신경 쓰였던 문제가 하나 있었다.

hover overlay가 다이아몬드가 아니라 삼각형처럼 보이거나, 실제 타일보다 약간 offset이 틀어져 보였다.

처음에는 Phaser의 `polygon` GameObject로 타일을 만들었다.

```ts
this.add.polygon(
    x,
    y,
    [
        0,
        -tileHeight / 2,
        tileWidth / 2,
        0,
        0,
        tileHeight / 2,
        -tileWidth / 2,
        0,
    ],
    fill,
);
```

좌표만 보면 다이아몬드가 맞다.

하지만 실제 화면에서는 hover overlay가 기대한 위치와 미묘하게 다르게 보였다. 타일과 hover가 같은 좌표계 위에 있다는 확신이 없으니, 디버깅도 애매했다.

그래서 렌더링을 `Graphics` 기반으로 바꿨다.

```ts
function drawDiamond(graphics: Phaser.GameObjects.Graphics, options: DiamondOptions) {
    const halfWidth = options.width / 2;
    const halfHeight = options.height / 2;

    graphics.fillStyle(options.fill, options.alpha);
    graphics.lineStyle(options.lineWidth, options.stroke, 1);
    graphics.beginPath();
    graphics.moveTo(options.x, options.y - halfHeight);
    graphics.lineTo(options.x + halfWidth, options.y);
    graphics.lineTo(options.x, options.y + halfHeight);
    graphics.lineTo(options.x - halfWidth, options.y);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
}
```

이렇게 바꾸면 장점이 명확하다.

- 타일과 hover가 같은 `drawDiamond` 함수를 쓴다.
- 중심 좌표가 명확하다.
- 꼭짓점 순서를 직접 제어한다.
- hover만 살짝 작은 다이아몬드로 그릴 수 있다.

현재 hover 렌더링은 같은 중심 좌표를 사용하되, 크기만 조금 줄인다.

```ts
drawDiamond(graphics, {
    alpha: 0.24,
    fill: 0xd9b85f,
    height: layout.tileHeight - layout.hoverInset * 2,
    lineWidth: 2,
    stroke: 0xffe08f,
    width: layout.tileWidth - layout.hoverInset * 4,
    x: render.screenX,
    y: render.screenY,
});
```

이렇게 하니 hover가 인접 타일 경계선을 과하게 덮지 않고, 실제 isometric 타일 위에 올라간다는 느낌이 훨씬 좋아졌다.

## hover 상태도 World resource로 옮겼다

처음에는 `hoveredTile`을 Scene 필드로 들고 있었다.

```ts
private hoveredTile: TilePoint | null = null;
```

하지만 ECS 관점에서는 이것도 게임 상태다.

그래서 지금은 `WorldResources` 안으로 옮겼다.

```ts
export type WorldResources = {
    hoveredTile: TilePoint | null;
};
```

pointer system은 hover 상태가 바뀌었는지만 알려준다.

```ts
export function updateHoveredTileSystem(
    world: World,
    screenX: number,
    screenY: number,
    layout: BoardLayout,
) {
    const nextHoveredTile = pickTile(world, screenX, screenY, layout);

    if (sameTile(world.resources.hoveredTile, nextHoveredTile)) return false;

    world.resources.hoveredTile = nextHoveredTile;
    return true;
}
```

Scene은 그 결과를 보고 hover layer만 다시 그린다.

```ts
if (hoverChanged) {
    renderHoverSystem(this.world, this.hoverGraphics, this.boardLayout);
}
```

작은 차이지만, 이 분리가 중요하다.

입력 시스템은 입력 상태를 갱신하고, 렌더 시스템은 그 상태를 화면에 그린다.

Scene은 둘 사이를 연결할 뿐이다.

## 아직 남은 아쉬움

지금 구조가 완전한 ECS냐고 하면, 아직은 아니다.

특히 `RenderComponent`에 `screenX`, `screenY`를 저장하고 있는 점은 조금 애매하다.

```ts
export type RenderComponent = {
    order: number;
    screenX: number;
    screenY: number;
};
```

보드 origin이나 타일 크기가 바뀌면 이 값을 다시 계산해야 한다.

더 ECS스럽게 가려면 `PositionComponent`에는 grid 좌표만 두고, `IsoTransformSystem` 또는 `RenderSystem`이 매번 화면 좌표를 계산하는 방식이 낫다.

다만 지금 단계에서는 장단점이 있다.

- 장점: 렌더 시스템이 단순하다.
- 단점: 레이아웃 변경에 약하다.

지금 목표는 완성형 ECS 엔진을 만드는 것이 아니라, 블로그에 올릴 수 있는 작은 Phaser 4 게임의 출발점을 만드는 것이다.

그래서 이 정도 선에서 멈췄다.

## 다음 단계

다음으로 붙일 기능은 진짜 지뢰찾기 로직이다.

생각하는 순서는 이렇다.

- `MineComponent` 추가
- `FlagComponent` 추가
- `AdjacentMineCountComponent` 추가
- 첫 클릭 시 지뢰 배치
- 빈 칸 연쇄 오픈 시스템
- 우클릭 깃발 처리
- 게임 종료 상태 resource 추가

이 단계까지 가면 단순히 “isometric 타일을 그렸다”가 아니라, ECS 구조 위에서 실제 게임 규칙이 돌아가는 예제가 된다.

그리고 그때부터가 진짜 재미있는 부분일 것 같다.

## 정리

이번 작업의 핵심은 게임을 완성하는 것이 아니었다.

블로그에서 서비스할 수 있는 Phaser 4 게임 프로젝트를 만들고, 그 안에서 ECS 기본 구조와 isometric 타일 hover 문제를 한 번 정리하는 것이 목표였다.

정리하면 다음과 같다.

- Phaser Scene은 얇게 유지한다.
- Entity와 Component는 `World`에 모은다.
- 보드 생성, pointer 처리, 렌더링은 system으로 분리한다.
- isometric 좌표는 `x - y`, `x + y` 변환에서 시작한다.
- hover 판정은 역변환보다 다이아몬드 hit-test가 자연스럽다.
- 다이아몬드 렌더링은 `Graphics`로 직접 그리는 편이 이번 케이스에서는 더 명확했다.

아직 작은 scaffold지만, 이 정도면 다음 글에서 지뢰찾기 규칙을 얹어볼 기반은 마련된 셈이다.
