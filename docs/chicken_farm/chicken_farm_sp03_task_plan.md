# SP-03 정상 시작 상태 구성 — 세부 실행 계획

> 갱신: 2026-09-30. Terra medium에서 **한 요청에 한 ID**를 실행하기 위한 계획이다. 이번 변경은 소스 정적 확인과 작업 분해이며 모델 전환·기능 구현·새 runtime 검증을 수행한 결과가 아니다. 닭농장 검증 명령은 `npm run chicken:<name> --workspace @games/chicken-farm`으로 실행한다.

## 진행사항과 근거

SP-03 전용 구현은 아직 착수 전이다. 기존 구현을 재사용하고 아래 차이를 해소한다. SP-02의 통과 기록은 이전 검증 증거이며 이번에 재실행한 것으로 취급하지 않는다.

| 영역 | 확인된 현재 상태 | 남은 일 |
| --- | --- | --- |
| normal/debug 자원 | `main.ts#createEconomyPoc`에서 normal 1500/0/cap 3/used 0, 명시적 환경 flag에서 10000. 기본 normal smoke 통과 기록 있음 | 시작 옵션을 한곳에서 해석하고 wallet·소유자·난이도에 동일 적용 |
| 유닛·아이템 | `createForStart`가 farmer/dog를 start.id별 upsert. 농부에 I003×5, I009×1, I00F×1 지급 | 선택 start와 지급을 새 run 초기화 경로에 통합, 재호출 중복 방지 |
| 시작 위치 | 기본 P3 또는 `VITE_CHICKEN_FARM_START_ID`의 새 run 옵션. 플레이 중 숫자키 전환 없음 | future random mode는 선택된 start ID를 run 시작 전에 기록한 뒤 같은 초기화 경로로 전달 |
| PoC 분리 | combat/combatSmoke는 off. `terrainPathingDebug`는 true이며 별도 probe agent를 생성 | 정상 판에서 probe/fixture 자동 생성 차단, 명시 debug 측정 유지 |
| 중립·중앙 배치 | `tilemapObjectRenderer.ts`의 marker와 원본 위치 artifact 존재 | marker와 별개인 실제 entity의 ID·위치·소유자·생성/제거 수명 확보 |
| 초기화 | 종료/새 run lifecycle 없음. 기존 smoke는 새 page/load 2회 | 같은 page에서 현재 시스템 상태를 정리하고 초기 상태로 돌아가는 경로 검증 |

## 범위와 실행 원칙

- 목표 값은 [SP-01](./chicken_farm_sp01_task_plan.md)의 확정 계약을 따른다. 기본 P3/normal을 유지하고, 다른 시작점과 easy도 동일 초기화 경로에서 검증 가능하게 한다. 시작 선택의 최소 입력 경로만 마련하며 메뉴 디자인·8단계 난이도 UI/저장은 SP-15에 남긴다.
- SP-03은 실제 초기 entity와 재사용 가능한 새 run 초기화 기반까지 담당한다. 중립 공격·피해/사망은 SP-07, 늑대 생성/보충은 SP-08, NPC 거래/이벤트는 SP-12, 부활·승패·결과 화면에서 재시작 호출은 SP-11이다. marker만 그려 놓고 gameplay entity 완료로 기록하지 않는다.
- 경로는 저장소 루트 기준. 아래 `game/`은 `games/chicken-farm/src/game/`, artifact는 `docs/chicken_farm/chicken_farm_w3x_artifacts/`다. 지정 심볼부터 읽고 관련 호출부만 확장한다. 대형 기획 전체 읽기·W3X 재추출은 기본 작업에 넣지 않는다.
- 한 ID는 하나의 책임을 완결한다. 보통 runtime 파일 1~3개와 해당 검증만 수정한다. 소유자 전파나 cleanup이 여러 시스템에 걸리면 먼저 파일별 `해당 ID-a/b`로 재분해하고 다음 ID를 함께 구현하지 않는다. 파일 수 제한을 맞추려고 불완전한 변경을 남기지는 않는다.
- 기존 wallet·inventory·좌표 변환·시스템을 재사용한다. `main.ts` 전체 재작성, 새 범용 ECS, balance 재설계, 전투 flag 일괄 활성화는 범위 밖이다.
- 소스 변경 후 타입 검사, 브라우저 연결 변경 후 기본 smoke를 실행한다. build는 초기 통합/최종 및 설정 변경 때, 측정은 영향 영역만 실행한다. 최종 결과에 명령·종료 코드·assertion·근거 경로를 남긴다. 환경 실패와 기능 실패를 구분하고 필수 실패가 남으면 완료하지 않는다.
- task 종료마다 아래 현황 표를 갱신한다. 모델/한도·시간 비용은 실제 관측 없이 추정 수치를 쓰지 않는다.

