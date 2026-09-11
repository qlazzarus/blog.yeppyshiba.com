# Apex Seoul 플레이 가능한 게임 전환 설계

갱신일: 2026-09-10

상태: 현재 소스 정적 분석에 기반한 구현 제안. 이번 작업은 문서만 변경한다. 브라우저 실주행·새 성능 측정·자동 회귀를 수행한 결과가 아니며, 아래 목표와 초기 튜닝 후보는 구현 완료나 검증된 수치가 아니다. 실행 순서는 [다음 구현 우선순위](./apex-seoul-next-priority-plan.md), HUD 상세 계약은 [HUD 설계](./apex-seoul-hud-plan.md)가 소유한다.

## 후속 구현 메모 — 2026-09-10

아래 분석은 HUD 구현 전 상태를 기록한다. 후속 코드에서 `GameplayHud`, `createGameplayHudState()`, `EngineBoostState`, `getEngineBoostTargets()`, `advanceEngineBoost()`를 추가했다. 이제 NA/싱글/트윈은 아날로그 boost 계기 0/1/2개로 구분되며, 트윈의 두 동적 상태가 실제 토크 합성에도 사용된다. 기본 debug는 OFF다. 상세 구현/검증과 남은 범위는 [HUD v1](./apex-seoul-hud-plan.md)에 기록한다.

## 목표와 출시 범위

현재 pseudo-3D 도로·차량 렌더링은 유지하고, 일반적인 2D 아케이드 레이싱처럼 즉시 읽히는 계기판과 분명한 운전 피드백을 만든다. 첫 playable은 **Bugak 한 코스 × 세 차량의 완결된 타임어택**이다. AI 상대가 없어도 완주, 차량별 기록, 구간 개선과 재도전이 가능하면 하나의 게임으로 성립한다.

핵심 재미는 코너를 읽고 → 감속·라인·가속 시점을 선택하고 → 차량별 응답을 느끼고 → 구간 기록으로 결과를 확인하는 과정이다. 차를 바꾸면 같은 코너의 접근법도 달라져야 한다. 터보는 별도의 니트로 버튼이나 소모 자원이 아니라 RPM·스로틀·잔여 과급에 의해 생기는 엔진 특성으로 유지한다.

첫 출시 필수: 기본 조작 안내, 차량 선택, countdown, gameplay HUD, 차량별 동력·핸들링 개성, 엔진/터보/타이어/충돌 음향, checkpoint 비교, 완주·기록·retry, 일시정지, 정상 동작하는 설정, 모바일 가로 입력, 저장 실패 대응. AI·교통·고스트·새 코스·튜닝 상점·온라인 랭킹은 이 범위 이후다. 고스트 없이도 PB checkpoint 비교를 제공한다.

## 코드에서 확인한 현재 상태

아래 경로는 모두 `games/apex-seoul/src/game/` 기준이다. 실제 클래스와 함수·타입을 구분한다.

