# Chicken Farm Implementation Backlog

> 최신 우선순위: 2026-09-28 16:16 KST. **싱글플레이 기능 완결이 최우선**이다. 이번 갱신은 task 목록 정리이며 구현 착수가 아니다. 최신 상태/한도는 [Current Context](./chicken_farm_current_context.md)를 따른다. 아래 기존 경제 계획은 7월 설계 이력으로 보존한다.

## 싱글플레이 task 상세

각 행은 후속 구현 때 대조할 점검 목록이다. 연결된 기능은 회귀 검증으로 완료할 수 있으며 모두 신규 구현이라고 가정하지 않는다.

| ID | 점검 목록 | 선행 |
| --- | --- | --- |
| SP-01 | 시작 자원·기본 유닛/아이템 기준 확인; 방어 대상과 패배 조건; 최종 생존/웨이브 목표; 종료·재시작 규칙 | 없음 |
| SP-02 | 재현 가능한 실행 경로; build/타입 오류 기준선; 브라우저 smoke; 기존 측정 스크립트 동작 확인 | 없음 |
| SP-03 | 정상 시작 preset; PoC fixture와 중복 spawn 제거; 농부/개·inventory·초기 적/중립 상태; 초기화 단일 경로 | SP-01/02 |
| SP-04 | 클릭/drag 선택; 우클릭 이동/상호작용; Stop/Shift 예약; 도달 불가·좁은 통로; 월드/WPM 좌표 정합 | SP-03 |
| SP-05 | 지형/겹침 검증; 착공 비용·환불; 일꾼 도착/중단/재개; 완공 기능 연결; 취소/파괴 시 blocker·시야·선택·경제 정리 | SP-03/04 |
| SP-06 | 닭 확보/분양; 우물 효과·산란; field egg 수집; farmer→coop 입고; 부화/출구; 완성 시장 판매; inventory/wallet 보존 | SP-05 |
| SP-06.5 | W3X 럼버 밀의 30초 목재 수입 복원; 완료/제거·owner·중복 tick 검증; normal economy 회귀 | SP-06 |
| SP-07 | 실제 유닛/건물/닭의 target 등록; acquire/사거리/시야; 공격·피해·사망; 펜스 파괴/재경로; attack-move 후 목적지/예약 복귀 | SP-04~06 |
| SP-08 | 실제 맵 spawn rect 연결; 단계별 적 population/보충; 공격 목표 갱신; 진행 시간; 다음 단계; 더 이상 유효하지 않은 적 정리 | SP-07 |
| SP-09 | 건물별 실제 기능 목록; 생산/부화 queue와 취소; 공급/선행 건물/자원; 업그레이드/연구 효과; 생성 위치·rally 필요 범위 | SP-05/06 |
| SP-10 | 적 티어별 실제 능력; 보스 출현·능력·처치; 레벨/드롭/보상 지급; 중복 판정 방지; 종료 조건과 연결 | SP-08/09 |
| SP-11 | 승리·패배 판정 1회; 명령/경제/웨이브 정지; 결과 표시; 새 판의 객체·event·timer·queue·자원 초기화 | SP-01/08/10 |
| SP-12 | 상점과 아이템 목록; 가족/용병 테크; 연구/스킬; 질병/치유; 중앙 NPC/이벤트. 기존 기획별 구현 여부 대조 → 필수 누락분을 별도 소작업으로 분해 | SP-06~11 |
| SP-13 | 사용자 pause/resume; hidden 시 정책; 복귀 delta 처리; 예약/쿨다운/웨이브 시간 일관성 | SP-06~08 |
| SP-14 | 현재 명령 모드/취소 안내; 실패 이유; 건설·생산·웨이브 상태; inventory 결과; HUD 클릭/우클릭/drag의 월드 누출 차단 | 관련 SP task |
| SP-15 | debug 자원 없이 첫 건설/알/판매 가능; 첫 적 대응 시간; 자원 수입·생산·방어 성장; 후반 진행/막힘; 정상 속도 한 판 검수 | SP-09~14 |
| SP-16 | 승리와 패배 양 경로; 반복 재시작; 장시간 실행; 개체 수 증가; 경로 정합; 프레임/메모리; 경제·전투·건설 회귀 | SP-15 |

