# 닭농장 프로토타입 UI 개선·2D 에셋 배치 계획

> **2026-09-28 16:16 KST 우선순위 변경:** 이 문서의 UI polish·에셋·adapter 패스는 후순위다. 현재는 [Current Context의 싱글플레이 task](./chicken_farm_current_context.md)를 따른다. 기존 구현 이력은 유지하며 플레이를 막는 입력 오류·필수 상태 피드백만 SP-14 및 관련 게임 task에 포함한다. 아래의 과거 P0 실행 순서를 현재 최우선으로 적용하지 않는다.

작성: 2026-09-28. 현재 구현 소스 검토와 **GPT-5.6 Terra / medium** 검토를 합친 후속 구현 계획이다. 구현 완료 보고서가 아니다.

실행 기준 갱신: 이후 개발은 사용자 지정 **Astra light / ChatGPT Plus**의 5시간·주간 한도를 기준으로 한다. Terra medium은 최초 검토 이력이다. 작업 분할은 유지하되 [개발 작업량·한도 예산](./chicken_farm_astra_light_work_budget_2026-09-28.md)에 따라 소작업별 사용량을 측정한다.

## 1. 이번 작업의 기준

사용자 정정 기준: **현재는 prototype이며 에셋은 아직 생성하지 않았다.** 먼저 현재 도형 기반 UI의 사용성을 개선한다. 이후 RTX 3080으로 제작할 정적 2D 에셋과 제작된 8방향 spritesheet를 같은 배치 계약으로 연결한다.

- 이번 산출물은 수정계획이다. 게임 코드·이미지·밸런스는 변경하지 않는다.
- 후속 UI 작업도 에셋 생성·학습·다운로드를 선행 조건으로 삼지 않는다. 지금의 도형/텍스트를 placeholder로 사용한다.
- 8방향 런타임 입력은 spritesheet와 프레임 메타데이터다. 런타임 3D 렌더러 도입이나 단일 그림 회전으로 대체하지 않는다.
- 제작 방법은 [RTX 3080 제작 기준](./chicken_farm_asset_feasibility_2026-09-28.md), ID 이력은 [Sprite 계획](./chicken_farm_sprite_asset_generation_plan.md)을 참조한다. **당장의 실행 순서는 이 문서의 UI 우선순위를 따른다.**
- 작업 분할은 모델 변경 후에도 재사용한다. 현재 실행 모델과 사용량 예산은 Current Context를 따른다.

## 2. 현재 구현에서 확인한 문제

주 근거: `games/chicken-farm/src/` 아래 `main.ts`, `game/config.ts`, `game/ui/farmHud.ts`, `game/systems/commandCardSystem.ts`, `constructionPlacementSystem.ts`, `buildingSystem.ts`, `controllableUnitSystem.ts`, `cameraControlSystem.ts`, `visibilitySystem.ts`.