## 세부 task

### SP-03-01 — 시작 옵션과 소유자 계약 고정

- 선행: SP-01 규칙, SP-02 완료.
- 먼저 읽기: `game/config.ts`, `game/balance.ts#getStartingGold`, `main.ts#createEconomyPoc/getSharedPlayerEconomy/handlePlayerStartChanged`, `playerControlSystem.ts#createAtConfiguredStart`, `controllableUnitSystem.ts#createForStart`.
- 작업: startId·ownerPlayerId·difficulty·normal/debug 옵션의 단일 계약과 resolver를 만든다. 기본 P3/normal, easy 1700, normal 1500, debug 10000 우선순위를 고정한다. 위치 ID와 소유자를 함께 바꿀지 분리할지 기존 owner 소비처를 대조해 한 가지로 결정하고 표로 남긴다. 잘못된 start/옵션은 명시적으로 거절하거나 기록된 기본값으로 처리한다.
- 변경 범위: 작은 시작 설정 모듈(신규 가능), 필요한 타입, 이 문서의 결정 기록. runtime 연결은 02.
- 완료/검증: 기본·easy·debug·유효/무효 시작 옵션을 순수 검사로 확인. 후속 카드가 소유자 정책을 다시 추측하지 않도록 입력/출력과 대상 호출부 기록.

#### 결과

- `game/startSessionConfig.ts`에 `resolveStartSession()`을 추가했다. 입력은 `startId`, 8단계 `difficulty`, `debugEconomy`이고, 출력은 시작 위치·소유자·gold/lumber/supply의 불변 snapshot이다. `startId`가 양의 정수가 아니거나 difficulty가 8단계 목록 밖이면 `RangeError`로 거절한다.
- 자원 우선순위는 `debugEconomy=true`의 `10000 gold / 10000 lumber / supply cap 10000`이 난이도 보정보다 높다. 그 외에는 normal `1500/0/3`, easy `1700/0/3`이며 supply used는 항상 `0`이다.

| 값 | 정책 | 현재 소비처 | SP-03-02 연결 |
| --- | --- | --- | --- |
| `startId` | 기본 P3, 유효한 양의 정수만 허용 | `PlayerControlSystem#createAtConfiguredStart`, `ControllableUnitSystem#createForStart` | 선택한 시작 좌표를 unit 생성에 전달 |
| `ownerPlayerId` | 항상 P3(3). 시작 위치와 분리 | `createEconomyPoc`, `getSharedPlayerEconomy`, 건설·economy owner 경로 | wallet·unit·inventory가 같은 owner를 사용하도록 resolver 출력 연결 |
| `difficulty` | 기본 normal, 8단계만 허용 | `getStartingGold` | wallet 생성과 후속 적 생성 경로에 전달 |
| `debugEconomy` | 명시적 true에서만 10000 preset | `CHICKEN_FARM_POC_FLAGS.debugEconomy` | 환경 flag를 resolver 입력으로 전달 |