| 근거 | 현재 구현 | 게임 관점의 빈틈과 개선 |
| --- | --- | --- |
| `LoadingScene`, `MainScene`, `VehicleSelectScene`, `TimeAttackScene`, `ResultScene` | 로딩→차량/색상/코스→주행→결과 흐름 존재 | 새로 만들기보다 처음 온 사람이 설명 없이 완주·재시도할 수 있는지 연결 QA 필요 |
| `hud.ts`의 `createHudText()`, `renderHudText()`, `ApexHudState`; `TimeAttackScene.debugHudVisible = true` | 속도/RPM/gear/boost가 물리 진단 텍스트 안에 있음. D로 숨김 | 일반 플레이 기본 debug OFF, 독립 gameplay HUD 필요. Options의 DEBUG MODE 초기 false와 실제 상태도 통합 |
| `engineProfile.ts`의 세 `VehicleEngineProfile` | NA/싱글/트윈, torque curve, 기어, spool/decay가 이미 다름 | 차이의 존재와 재미의 검증은 별개. garage·HUD·소리와 연결하고 동일 구간에서 측정 |
| `getBoostTargetRatio()`, `updatePlayerVehicle()`의 powertrain 갱신 | RPM 기반 목표를 하나의 `boostRatio`로 보간. 트윈의 secondary stage도 목표값 계수 | 트윈의 두 터빈 압력을 독립 측정하는 상태가 아님. HUD용 두 단계 상태를 물리와 함께 정의 |
| `playerVehicleDefaults.ts`의 `createPlayerVehicleRuntimeConfig()` | 선택한 engine profile과 공통 조향·제동 기본값을 전달 | 차량별 handling profile이 catalog에 없음. 엔진 차이를 핸들링 차이로 잘못 설명하지 말 것 |
| `getDisplaySpeedKmh()`, `getGearRpm()` | Raven은 physical drivetrain/선형 표시, 나머지는 arcade/보간 표시 | 표시 km/h만 맞춘 비교는 공정성 보장 못 함. 실제 코스 이동·구간 시간까지 함께 검증 |
| `courseRun.ts`의 `updateCourseRunProgress()` | 경계를 넘은 프레임의 elapsed를 checkpoint/finish로 기록 | 프레임 간격에 따른 기록 오차가 있음. 이전/현재 진행량으로 경계 시각 보간, 큰 delta 정책 필요 |
| `runRecord.ts`의 `loadBestRunTime()`, `saveBestRunTime()` | track ID 하나로 best 숫자 저장, 저장 예외 방어 있음 | 차종/규칙 버전/구간 기록 없음. 다른 차량의 PB가 섞임 |
| `MainScene.create()`, `OptionsScene.create()` | Records는 COMING SOON, Options는 로컬 UI prototype, Reset 미연결 | 노출된 메뉴를 실제 기능과 연결 |
| `TimeAttackScene.init()`, `ResultScene.create()` | retry는 scene data 없이 재시작, module의 `ACTIVE_RUN_SETUP` 재사용 | 현 동작은 있으나 결과 DTO에 setup을 담아 명시적으로 전달하도록 개선 |
| `ResultScene`의 `bestLine` | first run 저장 뒤 bestTime이 채워지면 이전 기록 표기가 현재 기록으로 계산될 수 있음 | `previousBestTimeSec`를 명시해 최초 기록/갱신/미갱신을 분리 |
| `sceneInput.ts`의 `DriveCommand`, `mergeDriveCommands()` | 공통 입력 함수 존재 | touch·pause/focus lifecycle의 실제 연결 필요 |
| `playerPresentation.ts`, `cameraEffects.js`, `speedEffectShader.ts` | burnout, tire cue, 카메라·속도 효과 기반 존재 | 과급 사건별 효과·음향 소비 계층 추가. 기존 속도 효과와 중복 과장 금지 |

`src`에서 전용 audio manager 및 pause/visibility/focus 보호 연결을 확인하지 못했다. Phaser 자체 동작에 기대어 출시 완료로 판정하지 않고 브라우저에서 별도 검증한다. 기존 문서의 PASS 기록은 과거 회귀 근거이며 이번 분석의 실행 결과가 아니다.

## 차량별 성능과 캐릭터

### 현재 엔진 정의

값은 `engineProfile.ts`의 설정값이며 실측 최고속·가속 순위가 아니다. accelerationScale만으로 빠른 차량을 판단할 수 없다.

| 차량 | 과급/구동계 | 표시 속도 envelope / 기어 | powerband·과급 설정 |
| --- | --- | --- | --- |
| Raven Coupe | NA / physical | 225 km/h / 6단 | torque peak 6,400–6,600 RPM, shiftUp 7,400, redline 7,200 |
| Mirae GT | single-turbo / arcade fallback | 218 km/h / 6단 | start 3,000, peakStart 4,800, spoolRate 2.25, decayRate 1.55, baseTorqueRatio 0.64 |
| Seorin GT | sequential twin-turbo / arcade fallback | 230 km/h / 8단 | start 2,100, peakStart 3,600, main 3,900–4,700, spoolRate 5.4, decayRate 2.8, baseTorqueRatio 0.82 |

Seorin의 순차식은 현재 게임 코드의 설정이다. 모든 현실 트윈터보가 순차식이라는 의미로 일반화하지 않는다.

### 목표 플레이 성격 — 신규 제안

