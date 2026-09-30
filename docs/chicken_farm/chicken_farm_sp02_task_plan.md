# SP-02 플레이 검증 경로 확보 — 세부 실행 계획

> 전략: **계획·범위 조정은 Astra light → ID별 실행·검증은 Terra medium**. 요청한 운영 설정이며 실제 모델 전환이나 사용량을 자동 확인했다는 뜻은 아니다.

## 목표와 현재 actual

후속 SP를 같은 명령과 브라우저 경로로 실행하고, 실패를 재현할 수 있는 검증 환경을 만든다. 게임 기능 완성과 SP-02 환경 확보는 별도로 판정한다.

| 항목 | 현재 정적 확인 | SP-02 완료 조건 |
| --- | --- | --- |
| 개별 빌드 | chicken-farm `build`는 `vite build`다. 이전 빌드 통과 기록은 타입 검사 통과를 의미하지 않는다. | 현재 소스의 개별 build와 별도 `tsc --noEmit` 통과 |
| 실행 경로 | Vite base는 `/game-assets/chicken-farm/`, publicDir는 `assets`다. | localhost 개발·production preview 주소에서 필수 asset과 초기 scene 로드 |
| 전체 빌드 | `build-games.mjs`는 여러 게임을 빌드하며 public 산출물 폴더를 지우고 재생성한다. 이전 apex-seoul 오류는 현재 재확인 전이다. | 개별 검증과 전체 배포 경로의 상태를 구분; 다른 게임 오류를 chicken-farm 오류로 기록하지 않음 |
| 브라우저 측정 | `measure-chicken-farm-browser-perf.ts`는 Chromium, 4174 포트, `window.__chickenFarmDebug`와 경제 fixture를 사용한다. | 기본 시작 smoke와 fixture 측정을 구분하고 오류·실패를 보고 |
| 순수 측정 | economy, wolfai, pathing, perf 명령이 있고 기존 metrics JSON을 갱신한다. | 현재 소스로 실행한 각 명령·check 결과·출력 경로를 확인 |

**현재 상태: SP-02 완료.** 개별 Vite build·TypeScript 검사, dev/preview 초기 scene 부팅, 기본 flag의 정상 시작 smoke, 순수 측정 4종과 browser fixture 측정을 확인했다.

## 실행 규칙

- 한 요청에 ID 하나만 수행한다. 해당 카드의 지정 파일·심볼부터 읽고, 실패가 가리키는 파일만 추가 조회한다. W3X 재추출·거대 기획 문서 전체 읽기는 필요 없다.
- 경로는 저장소 루트 기준이다. 기존 변경을 보존하며 runtime 수정은 해당 검증을 막는 재현된 오류에 한정한다. 난이도 수치·전투 활성화·승패·게임 재시작 구현은 후속 SP 범위다.
- 오류가 여러 독립 시스템에 걸치면 파일/심볼/재현 명령별 하위 ID를 추가해 미완료로 인계한다. 타입 억제, 검사 옵션 완화, assertion 삭제, 정상 자원 증가로 통과시키지 않는다.
- 실행 결과는 마지막 현황 표를 갱신한다. 긴 대화 이력 대신 명령·종료 코드·실패 check·근거 경로·다음 ID만 남긴다. 이전 결과는 현재 실행 증거로 승계하지 않는다.
- 측정 script가 덮어쓰는 artifact를 먼저 확인한다. 원본 추출물을 재생성하지 않고 해당 실행의 metrics만 갱신한다. 본인이 띄운 서버·브라우저만 종료한다.
- 환경 차단과 기능 실패를 구분한다. 명령 종료 코드 0이어도 JSON의 필수 check가 false이면 통과가 아니다. 한도·소요 시간은 관측된 값만 기록한다.

## 세부 task

### SP-02-01 — 실행 경로와 오류 기준선

- 선행: 없음. 상태: **완료 — 기준선 기록.** SP-02 전체 통과를 뜻하지 않는다.
- 먼저 읽기: 루트/게임 `package.json`, `games/chicken-farm/{tsconfig.json,vite.config.ts}`, `scripts/build-games.mjs`, 이 문서 actual 표.
- 작업: Node/npm·설치된 의존성 상태와 작업 트리 변경을 확인한다. `npm run build --workspace @games/chicken-farm`과 `./node_modules/.bin/tsc -p games/chicken-farm/tsconfig.json --noEmit`을 따로 실행한다. package/module 오류와 소스 타입 오류를 파일·심볼별로 분류한다. 로컬 실행과 전체 배포 경로를 기록한다.
- 변경 범위: 이 문서만. 설치·수정은 다음 카드로 인계한다. 전체 `build:games`는 개별 실행에 필수가 아니며 산출물 재생성 영향 확인 없이 실행하지 않는다.
- 완료 조건: 두 명령의 실제 종료 코드와 오류 목록, 실행 URL 구성, 다음 수정 대상이 기록됨. 오류가 있어도 기준선 조사 완료는 가능하며 SP-02 전체 통과는 아니다.

