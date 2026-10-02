# SP-06 — 닭·알 경제 세부 실행 계획

> 작성: 2026-10-02. Terra medium에서 **한 요청에 한 ID**를 실행한다. SP-06-01~09를 완료했고 SP-06-10~14는 대기다. 다음 실행은 **SP-06-10**이다.

## 목표와 범위

정상 시작의 분양서·자원으로 닭을 확보하고, 우물 효과·산란 → field egg 수집 → 농부 inventory → 닭장 입고/부화 또는 완성 시장 판매가 같은 ID·owner·wallet로 이어지게 한다. SP-05 완료 기록을 선행 근거로 사용하며 이번에 runtime을 재검증했다고 주장하지 않는다.

SP-06은 정상 경제 진입에 필요한 최소 자원 경로까지 포함한다. 전체 생산/연구·테크 enforcement는 SP-09, 상점 목록/가족/용병/질병 확장은 SP-12, 실제 적 피해는 SP-07, pause/hidden 시간 정책은 SP-13이다. 기존 HUD·도형을 사용하며 필요한 실패 이유와 명령 상태만 추가한다.

## 소스 정적 확인과 우선 위험

소스 경로는 `games/chicken-farm/src/` 기준이다. 아래는 코드 확인이며 runtime 완료 판정이 아니다.

| 확인 지점 | 현재 상태 / 검증 필요 |
| --- | --- |
| `main.ts#beginInventoryDrag` | I003 소비 후 닭 생성 경로가 있다. 현재 농부 위치의 고정 offset을 쓰므로 생성 실패/충돌과 charge 원자성을 확인한다. |
| normal 시작과 `balance.ts` | 1500 gold/0 lumber, coop_basic 비용은 120 gold/52 lumber다. 정상 목재 조달을 증명하지 않으면 fixture 부화만 통과해도 전체 루프는 미완료다. |
| `economySystem.ts#updateChickenFarmEconomy` | 생존/AI·산란·부화를 갱신한다. 우물 급수 배정과 산란 buff 함수가 별도이므로 범위/한도 계약 대조가 필요하다. |
| `depositFieldEggToCoop` / `depositEggStackToCoop` | 전자는 storedEggs 직접 변경, 후자는 inventory 이동 후 동기화다. 실제 사용처와 우회 경로를 확인해 수량의 기준을 통일한다. |
| `startCoopHatch` / `completeHatches` | 알 한 개 소비와 capacity 검사가 있다. 출구 막힘·없는 coop fallback·제거 직후 완료 경계를 검증한다. |
| `sellEconomyInventoryEggStack` | 순수 함수는 marketId의 존재 문자열을 검사한다. 실제 시장 완료/owner/도착 검증은 scene 경계까지 읽어야 한다. |
| `removeEconomyBuilding` | inventory·hatch job 제거 경로가 있다. SP-05 정책에 따른 폐기량과 늦은 worker task 처리 검증이 남는다. |

가격·시간·수량은 canonical balance/config에서 읽는다. 원본 근거가 필요한 항목은 로컬 W3X 추출 artifact의 관련 행만 읽고 미확인 값을 원본 규칙으로 부르지 않는다.

## 실행 순서

01부터 14까지 순차 실행한다. 선행 열은 의존성 표시이며 병렬 에이전트 실행 지시가 아니다. 한 ID에서 독립 기능이 둘 이상 커지면 해당 ID 아래 `-A/-B`로 먼저 쪼개고 범위·인계를 기록한다. task 수는 소요 시간이나 모델 사용량 보장이 아니다.

| ID | 작업 | 선행 | 상태 |
| --- | --- | --- | --- |
| SP-06-01 | 경제 계약·정상 시작 재현 경로 확정 | SP-05 | 완료 |
| SP-06-02 | 경제 관찰 snapshot·browser 검증 진입점 | 01 | 완료 |
| SP-06-03 | 분양서 사용·닭 생성 원자성 | 02 | 완료 |
| SP-06-04 | 0 lumber 시작의 경제 진입 경로 | 03 | 완료 |
| SP-06-05 | 우물 효과·닭 생존·산란 | 04 | 완료 |
| SP-06-06 | field egg 수집·6-slot 보존 | 05 | 완료 |
| SP-06-07 | 알 drop·닭장 입고·실패 복구 | 06 | 완료 |
| SP-06-08 | 명시적 부화 시작·알 예약 | 07 | 완료 |
| SP-06-09 | 부화 완료·막힌 출구 | 08 | 완료 |
| SP-06-10 | 완성 시장 도착 판매·공용 wallet | 07 | 대기 |
| SP-06-11 | 경제 주문 취소·교체·경로 실패 | 06/07/10 | 대기 |
| SP-06-12 | 건물 제거·알/부화 예약 정리 | 09/10/11 | 대기 |
| SP-06-13 | 경제 상태가 있는 same-page restart | 12 | 대기 |
| SP-06-14 | 정상 시작 전체 루프·SP-07 인계 | 01~13 | 대기 |

## 공통 검증·수량 계약