| 현재 코드에서 확인한 내용 | 사용자 영향 / 검증할 가설 | 수정 방향 |
| --- | --- | --- |
| 960×720 FIT canvas, 월드 540px + 하단 HUD 180px | 좁은 화면에서 게임 전체와 글씨가 함께 축소된다 | 먼저 기준 해상도에서 정리하고, HUD 좌표·입력 경계를 공통 layout으로 관리 |
| 명령 4×3칸, 버튼 61×40, label 10px; 인벤토리 2×3칸, 슬롯 40px | 명령 뜻/비용을 파악하기 어렵고 작은 창에서 누르기 어렵다 | 슬롯 위치와 hotkey 유지, 상태 설명·툴팁·명시적 입력 상태 추가 |
| 자원 한 줄에 Gold/Lumber/Supply와 Farm C/Egg/Inv/Hatch가 함께 표시 | 플레이 정보와 PoC 집계가 섞인다 | 자원은 금/목재/인구로 분리; 농부 보유 알은 인벤토리에 표시, PoC 집계는 DBG로 이동 |
| 선택창에 rawcode, Footprint, W3X bldtm, PathTex 등 기술 정보 표시 | 행동에 필요한 정보가 묻힌다 | 이름 → HP/MP → 현재 행동 → 다음 조작 순으로 표시; 개발 정보는 DBG |
| 명령 활성 여부가 boolean이고 주로 색으로 구분 | 자원/마나/선택 조건 중 무엇이 부족한지 알기 어렵다 | 하나의 availability 결과에 enabled/reason/cost를 담고 클릭·키보드·표시에 공유 |
| 건설 validation에 실패 reason은 이미 존재 | 실패 원인을 UI에 일관되게 전달할 수 있다 | 기존 reason을 사용자 문구로 변환; 건설 ghost와 HUD에 같은 결과 표시 |
| 선택 상태 텍스트가 주기적으로 갱신된다 | 일회성 조작 결과를 같은 텍스트에 쓰면 바로 덮일 위험 | 선택 상태와 수명 있는 피드백 메시지를 분리 |
| 미니맵 프레임에 interactive 바인딩이 없고 카메라는 방향키 이동 | 멀리 이동하거나 농부를 다시 찾기 번거롭다 | 미니맵 클릭 이동과 선택 대상 위치로 복귀 버튼 |
| DBG 기본 노출, 아이템은 문자 아이콘 및 drag 조작 | 첫 화면 정보량이 많고 드래그 가능 여부가 불명확 | DBG 기본 접기, 슬롯 tooltip·drag 시작/유효 대상/결과 안내 |
| 건물 body depth 23, 유닛 container depth 25 등 고정값 | 키 큰 sprite 도입 시 앞뒤 가림이 틀릴 가능성이 크다 | 공통 footY 정렬과 별도 overlay 계층을 에셋 도입 전에 준비 |
| lighting/fog depth 17/18, 여러 월드 객체 depth는 그보다 크다 | 에셋 adapter만 붙이면 fog와 가시성 정책이 어긋날 위험 | 현재 visibility 필터와 camera ignore 목록을 함께 감사하고 계층 계약으로 고정 |

좁은 화면 수치 예: 390px 폭에서 FIT 비율은 약 0.406이다. 10px label은 약 4.1 CSS px, 40px 슬롯은 약 16.3 CSS px가 된다. 이는 코드 기반 계산이며 실제 화면 측정값은 아니다. 모바일 전체 조작 지원을 이번 패스의 완료 조건으로 확대하지 않는다.

`pose-lab.html` / `src/pose-lab/main.ts`는 Three.js stick rig와 8방향 미리보기 도구다. 현재 코드에는 완성 spritesheet export/import 계약이 없다. 방향 기준을 비교하는 도구로 활용하고, 그 화면을 이미 만들어진 런타임 시트로 취급하지 않는다.

### 실제 초기 화면 확인

Windows Edge headless로 로컬 Vite 페이지를 1200×900에서 캡처하고 이미지를 확인했다. [초기 화면 캡처](./ui-review/prototype-initial-1200x900-2026-09-28.png).

- 우상단 디버그 패널이 자원바의 `Hatch` 부근을 덮는다. 기본 DBG 접기와 상단 공간 분리가 P0다.
- 월드 격자 대비가 강하고 중앙 농부·개와 이름표가 작다. 기본 격자는 숨기거나 대비를 낮추고 건설 모드에서 필요한 격자를 강조한다. 시각 크기·선택 표시·hit 영역을 함께 검토하되 충돌 크기는 바꾸지 않는다.
- 미선택 상태는 `No Selection`과 영어 선택 안내, 빈 초상/인벤토리/명령칸으로 구성된다. 첫 안내를 “농부를 선택한 뒤 B로 건설 메뉴를 여세요”처럼 다음 행동까지 연결한다.
- 미니맵에는 이미 카메라 영역 사각형이 보인다. 새 사각형을 중복 구현하지 않고 클릭 이동과 기존 표시의 동기화만 보완한다.

