# Apex Seoul 다음 구현 우선순위

갱신일: 2026-09-16

## 2026-09-16 차량 비교 전 공통 주행 수정

차량 비교 전에 공통 선형 속도 환산과 코너 조향 방향 판정을 수정했다. 기존 탈출 검사는 수정 없이 통과했으며, 당시 물리 변화에 맞춘 v3 기록은 보존한다. 이후 변속·엔진 시간 수정은 v4, limiter·Raven 최종 기어 조정은 v5, 차량별 terminal speed 정합성은 v6로 분리했다. 근거·검증 범위는 [주행 기준선 점검](./apex-seoul-driving-baseline-review.md)을 따른다.

**TODO: 차량별 핸들링은 `VehicleHandlingProfile` 설정으로 차량 프로파일에 추가한다.** 현재 공통 설정을 기본값으로 보존하고, 성능 비교 후 차등 튜닝한다. 다음 비교는 공통 계기판 단위와 실제 코스 이동량을 함께 사용한다. 현재 공통 상한 225km/h와 차량별 목표 최고속도는 별개이며 목표 성능 달성을 뜻하지 않는다.

브라우저 코너/lift 9개 시나리오와 세 차량의 60/120Hz 비교를 완료했다. [v3 측정 결과](./apex-seoul-vehicle-performance-review.md)는 이전 기준선으로 보존하며, 변속 특성은 [v4 검증](./apex-seoul-shift-character-review.md)에 기록한다. 차량별 handling, terminal speed, 과급 상태·사건 피드백까지 완료했으므로 현재 우선순위는 **P1-3 소리·효과**다.

## 2026-09-17 차량별 terminal speed·변속 RPM 정합성 (v6)

`displayTopSpeedKmh`는 공통 계기판 환산 호환 필드로 유지하고, 실제 full-throttle 상한은 `VehicleEngineProfile.terminalSpeedKmh`로 분리했다. Raven은 물리 구동계·limiter 평형으로 223km/h, Seorin은 공통 safety cap 225km/h, Mirae는 terminal gear RPM envelope과 controller clamp를 함께 적용해 218km/h를 목표로 한다. Seorin의 이전 230 목표는 공통 225km/h envelope 밖이어서 225로 정리했다.

`qa:vehicle-terminal-speed`는 level full throttle 180초 동안 30/60/120Hz별 모든 upshift의 pre-shift·landing RPM, terminal limiter, 최고속도를 기록한다. Raven은 1→6단 후 223km/h·약 7,750RPM, Seorin은 1→8단 후 225km/h·약 7,000RPM, Mirae는 1→6단 후 218km/h·약 7,200RPM으로 limiter를 반복했다. 60/120Hz terminal speed 차이는 0.2km/h 이하였다. Mirae의 최고속도 변화는 기록에 영향을 주므로 `time-attack-v6`를 새 PB 규칙으로 사용하고 v2~v5는 legacy로 보존한다.

## 현재 착수 순서

P0는 정상 완주·기록·시간의 신뢰성을 지키는 release gate다. Retry 오브젝트 수명과 red-zone limiter는 이 범주의 즉시 결함으로 처리했다. P0에 남은 수동 pause/countdown 경계와 실제 touch/mobile 통합은 계속 추적하되, 현재 차량 비교를 막는 결함은 아니다. 따라서 다음 작업은 **P0 전체 완료가 아니라 P1-1 차량별 코너링 프로파일 설계·검증**이다.

1. 세 차량이 같은 입력에서 어떤 코너에 유리해야 하는지 고정한다.
2. 그 차이를 `VehicleHandlingProfile`로 추가하고 공통 controller 기본값에 합성한다.
3. 같은 코스·진입 속도·입력으로 측정해 장점 하나와 비용 하나가 실제로 함께 생기는지 확인한다.
4. 그 결과를 바탕으로 Mirae의 유리한 구간과 차량별 목표 최고속도를 다시 정한다.

## P1-1 다음 착수 — 차량별 코너링 프로파일

공통 도로 폭·조향 방향·충돌·grip/drift 상태 기계와 계기판 단위는 차량 간에 바꾸지 않는다. `updatePlayerVehicle()` 안에서 차량 ID를 분기하지 않고, `RuntimeVehicleAsset`가 `VehicleEngineProfile`과 함께 `VehicleHandlingProfile`을 소유하게 한다. `createPlayerVehicleRuntimeConfig()`가 공통 기본값과 이 프로파일을 합성하는 유일한 적용 지점이다.

첫 프로파일은 조향 응답, 고속 안정성, lift 회전성, 재가속 출구 접지의 네 축만 가진다. 각 축은 기존 `inputResponse`/고속 조향 제한, overspeed understeer·lateral authority, lift drift 진입·회복, grip 복귀·power-on traction에 연결한다. 코너 속도 손실이나 엔진 토크를 차량별로 동시에 바꾸지 않아 원인을 분리한다. 초기 값은 Raven 공통 기준선을 보존하는 중립값에서 출발하고, 한 축씩 변경·측정한다.