- `I006` 수량의 기준은 field stack과 6-slot inventory다. `storedEggs`는 파생값이며 wallet 자원이 아니다.
- 알 장부: 초기 알 + 산란/명시 생성 = 현재 field+farmer+coop 알 + 판매 누계 + 부화 시작 소비 누계 + 명시 폐기 누계. 부화 예약 알을 현재 알에 다시 더하지 않는다.
- 닭 장부: 초기 닭 + 분양 성공 + 부화 완료 = 살아 있는 닭 + 사망/제거 누계. wallet은 시작값 + 명시 수입/판매/환불 − 비용과 대조한다. 테스트용 누계로 충분하며 제품 event-sourcing 전면 개편은 하지 않는다.
- 순수 측정은 `scripts/measure-chicken-farm-economy.ts`를 확장한다. 실제 입력과 debug API 직접 호출의 증거를 분리하며 normal 실행에 fixture를 섞지 않는다.
- browser 대기는 simulation 시각/상태 조건과 유한 timeout을 사용한다. 사례마다 runId/profile/입력/expected/actual/pass/console·page·request·HTTP 오류를 `chicken_farm_w3x_artifacts/economy_check_<case>.json`에 저장한다.
- runtime 수정 task는 typecheck와 해당 사례를 실행한다. 경로/명령/제거 공통 코드를 변경한 경우에만 관련 회귀를 추가하며 전체 묶음은 14에서 수행한다. 실패·환경 차단을 통과로 기록하지 않는다.

## 세부 작업 카드

### SP-06-01 — 경제 계약·정상 시작 재현 경로 확정

- 선행: SP-05.
- 읽기: economyTypes.ts, balance.ts, main.ts#beginInventoryDrag / placeStartItem, SP-05-12 결과, item_catalog_reference.tsv·jass_economy_events.tsv의 관련 행.
- 작업: 닭 확보→우물→산란→수집→시장 판매와 닭장→입고→부화를 상태표로 만든다. normal P3 1500 gold/0 lumber, I003 5회·I009/I00F 각 1회의 합법적 사용 순서와 비용/시간/좌표를 기록한다. coop_basic의 52 lumber 확보 경로를 추적하고, 없으면 04에서 구현할 최소 자원 획득 경로·원본 근거·MVP 변환을 결정한다. 시작 자원 상향이나 debug 지급으로 정상 루프를 대체하지 않는다.
- 완료 조건: owner·6-slot/stack·부분 성공 여부·부화 capacity/supply·출구 막힘·건물/농부 제거 시 알 처분 정책을 확정한다. 원본 사실/현재 동작/변경 결정을 구분하고 후속 카드에 결함을 배정한다.
- 검증: 정적 대조; runtime 통과 주장 금지. 계약 artifact sp06_01_economy_contract.json 작성.

#### SP-06-01 결과

- 상태: **완료**. normal P3의 시작 아이템·wallet·WPM과 economy/building 소스를 정적으로 대조해 [경제 계약 artifact](./chicken_farm_w3x_artifacts/sp06_01_economy_contract.json)를 작성했다. 구현과 browser runtime 검증은 수행하지 않았다.
- 정상 시작 경로: owner 3의 farmer `p3-farmer`는 `(3392,8928)`에서 6-slot inventory로 `I003 ×5`, `I009 ×1`, `I00F ×1`을 받는다. static WPM 4×4 검사상 campfire `(3584,8896)` → footprint `(3520,8832)`, market `(4032,8896)` → `(3968,8832)`, coop `(4160,8896)` → `(4096,8832)`는 서로 겹치지 않고 모두 ground 허용이다. 이 위치의 실제 click·도달은 SP-06-02 이후의 runtime 검증 대상이다.
- 현재 흐름과 막힘: `I009`/`I00F`는 `skipCost`·즉시 완공으로 각각 basic feeding well/campfire와 market을 만들며, `I003`은 기본 닭 한 마리를 만든다. 기본 닭은 살아 있을 때 30초마다 I006 한 개를 낳고 시장은 한 egg당 gold 12를 준다. 그러나 `coop_basic`은 `120 gold / 52 lumber`이고 normal은 lumber 0이다. `exchangeEnabled: false`이며 lumber mill의 wallet 수입 write가 없어, 현재 코드만으로는 정상 닭장·부화 경로에 도달하지 못한다.
- 결정: SP-06-04는 완성된 같은 owner 시장에서 원본 첫 교환 tier인 `100 gold → 70 lumber`를 최소 범위로 구현한다. `jass_economy_events.tsv` 3185–3186과 `web_mvp_balance_reference.json`의 원본 tier를 근거로 하며, 시작 자원/디버그 지급을 늘리거나 모든 lumber mill·상위 교환을 구현하지 않는다. 현재 runtime의 building `requires`는 아직 enforce하지 않으므로 SP-09에서 고정한다.
- 수량·소유권 계약: field/farmer/coop I006와 6-slot inventory가 알의 기준이고 `storedEggs`는 파생값이다. pickup·deposit·sale은 전체 stack 단위로 성공하거나 source/wallet을 보존한다. coop/market/actor/item owner는 같아야 하며 market owner 검증은 SP-06-10에서 보완한다. 부화는 egg 1개와 job 1개를 원자적으로 교환하고, basic/mid/high는 각각 `1/20초/basic`, `2/17초/mid`, `3/14초/giant`다. economy chicken은 SP-09 전까지 supply를 예약·소비하지 않는다.
- 제거·출구 정책: coop 제거는 refund 없이 stored egg를 폐기하고 hatch job을 취소하며 새 닭을 만들지 않는다. market 제거는 판매 task만 취소하고 farmer egg를 보존한다. farmer 제거는 task와 inventory를 한 번만 폐기한다. well 제거는 egg를 폐기하지 않고 효과만 끈다. 막힌 hatch exit은 job을 보존해 재시도하며 missing-coop job은 닭을 만들지 않고 정리한다.
- 후속 배정: I003 spawn 원자성은 03, `100 → 70` 교환은 04, basic well/풍차의 급수·산란 역할은 05, stack 이동은 06/07, hatch start/exit은 08/09, market owner는 10, farmer task/제거는 11/12, restart/통합은 13/14다.
- 검증: `node --input-type=module`로 WPM grid의 세 footprint 4×4 ground 허용을 확인했다(종료 코드 0). `git diff --check` → 종료 코드 0. TypeScript, build, economy measure, browser는 이 문서/JSON 변경만 있으므로 **미실행**이다.
- 다음 ID: **SP-06-02**.

