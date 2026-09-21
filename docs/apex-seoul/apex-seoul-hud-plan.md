# Apex Seoul 아케이드 Gameplay HUD 설계

갱신일: 2026-09-10

상태: 2026-09-10 기본 계기판 구현. `GameplayHud`와 `createGameplayHudState()`를 `TimeAttackScene`에 연결했다. 아래 후속 설계 중 PB split·접근성·모바일 touch·효과 사건 연계는 아직 남아 있다.

## 구현된 v1

- 공통: 바늘식 아날로그 RPM(프로파일별 스케일·redline), 디지털 km/h, 실제 gear label, 경과 시간·checkpoint 수.
- Raven NA: boost 계기 없음. 고회전/NA 상태 표시.
- Mirae single: 아날로그 boost 계기 1개.
- Seorin sequential twin: primary/secondary 아날로그 boost 계기 2개. 두 실제 동적 상태를 표시하며, 둘을 가중 합성한 값이 controller torque에 반영된다.
- boost 단위는 실제 압력이 아닌 정규화 `%`. 압력 모델 없이 bar/psi를 만들지 않는다.
- 일반 진입에서 debug OFF, `?debugHud=1`로 초기 ON, D는 debug만 토글. 기본 HUD는 유지한다.
- 정적 계기 면은 생성 시 한 번 렌더하고 바늘·숫자만 갱신한다. Scene shutdown 시 HUD를 정리하고 resize listener도 해제한다.
- 로컬 Chromium에서 세 차량 주행 화면과 844×390 축소 화면을 확인했다. 현재 game의 FIT canvas 정책을 유지하므로 모바일 전용 재배치·touch 가독성 승인은 후속이다.
- `qa:gameplay-hud`, powerband/standing-start/launch/catalog/guardrail 검증 및 build 통과. 전체 tsc는 변경 전후 동일한 기존 오류 29개이며 새 진단은 없다.

차량·효과의 후속 방향은 [플레이 가능한 게임 전환 설계](./apex-seoul-playable-game-plan.md)를 따른다.

## 오른쪽 하단 집중 배치 — 2026-09-10 적용

