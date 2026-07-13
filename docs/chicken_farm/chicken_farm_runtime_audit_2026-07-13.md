# Chicken Farm Phaser Runtime Audit — 2026-07-13

> 목표 기준: Phaser 기반의 2D 전체 맵을 약간 재해석하되, 원본 닭농장의 닭 경제·늑대 압박과 Warsmash/Warcraft III식 선택·명령·pathing 경험을 제공한다.

## 결론

현재 구현은 **2D 맵 위의 개별 PoC 묶음**으로는 동작한다. 프로덕션 빌드와 economy/wolf-AI/pathing 순수 측정은 통과했다. 그러나 닭장 경제, 건설, 늑대 전투가 같은 월드 모델을 공유하지 않으므로 아직 “플레이 가능한 닭농장 2D vertical slice”는 아니다.

가장 먼저 고칠 것은 시각 polish가 아니라 다음 세 경계다.

1. 건설한 닭장/우물과 economy entity를 같은 entity/footprint/owner/wallet으로 연결한다.
2. 고정 Combat PoC를 실제 tilemap의 13개 wolf spawn rect와 farm zone을 쓰는 wave runtime으로 교체한다.
3. tilemap과 WPM pathing grid의 좌표 변환을 명시하고, 전체 맵 위치에서 회귀 측정한다.

## 검증 결과

| 검증 | 결과 | 해석 |
| --- | --- | --- |
| `npm --workspace @games/chicken-farm run build` | 통과 | TypeScript/Vite production bundle 생성 성공. 초기 JS는 gzip 약 403 kB로 chunk 경고가 남음. |
| `npm run chicken:economy:measure` | 통과, 22/22 | 22.5초 풍차 산란, 30초 기본 산란, 6-slot inventory, 명시 부화, 닭 HP/우물/몰이/모이주기 순수 simulation이 통과. |
| `npm run chicken:wolfai:measure` | 통과 | direct target, repath delay, blocker fallback, attack-move refresh 정책의 순수 decision 검증 통과. |
| `npm run chicken:pathing:measure` | 통과 | 두 micro path의 raw/smoothed blocker violation이 0. |
| `npm run chicken:perf:measure` | **실패** | `measure-chicken-farm-runtime-perf.ts`가 삭제된 `layout.fenceRows/fenceColumns/fenceSingles` 구조를 읽어 TypeError로 중단. 현재 runtime 성능 기준은 신뢰할 수 없음. |

순수 측정의 통과는 state 함수의 정확성을 뜻할 뿐, Phaser presenter·실제 맵·전투가 합쳐진 상황의 통과를 뜻하지 않는다.

## 구현 이상과 문서 차이