### SP-06-02 — 경제 관찰 snapshot·browser 검증 진입점

- 선행: 01.
- 읽기: main.ts의 __chickenFarmDebug 등록, check-chicken-farm-controls.ts / check-chicken-farm-construction.ts의 browser harness.
- 작업: runId/time, wallet, 닭 ID/owner/HP/산란시각, field egg, inventory slots, 건물 완료 상태, hatchJobs, worker task/target, 선택 상태를 복사해서 반환하는 read-only snapshot을 추가한다. scripts/check-chicken-farm-economy.ts와 workspace chicken:economy:check 명령을 신설한다.
- 완료 조건: normal P3 baseline에서 fixture 유입 0, snapshot 호출로 상태 변화 0, browser 오류 0. 사례별 expected/actual/pass와 실행 profile을 JSON으로 저장한다. 새 명령은 이 task에서 생성하기 전에는 실행 가능하다고 표기하지 않는다.
- 검증: typecheck + 신설 baseline. 사례 선택 CHICKEN_FARM_ECONOMY_CASE와 all 실행을 구현하고 지원 값을 기록.

#### SP-06-02 결과

- 상태: **완료**. `getEconomyLifecycleSnapshot`과 `chicken:economy:check`를 추가해 normal P3의 read-only 경제 관찰·browser baseline을 확보했다. 독립 결함이나 하위 task 분리는 없었다.
- 변경 파일: `games/chicken-farm/src/main.ts#window.__chickenFarmDebug.getEconomyLifecycleSnapshot`, `scripts/check-chicken-farm-economy.ts`, `games/chicken-farm/package.json`, [baseline artifact](./chicken_farm_w3x_artifacts/economy_check_baseline.json), [all artifact](./chicken_farm_w3x_artifacts/economy_check_all.json).
- 관찰 계약: snapshot은 run ID·simulation time·gold/lumber/supply wallet, 닭의 ID/owner/HP/next egg time, field egg, 6-slot inventory 복사본, 건물 ID/owner/state, hatch job, economy worker task target, 선택 ID를 반환한다. 반환 배열·slot·좌표는 모두 새 record이며 호출은 simulation·inventory·명령을 변경하지 않는다.
- baseline: combat/debug economy/debug fixture/terrain probe를 모두 끈 normal P3에서 run `1`, wallet `1500 gold / 0 lumber / supply 0/3`, `p3-farmer` inventory `I003 ×5`, `I009 ×1`, `I00F ×1`, empty 3 slots를 확인했다. 닭·field egg·coop/well·hatch job·economy worker task·building·선택은 모두 0이다. snapshot 두 번의 비교는 simulation elapsed time만 제외하고 동일했다.
- harness: `CHICKEN_FARM_ECONOMY_CASE=baseline`은 baseline 하나를 실행한다. `all`은 현재 등록된 모든 case, 즉 baseline 하나를 실행하며 이후 ID가 case를 추가한다. 두 경우 artifact에 profile, snapshot, expected checks, console/page/request/HTTP 오류를 저장한다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_ECONOMY_CASE=baseline npm run chicken:economy:check --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_ECONOMY_CASE=all npm run chicken:economy:check --workspace @games/chicken-farm` → 종료 코드 0. 두 browser 실행은 local tsx IPC/Vite가 필요한 승인된 로컬 실행이며 모든 오류 목록은 빈 배열이다. `git diff --check` → 종료 코드 0.
- 남은 결함: snapshot은 관찰 전용이며 분양서 실행·spawn 원자성은 아직 검증하지 않았다. 이 실제 입력·실패 원자성은 SP-06-03에서 수행한다.
- 다음 ID: **SP-06-03**.

### SP-06-03 — 분양서 사용·닭 생성 원자성

- 선행: 02.
- 읽기: main.ts#beginInventoryDrag, economySystem.ts#addEconomyChicken / consumeEconomyInventoryItem, buildingProductionExit.ts.
- 작업: 실제 inventory 입력으로 I003 한 번 사용→닭 한 마리 생성→charge 한 번 차감을 확인한다. owner·spawn 위치·WPM/건물 충돌·마지막 charge와 반복 입력을 검증한다. 실패 시 아이템을 잃지 않게 한다.
- 완료 조건: 시작 charge 5를 넘는 생성 0, 닭/view ID 일치, 타 owner/죽은 농부/빈 slot 거부 시 변화 0. supply 적용 여부는 01 계약을 따른다.
- 검증: typecheck + acquisition browser 사례; 위치 선택을 바꿨으면 관련 순수 출구 검사.

#### SP-06-03 결과

- 상태: **완료**. I003의 실제 inventory 슬롯 입력을 normal P3에서 검수했고, 막힌 spawn 위치에서는 charge를 소비하지 않도록 `beginInventoryDrag`의 순서를 수정했다.
- 변경 파일: `games/chicken-farm/src/main.ts#beginInventoryDrag`, `scripts/check-chicken-farm-economy.ts#acquisition`, [acquisition artifact](./chicken_farm_w3x_artifacts/economy_check_acquisition.json), [all artifact](./chicken_farm_w3x_artifacts/economy_check_all.json).
- 원자성: I003은 farmer 존재와 spawn point `farmer position + (42,34)`의 terrain/dynamic blocker 허용을 먼저 검사한다. 거부 시 `start_item_use_rejected` telemetry만 기록하고 slot·wallet·supply·닭을 바꾸지 않는다. 검사 통과 뒤에만 charge 1을 소비하고 같은 owner의 basic chicken/view를 만든다.
- actual assertion: fixture/combat/debug economy off normal P3에서 farmer를 실제 선택하고 HUD 첫 inventory 슬롯을 실제 click했다. 첫 click은 I003 `5 → 4`, `chicken-1` 하나(owner 3, basic) 생성, wallet `1500/0`, supply `0/3` 불변이었다. 같은 실제 click을 총 다섯 번 실행하면 `chicken-1`~`chicken-5`만 생성되고 I003 slot은 비며, 여섯 번째 빈 슬롯 click은 닭 ID·inventory·wallet을 바꾸지 않았다.
- 실패 경계: debug fixture 전용 complete `coop_basic` footprint로 spawn point를 막은 뒤 실제 farmer 선택·I003 slot click을 실행했다. 닭 생성은 0, I003은 `5` 유지, wallet/supply/task 변화 0이었다. 이 fixture는 normal 성공 증거와 별도 server session에서 실행했다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_ECONOMY_CASE=acquisition npm run chicken:economy:check --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_ECONOMY_CASE=all npm run chicken:economy:check --workspace @games/chicken-farm` → 종료 코드 0. normal·fixture 양쪽의 console/page/request/HTTP 오류는 모두 0이며 `git diff --check` → 종료 코드 0.
- 남은 결함: I003의 다른 owner/dead farmer는 UI 경로에서 선택할 수 없어 이번 normal 사례에 포함하지 않았다. economy inventory ownership과 farmer death 제거 정책은 SP-06-11/12에서 처리한다. 0 lumber 경제 진입과 I009/I00F 설치는 SP-06-04 범위다.
- 다음 ID: **SP-06-04**.

### SP-06-04 — 0 lumber 시작의 경제 진입 경로

- 선행: 03.
- 읽기: 01 계약, main.ts#placeStartItem, buildingEconomyAdapter.ts, balance.ts, playerWallet.ts 및 01에서 특정한 자원 획득 함수.
- 작업: I009/I00F 설치 성공·취소·실패 시 charge와 완성 건물 ID를 확인한다. 01에서 찾은 합법적 lumber 획득 경로를 연결하고 없으면 계약한 최소 경로를 구현한다. 전체 상점/생산 테크 확장 없이 닭장 건설에 필요한 진입만 처리한다.
- 완료 조건: normal wallet과 시작 아이템만으로 우물·닭장·시장에 도달하는 자원 장부를 남긴다. 자원 생성은 명시된 보상/수입에서만 발생하며 반복 update/실패 설치의 중복 수입 0. 기존 비용/시작값을 몰래 낮추지 않는다.
- 검증: typecheck + bootstrap browser 사례 + economy 순수 측정. 필요한 테크 의존성이 해결되지 않으면 정상 통합을 완료 처리하지 않고 구체적 하위 ID로 분리.

#### SP-06-04 결과

- 상태: **완료**. normal P3의 시작 아이템 설치 경로를 actual browser 입력으로 검수하고, 원본 첫 시장 교환 tier `100 gold → 70 lumber`만 연결했다. 시작 wallet·건설 비용·상위 교환 및 lumber mill은 바꾸지 않았다.
- 설치 원자성: `I009` targeting은 Esc 취소 시 charge·wallet·건물 수를 보존한다. I009의 성공 click은 owner 3 complete `campfire` 하나를 만들고 charge 한 번만 소비한다. `I00F`는 기존 campfire footprint에 actual click하면 targeting과 charge를 보존하며, 유효 위치 성공 시 owner 3 complete `market` 하나만 만들고 charge 한 번을 소비한다. `placeStartItem`은 source slot을 먼저 확인하고, 예외적인 post-create consume 실패에는 생성 건물을 공용 removal 경로로 되돌린다.
- 경제 진입: owner 3 complete market을 actual 선택한 뒤 `E`를 한 번 누르면 `gold 1500 / lumber 0 → gold 1400 / lumber 70`이 된다. 200ms settle 뒤 wallet 변화가 없어 update 반복 수입은 없었고, 이 장부는 `coop_basic` 비용 `120 gold / 52 lumber`를 충족한다. market command card는 `100g → 70l`을 표시하며 선택된 own complete market에서만 실행한다. detailed market owner/sale 이동 검증은 SP-06-10에 남긴다.
- 관찰·artifact: lifecycle snapshot에 read-only `activeStartItemPlacement`를 추가했고 [bootstrap artifact](./chicken_farm_w3x_artifacts/economy_check_bootstrap.json)는 cancel·overlap failure·두 설치·한 번의 교환·닭장 자원 도달을 기록한다. [all artifact](./chicken_farm_w3x_artifacts/economy_check_all.json)는 baseline/acquisition/bootstrap 전체 통과를 기록한다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_ECONOMY_CASE=bootstrap npm run chicken:economy:check --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_ECONOMY_CASE=all npm run chicken:economy:check --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:economy:measure --workspace @games/chicken-farm`의 26개 사례 → 모두 통과. browser console/page/request/HTTP 오류는 0이며 `git diff --check` → 종료 코드 0.
- 다음 ID: **SP-06-05**.