#### 결과

- 환경: Node `v25.1.0`, npm `11.11.0`, TypeScript `5.9.3`. `node_modules/.bin/tsc`가 설치되어 있다.
- 작업 트리: 기존 문서·게임 소스 변경과 SP-01/SP-02 계획 문서가 존재했다. 이번 task는 이를 보존했고 이 문서만 갱신했다.
- `npm run build --workspace @games/chicken-farm` → **종료 코드 0**. Vite `7.3.0`, 39 modules 변환. 500 kB 초과 chunk 경고가 있으나 build 실패는 아니다.
- `node_modules/.bin/tsc -p games/chicken-farm/tsconfig.json --noEmit` → **종료 코드 2**. package/module 해석 오류는 없고, 아래 현재 소스 타입 오류가 있다.

| 영역 | 오류 요약 | 다음 처리 |
| --- | --- | --- |
| balance/building | `balance.ts`: `DefenseBuildingId` record의 `campfire` 누락. `buildingProductionExit.ts`: union에서 `productionExit` 접근 불가 | SP-02-02 |
| terrain renderer | `openGameArtTerrainRenderer.ts`: unused local, nullable texture, `RenderTexture`가 `CanvasImageSource`에 부적합 | SP-02-02 |
| combat·unit control | `combatPocSystem.ts`: unused import/type와 `WolfDirectTarget` literal type. `controllableUnitSystem.ts`: readonly 좌표 대입과 optional target point | SP-02-02 |
| main scene | `main.ts`: unused import/local, null target, placement validation union narrowing | SP-02-02 |
| pose lab | `three` declaration 미확인과 implicit `any` parameter 2건 | SP-02-02 |

- 실행 경로: 개발 서버는 Vite base `/game-assets/chicken-farm/` 아래에서 제공하며, production output도 같은 base를 사용한다. 실제 dev/preview 부팅·asset 검증은 SP-02-03에서 실행한다.
- 전체 `npm run build:games`는 public game assets를 지우고 재생성하므로 이번 기준선에서는 실행하지 않았다. 따라서 apex-seoul을 포함한 전체 배포 상태는 미확인이다.

### SP-02-02 — chicken-farm 타입·빌드 차단 오류 해소

- 선행: 01. 상태: **완료 — 현재 chicken-farm 타입·build 통과.** 브라우저 실행 검증은 포함하지 않는다.
- 먼저 읽기: 01 오류 목록, 오류 위치의 선언/호출부, 관련 package/tsconfig만.
- 작업: 실제 발생한 chicken-farm 타입·의존성 오류를 최소 수정한다. 반복 실행할 `typecheck` script가 없으면 게임 package에 기존 tsconfig를 사용하는 명령을 추가한다. Vite build와 타입 검사를 각각 재검증한다.
- 변경 범위: 게임 package와 오류 관련 소스; 의존성 변경이 필요할 때만 해당 package/lockfile. 다른 게임의 일반 정비는 제외한다.
- 완료 조건: chicken-farm 타입 검사·build 모두 통과하고 남은 외부 blocker가 구분됨. 오류가 없으면 불필요한 소스 변경 없이 통과 기록.

#### 결과

- `games/chicken-farm/package.json`에 `typecheck: tsc -p tsconfig.json --noEmit`을 추가했다. `npm run typecheck --workspace @games/chicken-farm` → **종료 코드 0**.
- `npm run build --workspace @games/chicken-farm` → **종료 코드 0**. Vite의 500 kB 초과 chunk 경고는 계속 있지만 실패가 아니다.
- 로컬 설치 상태에 없던 선언 패키지를 `npm install`로 복구했고 `npm ls @types/three --depth=0`에서 `@types/three@0.185.1`을 확인했다. package/lockfile 선언 변경은 발생하지 않았다.
- 수정한 타입 경계: `campfire`를 support building으로 분리, template union을 `BuildingTemplateConfig`로 확장, canvas source의 null/DOM image 확인, wolf target의 반환 union 명시, mutable collision position, optional command target guard, start-item placement의 validation narrowing을 적용했다. 불필요 import·unused helper도 제거했다.
- package/module blocker는 없다. 전체 `build:games`와 다른 게임 오류 상태는 이번 ID 범위 밖이며 미확인이다.