- 위치 ID와 owner를 분리한 이유는 현재 단일 wallet·건설 경로가 ID 3을 전제로 하기 때문이다. 위치를 P7로 고르더라도 owner를 P7로 바꾸지 않는다. 멀티플레이 owner 확장은 이 계약 밖이다.
- 변경: `games/chicken-farm/src/game/startSessionConfig.ts`, `games/chicken-farm/src/game/config.ts`, `scripts/check-chicken-farm-start-session.ts`, 루트 `package.json`.
- 검증: `npm run chicken:start-session:check --workspace @games/chicken-farm` → 종료 코드 0, normal/easy/debug 및 무효 start/difficulty 13개 assertion 통과. `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. 처음 sandbox 실행은 tsx IPC socket의 `listen EPERM`으로 차단됐으며, 허용된 로컬 실행에서 assertion을 완료했다.

### SP-03-02 — wallet·유닛·inventory 초기 생성 통합

- 선행: 01.
- 먼저 읽기: `main.ts#createEconomyPoc/getSharedPlayerEconomy/ensureFarmerInventories`, `controllableUnitSystem.ts#createForStart/upsertUnit`, `game/systems/playerWallet.ts` 및 owner ID 3 소비처.
- 작업: 01 옵션을 실제 생성 경로에 전달한다. 선택 시작점의 농부/개 각 1기, 같은 소유자의 단일 wallet과 농부 inventory를 생성한다. 시작 아이템은 새 run에서 한 번만 지급한다. 건설·경제가 동일 wallet 객체를 참조하게 유지한다.
- 변경 범위: 시작 초기화 호출부와 owner 전달 지점. 광범위하면 owner 전파를 02-a로 별도 분해.
- 완료/검증: P3와 다른 시작점 1곳에서 유닛 각 1기·owner/wallet 일치·I003×5/I009×1/I00F×1, 재호출 시 추가 지급 없음. typecheck와 normal smoke. supply used는 기존 계약 0 유지.

#### 결과

- `FarmScene`은 SP-03-01의 `startSession`을 한 번 해석해 `PlayerControlSystem`의 initial start, economy wallet, farmer inventory owner에 같은 값을 전달한다. normal 시작은 P3 위치와 P3 wallet을 사용한다.
- `ControllableUnitSystem#createForStart(start, ownerPlayerId)`로 위치와 owner를 분리했다. P4 위치로 전환해도 생성·갱신되는 unit ID는 `p3-farmer`와 `p3-dog`이며 P4 owner unit이나 중복 unit을 만들지 않는다.
- `createEconomyPoc()`은 economy state가 이미 있으면 반환한다. 따라서 같은 run에서 다시 호출해도 wallet·inventory를 교체하거나 I003×5/I009×1/I00F×1을 중복 지급하지 않는다. 이후 새 run은 SP-03-08의 명시적 state 정리 뒤 이 함수를 호출한다.
- read-only debug state에 unit ID/template/owner를 추가했고, test-only `ensureStartEconomyForTest()`으로 동일 run 초기화 guard를 browser smoke에서 검증했다. gameplay restart·새 run 생성은 아직 구현하지 않았다.
- 변경: `games/chicken-farm/src/main.ts`, `game/systems/playerControlSystem.ts`, `game/systems/controllableUnitSystem.ts`, `scripts/smoke-chicken-farm-start.ts`.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:smoke --workspace @games/chicken-farm` → 종료 코드 0, 새 page/load 2회에서 P3 normal 상태·P4 전환 뒤 P3 owner 유지·초기화 재호출 후 inventory 불변·선택/이동 및 console/pageerror/실패 request/4xx 0건 통과. supply used는 HUD `0/3`으로 확인.

### SP-03-03 — 시작 위치 입력과 PoC fixture 격리

- 선행: 02.
- 먼저 읽기: `playerControlSystem.ts#updateSlotHotkeys`, `main.ts#handlePlayerStartChanged/create`, `game/config.ts`, `terrainPathingPocSystem.ts#create`, browser-perf의 서버 환경 설정.
- 작업: 시작 위치 선택은 새 run 옵션으로만 적용하고, 플레이 도중 숫자키가 추가 소유자 유닛을 생성하지 않게 한다. 기본 P3와 명시적 시작점 선택 경로를 문서화한다. terrain probe·combat smoke·경제 fixture가 normal에 자동 유입되지 않게 하고 기존 debug 측정 진입점은 보존한다. debugEconomy와 전체 debug fixture 허용은 혼동하지 않는다.
- 변경 범위: 설정·시작 입력/fixture 진입 조건. 새 선택 메뉴 디자인은 제외.
- 완료/검증: normal 시작과 숫자키 입력 뒤 farmer/dog 총수가 각 1, wallet 불변, probe/fixture 0. 명시적 debug fixture는 실행 가능. normal smoke 및 조건 변경에 영향을 받은 측정만 실행.

#### 결과