### SP-06-05 — 우물 효과·닭 생존·산란

- 선행: 04.
- 읽기: economySystem.ts#updateChickenVitalityAndAi / assignChickensToFeedingWells / findBuffingWell / updateEggDrops / getCurrentEggIntervalSec.
- 작업: 같은 owner의 완성 우물 범위 안/밖, 수용 한도 초과, 다른 owner, 우물 제거 시 HP/산란 주기를 대조한다. 현재 우물 급수 배정과 산란 buff 판정의 차이가 의도인지 01 계약대로 정리한다.
- 완료 조건: 기본/가속 산란량과 시각이 config와 일치, dead 닭 산란 0, field egg의 source/owner/quantity 정확, 같은 시각 반복 update 중복 산란 0. 급수와 산란 가속 적용 대상을 구분해 기록한다.
- 검증: typecheck + economy 순수 측정 + laying browser 사례. pause/hidden 전체 정책은 SP-13.

#### SP-06-05 결과

- 상태: **완료**. 우물의 급식과 산란 가속은 같은 판정이 아니다. complete basic well/campfire는 같은 owner의 가까운 닭을 attract 범위에서 최대 8마리까지 배정하고, feeding radius 안에서만 HP를 회복시키며 egg interval은 기본값 `30초`로 유지한다. complete windmill만 같은 owner의 attract range 안 닭에 `0.75×`를 적용해 basic 첫 산란을 `22.5초`로 앞당긴다.
- 순수 경계: basic well의 정확히 `96px` 안쪽 닭은 0.25초에 HP `20 → 21`로 회복했다. `97px` 밖과 다른 owner 닭은 각각 `20 → 19.95`로 감소했고, well 제거 뒤에는 안쪽 닭도 `21 → 20.95`로 감소했다. basic/windmill capacity는 각각 8/16이며, 다른 owner의 windmill 인접 닭은 next egg `30초`, 같은 owner는 `22.5초`다. HP 0 dead 닭은 60초 update에도 field egg 0이다.
- 산란 수량: I009 campfire + I003 basic chicken actual inventory/world input 뒤 fixture time을 first due time까지 전진했다. `egg-1`은 owner 3/source `chicken-1`/stack 1, `wellBuffed: false`, `droppedAtSec = 30.64…`에 한 번 생겼고 다음 시각은 `60.64…`였다. 같은 시각 뒤 0.3초 snapshot에도 egg 수는 1로 유지했다. 시간 전진은 30초 wall-clock 대기를 피하기 위한 debug fixture이며, actual input 증거와 분리했다.
- artifact: [laying browser artifact](./chicken_farm_w3x_artifacts/economy_check_laying.json), [economy pure metrics](./chicken_farm_w3x_artifacts/economy_poc_metrics.json).
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:economy:measure --workspace @games/chicken-farm` → 29개 사례 모두 통과. `CHICKEN_FARM_ECONOMY_CASE=laying npm run chicken:economy:check --workspace @games/chicken-farm` → 종료 코드 0, console/page/request/HTTP 오류 0. `git diff --check` → 종료 코드 0.
- 다음 ID: **SP-06-06**.

### SP-06-06 — field egg 수집·6-slot 보존

- 선행: 05.
- 읽기: economySystem.ts#pickupFieldEgg / ensureEconomyInventory, main.ts#updateEconomyWorkerTasks 및 pickup_egg 주문 분기.
- 작업: actual 우클릭→농부 이동→도착 pickup을 연결한다. stack 병합, 빈 slot 없음, target 선점/소멸, owner 불일치, 도달 실패를 검증한다.
- 완료 조건: 도착 전 이동량 0; 성공 때 field 감소=inventory 증가; 실패 때 총 알 불변. 동일 egg를 두 농부가 요청해도 수집 1회, 비알 slot 보존, 유한 시간에 task 종료.
- 검증: typecheck + economy 순수 측정 + pickup browser 사례.

#### SP-06-06 결과

- 상태: **완료**. farmer가 선택된 상태에서 field egg를 actual 우클릭하면 move order와 `pickup_egg` task를 만들고, interaction radius `54px`에 도달한 update에서만 `pickupFieldEgg`를 실행한다. 성공은 field egg 하나를 제거하고 owner 3 farmer의 기존 6-slot inventory에서 I006 stack 하나를 늘린 뒤 command/task를 정리한다.
- actual contention: fixture time으로 만든 `egg-1`에 멀리 있는 owner 3 contender가 먼저 actual 우클릭했다. 도착 전에는 field egg 1, farmer I006 0, contender task 1이었다. 이어 p3-farmer가 같은 egg를 actual 우클릭해 I006 `1`을 얻었고 field egg는 0이 됐다. contender의 늦은 task는 target missing으로 유한하게 제거되어 duplicate pickup 0이다.
- 보존 경계: 순수 측정에서 capacity 1이 I003으로 찬 inventory와 다른 owner egg의 pickup은 모두 null을 반환했다. field egg 두 개와 비알 I003 slot은 그대로여서 실패 시 총 알·다른 아이템을 보존한다. 기존 4개 field egg 수집은 하나의 I006 stack/slot으로 병합됨도 계속 통과한다.
- artifact: [pickup browser artifact](./chicken_farm_w3x_artifacts/economy_check_pickup.json), [economy pure metrics](./chicken_farm_w3x_artifacts/economy_poc_metrics.json).
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:economy:measure --workspace @games/chicken-farm` → 30개 사례 모두 통과. `CHICKEN_FARM_ECONOMY_CASE=pickup npm run chicken:economy:check --workspace @games/chicken-farm` → 종료 코드 0, console/page/request/HTTP 오류 0. `git diff --check` → 종료 코드 0.
- 다음 ID: **SP-06-07**.