### SP-02-03 — 개발·preview 부팅과 asset 경로

- 선행: 02. 상태: **완료 — dev/preview 초기 scene과 필수 asset 확인.** 정상 플레이 동작은 다음 smoke 범위다.
- 먼저 읽기: Vite 설정, `main.ts`의 preload/create와 `exposeDebugAutomation`, browser-perf의 `startDevServer`/`waitForHttp`.
- 작업: 로컬 개발 서버와 production preview를 순차 실행한다. 예: `npm run dev --workspace @games/chicken-farm -- --host 127.0.0.1 --port 4174 --strictPort`, preview는 같은 옵션으로 `npm run preview`를 사용한다. 두 경로의 `/game-assets/chicken-farm/`에서 canvas·타일맵·WPM·필수 texture·초기 scene을 확인한다. console/pageerror/실패 요청을 수집하고 필요한 경로 오류만 수정한다.
- 변경 범위: 실행 설정·asset 참조·로더의 재현된 부팅 오류, 이 문서. Chromium 설치가 필요하면 설치 상태와 실제 오류부터 확인한다.
- 완료 조건: 두 경로가 빈 화면 없이 부팅되고 필수 asset 실패와 미처리 pageerror가 없음. 주소·검증 도구·근거 캡처 경로·서버 정리를 기록.

#### 결과

- 개발: `npm run dev --workspace @games/chicken-farm -- --host 127.0.0.1 --port 4174 --strictPort`가 `http://127.0.0.1:4174/game-assets/chicken-farm/`에서 기동했다. Playwright Chromium으로 canvas `960×720` 1개, `window.__chickenFarmDebug`, 초기 farmer `p3-farmer`, normal wallet `1500 gold / 0 lumber`를 확인했다.
- preview: sandbox 내 bind는 `listen EPERM`으로 종료 코드 `1`이었지만, 같은 명령을 로컬 preview 권한으로 실행하면 같은 URL에서 기동했다. production preview도 canvas·debug state·초기 scene을 확인한 뒤 서버를 종료했다. 이는 sandbox bind 제한이며 Vite asset/scene 실패가 아니다.
- 두 경로에서 `tilemap_packed.png`, `dirt.png`, `forest.png`, `chicken_farm_poc_01.json`, `wpm_pathing_grid.json`을 성공적으로 요청했다. 4xx 응답·실패 request·unhandled pageerror는 모두 `0`건이다.
- headless Chromium console에는 `ReadPixels` GPU stall 경고가 4건 있었다. WebGL driver 성능 경고이며 game console error 또는 pageerror는 아니었다. 프레임 성능 판정은 SP-02-06에서 별도로 한다.
- Chromium은 sandbox의 macOS Mach port 제한으로 시작할 수 없어 로컬 브라우저 실행 권한으로 검사했다. 개발·preview 서버는 각각 검사 뒤 Ctrl-C로 정리했다. 별도 캡처 artifact는 만들지 않았다.

### SP-02-04 — 정상 시작 최소 browser smoke

- 선행: 03. 상태: **완료 — 기본 flag의 실제 입력 smoke 통과.** 게임 내 restart 검증은 포함하지 않는다.
- 먼저 읽기: `main.ts#createEconomyPoc`/`exposeDebugAutomation`, `config.ts`, 기존 browser-perf의 `runBrowserScenario`와 상태 수집 부분, SP-01의 actual 표.
- 작업: 기존 Playwright 구성을 재사용해 기본 flag 상태의 별도 smoke를 만든다. scene 준비, 농부/개 표시, 현재 normal wallet과 시작 inventory, 선택·열린 인접 지점 이동·HUD 표시를 확인한다. 실제 클릭/키보드 입력을 포함하고 debug API는 상태 관찰에 사용한다. fixture 생성이나 자원 지급은 이 smoke에 넣지 않는다.
- 변경 범위: smoke script·실행 script 등록, 필요한 최소 read-only 상태 노출. 게임 기능 결함은 SP-03/04/14로 인계하고 미통과 항목을 숨기지 않는다.
- 완료 조건: 재실행 명령, 필수 assertion, 실패 시 nonzero 종료와 오류 근거가 있음. 별도 새 page/새 load로 2회 확인하되 이를 게임 내 restart 검증으로 표기하지 않음.

