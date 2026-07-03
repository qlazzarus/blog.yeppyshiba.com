# 언덕마을 웹게임 구현 계획

이 문서는 Astro 블로그 안에서 Phaser 기반 웹게임으로 구현할 **언덕마을** 프로젝트의
기획, 기술 구조, 리소스 정책, Web Worker 분리 방향을 정리한다.

기존 웹게임 서비스 계획의 원칙을 따른다.

- 게임 소스는 `games/<slug>/` 아래에 둔다.
- 실제 실행 산출물은 `/play/<slug>/` 아래에 배포한다.
- 블로그 글은 `/article/<slug>/`에서 구현 과정과 설계 판단을 설명한다.
- `/games/<slug>/`는 게임 소개와 iframe wrapper 역할을 한다.

권장 slug:

```text
hill-town
```

권장 URL:

```text
/article/phaser-hill-town-isometric-height-poc/
  구현 글, 설계 기록, 고저차 렌더링 설명

/games/hill-town/
  게임 소개 + iframe wrapper

/play/hill-town/
  Phaser/Vite로 빌드된 실제 게임
```

---

## 1. 프로젝트 컨셉

처음 목표는 심시티 2000 전체를 재현하는 것이 아니다.

대신 다음 감각에 집중한다.

> 아이소메트릭 고저차가 있는 지형 위에 도로, 집, 밭, 작은 상점이 붙으면서
> 지방 읍이 천천히 만들어지는 작은 도시 건설 PoC

핵심 키워드:

- 아이소메트릭
- 고저차 지형
- 지방 읍
- 산 아래 마을
- 구불구불한 도로
- 집과 밭
- 작은 상점
- 마을회관
- 느슨한 생활권 시뮬레이션

초기 분위기는 `SimTown`에 가깝게 잡는다.  
복잡한 도시 운영보다는 “언덕 지형 때문에 자연스럽게 마을 모양이 결정되는 재미”가
중심이다.

---

## 2. 하지 않을 것

초기 버전에서는 아래 요소를 넣지 않는다.

- 전기
- 수도
- 세금 슬라이더
- 경찰/소방/병원
- 범죄/오염/화재
- 시민 개별 AI
- 복잡한 교통 시뮬레이션
- 구역 수요 그래프
- 랜덤 지형 생성
- 터널/다리/옹벽
- 복잡한 건물 업그레이드
- 원작 게임 리소스 사용

이 프로젝트의 1차 목표는 도시 시뮬레이션 엔진이 아니라,
**Phaser 아이소메트릭 고저차 렌더링과 Worker 기반 시뮬레이션 분리 구조를 검증하는 것**이다.

---

## 3. MVP 범위

1차 MVP는 아래 정도로 제한한다.

```text
프로젝트명: 언덕마을 PoC

맵:
- 32x32 아이소메트릭 타일
- height 0~3
- 고정 지형 맵

툴:
- 도로
- 집
- 밭
- 상점
- 철거

시뮬레이션:
- 1~2초 = 1개월
- 집은 인구를 만든다
- 밭은 소량 수입을 만든다
- 상점은 주변 집이 충분할 때만 건설 가능
- 도로는 유지비가 든다
- 높이 차이 2 이상이면 도로 연결 불가

핵심 재미:
- 언덕 때문에 도로가 휘어진다
- 도로 주변으로 집과 밭이 붙는다
- 집이 모이면 작은 상점이 생긴다
- 지방 읍 같은 형태가 자연스럽게 나온다
```

---

## 4. 추천 디렉터리 구조

```text
games/
  hill-town/
    package.json
    vite.config.ts
    index.html
    README.md
    src/
      main.ts
      scenes/
        BootScene.ts
        TownScene.ts
      workers/
        simulation.worker.ts
      simulation/
        simulationTypes.ts
        createInitialTownState.ts
        buildRules.ts
        tickMonth.ts
        roadAccess.ts
      render/
        isoMath.ts
        TileView.ts
        TileRenderer.ts
      input/
        BuildTool.ts
        PointerPicker.ts
      ui/
        Hud.ts
        Toolbar.ts
      assets/
        tiles/
        buildings/
    public/
```

