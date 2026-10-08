# Chicken Farm Current Context

## 작업 현황

- **최종 업데이트:** 2026-10-08
- **현재 목표:** 기존 도형으로 **시작 → 농장 경제 → 방어 → 늑대 웨이브 → 승리/패배 → 재시작**이 이어지는 싱글플레이 완성.
- **SP-03 진행:** SP-03-01~09를 완료했다. start regression은 parent debug 환경을 고정해 normal P3·easy P4·debug P3를 각각 2 load로 검증하고, browser-perf는 상태 오염 뒤 same-page 두 restart에서 wallet·item·unit·25 placement를 복원하며 이전 건설·선택·경제 state를 제거한다.
- **SP-04 진행:** [세부 계획](./chicken_farm_sp04_task_plan.md)의 SP-04-01~10 완료 기록을 반영했다. 실제 건설 lifecycle은 SP-05에서 검수한다.
- **SP-05 진행:** [12개 세부 task](./chicken_farm_sp05_task_plan.md)를 모두 완료했다. normal P3 실제 건설의 Stop/재개/완공, paid refund, 특수 fixture의 pause/queue/removal/restart와 browser 오류 0을 검수했다.
- **SP-06 완료:** [Terra medium용 14개 세부 task](./chicken_farm_sp06_task_plan.md)와 fixture 없는 normal P3 전체 루프를 완료했다. local 90초 이상 runner의 `full_loop`과 `all` browser artifact는 모두 통과했고 오류 목록은 비어 있다. 원본 대비 범위·수치 변환·후속 차이는 [SP-06 W3X 비교](./chicken_farm_sp06_w3x_comparison.md)에 기록했다. 다음 구현 대상은 **SP-08-01**이다.
- **SP-07 완료:** [16개 세부 task](./chicken_farm_sp07_task_plan.md)를 완료했다. canonical combat lifecycle·actual P3 통합·[blocker 재경로](./chicken_farm_w3x_artifacts/combat_check_blocker.json)·[combat all](./chicken_farm_w3x_artifacts/combat_check_all.json)·[economy all](./chicken_farm_w3x_artifacts/economy_check_all.json) 회귀를 통과했다. [W3X 비교](./chicken_farm_sp07_w3x_comparison.md)는 원본 보존값·의도적 밸런스 변환·SP-08~13 인계를 분리한다. fixture 적은 자연 wave 근거가 아니며, [SP-08 실행 계획](./chicken_farm_sp08_task_plan.md)을 Terra Medium용 18개 task로 분해했으며 모두 미착수다. 다음 ID는 **SP-08-01**이다.
- **W3X/WPM 대조:** [SP-05 비교표](./chicken_farm_sp05_w3x_comparison.md)에서 원본 울타리·닭장 계보와 열린 시작 농장 pathing은 웹 lifecycle과 대조했다. 울타리·벽·결계 전 계열은 4x4 solid pathTex, `h006/h00G`는 solid/unbuildable pathTex로 추출했다. build time·환불·대문 상태 전이는 [Warsmash 관찰 계획](./chicken_farm_w3x_warsmash_construction_validation_plan.md)으로 분리했다. 실제 테크 조건은 SP-09, 건물별 경제 수량은 SP-06, 적 피해 제거 연결은 SP-07에 남긴다.
- **직전 구현 결과:** Terra medium으로 SP-01-01~06의 정적 대조와 단일 싱글 계약을 기록하고 W3X 설정을 반영했다. normal 시작은 1500 gold/0 lumber/supply 3, I003 5회·I009/I00F 각 1회, 원본 중립 배치·`n006` 부활 좌표, 120~3000초 wave milestone을 기준으로 둔다. 10000은 명시적 debug mode 전용이다. SP-02는 type/build·dev/preview 부팅·normal smoke·순수 측정 4종·browser fixture를 통과해 완료했다. 난이도 data는 원본 8단계의 알려진 스탯 보정으로 확장했지만 선택 UI·실제 적 적용·Unlimited 보스 능력, mode 선택/전이, 18티어 wave와 runtime 검증은 남아 SP-01은 진행 중이다.
- **진행률:** 새 싱글플레이 목록은 완료 기준 대조 전이므로 **미산정**. 기존 UI 스프린트 21%를 게임 완성도로 사용하지 않는다. 아래 `연결 있음`은 통합 검증 완료를 뜻하지 않는다.
- **개발 기준:** 계획·범위 조정은 **Astra light**, ID별 실행·검증은 **Terra medium**. 한 번에 소작업 하나를 수행한다. 기존 모델별 한도 기록은 과거 참고값이며 현재 소비량으로 환산하지 않는다. 추가 크레딧·API 지출 목표 $0.
- **후순위:** UI 디자인·반응형 재배치·에셋 생성/교체·SFX/VFX 강화·8way adapter·멀티플레이·serverless DB/WebRTC. 조작을 막는 입력 오류와 필수 상태 표시는 게임 task 안에서 처리한다.