- `VITE_CHICKEN_FARM_START_ID=<1..8>`가 새 page/load의 명시적 start option이다. 미지정 시 P3이며, 값은 SP-03-01 resolver가 양의 정수인지 확인한다. 예: `VITE_CHICKEN_FARM_START_ID=4 npm run chicken:smoke --workspace @games/chicken-farm`은 P4 `(9024, 3232)`에 P3 owner의 farmer/dog를 생성했다. UI 선택과 same-page 새 run 전달은 SP-03-08 범위다.
- 시작 위치 숫자키 처리와 numeric key binding을 제거했다. 실행 중 `1`~`8`은 farmer/dog 위치·수·owner, wallet, inventory를 바꾸지 않는다.
- combat PoC, combat smoke, terrain pathing probe는 각각 `VITE_CHICKEN_FARM_COMBAT_POC`, `VITE_CHICKEN_FARM_COMBAT_SMOKE`, `VITE_CHICKEN_FARM_TERRAIN_PATHING_DEBUG`가 명시적으로 `true`일 때만 생성한다. 기본 normal은 모두 off다.
- economy fixture API는 `VITE_CHICKEN_FARM_DEBUG_FIXTURES=true`일 때만 건설 fixture·egg stack·test-only economy ensure를 수행한다. `debugEconomy`는 wallet 10000 preset만 의미하며 fixture 권한을 주지 않는다. browser-perf server는 두 flag를 모두 명시해 기존 coop/well/market fixture 경로를 유지한다.
- normal smoke server와 browser-perf server는 관련 환경 flag를 명시적으로 설정해 부모 shell 환경에 영향받지 않는다. debug state는 combat/fixture/probe 상태를 read-only로 노출한다.
- **future random 확인:** `PlayerControlSystem#createAtConfiguredStart()`은 `initialStartId`가 `null`이면 `playerStarts`에서 `Phaser.Math.Between()`으로 하나를 고르는 fallback을 이미 가진다. 현재 `resolveStartSession()`은 P3 또는 명시 numeric option만 반환하므로 그 fallback은 의도적으로 도달하지 않는다. 랜덤을 재도입할 때는 새 run 입력에 `startMode: 'random'`을 추가하고, tilemap start 목록이 준비된 뒤 선택한 ID를 run state·telemetry에 기록한 다음 현재 `initialStartId` 경로로 넘긴다. 선택 시드 또는 선택 ID를 기록하면 replay/재시작도 재현 가능하다. 플레이 중 랜덤 재배치는 허용하지 않는다.
- 변경: `games/chicken-farm/src/game/config.ts`, `main.ts`, `game/systems/playerControlSystem.ts`, `game/systems/terrainPathingPocSystem.ts`, `scripts/smoke-chicken-farm-start.ts`, `scripts/measure-chicken-farm-browser-perf.ts`.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run build --workspace @games/chicken-farm` → 종료 코드 0 (기존 500 kB chunk 경고만 존재). `npm run chicken:smoke --workspace @games/chicken-farm` → 종료 코드 0, 새 page/load 2회와 숫자키 1~8 입력에서 P3 unit 2기·wallet/inventory 불변, combat false/fixtures false/probe 0, 오류·실패 request·4xx 0건. P4 option smoke도 종료 코드 0. `npm run chicken:browser-perf:measure --workspace @games/chicken-farm` → 종료 코드 0, 9 scenario와 wallet cost/market sale/console/pageerror/request/http 6개 check 통과.

### SP-03-04 — 원본 초기 배치 manifest 정리

- 선행: 01. 실행은 03 뒤.
- 먼저 읽기: artifact의 `key_unit_placement_reference.tsv`, `phaser_object_position_crosscheck.tsv`, `map_start_locations.tsv`; `game/rendering/tilemapObjectRenderer.ts`, `game/tilemapAssets.ts`, 현재 tilemap object layer.
- 작업: 거미 8, 늑대의 돌 13, 고대 늑대의 돌 1, n006/h01R/n01J 각 1의 25개 초기 개체 manifest를 기존 데이터에서 만든다. 안정적 ID·rawcode·원본 owner·역할·world 좌표를 갖추고 원본→tilemap→world 변환을 대조한다. spawn rect/표시 marker를 개체로 중복 계수하지 않는다.
- 변경 범위: 초기 배치 데이터/좁은 변환 helper와 순수 검사. 원본 artifact 수정·재추출 없음.
- 완료/검증: 총수/종류별 수·ID 유일성·좌표/owner 대조. n006 원본 `(1984, -2688)`의 world 위치를 별도 확인. 불일치가 있으면 근거를 기록하고 임의 좌표 보정 금지.

#### 결과

- `game/initialPlacementManifest.ts`에 초기 25개 개체를 안정 ID·role·rawcode·원본 owner·원본 W3X 좌표·tilemap 대조 좌표·Phaser world 좌표로 기록했다. 구성은 늑대의 돌 13, 고대 늑대의 돌 1, 거미 8, n006/h01R/n01J 각 1이다. wolf spawn rect와 기존 marker는 포함하지 않는다.
- 현재 trimmed tilemap의 Phaser world origin은 W3X 대조 좌표 기준 `(3008, 7456)`이다. `w3xPositionToPhaserWorld()`는 tilemap 대조 좌표에 이 offset을 더한다. tilemapPosition은 object 중심점에서 offset을 뺀 값이며, 원본 소수 좌표는 integer tilemap 반올림으로 최대 1.5 px 차이를 허용한다.
- `scripts/check-chicken-farm-initial-placements.ts`는 원본 `key_unit_placement_reference.tsv`의 category 순서·rawcode·owner·좌표와 manifest를 대조하고, `spawns` layer의 object 이름·type·중심점·world 변환을 검사한다. n006의 원본 `(1984, -2688)`과 world `(4992, 4768)`도 별도 assertion으로 고정했다.
- 변경: `games/chicken-farm/src/game/initialPlacementManifest.ts`, `scripts/check-chicken-farm-initial-placements.ts`, `games/chicken-farm/package.json`의 `chicken:initial-placements:check`.
- 검증: `npm run chicken:initial-placements:check --workspace @games/chicken-farm` → 종료 코드 0, 25개 placement·260 assertions 통과. `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. 원본 artifact와 tilemap은 수정하지 않았다.