| 차량 | 의도한 코너 성격 | 반드시 함께 둘 비용 | 첫 검증 상황 |
| --- | --- | --- | --- |
| Raven NA | 저·중속 진입에서 빠르게 차를 돌리고 lift로 자세를 만들기 쉽다. | 고속 장거리 코너와 power-on 출구에서 가장 안정적이지는 않다. | 감속 진입·lift·counter-steer가 필요한 타이트 코너 |
| Seorin twin turbo | 고속 sweep에서 라인이 안정적이고, throttle을 유지한 출구가 예측 가능하다. | 초기 turn-in과 lift 회전은 Raven보다 둔하다. | 높은 진입 속도의 긴 코너와 유지 가속 출구 |
| Mirae single turbo | spool이 오른 뒤의 저·중속 출구에서 접지를 유지해 속도를 회수한다. | boost 전 turn-in이 Raven보다 즉답하지 않으며, lift로 쉽게 미끄러지지 않는다. | 같은 apex 뒤의 재가속 구간; boost 형성 전·후를 분리 측정 |

Mirae의 출구 장점은 단순한 최고 grip 보너스가 아니다. 엔진의 실제 `boostRatio`와 throttle 재인가 상태가 성립할 때만 power-on traction 축이 작동해야 한다. 따라서 Raven의 회전성과 Seorin의 고속 안정성을 동시에 빼앗지 않으며, boost가 없는 진입에서 Mirae가 전 영역 우승하는 문제를 막는다.

검증 fixture는 동일 코스 구간에서 grip, brake/trail-brake, lift, power-on exit 네 입력을 세 차량에 동일하게 공급한다. entry/apex/exit speed, lateral offset·heading, drift 진입과 회복 시간, 충돌 수, section time을 기록한다. 차량별로 의도한 상황 하나에서는 우위가 나와야 하고, 다른 상황에서는 분명한 비용이 보여야 한다. 30/60/120Hz 결과 차이, recovery, 실제 Chromium 주행도 함께 통과해야 profile 값을 승인한다.

### 자동 balance gate (2026-09-17)

`qa:vehicle-handling-balance`는 profile 성격과 production 구간을 분리해 측정한다. 공유 Raven 엔진과 고정 속도 fixture에서 Raven의 turn-in·lift 회전, Seorin의 더 작은 고속 라인 offset, Mirae의 boost 0.70 전후 recovery 차이를 각각 확인한다. Raven의 turn-in은 Seorin보다 5% 이상, lift 횡이동은 10% 이상 커야 한다. 이어 실제 엔진·Bugak 경사·가드레일을 쓰는 동일 lift 구간을 60/120Hz로 실행해 세 차량의 무충돌 완주와 0.05초 미만의 프레임률 차이를 보장한다. 이 gate는 결정론적 입력에서 의도한 장단점이 유지되는지 판정하며, 최적 랩타임이나 사람의 체감 평가는 별도 브라우저·수동 주행으로 승인한다.

2차 수치 조정 후 60Hz character fixture에서 Raven의 초기 turn-in 횡이동은 1.417로 Seorin 1.197보다 약 18% 컸고, lift 횡이동은 177.756으로 Seorin 160.177보다 약 11% 컸다. Mirae는 boost 0.82에서 0.217초에 grip으로 복귀해 boost 0.40의 0.267초보다 약 0.05초 빨랐다. production Bugak lift 구간의 최대 offset은 Raven 577.180, Seorin 520.757, Mirae 536.188이었으며 충돌은 모두 0회였다.

### 1차 구현·검증 (2026-09-17)

`VehicleHandlingProfile`을 추가해 `RuntimeVehicleAsset → createPlayerVehicleRuntimeConfig()` 경로로 연결했다. controller에는 차량 ID 분기가 없고, 공통 상태 기계에 profile이 합성된다. Raven은 조향 응답 1.12·고속 조향 감쇠 0.82·lift 회전 1.18, Seorin은 고속 조향 감쇠 1.80·lift 회전 0.80, Mirae는 조향 응답 0.92·boost 0.70 이상에서만 출구 회복 1.24로 시작한다.

고정 Bugak 비교(60/120Hz)에서 Raven은 lift 구간의 최대 offset 약 575로 가장 빠르게 자세를 만들고, Seorin은 첫 grip 구간 offset 약 91로 가장 안정적인 고속 라인을 유지했다. Mirae는 boost 0.82의 recovery 한 프레임에서 drift ratio가 0.562→0.556으로 줄었고, boost 0.41에서는 0.562로 일반 회복을 유지했다. 이는 출구 축이 엔진 토크 추가 없이 실제 boost 상태에만 반응함을 확인한 값이다. `qa:vehicle-handling-profile`, vehicle catalog, handling relations, shift character 및 build를 통과했다.

## 2026-09-16 변속 조건·엔진 특성 반영

Seorin 7→8/Mirae 5→6 변속 조건을 수정하고 NA 고회전 유지, single의 압력 재형성, twin의 짧은 변속과 압력 유지를 프로파일로 분리했다. 엔진 시간 중복 진행도 수정했으며 v4 기록은 보존한다. [구현·성능·브라우저 검증](./apex-seoul-shift-character-review.md)을 이전 변속 기준으로 사용한다.

