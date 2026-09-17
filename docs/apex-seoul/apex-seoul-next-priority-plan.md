# Apex Seoul 다음 구현 우선순위

갱신일: 2026-09-16

## 2026-09-16 차량 비교 전 공통 주행 수정

차량 비교 전에 공통 선형 속도 환산과 코너 조향 방향 판정을 수정했다. 기존 탈출 검사는 수정 없이 통과했으며, 당시 물리 변화에 맞춘 v3 기록은 보존한다. 이후 변속·엔진 시간 수정은 v4, limiter·Raven 최종 기어 조정은 v5로 분리했다. 근거·검증 범위는 [주행 기준선 점검](./apex-seoul-driving-baseline-review.md)을 따른다.

**TODO: 차량별 핸들링은 `VehicleHandlingProfile` 설정으로 차량 프로파일에 추가한다.** 현재 공통 설정을 기본값으로 보존하고, 성능 비교 후 차등 튜닝한다. 다음 비교는 공통 계기판 단위와 실제 코스 이동량을 함께 사용한다. 현재 공통 상한 225km/h와 차량별 목표 최고속도는 별개이며 목표 성능 달성을 뜻하지 않는다.

브라우저 코너/lift 9개 시나리오와 세 차량의 60/120Hz 비교를 완료했다. [v3 측정 결과](./apex-seoul-vehicle-performance-review.md)는 이전 기준선으로 보존하며, 변속 특성은 [v4 검증](./apex-seoul-shift-character-review.md)에 기록한다. 현재 우선순위는 **Mirae의 유리한 상황 검증 → 차량별 handling 설정 → 차량별 최고속도 목표 재조정**이다.

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

### 1차 구현·검증 (2026-09-17)

`VehicleHandlingProfile`을 추가해 `RuntimeVehicleAsset → createPlayerVehicleRuntimeConfig()` 경로로 연결했다. controller에는 차량 ID 분기가 없고, 공통 상태 기계에 profile이 합성된다. Raven은 조향 응답 1.06·lift 회전 1.10, Seorin은 고속 조향 감쇠 1.12·lift 회전 0.88, Mirae는 조향 응답 0.94·boost 0.70 이상에서만 출구 회복 1.16으로 시작한다.

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