## 싱글플레이 task 목록

| 순서 | ID | Task | 현재 근거 / 상태 | 이번 task에서 확인할 결과 |
| ---: | --- | --- | --- | --- |
| 1 | SP-01 | 한 판의 목표·승패 규칙 확정 | W3X 목표 규칙과 현재 코드 actual을 대조했으며, 8단계 난이도 선택·실제 적 적용·Unlimited 능력, mode 선택/전이·18티어 wave/final lifecycle이 남아 **상위 SP-01 진행 중** | [SP-01 목표와 current actual](./chicken_farm_sp01_task_plan.md)을 기준으로 SP-03/08/10/11/12/15가 남은 항목을 구현·검증한 뒤 SP-01 완료 여부를 재판정 |
| 2 | SP-02 | 플레이 검증 경로 확보 | [7개 실행 task 계획](./chicken_farm_sp02_task_plan.md) 완료; type/build·dev/preview·normal smoke·순수 측정 4종·browser fixture 통과 | 다음 구현은 SP-03 정상 시작 상태 구성 |
| 3 | SP-03 | 정상 시작 상태 구성 | [9개 세부 task](./chicken_farm_sp03_task_plan.md) 완료; normal/easy/debug 시작 회귀와 same-page restart 확인 | 시작 옵션/owner 통합, PoC 격리, 초기 25개 entity, 같은 page 새 run 초기화 |
| 4 | SP-04 | 선택·이동·경로·기본 명령 검수 | [SP-04-01~10 완료](./chicken_farm_sp04_task_plan.md): 선택·명령·queue·정적/동적 pathing·restart 검수 기록 | 선택, 우클릭 이동, 정지, Shift 예약, 막힌 길 처리로 기본 플레이가 끊기지 않음 |
| 5 | SP-05 | 건설 lifecycle 완결 | [12개 세부 task](./chicken_farm_sp05_task_plan.md) 완료: normal 통합과 특수 fixture lifecycle 검수 | 비용 차감, 일꾼 이동/착공, 중단/재개, 취소/환불, 파괴 시 footprint·시야·경제 정리 |
| 6 | SP-06 | 닭·알 경제 한 바퀴 검증 | **완료** — [normal full loop](./chicken_farm_w3x_artifacts/economy_check_full_loop.json), [all](./chicken_farm_w3x_artifacts/economy_check_all.json) 통과 | 우물/닭장 건설 → 산란 → 수집 → 입고/부화 또는 시장 판매 → 같은 wallet 반영 |
| 6.5 | SP-06.5 | W3X 럼버 밀 30초 수입 복원 | **완료** — [6개 실행 task](./chicken_farm_sp06_5_task_plan.md), `full_loop`·`all` 통과 | 닭·알 생산과 병행 지급; build card·선행조건·upgrade UI는 SP-09 |
| 7 | SP-07 | 실제 맵 전투 연결 | **완료** — [16개 세부 task](./chicken_farm_sp07_task_plan.md), combat/economy all 통과 | 농부/개/타워와 적의 공격·피해·사망, 시야·사거리·펜스 blocker, attack-move 복귀 |
| 8 | SP-08 | 늑대 웨이브 진행 연결 | [18개 세부 task](./chicken_farm_sp08_task_plan.md) 계획 완료·구현 미착수; 다음 SP-08-01 | 실제 spawn 구역, 단계별 출현/보충, 농장 진입, 경로 막힘 대응, 웨이브 전환 |
| 9 | SP-09 | 건물 기능·성장 경로 | 건물 데이터와 일부 기능 존재 | 플레이에 필요한 생산·업그레이드·선행조건·인구·취소 처리와 명령 연결 |
| 10 | SP-10 | 적 단계·보스·보상 연결 | 데이터/계획 기준 대조 필요 | 일반 적 티어/보스의 능력·처치·드롭·보상과 다음 진행 연결; 중복 보상 방지 |
| 11 | SP-11 | 승리·패배·재시작 구현 | 전체 루프 확인 필요 | SP-01 규칙으로 종료, 판정/경제 진행 중단, 재시작 시 이전 판 객체·예약·타이머 제거 |
| 12 | SP-12 | 싱글 콘텐츠 누락 정리·연결 | 항목별 구현 감사 필요 | 상점/아이템, 가족/용병, 연구/스킬, 질병/치유·이벤트 등 기존 기획을 구현/미구현/후속 제안으로 대조하고 필수분 연결 |
| 13 | SP-13 | 일시정지·탭 복귀 안정화 | 정책 문서 존재 | pause/resume, hidden→visible 복귀 후 시간 폭주·일괄 피해·생산 중복 방지 |
| 14 | SP-14 | 플레이 필수 피드백·입력 오류 | 일부 HUD·입력 연결 있음 | 자원/HP/건설·생산 상태, 대상 지정/취소/실패 이유, HUD 클릭의 월드 명령 누출 방지 |
| 15 | SP-15 | 한 판 밸런스 확인 | 임시 debug 시작값 존재 | 정상 시작 자원으로 경제와 방어가 성립하고 초기 압박부터 최종 목표까지 진행 가능 |
| 16 | SP-16 | 싱글 전체 회귀·성능 검수 | 개별 측정 스크립트 존재 | 승리/패배/재시작, 장시간 플레이, 다수 닭·적·건물, 경로/프레임/메모리 회귀 통과 |

