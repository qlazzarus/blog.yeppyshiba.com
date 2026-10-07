# SP-06.5 — W3X 럼버 밀 30초 수입 복원

> 작성: 2026-10-07. **계획 작성 완료 / 구현·검증 미착수**. Terra medium에서 한 요청에 한 ID를 순서대로 실행한다. SP-06-05(우물·산란)와 다른 bridge 작업이며 SP-06 완료 → SP-06.5 → SP-07 순서다.

## 목표와 범위

럼버 밀 수입을 닭·알 생산과 **병행**한다. 복원하는 원본 경제 값은 아래 세 건물의 **30초 목재 수입 70/110/170만**이다. 닭 산란·알 수집·부화·시장 판매, 기존 `100 gold → 70 lumber` 교환, 시작 자원, 비용·HP·건설 시간·인구·다른 수입 값은 변경하지 않는다.

| W3X rawcode | runtime template ID | 완성 건물 1개당 30초 수입 |
| --- | --- | ---: |
| h00A | lumber_mill | 70 lumber |
| h00J | lumber_mill_mid | 110 lumber |
| h00W | lumber_mill_high | 170 lumber |

**build card 추가/노출, 선행조건(`requires`) 강제, 업그레이드 UI·실행 흐름은 모두 SP-09 범위로 유지한다.** 이번에는 기존 건물 lifecycle과 owner wallet에 수입을 연결한다. 상위 두 tier는 분리된 fixture로 검증할 수 있지만 정상 플레이에서 건설·업그레이드 접근까지 완료했다고 기록하지 않는다. 실제 적 피해는 SP-07, hidden/pause 정책 전면 변경은 SP-13이다.

## 정적 근거와 구현 주의

- 원본: `chicken_farm_w3x_artifacts/jass_economy_events.tsv`의 JASS 9358–9360, `jass_rawcodes.tsv`, `web_mvp_balance_reference.json`의 원본 incomeBuildings. 원본은 owner별 living unit 수에 수입을 곱한다. 완료 상태만 지급하는 웹 계약과 원본 timer 등록·첫 tick 근거는 01에서 구분한다.
- 현재 `buildingTemplates.ts`에는 위 세 template이 있다. `buildingEconomyAdapter.ts`에는 닭장·우물 연결만 있고 럼버 밀 연결은 없다.
- `balance.ts#incomeBuildings.coop_*`와 참조 JSON에는 과거 럼버 밀→알 생산 변환 흔적이 있다. 이를 근거로 닭장에 목재를 지급하지 않는다. 기존 참조/산출물을 일괄 재생성하거나 닭·알 값을 삭제하지 않고, 별도 canonical lumber income 설정과 정확한 template 매핑을 둔다.
- scene·건설·경제가 공유하는 기존 wallet을 재사용한다. 별도 지갑이나 setInterval을 만들지 않는다. 지급 기준은 simulation 시간이며 wall-clock 경과를 별도로 더하지 않는다.

## 실행 순서

| ID | 작업 | 선행 | 상태 |
| --- | --- | --- | --- |
| SP-06.5-01 | 원본·template·tick 계약 확정 | SP-06 | 대기 |
| SP-06.5-02 | 수입 설정·순수 지급 로직 | 01 | 대기 |
| SP-06.5-03 | 완공·제거·owner wallet 연결 | 02 | 대기 |
| SP-06.5-04 | restart 정리·수입 snapshot | 03 | 대기 |
| SP-06.5-05 | 럼버 밀 browser 사례 추가 | 04 | 대기 |
| SP-06.5-06 | 필수 회귀·결과 기록·SP-07 인계 | 05 | 대기 |

의존성은 순차 실행을 뜻한다. 한 ID가 커지면 `-A/-B`로 나누고 남은 범위를 기록한다. task 수를 시간·모델 사용량 보장으로 해석하지 않는다.

## 세부 작업 카드

### SP-06.5-01 — 원본·template·tick 계약 확정

