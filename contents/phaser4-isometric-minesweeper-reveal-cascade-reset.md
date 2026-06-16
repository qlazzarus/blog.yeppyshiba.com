---
title: Phaser 4 Isometric Minesweeper 3편 — 빈 칸 연쇄 오픈과 새 게임 흐름 만들기
date: 2026-06-16T09:00:00+09:00
summary: 지뢰찾기의 손맛을 만드는 빈 칸 연쇄 오픈을 BFS로 구현하고, 새 게임 버튼과 남은 지뢰 수 UI를 추가했습니다.
image: /images/posts/202606/isometric-minesweeper-combo.jpg
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

[지난 글](/article/phaser4-isometric-minesweeper-minefield-first-click/)에서는 Isometric Minesweeper에 실제 지뢰찾기 규칙을 얹었다.

그때 구현한 내용은 다음과 같았다.

- 첫 클릭 이후 지뢰 배치
- 첫 클릭 타일과 주변 8칸 안전 처리
- 주변 지뢰 수 계산
- 좌클릭 reveal
- 우클릭 flag
- 승리/패배 상태 처리

이 정도면 지뢰찾기 규칙은 어느 정도 들어갔다고 볼 수 있다.

하지만 막상 플레이해보면 아직 중요한 느낌이 빠져 있었다.

지뢰찾기에서 빈 칸을 눌렀을 때 주변 영역이 한 번에 열리는 그 시원한 순간이 없었다.

이번 글에서는 그 부분을 구현했다.

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

이번 구현 범위는 일부러 크게 잡지 않았다.

- 빈 칸 연쇄 오픈
- 새 게임 버튼
- 남은 지뢰 수 UI

이 세 가지만 넣었다.

숫자, 깃발, 지뢰를 더 예쁘게 그리는 작업은 다음으로 미뤘다. 지금은 게임이 지뢰찾기답게 반응하는 것이 더 중요했다.

## 지뢰찾기에서 빈 칸이 열리는 규칙

지뢰찾기에서 어떤 타일의 주변 지뢰 수가 0이면, 그 타일 주변도 자동으로 열린다.

그리고 주변 타일 중 또 0인 타일이 있으면, 그 타일 주변도 다시 열린다.

이 과정은 더 이상 확장할 0 타일이 없을 때까지 반복된다.

다만 숫자 타일은 열리기만 하고, 그 너머로 확장하지 않는다.

정리하면 이렇게 된다.

- 지뢰가 아닌 타일만 연다.
- 깃발이 꽂힌 타일은 자동으로 열지 않는다.
- 주변 지뢰 수가 0이면 이웃을 queue에 넣는다.
- 주변 지뢰 수가 1 이상이면 열고 멈춘다.
- 이미 연 타일은 다시 처리하지 않는다.

이 규칙은 화면이 isometric인지 아닌지와 상관없다.

게임 규칙은 여전히 `x, y` grid 좌표 위에서 동작한다. isometric 좌표는 화면에 그릴 때와 pointer picking을 할 때만 필요하다.

## revealTileSystem의 흐름 바꾸기

지난 구현에서는 타일을 열 때 단순히 `revealed = true`만 했다.

```ts
tileState.revealed = true;
```

이번에는 주변 지뢰 수를 확인해서 다르게 처리한다.

```ts
const adjacentMineCount = world.adjacentMineCounts.get(entityId) ?? 0;

if (adjacentMineCount === 0) {
    revealConnectedSafeTiles(world, tile, layout);
} else {
    tileState.revealed = true;
}
```

주변 지뢰 수가 0이면 `revealConnectedSafeTiles`를 호출한다.

0이 아니면 기존처럼 해당 타일만 연다.

지뢰를 눌렀을 때의 패배 처리는 그 전에 먼저 검사한다.

```ts
if (world.mines.has(entityId)) {
    tileState.revealed = true;
    world.resources.gameStatus = 'lost';
    revealAllMines(world);
    return { changed: true, statusChanged: true };
}
```

이 순서가 중요하다.

지뢰인지 먼저 확인하고, 안전 타일일 때만 주변 지뢰 수를 보고 연쇄 오픈을 판단한다.

## BFS로 빈 칸 확장하기

빈 칸 연쇄 오픈은 DFS로도 구현할 수 있고 BFS로도 구현할 수 있다.

이번에는 queue를 사용하는 BFS로 구현했다.

```ts
function revealConnectedSafeTiles(
    world: World,
    startTile: TilePoint,
    layout: BoardLayout,
) {
    const queue = [startTile];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const tile = queue.shift();
        if (!tile) continue;

        const tileKey = `${tile.x},${tile.y}`;
        if (visited.has(tileKey)) continue;
        visited.add(tileKey);

        const entityId = getEntityAtTile(world, tile);
        if (!entityId || world.flags.has(entityId) || world.mines.has(entityId))
            continue;

        const tileState = world.tiles.get(entityId);
        if (!tileState || tileState.revealed) continue;

        tileState.revealed = true;

        const adjacentMineCount = world.adjacentMineCounts.get(entityId) ?? 0;
        if (adjacentMineCount > 0) continue;

        getNeighborTiles(tile, layout).forEach((neighbor) => {
            queue.push(neighbor);
        });
    }
}
```