| 차량 | 플레이어가 느낄 장점 | 명확한 약점 | 운전 전략·표현 |
| --- | --- | --- | --- |
| Raven | 가속 응답이 예측 가능하고 방향 전환이 민첩, 속도를 유지한 연속 코너에 유리 | 저회전 탈출 가속이 약해 큰 감속의 대가가 큼 | 높은 RPM을 유지하며 깔끔한 grip. 밝아지는 powerband와 고회전 엔진음 |
| Mirae | 기다림 뒤 강한 중고회전 가속, 가속 시점을 맞춘 출구에서 보상 | 저회전 lag와 과급 중 무리한 가속의 라인 부담 | apex 이후 여유에 맞춰 throttle 준비. 단일 boost 상승과 한 번의 kick |
| Seorin | 저중회전 응답과 넓은 가속 영역, 긴 코너의 안정감 | Raven보다 느린 방향 전환과 S구간 준비 필요 | early spool→두 번째 단계 연결을 살린 넓은 라인. 두 단계 표시와 두 음색의 연결 |

이 성격은 현재 구현된 차량별 handling의 설명이 아니다. 신규 `VehicleHandlingProfile` 타입에 turn-in response, 고속 steering authority, brake response, grip/slip 및 recovery 특성을 작은 범위로 정의하고 기존 `PlayerVehicleControllerConfig`로 해석한다. 차종별 if 분기를 `updatePlayerVehicle()`에 누적하지 않는다. 모든 차량의 무입력 바깥 이탈·rail boundary·counter 규칙은 공통으로 보존한다.

`RuntimeVehicleAsset`에 엔진과 함께 handling 및 presentation capability 참조를 둔다. `VehicleSelectScene`은 catalog에서 과급 방식, 장점·약점, 추천 운전법을 읽는다. 이름 옆에 가짜 마력이나 검증 전 가속 점수를 쓰지 않는다. launch 지원도 현재 `TimeAttackScene.init()`의 ID 조건에서 capability로 옮긴다.

세 차의 drivetrain을 즉시 전부 다시 쓰지는 않는다. 먼저 표시 속도·world travel·gear RPM·0–100·80–140·제동거리·동일 코너 exit speed와 section time을 측정한다. 표시만 빠르고 도착은 같은 문제, 전 영역에서 한 차가 우세한 문제를 확인한 뒤 공통 물리 단위/표시 매핑을 정하고 재보정한다. 기존 225 km/h와 HR-3K 수치는 기준선으로 보존하되 변경 승인은 전후 측정으로 남긴다.

## 과급 상태와 터보가 터지는 순간

### 물리·상태 계약

기존 `EngineBoostProfile`, `getBoostTargetRatio()`와 `updatePlayerVehicle()`를 확장한다. 현재처럼 fully-spooled torque curve에 과급 가용 비율을 곱하는 원칙을 유지하고, 효과가 토크를 한 번 더 더하지 않게 한다.

- NA는 boost 상태 없이 실제 RPM·토크·부하로 powerband를 표시한다.
- single은 실제 total ratio, 목표 ratio, 상승/유지/감쇠 상태를 제공한다.
- sequential twin은 primary/secondary stage의 가용 상태와 total ratio를 공통 계산 함수에서 만든다. 단계별 동적 상태를 추가하면 각각 시간 응답을 갱신하고 두 단계 합성이 기존 최대 토크를 초과하지 않게 보정한다.
- 두 번째 게이지를 같은 total ratio로 복제하거나 HUD가 RPM만 보고 가상의 독립 압력을 만들지 않는다. 단계 계산을 아직 추가하지 못했다면 total meter + 단계 활성 표시를 사용한다.
- 현재 값은 0–1 정규화 비율이다. 실제 압력 모델·maxBoostBar가 없으므로 `bar`/`psi`로 표시하지 않는다.
- 현 `getBoostTargetRatio()`의 cornerPenalty는 throttle 유지 중에도 곡률 때문에 과급이 줄 수 있다. 플레이어가 이해 가능한 부하·스로틀 규칙으로 바꿀지 A/B 검증하고, grip 손실과 이중 불이익이 되는지 조사한다.

신규 순수 함수 `derivePowertrainFeedback()`와 타입 `PowertrainFeedbackState`, `PowertrainEvent`를 `powertrainFeedback.ts`에 제안한다. controller 갱신 전후 snapshot으로 사건을 한 번만 생성하고 HUD·오디오·VFX가 같은 사건을 소비한다. 읽기 전용 snapshot에는 induction, RPM, gear label, total/stage ratio, throttle, shift/fuel-cut, run phase를 포함한다.

