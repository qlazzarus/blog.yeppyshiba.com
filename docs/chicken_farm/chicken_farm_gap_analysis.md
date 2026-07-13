# Chicken Farm: W3X·Warsmash·현재 구현 차이

> 목적: 원본 맵 관찰값, Warsmash 엔진 동작, 웹 MVP의 의도적 변환, 아직 미통합인 구현을 한 표에서 구분한다. 이는 버그 목록이 아니라 구현 경계와 다음 검증 순서를 정하는 문서다. 2026-07-13 기준.

## 판정 표기

- **원본 차이:** W3X의 관찰된 구조를 아직 옮기지 않았거나 웹 MVP에서 축소한 항목
- **엔진 차이:** Warsmash/Warcraft III behavior를 의도적으로 단순화한 항목
- **문서·데이터 충돌:** 서로 다른 문서 또는 코드가 같은 값을 다르게 정의한 항목. 우선 정리 대상

## 우선 정리 항목

| 우선 | 분류 | 기준 | 현재 상태 | 결정/다음 작업 |
| ---: | --- | --- | --- | --- |
| P0 | 문서·데이터 충돌 | 플레이어 경제는 건설·판매·부화에 공통이어야 한다 | `BuildingSystem`은 임시 `gold/coins`와 시작값 `10000`, economy PoC는 별도 player coins `120`을 사용한다 | 하나의 `PlayerEconomyState`를 소유시키고 양 시스템은 command/system API로만 접근 |
| P0 | 문서·데이터 충돌 | MVP 참조의 coop 가격은 basic/mid/high `60/120/220` | `buildingTemplates.ts`의 basic은 `120`; balance의 shop item은 `60`; source trace도 `h00A`와 `h00N`이 섞인다 | rawcode는 “원본 근거”와 “실제 건물”을 분리 표기하고, 한 가격 테이블을 canonical source로 지정 |
| P0 | 원본 차이 | 원본 늑대는 13개 스폰 rect, 18개 티어, 0.20초 보충, 60초 전역 attack 갱신을 쓴다 | 현재는 고정 timeline/소수 적 데이터이며 combat 기본값이 off다 | `phase → active tiers → target population → replenish` 모델을 실제 P3 map에 연결 |
| P0 | 구현 통합 | 건설한 `coop_basic`/`well_basic`과 경제 entity는 같은 owner·footprint·lifecycle을 가져야 한다 | economy presenter가 별도 coop/well/chicken을 직접 만들고, 건설/늑대 dynamic blocker에는 연결되지 않는다 | building completion/destruction event를 economy·targetability·vision registry에 연결 |
| P0 | 검증 | 전체 2D map의 fog/pathing/browser cost는 현재 코드로 측정돼야 한다 | runtime perf script가 이전 Combat PoC layout 필드를 읽어 TypeError로 실패한다 | fixture를 현재 layout factory와 공유하고 browser performance regression을 복구 |
| P1 | 구현 정합 | W3X trim된 tilemap과 WPM grid는 같은 좌표 변환을 써야 한다 | `trimOffset`이 `TerrainBlocker.worldToCell()`에서 실질적으로 상쇄되어 전체 map 정합이 미검증이다 | 8 starts·13 spawns·hub의 movement/build regression으로 변환을 고정 |
| P1 | 원본 차이 | 원본은 10 user slots + 2 computer slots, 각자 농장과 공통 늑대 압박이다 | fixed slot 3 단일 PoC | economy/player state를 slot별로 분리한 뒤 8-slot local simulation으로 확장 |
| P1 | 엔진 차이 | Warsmash는 모든 order가 behavior/queue를 거쳐 종료 뒤 다음 order 또는 기본 behavior로 복귀한다 | 이동·건설 Shift 예약만 최소 구현. 생산 queue, control group, replay가 없다 | attack-move resume → 생산 queue/cancel → command log/replay 순으로 추가 |
| P1 | 엔진 차이 | attack-move는 자동 획득 후 공격을 끝내고 원래 목적지/order를 계속한다 | 입력·최소 자동 획득은 있으나 target 처치 후 resume이 미검증이다 | combat smoke에서 직접 공격, ground attack-move, Shift attack을 telemetry와 함께 검증 |
| P1 | 엔진 차이 | pathing texture, collision size, facing, dynamic destructable pathing이 함께 동작한다 | WPM 32px grid, A*, 직사각 blocker, 약한 unit separation으로 축약 | 현 모델을 유지하되 좁은 통로·파괴 후 통과·반복 repath를 regression 측정 |
| P2 | 원본 차이 | W3X 일반 늑대의 기본 표적 우선순위는 JASS에 직접 하드코딩되지 않고 attack-move/auto-acquire에 위임된다 | 가치 건물→가축→핵심→농부, path failure 시 fence를 공격하는 정책을 새로 정의했다 | 이 정책은 “MVP decision”으로 유지하고 원본 사실처럼 서술하지 않음 |
| P2 | 엔진 차이 | targetability에는 소유 플레이어의 현재 visibility가 포함된다 | 타워 자동 공격은 현재 single-player visibility에 연결됨. 다인 시야와 수동 명령은 아직 단일 모델 | player-slot vision과 host-authoritative combat 도입 전까지 단일 PoC 한계로 명시 |
| P2 | 원본 차이 | 원본에는 모드, 중앙 상점/교환, 질병, 결혼/가족, PvP가 있다 | 일부 분석/계획만 있고 MVP core loop에는 미통합 | core economy + wolf wave 후 기능별 독립 PoC로 추가 |

