---
title: Phaser 4 Isometric Minesweeper 2편 — 첫 클릭에 지뢰 배치하고 숫자 계산하기
date: 2026-06-14T18:00:00+09:00
summary: ECS scaffold 위에 지뢰찾기 규칙을 얹어 Mine, Flag, AdjacentMineCount 상태를 추가하고, 첫 클릭 이후 지뢰를 배치하는 흐름을 구현했습니다.
image: /images/posts/202606/isometric-minesweeper-click.jpg
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

[지난 글](/article/phaser4-isometric-minesweeper-ecs-scaffold/)에서는 Phaser 4 기반 **Isometric Minesweeper**의 기본 구조를 만들었다.

그때까지 구현된 것은 지뢰찾기 게임이라기보다, 아래 세 가지를 검증하는 scaffold에 가까웠다.

- Phaser 4 게임을 블로그에서 iframe으로 띄우기
- Scene을 얇게 두고 ECS 비슷한 구조로 나누기
- isometric 타일 렌더링과 hover 판정 처리하기

이번에는 그 위에 실제 지뢰찾기 규칙을 얹었다.

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

이번 글에서 구현한 범위는 다음과 같다.

- 지뢰 상태 추가
- 깃발 상태 추가
- 주변 지뢰 수 상태 추가
- 첫 클릭 이후 지뢰 배치
- 첫 클릭 타일과 주변 8칸 안전 처리
- 좌클릭 reveal
- 우클릭 flag
- 승리/패배 상태 처리
- 숫자, 깃발, 지뢰의 기본 렌더링

아직 빈 칸 연쇄 오픈은 없다.

원래 지뢰찾기에서 가장 시원한 부분은 0칸을 눌렀을 때 넓은 영역이 한 번에 열리는 순간이지만, 이번 글에서는 일부러 거기까지 가지 않았다. 이번 목표는 **게임 규칙을 ECS 데이터 위에 얹는 것**이다.

## World에 게임 규칙을 넣기 시작했다

지난 글의 `World`는 타일 위치, 렌더링 좌표, hover 정도만 들고 있었다.

이제는 지뢰찾기 규칙을 표현할 데이터가 필요하다.

```ts
export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';

export type WorldResources = {
    gameStatus: GameStatus;
    hoveredTile: TilePoint | null;
    minefieldReady: boolean;
};

export type World = {
    adjacentMineCounts: Map<EntityId, number>;
    flags: Set<EntityId>;
    mines: Set<EntityId>;
    nextEntityId: EntityId;
    positions: Map<EntityId, PositionComponent>;
    renders: Map<EntityId, RenderComponent>;
    resources: WorldResources;
    tileEntities: Map<string, EntityId>;
    tiles: Map<EntityId, TileComponent>;
};
```

여기서 고민한 지점은 `MineComponent`, `FlagComponent`, `AdjacentMineCountComponent`를 어떻게 표현할지였다.

엄밀하게 component map을 모두 따로 만든다면 이런 식이 된다.

```ts
mines: Map<EntityId, MineComponent>;
flags: Map<EntityId, FlagComponent>;
adjacentMineCounts: Map<EntityId, AdjacentMineCountComponent>;
```

하지만 지금 단계에서는 component 안에 별도 필드가 거의 없다.

지뢰인지 아닌지는 `Set<EntityId>`로 충분하고, 깃발도 마찬가지다. 주변 지뢰 수만 숫자 값이 필요하므로 `Map<EntityId, number>`로 두었다.

그래서 현재 구조는 이렇게 잡았다.

```ts
adjacentMineCounts: Map<EntityId, number>;
flags: Set<EntityId>;
mines: Set<EntityId>;
```

이 방식은 단순하지만 ECS스럽지 않은 것은 아니다.

Entity가 어떤 component를 가지고 있는지를 `Set` membership으로 판단할 뿐이다. 지금처럼 `MineComponent` 안에 데이터가 없는 경우에는 오히려 깔끔하다.

## tileEntities lookup을 추가했다

지난 구현에서는 특정 좌표의 entity를 찾을 때 `positions`를 순회했다.

```ts
export function getEntityAtTile(world: World, tile: TilePoint) {
    for (const [entityId, position] of world.positions) {
        if (sameTile(position, tile)) return entityId;
    }

    return null;
}
```