코드의 핵심은 아래 흐름이다.

1. 시작 타일을 queue에 넣는다.
2. queue에서 하나씩 꺼낸다.
3. 이미 방문한 좌표라면 넘어간다.
4. flag, mine, 이미 열린 타일은 제외한다.
5. 타일을 연다.
6. 주변 지뢰 수가 0이면 이웃 타일을 queue에 추가한다.
7. 주변 지뢰 수가 1 이상이면 확장하지 않는다.

이렇게 하면 0 타일 영역은 계속 퍼지고, 그 경계에 있는 숫자 타일은 열리기만 한다.

## flag는 자동 reveal에서 제외한다

자동 reveal을 구현할 때 은근히 중요한 부분이 flag 처리다.

```ts
if (!entityId || world.flags.has(entityId) || world.mines.has(entityId)) continue;
```

사용자가 깃발을 꽂았다는 것은 “이 타일은 위험하다고 표시해두겠다”는 의도다.

자동 오픈이 그 의도를 무시하고 flag 타일까지 열어버리면 플레이 감각이 이상해진다.

물론 사용자가 잘못 꽂은 flag일 수도 있다.

그래도 자동 reveal은 flag를 존중하는 편이 낫다. 잘못 꽂은 flag는 사용자가 다시 우클릭해서 해제하면 된다.

## 승리 조건은 연쇄 오픈 후에 다시 계산한다

연쇄 오픈이 들어오면 한 번의 클릭으로 여러 타일이 열린다.

그래서 승리 조건은 cascade가 끝난 뒤에 확인해야 한다.

```ts
if (hasWon(world)) {
    world.resources.gameStatus = 'won';
    return { changed: true, statusChanged: true };
}
```

`hasWon` 자체는 지난 글과 같다.

```ts
function hasWon(world: World) {
    for (const [entityId, tileState] of world.tiles) {
        if (!world.mines.has(entityId) && !tileState.revealed) return false;
    }

    return true;
}
```

모든 안전 타일이 열렸으면 승리다.

flag가 정확하게 꽂혔는지는 보지 않는다. 지뢰찾기의 승리 조건은 보통 지뢰를 모두 표시하는 것이 아니라, 지뢰가 아닌 칸을 모두 여는 것이다.

## 새 게임 버튼 추가

지난 상태에서는 게임이 끝나면 브라우저 새로고침을 해야 했다.

작은 데모에서는 괜찮지만, 실제로 플레이해보면 흐름이 끊긴다.

그래서 우측 상단에 `New game` 버튼을 추가했다.

```ts
this.add
    .text(736, 24, 'New game', {
        backgroundColor: '#26343c',
        color: '#f3efe2',
        fixedWidth: 118,
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: '700',
        padding: {
            bottom: 8,
            left: 14,
            right: 14,
            top: 8,
        },
    })
    .setDepth(10)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
        this.resetGame();
    });
```

아직 버튼 디자인은 임시다.

나중에 UI를 정리할 때 icon button이나 별도 HUD 영역으로 옮길 수 있다. 지금은 기능 확인이 먼저라 text button으로 두었다.

## reset은 World 재생성으로 처리했다

새 게임을 시작하는 방법은 여러 가지가 있다.

- Phaser Scene을 restart한다.
- 기존 `World`의 map과 set을 전부 비운다.
- `World`를 새로 만들고 보드를 다시 생성한다.

이번에는 세 번째 방식을 택했다.

```ts
private resetGame() {
    this.world = createWorld();
    createBoardSystem(this.world, this.boardLayout);
    this.renderGame();
}
```

지금 게임 상태는 대부분 `World` 안에 있다.

그래서 `World`를 새로 만들고 `createBoardSystem`을 다시 호출하면 꽤 깔끔하게 초기 상태로 돌아간다.

Scene에 남아 있는 것은 Phaser object들이다.

- board graphics
- hover graphics
- status text
- tile label text objects

`renderGame`을 호출하면 보드 graphics는 다시 그려지고, tile label은 기존 label을 지운 뒤 새로 만들어진다.

```ts
private renderGame() {
    renderBoardSystem(this.world, this.boardGraphics, this.boardLayout);
    renderHoverSystem(this.world, this.hoverGraphics, this.boardLayout);
    this.tileLabels = renderTileContentSystem(this.world, this, this.tileLabels);
    this.statusText.setText(this.getStatusText());
}
```

이 정도면 현재 규모에서는 충분하다.

## UI 영역 클릭은 보드 입력에서 제외했다

새 게임 버튼을 추가하면서 작은 문제가 생겼다.

버튼도 Phaser input이고, 보드 클릭도 Phaser input이다. 버튼을 눌렀을 때 보드 입력까지 같이 처리되면 이상한 동작이 생길 수 있다.

그래서 pointer down 시작 부분에서 UI 영역을 먼저 제외했다.