이번 실화면 확인은 **초기 상태 한 장**이다. 선택·건설·인벤토리 조작 및 여러 해상도는 후속 smoke에서 확인한다.

## 3. 목표 UI와 입력 규칙

기존 RTS형 구성을 유지한다. 대규모 DOM/HUD 프레임워크 전환은 이 작업에 필요하지 않다.

```text
상단: [금] [목재] [인구]                         [도움말] [DBG]
월드: 선택 표시 / 건설 미리보기 / 명령 위치 표시
      [지금 필요한 조작 안내 또는 짧은 결과 메시지]
하단: [미니맵] [선택 초상·이름·HP/MP·행동] [인벤토리] [4×3 명령]
```

### 정보·피드백

- 평상시에는 자원, 선택 대상, 실행 가능한 행동이 먼저 보인다. 실제로 연결되지 않은 웨이브 카운트나 위협 타이머를 새로 표시하지 않는다.
- 선택 없음: “농부나 개를 선택하세요.” 다중 선택: 수와 대표 대상, 공통 명령을 표시한다.
- 명령 설명: 이름, 효과 한 줄, 현재 적용 비용, hotkey, 불가 사유. `originalCost`를 실행 비용이라고 가정하지 말고 실제 wallet 차감 경로와 일치시킨다.
- 건설 중: 종류, 진행률, 남은 시간, 작업 중/일꾼 대기와 취소 동작을 표시한다.
- 건설 실패: “자원이 부족합니다”, “건물과 겹칩니다”, “이 지형에는 지을 수 없습니다”, “일꾼이 접근할 수 없습니다”처럼 기존 validation 원인을 번역한다.
- 상태는 색+텍스트/테두리로 구별한다. hover tooltip은 게임 영역 밖으로 나가지 않도록 clamp한다.
- 일회성 성공/실패 메시지는 별도 feedback presenter에서 2~3초 표시하는 안으로 시작한다. 반복 실패를 매 frame 쌓지 않는다.
- 수치·문구가 바뀔 때만 텍스트를 갱신한다. 이번 작업에서 전체 렌더 루프를 재작성하지 않는다.

### 조작

- 버튼 클릭과 hotkey는 기존 `CommandCardAction` 처리 경로를 공유한다. tooltip용 사유와 실제 실행 가능 여부가 다르지 않게 한다.
- 공격/건설/몰이/아이템 drag의 현재 모드를 명시한다. 예: “닭장 위치 선택 · 클릭 확정 · Esc 취소 · Shift 예약”.
- Esc는 진행 중 조작 취소 → build page 복귀 순으로 한 단계만 처리한다. 기존 handler 우선순위를 먼저 확인하여 중복 처리하지 않는다.
- HUD 위 클릭/우클릭/drag 해제가 월드 이동·공격·건설로 누출되지 않아야 한다. 월드 입력 가능 영역을 layout에서 공통 제공한다.
- 인벤토리는 이름/수량/사용 또는 전달 방법을 표시하고, 드래그 시작과 종료 결과를 알려준다. 기존 경제 명령을 호출하며 새 판매/부화 규칙을 만들지 않는다.
- 미니맵 좌표를 world 좌표로 변환해 카메라만 이동한다. 월드 명령을 발행하지 않는다. 지도 바깥 클릭은 무시하고 카메라 범위는 clamp한다.
- 선택 대상 복귀는 우선 화면 버튼으로 제공한다. 단축키는 현재 충돌 목록을 확인한 뒤 추가한다.
- 기준 화면은 960×720, 1280×720, 1440×900. 390×844는 축소·안내 상태를 확인하는 보조 시나리오다. 작은 화면 안내만으로 모바일 플레이 지원 완료라고 보고하지 않는다.

## 4. 2D 에셋 배치 규칙

### 좌표·크기·pivot