| 우선 | 영역 | 발견 | 최종 목표에 미치는 영향 | 조치 |
| ---: | --- | --- | --- | --- |
| P0 | 경제/건설 | `createEconomyPoc()`가 `addEconomyCoop()`/`addEconomyWell()`로 별도 PoC 건물을 직접 만든다. `BuildingSystem.createBuilding()`으로 만든 `coop_basic`은 economy coop·inventory·닭 생산을 만들지 않는다. | 플레이어가 건설한 닭장이 수익/부화/늑대 목표가 되지 않아 닭농장 핵심 루프가 분리된다. | building 완료/파괴 event와 economy entity 생성/제거를 한 adapter로 연결하고 공유 ID를 둔다. |
| P0 | 경제 지갑 | `BuildingSystem.economy`는 시작 gold `10000`을, economy state는 player coin `120`을 별도로 가진다. | 건설·판매·부화·업그레이드가 같은 경제 결정이 아니다. 문서의 MVP 값도 실제 runtime과 다르다. | slot별 canonical wallet을 만들고 기존 임시 economy를 제거/adapter화한다. |
| P0 | 늑대/전체 맵 | `CombatPocSystem`과 path adapter가 `COMBAT_POC_LAYOUT`, `POC_WOLF_ID`, synthetic farm/tower/fence에 결합돼 있다. 기본 combat flags도 off다. | 실제 13개 외곽 spawn, 8개 farm zone, 건설한 building을 쓰는 늑대 압박이 실행되지 않는다. | map object layer에서 spawn/farm zone을 읽는 `WaveRuntime`을 만들고 combat PoC를 smoke fixture로 격리한다. |
| P0 | 측정 | runtime perf script가 현재 `fences[]` 배열 대신 예전 row/column layout을 참조해 즉시 실패한다. | 성능 회귀를 막을 수 없고, 전체 맵 fog/pathing 비용을 판단할 근거가 없다. | script를 `combatLayoutFactory` 또는 현재 `fences[]` 구조와 공유시키고, headless browser smoke를 다시 통과시킨다. |
| P1 | map/WPM 좌표 | tilemap은 `315 × 329` tiles(2x scale), WPM은 `352 × 336` cells와 `trimOffset`을 가진다. `TerrainBlocker.worldToCell()`은 `trimOffset`을 더한 뒤 바로 빼므로 사실상 offset을 적용하지 않는다. | W3X trim을 반영하려던 pathing과 표시 맵이 다른 origin을 볼 위험이 있다. micro path 통과만으로 전체 맵 정합은 증명되지 않는다. | local map world ↔ W3X world ↔ WPM cell 변환을 단일 함수로 만들고, 8 starts·13 spawn rect·중앙 허브에서 이동/건설 허용 여부를 회귀 측정한다. |
| P1 | 2D 표현 | tilemap runtime은 `ground`만 렌더한다. `buildable`/`collision_static` tile layer는 표시하지 않고, farm/spawn은 디버그 성격의 선·라벨 marker다. economy/건물도 Phaser primitive shape로 그린다. | 지형이 “원본 배치 참고 2D 게임 월드”보다 pathing debug map처럼 보이고, 게임 상태의 시각적 계층이 약하다. | ground/decor/collision을 역할별 layer로 정리하고, marker는 debug flag로 이동한다. 건물/유닛은 sprite-state adapter로 교체한다. |
| P1 | 늑대 target | combat config의 dynamic blocker는 `BuildingSystem` 결과만 전달한다. economy PoC coop/well footprint는 `canChickenOccupyPoint()`에만 별도로 들어간다. | 늑대는 닭장/우물 PoC를 길막·공격 대상·가치 대상으로 인식하지 못한다. | 공통 world entity registry에서 collision, targetability, vision, economy role을 제공한다. |
| P1 | 판매/상점 | `sellCarriedEggs()`는 `carriedEggs` field를 대상으로 하지만 실제 runtime은 6-slot inventory를 사용하며 이 함수를 호출하지 않는다. | 문서상 “알 판매”와 실제 조작 루프 사이에 빈 기능이 남는다. | inventory stack을 대상으로 하는 sell command/service로 교체하고 중앙 상점 interaction에 연결한다. |
| P2 | 명령 완결성 | 이동/건설 Shift 예약은 있으나 attack-move 처치 뒤 원래 목적지 복귀, 생산 queue, building command card의 생산/upgrade/sell은 없다. | Warsmash식 order 지속성 및 경제·방어 조작 감각이 끊긴다. | real-map combat smoke 후 attack-move resume, 이어서 building production queue를 구현한다. |
| P2 | 전체 맵 비용 | 월드 크기는 약 `10080 × 10528px`이며 fog/minimap은 48px cell 전체를 주기적으로 순회·그린다. | 늑대/닭/8 slot이 붙으면 browser frame cost가 커질 가능성이 있다. 현재 perf script 실패로 수치가 없다. | perf script 복구 후 browser 측정으로 fog dirty-region/texture cache 여부를 결정한다. |

## 문서 상태 보정

- `chicken_farm_current_context.md`의 “경제 PoC 임시 presenter”는 단순한 UI 임시 상태보다 강하다. 실제로는 건설/전투 world와 분리된 별도 entity 집합이다.
- `chicken_farm_gap_analysis.md`의 경제 지갑·실제 늑대 웨이브 P0 항목은 위 코드 감사로 확인됐다. 여기에 **건설한 닭장과 economy entity가 서로 생성되지 않는 문제**, **perf regression script 실패**, **WPM trim 좌표 검증 부족**을 포함해야 한다.
- 원본/Warsmash와의 차이 중 가치 대상 우선순위, 2D visual style, 8-slot 축소는 의도적 MVP 결정이다. 반면 P0 항목은 의도적 축소가 아니라 아직 통합되지 않은 구현 경계다.

## 권장 구현 순서

1. `WorldEntity` 또는 simulation registry를 도입해 건물 ID, owner slot, footprint, economy role, targetability, vision을 한 곳에 둔다.
2. `BuildingSystem` 완료 이벤트에서 coop/well economy state를 생성하고, 취소/파괴 시 제거한다. wallet과 inventory도 slot 상태로 일원화한다.
3. map object layer의 `wolf_spawn_rect_*`/`farm_p*`를 입력으로 받는 wave runtime을 만들고, combat PoC 의존을 제거한다.
4. pathing 좌표 변환과 runtime perf script를 고친 뒤, 8 start/13 spawn/minimap/fog browser regression을 추가한다.
5. 마지막으로 marker 기반 표현을 debug 전용으로 내리고, sprite/state adapter와 2D decor layer를 붙인다.