```ts
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (this.isUiPointer(pointer)) return;

    updateHoveredTileSystem(
        this.world,
        pointer.worldX,
        pointer.worldY,
        this.boardLayout,
    );

    // ...
});
```

현재 UI는 화면 위쪽에만 있으므로 단순하게 `worldY` 기준으로 처리했다.

```ts
private isUiPointer(pointer: Phaser.Input.Pointer) {
    return pointer.worldY < 105;
}
```

이 방식은 임시다.

버튼이 많아지면 UI container를 따로 두거나, hit area 기반으로 더 명확히 분리하는 편이 낫다. 하지만 지금 단계에서는 충분히 읽기 쉽고 동작도 명확하다.

## 남은 지뢰 수 표시

이번에 상태 문구도 조금 바꿨다.

이전에는 전체 지뢰 수와 flag 수만 보여줬다.

```text
Mines 14 | Flags 3
```

이제는 남은 지뢰 수를 보여준다.

```ts
export function getMinesLeft(world: World, layout: BoardLayout) {
    return Math.max(0, layout.mineCount - world.flags.size);
}
```

그리고 상태 문구는 이렇게 정리했다.

```ts
private getStatusText() {
    const flagCount = this.world.flags.size;
    const minesLeft = getMinesLeft(this.world, this.boardLayout);

    if (this.world.resources.gameStatus === 'ready') {
        return `Ready | Mines left ${minesLeft} | Flags ${flagCount}`;
    }

    if (this.world.resources.gameStatus === 'lost') {
        return `Game over | Mines left ${minesLeft} | Flags ${flagCount}`;
    }

    if (this.world.resources.gameStatus === 'won') {
        return `Clear | Mines left ${minesLeft} | Flags ${flagCount}`;
    }

    return `Playing | Mines left ${minesLeft} | Flags ${flagCount}`;
}
```

여기서 남은 지뢰 수는 실제 정답 기준이 아니다.

단순히 `전체 지뢰 수 - 사용자가 꽂은 flag 수`다.

사용자가 틀린 곳에 flag를 꽂아도 숫자는 줄어든다. 하지만 대부분의 지뢰찾기 UI도 이런 방식에 가깝다. 남은 지뢰 수는 힌트가 아니라 플레이어가 표시한 flag 수를 반영한 카운터다.

## 지금 상태

이번 구현으로 게임 감각이 꽤 달라졌다.

이제 0 타일을 누르면 주변 영역이 한 번에 열린다.

첫 클릭 주변을 안전하게 비워둔 효과도 이제 더 잘 느껴진다. 첫 클릭이 0 타일이면 보드 일부가 한 번에 열리면서, 비로소 지뢰찾기다운 시작이 된다.

현재 가능한 플레이는 다음과 같다.

- 좌클릭으로 타일 열기
- 첫 클릭 이후 지뢰 배치
- 0 타일 클릭 시 빈 칸 연쇄 오픈
- 우클릭으로 flag 토글
- 남은 지뢰 수 확인
- 지뢰 클릭 시 패배
- 모든 안전 타일 reveal 시 승리
- 새 게임 버튼으로 재시작

아직 부족한 부분도 분명하다.

- `F`, `M` text 표현이 임시다.
- 버튼 디자인이 아직 투박하다.
- 타이머가 없다.
- 난이도 선택이 없다.
- 모바일 조작이 없다.
- 반응형 보드 재계산이 없다.

하지만 이제는 “규칙이 있는 데모”가 아니라, 짧게라도 실제로 플레이할 수 있는 지뢰찾기에 가까워졌다.

## 다음 단계

다음에는 렌더링을 다듬는 쪽이 좋아 보인다.

지금은 `F`, `M`, 숫자를 모두 text로 그리고 있다.

구현 확인에는 충분하지만, isometric 보드 위에 올라가는 게임 오브젝트로 보기에는 조금 딱딱하다.

다음 작업 후보는 다음과 같다.

- 숫자 색상과 위치 조정
- 깃발과 지뢰를 text 대신 icon 또는 sprite로 표현
- 열린 타일과 닫힌 타일의 색상 polish
- hover layer 정리
- 새 게임 버튼을 HUD로 정리

게임 규칙은 어느 정도 중심이 잡혔다.

이제부터는 “플레이 가능한 것”을 “보기 좋고 계속 만지고 싶은 것”으로 바꾸는 단계다.

## 정리

이번 작업의 핵심은 세 가지였다.

- BFS로 빈 칸 연쇄 오픈을 구현했다.
- `World` 재생성으로 새 게임 흐름을 만들었다.
- flag 수를 기준으로 남은 지뢰 수 UI를 추가했다.

특히 연쇄 오픈은 지뢰찾기에서 체감이 큰 기능이다.

코드 양은 많지 않지만, 이 기능 하나로 게임이 훨씬 지뢰찾기처럼 느껴진다.

다음에는 시각적인 표현을 다듬으면서 isometric 보드 위에 올라가는 숫자, 깃발, 지뢰를 조금 더 게임답게 만들어볼 생각이다.