### 사건별 시청각 계약

아래 시간·임계값은 초기 후보이며 실주행에서 승인한다.

| 사건 | 발생 조건 | 화면·소리 | 중복 방지 |
| --- | --- | --- | --- |
| spool | 유효 throttle에서 actual ratio 상승 | 게이지 채움, turbine whine의 음높이·볼륨 상승 | 연속 상태. 매 프레임 one-shot 재생 금지 |
| single kick | actual ratio 0.65 상향 통과 + 양의 상승률 + 실제 구동 부하 | 150–250ms 게이지 테두리 pulse, 짧은 가속음, 제한적 speed-line 증폭 | 0.45 아래로 내려간 뒤 재무장, 0.5초 cooldown |
| twin stage engage | 계산된 secondary stage 활성 경계 통과 | 두 번째 segment 점등과 다른 whine layer. single보다 작은 pulse | stage별 hysteresis, RPM 경계에서 깜빡임 금지 |
| lift / blow-off | 직전 boost가 충분하고 throttle 급감 또는 제동 전환 | 짧은 배출음과 meter 감쇠 | 입력 전환 한 번당 한 번. NA 제외 |
| shift | 실제 gear 변경 및 shift cut | gear 강조, RPM/음높이 하강 | gear event 기준. 자동변속에 수동 SHIFT 지시를 강제하지 않음 |
| fuel cut | 실제 fuelCutActive 진입 | redline 경고와 끊기는 엔진음 | 진입/유지 구분, 점멸 최소화 |
| NA powerband | 유효 부하에서 profile의 유효 고회전 영역 진입 | RPM band 점등, 흡기·엔진음 강화 | turbo kick·blow-off 재사용 금지 |
| rail impact / tire slip | contact enter / 실제 slip 상태 | 짧은 충돌음·스파크 / 타이어음·제한적 연기 | stay에서 충돌음을 반복하지 않음 |

배기 화염은 터보 spool의 필수 효과가 아니다. 나중에 vehicle capability와 shift/lift 사건으로 짧게 추가할 수 있지만, 과급 중 지속 화염이나 차량 뒤 로켓 추력은 기본 연출에서 제외한다. 먼저 게이지·whine·배출음·짧은 가속 반응만으로 차이를 읽히게 한다.

신규 `VehicleAudioController` 클래스는 RPM/load loop, turbo layer, one-shot과 pause/shutdown 정리를 소유한다. 신규 `VehicleEffectsPresenter` 클래스는 사건 기반 pulse·particle 수명과 pool을 소유하고 `playerPresentation.ts`의 anchor 및 기존 camera/speed effect와 합성한다. pause/finish/retry에서 이전 사건을 재생하지 않으며 run ID·event sequence를 초기화한다. 효과는 steering pose·충돌 위치·기록을 변경하지 않는다. reduced motion에서는 kick 카메라 변화와 flash를 끄고 게이지·문자·소리는 유지한다.

## 주행 목표·실패·반복 동기

- 첫 모드는 time attack이다. 없는 상대의 `POSITION 1/8`, 없는 lap, 소모되지 않는 nitro meter를 만들지 않는다. 타이머는 경과 시간이며 제한시간 생존 모드는 후속으로 구분한다.
- `road.ts`의 `RoadTrack`에 신규 `CourseSection` metadata를 연결한다. recovery straight, commitment corner, S transition의 구간 이름·경계를 checkpoint와 공유한다. 코너 예고는 해당 진입 전에 읽히되 차량 앞 도로를 가리지 않는다.
- grip은 기본, drift는 tight/S 구간에서 선택이다. 같은 진입 조건에서 line, rail impact, exit speed, section time으로 비교한 뒤 CH-4/CH-5를 재개한다. 단지 drift했기 때문에 시간 보너스를 지급하지 않는다.
- 충돌은 현재 물리 감속을 대가로 사용하고 임의 시간 벌점을 중복 추가하지 않는다. 결과에는 contact enter 횟수·가장 손실이 큰 구간·다음 시도 팁 하나를 제시한다. 속도 손실 수치는 근거가 있는 측정일 때만 표시한다.
- 차량별 Bronze/Silver/Gold 목표와 clean-run 도전을 제안한다. 목표 시간은 세 차량의 실제 완주 분포로 정하며 아직 임의 수치를 확정하지 않는다. 처음부터 모든 차량을 선택 가능하게 유지한다.