## 2026-09-16 Retry 뒤 코스 오브젝트 소실 조사

**완료.** `ResultScene`의 Retry는 `TimeAttackScene`을 새로 시작한다. 이전 scene의 GameObject는 shutdown 때 파괴되지만, `TimeAttackScene.wallForestSprites` Map은 scene 인스턴스에 남았다. 다음 run에서 같은 나무 ID를 만나면 `syncWallForestSprites()`가 파괴된 Image를 이미 존재하는 sprite로 판단해 새 Image를 만들지 않는 수명주기 결함이었다.

asset cache를 제거하는 경로는 없었다. 도로 Graphics·하늘/parallax·차량은 매 run 다시 만들고, 나무만 scene 수명보다 긴 Map에 보관했다. shutdown에서 Map을 비워 파괴된 Image 참조를 남기지 않는다. 실제 Chromium에서 결과→Retry 10회를 반복해 시작 구간 forest 294개의 live·visible 상태가 매번 첫 run과 같음을 확인했다.

`R` 키의 in-place restart와 결과 화면 Retry는 서로 다른 경로이므로, 이후 scene-owned sprite cache를 추가할 때도 같은 반복 검사를 유지한다.

## 2026-09-16 터보 차량 red-zone limiter 조사

**완료.** 관찰은 맞았지만 원인은 Raven의 주행 limiter가 아니었다. 기존 Raven 6단은 225km/h에서 약 6,000RPM이어서 limiter에 닿지 않았고, 보였던 RPM 변화는 launch control일 수 있었다. Seorin과 Mirae도 최종 기어 RPM 범위가 limiter보다 낮았다.

Raven 6단 비율을 0.97로 조정해 7,750RPM limiter에 도달하게 했고, Seorin 8단과 Mirae 6단의 RPM 상한도 각각 7,000/7,200RPM으로 맞췄다. 목표가 limiter와 정확히 같을 때 RPM smoothing이 임계값 바로 아래에서 멈추던 문제는 1RPM 진입 허용 범위로 해결했다. 자동 상승 변속은 별도 속도 경계로 유지한다.

세 차량은 지속 full throttle에서 limiter 진입·RPM 하강을 보이며, turbo는 fuel cut 중 실제 boost가 빠진다. 30/60/120Hz simulation과 실제 Chromium scene에서 Raven 7,751RPM, Seorin 6,999RPM, Mirae 7,199RPM의 limiter 및 `REV LIMIT` HUD를 확인했다. Raven 평지는 hard cap 없이 약 223.1km/h에서 limiter를 반복하고, 내리막만 225km/h safety cap에 닿는다. 기록 규칙은 `time-attack-v5`이며 v2/v3/v4 PB는 보존하되 현재 PB와 섞지 않는다.

목표: 디버그 주행 환경을 **차량별 운전 전략과 시청각 피드백이 있는 완결된 아케이드 타임어택**으로 전환한다. 각 날짜의 구현·검증 범위는 해당 결과 문서를 따른다.

현재 loop는 `LoadingScene → MainScene → VehicleSelectScene → TimeAttackScene → ResultScene`까지 존재한다. 세 차량 × 네 색상 선택, countdown/checkpoint/finish와 retry도 기반이 있으므로 새로 만드는 항목으로 분류하지 않는다. 기본 gameplay HUD는 연결되었고, PB 비교·mobile 배치, 차량별 handling profile, 실제 Records/Options, 과급 음향·사건 표현, pause/mobile 연결은 출시 작업으로 남아 있다.

이 문서만 실행 순서를 소유한다. [현재 코드 분석·차량·효과·클래스별 구현 설계](./apex-seoul-playable-game-plan.md)와 [HUD 상세](./apex-seoul-hud-plan.md)를 함께 읽는다. 기존 HR-3K까지의 완료 근거·회귀 수치는 [속도대별 핸들링 계획](./apex-seoul-speed-band-handling-plan.md)에 유지한다. 과거 PASS를 이번 검증 결과로 취급하지 않는다.

## 2026-09-10 HUD·엔진 1차 구현

P0-2의 기본 아날로그 RPM·디지털 속도·차종별 boost dial(0/1/2개)을 구현했다. P1-2 중 트윈의 독립 primary/secondary 상태와 토크 합성, 부분 throttle 응답도 연결했다. Raven의 고회전 torque curve와 single의 기존 lag/decay 특성은 유지했다. `qa:gameplay-hud` 및 관련 회귀와 build는 통과했다. P0-2 전체 완료(PB·mobile 전용 배치)나 P1-1의 차량별 handling 밸런스 승인은 아니며, 음향·kick 사건 연출도 후속이다.

## P0 — 정상 플레이의 정보와 기록을 먼저 성립시킨다