### SP-06-07 — 알 drop·닭장 입고·실패 복구

- 선행: 06.
- 읽기: economySystem.ts#dropInventoryEggToField / depositEggStackToCoop / depositFieldEggToCoop / syncCoopStoredEggs, main.ts#completeInventoryDrag / depositDraggedInventoryItemToCoop.
- 작업: 실제 inventory drag로 field drop→재수집과 farmer→완성 coop 입고를 검수한다. 이동 중 source slot 변경, full coop, 다른 owner, 미완공/제거된 coop을 처리한다. storedEggs 직접 증가 경로의 사용처를 찾아 inventory와 이중 기준이 생기지 않게 한다.
- 완료 조건: field+farmer+coop 총 알 보존, 입고 실패 rollback 정확, 다른 아이템 보존, storedEggs=coop I006 합계. target 소멸 시 공중 소실·중복 입고 0.
- 검증: typecheck + economy 순수 측정 + transfer browser 사례.

#### SP-06-07 결과

- 상태: **완료**. farmer I006 inventory drag를 ground에 놓으면 `drop_to_field` 주문이 source slot을 보존한 채 이동하고, 도달 후 field egg를 만든다. 같은 egg actual 우클릭 재수집은 I006 stack을 복구해 field/farmer 총알 1을 보존했다.
- coop 입고: complete coop에 actual I006 drag는 `deposit_to_coop` task와 source 보존을 먼저 만들고, fixture의 farmer 도착 보조 후 farmer I006은 0, coop inventory I006은 1, `storedEggs`는 1이 됐다. coop inventory가 수량 기준이고 storedEggs는 동기화된 파생값임을 snapshot에 노출했다.
- 경계: existing pure measurement의 coop full rollback/owner 검사와 6-slot stack 사례를 재실행했다. field drop/재수집과 complete coop 입고 browser 증거는 [transfer artifact](./chicken_farm_w3x_artifacts/economy_check_transfer.json), [deposit artifact](./chicken_farm_w3x_artifacts/economy_check_deposit.json)에 분리했다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:economy:measure --workspace @games/chicken-farm` → 30개 사례 모두 통과. transfer/deposit browser 사례 → 종료 코드 0, browser 오류 0. `git diff --check` → 종료 코드 0.
- 다음 ID: **SP-06-08**.

### SP-06-08 — 명시적 부화 시작·알 예약

- 선행: 07.
- 읽기: economySystem.ts#startCoopHatch, main.ts#startCoopHatchById 및 start_coop_hatch action, coop command card.
- 작업: 완성 닭장 실제 선택/명령으로 egg 1개→job 1개 전이를 확인한다. coop 3종의 capacity·결과 닭 종류·시간과 빈 inventory/초과 입력/타 owner 거부를 검증한다.
- 완료 조건: 성공당 알 1개 소비, 부화는 gold/lumber 불변. 실패 시 알/job 변화 0, 자동 부화 없음. supply 예약 정책은 01에서 결정한 규칙과 일치한다.
- 검증: typecheck + economy 순수 측정 + hatch_start browser 사례.

#### SP-06-08 결과

- 상태: **완료**. actual complete coop 선택 뒤 `H` 명령은 coop I006 한 개를 소비하고 owner 3 basic `hatch-1` job 한 개를 만든다. basic job의 `completeAtSec`은 시작 시각 + 20초이며 gold/lumber/supply는 변하지 않는다.
- 실패 경계: 빈 coop에서 같은 `H`를 반복해도 egg/job 변화가 없다. existing pure measurement는 basic/mid/high capacity와 explicit hatch 전후 inventory를 대조하며, runtime command 사례는 basic complete coop을 사용한다.
- artifact: [hatch-start browser artifact](./chicken_farm_w3x_artifacts/economy_check_hatch_start.json).
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_ECONOMY_CASE=hatch_start npm run chicken:economy:check --workspace @games/chicken-farm` → 종료 코드 0, browser 오류 0. 이전 SP-06-07 economy 측정 30개 사례는 유지 통과. `git diff --check` → 종료 코드 0.
- 다음 ID: **SP-06-09**.