### 기록과 시간의 신뢰성

2026-09-11 저장 계약 구체화: [로컬 저장 설계](./apex-seoul-local-save-plan.md)가 저장 schema·내장 기본값·초기화·호환성의 상세 기준이다. localStorage 기반으로 마지막 선택, 코스×차량×ruleset별 PB와 최근 완주 20개를 저장한다. 저장소가 비어도 catalog와 기본값 factory로 모든 기록 행을 복구하며 개인 PB는 `null`로 시작한다.

`RunRecordStore` 신규 클래스가 기존 `runRecord.ts` 함수를 대체/감싸며 schemaVersion, rulesetVersion, trackId, vehicleId, bestTimeSec, checkpointTimesSec를 저장한다. 색상은 기록 key에 포함하지 않는다. geometry/handling/drivetrain 변경으로 기록 비교가 달라지면 rulesetVersion을 바꾼다.

기존 track-only 기록에는 차량 출처가 없으므로 세 차에 복제하거나 Raven 기록으로 추정하지 않는다. legacy 별도 보관·표시 후 새 규칙의 PB를 시작한다. PB run의 누적 checkpoint와 이번 누적 checkpoint를 비교하고, 별도 best-sector 조합을 실제 PB run인 것처럼 표시하지 않는다. 최초 기록·느린 완주·새 PB·저장 거부·손상 데이터·Reset을 모두 정의한다. 저장 실패 때 현재 세션 기록은 유지하고 저장되지 않았음을 결과에 짧게 알린다.

`TimeAttackResult`에 `runSetup`, `previousBestTimeSec`, `recordPersisted`, 구간 비교 데이터를 추가한다. `ResultScene` retry는 명시적으로 같은 setup을 전달한다. 신규 `RecordsScene`은 차량/코스별 PB를 보여주며 Options reset은 이 store를 통해 현재/과거 규칙·legacy 개인 기록을 비우고 기본 기록 문서를 저장한다. 선택·설정은 유지한다.

`courseRun.ts`의 경계 통과 시각은 이전 progress/time과 현재 값을 사용해 보간한다. 한 프레임에 여러 checkpoint를 통과해도 각각 계산한다. `RunSessionController` 신규 클래스가 countdown/running/paused/finishing/result와 게임 시간을 관리한다. blur/visibility loss 때 입력을 비우고 일시정지하며, 복귀 시 명시적인 재개를 받는다. 무작정 delta를 버려 slow-motion 기록이 생기지 않도록 simulation step과 타이머 정책을 함께 검증한다. QA timeScale/skip/freeze/튜닝 override를 쓴 run은 일반 PB 저장 대상에서 제외한다.

## 구현 책임 지도

신규 이름은 설계 제안이며 현재 존재하는 클래스로 오인하지 않는다. 파일 경로는 `src/game/` 기준이다.

