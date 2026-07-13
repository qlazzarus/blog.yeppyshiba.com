# Chicken Farm Implementation Backlog

> 2026-07-13 기준. 이 문서는 현재 PoC들을 플레이 가능한 2D vertical slice로 수렴시키기 위한 실행 우선순위와 완료 기준을 고정한다.

## 목표

닭농장의 핵심 루프를 하나의 월드 모델에서 완성한다.

```text
건설한 닭장·우물 → 닭 관리·알 생산 → 수집·판매·부화 → 방어 건설 → 늑대 압박
```

현재 건설, 순수 경제 simulation, Combat PoC는 각각 동작하지만 서로 다른 entity와 지갑을 사용한다. 따라서 첫 목표는 새 기능을 넓히는 것이 아니라 이 경계를 제거하는 일이다.

## 우선순위

| 순위 | 구현 항목 | 상태 | 완료 기준 |
| ---: | --- | --- | --- |
| P0-1 | 경제·건설 월드 통합 | 다음 | 플레이어가 건설한 닭장/우물이 동일 ID·소유자·footprint로 economy entity가 되고, 취소/파괴 시 함께 제거된다. |
| P0-2 | 공용 지갑·기준 밸런스 | 다음 | 건설, 알 판매, 부화, 구매/업그레이드가 player slot별 단일 wallet을 사용하고 모든 비용은 canonical balance에서 파생된다. |
| P0-3 | 경제 조작 루프 완성 | 다음 | 농부가 알을 줍고 닭장에 입고해 부화하거나 판매할 수 있으며, 완성 닭장의 command card가 이 행동을 제공한다. |
| P0-4 | 실제 맵 늑대 웨이브 | 대기 | 13개 map spawn rect에서 늑대가 spawn되어 실제 농장 구역과 건설물을 대상으로 attack-move, acquire, blocker attack을 수행한다. |
| P1-1 | 좌표 정합·경로 회귀 | 대기 | tilemap/W3X/WPM 변환을 단일 API로 통일하고 8개 시작 지점·13개 spawn·중앙 허브의 이동/건설 회귀가 통과한다. |
| P1-2 | 런타임 성능 측정 복구 | 대기 | `chicken:perf:measure`가 현 fence layout 및 browser smoke 기준으로 통과하고 fog/minimap 비용을 기록한다. |
| P2-1 | 명령 완결성 | 대기 | attack-move resume, building production queue, cancel, rally와 조건부 building command card가 동작한다. |
| P2-2 | 표현·상태 adapter | 대기 | debug marker를 분리하고 sprite/state 및 ground/decor/collision render layer로 게임 상태를 읽기 쉽게 표시한다. |
| P3 | replay·simulation 경계 | 대기 | 경제·전투의 핵심 command log를 재생해 동일 결과를 검증할 수 있다. |

## 스프린트 1 — 경제 통합

범위는 위 P0-1~P0-3이다. 늑대 웨이브, sprite 교체, P2P는 이 스프린트에 포함하지 않는다.

### 작업 순서

1. **공유 player/world 모델 정의**
   - player slot의 wallet, inventory ownership, building/economy entity 연결 키를 정의한다.
   - `BuildingSystem` 완료·취소·파괴 event를 economy adapter가 소비할 수 있게 한다.
2. **건설 건물의 economy lifecycle 연결**
   - `coop_basic` 완료 시 coop inventory/economy state를 생성한다.
   - `well_basic` 완료 시 well aura/economy state를 생성한다.
   - 취소·파괴 시 대응 entity, inventory, field interaction을 정리한다.
3. **단일 wallet 및 balance 도입**
   - 임시 건설 gold와 economy coins의 이중 상태를 제거한다.
   - 시작 자원, 건설 비용, 알 판매가, 부화 비용/시간을 `balance.ts`의 canonical 값으로 모은다.
4. **실제 조작 UI 연결**
   - 건설한 닭장 선택 시 Deposit/Hatch/Sell 명령을 노출한다.
   - 농부 인벤토리의 egg stack을 닭장에 입고하고, 닭장 inventory의 egg로 부화한다.
   - 판매는 실제 inventory stack과 공용 wallet을 변경한다.
5. **회귀 측정과 플레이 검증**
   - 순수 economy 측정은 기존 기준을 유지한다.
   - 건설→산란→pickup→deposit→hatch/sell의 runtime smoke를 추가한다.

### 스프린트 완료 정의

- 시작 자원으로 우물과 닭장을 건설할 수 있다.
- 그 건설한 우물 범위의 닭은 산란 가속을 받는다.
- 그 건설한 닭장이 자체 6-slot inventory를 가지며 알 입고·부화·판매를 처리한다.
- 건설 비용과 알 판매 수익이 HUD의 같은 wallet에 즉시 반영된다.
- 닭장 또는 우물이 파괴/취소되면 더 이상 economy 기능, footprint, 선택 대상이 남지 않는다.
- `npm run chicken:economy:measure` 및 production build가 통과한다.

## 스프린트 이후 순서

스프린트 1이 끝나면 P0-4 실제 맵 늑대 웨이브를 구현한다. 그 뒤 좌표/성능 회귀를 고정하고, 명령·표현·replay를 순차적으로 붙인다.