ID는 추적용 task이며 같은 크기의 작업량 단위가 아니다. `SP-12`처럼 큰 항목은 착수할 때 소작업으로 나눈다. 현재 목록의 task 수를 기존 예산 문서의 소작업 수와 직접 비교하지 않는다.

## Task 단위 상세와 실행 순서

- **첫 묶음 — SP-01~06:** 한 판 규칙과 정상 시작 상태를 고정하고, 기존 이동/건설/경제 코드를 실제 맵에서 검증한다. 연결된 wallet·adapter를 새로 만들지 않는다.
- **핵심 게임 — SP-07~11:** 경제가 있는 맵에서 늑대를 막고 성장해 승패에 도달하게 한다. 전투 flag만 켜는 것으로 완료 처리하지 않는다.
- **완성 검수 — SP-12~16:** 기존 기획의 콘텐츠 누락, 탭 복귀, 필수 조작 안내, 밸런스·회귀를 점검한다. SP-12에서 기존 기획을 임의로 삭제하거나 원본 전체 이식을 완료했다고 간주하지 않는다.
- **선행 적용:** SP-13/14의 문제가 앞선 task 플레이를 막으면 해당 오류만 먼저 해결한다. HUD 재디자인이나 아이콘 제작을 선행 조건으로 삼지 않는다.