| 기존 클래스·함수·타입 | 개선 내용 | 신규 제안과 경계 |
| --- | --- | --- |
| `TimeAttackScene` (`timeAttackScene.ts`) | input→simulation→snapshot/events→presentation 순서, lifecycle 정리 | `RunSessionController`: 시간/상태. Scene은 GameObject 연결·종료 |
| `VehicleEngineProfile`, `EngineBoostProfile` (`engineProfile.ts`) | stage 계산과 induction capability, 단위 일관성 | stage 계산 함수는 물리와 HUD의 공통 source |
| `updatePlayerVehicle()`, `PlayerVehicleControllerConfig` | 차량별 handling 해석, 실제 boost와 event 근거 노출 | `VehicleHandlingProfile` 타입, 기존 물리 계약 보존 |
| `RuntimeVehicleAsset`, `selectRuntimeVehicleAsset()` | profile/capability/garage 설명 연결 | renderer가 차량 ID로 엔진·효과를 추측하지 않음 |
| `createHudText()`, `renderHudText()` | 진단 전용 유지 | `GameplayHud` 클래스 + `createGameplayHudState()` 순수 adapter |
| `playerPresentation.ts`, `cameraEffects.js`, `speedEffectShader.ts` | 기존 anchor·효과 budget 공유 | `VehicleEffectsPresenter`, `derivePowertrainFeedback()` |
| `LoadingScene`, `startupAssetManifest.ts` | 첫 run 필수 audio asset 로딩·실패 fallback | `VehicleAudioController`: 사용자 Start 이후 unlock, mute·pause·destroy |
| `VehicleSelectScene` | induction, 성격, 장단점 및 조작 힌트 | catalog 기반 표시, 차량 정보 중복 상수 제거 |
| `MainScene`, `ResultScene`, `runRecord.ts` | 실제 Records, 최초 PB 수정, retry setup 명시 | `RunRecordStore`, `RecordsScene` |
| `OptionsScene`, `sceneInput.ts` | 저장된 설정 적용, touch와 keyboard 통합 | `GameSettingsStore`, `TouchDriveControls` 클래스 제안 |
| `RoadTrack`, `CourseRunState` | section metadata·경계 시각·PB split | `CourseSection` 타입, 렌더/판정이 동일 경계 사용 |
| `RenderDepth` (`renderDepth.ts`) | gameplay/debug/notice/pause 대역 구분 | 실제 변경 시 render-layer tracker 동시 갱신 |

대규모 ECS 전환은 이 목표의 선행 조건이 아니다. 위 책임은 기능을 붙일 때 필요한 만큼 추출하며 Scene을 단순 파일 분할하는 작업으로 대체하지 않는다.

## 완료 판정과 검증 시나리오

자동 QA는 물리 오류를 막고, 실주행은 재미를 승인한다. 다음은 향후 구현 시 수행할 기준이다.

| 검증 | 승인 기준 |
| --- | --- |
| normal flow | 3차량 × 4색상으로 start→countdown→finish→retry→main 확인. 선택·sprite·HUD·결과·저장 key 일치 |
| 차량 성능 | 고정 출발/입력의 가속, lift/reapply, 제동, sharp/S exit 측정. 차량별 장점 구간 최소 하나와 약점 설명 가능 |
| 조작 숙련 | 초보 플레이어 5명 대상 초기 gate 제안: 4명 이상이 별도 구두 설명 없이 완주·retry, 두 번째 시도에서 바꿀 행동을 말함 |
| 차량 식별 | 동일 외형/이름을 가린 비교에서 응답·HUD·음향으로 NA/single/twin 차이를 설명. 숫자 차이만으로 승인하지 않음 |
| 과급 사건 | throttle 유지, lift, 재가속, shift, redline, braking, pause/retry로 one-shot 중복·잔류 0건. NA boost UI 없음 |
| HUD | 1280×720, 1920×1080, 844×390, 667×375 및 safe area에서 timer/speed/gear/induction 가독. D OFF에서도 필수 HUD 유지 |
| 기록 | 최초/갱신/느린 run, 차량 교체, legacy, 손상/거부 storage, reset, QA override, background 복귀에서 기록 오염 없음 |
| 프레임·성능 | 30/60/120fps 같은 입력 replay의 checkpoint/finish 차이 목표 0.02초 이내. desktop 60fps, mobile 최소 안정 30fps를 실제 기기에서 측정 |
| 반복 수명 | 10회 retry 후 listener·audio loop·particle 수가 누적되지 않음. WebGL/audio 실패 시 복구 경로 확인 |

기존 명령 중 변경 관련 항목을 실행한다: `qa:vehicle-catalog`, `qa:launch-control`, `qa:powerband-reference`, `qa:top-speed-regression`, `qa:handling-relations`, `qa:world-line-cornering`, `qa:neutral-production-corners`, `qa:corner-production`, `qa:guardrail-collision`, `qa:camera-effects`, `qa:speed-cue`, `build` (모두 `npm run <명령> --workspace @games/apex-seoul`). 기존 스크립트의 차량·drivetrain fixture 범위를 확인하고 세 차로 확장해야 하며, 현 명령이 이미 모든 목표를 검증한다고 가정하지 않는다. 신규 HUD/event/store/time 테스트는 순수 상태 계약을 검증하고 browser QA는 실제 사용자 흐름을 검증한다.