| 항목 | 계약 |
| --- | --- |
| 월드 좌표 | 현재 tilemap/WPM 좌표가 기준. 아트 때문에 simulation 좌표를 변경하지 않음 |
| 건물 footprint | 현 구현 32 world px/cell, 배치 snap 64 world px 유지. 둘을 같은 값으로 통합하지 않음 |
| 유닛 anchor | simulation 위치를 발/지면 접점에 대응. 그림 중앙을 좌표로 쓰지 않음 |
| 건물 anchor | footprint `(x,y,w,h)`의 바닥 중앙 `(x+w/2,y+h)`에 source pivot을 맞춤 |
| 크기 | 원본 PNG px와 표시 world px를 분리. asset별 승인 scale을 전체 방향·동작에 공유 |
| trim | 초기 spritesheet는 고정 cell을 우선. trimmed atlas는 sourceSize/trimOffset/pivot 복원 경로가 있을 때만 허용 |
| collision | 그림/그림자 bounds가 아니라 기존 footprint·유닛 충돌 반경 유지 |
| 선택 영역 | sprite alpha에만 의존하지 않음. 발 주변 hit shape/기존 hit-test 보존, 겹칠 때 우선순위 명시 |
| ghost | 완성본과 동일 scale·pivot, footprint outline과 실패 사유는 별도 overlay |
| HUD icon | 월드 스프라이트 scale을 공유하지 않음. contain 정렬과 여백 유지, 라벨/수량은 코드로 그림 |

원본 cell의 pivot `(px,py)`와 world anchor `(ax,ay)`, scale `s`라면 그림의 좌상단은 `(ax-px*s, ay-py*s)`다. 고정 cell origin을 쓰거나 trim을 복원한 adapter에서 같은 결과를 보장한다.

현재 카메라 zoom은 `540/(9*128)=0.46875`다. 예를 들어 64 source px를 scale 1로 두면 기준 canvas에서 약 30px로 보인다. “64px 유닛”을 화면 64px로 잘못 해석하지 말고 `source px → world px → camera zoom → canvas FIT`를 함께 검수한다. 숫자는 시작 비교값이며 최종 아트 크기는 제작 후 승인한다.

### depth·가림·가시성

- 지면 → 지면 장식/접지 그림자 → 발 위치로 정렬한 건물·유닛·키 큰 소품 → 월드 상태 표시 → fog/가시성 처리 → 고정 HUD/tooltip 순으로 책임을 나눈다.
- 건물과 유닛은 **같은 정렬 집합**에서 footY를 비교한다. `건물 layer + y`, `유닛 layer + y`를 별도 대역으로 만들어 항상 유닛이 앞에 오게 하지 않는다.
- world body 전용 layer/container 안에서 `(footY, stableEntityId)`를 정렬한다. 기존 HUD depth 100 이상과 충돌할 수 있는 무제한 `setDepth(worldY)`는 사용하지 않는다.
- body가 container이면 자식 depth가 아니라 외부 container의 정렬이 적용되는지 확인한다. HP/선택 표시를 body에 묶어 의도치 않게 가리지 않는다.
- fog는 객체 노출 여부와 함께 검수한다. HP bar, 선택 테두리, 명령 marker로 미탐색 객체 위치가 새지 않아야 한다. 기존 camera ignore 목록에도 새 layer를 반영한다.
- 첫 패스는 바닥 중앙 정렬로 제한한다. 큰 지붕·문·아치가 실제로 필요하면 바닥/상부 분리 에셋을 후속 추가하고 예외를 metadata로 기록한다.
- 선택 테두리, 배치 격자, 사거리, 진행률, HP는 코드 overlay로 유지한다. 상태 문구/팀 색/선택 상태를 생성 이미지에 구워 넣지 않는다.

### 8way spritesheet 입력 계약

시트가 만들어진 뒤 추측 없이 읽을 수 있도록 다음을 manifest에 명시한다. 지금은 스키마/placeholder 검증만 준비한다.