task별 세부 점검 항목은 [Implementation Backlog의 싱글플레이 task 상세](./chicken_farm_implementation_backlog.md#싱글플레이-task-상세)에 둔다. 기존 UI 작업 결과는 유지하고 추가 polish는 싱글 한 판 검수 뒤 재개한다.

## SP-01 결과와 다음 실행

[SP-01 목표와 current actual](./chicken_farm_sp01_task_plan.md)은 확정된 W3X 기준 목표와 현재 코드 상태를 기록한다. SP-02 검증 경로와 SP-03-01~09 시작 계약·runtime·PoC 격리·초기 배치 manifest/registry/view·shutdown cleanup·same-page restart·normal/easy/debug 회귀를 완료했다. SP-04-01~10의 기본 명령·pathing과 SP-05-01~12의 건설 lifecycle도 완료했다. SP-05-12는 normal P3에서 실제 build-card → Stop → 재개 → 완공과 paid refund를 검수했고 fixture/combat/terrain probe 및 browser 오류 유입이 없었다. SP-06-01~14는 normal P3의 실제 경제 한 바퀴와 economy browser all까지 완료했다. SP-06.5-01~06은 럼버 밀 계약·지급·lifecycle·restart·browser 사례·전체 회귀를 완료했다. SP-07-01~15는 [전투 계약](./chicken_farm_w3x_artifacts/sp07_01_combat_contract.json), read-only snapshot, normal service와 [runtime enemy lifecycle](./chicken_farm_w3x_artifacts/combat_check_runtime.json), [실제 닭 target](./chicken_farm_w3x_artifacts/combat_check_normal_targets.json), [건물 피해 경계](./chicken_farm_w3x_artifacts/combat_check_building_damage.json), [attack-move 목적지 복귀](./chicken_farm_w3x_artifacts/combat_check_attack_move.json), Stop/replace/Shift queue, [same-page restart](./chicken_farm_w3x_artifacts/combat_check_restart.json), [actual P3 통합](./chicken_farm_w3x_artifacts/combat_check_integration.json) 검수를 연결했다. SP-07-16에서 `blocker` browser 재경로와 필수 회귀를 완료했다. 다음 실행 ID는 **SP-08-01**이며 [18개 세부 계획](./chicken_farm_sp08_task_plan.md)을 따른다. 기본 협동 늑대 방어를 구현하고 8단계 난이도·mode 선택/전이·18티어 wave/final lifecycle을 검증한 뒤 SP-01 완료 여부를 다시 판정한다. task 수를 게임 진행률로 환산하지 않는다.

## 구현 증거와 재사용 대상

SP-02는 [세부 실행 계획](./chicken_farm_sp02_task_plan.md)의 **SP-02-01 → 02 → 03 → 04 → 05 → 06 → 07**을 완료했다. task별 지정 출처·변경 범위·완료 조건과 최신 검증 결과는 해당 문서에 둔다.

| 영역 | 확인한 코드 | 후속 판단 |
| --- | --- | --- |
| 조작/건설 | `controllableUnitSystem.ts`, `constructionPlacementSystem.ts`, `buildingSystem.ts` | SP-04/05에서 회귀·빈 동작 확인 |
| 공용 지갑·건물 경제 | `playerWallet.ts`, `buildingEconomyAdapter.ts`, `main.ts` 완료/제거 callback | 이미 연결 있음. SP-05/06에서 같은 ID·소유자·수량의 실제 흐름 검증 |
| 알·인벤토리·시장·부화 | `economySystem.ts`, `main.ts` 수집/판매/부화 경로 | SP-06에서 정상 시작부터 끝까지 확인 |
| 전투·웨이브 | `combatPocSystem.ts`, `wolfAiStateMachine.ts`, `balance.ts` | combat/combatSmoke 기본 off. SP-07/08/10에서 실제 맵 통합 |
| 표현 | 도형 기반, DBG·격자 기본 숨김 반영 | 당장 플레이 검증에 사용. 에셋 생성 대기 없이 진행 |

7월 [Gap Analysis](./chicken_farm_gap_analysis.md), [Runtime Audit](./chicken_farm_runtime_audit_2026-07-13.md)는 과거 근거다. 현재 소스 대조 없이 미구현 task로 복사하지 않는다.

## Plus 한도와 작업 예산

- 마지막 사용자 보고: **2026-09-28 16:10 KST 기록**, 5시간 잔여 61%(reset in 3h 11m), 주간 잔여 78%(reset in 6d 17h). 자동 갱신되지 않는 과거 스냅샷이다.
- 운영안: 매 소작업 전후 양쪽 잔여율 기록, 각 한도 20% 여유. 실제 task당 Astra light 소비 표본은 아직 없다.
- 다음 구현 대상은 **SP-08-01 원본 wave 계약**이다. [SP-08 세부 계획](./chicken_farm_sp08_task_plan.md)의 18개 task는 구현 미착수다. SP-07-01~16은 완료했고, [SP-07 W3X 비교](./chicken_farm_sp07_w3x_comparison.md)의 배치 검토에 따라 wave 좌표·시간·일반 tier·60초 attack refresh만 SP-08에서 연결한다. 건물 테크는 SP-09, 보스/보상은 SP-10, 부활/패배는 SP-11, pause는 SP-13, 수치 밸런스는 SP-15에 유지한다.
- 기존 20~34개 싱글 / 전체 45~78개 추정은 UI·표현·멀티를 포함한 이전 범위다. **이번 싱글 우선 task의 기간·비용 예측으로 그대로 사용하지 않는다.** 상세 목록 대조와 실측 이후 재산정한다.
- 측정표와 계산 규칙: [Astra light 개발 작업량·한도 예산](./chicken_farm_astra_light_work_budget_2026-09-28.md).

## 후순위 문서

- [UI·에셋 배치 계획](./chicken_farm_ui_asset_placement_plan_2026-09-28.md): 기존 수정 이력과 후속 polish/adapter 계약. 게임 진행에 필요한 피드백은 SP-14로 가져온다.
- [RTX 3080 에셋 제작 기준](./chicken_farm_asset_feasibility_2026-09-28.md): 정적 이미지·8way 시트 제작. 현재 생성 전이며 싱글 기능 구현의 선행 조건이 아니다.
- [P2P 계획](./chicken_farm_phaser_p2p_game_plan.md), [Network/Suspend](./chicken_farm_network_and_suspend_plan.md): 멀티는 싱글 검수 후. 싱글 탭 복귀 정책만 SP-13에서 참조한다.
- [Next Priority Plan](./chicken_farm_next_priority_plan.md): 과거 설계 이력. 현재 실행 순서는 이 현황판을 따른다.
