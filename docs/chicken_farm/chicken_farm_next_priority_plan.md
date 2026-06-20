# Chicken Farm Next Priority Plan

이 문서는 Chicken Farm Phaser MVP의 남은 PoC 우선순위와 다음 구현 대상을 정리한다.

원칙:

- PoC는 구현 리스크를 쪼개기 위한 단계이며, MVP의 원본 경험 범위를 줄이는 기준이 아니다.
- 원본 논리 시간, 8인 슬롯, 농부+개 시작, 거미/늑대의 돌/늑대 웨이브, 가족/상점/건물 테크는 데이터 모델에 유지한다.
- 빠른 검증은 룰 축소가 아니라 `timeScale`, debug preset, 자동 측정 스크립트로 처리한다.
- 차후 통합을 위해 PoC 로직은 가능한 한 Phaser GameObject와 분리하고, ECS component/query로 옮기기 쉬운 순수 상태/시스템 형태로 작성한다.

## 1. 현재 결정

다음 우선 구현 PoC는 **PoC 7. 닭/알/수익 PoC**로 확정한다.

근거:

- WPM Terrain Blocker, Path Smoothing, WolfAI 상태 머신은 전투/이동 기반 검증을 통과했다.
- 남은 통합 PoC 중 economy는 거미 보너스, 보스 보상, 타임라인, 8인 슬롯 통합의 공통 선행 조건이다.
- 상점/교환, 가족 테크, FoW/미니맵은 병렬 가능하지만, 게임 루프 검증 관점에서는 30초 수익 tick과 자원 상태가 먼저 필요하다.

## 2. 완료된 기반 PoC

| 항목 | 상태 | 판단 |
| --- | --- | --- |
| Tilemap 맵 PoC | 완료 | 원본 크기 기반 Tilemap, trim offset, 핵심 object layer 반영 |
| PoC 2. 늑대/방벽/공격 건물 | 완료 기준 충족 | 전투/건물 blocker/공격 전환 확인용 baseline 확보 |
| WPM Terrain Blocker 이식 | 완료 | `.wpm` 기반 terrain grid를 A* 입력과 debug overlay에 연결 |
| Path Smoothing 이식 | 완료 | raw/smoothed 비교에서 waypoint/turn 감소 및 blocker safety 확인 |
| WolfAI 상태 머신 PoC | 완료 | 순수 decision layer와 Warsmash fit 측정 통과 |
| W3X 기준 데이터 고정 | 완료 | wave, unit stats, ability, building, item/reward 후보 TSV 확보 |

완료 artifact:

- WPM/pathing metrics: `docs/chicken_farm/chicken_farm_w3x_artifacts/terrain_pathing_poc_metrics.json`
- WolfAI metrics: `docs/chicken_farm/chicken_farm_w3x_artifacts/wolf_ai_state_machine_metrics.json`
- WPM runtime grid: `games/chicken-farm/assets/data/wpm_pathing_grid.json`

핵심 측정 결과:

- `micro_a`: raw waypoint `89` -> smoothed `4`, turn `9` -> `1`, detour `1.17` -> `1.13`, waypoint 감소율 `95.51%`
- `micro_b`: raw waypoint `80` -> smoothed `3`, turn `7` -> `1`, detour `1.05` -> `1.02`, waypoint 감소율 `96.25%`
- smoothed path의 `pathSegmentBlockedHits = 0`, `blockedWaypointCount = 0`
- WolfAI decision table `6/6` 통과, Warsmash fit checks `5/5` 통과

## 3. 남은 PoC 로드맵