| 필드 | 내용 |
| --- | --- |
| identity | `assetId`, revision, runtime template ID, source 경로 |
| source geometry | sheet width/height, cell width/height, margin, spacing, rows/columns |
| anchor | 원본 cell 기준 pivotPx, 표시 world 크기 또는 scale |
| direction | `N, NE, E, SE, S, SW, W, NW`의 명시적 frame 목록/row 매핑 |
| animation | action별 방향별 frame 목록, fps 또는 duration, loop 여부 |
| provenance | 제작 후 source hash와 제작 metadata 참조; 생성 전 가짜 hash를 채우지 않음 |
| fallback | 누락 action의 대체 표시와 전체 source 누락 시 도형 fallback |

- row=방향, column=시간이라는 규칙은 **권장 표준**이다. 실제 생성기가 다른 순서를 내보내면 frame map에서 변환한다. 8열이 곧 8방향이라고 추측하지 않는다.
- 방향은 화면 기준 N=위, E=오른쪽, S=아래, W=왼쪽이다. 화면 좌표 delta에서 이동 방향을 고르고 정지 시 마지막 유효 방향을 유지한다. 경계 떨림 방지를 위한 작은 hysteresis를 두고 값은 실제 시트 검수 때 조정한다.
- 공격/작업 중에는 simulation의 target/행동 상태로 방향을 정한다. animation frame이 데미지·알 생산·경제 판정을 새로 발생시키지 않는다.
- 초기 동작은 실제 구현 상태에 매핑되는 idle/walk부터. attack/work/death는 제공 상태와 프레임이 확인된 범위만 연결한다. 없는 프레임을 있다고 간주하지 않는다.
- 좌우 mirror는 기본 비활성. 비대칭 장비와 광원 문제가 없는 asset만 metadata로 허용한다.
- 프레임을 바꿀 때마다 auto-fit/scale/origin을 재계산하지 않는다. 모든 방향의 발 접점을 동일하게 유지한다.
- sheet 전체 크기, frame 인덱스 범위, 8방향 누락, pivot bounds를 로드 전 검증한다. 실패 시 게임은 도형으로 유지하고 개발용 진단을 남긴다.
- 등록/texture load는 scene 초기화 또는 asset revision 변경 시 수행한다. 매 frame load/animation 생성은 금지한다.

제안 경로: `assets/sprites/`(정리된 runtime sheet/PNG), `assets/manifests/`(입력 명세), `src/game/rendering/`(adapter). 제작 원본·모델·대량 후보는 runtime public assets에 넣지 않는다. 현재 `assets`가 Vite publicDir이므로 원본을 넣으면 배포 산출물에도 포함될 수 있다. 경로는 제안이며 이번에 생성하지 않았다.

## 5. Terra medium 작업 패킷

한 패킷당 하나의 검증 가능한 행동을 끝낸다. `main.ts` 전체 재작성과 UI/경제/아트 동시 변경을 피한다. 표의 새 파일은 제안이며 기존 구현이 있는지 확인한 뒤 최소한으로 추가한다.