#### 결과

- `scripts/smoke-chicken-farm-start.ts`와 루트 `chicken:smoke` 명령을 추가했다. 기존 browser-perf의 서버 준비·Playwright 오류 수집 방식을 따르되, fixture 생성·자원 지급 없이 기본 flag로만 실행한다. 필요한 debug API 추가는 농부 inventory와 HUD 텍스트/슬롯 수를 읽는 read-only 상태다.
- `npm run chicken:smoke` → **종료 코드 0**. sandbox는 `tsx` 임시 IPC socket에 `listen EPERM`을 반환했으나, 로컬 권한 환경에서 같은 명령이 성공했다. 이는 sandbox IPC 제한이며 game smoke 실패가 아니다.
- 새 browser page/새 load 2회 모두 canvas 1개, `p3-farmer`, normal wallet `1500 gold / 0 lumber`, HUD `Gold 1500  Lumber 0  Supply 0/3`, inventory `I003×5`, `I009×1`, `I00F×1`을 확인했다. 실제 canvas 클릭으로 1개 unit을 선택하고 인접 지점을 우클릭해 farmer 위치가 약 16 px 이동했으며 `S` 키 입력도 수행했다.
- 각 load에서 console error·unhandled pageerror·실패 request·4xx 이상 response는 모두 0건이었다. script는 assertion 실패 시 nonzero로 종료하며 본인이 기동한 Vite/Chromium을 `finally`에서 정리한다.
- 이 2회는 새 페이지의 정상 시작 재현이며 게임 내 재시작 기능의 검증은 아니다.

### SP-02-05 — 기존 순수 측정 4종 확인

- 선행: 02; 실행 순서는 04 다음. 상태: **완료 — 4종 현재 소스 측정 실행 및 결과 기록.** browser/Phaser draw 비용은 이 Node 측정 범위 밖이다.
- 먼저 읽기: `scripts/measure-chicken-farm-{economy,wolf-ai,terrain-pathing,runtime-perf}.ts`의 입력·main·출력·pass 판정만. 실패할 때 해당 check와 호출 함수 추가 조회.
- 작업: `npm run chicken:economy:measure`, `chicken:wolfai:measure`, `chicken:pathing:measure`, `chicken:perf:measure`를 실행한다. 실행 오류, 기능 check 실패, 성능 수치를 구분한다. 원본 스탯 전환 이후의 낡은 fixture 기대값은 원인 대조 후에만 수정한다.
- 변경 범위: 실행을 막는 측정 harness·fixture·결과 metrics. 기능 변경이 필요한 실패는 담당 SP에 구체적으로 인계한다.
- 완료 조건: 4종의 종료 코드·필수 check 결과·실제 출력 경로가 기록됨. 성능 report 생성만으로 성능 목표 통과를 주장하지 않음. 기능 실패가 남으면 완료 보류 또는 명시적 후속 blocker로 남김.

#### 결과

- `npm run chicken:economy:measure` → **종료 코드 0**. 26개 check 모두 통과했다. 결과: `docs/chicken_farm/chicken_farm_w3x_artifacts/economy_poc_metrics.json`.
- `npm run chicken:wolfai:measure` → **종료 코드 0**. state machine 6/6, Warsmash fit check 9/9 통과했다. 결과: `docs/chicken_farm/chicken_farm_w3x_artifacts/wolf_ai_state_machine_metrics.json`.
- `npm run chicken:pathing:measure` → **종료 코드 0**. `micro_a`·`micro_b` 모두 smoothed path를 찾았고 blocked waypoint 및 blocked segment hit가 각각 0이다. 결과: `docs/chicken_farm/chicken_farm_w3x_artifacts/terrain_pathing_poc_metrics.json`.
- `npm run chicken:perf:measure`은 처음에 **종료 코드 1**로, 제거된 `fenceRows` layout 계약 접근에서 `TypeError`가 발생했다. runtime perf harness를 현재 `COMBAT_POC_LAYOUT.fences` 계약으로 맞춘 뒤 재실행하여 **종료 코드 0**을 확인했다. 결과: `docs/chicken_farm/chicken_farm_w3x_artifacts/runtime_performance_debug_metrics.json`. 이 report는 Node logic 측정이며 browser Phaser Graphics 비용이나 성능 목표 통과를 뜻하지 않는다.
- economy 최초 sandbox 실행은 `tsx` 임시 IPC socket의 `listen EPERM`으로 **종료 코드 1**이었다. 로컬 권한 환경에서 같은 명령을 재실행해 위 결과를 얻었다. 이는 sandbox IPC 제한이며 economy check 실패가 아니다.