| 작업 | 수정 대상 / 신규 제안 | 완료 기준 |
| --- | --- | --- |
| P0-1 선택과 성능 baseline | `TimeAttackScene`, `VehicleSelectScene`, `selectRuntimeVehicleAsset()`, 기존 차량 QA | 3차량×4색상 flow 확인. drivetrain/표시 속도/구간 이동 비교표 확보 |
| P0-2 최소 아케이드 HUD | 기존 `hud.ts` 진단 분리, 신규 `GameplayHud`, `createGameplayHudState()` | 일반 debug OFF에서도 time/speed/gear/RPM/progress 식별. NA/single/twin 기본 패널이 실제 상태와 일치 |
| P0-3 기록·결과·메뉴 | `runRecord.ts`, `TimeAttackResult`, `ResultScene`, `MainScene`, `OptionsScene`; 신규 `RunRecordStore`, `RecordsScene` | 차량/코스/ruleset별 PB, legacy 분리, 최초 기록 표기 수정, 명시적 retry setup, 실제 Records/Reset |
| P0-4 공정한 run 시간 | `courseRun.ts`, `TimeAttackScene`; 신규 `RunSessionController` | 경계 시각 보간, pause/focus 시 입력·시간 보호, QA override 기록 제외 |

P0-2의 NA/single/twin 계기와 독립 boost 상태 연결을 기준선으로 유지한다. 다음 착수는 **P0-3 로컬 저장 기반**이며 상세 계약은 [로컬 저장 설계](./apex-seoul-local-save-plan.md)를 따른다.

1. 코스 catalog·내장 기본값·버전 schema·store를 만들고 코스×차량×ruleset별 PB와 최근 완주 20개를 분리한다.
2. P0-4의 시간 보간·pause/focus·QA override 제외를 함께 연결해 정상 완주 저장 조건을 확보한다.
3. 마지막 선택 복원, 완주 집계, 결과/Records, HUD PB split을 연결한다. PB split은 저장 계약 이후 연결하며 ghost를 기다리지 않는다.
4. Options의 기록 초기화·legacy 이전·저장 실패 복구를 연결하고, 새로고침/세 차량/추가 코스 fixture/초기화 후 기본값 복원을 검증한다.

Retry는 개인 기록을 유지하고, 기록 초기화는 내장 기본 구조로 복귀한다. 기본 개인 PB는 `null`이며 목표 시간을 사용자 기록으로 채우지 않는다. 로컬 저장·마지막 선택·Records·옵션 리셋은 1차 구현했다. 기본값은 내부 배열에서 생성하며, 시간 보간·focus 정지와 HUD PB split은 아래 2026-09-13 반영 현황을 따른다. 구현/보류 경계는 로컬 저장 설계의 구현 현황을 따른다.

## 2026-09-13 고착 복귀·기록 비교 검토 반영

상세 계약과 검증 범위는 [고착 자동 복귀·전체/차량별 기록 검토안](./apex-seoul-recovery-records-plan.md)의 구현 현황을 따른다.

P0-5 고착 복귀, P0-3 Records와 목록 탐색, P0-2 전체/차량 PB LAST SPLIT·결과 비교를 1차 구현했다. P0-4 중 checkpoint/finish 시간 보간·focus/숨김 정지도 함께 연결했다. 다음 확인은 세 차량의 실제 코너 고착/탈출 비교 주행과 판정 임계값 튜닝이다. 수동 pause 메뉴·countdown 잔여 프레임 처리·개별 구간 개선 팁은 남아 있으며 P0-4 전체 완료를 뜻하지 않는다.