초기에는 `games/_shared/`로 성급히 공통화하지 않는다.  
`hill-town` 내부에서 구조를 먼저 안정화한 뒤, 두 번째 이상 게임에서 반복되는 부분만
공통화한다.

공통화 후보:

- `isoMath.ts`
- pointer picking helper
- iframe message helper
- debug overlay
- Worker message queue helper

---

## 5. Phaser와 Web Worker 역할 분리

이 프로젝트는 Main Thread와 Web Worker의 역할을 명확히 나눈다.

```text
Main Thread
- Phaser Scene
- 카메라 이동/줌
- 마우스 입력
- 타일 hover 표시
- 타일/건물 렌더링
- UI / HUD / 툴바
- Worker 결과를 화면에 반영

Web Worker
- 전체 맵 상태 보관
- 고저차 기반 건설 가능 여부 판정
- 도로 인접/연결성 계산
- 월별 인구/수입/유지비 계산
- 마을 성장 시뮬레이션
- 변경된 타일 patch 반환
```

중요한 원칙:

> Worker는 Phaser 객체를 절대 알지 않는다.  
> Worker는 순수 데이터만 받고, 순수 데이터만 반환한다.

---

## 6. 데이터 모델

초기 구현은 가독성을 우선한다.

```ts
export type TerrainType =
    | 'grass'
    | 'road'
    | 'house'
    | 'field'
    | 'shop'
    | 'townhall';

export type Tile = {
    x: number;
    y: number;
    height: number; // 0~3
    terrain: TerrainType;
    buildingLevel: number;
    hasRoadAccess: boolean;
};

export type TownState = {
    width: number;
    height: number;
    month: number;
    money: number;
    population: number;
    tiles: Tile[];
};
```

다만 Main Thread와 Worker 사이에서 전체 맵을 매번 주고받지 않는다.  
초기 생성 시에는 전체 `tiles`를 보내고, 이후에는 변경된 타일만 patch로 보낸다.

```ts
export type TilePatch = {
    x: number;
    y: number;
    terrain?: TerrainType;
    height?: number;
    buildingLevel?: number;
    hasRoadAccess?: boolean;
};

export type SimStats = {
    month: number;
    money: number;
    population: number;
};
```

---

## 7. Worker 메시지 설계

### Main Thread → Worker

```ts
export type WorkerRequest =
    | {
          type: 'INIT_MAP';
          width: number;
          height: number;
          seed?: number;
      }
    | {
          type: 'BUILD';
          tool: 'road' | 'house' | 'field' | 'shop' | 'bulldoze';
          x: number;
          y: number;
      }
    | {
          type: 'TICK_MONTH';
      }
    | {
          type: 'QUERY_TILE';
          x: number;
          y: number;
      };
```

### Worker → Main Thread

```ts
export type WorkerResponse =
    | {
          type: 'MAP_READY';
          width: number;
          height: number;
          tiles: Tile[];
          stats: SimStats;
      }
    | {
          type: 'BUILD_RESULT';
          ok: boolean;
          reason?: string;
          patches: TilePatch[];
          stats: SimStats;
      }
    | {
          type: 'MONTH_RESULT';
          patches: TilePatch[];
          stats: SimStats;
      }
    | {
          type: 'TILE_INFO';
          tile: Tile;
      };
```

---

## 8. 아이소메트릭 고저차 렌더링

고저차 표현은 Phaser 쪽 렌더링 계산에서 처리한다.  
Worker는 `height` 값만 관리한다.

기본 변환:

```ts
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const TILE_WIDTH_HALF = TILE_WIDTH / 2;
const TILE_HEIGHT_HALF = TILE_HEIGHT / 2;
const HEIGHT_STEP = 10;

export function tileToScreen(x: number, y: number, height: number) {
    return {
        screenX: (x - y) * TILE_WIDTH_HALF,
        screenY: (x + y) * TILE_HEIGHT_HALF - height * HEIGHT_STEP,
    };
}
```