### SP-06-09 — 부화 완료·막힌 출구

- 선행: 08.
- 읽기: economySystem.ts#completeHatches, buildingProductionExit.ts#resolveBuildingProductionExit, main.ts#handleEconomyEvent.
- 작업: 시간 도달 시 같은 owner 닭/view를 한 번 생성한다. footprint 밖 WPM·dynamic blocker 허용점을 확인하고 전 출구가 막히면 01의 대기/재시도 정책을 적용한다. coop이 없는 job의 (0,0) fallback도 차단한다.
- 완료 조건: 완료 전 생성 0, 완료 후 job 1개 제거·닭 1마리 증가; 반복 update 중복 0. 막힌 동안 유실/벽 속 생성 0, 해제 뒤 한 번 완료. wallet 불변.
- 검증: typecheck + economy 순수 측정 + hatch_exit browser 사례.

#### SP-06-09 결과

- 상태: **완료**. due hatch는 coop footprint 밖의 사용 가능한 production exit에 같은 owner 닭을 한 번만 만들고 job을 제거한다. 모든 candidate가 막히면 egg를 다시 소비하거나 닭을 만들지 않고 due job을 유지하며, 다음 update에서 출구를 다시 탐색한다.
- 구현: `completeHatches`는 missing coop job을 생성 없이 제거해 `(0,0)` fallback을 없앴고, `resolveBuildingProductionExit(...).resolved === false`이면 job을 보존한다. 해제 뒤 `resolved` exit에서만 `hatch_completed` event와 chicken view를 만든다.
- 순수 측정: 차단 상태의 `20초` update는 completed event 0/job 1/chicken 0이고, 허용 상태 `20.25초` update는 completed event 1/job 0/chicken 1이다. 후속 update도 중복 생성하지 않으며 gold/lumber는 불변이다. orphan hatch job은 chicken 0/job 0으로 정리된다.
- browser: actual farmer I006 drag→complete coop 입고→coop 선택→`H` 입력 뒤 [hatch-exit artifact](./chicken_farm_w3x_artifacts/economy_check_hatch_exit.json)는 완료 1초 전 chicken 0/job 1, 완료 뒤 owner 3 basic `chicken-1` 한 마리/job 0, footprint 밖 spawn 및 반복 update 중복 0을 기록한다. console/page/request/HTTP 오류도 0이다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:economy:measure --workspace @games/chicken-farm` → 32개 사례 모두 통과. `CHICKEN_FARM_ECONOMY_CASE=hatch_exit npm run chicken:economy:check --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0.
- 다음 ID: **SP-06-10**.