SP-03-01~09의 시작 옵션·소유자 계약·runtime 초기 생성·PoC 격리·초기 배치 manifest/registry/view·shutdown cleanup·same-page restart·normal/easy/debug 시작 회귀를 구현·검증했다. SP-04-01~10은 normal P3 actual 입력, Stop/queue, pathing과 restart를 완료했다. SP-05-01~12는 pending부터 착공 비용·Stop/재개·handoff·queue·refund·완공/제거·restart까지 검수했고, normal P3 실제 통합 lifecycle과 browser 오류 0도 확인했다. **SP-06-01~14는 완료**했다. fixture 없는 normal P3 전체 루프는 실제 wall-clock 산란·부화, 입고·판매와 wallet/HUD 장부를 통과했고 economy browser all도 종료 코드 0으로 통과했다. 원본 W3X와의 역할 보존·수치 변환·남은 범위는 [SP-06 W3X 비교](./chicken_farm_sp06_w3x_comparison.md)를 따른다. 다음 실행은 **SP-06.5-01**이며 bridge 완료 후 SP-07 실제 피해·사망 연결로 진행한다. UI 레이아웃 교체, 아트/사운드 제작, 멀티와 DB/WebRTC는 이 목록의 선행 조건이 아니다. SP-12의 범위를 줄일 필요가 있으면 후속 제안으로 명시하며 이번 목록 정리만으로 기존 기능 목표를 삭제하지 않는다.

## SP-01 세부 실행 계획

2026-09-30: [SP-01 목표와 current actual](./chicken_farm_sp01_task_plan.md)은 W3X 기준 목표와 현재 코드 상태를 분리해 기록한다. 시작 자원·아이템·중립 배치·중앙 부활 위치·원본 시간표는 목표로 확정했고, 난이도 data는 원본 8단계의 알려진 스탯 보정으로 확장했다. runtime, 난이도 선택·실제 적 적용·Unlimited 능력, mode 선택/전이·18티어 wave/final lifecycle 검증은 남았다. 따라서 상위 SP-01은 진행 중이며, runtime 구현은 SP-03/07/08/10/11/13 등에서 검증한다.

| ID | 산출물 | 선행 |
| --- | --- | --- |
| SP-01-01 | 규칙 근거·문서 충돌표 | 없음 |
| SP-01-02 | 정상 시작 자원·유닛·아이템 계약 | 01 |
| SP-01-03 | 방어 대상·패배 판정표 | 01/02 |
| SP-01-04 | 최종 단계·승리·동시 판정 규칙 | 01/03 |
| SP-01-05 | 종료·재시작 상태 전이/초기화 계약 | 02/03/04 |
| SP-01-06 | 단일 계약과 후속 SP 인계·현황 동기화 | 01~05 |

한 번에 한 ID만 수행한다. SP-01에서는 규칙을 고정하고 런타임 구현은 SP-03/07/08/10/11/13 등에 인계한다.

## SP-02 세부 실행 계획

[SP-02 검증 경로 확보](./chicken_farm_sp02_task_plan.md)는 **Astra light 계획 → Terra medium 실행**으로 01~07을 완료했다. 개별 type/build, dev/preview, normal smoke, 순수 측정 4종과 browser fixture의 실제 결과를 기록했으며 다음 구현 ID는 **SP-03**이다. Vite build 통과와 타입 검사 통과를 구분한다.

## SP-03 세부 실행 계획

2026-10-01: [SP-03 정상 시작 상태 구성](./chicken_farm_sp03_task_plan.md)을 Terra medium 실행용 9개 task로 분해해 모두 완료했다. SP-03-09는 기본 자원·유닛·아이템과 SP-02 smoke를 재사용해 normal/easy/debug 시작 회귀와 same-page restart 근거를 확정했다.

닭농장 검증 script는 루트 `package.json`에서 `games/chicken-farm/package.json`으로 이전했다. 현재 실행 형식은 `npm run chicken:<name> --workspace @games/chicken-farm`이다.

| ID | 산출물 | 선행 |
| --- | --- | --- |
| SP-03-01 | 시작 옵션·소유자 계약과 resolver | SP-01 규칙/SP-02 |
| SP-03-02 | wallet·유닛·inventory 단일 초기 생성 | 01 |
| SP-03-03 | 시작 입력·PoC fixture 격리 | 02 |
| SP-03-04 | 원본 초기 25개 배치 manifest | 01; 실행은 03 뒤 |
| SP-03-05 | 초기 entity registry·생성/제거 | 04 |
| SP-03-06 | 같은 entity의 도형 view·관찰 | 05 |
| SP-03-07 | 현재 run 상태·event·view 정리 | 03/06 |
| SP-03-08 | 같은 page에서 새 run 생성 | 07 |
| SP-03-09 | 시작/재초기화 회귀·후속 SP 인계 | 01~08 |