10x10 보드에서는 별문제가 없다.

하지만 지뢰찾기 규칙을 넣으면서 이 함수가 훨씬 자주 호출되기 시작했다. 주변 8칸을 계산할 때도 쓰고, 클릭한 타일을 찾을 때도 쓰고, 렌더링할 때 hover 타일을 찾을 때도 쓴다.

그래서 좌표 문자열을 key로 하는 lookup map을 추가했다.

```ts
export function getTileKey(tile: TilePoint) {
    return `${tile.x},${tile.y}`;
}

export function getEntityAtTile(world: World, tile: TilePoint) {
    return world.tileEntities.get(getTileKey(tile)) ?? null;
}
```

타일 entity를 만들 때도 이 map에 같이 등록한다.

```ts
world.positions.set(entityId, position);
world.tileEntities.set(getTileKey(position), entityId);
world.tiles.set(entityId, { revealed: false });
world.renders.set(entityId, render);
```

이제 `x, y` 좌표에서 entity를 찾는 비용이 보드 크기에 비례하지 않는다.

작은 게임에서 성능 때문에 반드시 필요한 변경은 아니지만, 규칙 시스템을 읽기 쉽게 만드는 효과가 있다.

## 첫 클릭 전에는 지뢰를 배치하지 않는다

지뢰찾기를 만들 때 바로 부딪히는 문제가 있다.

첫 클릭에 지뢰가 터지면 재미가 없다.

그래서 많은 지뢰찾기 구현은 첫 클릭 전까지 지뢰를 배치하지 않는다. 사용자가 처음 클릭한 좌표를 알고 난 뒤, 그 타일을 제외하고 지뢰를 배치한다.

이번 구현에서는 한 걸음 더 나아가 첫 클릭 타일뿐 아니라 주변 8칸도 안전 영역으로 뺐다.

```ts
function placeMinesAfterFirstClickSystem(
    world: World,
    layout: BoardLayout,
    firstClick: TilePoint,
    random: () => number,
) {
    const safeTiles = new Set(
        [firstClick, ...getNeighborTiles(firstClick, layout)].map(
            (tile) => `${tile.x},${tile.y}`,
        ),
    );
    const candidates = [...world.positions.entries()]
        .filter(([, position]) => !safeTiles.has(`${position.x},${position.y}`))
        .map(([entityId]) => entityId);

    shuffle(candidates, random);

    world.mines.clear();
    candidates.slice(0, layout.mineCount).forEach((entityId) => {
        world.mines.add(entityId);
    });
}
```

핵심은 이 부분이다.

```ts
const safeTiles = new Set(
    [firstClick, ...getNeighborTiles(firstClick, layout)].map(
        (tile) => `${tile.x},${tile.y}`,
    ),
);
```

첫 클릭 타일과 인접 타일을 `safeTiles`에 넣고, 그 좌표들은 지뢰 후보에서 제외한다.

그러면 첫 클릭은 최소한 숫자 0 또는 주변 숫자가 있는 안전 타일이 된다.

아직 빈 칸 연쇄 오픈을 구현하지 않았기 때문에 체감은 조금 덜하지만, 다음 단계에서 cascade를 붙이면 첫 클릭 경험이 훨씬 자연스러워진다.

## reveal 시스템이 지뢰 배치의 시작점이 된다

이번 구현의 중심은 `revealTileSystem`이다.

좌클릭으로 타일을 열 때, 아직 지뢰밭이 준비되지 않았다면 그 순간 지뢰를 배치한다.

```ts
export function revealTileSystem(
    world: World,
    tile: TilePoint,
    layout: BoardLayout,
    random: () => number = Math.random,
): GameActionResult {
    if (world.resources.gameStatus === 'lost' || world.resources.gameStatus === 'won') {
        return unchanged();
    }

    const entityId = getEntityAtTile(world, tile);
    if (!entityId || world.flags.has(entityId)) return unchanged();

    const tileState = world.tiles.get(entityId);
    if (!tileState || tileState.revealed) return unchanged();

    if (!world.resources.minefieldReady) {
        placeMinesAfterFirstClickSystem(world, layout, tile, random);
        calculateAdjacentMineCountsSystem(world, layout);
        world.resources.minefieldReady = true;
        world.resources.gameStatus = 'playing';
    }

    tileState.revealed = true;

    if (world.mines.has(entityId)) {
        world.resources.gameStatus = 'lost';
        revealAllMines(world);
        return { changed: true, statusChanged: true };
    }

    if (hasWon(world)) {
        world.resources.gameStatus = 'won';
        return { changed: true, statusChanged: true };
    }

    return { changed: true, statusChanged: false };
}
```

