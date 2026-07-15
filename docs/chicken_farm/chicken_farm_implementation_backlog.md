# Chicken Farm Implementation Backlog

> 2026-07-14 기준. 이 문서는 현재 PoC들을 플레이 가능한 2D vertical slice로 수렴시키기 위한 실행 우선순위와 완료 기준을 고정한다.

## 목표

닭농장의 핵심 루프를 하나의 월드 모델에서 완성한다.

```text
건설한 닭장·우물 → 닭 관리·알 생산 → 수집·판매·부화 → 방어 건설 → 늑대 압박
```

현재 건설, 순수 economy simulation, Combat PoC는 각각 동작하지만 서로 다른 entity와 지갑을 사용한다. 따라서 첫 목표는 새 기능을 넓히는 것이 아니라 이 경계를 제거하는 일이다.

## 현재 포커스

**건설한 닭장·우물에 경제를 붙이고, 시장에서만 알을 판매해 하나의 지갑에 반영하게 만든다.**

첫 vertical slice는 아래 루프가 실제 맵의 동일한 월드 상태에서 이어지는 것으로 판정한다.

```text
건설한 우물·닭장 → 닭 산란 가속 → 농부의 알 수집 → 닭장 입고·부화 또는 농부가 시장으로 운반·판매 → 공용 지갑 반영
```

늑대 웨이브, sprite 교체, P2P, 생산 queue는 이 루프가 통합 smoke를 통과한 뒤에 진행한다.

## 전체 구현 우선순위

| 순위 | 구현 항목 | 상태 | 완료 기준 |
| ---: | --- | --- | --- |
| 1 | 경제·건설 월드 통합 | **진행 대상** | 플레이어가 건설한 닭장/우물이 동일 ID·소유자·footprint로 economy entity가 되고, 취소/파괴 시 함께 제거된다. |
| 2 | 공용 지갑·기준 밸런스 | **진행 대상** | 건설, 알 판매, 부화, 구매/업그레이드가 player slot별 단일 wallet을 사용하고 모든 비용은 canonical balance에서 파생된다. |
| 3 | 경제 조작 루프 완성 | **진행 대상** | 농부가 알을 줍고 닭장에 입고해 부화하거나 판매할 수 있으며, 완성 닭장의 command card가 이 행동을 제공한다. |
| 4 | 실제 맵 늑대 웨이브 | 대기 | 13개 map spawn rect에서 늑대가 spawn되어 실제 농장 구역과 건설물을 대상으로 attack-move, acquire, blocker attack을 수행한다. |
| 5 | 좌표 정합·경로 회귀 및 성능 측정 | 대기 | tilemap/W3X/WPM 변환을 단일 API로 통일하고 8개 시작 지점·13개 spawn·중앙 허브 회귀와 `chicken:perf:measure` browser smoke가 통과한다. |
| 6 | 명령 완결성 | 대기 | attack-move resume, building production queue, cancel, rally와 조건부 building command card가 동작한다. |
| 7 | 표현·상태 adapter | 대기 | debug marker를 분리하고 sprite/state 및 ground/decor/collision render layer로 게임 상태를 읽기 쉽게 표시한다. |
| 8 | replay·simulation 경계와 P2P 기반 | 대기 | 경제·전투의 핵심 command log를 재생해 동일 결과를 검증하고, host authority/player-slot별 시야로 확장할 경계를 확보한다. |
| 9 | 채팅 명령·디버그 치트 모드 | 대기 | 게임 밸런스 시작값을 정상화한 뒤에도, 개발/테스트 세션에서 채팅창 치트 명령으로 자원·유닛·웨이브·시간을 조작할 수 있다. |

## 스프린트 1 — 경제 통합

범위는 위 1~3이다. 늑대 웨이브, sprite 교체, P2P는 이 스프린트에 포함하지 않는다.

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
   - 건설한 닭장 선택 시 Hatch를 노출하고, 농부 인벤토리의 egg stack을 닭장에 입고한다.
   - 닭장 inventory의 egg로 부화한다.
   - 완성 시장을 건설한 뒤, 알을 든 농부가 시장을 우클릭했을 때만 inventory stack을 판매하고 공용 wallet을 변경한다.
5. **회귀 측정과 플레이 검증**
   - 순수 economy 측정은 기존 기준을 유지한다.
   - 건설→산란→pickup→deposit→hatch/sell의 runtime smoke를 추가한다.