| 순서 | 변경 범위 / 주요 파일 | 완료 조건 |
| --- | --- | --- |
| P0-0 기준 화면 확보 | 브라우저 환경, `config.ts`, 현재 화면 기록 | 기본/농부/개/건설/닭장/인벤토리/DBG 상태 캡처; 현재 문제와 새 회귀 구분 |
| P0-1 정보 우선순위 | `farmHud.ts`, `main.ts`의 HUD update/격자 표시 함수 | 개발 문구 DBG 이동, DBG 기본 접기, 자원/선택 정보 분리, 첫 행동 안내 및 기본 격자 대비 개선; 긴 이름·큰 수량에도 겹침 없음 |
| P0-2 명령 피드백 | `commandCardSystem.ts`, `farmHud.ts`, action 연결부; 필요 시 `ui/commandFeedback.ts` | tooltip·비용·disabled 사유·targeting 안내 일치; 키/클릭 같은 결과; 일회성 메시지가 즉시 사라지지 않음 |
| P0-3 배치·인벤토리 입력 | `constructionPlacementSystem.ts`, `main.ts`의 drag/action handler | ghost 사유, Esc 우선순위, Shift 예약, 잘못된 drop 피드백; HUD 입력이 월드에 전달되지 않음 |
| P1-1 HUD layout·탐색 | 새 `ui/hudLayout.ts`, `farmHud.ts`, `cameraControlSystem.ts`, camera 설정 | 좌표/월드 입력 경계 공통화, 미니맵 클릭·선택 대상 복귀; resize 뒤도 hit-test 일치 |
| P1-2 렌더 배치 계약 | 새 `rendering/entityVisual.ts`, `rendering/renderLayers.ts`; building/unit view 연결 | 도형으로 먼저 footY·anchor·fog·선택/충돌 불변 검수; 경제 entity 표시 중복 없음 |
| P1-3 시트 계약·검수 fixture | 새 manifest 타입/validator 및 sprite adapter | 합성 번호 프레임 fixture로 8방향/frame map/pivot 검사; source 없으면 도형 유지; 실아트 필수 아님 |
| P2 제작 후 반입 | 실제 3080 PNG + 8way sheet, 해당 manifest만 | 한 건물+한 유닛 먼저 통합, 방향·접지·가림 통과 뒤 범위 확대 |

P0-0 → P0-1 → P0-2 → P0-3 → P1-1 순서가 기본이다. P1-2/3은 UI와 분리된 후속 작업이며 실제 에셋 반입 P2는 제작 완료 후 진행한다. 새로운 sprite 도입 없이 P0 완료가 가능해야 한다.

### 재사용할 작업 지시문

```text
모델: Astra, 추론: light (사용자 UI 설정 기준)
예산: ChatGPT Plus 5시간·주간 한도, 추가 크레딧/API 지출 목표 $0
계획: docs/chicken_farm/chicken_farm_ui_asset_placement_plan_2026-09-28.md
이번 패킷: [P0-1 등 하나만]

Current Context와 이번 패킷의 대상 파일을 먼저 읽어라.
최신 5시간·주간 잔여율과 초기화 시각을 확인하고, 한 개의 검증 가능한 소작업으로 범위를 제한하라.
한도 데이터를 조회할 수 없으면 미측정으로 표시하고, 종료 후 사용량 기록이 필요함을 인계하라.
현재는 prototype이고 아트 생성 전이다. 기존 도형으로 이번 완료 조건을 충족하라.
3080 제작/다운로드/학습, runtime 3D 전환, 경제·전투 밸런스 변경은 범위 밖이다.
기존 CommandCardAction, wallet, selection, validation 경로를 재사용하라.
main.ts 전체 정리나 관계없는 시스템 추출은 하지 말고 필요한 접점만 수정하라.
새 에셋 파일/프레임 순서를 추측하지 말고 manifest/fallback으로 분리하라.
변경 전 확인한 상태 → 변경 → 관련 build/smoke → 남은 한계를 보고하라.
이번 소작업 완료 후 다음 패킷은 자동으로 섞지 말고 변경·검증·잔여 작업·한도 소비를 기록하라.
```

컨텍스트는 Current Context + 이 문서의 해당 절 + 대상 파일로 시작한다. W3X 전체 분석·모델 제작 문서는 해당 수치/공정이 필요한 경우에만 연다. 변경 후 인계에는 수정 파일, 검증 명령/결과, 남은 문제, 다음 패킷 네 가지만 남긴다. 실제 예상 시간·모델 비용은 첫 패킷 결과 없이 단정하지 않는다.

## P0-1 구현 인계 — 2026-09-28