처음에는 지뢰 배치 시스템을 보드 생성 직후에 호출할까 생각했다.

하지만 그렇게 하면 첫 클릭 안전 처리가 어색해진다. 지뢰를 먼저 깔아놓고 첫 클릭 주변을 다시 비우는 방식도 가능하지만, 그러면 지뢰 수를 맞추기 위해 재배치 로직이 필요하다.

이번에는 더 단순하게 갔다.

- 보드 생성 시점에는 타일만 만든다.
- `minefieldReady`는 `false`로 둔다.
- 첫 reveal이 들어오면 지뢰를 배치한다.
- 바로 주변 지뢰 수를 계산한다.
- 이후부터는 reveal만 처리한다.

이 흐름이 지뢰찾기 규칙과도 잘 맞고, 글로 설명하기도 쉽다.

## 주변 8칸 계산

주변 지뢰 수를 계산하려면 특정 타일 주변 8칸을 구해야 한다.

isometric 화면이라고 해서 게임 규칙까지 isometric으로 생각할 필요는 없다. 지뢰찾기 규칙은 여전히 2D grid 위에서 동작한다.

그래서 주변 타일 계산은 평범한 `x, y` 좌표로 처리했다.

```ts
function getNeighborTiles(tile: TilePoint, layout: BoardLayout) {
    const neighbors: TilePoint[] = [];

    for (let y = tile.y - 1; y <= tile.y + 1; y += 1) {
        for (let x = tile.x - 1; x <= tile.x + 1; x += 1) {
            if (sameTile(tile, { x, y })) continue;
            if (x < 0 || y < 0 || x >= layout.boardWidth || y >= layout.boardHeight)
                continue;

            neighbors.push({ x, y });
        }
    }

    return neighbors;
}
```

여기서 중요한 점은 좌표계를 섞지 않는 것이다.

- 게임 규칙: grid 좌표
- 화면 배치: isometric screen 좌표
- picking: screen 좌표에서 grid tile 찾기

이 셋을 분리해두면 규칙 코드는 isometric 여부를 거의 신경 쓰지 않아도 된다.

## 주변 지뢰 수 계산

지뢰 배치가 끝나면 각 타일의 주변 지뢰 수를 계산한다.

```ts
function calculateAdjacentMineCountsSystem(world: World, layout: BoardLayout) {
    world.adjacentMineCounts.clear();

    for (const [entityId, position] of world.positions) {
        if (world.mines.has(entityId)) continue;

        const count = getNeighborTiles(position, layout).filter((neighbor) => {
            const neighborEntityId = getEntityAtTile(world, neighbor);

            return neighborEntityId ? world.mines.has(neighborEntityId) : false;
        }).length;

        world.adjacentMineCounts.set(entityId, count);
    }
}
```

지뢰 타일에는 주변 지뢰 수를 굳이 저장하지 않았다.

숫자가 필요한 것은 안전 타일뿐이다. 렌더링 단계에서도 지뢰는 `M`, 안전 타일은 count로 나누어 그린다.

## 우클릭 flag 처리

우클릭은 `toggleFlagSystem`으로 분리했다.

```ts
export function toggleFlagSystem(world: World, tile: TilePoint): GameActionResult {
    if (world.resources.gameStatus === 'lost' || world.resources.gameStatus === 'won') {
        return unchanged();
    }

    const entityId = getEntityAtTile(world, tile);
    if (!entityId) return unchanged();

    const tileState = world.tiles.get(entityId);
    if (!tileState || tileState.revealed) return unchanged();

    if (world.flags.has(entityId)) {
        world.flags.delete(entityId);
    } else {
        world.flags.add(entityId);
    }

    return { changed: true, statusChanged: false };
}
```

열린 타일에는 깃발을 꽂을 수 없고, 게임이 끝난 뒤에도 조작하지 못하게 했다.

브라우저에서는 우클릭하면 기본 context menu가 뜨기 때문에 Scene에서 막아준다.

```ts
this.input.mouse?.disableContextMenu();
```