SP-03-01에서 시작 resolver와 순수 검사 13 assertion을 추가했고, SP-03-02에서 이를 runtime wallet·unit·inventory 생성에 연결했으며 SP-03-03에서 normal PoC/fixture 자동 생성을 차단했다. SP-03-04는 25개 초기 배치를 source TSV·tilemap·world 좌표로 대조했고, SP-03-05는 이를 run registry에 등록했으며 SP-03-06은 같은 registry ID·좌표의 view와 관찰 API를 연결했다. SP-03-07은 shutdown cleanup과 idempotent browser 회귀를 연결했고 SP-03-08은 same-page restart를 연결했다. SP-03-09는 normal/easy/debug 시작 profile과 browser-perf 재초기화 회귀를 확정했다. SP-04-01은 조작 계약·재현 좌표 정적 대조를, SP-04-02~05는 normal P3 actual click/drag/HUD selection·우클릭·Stop과 경제/건설 분기 회귀를 완료했다. SP-04-06은 failed queued move가 FIFO를 멈추던 흐름을 고치고 actual queue controls를 통과했으며, SP-04-07은 player 정적 WPM/통로/offset/smoothing과 normal P3 이동을 검증했다. SP-04-08~10, SP-05-01의 정적 계약, 02의 browser baseline, 03의 placement/cancel 완료 기록을 반영했으며 다음 실행은 **SP-05-04**다. 전투·wave·NPC 기능은 SP-07/08/12, 종료 뒤 재시작과 새로 추가될 상태 정리는 SP-11에서 연결한다. 세부 카드의 읽기 범위·완료 조건·검증과 실행 요청 템플릿을 따른다.

## SP-04 세부 실행 계획

2026-10-02: [SP-04 선택·이동·경로·기본 명령](./chicken_farm_sp04_task_plan.md)을 Terra medium용 10개 task로 분해했다. SP-04-01은 normal P3의 11개 조작 사례와 WPM 통과/막힌 목표 좌표, 실패 예약 정책을 정적 대조로 완료했고, SP-04-02~05는 read-only controls snapshot, actual camera pan 뒤 click/양방향 drag/HUD selection·우클릭·Stop·경제/건설 fixture 회귀를 통과했다. SP-04-06은 failed queued move를 폐기하고 다음 FIFO 명령을 시작하게 수정했으며 actual Shift queue controls를 통과했다. SP-04-07은 player-only static route 검사를 추가해 WPM/통로/offset/smoothing과 actual normal P3 이동을 확인했다. SP-04-08~10, SP-05-01~04의 완료 기록을 반영했으며 다음 ID는 **SP-05-05**다. 기존 코드가 있다는 사실과 runtime 검수 통과를 구분한다.

| ID | 산출물 | 선행 |
| --- | --- | --- |
| SP-04-01 | 조작 계약·재현 좌표 — 완료, static WPM assertion 통과 | SP-03 |
| SP-04-02 | 조작 전용 최소 browser harness — 완료, typecheck·controls 통과 | 01 |
| SP-04-03 | 클릭/drag 선택·HUD 경계 — 완료, camera pan selection 통과 | 02 |
| SP-04-04 | 우클릭 이동·취소·상호작용 분기 — 완료, normal/fixture controls 통과와 중복 worker task 정리 | 03 |
| SP-04-05 | Stop과 현재 명령 정리 — 완료, S/card Stop·economy task clear·construction pause callback 회귀 | 04 |
| SP-04-06 | Shift 예약·replace·실패 진행 — 완료, actual browser queue 회귀 통과 | 05 |
| SP-04-07 | player 정적 지형·좌표·통로 — 완료, WPM/통로/offset/smoothing 및 normal controls 회귀 통과 | 06 |
| SP-04-08 | 이동 중 동적 blocker 변경 — 완료, 우회·유한 실패·제거 뒤 새 이동 controls 회귀 통과 | 07 |
| SP-04-09 | restart 뒤 입력·예약 격리 — 완료, two-restart 및 새 input controls/browser-perf 회귀 통과 | 08 |
| SP-04-10 | 통합 검수·SP-05 인계 — 완료 기록 반영 | 01~09 |