- 변경: `main.ts`에서 DBG overlay와 build grid의 초기 표시를 껐고, `G` 키 토글은 유지했다. 상단 HUD는 gold/lumber/supply만 표시하며 farm/egg/inventory/hatch PoC 집계는 DBG overlay에만 남긴다. 미선택 패널은 한국어 첫 행동 안내를 표시한다.
- 범위 보존: wallet, economy, CommandCardAction, 건설 validation, 충돌/경로와 실제 에셋은 변경하지 않았다.
- 검증: `npm run build --workspace @games/chicken-farm` 성공.
- 확인 한계: `npx tsc --noEmit -p games/chicken-farm/tsconfig.json`은 P0-1과 무관한 기존 `balance.ts`, terrain renderer, combat/unit system, `main.ts` 오류로 실패했다. 새 Edge headless 캡처는 프로세스가 종료하지 않아 만들지 못했다. 다음 패킷을 시작하기 전에 초기 화면에서 DBG/격자 숨김과 한국어 안내를 수동 확인한다.
- 다음: P0-2만 진행한다. 명령 카드의 비용/불가 사유/targeting 안내와 수명 있는 feedback presenter를 추가하며, 이 패킷의 자원·선택 레이아웃을 다시 섞지 않는다.

## 6. 검증과 완료 기준

후속 구현 때 수행할 항목이며, 이번 계획 작성에서 통과했다고 주장하지 않는다.

1. UI: 960×720, 1280×720, 1440×900에서 자원·선택·tooltip·명령이 겹치지 않는다. 실제 CSS px로 글자/버튼 크기를 확인한다.
2. 입력: 클릭과 hotkey, Esc, Shift 예약, HUD 위 우클릭, inventory drag가 각자 의도한 명령만 발생시킨다.
3. 실패: 선택 없음, 자원/마나 부족, 불가 지형, overlap, 도달 불가, 잘못된 drop에서 구체적인 안내가 유지된다.
4. 탐색: 미니맵 클릭/복귀 뒤 camera 범위와 선택이 정상이며 새 이동 명령이 생성되지 않는다.
5. 배치: 건물 위/아래를 지나는 유닛, 동일 footY 두 유닛, 큰 sprite, fog 경계, construction→complete→destroy를 검수한다.
6. 시트: N→NE→E→SE→S→SW→W→NW 전환, 정지/방향 경계, cell 0/마지막 frame, 누락 asset/action, 잘못된 metadata를 확인한다.
7. 기능 보존: 기존 알 수집·닭장 입고/부화·시장 판매·건설/취소가 같은 wallet과 entity lifecycle을 사용한다. UI 문구를 위해 별도 수량 상태를 만들지 않는다.

검증 명령:

```bash
npm run build --workspace @games/chicken-farm
npx tsc --noEmit -p games/chicken-farm/tsconfig.json
```

UI 텍스트만 바꾸면 build와 해당 화면 smoke가 중심이다. 입력/경제 연결을 변경하면 `npm run chicken:economy:measure`, pathing/footprint에 손댔다면 `npm run chicken:pathing:measure`, 렌더 루프/정렬을 변경하면 `npm run chicken:browser-perf:measure`를 추가한다. 기존 실패가 있으면 변경 전후를 나눠 기록한다. formatter/텍스트 변경마다 전체 성능 측정을 반복하지 않는다.

이번 확인 범위: 저장소 소스/문서, Terra medium 검토, 로컬 Vite + Windows Edge headless 초기 화면 1200×900 캡처/이미지 확인. Linux Playwright Chromium은 `libnspr4.so` 누락으로 시작하지 못해 Edge로 초기 화면 확인을 대체했다. 인터랙션 및 다중 해상도 검수는 P0-0에서 보완한다. 문서만 변경했으므로 게임 build/회귀 측정은 이번에 실행하지 않았다. 코드 구조에서 추론한 위험과 실제 초기 화면에서 관찰한 문제는 위에서 구분했다.