### SP-02-06 — 기존 브라우저 fixture 측정 재현

- 선행: 04/05. 상태: **완료 — debug fixture lifecycle·market sale·frame 수집 통과.** 정상 자원 경제 전체 검증은 포함하지 않는다.
- 먼저 읽기: `measure-chicken-farm-browser-perf.ts`의 fixture 시나리오·check·오류 처리·cleanup, 실패한 경우 해당 debug API만.
- 작업: `npm run chicken:browser-perf:measure`를 실행한다. fixture 생성·이동·경제 결과·프레임 report를 확인한다. check 실패가 성공 종료로 묻히면 종료 처리를 보완한다. pageerror와 필수 리소스 실패를 판정에 포함하고 실패 때에도 본인 서버/브라우저가 정리되게 한다.
- 변경 범위: 기존 브라우저 harness와 해당 metrics, 재현된 debug API 연결 오류.
- 완료 조건: 정상 시작 smoke와 구분된 fixture 결과, 각 check 결과, 프레임 수집 성공, cleanup 증거가 있음. fixture 판매 성공을 정상 자원 경제 전체 검증으로 승계하지 않음.

#### 결과

- fixture 측정 전용 Vite server는 `VITE_CHICKEN_FARM_DEBUG_ECONOMY=true`를 전달한다. 기본값은 여전히 `false`이며 SP-02-04의 normal 시작 자원에는 영향을 주지 않는다. debug mode의 `10000` 시작 자원으로 fixture의 비용 차감 경로를 측정한다.
- harness는 fixture를 `completeImmediately`로 생성하되 비용은 지불하게 했고, console error·pageerror·failed request·4xx 이상 response·wallet cost·market sale을 명시적 check로 수집한다. check가 false이면 metrics를 기록한 뒤 nonzero로 종료하며, Vite/Chromium은 `finally`에서 종료를 기다린다.
- 최초 `npm run chicken:browser-perf:measure` → **종료 코드 1**: normal wallet `1500/0`에서 coop fixture 비용을 지불하지 못했다. debug mode 적용 후 coop·well·market fixture 생성과 shared wallet 비용 확인은 진행됐다.
- market smart-command는 footprint 중심 대신 건물 네 면의 16 px 바깥 후보 중 terrain·동적 blocker를 통과하는 가장 가까운 접근점을 선택한다. 4×4 cell market에서 이 점은 중심과 80 px 떨어져 판매 interaction 반경 94 px 안에 있다. 후보가 없으면 주문을 거절하고 reason을 기록한다.
- 최종 `npm run chicken:browser-perf:measure` → **종료 코드 0**. 9개 scenario frame snapshot을 생성했다. `shared_wallet_cost`, `market_sale`, `console_errors`, `page_errors`, `failed_requests`, `http_error_responses` 6개 check가 모두 true다. 결과: `docs/chicken_farm/chicken_farm_w3x_artifacts/browser_performance_debug_metrics.json`.
- fixture wallet은 `10000/10000`에서 coop·well·market 비용 후 `9832/9948`이 됐고, egg stack 3개 판매 후 gold `9868`, lumber `9948`, farmer egg `0`을 확인했다. frame summary는 평균 `43.76 ms`, 최대 `90.04 ms`이며 목표 통과 판정은 아니다.
- `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`, `npm run chicken:smoke`은 각각 **종료 코드 0**이다. normal smoke는 새 page/load 2회에서 `1500/0`과 실제 선택·이동을 다시 확인했다. build의 500 kB 초과 chunk 경고는 남아 있다.

### SP-02-07 — 검증 명령 정리와 SP-03 인계

- 선행: 01~06. 상태: **완료 — 재현 절차 정리와 SP-03 인계.**
- 먼저 읽기: 이 문서 최신 현황 표, 변경된 실행 script, Current Context와 backlog의 SP-02/03 행.
- 작업: 타입 검사→개별 build→기본 smoke→필요한 측정의 재현 절차를 짧게 정리한다. 앞선 증거를 검토하고 마지막 변경의 영향을 받은 검사만 재실행한다. 실패를 인계했다는 이유로 전체 완료 처리하지 않는다.
- 변경 범위: 이 문서, Current Context, backlog, README 링크/실행 안내.
- 완료 조건: 개별 build·타입·두 부팅 경로·기본 smoke·측정 5종의 필수 check가 통과하고 미해결 검증 blocker가 없음. 전체 사이트 빌드의 별도 오류는 영향 범위를 명시한다. 충족 시 SP-02 완료, 다음 SP-03; 아니면 미완료 ID를 다음 작업으로 둔다.