그리고 pointer down에서 좌클릭과 우클릭을 나눠 system을 호출한다.

```ts
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    updateHoveredTileSystem(
        this.world,
        pointer.worldX,
        pointer.worldY,
        this.boardLayout,
    );

    const hoveredTile = this.world.resources.hoveredTile;
    if (!hoveredTile) return;

    const result =
        pointer.rightButtonDown() || pointer.button === 2
            ? toggleFlagSystem(this.world, hoveredTile)
            : revealTileSystem(this.world, hoveredTile, this.boardLayout);

    if (!result.changed) return;

    this.renderGame();
});
```

Scene은 여전히 얇다.

입력을 받아서 적절한 system을 호출하고, 변경이 있으면 다시 그린다. 지뢰가 어디에 있는지, 승리 조건이 무엇인지, flag를 어떻게 토글하는지는 Scene이 모른다.

이 방향은 지난 글에서 잡았던 구조와 잘 이어진다.

## 렌더링은 상태를 읽어서 그린다

렌더링 시스템도 이제 타일 상태를 읽어야 한다.

닫힌 타일, 열린 타일, 깃발 타일, 지뢰 타일의 색을 다르게 칠한다.

```ts
function getTileFill(
    world: World,
    entityId: number,
    revealed: boolean,
    mineRevealed: boolean,
) {
    if (mineRevealed)
        return world.resources.gameStatus === 'lost' ? 0x8f4a4a : 0x6f6258;
    if (revealed) return 0xb9c7b3;
    if (world.flags.has(entityId)) return 0x6b7f88;

    return 0x5d846f;
}
```

그리고 숫자, 깃발, 지뢰 표시는 별도 text layer로 올렸다.

```ts
function getTileLabel(world: World, entityId: number, revealed: boolean) {
    if (!revealed) return world.flags.has(entityId) ? 'F' : '';
    if (world.mines.has(entityId)) return 'M';

    const count = world.adjacentMineCounts.get(entityId) ?? 0;

    return count > 0 ? count.toString() : '';
}
```

지금은 임시 표현에 가깝다.

나중에는 `F`, `M` 대신 깃발 아이콘이나 작은 sprite를 쓰는 편이 낫다. 하지만 지금 단계에서는 게임 규칙이 제대로 연결됐는지 확인하는 것이 먼저다.

## renderGame으로 다시 묶기

처음 scaffold에서는 보드와 hover만 다시 그리면 됐다.

이제는 타일 내용과 상태 UI도 같이 갱신해야 한다.

그래서 Scene에 `renderGame`을 만들었다.

```ts
private renderGame() {
    renderBoardSystem(this.world, this.boardGraphics, this.boardLayout);
    renderHoverSystem(this.world, this.hoverGraphics, this.boardLayout);
    this.tileLabels = renderTileContentSystem(this.world, this, this.tileLabels);
    this.statusText.setText(this.getStatusText());
}
```

`renderTileContentSystem`은 기존 text label을 지우고 다시 만든다.

10x10 보드에서는 이 정도 방식으로도 충분하다. 나중에 보드 크기를 키우거나 애니메이션을 넣게 되면 text object를 재사용하는 구조로 바꿀 수 있다.

하지만 지금은 단순함을 택했다.

이 프로젝트의 목적은 거대한 게임 엔진을 만드는 것이 아니라, 블로그에서 읽을 수 있는 작은 게임 구현 과정을 남기는 것이다.

## 승리와 패배

패배 조건은 단순하다.

열려고 한 타일이 지뢰라면 게임 상태를 `lost`로 바꾸고 모든 지뢰를 공개한다.

```ts
if (world.mines.has(entityId)) {
    world.resources.gameStatus = 'lost';
    revealAllMines(world);
    return { changed: true, statusChanged: true };
}
```

승리 조건은 모든 안전 타일이 열렸는지 확인한다.

```ts
function hasWon(world: World) {
    for (const [entityId, tileState] of world.tiles) {
        if (!world.mines.has(entityId) && !tileState.revealed) return false;
    }

    return true;
}
```

아직 새 게임 버튼은 없다.

패배하거나 승리하면 새로고침해야 다시 시작할 수 있다. 이 부분은 다음 단계에서 새 게임 버튼과 난이도 선택을 붙이면서 다듬을 예정이다.