- 읽기: 위 원본 artifact, `buildingTemplates.ts`, `balance.ts`, `economyTypes.ts`, `economySystem.ts`, `buildingEconomyAdapter.ts`, `main.ts`의 simulation update·완공/제거·restart와 wallet 연결 함수.
- 작업: rawcode→template→수입 표와 wallet 소유권을 확정한다. 원본 timer 등록 근거를 추적하고 전역 30초 tick인지 건물별 완공 후 30초인지 명시한다. 근거가 없으면 원본과 일치한다고 주장하지 않고 **run 시작 기준 전역 simulation 30초 tick**을 웹 계약으로 채택한다.
- 경계 계약: 30초 직전/정각/직후 완공·제거의 처리 순서, 큰 delta의 여러 tick 처리, 중복 update, 시간 역행·새 run 초기화, 미등록 owner 거부를 표로 고정한다. 늦게 완공된 건물에 완공 전 tick을 소급 지급하지 않는다. 같은 시각 반복 갱신은 지급 0회다.
- 완료 조건: 닭장/닭 수와 무관한 owner별 `70×basic + 110×mid + 170×high` 수입 장부, 첫 지급 시각, lifecycle 적용 순서가 명확하다. 이후 카드가 새 정책을 추측할 필요가 없다.
- 검증/산출물: 이 문서에 계약·근거·함수 위치 기록, `git diff --check`. 정적 확인만으로 runtime 통과를 표기하지 않는다.

### SP-06.5-02 — 수입 설정·순수 지급 로직

- 읽기/수정 후보: `balance.ts`, `economyTypes.ts`, `economySystem.ts`, `playerWallet.ts`, `scripts/measure-chicken-farm-economy.ts`.
- 작업: 세 수입 값과 30초 주기를 canonical 설정 하나에 둔다. ID·owner·tier·지급 대상 기간을 보존하는 최소 상태와 순수 update를 구현한다. 기존 닭·알 update와 함께 실행하며 incomeBuildings의 과거 coop 변환 값을 지급 근거로 사용하지 않는다.
- 완료 조건: 각 tier 1개는 한 tick에 `70/110/170`, 같은 owner 세 tier 합은 `350`, basic 2개는 `140`. 여러 owner는 분리 지급한다. 29.999초/30초/동일 시각 재호출/60초 및 큰 delta는 01 계약대로 계산된다. 미완공·제거·잘못된 template/owner는 수입 0이며 gold·supply·알·닭은 수입 함수 때문에 변하지 않는다.
- 검증: typecheck + `chicken:economy:measure`. 기존 산란·부화·판매 assertion을 유지하고 새 수입 assertion을 추가한다. 완료 시 실제 명령·종료 코드·결과를 기록한다.

### SP-06.5-03 — 완공·제거·owner wallet 연결

- 읽기/수정 후보: `buildingEconomyAdapter.ts`, `buildingSystem.ts`, `constructionPlacementSystem.ts`, `main.ts`의 완료/제거 callback, 02의 수입 함수.
- 작업: 완성된 lumber template만 동일 building ID·owner로 등록하고 simulation update에서 공유 wallet에 한 번 지급한다. pending/이동/건설 중/Stop/취소에는 등록하지 않는다. 제거는 수입 등록도 즉시 정리하며 중복 attach/detach가 누적 수입을 만들지 않게 한다.
- 완료 조건: 같은 ID 재등록은 중복 없음, 미완공 수입 0, 완공 경계는 01 계약 준수, 제거 후 tick 수입 0. 타 owner 건물이 로컬 wallet을 늘리지 않는다. coop 등록은 여전히 알 보관·부화만 담당한다. 제거 시 기존 inventory·hatch·footprint 정리를 깨지 않는다.
- 검증: typecheck + economy 순수 측정 + construction `completion`/`removal` 사례. 순수 adapter 검증에도 실제 complete 상태·중복 등록·다른 owner를 포함한다.

### SP-06.5-04 — restart 정리·수입 snapshot

- 읽기/수정 후보: `main.ts`의 run 초기화/shutdown/restart, `economyTypes.ts`와 수입 상태, `getEconomyLifecycleSnapshot`.
- 작업: 새 run에서 럼버 밀 등록·tick 시각·수입 누계를 재설정한다. 기존 읽기 전용 snapshot에 ID/owner/tier·지급 시각·owner별 수입 누계를 최소 추가한다. 테스트용 값은 제품 HUD에 노출하지 않는다.
- 완료 조건: 수입 발생 후 same-page restart 두 번에서도 이전 ID/예약/tick/누계가 남지 않고 normal 시작 wallet이 복원된다. 첫 tick은 새 run 기준이다. snapshot 반복 호출은 지급·상태 변경 0. 다른 owner wallet을 관찰하려면 fixture 전용 관찰 범위를 명시한다.
- 검증: typecheck + 순수 restart assertion + construction `restart`. 실제 수입 오염 뒤 browser restart 증거는 05에서 완료한다.