#### 결과

- 재현 순서: `npm run typecheck --workspace @games/chicken-farm` → `npm run build --workspace @games/chicken-farm` → `npm run chicken:smoke` → `npm run chicken:economy:measure`·`chicken:wolfai:measure`·`chicken:pathing:measure`·`chicken:perf:measure` → `npm run chicken:browser-perf:measure`.
- 마지막 market 접근 변경 뒤 영향을 받는 typecheck·개별 build·normal smoke·browser fixture를 재실행했고 모두 **종료 코드 0**이다. normal smoke는 새 page/load 2회에서 `1500 gold / 0 lumber`와 선택·이동을 확인했다. browser fixture는 9개 frame snapshot과 wallet/market sale/error request 6개 check를 통과했다.
- production preview는 현재 build에서 `http://127.0.0.1:4174/game-assets/chicken-farm/`으로 다시 확인했다. canvas 1개, `p3-farmer`, normal wallet `1500/0`, pageerror·실패 request 0건을 확인한 뒤 서버를 종료했다. sandbox preview bind는 `EPERM`이므로 로컬 권한 환경에서 실행했다.
- 순수 측정 4종은 market 접근 변경과 독립적이어서 SP-02-05의 현재 소스 종료 코드 0과 필수 check 결과를 승계했다. economy 26/26, wolf AI 6/6 및 fit 9/9, terrain pathing 2 probe의 blocked waypoint/segment hit 0, runtime perf metrics 생성이 근거다.
- Vite build에는 500 kB 초과 chunk 경고가 남아 있으나 실패 check가 아니다. 전체 사이트 `npm run build`와 다른 게임의 상태는 이번 SP 범위 밖이며 미확인이다.

## 실행 현황 — 최신 값으로 갱신

| ID | 상태 | 실제 명령·종료 코드·근거 | 남은 blocker / 다음 ID |
| --- | --- | --- | --- |
| SP-02-01 | 완료 | build 종료 0; `tsc --noEmit` 종료 2. 타입 오류 5개 영역, package/module 오류 없음 | SP-02-02 |
| SP-02-02 | 완료 | `npm run typecheck --workspace @games/chicken-farm` 종료 0; `npm run build --workspace @games/chicken-farm` 종료 0 | SP-02-03 |
| SP-02-03 | 완료 | dev/preview 부팅·Playwright 확인. 필수 asset 성공, 4xx/실패 request/pageerror 0건; headless WebGL 경고 4건 | SP-02-04 |
| SP-02-04 | 완료 | `npm run chicken:smoke` 종료 0 (로컬 권한 환경). 새 page/load 2회에서 normal 시작 상태·HUD·inventory·클릭 선택·우클릭 이동 통과, console/pageerror/실패 request/4xx 0건 | SP-02-05 |
| SP-02-05 | 완료 | economy·wolfai·pathing·perf 최종 실행 모두 종료 0. economy 26/26, wolf AI 6/6 및 fit 9/9 통과; pathing 2 probe의 smoothed blocked waypoint/segment hit 0. perf harness의 낡은 layout 필드 오류를 수정 후 metrics 재생성 | SP-02-06 |
| SP-02-06 | 완료 | browser fixture 종료 0. 9개 frame snapshot, wallet cost·market sale·console/pageerror/failed request/4xx 6개 check 통과; normal smoke도 재통과 | SP-02-07 |
| SP-02-07 | 완료 | 현재 build의 preview 재확인, 마지막 변경 영향 검사 종료 0, 순수 측정 4종의 current-source check 승계 | SP-03 |

## 실행 요청문

```text
닭농장 SP-02-01을 Terra medium으로 진행해.
docs/chicken_farm/chicken_farm_sp02_task_plan.md의 해당 ID만 수행해.
지정 파일의 관련 절/심볼부터 읽고 허용된 범위만 변경해.
기존 변경을 보존하고, 결과는 같은 문서의 최신 현황 표에 갱신해.
실행 명령·종료 코드·실패 check와 미확인을 구분하고 임의로 완료 처리하지 마.
완료 조건 확인 후 변경 파일·검증 결과·다음 ID를 보고해.
```