### SP-03-05 — 초기 개체 registry와 생성·제거

- 선행: 04.
- 먼저 읽기: 04 manifest, `game/ecs/components.ts`, 기존 시스템 entity 저장/조회 패턴과 `main.ts` 생성 순서.
- 작업: run 소유의 초기 개체 상태를 만들고 ID 조회·목록·제거·clear 경로를 제공한다. 원본 owner를 플레이어 wallet owner로 덮어쓰지 않는다. 중복 초기화가 개체를 늘리지 않게 한다. 후속 전투/NPC가 같은 ID와 상태를 소비할 최소 연결점을 기록한다.
- 변경 범위: 초기 개체 상태 모듈과 scene 생성 연결. 공격·거래·wave 구현 없음.
- 완료/검증: 생성 25개, ID별 조회, 중복 생성 방지, clear 후 0, 재생성 후 25. 전투 HP 등 아직 확정되지 않은 규칙은 임의로 채우지 않고 담당 SP로 명시.

#### 결과

- `InitialPlacementRegistry`는 ID별 data-only run entity를 보관한다. entity는 ID·role·rawcode·원본 owner·원본 좌표·world 좌표만 가지며, 전투 HP·targetable·AI·상호작용·Phaser view는 갖지 않는다.
- `initialize()`는 manifest 안의 중복 ID를 거절하고, 이미 등록된 ID를 다시 추가하지 않는다. `get/list/remove/clear`를 제공하며 clear 후 같은 manifest를 다시 등록할 수 있다.
- `FarmScene#create()`는 tilemap loaded telemetry 직후 manifest를 registry에 등록하고 `initial_placement_registry_initialized` telemetry에 이번 생성 수와 total을 기록한다. tilemap marker는 registry와 별개로 유지하며, view 연결은 SP-03-06에서 한다.
- 변경: `games/chicken-farm/src/game/systems/initialPlacementRegistry.ts`, `main.ts`, `scripts/check-chicken-farm-initial-placement-registry.ts`, `games/chicken-farm/package.json`의 `chicken:initial-registry:check`.
- 검증: `npm run chicken:initial-registry:check --workspace @games/chicken-farm` → 종료 코드 0, 생성 25·중복 초기화 0·ID 조회·remove·clear 0·재생성 25·중복 manifest 거절 16 assertions 통과. `npm run chicken:initial-placements:check --workspace @games/chicken-farm` → 종료 코드 0, 25개 source/tilemap/world 대조 260 assertions 통과. `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`, `npm run chicken:smoke --workspace @games/chicken-farm`도 모두 종료 코드 0이다. build의 기존 500 kB chunk 경고만 남아 있다.