초기에는 `height`를 0~3으로 제한한다.

```text
height 0: 낮은 평지
height 1: 완만한 언덕
height 2: 산비탈
height 3: 높은 언덕 / 산지
```

렌더링 우선순위는 `x + y`, 필요 시 `height`와 건물 높이를 추가로 고려한다.

```ts
sprite.setDepth((x + y) * 10 + height);
```

고저차 타일은 처음부터 완벽한 벽면 그래픽을 만들지 않아도 된다.

초기 표현 순서:

1. 높이별로 타일 y 위치를 올린다.
2. 높이 차이가 있는 가장자리에 간단한 어두운 side face를 표시한다.
3. 이후 자체 타일셋으로 교체한다.

---

## 9. 건설 규칙

### 9.1 도로

도로는 다음 조건에서만 건설 가능하다.

```text
- grass 또는 field 위에만 가능
- 주변 도로와 높이 차이가 1 이하이면 연결 가능
- 높이 차이 2 이상인 방향으로는 도로 연결 불가
- 고립 도로는 허용하되 유지비가 든다
```

예시:

```ts
function canBuildRoad(state: TownState, x: number, y: number): BuildCheck {
    const tile = getTile(state, x, y);

    if (!tile) {
        return { ok: false, reason: '맵 밖입니다.' };
    }

    if (tile.terrain !== 'grass' && tile.terrain !== 'field') {
        return { ok: false, reason: '여기에는 도로를 놓을 수 없습니다.' };
    }

    const neighbors = getNeighbors4(state, x, y);
    const roadNeighbors = neighbors.filter((n) => n.terrain === 'road');

    for (const n of roadNeighbors) {
        if (Math.abs(n.height - tile.height) >= 2) {
            return {
                ok: false,
                reason: '경사가 너무 급해서 도로를 연결할 수 없습니다.',
            };
        }
    }

    return { ok: true };
}
```

### 9.2 집

```text
- grass 위에만 가능
- 도로와 인접해야 함
- 높이 0~2까지만 가능
- 주변 도로와 높이 차이 1 이하
```

```ts
function canBuildHouse(state: TownState, x: number, y: number): BuildCheck {
    const tile = getTile(state, x, y);

    if (!tile) return { ok: false, reason: '맵 밖입니다.' };
    if (tile.terrain !== 'grass') {
        return { ok: false, reason: '빈 땅에만 집을 지을 수 있습니다.' };
    }
    if (tile.height >= 3) {
        return { ok: false, reason: '너무 높은 언덕에는 집을 지을 수 없습니다.' };
    }

    const road = getNeighbors4(state, x, y).find(
        (n) => n.terrain === 'road' && Math.abs(n.height - tile.height) <= 1
    );

    if (!road) {
        return { ok: false, reason: '도로 옆에만 집을 지을 수 있습니다.' };
    }

    return { ok: true };
}
```

### 9.3 밭

```text
- grass 위에 가능
- 도로가 없어도 가능
- 높이 0~2 가능
- 높이 3은 산지로 보고 불가
```

밭은 지방 읍 느낌을 만드는 장치이므로 너무 빡빡하게 제한하지 않는다.

### 9.4 상점

```text
- grass 위에 가능
- 도로 옆이어야 함
- 주변 5x5 범위 안에 집 3채 이상 필요
- 높이 0~2 가능
```

상점 규칙은 읍내 중심이 자연스럽게 생기도록 하기 위한 장치다.

---

## 10. 월별 시뮬레이션

초기에는 간단한 월별 처리만 넣는다.

```text
1~2초 = 1개월

매월:
- 집 1채당 인구 +5
- 집 1채당 수입 +1
- 밭 1개당 수입 +1
- 상점 1개당 수입 +5
- 도로 1개당 유지비 -1
- 낮은 확률로 집 buildingLevel 성장
```

예시:

```ts
function tickMonth(state: TownState): MonthResult {
    const patches: TilePatch[] = [];

    state.month += 1;

    let population = 0;
    let income = 0;
    let upkeep = 0;

    for (const tile of state.tiles) {
        if (tile.terrain === 'house') {
            population += 5 * Math.max(1, tile.buildingLevel);
            income += 1;

            if (tile.buildingLevel < 3 && Math.random() < 0.05) {
                tile.buildingLevel += 1;
                patches.push({
                    x: tile.x,
                    y: tile.y,
                    buildingLevel: tile.buildingLevel,
                });
            }
        }

        if (tile.terrain === 'field') {
            income += 1;
        }

        if (tile.terrain === 'shop') {
            income += 5;
        }

        if (tile.terrain === 'road') {
            upkeep += 1;
        }
    }

    state.population = population;
    state.money += income - upkeep;

    return {
        patches,
        stats: {
            month: state.month,
            money: state.money,
            population: state.population,
        },
    };
}
```

---

## 11. 마을회관과 도로 접근성

MVP 이후에는 마을회관을 중심으로 접근성을 계산한다.

```text
- 마을회관에서 도로로 연결된 곳만 읍내로 인정
- 도로 연결이 끊긴 건물은 외딴집으로 표시
- 외딴집은 인구는 만들지만 상점 수요에는 덜 기여
```

이 계산은 Worker에서 BFS로 처리한다.

```ts
function updateRoadAccess(state: TownState): TilePatch[] {
    const patches: TilePatch[] = [];
    const townhall = state.tiles.find((t) => t.terrain === 'townhall');

    if (!townhall) return patches;

    const visited = new Set<string>();
    const queue = [townhall];

    while (queue.length > 0) {
        const current = queue.shift()!;

        for (const n of getNeighbors4(state, current.x, current.y)) {
            if (visited.has(`${n.x},${n.y}`)) continue;
            if (n.terrain !== 'road') continue;
            if (Math.abs(n.height - current.height) > 1) continue;

            visited.add(`${n.x},${n.y}`);
            queue.push(n);
        }
    }

    for (const tile of state.tiles) {
        const old = tile.hasRoadAccess;
        const connected = getNeighbors4(state, tile.x, tile.y).some((n) =>
            visited.has(`${n.x},${n.y}`)
        );

        tile.hasRoadAccess = connected;

        if (old !== connected) {
            patches.push({
                x: tile.x,
                y: tile.y,
                hasRoadAccess: connected,
            });
        }
    }

    return patches;
}
```

---

## 12. Phaser에서 Worker 연결

Vite 기준 Worker 생성:

```ts
const worker = new Worker(
    new URL('../workers/simulation.worker.ts', import.meta.url),
    { type: 'module' }
);
```

Scene 예시:

```ts
class TownScene extends Phaser.Scene {
    private worker!: Worker;

    create() {
        this.worker = new Worker(
            new URL('../workers/simulation.worker.ts', import.meta.url),
            { type: 'module' }
        );

        this.worker.onmessage = this.handleWorkerMessage.bind(this);

        this.worker.postMessage({
            type: 'INIT_MAP',
            width: 32,
            height: 32,
            seed: 1234,
        });
    }

    private handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
        const message = event.data;

        if (message.type === 'MAP_READY') {
            this.renderFullMap(message.tiles);
            this.updateHud(message.stats);
            return;
        }

        if (message.type === 'BUILD_RESULT') {
            if (!message.ok) {
                this.showToast(message.reason ?? '건설할 수 없습니다.');
                return;
            }

            this.applyPatches(message.patches);
            this.updateHud(message.stats);
            return;
        }

        if (message.type === 'MONTH_RESULT') {
            this.applyPatches(message.patches);
            this.updateHud(message.stats);
            return;
        }
    }
}
```

Patch 적용:

```ts
function applyPatches(patches: TilePatch[]) {
    for (const patch of patches) {
        const key = `${patch.x},${patch.y}`;
        const tileView = this.tileViews.get(key);

        if (!tileView) continue;

        tileView.updateFromPatch(patch);
    }
}
```