| 우선순위 | PoC | 상태 | 선행 조건 | 다음 액션 |
| ---: | --- | --- | --- | --- |
| 1 | PoC 7. 닭/알/수익 | 다음 구현 | 현재 가능 | economy state, 30초 income tick, 자동 측정 추가 |
| 2 | PoC 6. 중앙 상점/교환 | 병렬 가능 | object layer/UI | shop state와 교환 UI prototype |
| 3 | PoC 12. 결혼/아내/가족 테크 | 병렬 가능 | state model | spouse/family component와 지원 스킬 구조 정의 |
| 4 | PoC 4. 거미/초반 보너스 | PoC 7 이후 권장 | terrain + economy | 거미 보너스를 economy reward로 연결 |
| 5 | PoC 5. 늑대의 돌 | 병렬 가능 | terrain + combat | 특정 object 공격/보상 흐름 검증 |
| 6 | PoC 9. 보스/레벨 보상 | PoC 7 이후 | economy + reward | boss reward table과 level reward 지급 |
| 7 | PoC 10. 원본 타임라인/배속 | PoC 7 이후 | economy tick + wave scheduler | timeScale 기반 장기 루프 측정 |
| 8 | PoC 11. 낮/밤 + FoW + 미니맵 | 병렬 가능 | Tilemap | rendering layer 검증 |
| 9 | PoC 8. 거북이 이벤트 NPC | PoC 6 이후 | central hub | event NPC interaction |
| 10 | PoC 13. 8인 로컬 슬롯 | PoC 2 + 7 이후 | combat + economy | player slot별 state 분리 |
| 11 | PoC 14. 싱글 플레이 통합 MVP/MVC | 주요 PoC 완료 후 | all core loops | playable vertical slice |
| 12 | PoC 15. P2P 네트워크 | PoC 14 이후 | deterministic state boundary | sync model 검증 |
| 13 | PoC 16. 8인 내부 테스트 | PoC 15 이후 | network | full scenario test |

## 4. PoC 7 구현 계획: 닭/알/수익

### 목표

PoC 7은 원본의 닭장/알/수익 루프를 Phaser MVP의 deterministic economy system으로 축약한다.

검증해야 할 것:

- `elapsedSec` 기반 30초 income tick이 정확히 반복되는가
- 닭장 개수와 등급에 따라 알/코인이 기대값대로 증가하는가
- 수익 상태가 player slot별로 분리 가능한 구조인가
- 차후 상점, 거미 보너스, 보스 보상, revive penalty와 같은 외부 이벤트가 같은 economy API로 자원을 변경할 수 있는가

### 기준 데이터

현재 economy 기준은 `docs/chicken_farm/chicken_farm_wave_shop_disease_mvp_spec.md`를 따른다.

| 항목 | MVP 값 |
| --- | --- |
| 시작 코인 | easy `140`, normal `120`, hard `120`, crazy `110` |
| 수익 주기 | `30 sec` |
| egg unit 환산 | `coin += eggUnits * 12`, `eggs += eggUnits` |
| 기본 닭장 | `coop_basic`, cost `60`, `1 egg unit / 30 sec` |
| 중급 닭장 | `coop_mid`, cost `120`, `2 egg units / 30 sec` |
| 고급 닭장 | `coop_high`, cost `220`, `3 egg units / 30 sec` |
| 업그레이드 | basic -> mid `80`, mid -> high `140` |
| revive penalty | MVP 기준 자원 `25%` 손실 |
| exchange | MVP 기본 비활성, PoC 6에서 분리 검증 |

### Runtime 구조

PoC 단계에서도 실제 통합을 고려해 순수 state와 adapter를 분리한다.

```ts
type EconomyPocState = {
  elapsedSec: number;
  nextIncomeAtSec: number;
  players: EconomyPlayerState[];
};

type EconomyPlayerState = {
  playerId: number;
  coins: number;
  eggs: number;
  coops: IncomeCoopState[];
};

type IncomeCoopState = {
  id: string;
  templateId: "coop_basic" | "coop_mid" | "coop_high";
  ownerPlayerId: number;
};
```

권장 파일 분리:

- `games/chicken-farm/src/game/systems/economyTypes.ts`: 순수 타입과 command/result 타입
- `games/chicken-farm/src/game/systems/economySystem.ts`: income tick, buy, upgrade, resource mutation 순수 로직
- `games/chicken-farm/src/game/poc/economyPocLayout.ts`: PoC 배치와 debug preset
- `games/chicken-farm/src/game/systems/economyPocSystem.ts`: Phaser scene adapter, HUD/debug input
- `scripts/measure-chicken-farm-economy.ts`: 자동 측정 스크립트

### ECS 승격 기준

PoC 구현은 아래 component로 옮길 수 있어야 한다.