Records는 후속 리뷰에 따라 빠른 완주 시간순 `차량 / 시간 / 이름` 단일 목록으로 단순화했다. 페이지 이동 없이 같은 목록을 스크롤하며, 아무 키나 누르면 메인 메뉴로 돌아간다. 주행 중 전체/차량별 split은 유지한다. **TODO: 경기 종료 후 a-z 세 글자 이름 입력**은 이번 구현에서 제외하며 [로컬 저장 설계](./apex-seoul-local-save-plan.md#todo--경기-종료-후-영문-세-글자-이름-입력)의 TODO를 따른다.

## P1 — 차량의 차이를 운전 재미로 만든다

| 작업 | 수정 대상 / 신규 제안 | 완료 기준 |
| --- | --- | --- |
| P1-1 차량별 handling·powerband | `VehicleEngineProfile`, `RuntimeVehicleAsset`, `createPlayerVehicleRuntimeConfig()`, `updatePlayerVehicle()`; 신규 `VehicleHandlingProfile` | Raven의 민첩/속도 유지, Mirae의 lag/출구 가속, Seorin의 넓은 응답/안정감에 각각 장단점 존재 |
| P1-2 과급 상태와 사건 | `EngineBoostProfile`, `getBoostTargetRatio()`; 신규 `PowertrainFeedbackState`, `derivePowertrainFeedback()` | single kick/twin stage/lift/shift를 실제 계산에서 도출. 토크 중복 가산·가짜 압력 없음 |
| P1-3 소리·효과 | `playerPresentation.ts`, `cameraEffects.js`, `speedEffectShader.ts`, `LoadingScene`; 신규 `VehicleAudioController`, `VehicleEffectsPresenter`, `AssetNoticesScene` | RPM/load engine loop, spool·kick·배출음, NA powerband, 타이어·충돌 피드백. mute/reduced motion·lifecycle·라이선스 공지 정상 |
| P1-4 garage 설명 | `VehicleSelectScene`, catalog capability | 과급 종류·장점·약점·운전 팁이 실제 성능과 일치. 차량 ID로 launch/HUD 효과를 추측하지 않음 |

P1 gate: 동일 조건 가속·제동·코너/구간 시간 측정과 사용자 비교 주행으로 차량별 유리한 상황을 설명할 수 있다. 세 차 중 하나가 모든 상황의 정답이면 재조정한다. 물리 차이 없이 UI 색상만 바뀌는 상태는 완료가 아니다.

### P1-2 구현 (2026-09-17)

`powertrainFeedback.ts`가 controller 이후 snapshot의 실제 boost 비율, throttle, gear, shift cut, fuel cut만 읽어 `single-kick`, `twin-stage`, `lift`, `shift`, `fuel-cut` 사건을 도출한다. kick은 65% 상향 통과 뒤 45% 아래로 떨어져야 재무장하고, twin secondary는 10% 진입/5% 이탈 hysteresis를 사용한다. HUD는 limiter를 우선 표시하며 남은 실제 사건만 짧게 표시한다. 이 모듈은 토크·boost 값을 변경하지 않는다. `qa:powertrain-feedback`는 held state 중복, shift-cut 가짜 kick, stage flicker, lift 재무장과 실제 변속·fuel-cut 진입을 검증한다.

### P1-3 SFX·라이선스 제안 (승인 전)

첫 pass는 **CC0 자산만** 사용한다. 엔진 loop는 [OpenGameArt racing car engine loops](https://opengameart.org/content/racing-car-engine-sound-loops), 시동 one-shot은 [Car engine start 01](https://opengameart.org/content/car-engine-start-01), menu/UI는 [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds)를 후보로 한다. Kenney asset page와 지원 정책은 CC0 및 상업 사용 가능을 명시한다. [Digital Audio](https://www.kenney.nl/assets/digital-audio)도 UI 또는 짧은 전자 효과의 보조 후보로 둔다. 외부 파일은 원본 URL·다운로드 일자·author·license 전문 URL을 source 폴더에 그대로 보관하고, runtime에는 가공한 OGG만 넣는다.

`Freesound`는 **CC0 필터 결과만** 두 번째 후보로 허용한다. CC-BY, CC-BY-NC, 라이선스 표기가 불완전한 파일은 첫 pass에서 제외한다. 이후 CC-BY가 꼭 필요하면 작품명·작가·원본 URL·라이선스를 고지 데이터에 넣는 별도 승인으로만 추가한다. [Freesound의 라이선스 안내](https://freesound.org/help/faq/)처럼 파일별 라이선스가 다르므로 사이트 이름만으로 포괄 승인하지 않는다. 고품질 차량 Foley가 CC0만으로 부족한 경우에만 [Sonniss GDC Game Audio Bundle](https://gdc.sonniss.com/)을 별도 후보로 검토한다. 이는 CC0이 아니므로 다운로드 시점의 bundle license와 사용 범위를 source metadata에 고정하기 전에는 import하지 않는다. Pixabay도 독립 배포 제한과 제3자 권리 검토가 있으므로 첫 pass 후보에서 제외한다.

#### SFX 구성과 우선순위

1. **P1-3A — 주행의 지속음:** 차량마다 idle/low-load, mid-load, high-load의 세 RPM loop를 둔다. `VehicleAudioController`는 실제 RPM·throttle·engineTorqueScale만 받아 low/mid/high gain과 playback rate를 crossfade한다. Raven은 자연흡기 고회전 layer만, Mirae는 single spool layer 하나, Seorin은 primary/secondary spool layer 둘을 추가한다. boost 수치가 소리를 직접 키우는 두 번째 토크/가속 보너스가 되지 않게 한다.
2. **P1-3B — 사건 one-shot:** P1-2의 `PowertrainEvent.sequence`을 소비한다. `single-kick`, `twin-stage`, `lift`, `shift`, `fuel-cut`은 각 event sequence당 한 번만 재생한다. shift는 짧은 drivetrain cut, lift는 배출음, kick/stage는 작은 turbine accent로 제한하며, 지속 배기 화염·로켓 같은 과장은 넣지 않는다.
3. **P1-3C — 접지와 충돌:** 실제 `driftState`/slip에는 looped tire scrub를, guardrail `enter`에만 짧은 impact one-shot을 연결한다. `stay`에는 impact를 반복하지 않고, 속도·slip·contact가 없으면 소리도 없다. 타이어/충돌 SFX는 차량의 조향·속도·기록을 변경하지 않는다.
4. **P1-3D — 메뉴와 결과:** Kenney CC0 UI click/confirm/cancel만 먼저 넣고 BGM은 보류한다. 결과·PB 효과는 one-shot 하나로 제한해 엔진 사건과 경쟁하지 않게 한다.

가공 규칙은 source WAV 보존, runtime OGG 44.1kHz 변환, 루프의 무음/클릭 제거, one-shot의 -1dB ceiling 및 동일 event 80ms 재발화 억제다. 모든 재생은 사용자 Start 이후 unlock하며, WebAudio/asset load 실패 시 silent fallback으로 계속 주행한다. pause·hidden·finish·retry·scene shutdown에서는 loop를 pause/stop하고, retry run ID 또는 event sequence가 바뀌면 이전 one-shot을 다시 재생하지 않는다. reduced motion은 camera kick/flash만 끄며 소리와 HUD 사건 표시는 유지한다.

#### 라이선스 공지와 승인 gate

메인 메뉴에 `CREDITS & LICENSES`를 추가하고, 독립 `AssetNoticesScene`에서 `GAME ASSETS` / `AUDIO` / `OPEN-SOURCE SOFTWARE`를 표시한다. 화면과 배포용 `ATTRIBUTIONS.md`는 동일한 `assetAttributions.ts` manifest에서 생성한다. manifest의 각 runtime asset은 `id`, 표시명, category, author, source URL, license ID/URL, 다운로드 일자, 가공 설명, runtime 경로를 가진다. 원본 POC·QA·미사용 다운로드는 공지 목록에 섞지 않고, 실제 번들에 들어가는 자산만 표기한다.

`qa:asset-attributions` 신규 검사는 startup/runtime manifest의 외부 asset마다 attribution ID가 있는지, `CC-BY-NC`·unknown·pending license가 release 목록에 없는지, source URL/license URL/author가 비어 있지 않은지 확인한다. 현재 CC0 환경·Kenney 효과/차량 키트는 이 형식으로 이전하고, 실차 POC 모델처럼 provenance가 아직 미확정인 자산은 공개 runtime 승격과 배포 공지 완료의 blocker로 취급한다.

### 라이선스 공지 1차 구현 (2026-09-17)

Main menu에 `CREDITS & LICENSES`를 추가하고 `AssetNoticesScene`에서 asset category를 나누지 않은 단일 목록으로 모든 현재 고지를 표시한다. `assetAttributions.ts`는 환경 CC0 원본, Kenney smoke/car kit, Sketchfab CC Attribution 차량 원본, Phaser 및 Three.js를 단일 source of truth로 둔다. 작은 화면에서만 동일 목록을 스크롤하며, desktop 기준으로는 전체 항목을 한 화면에 표시한다. source provenance가 없는 runtime asset의 release 승인과 `ATTRIBUTIONS.md` 생성/정합 QA는 여전히 다음 공지 pass의 필수 조건이다.

## P2 — 기록을 줄이는 판단과 재도전을 만든다

1. `RoadTrack`에 `CourseSection` metadata를 연결하고 checkpoint·코너 예고·결과 이름을 일치시킨다.
2. `CourseRunState`, `RunRecordStore`, `ResultScene`을 연결해 PB run의 구간 비교와 개선 팁 하나를 표시한다.
3. CH-4 선택 apex와 CH-5 grip/drift 비교를 재개한다. 같은 코너의 line·impact·exit speed·section time으로 유용성을 승인하고 변경 전후를 기록한다.
4. 실제 완주 분포로 차량별 medal 목표와 clean-run 도전을 정한다. 타임어택 완주에는 임의 drift 보너스나 중복 충돌 시간 벌점을 넣지 않는다.

완료 기준: 플레이어가 “어느 구간에서 왜 늦었고 다음 run에 무엇을 바꿀지” 알 수 있다. 코스 길이·차량 수 확대는 이 결과를 대신하지 않는다.

## P3 — 플레이 가능한 배포 품질

P3는 P1-3 소리·효과와 P1-4 garage 설명 뒤에 착수하는 **가로 모바일 playable release gate**다. 물리·기록 규칙을 다시 설계하지 않으며, 저장된 선택·완주·retry 계약을 touch 경로에서도 동일하게 보장한다. 화면별 요구는 [HUD 설계의 메뉴별 모바일 개선 목록](./apex-seoul-hud-plan.md#메뉴별-모바일-개선-목록)을 단일 상세 기준으로 사용한다.

1. **P3-1 — 표시 크기·orientation 기반:** `Phaser.Scale.FIT`의 logical size와 CSS display size를 분리한다. 가로 mobile layout mode, 세로 `ROTATE DEVICE` overlay, safe-area 측정, resize/orientation pause/resume을 먼저 만든다. logical `width < 680`만으로 mobile을 판정하지 않는다.
2. **P3-2 — 메뉴 pointer flow:** `MainScene`, `VehicleSelectScene`, `ResultScene`의 실제 hit area를 최소 44×44 CSS px로 보장하고, garage 4단계·result Retry/Main을 pointer만으로 완료하게 한다. hover는 필수가 아니다.
3. **P3-3 — 탐색·설정:** `RecordsScene`/`AssetNoticesScene`에 drag scroll과 visible Back을 추가한다. `OptionsScene`은 `GameSettingsStore`를 통해 steering/audio/debug/reduced motion/touch 값을 영속화하고 실제 runtime에 적용한다. reset의 두 단계 확인과 취소도 touch로 가능해야 한다.
4. **P3-4 — motion steering·주행 touch와 HUD:** 기본 `controlScheme: 'virtual'`은 `← / → / BRAKE / ACCEL` 가상 4버튼으로 완전한 주행을 제공한다. `motion`은 기울기 조향만 대체하고 두 페달은 유지한다. `DriveCommand`/`mergeDriveCommands()`를 연속 steer axis로 확장하고 `MotionSteeringController` 및 `TouchDriveControls`를 연결한다. Options의 Motion ON은 사용자 제스처 기반 권한·neutral calibration이 성공한 뒤에만 저장하며, 거부·미지원·초기 실패는 virtual로 복귀한다. screen orientation 축 보정, 센서 stale fallback, keyboard 우선, pointer cancel/blur/pause/audio unlock을 처리한다. `STEERING SENSITIVITY`는 motion mode에서만 적용한다. HUD·progress·controls·notch/home indicator가 겹치지 않게 배치한다. 세부 계약은 [HUD 설계](./apex-seoul-hud-plan.md#motion-steering양쪽-페달-설계--p3-4)를 따른다. Vibration은 지원 범위에서 제외한다.
5. **P3-5 — 설치형 PWA와 내부 설치 UX:** 설치 시작점은 iframe/hub가 아닌 독립 게임 경로 `/game-assets/apex-seoul/`로 고정한다. 게임 source `public/`에서 manifest·192/512·maskable icon을 빌드 산출물로 복사하고, manifest의 `id`/`start_url`/`scope`와 service worker scope를 모두 `/game-assets/apex-seoul/`로 제한한다. `beforeinstallprompt`를 저장해 installable Chromium에서만 `INSTALL APP` action을 보이고, 한 번의 prompt 뒤·`appinstalled` 뒤에는 숨긴다. iframe 안에서는 독립 화면으로 열기를 제공하며, iOS 및 prompt 미지원 환경은 browser mode에서만 홈 화면 추가 방법을 안내한다. service worker와 offline cache는 설치 버튼과 별도 단계이며, 도입 시 게임 runtime asset만 대상으로 하고 race 중 update/reload를 금지한다.
6. **P3-6 — 실제 기기 release QA:** `844×390`, `667×375`, `640×360` 가로 viewport에서 Main의 네 메뉴, garage 4단계, Records/Credits scroll·back, 정상 완주, Result retry/main을 실제 pointer flow로 검증한다. 세로 진입·orientation 전환, 10회 retry listener/audio/particle 누적, storage 거부/손상, 30/60/120fps 기록 오차와 실제 기기 성능도 확인한다. PWA는 Android Chromium 설치 prompt·설치 후 standalone launch·update 안내, iPhone/iPad의 수동 홈 화면 추가 안내·standalone launch를 각각 실제 기기에서 확인한다.

P3 완료 기준: 세 차량×네 색상에서 키보드 없이 `Main → garage → run → result → retry/main`을 수행하고, Records/Credits/Options을 touch로 탐색·복귀·저장할 수 있다. 모든 메뉴 action은 정확히 한 번만 scene 전환하며, 세로 화면은 입력을 막고 run을 안전하게 pause한다. 설치 가능한 환경에서는 게임 안의 action으로 browser-native install prompt 또는 플랫폼별 수동 설치 안내에 도달하고, 설치된 앱은 독립 게임 경로로 실행된다. 신규 사용자 완주·retry 관찰과 차량 식별 검증을 통과한 뒤 공개 playable로 승인한다. 세부 QA는 [HUD 설계](./apex-seoul-hud-plan.md#landscape-only-모바일-정책)와 [전환 설계](./apex-seoul-playable-game-plan.md)의 검증 시나리오를 함께 따른다.

### P3-1 1차 구현 (2026-09-21)

`mobileDisplay.ts`가 Phaser logical viewport와 canvas/container의 CSS 표시 크기를 분리해 `desktop` / `landscape-mobile` / `portrait-mobile` 상태를 제공한다. 모바일 user-agent/iPad 판정만 세로 guard 대상으로 삼으므로 touch monitor를 포함한 PC는 방향과 무관하게 desktop으로 유지된다. `main.ts`의 DOM guard는 모바일 세로 화면에서 `ROTATE DEVICE` overlay로 canvas 입력을 막고, 가로 복귀 뒤에는 `TAP TO RESUME`을 요구한다. `TimeAttackScene`은 세로 전환에서 keyboard held state와 recovery tracking을 해제한 채 시간을 멈추고, 재개 tap 뒤 한 frame을 건너뛰어 이전 입력이 run으로 들어가지 않게 한다.

이 pass는 월드의 `1200×760` 좌표·도로 투영·기존 desktop 레이아웃을 바꾸지 않는다. 메뉴의 실제 44px hit area와 mobile 재배치, safe-area를 쓰는 HUD/controls, touch driving은 각각 P3-2~P3-4의 후속 작업이다. `qa:mobile-display`는 CSS 표시 크기와 logical size의 분리 및 desktop/landscape/portrait 판정을 고정하고, production build를 함께 실행한다.

### P3-3 탐색 1차 구현 (2026-09-21)

`RecordsScene`에 항상 보이는 `BACK TO MENU` pointer action을 추가하고, Records와 `AssetNoticesScene` 모두 wheel 외의 pointer drag scroll을 지원한다. drag/pointer listener는 scene shutdown 때 해제해 Main으로 돌아온 뒤에도 이전 목록의 입력이 남지 않게 한다. 이는 모바일에서 Records를 나갈 수 없던 즉시 결함을 해소하는 탐색 pass이며, 실제 44px hit area·safe-area 재배치는 P3-2, `GameSettingsStore`와 Options의 실제 설정 적용은 P3-3의 다음 pass로 남는다.

`GameSettingsStore` 1차 구현으로 Options의 steering/audio/control scheme/debug 값도 별도 `apex-seoul:settings:v1` 문서에 영속화한다. `MOTION STEERING`은 기본 `virtual`/후속 `motion` scheme을 고르고, `STEERING SENSITIVITY`는 motion 선택 때만 활성화한다. 실제 센서 권한·입력 controller 연결은 P3-4에서 수행한다. `DEBUG MODE`는 다음 `TimeAttackScene` 시작 시 기존 debug HUD를 켜며, `?debugHud=1` URL override도 유지한다. `RESET LOCAL RECORDS`는 이미 `RunRecordStore.resetRecords()`를 호출하므로 화면 이름을 `RESET RECORDS`로 단순화했다. Vibration은 지원 범위에서 제외해 Options와 저장 모델에서도 제거했다. 오디오는 아직 runtime presenter가 없으므로 값만 보존하며 동작 완료로 주장하지 않는다.

### P3-5 PWA 설치 방향 (2026-09-21, 구현 전)

현재 Apex Seoul은 `manifest.webmanifest`, 앱 icon, service worker, `beforeinstallprompt` 처리 없이 Vite 번들을 `/game-assets/apex-seoul/`에 복사하는 구조다. 따라서 `public/game-assets/apex-seoul/`에 결과물을 직접 추가하지 않는다. `build:games`가 이 디렉터리를 매번 비우므로, 게임의 `games/apex-seoul/public/`을 source of truth로 두고 Vite가 `dist`에 복사한 뒤 기존 build script가 public 경로로 옮기게 한다.

설치 대상은 `/games/apex-seoul/`의 iframe 또는 `/play/apex-seoul/` 래퍼가 아니라 `/game-assets/apex-seoul/`의 독립 게임이다. manifest의 `id`, `start_url`, `scope`는 이 경로로 통일하고, service worker를 추가할 때도 같은 하위 경로에 두어 블로그·다른 게임·`/play/`를 제어하지 않게 한다. standalone 실행에도 기존 mobile display guard와 세로 pause/resume 정책을 그대로 적용한다.

게임 안의 `INSTALL APP` UI는 browser-native prompt를 대체하는 가짜 설치 버튼이 아니다. installable Chromium이 준 `beforeinstallprompt` event를 보관했다가 명시적 tap에서 단 한 번 `prompt()`하는 action이다. event가 없거나 이미 standalone이면 action을 숨긴다. iframe 안에서는 설치를 시도하지 않고 독립 게임 화면으로 여는 action을 제공한다. iOS와 prompt 미지원 browser에서는 설치를 강제할 수 없으므로, browser display mode에서만 홈 화면 추가 방법을 안내한다. 이 UI 상태는 개인 기록이나 game settings에 저장하지 않는다.

초기 P3-5의 목표는 **설치 가능한 앱과 안전한 안내**다. offline까지 즉시 약속하지 않는다. service worker는 후속 pass에서 hash된 runtime asset만 cache 대상으로 정하고, manifest/HTML 새 버전은 menu에서만 안내·적용한다. race 도중 worker update·skip waiting·강제 reload를 실행하지 않으며 cache reset과 `RunRecordStore`의 local record reset도 분리한다.

P0의 pause/시간 보호는 P3까지 미루지 않는다. P1의 소리에 필요한 최소 volume/mute·설정 연결도 그 단계에서 함께 구현한다. P3는 전체 플랫폼 통합 승인이다.

## 회귀 기준과 보류 범위

HR-3K의 무입력 바깥 이탈, rail contact enter/stay/exit, physical steering 기반 sprite, grip/drift 상태와 Raven drivetrain을 기존 기준선으로 유지한다. 기존 문서의 CH/HR 후속 표기는 CH-4/CH-5 제품 과제와 그에 대응하는 HR-4/HR-5 검증을 함께 가리킨다. 수치 변경은 차량 비교·코스 개선과 직접 연결된 경우에만 전후 근거와 함께 승인한다.

변경에 관련된 기존 `qa:vehicle-catalog`, `qa:powerband-reference`, `qa:top-speed-regression`, `qa:handling-relations`, `qa:world-line-cornering`, `qa:neutral-production-corners`, `qa:corner-production`, `qa:guardrail-collision` 및 `build`를 사용한다. 명령과 신규 테스트 범위는 전환 설계에 정리했다. 과거 Raven 중심 fixture를 세 차량 전체 보증으로 간주하지 않는다.

AI/traffic, ghost, 온라인 랭킹, 상점, 새 차량/코스, 대규모 ECS 재작성은 첫 playable의 선행 조건이 아니다. 그 밖의 환경 polish·확장 아이디어는 [후순위 보류 백로그](./apex-seoul-deferred-backlog.md)를 따른다. 이 계획에서 활성화한 HUD·오디오·차량별 게임성은 이전 문서의 보류 순서보다 우선한다.