---

## 13. 리소스 정책

### 사용하지 않을 것

SimCity 2000 원본 리소스는 사용하지 않는다.

이유:

- 원본 리소스는 EA/Maxis 저작권 대상이다.
- 일부 오픈소스 재현 프로젝트도 원본 리소스를 저장소에 포함하지 않고 사용자가 직접 추출하게 한다.
- 블로그 공개, GitHub 공개, 웹 배포, 수익화 가능성을 생각하면 피하는 것이 안전하다.

### OpenSC2K에 대한 판단

OpenSC2K는 참고 대상으로만 본다.

활용 가능:

- 아이소메트릭 타일 배치 감각
- 고저차 렌더링 아이디어
- 타일 ID와 렌더링 매핑 구조
- 카메라/줌 UX 참고

피할 것:

- 코드 대량 복붙
- 원본 SimCity 2000 리소스 사용
- SimCity 2000 클론으로 보이는 네이밍
- LARGE.DAT에서 추출한 타일 배포

### OpenTTD / OpenGFX에 대한 판단

OpenGFX는 오픈소스 리소스이지만 GPL v2 기반이므로 주의한다.

판단:

```text
- 프로토타입/레퍼런스용으로는 검토 가능
- 최종 프로젝트 리소스로는 부담 있음
- GPL 조건 준수, 라이선스 고지, 수정본 공개 범위를 검토해야 함
- 독립 IP로 키울 프로젝트라면 최종 리소스에서는 제외하는 편이 안전
```

### 추천 리소스 후보

1차 PoC는 CC0 리소스를 우선 검토한다.

```text
추천:
- Kenney Isometric Tiles City
- OpenGameArt CC0 isometric town tiles

주의:
- Liberated Pixel Cup 계열은 CC BY-SA / GPL 조건이 많아 관리가 번거로움
- OpenGFX는 GPL v2라서 최종 리소스로는 신중히 사용
```

장기적으로는 자체 제작 리소스를 목표로 한다.

자체 제작 후보:

- 낮은 채도의 잔디 타일
- 논밭
- 시골길
- 아스팔트 도로
- 슬레이트 지붕 집
- 작은 슈퍼
- 마을회관
- 버스정류장
- 저수지
- 산비탈
- 옹벽 느낌의 지형 side face

---

## 14. 개발 마일스톤

### M1. 아이소메트릭 고저차 렌더링

```text
- 32x32 맵 렌더링
- height 0~3 적용
- tileToScreen 구현
- 높이에 따른 screenY 보정
- hover 타일 표시
- 임시 타일 리소스 적용
```

블로그 1편 후보:

```text
Phaser 아이소메트릭에서 height 값을 적용해 언덕 타일 만들기
```

### M2. Worker 기반 맵 상태 분리

```text
- simulation.worker.ts 생성
- INIT_MAP 메시지 구현
- Worker가 TownState 보관
- Main Thread는 MAP_READY로 받은 tiles 렌더링
- TilePatch 구조 도입
```

블로그 2편 후보:

```text
Phaser 도시 시뮬레이션에서 Web Worker로 맵 상태 분리하기
```

### M3. 도로 건설과 경사 규칙

```text
- RoadTool 구현
- 클릭 시 BUILD 메시지 전송
- Worker에서 canBuildRoad 처리
- 높이 차이 2 이상이면 도로 연결 불가
- 성공 시 해당 타일 patch 반환
```

블로그 3편 후보:

```text
아이소메트릭 언덕 지형에서 도로 건설 규칙 만들기
```

### M4. 집/밭/상점 건설

```text
- HouseTool 구현
- FieldTool 구현
- ShopTool 구현
- 집은 도로 옆에만 가능
- 밭은 완만한 지형에 가능
- 상점은 주변 집 수 조건 필요
```

블로그 4편 후보:

```text
지방 읍 느낌을 만드는 집, 밭, 작은 상점 배치 규칙
```

### M5. 월별 시뮬레이션