### SP-03-06 — 초기 개체 도형 표시와 관찰 경로

- 선행: 05.
- 먼저 읽기: `tilemapObjectRenderer.ts`, `main.ts`의 worldObjects/visibility/minimap 및 `exposeDebugAutomation`.
- 작업: registry의 같은 ID/좌표를 쓰는 도형 view를 연결하고 기존 marker와 이중 표시를 정리한다. fog/미니맵의 기존 규칙에 맞춰 표시하며 read-only snapshot에 종류·ID·owner·위치를 노출한다. 제거된 entity의 view도 정리한다.
- 변경 범위: 초기 개체 view/scene adapter와 관찰 API. 클릭 거래·적 AI·미술 교체 제외.
- 완료/검증: browser snapshot 25개와 manifest 일치, 대표 거미/돌/시장 위치 시각 확인, 제거 후 유령 view 없음. 실제 생성 상태와 후속 상호작용 미구현 상태를 구분해 기록.

#### 결과

- `InitialPlacementViewSystem`이 registry의 ID·world 좌표로 임시 도형 view를 생성하고 `sync()`에서 registry에 없는 view를 destroy한다. view는 fog overlay(depth 18) 아래 depth 7에 있으며 `worldObjects`에 등록되어 UI camera에서 제외된다.
- `spawns` object layer의 초기 25개 role은 world marker 그림·label을 그리지 않는다. 기존 `worldMarkers` 입력은 그대로 유지하므로 minimap의 기존 marker/탐험 규칙은 유지된다. wolf spawn·boss marker는 계속 tilemap renderer가 표시한다.
- read-only debug state는 `initialPlacements`(ID/role/rawcode/owner/world x/y)와 `initialPlacementViewCount`를 제공한다. `debugFixtures=true`에서만 제거/복구 fixture를 허용해 browser harness가 registry와 view의 동시 제거를 확인한다.
- 변경: `games/chicken-farm/src/game/rendering/tilemapObjectRenderer.ts`, `games/chicken-farm/src/game/systems/initialPlacementViewSystem.ts`, `games/chicken-farm/src/main.ts`, `scripts/measure-chicken-farm-browser-perf.ts`.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:initial-registry:check --workspace @games/chicken-farm` → 종료 코드 0, 16 assertions. `npm run chicken:initial-placements:check --workspace @games/chicken-farm` → 종료 코드 0, 260 assertions. `npm run chicken:browser-perf:measure --workspace @games/chicken-farm` → 종료 코드 0, 25 snapshot/view·spider/wolf stone/n006·n006 `(4992,4768)`/owner·spider 제거 후 24 view·복구 25 view 및 7개 check 통과. `npm run build --workspace @games/chicken-farm`, `npm run chicken:smoke --workspace @games/chicken-farm`도 종료 코드 0이며 normal load 2회에서 25 view를 확인했다. build의 기존 500 kB chunk 경고만 남아 있다.
- 전투 target/AI/거래/이벤트와 최종 art는 아직 연결하지 않았다. blocker 없음.

### SP-03-07 — run 종료 정리 경로

- 선행: 03/06.
- 먼저 읽기: `main.ts`의 필드 초기값/create/input 등록/debug automation, `game/systems/visibilitySystem.ts`, 생성된 시스템의 timer/event/view 소유권.
- 작업: 현재 존재하는 자원만 대상으로 정리 목록을 작성하고 scene shutdown 또는 명시적 dispose에 연결한다. 입력 handler, timer/tween, selection/order, 건설 placement/queue/blocker, economy entity/inventory/view, 초기 개체, 시야, elapsedSec, debug API의 이전 scene 참조를 정리한다. Phaser 자동 정리와 애플리케이션 필드 초기화를 구분한다.
- 변경 범위: cleanup adapter와 현재 상태의 소유 시스템. 3개 이상 독립 시스템 수정이 필요하면 소유 시스템별 하위 카드로 먼저 분리.
- 완료/검증: 정리를 2회 호출해도 예외 없음. 이전 handler/callback이 상태를 갱신하지 않음. 정리 전후 개수·필드와 미지원 후속 시스템을 기록. 아직 없는 wave/승패 상태를 구현하지 않음.

#### 하위 분해와 결과

- **SP-03-07-a — scene·input·debug 소유권:** `FarmScene`의 `SHUTDOWN`에 idempotent `disposeRun()`을 연결했다. input listener·keyboard listener·tween을 중단하고 update를 guard하며, 이전 `window.__chickenFarmDebug` 참조를 해제한다.
- **SP-03-07-b — 현재 시스템 state/view 정리:** `ControllableUnitSystem`, `BuildingSystem`, `ConstructionPlacementSystem`, `InitialPlacementViewSystem`, `VisibilitySystem`에 현재 보유 state/view만 dispose하는 경로를 추가했다. unit selection/order, 건설 placement/pending order, initial registry/view, fog cells/overlay, economy state/view map을 비운다. Phaser display object는 scene children 제거로 정리한다.
- **SP-03-07-c — lifecycle browser 회귀:** debug fixture의 `disposeRunForTest()`는 정리 전후 snapshot을 반환한다. browser harness는 이를 두 번 호출해 두 번째 호출의 idempotent 표시와 이후 debug API 해제를 검사한다.
- 변경: `games/chicken-farm/src/main.ts`, `game/systems/{controllableUnitSystem,buildingSystem,constructionPlacementSystem,initialPlacementViewSystem,visibilitySystem}.ts`, `scripts/measure-chicken-farm-browser-perf.ts`.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:browser-perf:measure --workspace @games/chicken-farm` → 종료 코드 0, 기존 7개 check와 `run_cleanup_lifecycle`을 포함한 8개 check 통과. 정리 전 25 placement/view, 정리 후 initial placement/view·unit/selection·building·economy entity·world/UI object가 모두 0이고, 두 번째 호출은 `alreadyDisposed=true`다. 이후 pointer/keyboard input을 다시 전달한 뒤에도 console/page error·실패 request·4xx가 0건이다.
- Phaser가 scene 종료에서 GameObject/scene plugin을 정리하는 것과 별개로, 이번 adapter는 application-owned array/map/registry와 debug closure를 비운다. 아직 없는 wave·승패·결과 화면 state는 만들지 않았다. blocker 없음.

