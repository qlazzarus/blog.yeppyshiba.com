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
| Raven / NA | `NA · POWER BAND`, profile 기반 고회전 구간 표시 | 높은 RPM 유지와 변속 후 회전 회복 확인 | 빈 boost meter, 0 bar, turbo sound |
| Mirae / single | `TURBO`, 단일 actual boost meter, SPOOL/BOOST/LIFT 상태 | lag·가속 준비·잔여 과급 확인. kick 사건에 테두리 pulse | throttle만으로 즉시 full meter, 무조건 full-screen flash |
| Seorin / sequential twin | `TWIN TURBO`, 왼쪽 `TURBO 1` / 오른쪽 `TURBO 2`의 실제 단계별 계기 | 저회전 응답과 두 번째 단계 연결 확인 | 같은 boostRatio로 두 압력계를 복제 |

현재 트윈은 단계별 동적 상태와 토크 합성을 연결했으므로 두 개의 독립 아날로그 계기를 사용한다. total meter를 추가할 필요는 없다. 현재 엔진 프로파일은 순차식이며 나중에 parallel twin을 추가하면 capability에 따라 같은 단계 UI를 강제하지 않는다.

RPM dial은 0부터 `maxRpm`을 1,000 단위로 올림한 스케일까지 표시하되 redline과 실제 fuel cut을 구분한다. speed는 `getDisplaySpeedKmh()`를 공유하고 gear는 profile의 label을 사용한다. boost는 0–1 정규화 비율/segment로 표시하며 압력 모델이 생기기 전에는 bar/psi를 쓰지 않는다. powerband는 torque curve에서 정의한 범위로 표시하고 임의 RPM을 HUD 안에 하드코딩하지 않는다.

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

## 검증 계약

1. 세 차량 × normal/countdown/shift/fuel-cut/finish에서 profile과 표기가 일치한다.
2. NA에 turbo 요소가 없고 single과 twin은 색상 없이도 구조·label로 구분된다.
3. lift/reapply·RPM 경계·pause/retry에서 사건 pulse가 중복되거나 이전 run에서 넘어오지 않는다.
4. PB 없는 run, checkpoint 이전, 최초 완주에서 가짜 delta/previous best를 만들지 않는다.
5. desktop/mobile screenshot으로 road·sprite·notice·controls 가림을 검사한다.
6. formatter/state 전이 단위 검증, 실제 browser 연결 QA와 production build를 통과한다. v1에서 실행한 항목은 위 구현 상태에 기록했다. 후속 PB·사건·touch 검증은 아직 미완료다.

실행 순서는 [다음 구현 우선순위](./apex-seoul-next-priority-plan.md) 한 곳에서 관리한다.
