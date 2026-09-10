# Apex Seoul 다음 구현 우선순위

갱신일: 2026-09-10

목표: 디버그 주행 환경을 **차량별 운전 전략과 시청각 피드백이 있는 완결된 아케이드 타임어택**으로 전환한다. 이번 갱신은 소스 정적 분석과 설계 정리이며 코드 구현·실주행 승인 결과가 아니다.

현재 loop는 `LoadingScene → MainScene → VehicleSelectScene → TimeAttackScene → ResultScene`까지 존재한다. 세 차량 × 네 색상 선택, countdown/checkpoint/finish와 retry도 기반이 있으므로 새로 만드는 항목으로 분류하지 않는다. 반면 gameplay HUD, 차량별 handling profile, 실제 Records/Options, 과급 음향·사건 표현, pause/mobile 연결은 출시 작업으로 남아 있다.

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

P0-2의 twin은 기존 total boost와 계산된 단계 표시까지만 사용한다. 두 개의 독립 stage bar는 P1-2 이후 연결한다. PB split은 P0-3 저장 계약 이후 연결하며 ghost를 기다리지 않는다. HUD 없이 기록 데이터만 계속 확장하지 않는다.

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