[세가 공식 Initial D Arcade Stage Zero 안내](https://initiald.sega.jp/inid0/about/speedrun.html)의 [게임 화면](https://initiald.sega.jp/inid0/images/common/about/crowdedelement/crowdedelement-carbehavior-2.jpg)을 직접 확인했다. 참고한 원칙은 오른쪽 하단의 큰 RPM dial과 바로 아래 디지털 속도·gear를 가까이 두는 것이다. 원본의 이미지·스킨을 복제하지 않고 Apex의 기존 색과 계기를 사용한다.

판단: 좌우에 흩어진 동력계 정보를 한 시선으로 확인할 수 있어 현재 레이싱 화면에 적합하다. `GameplayHud.cluster`가 오른쪽·하단 anchor를 공유하고, 차량이 달라져도 RPM·speed 위치는 유지한다. boost는 RPM 바로 위에 두며 twin은 가로 한 줄로 배치한다. 이 twin 구성은 참조 화면을 그대로 옮긴 것이 아니라 중앙 차량 시야를 비우기 위한 Apex 전용 확장이다.

1200×760 기준 오른쪽 여백 24px, cluster 기준점은 하단에서 72px 위다. RPM 반경 78px, boost 반경 54px이며 twin 두 계기 중심의 가로 간격은 132px이다. boost 중심은 RPM 중심보다 180px 위이며 single과 twin의 오른쪽 계기는 RPM과 같은 x축을 사용한다. 타이머는 상단 좌측, progress는 기존 하단 위치를 유지한다. normal 주행의 세 차량 screenshot 및 844×390 FIT 축소 화면에서 겹침·잘림과 page error 없음, production build 통과를 확인했다. 작은 모바일 눈금의 최종 가독성 승인은 기존 모바일 배치 과제로 남는다. 이번 변경은 배치·표기만 조정하고 엔진 계산은 변경하지 않았다.

### 부스트 상단 배치 조정

RPM·디지털 속도·gear 위치는 사용자가 승인한 위치를 그대로 유지했다. boost만 RPM 위로 옮겨 동력계의 가로 점유 폭을 줄였다. twin은 바늘·눈금 크기를 줄이지 않고 두 계기를 나란히 배치하며, boost 하단과 RPM 제목 사이에도 여유를 둔다. 시선이 더 위로 이동하는 대신 중앙 도로 쪽 침범이 줄어드는 구성을 선택했다. 엔진 상태와 계기 표시값은 변경하지 않았다.

## 화면과 정보 우선순위

현재 pseudo-3D 도로 위에 2D 아케이드 계기판을 올린다. time attack이므로 가짜 순위·lap·nitro meter는 표시하지 않는다. 경과 시간과 checkpoint 진행을 사용한다.

```text
┌ TIME 01:12.34     SECTOR 2/4          PB 02:10.25 ┐
│ LAST SPLIT -0.42                  NEXT: LEFT      │
│                                                  │
│           countdown / checkpoint notice          │
│               도로 판단 영역                     │
│                                                  │
│                      차량        BOOST 1 BOOST 2 │
│                                             RPM │
│                                       156 km/h [4]│
└ progress ──────●────────●────────────── FINISH ───┘
```

표시 숫자·sector 수는 배치 예시이며 실제 track 데이터로 바꾼다. HUD는 야간 black/blue 무드와 고대비 숫자, amber/red 경고를 사용한다. timer와 speed는 고정 폭 숫자로 읽고 색상뿐 아니라 문구·형태로 상태를 구분한다.

| 영역 | 표시와 동작 |
| --- | --- |
| 상단 좌측 | elapsed, 현재 section, 직전 checkpoint의 PB 누적 시간 대비 delta. 이전 기록 없으면 `--` |
| 상단 우측 | 같은 차량·코스·ruleset의 PB. section metadata가 있을 때만 다음 코너 방향 |
| 하단 좌측 | 동력계 UI를 두지 않아 도로 시야를 확보 |
| 하단 우측 | 큰 RPM dial 바로 아래 디지털 speed·km/h·gear. RPM 위에는 싱글 boost 1개 또는 트윈 boost 2개 가로 배치. NA는 boost 생략. RPM/speed는 차량을 바꿔도 고정 |
| 하단 | 실제 course progress와 checkpoint ticks. 차량 sprite 및 touch 영역과 분리 |
| 중앙 | countdown·GO·checkpoint·finish의 짧은 사건. 상시 수치나 turbo 메시지로 도로를 덮지 않음 |

실시간 PB delta는 ghost/동일 위치 timestamp 데이터가 없으면 만들지 않는다. 우선 `LAST SPLIT`이라고 명시한 checkpoint 비교만 유지한다. 완주 뒤 계산하는 delta와 주행 중 직전 split은 의미를 구분한다.

## NA / single / sequential twin 변형

| 방식 | 전용 패널 | 플레이 판단 | 금지 사항 |
| --- | --- | --- | --- |
| Raven / NA | profile 기반 고회전 구간 표시 | 높은 RPM 유지와 변속 후 회전 회복 확인 | 빈 boost meter, 0 bar, turbo sound |
| Mirae / single | 단일 actual boost meter, SPOOL/BOOST/LIFT 상태 | lag·가속 준비·잔여 과급 확인. kick 사건에 테두리 pulse | throttle만으로 즉시 full meter, 무조건 full-screen flash |
| Seorin / sequential twin | 왼쪽 `TURBO 1` / 오른쪽 `TURBO 2`의 실제 단계별 계기 | 저회전 응답과 두 번째 단계 연결 확인 | 같은 boostRatio로 두 압력계를 복제 |

현재 트윈은 단계별 동적 상태와 토크 합성을 연결했으므로 두 개의 독립 아날로그 계기를 사용한다. total meter를 추가할 필요는 없다. 현재 엔진 프로파일은 순차식이며 나중에 parallel twin을 추가하면 capability에 따라 같은 단계 UI를 강제하지 않는다.

RPM dial은 0부터 `maxRpm`을 1,000 단위로 올림한 스케일까지 표시하며, red zone 시작 위치와 바늘 색은 profile의 `redlineStartRpm`을 직접 사용한다. RPM 아래에는 차량 종류를 반복하는 `NA`/`TURBO` 상태 문구를 두지 않고, 실제 fuel cut 때만 `REV LIMIT`를 표시한다. speed는 `getDisplaySpeedKmh()`를 공유하고 gear는 profile의 label을 사용한다. boost는 0–1 정규화 비율/segment로 표시하며 압력 모델이 생기기 전에는 bar/psi를 쓰지 않는다. powerband는 torque curve에서 정의한 범위로 표시하고 임의 RPM을 HUD 안에 하드코딩하지 않는다.

자동변속에서는 변속 순간 gear pulse를 사용한다. 수동변속 기능이 없는 상태에서 운전자에게 SHIFT 조작을 요구하지 않는다. countdown의 launch 안내는 launch capability가 있는 차량에만 표시하고 GO 후 정상 패널로 돌아간다.

## 클래스·데이터 경계

기존 `hud.ts`의 `createHudText()`, `renderHudText()`, collision debug banner는 개발 전용으로 유지한다. `gameplayHud.ts`의 `GameplayHud`가 생성자에서 계기 면을 만들고 `update(state, width, height, visible)`에서 바늘·배치를 갱신하며 `destroy()`로 정리한다. 실제 물리를 계산하지 않는다. 사건 인자와 별도 resize API는 후속 확장이다.

`gameplayHudState.ts`의 `createGameplayHudState()`는 순수 adapter다. v1은 speedKmh, gearLabel, rpm, fuelCutActive, boostRatios, elapsedSec, checkpointLabel을 제공한다. 아래는 PB·launch·접근성까지 포함할 후속 확장안이다.

```text
GameplayHudState (후속 확장안)
  run: phase, elapsedSec, sectionLabel, progressRatio, checkpoints,
       previousBestTimeSec, lastCheckpointDeltaSec
  powertrain: induction, speedKmh, gearLabel, rpm,
              idleRpm, maxRpm, redlineStartRpm, powerband,
              fuelCutActive, boostRatio?, stageState?
  launch: enabled, phase, targetBand?
  accessibility: reducedMotion
```

`TimeAttackScene`은 controller/run 갱신 뒤 snapshot과 `PowertrainEvent`를 전달한다. 클래스 내부에서 mutable `PlayerVehicleState`, URL QA config, vehicle ID 조건으로 분기하지 않는다. turbo kick과 stage 사건은 `derivePowertrainFeedback()`가 한 번 생성하고 HUD·`VehicleAudioController`·`VehicleEffectsPresenter`가 공유한다. pulse 종료는 meter actual 값에 영향을 주지 않는다.

`RenderDepth`의 기존 `Ui=7`, `Hud=8`을 임의로 중복 사용하지 말고 gameplay/debug/notice/pause의 순서를 명시적으로 추가한 뒤 [render-layer tracker](./apex-seoul-render-layer-tracker.md)를 갱신한다. v1은 `GameplayHud=7.5`를 추가했고 finish summary 동안 계기를 숨긴다. pause 전용 대역은 후속이다.

## 가시성·모바일·접근성

- 일반 플레이 gameplay ON/debug OFF. 개발/QA 진입만 debug를 명시적으로 켠다. `OptionsScene`과 실제 `TimeAttackScene`이 같은 설정 저장소를 사용한다.
- D는 debug text/banner만 토글한다. timer, RPM, 과급 패널, countdown, finish는 유지한다.
- 844×390, 667×375 landscape에서는 touch controls를 먼저 배치하고 HUD를 상단/안전 영역으로 재배치한다. 데스크톱 좌표를 단순 축소하지 않는다.
- 좁을 때 section 설명·PB 상시표시를 줄여도 timer/speed/gear/RPM/과급 방식·현재 상태는 남긴다. cutout·safe-area·pointer 영역과 차량 앞 시야를 침범하지 않는다.
- resize/orientation change에서 배치를 다시 계산하고 세로 화면은 회전 안내와 pause를 제공한다.
- reduced motion은 shake·flash·pulse 크기를 줄이거나 끈다. 문자·게이지·소리로 같은 정보가 전달되어야 한다.

### Landscape-only 모바일 정책 — 2026-09-21 추가

모바일은 **가로 화면 전용**으로 실행한다. 세로 화면에서는 주행·메뉴 입력을 받지 않고 `ROTATE DEVICE` 안내만 보이며, 이미 진행 중인 run은 pause 상태를 유지한다. 다만 가로 전용은 현재 화면을 그대로 축소해도 된다는 뜻이 아니다.

현재 `1200×760` 논리 viewport와 `Phaser.Scale.FIT` 조합은 844×390 같은 넓은 가로 화면에서 높이를 기준으로 축소된다. 따라서 Scene의 `width < 680` 분기는 논리 폭 1200 때문에 활성화되지 않고, 50px 논리 버튼도 실제 손가락 대상 크기는 약 26px에 그친다. 기존 FIT 캡처의 잘림·page error 없음은 **터치 가독성이나 모바일 승인 근거가 아니다.**

구현 시에는 canvas의 CSS 표시 크기와 safe-area inset을 기준으로 layout mode를 결정한다. 가로 모바일에서는 최소한 다음을 보장한다.

- 메뉴, garage, result의 모든 탭 대상은 실제 표시 좌표에서 최소 `44×44 CSS px`이며, pointer hit area와 보이는 버튼 범위가 일치한다.
- `START → vehicle/color/course → time attack → result → retry/main`을 키보드 없이 완료할 수 있다.
- `Records`와 `CREDITS & LICENSES`는 pointer drag로 목록을 스크롤하고, 각각 화면에 보이는 `BACK TO MENU` 탭 대상을 둔다. mouse wheel은 desktop 보조 입력으로만 남긴다.
- 하단 좌측/우측 touch controls, HUD, progress bar, notch·home indicator safe-area가 겹치지 않는다. HUD는 timer/speed/gear/RPM과 차량별 과급 구조를 우선 보존하고, 보조 설명·상시 PB 표시는 좁을 때 축약한다.
- orientation change, 브라우저 주소창 높이 변화, pointer cancel, blur에서 held touch가 해제되고 run 시간·입력이 안전하게 pause/resume 된다.

`TouchDriveControls`는 `DriveCommand`로만 입력을 전달하며 keyboard 입력과 병합한다. touch UI가 차량 물리, HUD 수치, 저장 설정을 직접 변경해서는 안 된다. `TOUCH CONTROLS` 옵션은 `GameSettingsStore`에 저장되고 실제 control 생성·비활성화에 반영되어야 한다.

### Motion steering·양쪽 페달 설계 — P3-4

가로 모바일의 기본 driving scheme은 **가상 4버튼**이다. 하단 좌측의 `← / →`가 조향, 하단 우측의 `BRAKE / ACCEL`이 제동·가속을 맡는다. 이는 센서 권한 거부·미지원에서도 한 lap을 완주할 수 있는 완전한 fallback이다. Motion Steering을 켜면 조향 버튼은 숨기고 스마트폰 기울기가 조향을 맡으며, `BRAKE / ACCEL` 페달은 그대로 유지한다.

페달은 화면 전체를 누르는 방식이 아니라 차량·HUD·pause 영역과 겹치지 않는 하단 safe-area 안의 명시적 hold control로 둔다. left pointer가 브레이크, right pointer가 가속이며 `pointerdown` 동안만 유지한다. 두 페달이 동시에 눌리면 brake가 우선하고, `pointerup`·`pointercancel`·blur·세로 전환·scene shutdown에서는 두 상태를 즉시 해제한다.

설정 저장 모델은 서로 충돌하는 boolean 대신 `controlScheme: 'virtual' | 'motion'`을 사용한다. 기본값은 `virtual`이며 PC는 keyboard를 계속 우선한다. Options에는 `MOTION STEERING  ON / OFF`만 표시한다. ON은 권한·calibration이 성공하기 전까지 저장하지 않으며, OFF는 즉시 virtual 4버튼으로 돌아간다.

조향은 `DeviceOrientationEvent`의 기울기만 읽어 `-1…1` 아날로그 `steerAxis`로 보낸다. compass/heading인 `alpha`는 사용하지 않는다. keyboard는 기존의 정확한 `-1/0/1` 값을 유지하고, keyboard 방향키가 눌린 동안에는 keyboard가 motion보다 우선한다. controller는 이미 수치 steer axis를 받으므로 P3-4에서 `DriveCommand`와 `mergeDriveCommands()`의 이산형 타입만 연속 값 계약으로 바꾼다. 기존 자동 QA fixture는 그대로 `-1/0/1`을 공급해 desktop 기준선을 보존한다.

#### 권한·calibration·fallback

- 센서 리스너와 권한 요청은 첫 `ENABLE MOTION STEERING` tap처럼 명시적인 사용자 제스처 뒤에만 시작한다. 권한이 없는 브라우저에서는 요청하지 않고 지원 여부를 표시한다.
- 허용 뒤 `HOLD LEVEL` 안내 동안 250–500ms의 안정된 샘플 median을 neutral로 잡는다. 사용자는 pause 메뉴/설정에서 다시 calibration할 수 있어야 하며, 주행 중 임의 자동 recentre는 하지 않는다.
- permission 거부·센서 미지원·초기 calibration 실패는 설정을 즉시 `virtual`로 유지/복귀하고 원인을 한 줄로 알린다. 센서 권한이 없다는 이유로 mobile run을 시작 불가 상태로 만들지 않는다. 주행 중 이벤트가 250ms 이상 끊기면 steer `0`으로 fail-safe 처리하고 virtual 조향 버튼을 다시 보인다.
- raw angle은 dead zone 약 ±2.5–3°, full steer 약 18–22°, 80–120ms 저역 필터와 완만한 비선형 curve를 거친다. `STEERING SENSITIVITY`는 **motion mode에서만** full-steer angle/gain을 조절하며 물리 설정을 직접 바꾸지 않는다. virtual·keyboard mode에서는 숨기거나 disabled `MOTION ONLY` 상태로 표시하고 값을 적용하지 않는다.

#### 기울기와 화면 회전의 분리

기울기 조향은 화면 회전 판정에 사용하지 않는다. 화면 회전은 CSS display size, `resize`, `screen.orientation` 변화만으로 판정한다. `screen.orientation.angle`에 맞춰 beta/gamma 축을 가로 화면 기준의 하나의 steering angle로 변환하므로 OS가 landscape 방향을 바꿔도 좌우 조향 의미가 뒤집히지 않는다.

실제 orientation change가 오면 즉시 motion sample·페달 held state를 무효화하고 P3-1의 `ROTATE DEVICE` pause로 들어간다. 가로 복귀 뒤 `TAP TO RESUME` 다음에 다시 neutral calibration을 거쳐야 한다. Screen Orientation API의 landscape lock은 지원되는 fullscreen 환경에서만 선택적으로 시도하며, lock 실패는 정상 fallback으로 취급한다.

#### 범위와 검증

Vibration API/haptic feedback은 이 playable 범위에서 지원하지 않는다. 따라서 Options에 `VIBRATION` 항목을 두지 않고, 충돌·shift·limiter 피드백은 HUD·소리·시각 효과로만 전달한다.

P3-4 승인에는 30/60/120Hz에서 같은 calibration fixture의 steering output, 권한 허용/거부/미지원, 센서 stale, landscape 0°/90°/180°/270° 축 변환, 회전 중 페달 held, blur/retry/scene shutdown listener 정리, fallback 조향으로 한 lap 완주을 포함한다. 실제 기기에서 left/right pedal과 HUD·progress가 safe-area 안에서 겹치지 않는지도 확인한다.

모바일 회귀 승인은 최소 `844×390`, `667×375`, 짧은 높이의 `640×360` 가로 viewport에서 screenshot과 실제 pointer flow로 수행한다. 각 viewport에서 메뉴의 hit area, garage 4단계, Records/Credits scroll·back, countdown/주행/finish, result retry·main 복귀 및 page error 없음을 확인한다.

### 메뉴별 모바일 개선 목록

아래 항목은 desktop의 키보드·mouse 동작을 제거하는 것이 아니라, 가로 모바일에서 같은 상태 전이를 pointer만으로 완료하게 만드는 작업이다. hover는 색상 보조 피드백으로만 쓰고 선택·활성화의 전제 조건으로 쓰지 않는다.

| 화면 | 현재 위험 | 모바일 개선 | 완료 판정 |
| --- | --- | --- | --- |
| `LoadingScene` / 세로 안내 | 로딩과 세로 화면이 같은 FIT 축소 정책에 묶여 있다. | logical viewport와 분리된 CSS display size 관측, 세로 `ROTATE DEVICE` overlay, 진행 중 run pause 및 orientation 복귀 후 명시적 resume을 둔다. | 세로에서 game input이 발생하지 않고 가로 복귀 뒤 held pointer가 남지 않는다. |
| `MainScene` | 50px 논리 버튼이 FIT 후 실제 44px보다 작아질 수 있다. | 실제 표시 크기 기준의 menu layout과 44px 이상 pointer hit area를 만들고, 작은 높이에서도 네 항목과 선택 상태를 한 화면에 둔다. | 네 메뉴를 각 한 번의 tap으로 열며, 잘못된 중복 scene start가 없다. |
| `VehicleSelectScene` | fixed Y 좌표·작은 색상 swatch·키보드 중심 footer hint가 짧은 가로 화면에 맞지 않는다. | vehicle/color/course/run-ready를 mobile layout mode로 재배치하고, 색상 swatch·confirm·back을 44px 이상으로 한다. footer는 터치 문구로 바꾸고 필요하면 현재 단계만 세로 스크롤한다. | 세 차량×네 색상과 course 확정을 tap만으로 완료하고 선택값이 run setup 및 다음 진입에 보존된다. |
| `RecordsScene` | wheel과 아무 키 복귀만 있어 touch 사용자가 목록을 탐색하거나 나갈 수 없다. | drag scroll(관성은 선택 사항), visible `BACK TO MENU`, empty state를 추가한다. drag 종료는 row 선택·scene 전환을 일으키지 않는다. | 긴 목록의 첫/끝 행을 drag로 확인하고 Back tap 뒤 Main으로 정확히 한 번 복귀한다. |
| `OptionsScene` | 화면 내 값만 변하고 실제 설정 저장소·touch control과 연결되지 않는다. fixed row 간격도 낮은 높이에 취약하다. | `GameSettingsStore`를 연결하고 range는 tap/drag 모두 지원하며, destructive reset은 명확한 두 단계 확인과 취소 경로를 둔다. 목록은 safe-area를 제외한 영역에서 scroll한다. | 새로고침 뒤 steering/audio/reduced-motion/touch 값이 유지·적용되고, reset은 오동작 없이 기록만 초기화한다. |
| `AssetNoticesScene` | wheel 전용 목록 탐색이며 Back 외에는 touch affordance가 없다. | Records와 같은 drag scroll, 항상 보이는 Back, 링크는 화면 안에서 URL 텍스트만 보여 주되 tap이 스크롤과 충돌하지 않게 한다. | 모든 attribution 행을 drag로 읽고 Back tap으로 메인에 복귀한다. |
| `ResultScene` | checkpoint 목록과 두 버튼이 짧은 높이에서 경쟁하며 Retry/Main의 실제 탭 크기가 작아진다. | 정보 밀도별 compact result layout, 44px 이상 `RETRY`/`MAIN MENU`, safe-area 하단 여백을 둔다. | PB/저장 상태/3 checkpoint와 두 action이 가려지지 않고, retry가 새 run을 만들며 main 복귀는 run 상태를 남기지 않는다. |

메뉴 공통으로 모든 interactive object는 `pointerup`, `pointercancel`, scene shutdown을 처리한다. 같은 pointer sequence가 두 번 activate하지 않고, scene 변경 뒤 이전 Scene의 drag·keyboard·pointer listener가 남지 않아야 한다.

## 검증 계약

1. 세 차량 × normal/countdown/shift/fuel-cut/finish에서 profile과 표기가 일치한다.
2. NA에 turbo 요소가 없고 single과 twin은 색상 없이도 구조·label로 구분된다.
3. lift/reapply·RPM 경계·pause/retry에서 사건 pulse가 중복되거나 이전 run에서 넘어오지 않는다.
4. PB 없는 run, checkpoint 이전, 최초 완주에서 가짜 delta/previous best를 만들지 않는다.
5. desktop/mobile screenshot으로 road·sprite·notice·controls 가림을 검사한다.
6. formatter/state 전이 단위 검증, 실제 browser 연결 QA와 production build를 통과한다. v1에서 실행한 항목은 위 구현 상태에 기록했다. 후속 PB·사건·touch 검증은 아직 미완료다.

실행 순서는 [다음 구현 우선순위](./apex-seoul-next-priority-plan.md) 한 곳에서 관리한다.

## 2026-09-13 split 비교 확장 검토

checkpoint·결승에서 전체 PB와 현재 차량 PB의 차이를 두 줄로 함께 표시한다. 전체는 동일 코스·ruleset의 로컬 모든 차량 중 최고 완주 run이며, 두 기준 모두 주행 시작 snapshot을 사용한다. 주행 중에는 누적 checkpoint 대비 `LAST SPLIT`으로 표시하고 무기록은 `--`로 처리한다. 알림 지속 시간·차량명·동률·첫 기록·작은 화면 계약은 [고착 자동 복귀·전체/차량별 기록 검토안](./apex-seoul-recovery-records-plan.md)을 따른다. 2026-09-13 두 PB snapshot과 LAST SPLIT 문자열을 연결했고 결승·Result 화면도 같은 비교 함수를 사용한다. 주행 상단의 두 줄 표시와 결과 캡처를 확인했으며 개별 구간 차분은 후속이다.