Records는 후속 리뷰에 따라 최근 완주순 `차량 / 시간 / 이름` 단일 목록으로 단순화했다. 주행 중 전체/차량별 split은 유지한다. **TODO: 경기 종료 후 a-z 세 글자 이름 입력**은 이번 구현에서 제외하며 [로컬 저장 설계의 TODO](./apex-seoul-local-save-plan.md#todo--경기-종료-후-영문-세-글자-이름-입력)를 따른다.

## P1 — 차량의 차이를 운전 재미로 만든다

| 작업 | 수정 대상 / 신규 제안 | 완료 기준 |
| --- | --- | --- |
| P1-1 차량별 handling·powerband | `VehicleEngineProfile`, `RuntimeVehicleAsset`, `createPlayerVehicleRuntimeConfig()`, `updatePlayerVehicle()`; 신규 `VehicleHandlingProfile` | Raven의 민첩/속도 유지, Mirae의 lag/출구 가속, Seorin의 넓은 응답/안정감에 각각 장단점 존재 |
| P1-2 과급 상태와 사건 | `EngineBoostProfile`, `getBoostTargetRatio()`; 신규 `PowertrainFeedbackState`, `derivePowertrainFeedback()` | single kick/twin stage/lift/shift를 실제 계산에서 도출. 토크 중복 가산·가짜 압력 없음 |
| P1-3 소리·효과 | `playerPresentation.ts`, `cameraEffects.js`, `speedEffectShader.ts`, `LoadingScene`; 신규 `VehicleAudioController`, `VehicleEffectsPresenter` | RPM/load engine loop, spool·kick·배출음, NA powerband, 타이어·충돌 피드백. mute/reduced motion·lifecycle 정상 |
| P1-4 garage 설명 | `VehicleSelectScene`, catalog capability | 과급 종류·장점·약점·운전 팁이 실제 성능과 일치. 차량 ID로 launch/HUD 효과를 추측하지 않음 |

P1 gate: 동일 조건 가속·제동·코너/구간 시간 측정과 사용자 비교 주행으로 차량별 유리한 상황을 설명할 수 있다. 세 차 중 하나가 모든 상황의 정답이면 재조정한다. 물리 차이 없이 UI 색상만 바뀌는 상태는 완료가 아니다.

## P2 — 기록을 줄이는 판단과 재도전을 만든다

1. `RoadTrack`에 `CourseSection` metadata를 연결하고 checkpoint·코너 예고·결과 이름을 일치시킨다.
2. `CourseRunState`, `RunRecordStore`, `ResultScene`을 연결해 PB run의 구간 비교와 개선 팁 하나를 표시한다.
3. CH-4 선택 apex와 CH-5 grip/drift 비교를 재개한다. 같은 코너의 line·impact·exit speed·section time으로 유용성을 승인하고 변경 전후를 기록한다.
4. 실제 완주 분포로 차량별 medal 목표와 clean-run 도전을 정한다. 타임어택 완주에는 임의 drift 보너스나 중복 충돌 시간 벌점을 넣지 않는다.

완료 기준: 플레이어가 “어느 구간에서 왜 늦었고 다음 run에 무엇을 바꿀지” 알 수 있다. 코스 길이·차량 수 확대는 이 결과를 대신하지 않는다.

## P3 — 플레이 가능한 배포 품질

- `OptionsScene`을 신규 `GameSettingsStore`로 영속화하고 steering/audio/debug/reduced motion을 실제 runtime에 적용한다.
- `DriveCommand`/`mergeDriveCommands()`에 신규 `TouchDriveControls`를 연결한다. keyboard/touch 동시 입력, pointer cancel, blur를 처리한다.
- desktop/mobile safe-area HUD, garage/result touch, orientation/pause, audio unlock과 asset 실패 복구를 확인한다.
- 10회 retry의 listener/audio/particle 누적, storage 거부/손상, 30/60/120fps 기록 오차와 실제 기기 성능을 확인한다.
- 신규 사용자 완주·retry 관찰과 차량 식별 검증을 통과한 뒤 공개 playable로 승인한다. 세부 gate는 [전환 설계](./apex-seoul-playable-game-plan.md)의 검증 시나리오를 따른다.

P0의 pause/시간 보호는 P3까지 미루지 않는다. P1의 소리에 필요한 최소 volume/mute·설정 연결도 그 단계에서 함께 구현한다. P3는 전체 플랫폼 통합 승인이다.

## 회귀 기준과 보류 범위

HR-3K의 무입력 바깥 이탈, rail contact enter/stay/exit, physical steering 기반 sprite, grip/drift 상태와 Raven drivetrain을 기존 기준선으로 유지한다. 기존 문서의 CH/HR 후속 표기는 CH-4/CH-5 제품 과제와 그에 대응하는 HR-4/HR-5 검증을 함께 가리킨다. 수치 변경은 차량 비교·코스 개선과 직접 연결된 경우에만 전후 근거와 함께 승인한다.

변경에 관련된 기존 `qa:vehicle-catalog`, `qa:powerband-reference`, `qa:top-speed-regression`, `qa:handling-relations`, `qa:world-line-cornering`, `qa:neutral-production-corners`, `qa:corner-production`, `qa:guardrail-collision` 및 `build`를 사용한다. 명령과 신규 테스트 범위는 전환 설계에 정리했다. 과거 Raven 중심 fixture를 세 차량 전체 보증으로 간주하지 않는다.

AI/traffic, ghost, 온라인 랭킹, 상점, 새 차량/코스, 대규모 ECS 재작성은 첫 playable의 선행 조건이 아니다. 그 밖의 환경 polish·확장 아이디어는 [후순위 보류 백로그](./apex-seoul-deferred-backlog.md)를 따른다. 이 계획에서 활성화한 HUD·오디오·차량별 게임성은 이전 문서의 보류 순서보다 우선한다.