```text
- Phaser Time Event로 TICK_MONTH 전송
- Worker에서 인구/수입/유지비 계산
- HUD 갱신
- 낮은 확률로 집 buildingLevel 성장
```

블로그 5편 후보:

```text
Phaser와 Web Worker로 작은 마을의 월별 성장 루프 만들기
```

### M6. 마을회관과 도로 접근성

```text
- townhall 타일 도입
- BFS로 도로 연결성 계산
- 연결되지 않은 건물은 외딴집 처리
- 상점 수요 계산에서 접근성 반영
```

블로그 6편 후보:

```text
마을회관에서 이어지는 길만 읍내로 인정하는 도로 접근성 계산
```

---

## 15. 블로그 연재 방향

이 프로젝트는 단순히 게임을 만드는 글보다,
“AI coding agent 시대에 어떤 경계를 사람이 설계해야 하는가”를 보여주는 글감으로 적합하다.

연재에서 강조할 포인트:

- Phaser는 렌더링/입력에 집중시킨다.
- 도시 상태와 규칙은 Web Worker로 분리한다.
- 고저차 지형 때문에 게임 규칙이 자연스럽게 생긴다.
- 원작 리소스는 쓰지 않고 자체 방향성을 만든다.
- 작은 MVP로 시작해서 점진적으로 확장한다.

추천 태그:

```yaml
tags:
    - phaser
    - typescript
    - web-worker
    - isometric
    - city-builder
    - game-dev
    - simulation
```

주의:

- `coding`은 category와 중복되므로 tag로 넣지 않는다.
- `simcity`, `simcity2000`은 검색어로 본문에서만 다루고 canonical tag로는 쓰지 않는다.
- 원작 게임명을 과도하게 노출하지 않는다.

---

## 16. article frontmatter 초안

```yaml
---
title: Phaser로 언덕 있는 지방 읍 만들기 — 아이소메트릭 고저차 PoC 설계
date: 2026-07-03T21:00:00+09:00
summary: Phaser에서 아이소메트릭 고저차 타일을 그리고, Web Worker로 도시 상태와 건설 규칙을 분리해 작은 지방 읍 건설 시뮬레이션을 만드는 계획을 정리했다.
category: coding
image: /images/posts/202607/phaser-hill-town-isometric-height-poc.png
tags:
    - phaser
    - typescript
    - web-worker
    - isometric
    - city-builder
    - game-dev
    - simulation
parcelAddress:
lat:
lng:
---
```

---

## 17. 게임 README 초안

```md
# Hill Town

Phaser 기반 아이소메트릭 지방 읍 건설 PoC.

## URLs

- Article: /article/phaser-hill-town-isometric-height-poc/
- Wrapper: /games/hill-town/
- Play: /play/hill-town/

## Focus

- Isometric tile rendering with height
- Small town construction on sloped terrain
- Road/building rules based on elevation difference
- Web Worker based simulation state
- Phaser Scene as rendering/input adapter

## Current Scope

- 32x32 map
- height 0~3
- road / house / field / shop / bulldoze tools
- monthly population and money simulation
- TilePatch based rendering updates

## Not in Scope Yet

- electricity
- water
- traffic simulation
- disasters
- citizen AI
- complex zoning demand
- original SimCity 2000 resources

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
```

---

## 18. 판단 기준

이 프로젝트는 대형 도시 시뮬레이션을 목표로 하지 않는다.

성공 기준은 다음과 같다.

```text
- 언덕 때문에 도로를 놓는 판단이 생긴다.
- 도로 주변으로 집과 밭이 붙으며 마을 모양이 나온다.
- Phaser와 Worker의 경계가 명확하다.
- 블로그 글에서 구조와 설계 판단을 설명할 수 있다.
- 원작 게임 리소스 없이 독립적인 방향성을 가진다.
```

초기에는 게임 완성도보다 구조 검증을 우선한다.

가장 중요한 한 줄:

> Phaser는 보이는 것을 담당하고, Web Worker는 마을의 보이지 않는 규칙을 담당한다.