| Component | 역할 |
| --- | --- |
| `ResourceWallet` | `coins`, `eggs`, future resource 보관 |
| `IncomeProducer` | 30초 tick에서 생산량 계산 |
| `Owner` | player slot 연결 |
| `Upgradeable` | upgrade path와 cost |
| `EconomyCommandQueue` | buy/upgrade/reward/penalty 명령 처리 |
| `GameClock` | `elapsedSec`, `timeScale`, next tick 계산 |

Phaser adapter는 rendering, input, text label만 담당한다. Economy 계산은 scene object를 직접 참조하지 않는다.

### Debug 조작안

| 입력 | 동작 |
| --- | --- |
| `7` | PoC 7 economy debug area로 camera focus |
| `C` | player 1 기본 닭장 구매 시도 |
| `V` | 가장 낮은 등급 닭장 1개 업그레이드 시도 |
| `I` | income tick 강제 실행 |
| `O` | 30초 경과 simulation 1회 실행 |
| `P` | current economy state를 console/export snapshot으로 출력 |

기존 단축키와 충돌하면 `Shift + key` 조합으로 조정한다.

### 자동 측정 지표

PoC 7 구현 후 `npm run chicken:economy:measure`를 추가한다.

예상 artifact:

- `docs/chicken_farm/chicken_farm_w3x_artifacts/economy_poc_metrics.json`

필수 지표:

| 지표 | 의미 |
| --- | --- |
| `incomeTickCount` | simulation 동안 발생한 income tick 수 |
| `expectedEggs` / `actualEggs` | 계산 기대값과 실제 state 비교 |
| `expectedCoins` / `actualCoins` | 계산 기대값과 실제 state 비교 |
| `tickDriftSec` | 30초 tick schedule 오차 |
| `buyCommandPass` | 구매 비용 차감 및 coop 생성 성공 여부 |
| `upgradeCommandPass` | upgrade 비용 차감 및 template 변경 성공 여부 |
| `multiPlayerIsolationPass` | player별 wallet/coop 분리 여부 |
| `revivePenaltyPass` | 25% resource loss 계산 여부 |

통과 기준:

- 5분 simulation에서 `incomeTickCount = 10`
- tick drift는 `0` 또는 floating point tolerance 이하
- expected/actual eggs, coins가 일치
- player 1의 buy/upgrade/reward가 player 2 wallet에 영향을 주지 않음
- `timeScale`을 올려도 tick 개수와 최종 자원이 동일함

## 5. 구현 순서

1. `balance.ts`의 economy/shop 값을 PoC 7에서 직접 사용 가능한지 확인한다.
2. 순수 `economySystem`을 먼저 작성하고 Phaser 의존성 없는 단위 simulation을 만든다.
3. PoC 7 debug layout과 HUD를 붙인다.
4. `npm run chicken:economy:measure` 자동 측정 스크립트를 추가한다.
5. 측정 artifact를 문서에 반영하고, 통과 시 PoC 7 완료로 표시한다.
6. 다음 PoC는 측정 결과에 따라 PoC 4 거미/초반 보너스 또는 PoC 6 중앙 상점/교환 중 선택한다.

## 6. 보류 및 리스크

- 원본 JASS의 정확한 lumber 의미는 MVP에서 `coins/eggs`로 축약한다. 정밀 이식은 추가 로그/원본 함수 추적 후 재검토한다.
- 중앙 상점 exchange는 PoC 6 범위다. PoC 7에서는 자원 상태와 income producer까지만 고정한다.
- UI는 최종 상점 UI가 아니라 debug HUD로 제한한다.
- P2P deterministic 검증은 PoC 15 범위지만, PoC 7부터 순수 state transition 형태를 유지해 network 승격 비용을 줄인다.

## 7. 참고 문서

- 전체 PoC 목록: `docs/chicken_farm/chicken_farm_phaser_p2p_game_plan.md`
- Economy 기준: `docs/chicken_farm/chicken_farm_wave_shop_disease_mvp_spec.md`
- W3X artifact: `docs/chicken_farm/chicken_farm_w3x_artifacts/`
- Phaser 구현: `games/chicken-farm/src/game/`