## 빌드 산출물 hash가 어긋난 문제

이번 작업 중에 실제로 한 번 404를 만났다.

브라우저 콘솔에는 이런 에러가 떴다.

```text
GET /game-assets/isometric-minesweeper/assets/index-rUOTI_pG.js 404
```

원인은 게임 HTML과 정적 asset 폴더가 서로 다른 빌드 결과를 보고 있었기 때문이다.

`/play/isometric-minesweeper/` 페이지는 `games/isometric-minesweeper/dist/index.html`을 읽고 있었고, 그 HTML은 새 JS 파일을 가리켰다.

하지만 Astro dev server가 실제로 서빙하는 `/game-assets/...`에는 이전 빌드의 JS만 남아 있었다.

해결은 두 가지였다.

먼저 `build:games`를 다시 실행해서 `public/game-assets`를 최신 dist와 맞췄다.

```bash
npm run build:games
```

그리고 `/play/[slug]` 페이지가 `public/game-assets/<slug>/index.html`을 우선 읽도록 바꿨다.

```ts
const html =
    slug && /^[a-z0-9-]+$/.test(slug)
        ? await readFile(
              path.join(publicGameAssetsDir, slug, 'index.html'),
              'utf8',
          ).catch(() =>
              readFile(path.join(gamesDir, slug, 'dist', 'index.html'), 'utf8').catch(
                  () => null,
              ),
          )
        : null;
```

이렇게 하면 HTML과 JS/CSS asset이 같은 위치의 빌드 결과를 바라보게 된다.

작은 문제였지만, 블로그 안에 별도 Vite 게임을 얹을 때는 이런 산출물 경로가 꽤 중요하다는 걸 다시 확인했다.

## 지금 상태

이번 구현이 끝난 뒤 게임은 최소한의 지뢰찾기처럼 동작한다.

- 첫 좌클릭을 하면 지뢰가 배치된다.
- 첫 클릭 타일과 주변 8칸에는 지뢰가 없다.
- 열린 타일에는 주변 지뢰 수가 표시된다.
- 우클릭으로 깃발을 토글할 수 있다.
- 지뢰를 누르면 모든 지뢰가 공개되고 게임이 끝난다.
- 모든 안전 타일을 열면 승리 상태가 된다.

아직 부족한 점도 명확하다.

- 빈 칸 연쇄 오픈이 없다.
- 새 게임 버튼이 없다.
- 숫자와 깃발 표현이 임시 text다.
- 모바일 터치 조작이 없다.
- 타이머와 남은 지뢰 수 UI가 없다.

하지만 이제는 scaffold가 아니라 실제 게임 규칙이 올라간 상태가 됐다.

## 다음 단계

다음에는 빈 칸 연쇄 오픈을 붙일 예정이다.

지뢰찾기에서 주변 지뢰 수가 0인 타일을 열면, 연결된 빈 칸과 경계 숫자들이 한 번에 열려야 한다.

이 기능은 BFS 또는 DFS로 구현할 수 있다.

ECS 관점에서는 `revealTileSystem` 안에 모든 것을 몰아넣을지, 아니면 `revealAreaSystem` 같은 별도 system으로 분리할지가 고민 포인트다.

다음 글에서는 이 부분을 구현하면서, 작은 게임에서 시스템을 어디까지 나누는 게 적당한지도 같이 정리해보려 한다.

## 정리

이번 작업의 핵심은 지뢰찾기 규칙을 Phaser Scene에 직접 넣지 않고, `World`와 system 위에 얹은 것이다.

정리하면 다음과 같다.

- 지뢰와 깃발은 `Set<EntityId>`로 표현했다.
- 주변 지뢰 수는 `Map<EntityId, number>`로 저장했다.
- 첫 클릭 전에는 지뢰를 배치하지 않았다.
- 첫 클릭 타일과 주변 8칸은 안전 영역으로 제외했다.
- 게임 규칙은 grid 좌표로 처리하고, isometric은 렌더링과 picking에만 관여하게 했다.
- Scene은 입력을 받아 system을 호출하고 다시 그리는 역할로 유지했다.

이제 다음 구현부터는 지뢰찾기의 손맛을 만드는 단계다.

빈 칸이 넓게 열리는 순간이 들어가면, 비로소 “아, 이건 지뢰찾기다”라는 느낌이 날 것 같다.