### SP-06-10 — 완성 시장 도착 판매·공용 wallet

- 선행: 07.
- 읽기: economySystem.ts#sellEconomyInventoryEggStack, main.ts#updateEconomyWorkerTasks의 시장 검증/판매 및 HUD 갱신, playerWallet.ts.
- 작업: actual 시장 우클릭/지원하는 inventory drag 경로를 검수한다. 순수 함수의 nonempty marketId와 runtime의 실제 완성 시장/owner/도착 검증 책임을 구분한다. 이동 중 시장 제거·미완공·타 owner·존재하지 않는 ID·다중 stack을 확인한다.
- 완료 조건: 판매된 알 수×canonical 단가만큼 gold 증가 1회, lumber/비알 item 보존, 이동 중/실패 시 알·wallet 불변. HUD와 건설 wallet이 같은 값을 읽는다. 반복 주문으로 같은 stack 재판매 0.
- 검증: typecheck + economy 순수 측정 + sale browser 사례.

### SP-06-11 — 경제 주문 취소·교체·경로 실패

- 선행: 06/07/10.
- 읽기: main.ts#economyWorkerTasks / updateEconomyWorkerTasks, controllableUnitSystem.ts의 Stop/queue/실패 callback.
- 작업: pickup/deposit/sell 이동 중 S/card Stop, 새 move/build 명령, Shift 예약, 경로 차단과 농부 사망을 검사한다. SP-04 명령 계약대로 task와 현재/예약 명령을 함께 정리한다.
- 완료 조건: 취소 뒤 늦은 도착 거래 0, 오래된 slot/target 참조 0, 실패 후 후속 명령 진행. 정상 거래 완료는 1회, 미거래 알은 01 처분 정책대로 보존/명시 제거.
- 검증: typecheck + interruption browser 사례 + 변경된 controls 사례만 회귀.