## 의도적으로 유지하는 변환

다음은 원본과 같지 않지만 현재 방향에 맞는 결정이다.

- 원본 에셋, JASS, UI를 복사하지 않는다. 수치·루프·행동 감각만 참고한다.
- 50분 이상 원본 타임라인은 웹 플레이 세션에 맞춰 압축할 수 있다. 다만 빠른 검증은 규칙 삭제가 아니라 `timeScale`을 우선한다.
- Warcraft III의 damage dice, damage/armor type 상성, animation backswing 전체는 MVP에서 축약한다. cooldown, windup, range leash의 체감은 유지한다.
- 늑대가 fence를 최우선 목표로 삼지 않고, 가치 대상까지의 path failure 뒤 blocker를 공격하게 한다.
- 웹 MVP의 공개/내부 인원은 원본 10인 대신 우선 8-slot 구조를 목표로 한다.

## 기준 출처와 책임

| 질문 | 우선 출처 | 비고 |
| --- | --- | --- |
| 원본 맵에 실제로 있었는가, 어느 수치인가 | `chicken_farm_w3x_analysis.md`, artifacts | 정적 분석의 불확실성은 관찰 필요로 표기 |
| Warcraft III식 order/pathing/attack은 어떻게 느껴지는가 | `chicken_farm_warsmash_behavior_notes.md` | Warsmash 구현을 복사하지 않음 |
| 웹 MVP에서 무엇을 바꾸기로 했는가 | 이 문서, `chicken_farm_current_context.md`, canonical balance | 의도적 변환은 원본 근거와 분리 |
| 현재 코드가 실제로 무엇을 하는가 | `games/chicken-farm/src/game/`와 측정 artifact | 문서와 다르면 코드/측정 결과를 먼저 확인 |

## 완료 판정

다음 네 항목이 맞물리면 첫 통합 vertical slice로 본다.

1. 농부가 같은 wallet으로 닭장 건설·알 판매·부화·업그레이드를 수행한다.
2. 닭/우물/알/부화 상태가 건설된 닭장과 실제 map blocker 위에서 동작한다.
3. 늑대가 실제 map의 외곽 스폰에서 농장 가치 대상에 attack-move하고, 막히면 fence/건물을 공격한다.
4. `A + target`, `A + ground`, Shift 예약이 target 종료 뒤에도 일관된 order 흐름을 유지한다.