### SP-03-08 — 같은 page에서 새 run 생성

- 선행: 07.
- 먼저 읽기: 01/02 초기화, 07 정리 경로, `main.ts`의 scene 등록/생성.
- 작업: 기존 scene restart를 우선 검토해 07 정리→01 옵션→02/05 초기 생성의 한 경로를 제공한다. default/easy/debug/선택 start를 이 경로로 전달한다. 검증용 명시 호출은 허용하지만 일반 read-only snapshot과 구분한다. SP-11이 호출할 API 계약을 기록한다.
- 변경 범위: run orchestration과 최소 검증 진입점. 승패 화면/부활/결과 처리 제외.
- 완료/검증: 같은 page에서 자원 소비·이동·선택·건설 또는 inventory 변경 뒤 새 run 2회. 초기 자원/아이템/위치/25개 초기 entity가 복원되고 선택·예약·건물·경과 시간·시야의 이전 상태가 남지 않음. page reload로 대체하지 않음.

### SP-03-09 — 시작·재초기화 회귀와 인계

- 선행: 01~08, 추가 하위 카드 전부.
- 먼저 읽기: `scripts/smoke-chicken-farm-start.ts`, 기존 browser-perf의 fixture/cleanup, 이 문서 현황과 SP-02 재현 명령.
- 작업: 기존 smoke를 확장하거나 별도 시작 회귀 명령으로 normal/easy/debug·다른 시작점·같은 page 재초기화를 검증한다. normal 시나리오에는 자원 지급/fixture를 사용하지 않는다. reset용 상태 오염 시나리오는 별도로 표시한다. normal 환경은 부모 shell의 debug 변수 영향을 제거해 고정한다.
- 완료/검증: typecheck·개별 build·기본 smoke·새 시작/재초기화 회귀 통과, debug fixture 영향 시 browser-perf도 확인. 필수 assertion 실패는 nonzero, console/pageerror/request 오류 수집, 본인 서버/브라우저 정리. dev/preview 중 초기화 연결을 바꾼 경로를 최종 build에서도 확인.
- 변경 범위: 해당 harness/명령 등록/필요한 관찰 API, 이 문서·Current Context·backlog·SP-01 actual의 관련 행. 전체 게임 build와 무관한 성능 측정 반복은 제외.
- 인계: SP-04 선택/경로, SP-07 초기 entity 전투, SP-08 돌/rect 기반 wave, SP-11 종료 뒤 새 run 호출 및 앞으로 추가될 상태 정리, SP-12 NPC 기능, SP-15 난이도 선택/밸런스. SP-03 통과를 한 판 완성이나 SP-11 완료로 올려 쓰지 않는다.