### SP-06-12 — 건물 제거·알/부화 예약 정리

- 선행: 09/10/11.
- 읽기: economySystem.ts#removeEconomyBuilding, buildingEconomyAdapter.ts#detachBuildingEconomy, main.ts#detachBuildingEconomy 및 SP-05 공용 제거 경로.
- 작업: 알이 있는 coop, 진행/출구 대기 job, 이동 목표 market, buff 중 well을 공용 제거 API로 제거한다. SP-05의 inventory/job 폐기 정책을 재사용하고 수량 장부에 명시한다. 정책 변경은 이유와 SP-05 영향 기록.
- 완료 조건: 같은 제거 2회에도 처분 1회; job/target/inventory 잔존 0, 유령 부화/판매/buff 0, 파괴 환불 0. 실제 적 공격 연결은 SP-07에 인계.
- 검증: typecheck + removal browser 사례 + economy 순수 측정; 공용 제거 변경 시 construction removal 회귀.

### SP-06-13 — 경제 상태가 있는 same-page restart

- 선행: 12.
- 읽기: main.ts shutdown/restart·경제 view/drag/task cleanup, 기존 start-regression/browser-perf restart 사례.
- 작업: field egg·농부/coop stack·진행 및 출구 대기 job·worker task·drag가 있는 상태에서 같은 page 두 restart를 검수한다. normal→normal과 debug→normal을 분리한다.
- 완료 조건: 새 run wallet/시작 item 정확; 이전 run job/event/view/selection/target 0, ID 재사용이 있어도 이전 run callback 영향 0. 새 분양/수집 입력 한 번당 처리 1회.
- 검증: typecheck + restart browser 사례 + 기존 start-regression 관련 회귀.

### SP-06-14 — 정상 시작 전체 루프·SP-07 인계

- 선행: 01~13.
- 읽기: 이 계획의 계약/결과, SP-05-12, economy/controls/construction 검증 결과.
- 작업: fixture off normal P3에서 실제 입력으로 시작 item·정상 자원 획득→우물/닭장/시장→분양·산란·수집→입고·부화 및 판매를 한 run으로 검수한다. debug 시간/자원/알 주입을 normal 증거로 쓰지 않는다. 특수 경계는 별도 fixture 결과로 첨부한다.
- 완료 조건: 원인별 알·닭·wallet 장부가 일치, HUD 일치, browser 오류 0. 미해결 정상 진입 의존성 0. SP-07 피해/사망 연결, SP-09 생산/테크, SP-12 확장 기능, SP-13 시간 정책에 구체적 인계.
- 검증: typecheck + build + economy 순수 측정 + economy browser all. 공통 코드 변경 시 해당 controls/construction 회귀. 결과와 다음 SP-07 계획 수립을 현황판에 기록.

## 실행 명령과 결과 기록

기존 명령은 저장소 root에서 실행한다.

```bash
npm run typecheck --workspace @games/chicken-farm
npm run chicken:economy:measure --workspace @games/chicken-farm
npm run build --workspace @games/chicken-farm
```

아래 명령은 **SP-06-02에서 신설**했다. 이후 카드별로 case를 추가하며 미구현 case를 통과 처리하지 않는다.

```bash
CHICKEN_FARM_ECONOMY_CASE=baseline npm run chicken:economy:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=laying npm run chicken:economy:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=pickup npm run chicken:economy:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=transfer npm run chicken:economy:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=deposit npm run chicken:economy:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=hatch_start npm run chicken:economy:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=hatch_exit npm run chicken:economy:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=all npm run chicken:economy:check --workspace @games/chicken-farm
```

각 ID 결과에 상태, 변경 파일/심볼, assertion의 기대/실제값, 명령·종료 코드·artifact, 남은 결함과 담당 ID, 다음 ID를 기록한다. 이 계획과 current context/backlog의 현재 상태를 함께 갱신한다. 실행 결과가 없으면 대기를 유지한다.

## Terra medium 실행 요청

```text
닭농장 SP-06-10을 Terra medium으로 진행해.
docs/chicken_farm/chicken_farm_current_context.md와
docs/chicken_farm/chicken_farm_sp06_task_plan.md의 해당 카드부터 읽어.
이번 요청에서는 SP-06-10만 수행하고, complete market 도착 판매와 공용 wallet 전이를
구현·검증해.
normal 명령 증거와 특수 실패 fixture를 분리하고 결과·남은 결함·다음 ID를 기록해.
```

다음 요청은 ID와 해당 카드 목표만 바꾼다. Terra medium 선택은 실행 환경에서 사용자가 설정하며 이 문서가 모델을 전환하거나 구현을 자동 실행하지 않는다.