각 요청은 한 ID만 수행하며 읽을 함수·완료 조건·검증은 세부 카드를 따른다. 기존 wolf 경로 측정과 debug 직접 명령 호출만으로 농부/개의 실제 입력·경로를 완료 처리하지 않는다. 건설 비용/환불은 SP-05, 경제 수량은 SP-06, 전투는 SP-07에 유지한다.

## SP-05 세부 실행 계획

2026-10-02: [SP-05 건설 lifecycle](./chicken_farm_sp05_task_plan.md)을 Terra medium용 **12개 task**로 분해해 모두 완료했다. normal P3의 실제 build-card → Stop → 재개 → 완공과 paid refund, 특수 fixture의 pause/queue/removal/restart를 검수했으며 browser 오류 유입은 0이었다.

SP-06 착수 전 [SP-05 W3X/WPM 비교](./chicken_farm_sp05_w3x_comparison.md)를 완료했다. 원본 울타리·닭장 계보와 시작 농장의 열린 WPM pathing은 대조했으며, `requires` runtime 검증은 SP-09, 건물 ID 기반 경제 수량은 SP-06, 적 피해→제거는 SP-07로 유지한다.

| ID | 작업 | 선행 | 상태 |
| --- | --- | --- | --- |
| SP-05-01 | 상태 전이·비용·환불 계약과 재현 사례 | SP-03/04 | 완료 — 정적 계약·WPM 사례, runtime 미검증 |
| SP-05-02 | 건설 관찰 snapshot과 최소 browser harness | 01 | 완료 — normal actual build-card → pending baseline |
| SP-05-03 | 배치 허용/거부·취소 입력 | 02 | 완료 — normal actual placement/cancel 및 bounds preview |
| SP-05-04 | 도착·착공 재검증·비용 단일 차감 | 03 | 완료 — actual arrival/cost, start rejection, dynamic blocker controls |
| SP-05-05 | 중단·명시적 재개·일꾼 교체 | 04 | 완료 — Stop/move/death pause, owner guard, worker handoff |
| SP-05-06 | 연속 건설 예약·실패 후 진행 | 05 | 완료 — actual Shift FIFO, next-pending handoff fix |
| SP-05-07 | 건설 취소·환불·무료 생성 경계 | 04/05/06 | 완료 — paid refund once, skipCost refund zero |
| SP-05-08 | 완공 단일 전이·기능 등록 | 05/07 | 완료 — completion transition and single economy attachment |
| SP-05-09 | 파괴/제거 단일 경로·참조 정리 | 07/08 | 완료 — idempotent complete removal and reference cleanup |
| SP-05-10 | footprint·이동 blocker·시야 전이 | 08/09 | 완료 — lifecycle spatial contract and dynamic blocker controls |
| SP-05-11 | 건설 상태가 있는 same-page restart | 06~10 | 완료 — construction restart isolation and fresh pending |
| SP-05-12 | 정상 시작 통합 검수·SP-06/07 인계 | 01~11 | 완료 — normal lifecycle/browser 오류 0, SP-06/07/09 인계 |

한 요청에 한 ID만 실행한다. 각 카드에 읽을 함수·수정 범위·완료 assertion·검증을 지정했다. 비용은 도착 후 착공 시 차감하는 기존 경로를 기준으로 대조하며, 실제 적 공격 연결은 SP-07, 경제 수량 루프는 SP-06에 인계한다.

## SP-06 세부 실행 계획

2026-10-07: SP-06의 14개 task와 [SP-06.5 럼버 밀 bridge](./chicken_farm_sp06_5_task_plan.md)의 6개 task를 완료했다. `h00A/h00J/h00W`의 complete building은 owner wallet에 global 30초 tick마다 70/110/170 lumber를 지급하고 닭·알 생산과 병행한다. type/build/순수 34 assertion, construction baseline·completion·removal·restart·integration, normal P3 `full_loop`, 그리고 새 `lumberIncome`을 포함한 `all`이 통과했다. build card·선행조건 강제·업그레이드 UI는 SP-09, 실제 피해 제거는 SP-07에 유지한다. [W3X 최종 비교](./chicken_farm_sp06_w3x_comparison.md)는 남은 원본 경제 차이를 SP-09/12/13/15로 분리한다.