### SP-06.5-05 — 럼버 밀 browser 사례 추가

- 읽기/수정 후보: `scripts/check-chicken-farm-economy.ts`, 기존 construction fixture/debug API, 04 snapshot.
- 작업: 새 `CHICKEN_FARM_ECONOMY_CASE=lumber_income`을 구현하고 `all`에도 포함한다. **현재는 지원하지 않는 값**이며 이 카드에서 추가한 뒤 실행한다. fixture는 normal full_loop와 별도 세션으로 실행하고 실제 입력·debug 생성·시간 가속 여부를 artifact에 구분한다.
- 완료 조건: 세 tier/복수 건물/복수 owner, 미완공→완공, 중복 callback, 지급 직전·직후 제거, 동일 시각 update, 수입 발생 뒤 same-page restart를 검증한다. 럼버 밀과 살아 있는 닭을 같은 simulation에 두어 목재 지급과 산란이 모두 지속됨을 확인한다. fixture에서 등록만 직접 호출한 결과를 건설 완료 callback 통과로 대신하지 않는다.
- 검증: typecheck + 신설 `lumber_income` browser 사례. `economy_check_lumber_income.json`에 run/profile·입력·expected/actual/pass·wallet 장부·console/page/request/HTTP 오류를 기록한다. 미지원 fixture capability는 이 범위 안에서 최소 확장하며 build card는 추가하지 않는다.

### SP-06.5-06 — 필수 회귀·결과 기록·SP-07 인계

- 작업: 아래 명령을 **구현 후 모두 재실행**한다. SP-06의 과거 artifact를 이번 변경의 통과 근거로 재사용하지 않는다. 실패 원인을 수정한 뒤 영향을 받는 검사를 다시 수행한다.
- 완료 조건: 모든 명령 종료 코드 0, assertion 전부 통과, browser 오류 목록 비어 있음. normal P3 `full_loop`은 fixture·debug 지급 없이 닭·알 루프와 시장 교환을 유지한다. `all`은 새 lumber_income을 실제 포함한다. construction에는 `all` selector가 없으므로 baseline과 아래 lifecycle 사례를 각각 실행한다.

```bash
npm run typecheck --workspace @games/chicken-farm
npm run build --workspace @games/chicken-farm
npm run chicken:economy:measure --workspace @games/chicken-farm
npm run chicken:construction:check --workspace @games/chicken-farm
CHICKEN_FARM_CONSTRUCTION_CASE=completion npm run chicken:construction:check --workspace @games/chicken-farm
CHICKEN_FARM_CONSTRUCTION_CASE=removal npm run chicken:construction:check --workspace @games/chicken-farm
CHICKEN_FARM_CONSTRUCTION_CASE=restart npm run chicken:construction:check --workspace @games/chicken-farm
CHICKEN_FARM_CONSTRUCTION_CASE=integration npm run chicken:construction:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=full_loop npm run chicken:economy:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=all npm run chicken:economy:check --workspace @games/chicken-farm
git diff --check
```

- `full_loop`은 기존 90초 이상 실행 가능한 local runner를 사용한다. timeout/환경 차단은 미통과로 남기며 전체 완료 처리하지 않는다.
- 결과: 이 문서에 변경 파일·명령·종료 코드·artifact·남은 한계를 기록하고 README/current context/backlog/W3X 비교를 동기화한다. SP-09에 build card·선행조건 강제·업그레이드 UI, SP-07에 실제 파괴 연결 회귀를 인계한다. 전체 원본 경제 이식이나 럼버 밀 정상 성장 UI 완료로 확대 해석하지 않는다.

## 실행 요청 템플릿

> SP-06.5-01을 Terra medium으로 진행해줘. 이 계획의 해당 ID만 구현/검증하고, 결과와 다음 ID를 기록해줘. 닭·알 생산과 럼버 밀 수입은 병행하고 build card·선행조건 강제·업그레이드 UI는 SP-09에 유지해줘.

현재 다음 ID: **SP-06.5-01**. 이번 문서 작성에서는 runtime 코드 수정·측정·browser 검사를 수행하지 않았다.