### 자동 측정 기준

구현은 각 단계가 사람이 화면에서만 확인해야 하는 상태로 끝나지 않게 한다.

| 연결 지점 | 자동 측정 | 통과 조건 |
| --- | --- | --- |
| 건설 lifecycle → economy entity | `chicken:economy:measure` | completed building ID로 coop/well과 inventory가 생성되고, 제거 시 모두 정리된다. |
| 우물 → 닭 산란 | `chicken:economy:measure` | 우물 범위 닭은 가속된 tick에 egg drop하고 범위 밖 닭은 기본 tick을 유지한다. |
| 농부 수집 → 닭장 입고 | `chicken:economy:measure` | field egg가 농부 stack을 거쳐 coop stack으로 이동하며, 6-slot 규칙을 지킨다. |
| 부화 | `chicken:economy:measure` | 명시 hatch가 egg 한 개를 소비하고, 정해진 시간 뒤 footprint 밖에 닭을 생성한다. |
| 시장 판매 → 공용 지갑 | `chicken:economy:measure` | 시장 ID 없이 egg sale은 거절되며, 완성 시장에서 판매한 egg stack만 shared wallet의 coins/gold를 한 번 증가시킨다. |
| 실제 조작 연결 | browser runtime smoke | 건설한 coop/well 선택, inventory command, HUD wallet이 같은 state 변화를 표시한다. |

`npm run chicken:economy:measure`는 결과를 `chicken_farm_w3x_artifacts/economy_poc_metrics.json`에 저장한다. 새 economy command나 비용 규칙을 추가할 때는 해당 불변식을 같은 스크립트에 먼저 추가한다.

### 스프린트 완료 정의

- 시작 자원으로 우물과 닭장을 건설할 수 있다.
- 그 건설한 우물 범위의 닭은 산란 가속을 받는다.
- 그 건설한 닭장이 자체 6-slot inventory를 가지며 알 입고·부화를 처리한다.
- 완성 시장이 없으면 판매할 수 없고, 알을 든 농부가 시장에 도착했을 때만 판매된다.
- 건설 비용과 알 판매 수익이 HUD의 같은 wallet에 즉시 반영된다.
- 닭장 또는 우물이 파괴/취소되면 더 이상 economy 기능, footprint, 선택 대상이 남지 않는다.
- `npm run chicken:economy:measure` 및 production build가 통과한다.

## 스프린트 이후 순서

스프린트 1이 끝나면 P0-4 실제 맵 늑대 웨이브를 구현한다. 그 뒤 좌표/성능 회귀를 고정하고, 명령·표현·replay를 순차적으로 붙인다.

## 후속: 채팅 명령과 디버그 치트 모드

현재의 높은 시작 골드·목재·서플라이는 빠른 economy/건설 검증을 위한 임시 debug preset이다. 실제 플레이 밸런스로 시작값을 복귀할 때에는 이 값을 계속 높게 유지하지 않고, 채팅창의 명시적 치트 명령으로 테스트 편의를 제공한다.

- 기본 게임에서는 채팅 메시지를 일반 팀/로비 메시지로 처리한다.
- 치트는 **로컬 개발·싱글플레이 debug session 전용**이다. 네트워크/P2P 세션에서는 입력을 일반 채팅으로만 처리하고 어떠한 게임 상태도 변경하지 않는다.
- 워크래프트 III 치트의 짧은 영문 키워드·즉시 피드백 감각을 계승한다. 예를 들어 자원은 `greedisgood <gold> <lumber>`, 무적/즉시 완료/시야/마나는 각각 `whosyourdaddy`, `warpten`, `iseedeadpeople`, `thereisnospoon` 계열의 로컬 debug alias로 제공한다. 웹판 고유 기능(알·닭·웨이브·시간)은 같은 톤의 별도 명령으로 확장한다.
- 최소 명령 범위: 골드·목재·서플라이 증감/설정, 알·닭 생성, 건물 즉시 완성, 웨이브 생성·정지, 게임 시간 배속/점프, 현재 state 출력.
- 명령 실행은 telemetry/event log에 남기고, 명령 문자열·인자·실행 결과·거절 사유를 기록한다.
- 각 치트 명령은 단위 자동 측정과 함께 추가한다. production 공개 세션과 모든 네트워크 세션에서는 치트 입력이 상태를 변경하지 않아야 한다.