## 실행 현황

| ID | 상태 | 결과 / 다음 작업 |
| --- | --- | --- |
| SP-03-01 | 완료 | `startSessionConfig.ts` resolver와 순수 검사 추가. start 위치와 단일 P3 owner 분리, normal/easy/debug·무효 입력 13 assertion 및 typecheck 통과. blocker 없음. 다음 SP-03-02 |
| SP-03-02 | 완료 | resolver를 initial start·P3 wallet·unit/inventory owner에 연결. P3/P4 위치에서 각 unit 1기, I003×5/I009×1/I00F×1, 재호출 중복 없음 확인. typecheck·normal smoke 통과; blocker 없음. 다음 SP-03-03 |
| SP-03-03 | 완료 | 새 run env start option만 유지하고 숫자키 시작 전환 제거. normal의 combat/terrain/fixture 자동 생성 차단, 명시 debug fixture browser-perf 통과. typecheck·build·normal smoke 통과; blocker 없음. 다음 SP-03-04 |
| SP-03-04 | 완료 | 25개 초기 배치 manifest와 W3X→tilemap→world 순수 검증 추가. rawcode/owner/좌표/n006 대조 통과; blocker 없음. 다음 SP-03-05 |
| SP-03-05 | 완료 | data-only initial registry와 scene 초기화 연결. 생성 25·중복 없음·조회/remove/clear/재생성 통과; combat/NPC/view 미구현을 유지. typecheck·build·normal smoke 통과; blocker 없음. 다음 SP-03-06 |
| SP-03-06 | 완료 | registry 기반 25개 도형 view·read-only snapshot 연결. minimap marker 유지, fog/UI camera 규칙 적용, debug fixture 제거 후 24 view·복구 25 view 확인. typecheck·registry/placement assertion·browser-perf·build·normal smoke 통과; blocker 없음. 다음 SP-03-07 |
| SP-03-07 | 완료 | 07-a/b/c로 분해해 scene shutdown·input/debug 해제와 unit/building/placement/initial/fog state·view 정리를 연결. 두 번 dispose 시 idempotent, 정리 후 관찰 개수 0·오류 0 확인; blocker 없음. 다음 SP-03-08 |
| SP-03-08 | 대기 | 07 뒤 같은 page 새 run |
| SP-03-09 | 대기 | 전체 회귀·증거·인계 |

각 완료 행에는 변경 파일/심볼, 실행 명령·종료 코드, 핵심 assertion, 남은 blocker, 다음 ID를 짧게 기록한다. 현재는 정적 조사만 했으며 위 카드의 구현 완료 수는 0이다.

## Terra medium 실행 요청 예시

```text
닭농장 SP-03-01을 Terra medium으로 진행해.
docs/chicken_farm/chicken_farm_sp03_task_plan.md의 해당 카드와 지정 심볼부터 읽고,
이번 요청은 해당 ID만 구현·검증해. 기존 변경을 보존하고 완료 조건을 낮추지 마.
범위가 여러 독립 시스템으로 커지면 하위 ID로 분해해 기록해.
결과는 현황 표에 변경 파일·명령/종료 코드·assertion·blocker·다음 ID로 남겨줘.
```

이 템플릿은 실행 모델 설정에 대한 요청이다. 문서 작성만으로 모델이 전환되거나 다른 에이전트가 실행되지는 않는다.