## 기존 경제 통합 계획 — 참고 이력


## 목표

닭농장의 핵심 루프를 하나의 월드 모델에서 완성한다.

```text
건설한 닭장·우물 → 닭 관리·알 생산 → 수집·판매·부화 → 방어 건설 → 늑대 압박
```

현재 건설, 순수 economy simulation, Combat PoC는 각각 동작하지만 서로 다른 entity와 지갑을 사용한다. 따라서 첫 목표는 새 기능을 넓히는 것이 아니라 이 경계를 제거하는 일이다.

## 확정 결정 — 자원·알 계약

2026-07-30에 `닭농장1.3a.w3x` 분석 산출물을 다시 대조해 아래를 현재 구현 기준으로 확정한다.

- player slot의 단일 wallet은 `gold`, `lumber`, `supplyUsed`, `supplyCap`이다. `coins`는 과거 웹 PoC의 단순화 이름이므로 폐기한다.
- `I006` 알은 wallet 자원이 아니다. 필드 item으로 생성되고, 농부/닭장의 6-slot inventory에서 stack된다.
- 농부가 든 egg stack은 **완성 시장**에 도달해 판매할 때만 사라지고 그 판매가만큼 `gold`가 증가한다. 부화는 coop inventory의 egg를 소비하며 wallet을 직접 바꾸지 않는다.
- 원본은 `PLAYER_STATE_RESOURCE_GOLD`와 `PLAYER_STATE_RESOURCE_LUMBER`를 모두 사용한다. `I006`의 object data에는 170 gold 판매 가치가 있고, 원본의 30초 수익 건물은 lumber를 지급한다. 웹 MVP도 이 자원 종류를 보존하되, 정확한 MVP 가격/수익값은 canonical balance에서 별도로 조정한다.

따라서 `carriedEggs: number`도 inventory 이전 PoC의 legacy 상태로 제거 대상이다. 판매·부화·드롭은 모두 `EconomyInventoryState.slots[]`의 stack을 입력으로 받는다.

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
| 2 | 공용 지갑·기준 밸런스 | **코드·순수 측정 완료 / browser smoke 대기** | `coins`·숫자형 `carriedEggs`를 제거했다. 건설·취소 환불·시장 egg stack 판매는 player slot별 단일 `gold/lumber/supply` wallet을 쓰며, 부화는 coop inventory egg만 소비한다. browser smoke 통과 artifact가 남은 완료 조건이다. |
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
   - player slot의 `gold/lumber/supply` wallet, inventory ownership, building/economy entity 연결 키를 정의한다.
   - `coins` 및 숫자형 `carriedEggs`의 읽기/쓰기 지점을 제거하고, egg는 6-slot inventory stack으로만 표현한다.
   - `BuildingSystem` 완료·취소·파괴 event를 economy adapter가 소비할 수 있게 한다.
2. **건설 건물의 economy lifecycle 연결**
   - `coop_basic` 완료 시 coop inventory/economy state를 생성한다.
   - `well_basic` 완료 시 well aura/economy state를 생성한다.
   - 취소·파괴 시 대응 entity, inventory, field interaction을 정리한다.
3. **단일 wallet 및 balance 도입** — 코드 완료
   - 임시 `coins` 별칭과 economy의 이중 상태를 제거하고 `gold/lumber` 단일 wallet API로 이관했다.
   - 시작 자원, 건설 비용, egg stack 시장 판매 gold, 부화 시간/조건을 `balance.ts`의 canonical 값으로 모았다. lumber 수입 건물은 후속 economy production 구현 때 같은 wallet API를 사용한다.
4. **실제 조작 UI 연결**
   - 건설한 닭장 선택 시 Hatch를 노출하고, 농부 인벤토리의 egg stack을 닭장에 입고한다.
   - 닭장 inventory의 egg로 부화한다.
   - 완성 시장을 건설한 뒤, 알을 든 농부가 시장을 우클릭했을 때만 inventory stack을 판매하고 공용 wallet을 변경한다.
5. **회귀 측정과 플레이 검증**
   - 순수 economy 측정은 기존 기준을 유지한다.
   - 건설→산란→pickup→deposit→hatch/sell의 runtime smoke를 추가한다.

### 자동 측정 기준

구현은 각 단계가 사람이 화면에서만 확인해야 하는 상태로 끝나지 않게 한다.

2026-07-30 기준 사전 검증:

- `npm run chicken:economy:measure`는 전환 후 다시 실행됐고 26/26 검사를 통과했다. lifecycle, 6-slot egg stack, 명시 부화, 시장 ID 필요 조건, 부화의 wallet 불변, gold/lumber 건설·환불을 순수 state 수준에서 확인한다.
- 시장 검사는 `coins === gold` legacy 동기화를 제거했다. 시장 없는 sale의 stack/wallet 보존과, 시장 sale의 gold 단일 증가·lumber 보존을 검사한다.
- `npm run chicken:browser-perf:measure`는 fixture 비용 검사를 gold/lumber로 바꾸고, debug automation으로 농부 egg stack을 지급해 실제 시장 판매 order와 gold/HUD 변화를 검사하도록 보강했다.
- 이 작업 환경에서는 Playwright Chromium이 `libnspr4.so` 누락으로 시작하지 못했다. browser smoke는 구현 완료 판정 전 해당 시스템 의존성을 갖춘 CI/개발 환경에서 다시 실행해 통과 artifact를 남긴다.

| 연결 지점 | 자동 측정 | 통과 조건 |
| --- | --- | --- |
| 건설 lifecycle → economy entity | `chicken:economy:measure` | completed building ID로 coop/well과 inventory가 생성되고, 제거 시 모두 정리된다. |
| 우물 → 닭 산란 | `chicken:economy:measure` | 우물 범위 닭은 가속된 tick에 egg drop하고 범위 밖 닭은 기본 tick을 유지한다. |
| 농부 수집 → 닭장 입고 | `chicken:economy:measure` | field egg가 농부 stack을 거쳐 coop stack으로 이동하며, 6-slot 규칙을 지킨다. |
| 부화 | `chicken:economy:measure` | 명시 hatch가 coop stack에서 egg 한 개만 소비하고, `gold/lumber`는 변하지 않은 채 정해진 시간 뒤 footprint 밖에 닭을 생성한다. |
| 시장 판매 → 공용 지갑 | `chicken:economy:measure` | 시장 ID 없이 sale은 거절되어 stack과 wallet이 모두 보존된다. 완성 시장에서 판매한 farmer inventory egg stack만 사라지고 `gold`가 정확히 한 번 증가하며 `lumber`는 변하지 않는다. `coins`/`carriedEggs` 필드는 존재하지 않는다. |
| 건설·환불 → 공용 지갑 | `chicken:economy:measure` | 건설은 canonical gold/lumber cost를 한 번 차감하고, 취소는 정해진 두 자원 refund만 반환한다. |
| 실제 조작 연결 | browser runtime smoke | 건설한 coop/well/market 선택, farmer egg stack 판매, HUD gold/lumber가 같은 state 변화를 표시한다. browser debug state는 `gold/lumber`만 expose한다. |

`npm run chicken:economy:measure`는 결과를 `chicken_farm_w3x_artifacts/economy_poc_metrics.json`에 저장한다. 새 economy command나 비용 규칙을 추가할 때는 해당 불변식을 같은 스크립트에 먼저 추가한다.

### 측정 구현 순서

1. 순수 측정 fixture에서 `coins`와 `carriedEggs`를 제거하고, market reject/success·hatch·construction/refund의 gold/lumber 불변식을 갱신했다.
2. `BrowserDebugState.wallet`과 fixture 비용 검사를 `gold/lumber`로 갱신했다.
3. browser scenario가 farmer inventory에 egg stack을 넣고, 실제 시장 판매 order를 발행하도록 보강했다. 판매 전후의 stack·gold·lumber debug wallet state를 assert한다.
4. **남음:** Playwright Chromium 의존성이 갖춰진 환경에서 browser smoke를 실행하고 artifact를 남긴다. 이 단계가 통과하기 전에는 UI 통합 완료로 판정하지 않는다.

### 스프린트 완료 정의

- 시작 자원으로 우물과 닭장을 건설할 수 있다.
- 그 건설한 우물 범위의 닭은 산란 가속을 받는다.
- 그 건설한 닭장이 자체 6-slot inventory를 가지며 알 입고·부화를 처리한다.
- 완성 시장이 없으면 판매할 수 없고, 알을 든 농부가 시장에 도착했을 때만 판매된다.
- 건설 비용과 알 판매 gold 수익이 HUD의 같은 `gold/lumber/supply` wallet에 즉시 반영된다.
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
