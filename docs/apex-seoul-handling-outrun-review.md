# Apex Seoul Handling Review

갱신일: 2026-07-13

## 목적

이 문서는 Apex Seoul의 주행 감각을 판단하는 현재 기준과 QA 방법을 기록한다. OutRun 계열을 복제하지 않는다. 참조하는 것은 화면 하단 차량의 안정성, 도로 원근으로 커브를 읽는 방식, 그리고 grip/drift/counter의 역할 분리다.

## 현재 모델

### 속도

```text
engine force + slope acceleration
- brake - engine brake - rolling resistance - aero drag
- corner limit - steering scrub
```

- 내부 속도 `760u`는 표시 약 `200 km/h`에 대응한다.
- brake는 Space이며 `brakePressure`로 부드럽게 상승/해제한다.
- RPM, gear, torque, boost, fuel cut은 vehicle profile에서 계산한다.

### Grip

- `steeringVelocity`와 `lateralOffset` 기반의 2차 반응 모델이다.
- 고속에서는 steering force, input response, visual yaw, lateral velocity cap을 줄인다.
- curve force는 원심감 cue이며, 플레이어 조작권을 빼앗으면 안 된다.

### Drift

- 상태: `grip → setup → drift → recovery`.
- entry: 고속·충분한 코너·강한 turn-in·brake 또는 throttle lift.
- `driftLateralVelocity`는 일반 steering velocity와 분리된 momentum이다.
- setup 동안 breakaway momentum을 축적해 옆으로 튀는 느낌을 막는다.
- counter trim은 drift 방향을 유지한 채 slip/momentum을 줄인다.
- 방향 전환은 counter만으로 일어나지 않는다. neutral lift 뒤에 새 counter 입력을 넣고 재가속할 때만 commit한다.

## 2026-07-13 telemetry 판단

60초 실제 주행 로그 기준:

- drift는 의도적으로 진입/유지/회복 가능한 상태가 됐다.
- 전체 속도 평균은 약 `662u`, 최고 `760u`다.
- 542개 sample 중 519개가 최고속의 75% 이상이었다.
- speed effect 평균은 약 `0.77`, FOV 평균은 약 `73.8°`로 고속 연출의 대비가 부족하다.
- straight 평균 속도 약 `653u`, 강한 corner 평균 약 `642u`로 차이가 작다.
- 최대 lateral offset은 약 `105u`로 허용 road offset `700u`에 비해 작다.

해석: 차량이 느린 것이 아니라, 최고속 상태가 너무 오래 이어지고 corner가 라인 선택을 충분히 요구하지 않는다.

## 다음 핸들링 작업

1. speed cue를 속도 비율뿐 아니라 throttle acceleration, downhill, drift exit에 연결한다.
2. corner speed loss를 curve 수치 하나가 아니라 corner grade, apex-ready line, steering scrub과 연결한다.
3. easy bend / sharp bend / S transition별로 목표 속도와 drift 필요도를 다르게 둔다.
4. roadside object pass rate와 corner entry cue를 QA에 추가한다.

## 2026-07-14 고속 Grip과 코스 리듬 재검토

현재 북악 inspired 코스는 내리막과 완만한 curve의 분위기는 전달하지만, 최고속 약 `200km/h` grip만으로 통과 가능한 구간이 많다. 따라서 다음 문제를 `차가 너무 빠르다`로만 해석하지 않는다.

- **코스:** cruise와 technical 구간의 리듬 차이가 약하다.
- **고속 grip:** 과속 때 steering authority가 충분히 남아, brake 없이도 안전 여유를 거의 잃지 않고 돌아갈 수 있다.
- **drift:** sharp/S 구간에서만 라인과 탈출을 돕는 선택지가 되어야 하는데, 현재 코스에서는 사용할 이유가 약하다.

다음 단계는 먼저 section audit이다. 현 코스를 `cruise / commitment / technical / recovery`로 분류하고, 동일 구간에서 무브레이크 최고속 grip·목표 속도 grip·brake/lift drift의 entry/바깥 safety margin/exit을 자동 비교한다. 그 뒤 sharp/technical에서만 고속 understeer를 강화하고, 코스는 짧은 braking commitment → S/전환 → recovery straight의 반복으로 재배치한다.

**블로그 글감:** 실제 산길을 가져오는 일과 레이싱 코스를 만드는 일은 달랐다. 북악의 완만한 흐름은 서울 야간 내리막의 정서를 주지만, 게임에서 모든 curve를 200km/h grip으로 지날 수 있다면 코너는 선택을 요구하지 않는다. 해답은 최고속을 깎는 것이 아니라, 최고속이 허용되는 cruise와 속도를 준비해야 하는 technical section을 분리하는 데 있다.

### 구현: apex 판정 대신 과속 understeer 관계 검증

sharp grade에서 현재 속도가 curve의 기본 speed budget보다 높으면 `gripSteerAngleLimit`을 최대 `54%` 감쇠한다. 더 중요한 변경은 상시 외측 force를 없애고 `overspeedUndersteerLateralVelocity`로 교체한 점이다. 이 값은 과속 sharp 진입에서 curve 바깥 방향으로 build-up하고, 속도를 낮춘 뒤에도 짧게 남았다가 감쇠한다. 따라서 입력이 죽는 대신 차가 넓은 반경으로 흐르는 감각을 목표로 한다.

과속일 때만 작은 speed scrub도 더한다. 이는 flat한 벌점이 아니라, 큰 횡운동을 만든 속도로 들어왔을 때 exit speed에 남는 비용이다. 차량을 특정 apex로 끌어당기거나 “최선 라인 실패”를 채점하는 규칙은 여전히 만들지 않는다.

자동 QA에는 다음 pair를 추가했다.

```text
sharp-overspeed-grip: understeer ratio 1.000 / max outward lateral velocity 68.3u
sharp-prepared-grip:  understeer ratio 0.390 / max outward lateral velocity 25.6u
sharp speed sweep:    entry understeer 600=0.000 / 660=0.427 / 710=0.962
sharp brake recovery: lateral carry 68.3u → recovery 200ms, accidental drift 0
right-lane hold:      entry road offset +0.250 → exit -0.027 (진단용)
```

검증은 과속 understeer 활성화, 사전 제동의 understeer 완화량 `>= 0.30`, 조향 여유 회복량 `>= 0.10`, 과속의 바깥 이동 증가량, 600/660/710 speed sweep의 단계적 understeer·scrub 증가, 브레이크 뒤 횡운동 회복, accidental drift가 없는지를 확인한다. `right-lane-hold`는 현 단계에서 pass/fail이 아니라 lane ratio가 코너 중 얼마나 변하는지를 남기는 진단 시나리오다. browser telemetry에는 `player.overspeedUndersteerRatio`, `player.overspeedUndersteerLateralVelocity`, `player.roadOffsetRatio`를 남긴다.

**참조 결정:** 아웃런 계열의 목표는 조향을 늦게 만드는 시뮬레이션이 아니라, 높은 속도에서 회전반경이 넓어지고 다음 직선의 회복이 달라지는 arcade 감각이다. Disney Speedstorm도 방향 입력으로 trajectory를 조이거나 풀고, 그 조임에 따라 speed loss를 다르게 설계한다. 이 원칙을 따라 Apex Seoul은 속도별 trajectory와 exit 비용을 분리해 검증한다. drift의 counter/accel 역할은 기존대로 유지한다.

**블로그 글감:** 처음에는 과속을 표현하려고 핸들을 더 잠갔다. 수치는 분명해졌지만 차는 무거워졌을 뿐이었다. 다음 수정은 힘의 크기가 아니라 힘의 시간이었다. 코너 진입에서 쌓인 작은 외측 횡운동을 잠깐 남기자, 플레이어는 ‘조향이 막혔다’가 아니라 ‘이 속도로 들어와서 반경이 넓어졌다’고 읽을 수 있게 됐다.

### 2026-07-14 차선 유지 / 중앙 복귀 재검토

우측+가속만 유지한 실주행에서 `roadOffsetRatio`는 평균 `+0.107`에 머물렀고, 마지막 연속 입력 구간에서는 offset이 `+96.6 → +16.5`로 중앙 쪽에 되돌아왔다. 해당 구간의 평균 curve는 거의 `0.045`라서, 코너 자체보다 controller의 상시 `centeringForce = -lateralOffset * centeringResponse`가 입력 의도와 계속 충돌한 결과로 판단했다. 이 force는 elevation과 무관하게 적용되므로, 높낮이가 바뀔 때도 같은 중앙 복귀가 보이는 것은 물리적 경사 반응이 아니라 screen-space 고무줄처럼 느껴진다.

**다른 게임 비교와 결정:** Disney Speedstorm의 공식 설명은 drift 중 방향 입력으로 trajectory를 조이거나 푸는 조작을 핵심으로 둔다. Gran Turismo의 counter-steer/안정화 기능도 상시 중앙 정렬이 아니라 oversteer 같은 상태에서 개입 강도를 달리하는 assist다. 따라서 Apex Seoul도 플레이어가 같은 방향 입력으로 차선을 유지하는 동안 중앙 spring을 약하게 하고, 입력 해제·반대 조향 때만 부드럽게 안정화하는 편이 arcade 감각과 맞다. [Disney Speedstorm 개발자 노트](https://disneyspeedstorm.com/news/disney-speedstorm-dev-diary-drift-mechanics), [Gran Turismo 7 assist 설명](https://www.gran-turismo.com/nz/gt7/manual/drivingoption/03)

구현은 다음 세 규칙으로 적용했다.

1. offset과 같은 방향의 steering hold에서는 centering force를 축소한다.
2. neutral input에서는 더 약한 release centering만 적용하고, 반대 steering에서만 정상 강도로 중앙을 향한다.
3. elevation은 lateral centering의 입력으로 사용하지 않는다. 대신 `roadOffsetRatio`로 level/downhill 모두에서 같은 차선 유지 감각을 자동 비교한다.

자동 검증은 `right-lane-hold-straight`, level/downhill pair, `right-lane-release-recenter`로 구성했다. baseline은 level hold `+0.256 → +0.197`, downhill hold `+0.256 → +0.189`이며, 두 hold 끝값의 차이는 `0.008`이다. release는 `+0.233`에서 250ms 뒤에도 `+0.218`을 유지하고, 시나리오 끝에는 `+0.082`로 점진적으로 안정화한다. hold는 우측 `+0.25` lane을 유지하는지, elevation pair는 같은 입력의 lane ratio 차이가 작은지, release는 즉시 중앙으로 snap하지 않고 점진적으로 안정화하는지를 검사한다. telemetry에는 `player.lateralCenteringScale`도 추가했다.

### 2026-07-14 고속 카운터 입력과 centering 전환 분리

`190km/h` 부근에서 차가 중앙으로 끌리는 실주행 로그를 다시 분해했다. 속도 임계값이 작동한 것은 아니었다. 우측 offset 상태에서 우측 입력은 `lateralCenteringScale = 0.35`를 사용하지만, 좌측 카운터를 누르는 첫 sample에 `1.0`으로 바뀌었다. 예를 들어 `190.8km/h`의 우측 입력은 `0.35`, 이어진 `192.1km/h`의 좌측 입력은 `1.0`이었다. 고속에서 자주 발생한 입력 반전과 속도가 우연히 함께 기록되어, `190km/h`에서 centering이 시작하는 것처럼 느껴진 사례다.

동시에 같은 방향 입력을 유지한 sharp curve에서는 scale이 `0.35`로 그대로인데도 횡 offset이 줄어든 구간이 있었다. 이 움직임은 sharp overspeed의 `overspeedUndersteerLateralVelocity`와 curve force가 만든 것으로, 중앙 복귀 spring과는 별도다. 따라서 속도별 centering 임계값을 추가하지 않는다.

수정은 다음 순서로 한다.

1. 반대 조향 첫 frame에 `0.35 → 1.0`으로 점프하지 않고, 중간 계수에서 시작해 짧은 시간 동안 목표값으로 보간한다.
2. 반대 입력을 짧게 탭한 경우에는 조향만으로 자세를 고치고, 일정 시간 유지한 경우에만 정상 centering 강도를 허용한다. 이는 drift의 카운터 초입을 중앙 복귀 assist가 빼앗지 않게 한다.
3. telemetry에 현재/목표 centering scale, counter hold 시간, 실제 centering force를 기록한다. curve force 및 understeer 횡속도와 함께 보면 고속에서 발생한 이동의 원인을 분리할 수 있다.
4. `190/200km/h counter tap`, `counter hold`, `same-direction sharp grip` 시나리오를 자동화한다. 탭 초반에는 force가 급증하지 않는지, hold에서는 점진적으로 안정화하는지, 같은 방향 hold에서는 scale 전환 없이 understeer만 변화하는지를 비교한다.

**블로그 글감:** 고속에서 차를 중앙으로 끌어당긴 원인은 속도 제한 하나가 아니었다. 카운터를 시작한 순간 보조 힘이 세 배 가까이 뛰는 시간적 단절이었다. 단순히 힘을 줄이는 대신, 카운터의 첫 순간은 운전자에게 맡기고 의도가 유지될 때만 안정화를 이어 붙였다.

구현 후 `counter hold`는 `180ms`, 첫 counter scale은 `0.58`, scale 응답은 초당 `4.8`로 두었다. handling simulation의 `high-speed-counter-tap-190/200`에서 첫 `100ms`와 tap 구간 최대 scale은 모두 `0.58`이고, force 변화량은 약 `17.4`였다. `high-speed-counter-hold-200`은 `300ms`에 scale `1.0`으로 도달한다. 즉 190과 200의 속도 차이로 assist가 조기에 바뀌지 않으며, 짧은 탭은 자세 조작으로 남고 의도적인 hold만 중앙 안정화로 연결된다.

### 2026-07-14 Neutral Release와 Sharp Understeer 연속화

60초 grip 주행의 55초 구간은 counter 보정이 발동한 사례가 아니었다. 우측 입력을 놓자 `lateralCenteringScale`이 `0.35 → 0.45`로 바뀌고, 상승 중인 우측 curve와 기존 횡속도가 합쳐졌다. `55.21s`의 offset `+84.4`, 횡속도 `+16.4`는 `55.76s`에 `+75.0`, `-29.0`으로 반전됐다. 이어 `56.64s`에는 sharp grade 전환과 함께 understeer ratio가 `0 → 0.92`, understeer 횡속도가 `0 → -52.5`로 빠르게 build됐다.

이 문제는 centering 강도를 단순히 낮추는 것으로 처리하지 않는다.

1. neutral release에는 이전 scale을 잠시 유지하는 grace와 별도의 느린 release 응답을 둔다. 입력을 놓은 직후에는 차선 위치와 횡관성을 보존하고, 이후에만 중앙 안정화를 시작한다.
2. neutral 상태에서 중앙 방향 횡속도의 상한을 둬 spring이 커브 힘과 합쳐져 반대편으로 급반전하지 않게 한다. 입력 반대 방향의 counter 및 drift 횡운동에는 이 상한을 적용하지 않는다.
3. sharp 여부의 이산 판정 대신 curve intensity fade와 understeer ratio build/recovery를 사용한다. 코너가 sharp 범위로 들어갈 때도 understeer가 시간적으로 이어진다.
4. 자동 측정은 high-speed `hold → neutral release → curve build`, sharp threshold crossing, 190/200 release pair를 추가한다. release 초반 offset 감소·횡속도 반전·centering force step과 understeer ratio step을 각각 제한한다.

**블로그 글감:** 보정은 힘의 양보다 언제 시작하느냐가 더 중요했다. 손을 놓는 순간 차를 중앙으로 당기면 안정화가 아니라 반대 조향처럼 느껴진다. 손을 놓은 뒤에는 관성을 한 박자 남기고, 코너가 강해질수록 언더스티어도 계단이 아니라 연속된 압력으로 쌓이게 했다.

구현값은 neutral release grace `180ms`, release scale 응답 초당 `0.8`, neutral inward velocity cap `20`으로 정했다. `high-speed-neutral-release-190/200` 자동 측정에서 release `150ms`의 scale은 `0.365`, 첫 `350ms` offset 감소는 `7`, 안쪽 steering velocity 최대는 `20`으로 동일했다. `sharp-understeer-threshold-build`는 understeer ratio 최대 `0.875`를 유지하면서도 sample당 최대 변화량을 `0.123`으로 제한했다. 기존 high-speed counter tap/hold도 함께 통과해 counter 보정과 release 보정이 서로 간섭하지 않음을 확인했다.

**블로그 글감:** 차를 도로 중앙으로 돌려놓는 보정은 처음엔 친절해 보였다. 하지만 플레이어가 오른쪽을 누르고 있는데도 차가 스스로 가운데를 향하면, 안정감이 아니라 조작권을 빼앗기는 느낌이 된다. 차선은 입력으로 지키고, 손을 놓았을 때만 천천히 정리되도록 바꾸는 것이 내리막 레이서의 속도감과 더 잘 맞았다.

## 2026-07-14 Full-throttle Grip 재검토와 다음 단계

### 최신 실주행 audit

수정된 centering/understeer로 60초 동안 `200km/h` 부근의 grip 주행을 다시 기록했다. 드리프트와 브레이크 입력은 모두 `0`이었지만, easy는 평균 약 `750`, medium은 `700` 이상 sample이 `130개`였고, sharp도 최고 `706`까지 가속+조향만으로 통과했다. sharp의 평균 속도는 약 `654`로 실제 감속은 발생하지만, 플레이어가 감속·라인·드리프트 중 하나를 선택하지 않아도 controller가 이 비용을 대신 처리한다.

따라서 문제는 최고속 자체가 아니라 **medium부터 full-throttle grip이 유효한 현재의 speed budget과 코스 리듬**이다. Initial D THE ARCADE의 공식 braking drift 설명처럼 tight corner의 진입은 brake/lift, 조향, 재가속의 순서를 읽을 수 있어야 한다. Apex Seoul은 이를 현실 시뮬레이션으로 옮기지 않고, 고속 arcade의 선택 비용으로 번역한다. [Initial D THE ARCADE braking drift 안내](https://gamecenter-guide.sega.com/en/arcade/racinggame-initiald/), [Sega Power Drift 공식 페이지](https://games.sega.com/3dclassics/powerdrift.html)

### 합의된 구현 순서

1. **P0 — 등급별 속도 예산을 명시하고 계측한다.** provisional 예산은 easy `185~205km/h`, medium `150~170km/h`, sharp `115~140km/h`다. 각 section에 entry/apex/exit speed, brake/lift 시간, line quality, lane excursion을 기록한다. 이 단계에서는 코스와 handling 수치를 바꾸지 않는다.
2. **P1 — 초과 속도를 플레이어가 읽을 수 있는 비용으로 만든다.** medium/sharp에서 예산을 넘긴 full throttle은 front steer authority 저하, 외측 이동, outside-line exit scrub으로 이어진다. 사전 brake/lift는 조향권을 회복하고, 적절한 brake drift는 진입 손실 대신 출구 line을 얻는다. 하드 속도 제한이나 단일 정답 apex 판정은 사용하지 않는다.
3. **P2 — 코스 리듬을 재배치한다.** 최고속 straight/easy 뒤에 braking commitment와 반대 방향 전환을 붙이고, sharp 뒤에만 회복 straight를 둔다. 곡률만 일괄적으로 키우지 않고 진입 cue, apex, exit 정렬의 가치를 가진 section 묶음으로 조정한다.
4. **P3 — 풀액셀 reference를 회귀 기준으로 추가한다.** full-throttle grip, prepared grip, brake drift, easy top-speed를 같은 section에서 비교한다. full-throttle은 technical에서 lane/exit 비용이 생기고, prepared/drift는 line 또는 exit speed 우위를 가져야 하며, easy의 최고속 보상은 유지돼야 한다.

다음 구현 턴에는 이 중 **P0 속도 예산 계측**만 먼저 진행한다. P1 controller 비용화와 P2 코스 수정은 P0 결과를 본 뒤 한 단계씩 적용한다.

### P0 구현 및 자동 측정 결과

P0는 handling 또는 road data를 바꾸지 않았다. `cornerSpeedBudget`, `cornerSpeedBudgetKmh`, `cornerSpeedOverBudget`를 player telemetry에 추가하고, 표시 속도 곡선을 역산해 easy/medium/sharp 예산이 Raven Coupe 기준 약 `195 / 160 / 130km/h`로 읽히게 했다. 자동 시뮬레이터에는 `budget-medium-full-throttle`, `budget-medium-prepared-grip`, `budget-sharp-full-throttle`, `budget-sharp-brake-drift` reference를 추가했다.

```text
medium full-throttle: entry +208u over budget, mean +191u, exit 719u
medium prepared grip: entry   +8u over budget, mean  +99u, exit 705u
sharp full-throttle:  entry +283u over budget, mean +220u, exit 653u
sharp brake drift:    entry +215u over budget, mean +190u, exit 689u
```

prepared medium은 목표 속도로 진입해도 액셀을 계속 유지하면 곧 다시 예산을 넘고, sharp brake drift도 진입 초과량이 여전히 크다. 이것은 코스 부족을 의미하는 결과가 아니라, 현 controller가 과속을 충분히 플레이어 선택 비용으로 바꾸지 못한다는 P1의 기준선이다. 다음 단계는 코스를 수정하지 않고 medium/sharp의 초과 속도에 steering authority·외측 이동·출구 scrub을 연결하는 것이다.

### 2026-07-14 속도 스케일: 현실 차량과 아케이드 차량의 구분

일반 도로 차량에서 `60km/h` 이후 조향 부담이 커진다는 인상은 타당하지만, 이를 Apex Seoul의 절대 속도 규칙으로 복사하지 않는다. 이 게임의 Raven Coupe는 표시 최고속이 `205km/h`이고, 목표는 실제 타이어 모델이 아니라 고속에서 읽히는 위험·준비·보상의 리듬이다. Initial D THE ARCADE는 tight corner에서 braking drift라는 별도 입력 순서를 안내하고, Need for Speed는 grip/drift 성향과 entry angle에 따라 서로 다른 조작 결과를 제공한다. 즉 arcade 레이서의 고속은 ‘60km/h부터 조향 불가’가 아니라, 코너 종류와 진입 속도에 따라 조작의 선택지가 달라지는 방식으로 구현하는 편이 적절하다. [Initial D THE ARCADE braking drift 안내](https://gamecenter-guide.sega.com/en/arcade/racinggame-initiald/), [Need for Speed handling guide](https://www.ea.com/news/handling101), [Need for Speed Unbound drift guide](https://www.ea.com/news/how-to-drift)

| 표시 속도 | Apex Seoul 역할 | P1 이후 기대 조작 |
| --- | --- | --- |
| 0–80km/h | 회복·학습 구간 | 높은 조향권, 강제 understeer 없음 |
| 80–130km/h | 일반 grip 구간 | easy/완만한 medium을 안정적으로 통과 |
| 130–160km/h | medium 준비 구간 | line과 짧은 lift가 출구 품질을 가름 |
| 160–185km/h | commitment 구간 | medium 과속은 외측 이동과 조향권 손실을 만들고, sharp는 brake/lift를 요구 |
| 185–205km/h | 최고속 보상 구간 | straight/easy에서만 유지, technical 진입에는 분명한 비용 |

### 코스 변경 없는 P1 구현 범위

P1은 현재 road segment와 curve 값을 그대로 사용한다. 새 track metadata, 곡률 변경, 충돌, spin, 정답 apex 판정은 넣지 않는다.

1. **P0.1 telemetry 보정** — `cornerSpeedBudgetKmh`가 `null`로 기록된 최신 로그의 표시 속도 변환 인자 순서를 고친다. raw budget과 HUD km/h가 모두 `195 / 160 / 130km/h` 기준을 가리키는지 자동 검증한다.
2. **P1-A medium overspeed band** — `160km/h`를 넘는 medium에서만 budget 초과 비율을 연속 계산한다. 초과 + 액셀 유지 시 grip steer authority를 점진적으로 낮추고 외측 횡이동을 누적한다. lift/brake는 이 값을 빠르게 해소한다.
3. **P1-B safety-margin exit cost** — 특정 apex를 요구하지 않고 `roadOffsetRatio`가 안전 여유를 많이 쓸 때만 exit scrub과 재가속 손실을 준다. 따라서 200km/h full-throttle은 ‘통과’하더라도 출구가 나빠지고, 준비 grip은 같은 코너에서 더 좋은 회복을 얻는다.
4. **P1-C sharp / brake-drift 연결** — sharp는 같은 band를 더 이른 속도에서 강화한다. brake drift는 진입 속도 손실을 지불하지만, understeer와 safety-margin 비용을 줄여 출구 line 또는 1초 뒤 속도에서 이득을 얻어야 한다.

자동 검증은 easy의 `200km/h` grip 통과를 유지하면서, medium `180km/h` full throttle이 prepared grip보다 더 큰 outside excursion/exit loss를 내고, sharp `180km/h`는 brake/lift 또는 drift 없이는 더 좋은 출구를 얻지 못하는 관계를 검사한다. 이 P1 결과로도 최고속 grip이 여전히 모든 코너에서 유효할 때만 P2 코스 리듬 수정으로 넘어간다.

### P1 구현 결과 — 속도·입력 의도 기반 understeer

P0 계측 뒤에도 코스를 바꾸지는 않았다. `cornerSpeedBudgetKmh`의 표시 속도 변환 인자 순서를 바로잡고, medium/sharp의 **budget 초과 + 액셀 유지 + 실제 조향 입력**이 겹칠 때만 understeer를 쌓도록 구현했다. 따라서 straight, 액셀 오프, 또는 neutral steering에서 차가 임의로 바깥으로 밀리지 않는다. understeer는 medium에서 최대 `0.58x`, sharp에서 최대 `1.00x`까지 연속적으로 `gripSteerAngleLimit`을 줄이고, 별도 외측 횡속도를 만들어 회전반경이 넓어지는 결과를 남긴다.

`roadOffsetRatio`가 도로 안전 여유의 26%를 넘으면 `cornerSafetyMarginRatio`를 계산해, 과속 understeer 상태에서만 추가 exit scrub을 준다. 이는 정답 apex를 맞히지 못했다는 판정이 아니라 이미 넓게 흐른 차량의 재가속 비용이다. 드리프트 중에는 이 grip understeer를 만들지 않아 brake drift의 counter/line 제어와 충돌하지 않는다.

최신 `qa:handling-sim` baseline의 핵심 비교는 다음과 같다.

```text
sharp full-throttle: entry +296u, entry understeer 0.420, max 1.000, steer authority 0.379
sharp prepared grip: entry   +0u, entry understeer 0.000, max 0.000, steer authority 1.000
sharp speed sweep:   +30u = 0.106 → +118u = 0.420 → +255u = 0.420 (entry ratio)
medium full/prepared: entry understeer 0.420 / 0.005, steer authority 0.512 / 0.658
sharp brake drift:   drift ratio 0.820, grip understeer 0.000, safety-margin max 0.136
```

속도 sweep의 entry ratio는 build rate 때문에 첫 100ms의 값을 기록하므로, 중·고속 두 case가 같은 초기 `0.420`에 도달한다. 대신 scenario 전체의 최대 understeer·바깥 이동·speed scrub은 증가 관계로 자동 검증한다. baseline은 `97.6/100`이며, 남은 감점은 기존 handling matrix의 후보 비교 항목이다. 다음 실주행 로그에서는 full-throttle sharp가 넓게 흐르는지, lift/brake가 조향권을 자연스럽게 회복하는지를 확인하고, 여전히 최고속 grip 통과가 유효한 section만 P2 코스 리듬 재배치 대상으로 남긴다.

### Grip 반대 조향 결함 수정과 자동 검증

실주행에서 코너 반대 방향 steering으로도 고속 grip 통과처럼 느껴진 사례를 분해했다. 기존 controller는 curve force와 overspeed 외측 횡속도를 모두 lateral offset 축에 직접 더한다. grip 반대 조향과 중앙 복귀 force가 이 값을 상쇄할 수 있어, 실제로는 road 진행선에서 벗어나야 할 입력이 차선 안정화처럼 읽힐 여지가 있었다. 반대 조향은 drift의 자세 제어에서는 필요하지만, grip에서는 공짜 안정화가 되어서는 안 된다.

`gripCounterRoadRatio`와 `gripCounterRoadLateralVelocity`를 분리해 telemetry와 handling simulation에 추가했다. grip 상태에서 curve 방향과 반대 steering을 유지하면 centering scale을 `0.10`으로 낮추고, road 바깥 방향 횡이동과 speed scrub을 별도로 누적한다. drift 상태에서는 ratio가 `0`으로 고정되므로 기존 counter steer 제어에는 개입하지 않는다.

새 `sharp-counter-road-grip` 자동 시나리오는 같은 sharp curve를 풀액셀·반대 조향으로 진입시킨다. 최신 baseline 결과는 counter-road ratio `0.675`, 추가 횡속도 최대 `60.2u`, lateral offset 최대 `441.2u`, safety-margin 최대 `0.479`, 정상 sharp grip 대비 exit speed `82.7u` 손실이다. 즉 반대 조향은 더 이상 grip 통과를 보조하지 않고, 명확한 바깥 이탈과 출구 비용으로 검출된다. 기본 handling matrix의 drift counter/recovery 시나리오도 함께 통과했다.

실주행에서 발견한 짧은 탭의 체감도 `sharp-counter-road-tap`으로 별도 고정했다. `300ms`의 반대 조향 탭은 counter-road ratio `0.837`, 추가 횡속도 최대 `54.0u`, 바깥 offset 변화 `36.6u`를 만들어야 하며 drift ratio는 `0`이어야 한다. 같은 sharp full-throttle 기준보다 exit speed가 최소 `4u` 낮은지도 비교한다. 따라서 짧은 입력이 화면상 중앙에 가까워 보이는 경우에도, 그것이 반대 조향의 공짜 grip 이득으로 회귀하지 않는지를 자동으로 검출한다.

### 다음 tuning — downhill 속도 부채와 고속 understeer 가시화

최신 실주행에서는 sharp 구간의 understeer ratio가 평균 약 `0.83`, 최대 `1.0`까지 기록됐지만, road offset은 대체로 도로 폭의 `15%` 안쪽에 머물고 safety-margin ratio는 `0`이었다. 즉 내부 제한은 작동해도 차가 안전 여유를 실제로 쓰거나 다음 직선에서 손해 보는 모습이 약해, 내리막 `190km/h`대 grip이 비정상적으로 자연스럽게 읽힌다. 차량-도로 sprite 비율은 별도 작업으로 안정화됐지만, 고저 변화도 단순 slope acceleration만으로는 다음 코너의 진입 부담으로 전달되지 않는다.

코스 geometry는 바꾸지 않고 다음을 적용한다.

1. **downhill corner budget carry** — downhill slope가 medium/sharp의 유효 speed budget을 최대 `8%` 낮춘다. 내리막 가속은 유지하되, 그 속도를 technical corner로 가져가면 더 이른 lift/brake가 필요하다.
2. **high-speed outward trajectory** — sharp 과속의 바깥 횡속도를 소폭 높여 `185km/h+` full-throttle이 road width의 약 `25~35%`를 쓰게 한다. drift에는 적용하지 않는다.
3. **early safety-margin exit cost** — safety-margin 시작점을 `26%`에서 약 `16%`로 앞당기고, 약 `32%`에서 충분한 감속 비용이 보이게 한다. scrub은 sharp 과속·accel hold에서만 적용한다. 짧은 counter-road 탭은 기존처럼 별도의 큰 벌점을 받지 않는다.
4. **자동 검증** — level/downhill sharp full-throttle pair, downhill prepared grip, sharp high-speed excursion을 추가한다. downhill full-throttle은 level보다 entry over-budget·outside excursion·exit loss가 커야 하며, prepared grip과 brake drift의 선택 가치는 유지해야 한다.

**블로그 글감:** 내리막의 속도감은 카메라 pitch나 숫자만으로 생기지 않았다. 중력으로 얻은 속도를 다음 코너에서 갚아야 할 때, 도로의 높낮이는 배경이 아니라 운전의 리듬이 된다.

### 구현 및 자동 검증 결과

구현은 road geometry를 그대로 둔 채 controller에만 적용했다. slope acceleration이 `65` 이상이면 medium/sharp의 speed budget을 최대 `8%` 낮추며, 그 상태의 sharp overspeed는 바깥 횡속도를 최대 `55%` 추가한다. 또 도로 폭 `16%`부터 safety margin을 계산해 약 `32%`에서 exit scrub이 충분히 누적되도록 했다. downhill의 추가 감속은 이미 over-budget인 corner에서만 작동하므로 straight의 내리막 가속이나 drift counter 제어에는 영향을 주지 않는다.

새 `downhill-sharp-full-throttle` / `downhill-sharp-prepared-grip` pair와 level 기준 scenario를 자동화했다. 최신 baseline 결과는 다음과 같다.

```text
level sharp full throttle:    budget 448.4u, entry over +283.3u, exit 609.1u, outside 133.7u
downhill sharp full throttle: budget 412.5u, entry over +321.4u, exit 531.0u, outside 177.0u,
                              safety margin 0.082, downhill carry 1.000, drift 0.000
downhill prepared grip:       entry over +111.4u, exit 533.8u, drift 0.000
```

즉 같은 풀액셀 sharp에서 downhill은 level보다 budget이 `35.9u` 낮고, 바깥 이탈은 `43.3u` 커지며 exit은 `78.2u` 낮다. 준비 진입은 full-throttle보다 entry over-budget을 `210.0u` 덜 남긴다. 새 downhill 세부 시나리오는 모두 통과했고, 전체 matrix baseline은 `93.9/100`이다. 남은 `3.3`점 경고는 기존 sharp brake-recovery의 `900ms` 복귀 시간(`800ms` 목표) 하나이며, 이번 downhill 변경의 실패가 아니다.

### 2026-07-14 속도계 재보정과 파워밴드 audit

실주행 telemetry에서 최고 `205km/h`, 상위 10% `202.7km/h`, 평균 `180.3km/h`가 기록됐다. 하지만 `190km/h+` sample은 sharp에 없고 easy/straight 및 일부 medium에 집중됐다. sharp는 평균 `165.3km/h`, 최고 `189.0km/h`, budget 약 `129.5km/h`였으며 understeer는 최대 `1.0`까지 작동했다. 따라서 현 단계의 문제는 physical speed가 아니라 Bugak downhill에 비해 HUD 숫자가 supercar처럼 읽히는 표시 스케일이다.

Raven Coupe의 `displayTopSpeedKmh`를 `205 → 185km/h`로만 보정했다. raw `accelSpeed`, gear ratio, torque curve, downhill acceleration, corner budget은 변경하지 않는다. HUD와 `cornerSpeedBudgetKmh`가 같은 display curve를 공유하므로 기존 HUD `200km/h`는 약 `180km/h`로, 최고 `205km/h`는 `185km/h`로 읽히며, 플레이어가 보는 corner budget도 같은 비율로 정렬된다. telemetry에는 추론 대신 `player.speedKmh`를 직접 기록하고, handling simulation은 Raven display top이 정확히 `185km/h`인지 별도로 검사한다.

파워밴드는 새로 만드는 단계가 아니라 이미 최소 구현돼 있다. Raven은 `1000rpm: 0.28 → 6800rpm: 1.00 → 7800rpm: 0.78` torque curve, gear별 rpm range, redline fuel cut을 사용하고, 이 값이 engine force에 반영된다. Vortex/Apex S에는 turbo spool/peak와 boost 보정도 있다. 다만 현 automatic shift는 shift-cut·변속 지연이 없고 torque 영향 폭도 완만해, 운전자가 변속 타이밍으로 차량 성격을 강하게 느끼는 수준은 아니다. 속도계 재보정이 안정된 뒤 P1으로 `shift torque cut`, profile별 powerband contrast, gear-change telemetry를 추가하는 것이 적절하며, 지금은 handling 변경과 결합하지 않는다.

상세 구현 범위와 자동 측정 기준은 [다음 우선순위 계획의 파워밴드 백로그](apex-seoul-next-priority-plan.md#백로그--차량별-파워밴드와-변속-감각-핸들링-안정화-후)에 고정했다. 이번 턴에는 이 항목의 controller 변경을 하지 않는다.

## QA

### 빠른 controller simulation

```bash
npm run qa:handling-sim --workspace @games/apex-seoul
```

확인 시나리오:

- standing start / straight accel
- micro tap / hold-release / slalom
- curve no-input / curve counter-steer
- lift drift entry / drift counter-steer recovery
- 좌/우 brake drift entry / high-speed grip angle cap
- counter lift exit / explicit counter transition

### 브라우저 telemetry

```text
/game-assets/apex-seoul/?telemetry=1&telemetryDuration=60&telemetryHz=10
```

다음 값으로 실제 플레이와 시뮬레이션을 함께 판단한다.

```text
speed, brakePressure, road.currentCurve, lateralOffset,
steering, steeringVelocity, driftState, driftDirection,
driftLateralVelocity, counterSteerTimer, driftRatio, driftEntryMode,
gripSteerAngleLimit, overspeedUndersteerRatio, driftThrottleLiftTimer,
vehicle.frame, vehicle.visualSteering
```

### 차량-도로 화면 비율 telemetry (2026-07-14)

```text
vehicle.roadWidthAtVehicleY, vehicle.vehicleBodyWidth,
vehicle.vehicleRoadRatio, vehicle.sizeDeltaPerSec
```

차량을 도로 폭에 바로 묶기 전에, 차량 화면 앵커 위치에서 실제로 보이는 포장도로 폭과 sprite 폭의 관계를 기록한다. 이는 높낮이·FOV·원근 변화가 차량을 도로에서 분리해 보이게 하는지 판단하기 위한 시각 QA이며, 주행 물리 지표와는 분리한다.

### Drift throttle modulation (2026-07-14)

실주행에서 drift 중 아주 짧게 액셀을 놓았다가 다시 밟으면, 첫 lift sample에서 곧바로 `recovery`로 전이하고 다음 sample에는 `grip`까지 끝났다. 이 규칙에서는 throttle이 각도 조절이 아니라 즉시 취소 버튼처럼 작동한다.

- drift 중 throttle off는 먼저 `0.28초`의 grace window에 들어간다. 실제 주행의 `0.22초` 경계가 너무 빡빡했던 점을 완화한 값이다.
- 이 안에 다시 가속하면 같은 `driftDirection`과 base lateral momentum을 유지한다. drift entry kick이나 반대 방향 전환은 만들지 않는다.
- lift 중 drift ratio는 `0.44`를 목표로 천천히 낮아져 각도는 줄지만, recovery damping을 즉시 적용하지 않는다.
- grace를 넘긴 lift만 recovery로 종료한다.
- S 전환은 neutral lift 뒤 fresh counter로 arm해야 한다. grace 안의 짧은 neutral blip은 전환을 예약하지 않는다.

자동 시나리오 `drift-throttle-blip-hold`와 `drift-throttle-long-lift-exit`를 추가했다. baseline에서 짧은 blip은 같은 방향 drift 유지, lateral momentum `59.4%` 보존을 기록했고, 긴 lift는 `400ms`에 grip recovery로 끝났다. 기존 `counter-transition`도 여전히 commit한다.

**블로그 글감:** 액셀 오프를 드리프트의 종료 버튼으로 만들면 플레이어는 차를 미끄러뜨릴 수는 있어도 각도를 다듬을 수 없다. 짧은 무동력 구간에는 관성을 남기고, 긴 lift에만 탈출을 주자 throttle이 속도 조절과 자세 조절을 함께 맡게 됐다.

### 차량은 커지는 대상이 아니라 도로에 붙는 기준점이다 (2026-07-14)

차량-도로 telemetry를 추가한 뒤 60초 주행을 다시 측정했다.

```text
roadWidthAtVehicleY : 556~741px
vehicleBodyWidth    : 약 360px (거의 고정)
vehicleRoadRatio    : 48.6~64.6%, 평균 53.1%
```

문제는 차량의 절대 크기가 아니라 도로 폭만 크게 변할 때 생기는 상대적인 분리감이다. 그렇다고 도로 폭의 `70%`를 곧바로 목표로 삼으면, 현재 값이 sprite 사각 프레임 폭인 탓에 좁은 구간에서 차가 지나치게 커질 수 있다.

따라서 첫 road-relative scale은 평균에 가까운 `54%`를 목표로 한다. 각 프레임의 원시 도로 폭을 그대로 따르지 않고, `331~389px`의 제한 범위, `0.6~0.8초` 보간, `±2%` dead zone을 둔다. 목표는 모든 지형에서 동일한 비율이 아니라 약 `52~60%`의 안정된 화면 범위다. 보간 중 허용 범위는 `51~61%`, 크기 변화율은 `80px/s` 이하로 자동 검증한다.

렌더링은 차량과 두 shadow가 같은 계산 결과를 공유하도록 적용했다. `qa:vehicle-road-scale`은 telemetry의 도로 폭 범위를 순환시켜 ratio `51.5~60.8%`, 최대 변화율 `71.3px/s`를 기록했고 세 자동 기준을 통과했다.

**블로그 글감:** pseudo-3D 차량은 실제 도로 위를 달리는 3D 모델이 아니라, 플레이어가 조작을 읽는 화면상의 기준점이다. 그래서 도로의 원근을 완벽히 따라가게 하면 오히려 차량이 zoom하는 UI가 된다. 평균 비율을 지키는 작은 보정과 응답 지연을 넣어, 도로에는 붙어 보이되 화면 기준점은 잃지 않는 쪽을 선택했다.

## 통과 기준

- 직선과 easy bend에서는 drift가 오발하지 않는다.
- brake/lift entry는 재현 가능하지만, 차량이 한 프레임에 옆으로 튀지 않는다.
- counter trim은 angle과 라인만 조절한다.
- counter lift exit은 recovery로 끝나며, neutral lift 뒤 새 counter/re-accel만 반대 drift를 한 번 만든다.
- sharp bend의 속도/라인 손실이 telemetry와 화면에서 함께 읽힌다.

## 2026-07-14 Corner Grade / Line Reward 기록

### 문제

현재 `cornerLineQuality`는 curve가 있는 동안 안쪽 offset에 보상을 주지만, easy bend와 sharp bend가 같은 speed budget 곡선을 공유한다. 그 결과 easy bend도 불필요하게 속도를 잃고, sharp bend는 라인을 선택했을 때의 차이가 충분히 드러나지 않는다.

### 이번 결정

```text
easy   : curve intensity < 0.34
medium : 0.34 <= intensity < 0.70
sharp  : intensity >= 0.70
```

- easy는 corner speed loss와 steering scrub을 약하게 한다. grip으로 빠르게 흘려보내는 구간이다.
- medium은 기존 budget에 가깝게 유지한다.
- sharp는 speed limit, steering scrub, line reward를 모두 강하게 적용한다.
- `cornerLineQuality`는 이번 단계에서 **apex-ready line**이다. curve 방향의 안쪽 offset을 `0.0~1.0`으로 정규화해 sharp bend에서만 보상 차이를 크게 만든다.
- entry–apex–exit의 완전한 레이싱 라인은 future curve를 controller context에 전달한 뒤 구현한다. 현재 값만으로 "항상 안쪽이 정답"인 물리를 만들지 않기 위해, 보상은 속도 budget에만 한정한다.

### 자동 검증

```text
easy-bend-grip:         high-speed grip으로 통과, speed drop은 작고 drift = 0
sharp-bend-line-reward: 같은 sharp curve에서 apex-ready line의 speed budget이 바깥 line보다 높음
```

각 시나리오는 grade, line quality, speed drop을 함께 기록한다. 통과 기준은 sharp line 보상이 easy bend의 공짜 가속으로 번지지 않는 것이다.

### 구현 결과

- `PlayerVehicleState.cornerGrade`와 telemetry에 `straight / easy / medium / sharp`를 추가했다.
- speed limit, corner pull, steering scrub은 grade별 speed-loss scale을 사용한다. 기본값은 easy `0.35`, medium `1.0`, sharp `1.18`이다.
- line reward scale은 easy `0.35`, medium `1.0`, sharp `1.35`다. sharp에서 apex-ready offset이 speed budget에 가장 크게 반영된다.
- 자동 측정 baseline:

```text
easy-bend-grip:          speed drop 0.0u, easy grade ratio 1.0
sharp-bend-apex-line:    entry line quality 0.91, speed drop 53.7u
sharp-bend-outside-line: entry line quality 0.09, speed drop 85.0u
```

같은 sharp bend에서 apex-ready line은 바깥 line보다 약 `31.3u` 적게 잃는다. 이는 코너 전체를 공짜로 빠르게 만드는 보상이 아니라, sharp 진입 때 요구한 위치를 지켰을 때의 speed budget 차이다.

## 2026-07-14 Drift Speed Budget / Exit Recovery 기록

### 로그 관찰

최근 60초 주행에서 grip 평균은 `694.9u`, drift 평균은 `655.3u`였다. sharp 구간만 보면 grip `680.9u`, drift `639.3u`으로 약 `41.6u` 차이가 있다. 따라서 drift에 속도 손실이 전혀 없는 것은 아니다.

다만 첫 drift는 `590u → 747u`까지 길게 재가속했고, 두 번째 brake drift도 entry 부근에서 약 `34u`만 떨어졌다. 현재는 **진입 대가보다 drift 중 재가속이 먼저 읽히는** 구간이 있다.

### 결정

1. **Entry cost**
   - common entry loss에 brake pressure, entry speed, corner grade를 반영한 brake 추가 손실을 더한다.
   - lift entry도 corner grade로 scaling한다.
   - easy에서는 가볍고 sharp에서만 명확한 진입 비용을 만든다.
2. **Bad drift cost**
   - drift 상태라는 이유만으로 상시 감속하지 않는다.
   - sharp bend에서 speed budget을 넘겼고, apex-ready line을 놓쳤을 때만 corner pull과 steering scrub을 강화한다.
3. **Exit alignment reward**
   - recovery 직전 line quality와 남은 drift momentum이 나쁘면 짧은 throttle delay를 둔다.
   - line과 차체가 정리된 exit은 즉시 재가속한다.

### 자동 검증

```text
sharp-brake-drift-apex-line:    sharp 진입의 speed drop과 정상 exit 회복
sharp-brake-drift-outside-line: 같은 진입에서 더 큰 speed drop
sharp-drift-oversteer:          line miss + 과속에서 sustain speed loss
```

각 시나리오는 entry 직전/직후 speed, drift 중 최저 speed, recovery 1초 뒤의 speed gain을 기록한다. 통과 기준은 “정상 drift의 지속 감속”이 아니라, `outside / oversteer > apex-ready`의 손실 관계다.

### 구현 결과

- brake entry에는 brake pressure와 entry speed를 반영하는 추가 loss를 넣었다. easy/sharp entry scale은 각각 `0.55 / 1.25`다.
- drift 중 추가 감속은 outside line에서 speed budget을 초과할 때만 corner pull/scrub에 더한다. drift 상태 자체에는 상시 감속을 넣지 않았다.
- recovery에서는 현재 line quality와 남은 lateral momentum이 나쁠 때만 최대 `0.24초` throttle delay를 둘 수 있게 했다. `driftExitThrottleDelay`는 telemetry와 simulation sample에 남긴다.
- 자동 측정 baseline:

```text
sharp-brake-drift-apex-line:    entry loss 108.3u, exit +1s recovery +15.0u
sharp-brake-drift-outside-line: entry loss 140.7u
sharp-drift-oversteer:          entry-to-budget loss 153.1u
```

같은 sharp brake drift에서 outside line은 apex-ready line보다 `32.4u`를 더 잃는다. 이는 브레이크를 누른 시간 전체의 벌점이 아니라, sharp corner의 line budget에 도달할 때 생기는 차이다.

## 2026-07-14 Handling Relationship Automation

실플레이 telemetry는 감각을 확인하는 자료로 남기되, 같은 sharp 진입과 같은 line을 반복 재현하기 어려운 문제는 controller simulation의 **관계 검증**으로 보완한다.

이제 `qa:handling-sim`은 개별 시나리오의 절대값뿐 아니라 아래 관계가 깨지면 candidate score를 감점한다.

```text
sharp grip:  outside line speed drop - apex-ready line speed drop >= 15u
sharp grip:  brake/lift 없이 drift ratio <= 0.02
sharp drift: outside line entry loss - apex-ready entry loss >= 20u
sharp drift: oversteer entry loss - apex-ready entry loss >= 30u
```

이 방식은 "이 candidate가 90점인가"보다 중요한 질문을 자동화한다. 즉 좋은 라인이 나쁜 라인보다 실제로 이득인지, sharp grip이 drift를 강요하지 않는지, 나쁜 drift가 좋은 drift보다 더 잃는지를 매번 같은 입력으로 확인한다.

## 2026-07-13 Grip/Entry Speed Budget 기록

### 문제

counter와 drift의 역할을 정리한 뒤에도, 일반 고속 코너와 lift entry의 속도 대가가 충분히 분리되어 있지 않았다. lift entry는 공통 진입 손실 `16u`만 갖고 있어, 브레이크 없이도 drift가 너무 가볍게 시작될 여지가 있었다. 반대로 grip은 force, response, visual cue의 고속 감쇠가 겹쳐 실제 차량이 낼 수 있는 조향각과 화면의 조향각을 판단하기 어려웠다.

### 결정

- brake entry는 brake pressure가 만드는 실제 감속을 주 대가로 유지한다.
- lift entry에는 공통 진입 손실에 `22u`를 추가한다. 짧은 리프트에도 drift가 공짜가 되지 않게 하되, 별도 재가속 지연은 아직 넣지 않는다.
- `driftEntryMode = brake | lift`와 `gripSteerAngleLimit`을 telemetry에 남긴다.
- grip 상태에서만 속도 비례 최대 조향각을 적용한다. 속도비 `0.55`부터 시작해 최고속에서 입력 상한 `0.72`까지 부드럽게 줄인다. setup/drift는 이 상한을 우회하므로 drift entry와 counter의 조작권은 보존된다.
- grip 속도 손실은 corner speed limit과 steering scrub으로만 만든다. 고속 풀 조향에는 감속이 생기지만, drift 유지에 프레임별 벌점을 추가하지 않는다.

### 자동 기준

```text
lift drift entry:          entry speed drop >= 30u
brake drift entry left/right: entry speed drop >= 25u, same entry response
high-speed grip angle cap: visual steering 0.45~0.62, corner speed drop 20~110u
```

현재 기준 측정값은 lift `64.6u`, brake left/right 각각 `70.6u`, high-speed grip angle `0.486`, grip corner speed drop `85.3u`다.

### 블로그 글감

**속도를 깎는다는 것은 모든 코너에 같은 감속을 거는 일이 아니었다.** brake drift는 브레이크를 쓴 대가를 읽히게 하고, lift drift는 작은 추가 손실로 의도를 분명히 하며, grip은 고속에서 가능한 핸들각 자체를 줄여 속도와 라인이 함께 정리되게 했다. 이 세 가지를 분리하자 속도계 숫자보다 먼저 입력의 무게가 달라졌다.

## 2026-07-13 Drift Exit/Transition 분리 기록

### 문제

실주행 telemetry에서 counter를 유지한 채 액셀을 놓았을 때 `driftTransitionArmed`가 즉시 켜지고, 재가속 프레임에 반대 방향 drift가 commit됐다. 플레이어가 기대한 것은 drift exit인데, 상태기는 이를 S자 전환으로 해석했다.

### 결정

- `counter + lift`는 반대 drift 예약이 아니라 즉시 recovery다.
- 전환은 `neutral lift → 0.42초 창 안의 fresh counter → re-accel` 순서에서만 arm/commit한다.
- 따라서 counter는 exit 중에도 차를 바로잡는 입력으로 남고, direction change는 의도적인 별도 제스처가 된다.
- telemetry에는 `driftTransitionAwaitingCounter`, `driftTransitionLiftTimer`, arm/commit 시간을 남긴다.

### 자동 기준

```text
counter-lift-exit:        recovery <= 800ms, direction change = 0
counter-transition:       neutral lift 이후 arm, re-accel commit <= 700ms
```

현재 시뮬레이션은 exit recovery `200ms`, explicit transition arm `250ms`, commit `0ms`를 기록한다.

### 블로그 글감

**액셀 오프는 전환 버튼이 아니라 신뢰할 수 있는 탈출구여야 했다.** counter를 누른 채 throttle을 놓는 흔한 정리 동작과, 다음 코너로 차체를 넘기는 S자 전환을 같은 규칙으로 묶으면 드리프트는 화려해지지만 믿을 수 없어진다. neutral lift 뒤의 fresh counter라는 작은 입력 문법을 만들자, 종료와 전환 모두 플레이어가 의도한 순간에만 일어났다.

## 2026-07-13 Counter Trim 보정 기록

### 관찰

drift 방향을 잠근 뒤에도 counter가 지나치게 잘 먹혔다. 원인은 `driftLateralVelocity`가 아니라 일반 `steeringVelocity`였다. 실제 telemetry에서 오른쪽 drift 중 왼쪽 counter를 넣자 drift momentum은 양수로 남았지만, steering velocity가 약 `-108u/s`까지 커져 lateral offset이 반대 라인으로 크게 이동했다.

```text
counter 시작: drift velocity +42.8u/s, steering velocity -47.8u/s
0.22초 뒤:  drift velocity +4.0u/s,  steering velocity -108u/s
약 2초 뒤:   lateral offset +68.8 -> -81.9
```

이는 counter가 “drift angle 조절”이 아니라 “즉시 반대 차선 이동”으로 읽히게 만든다.

### 결정

- drift 중 반대 조향의 steering force를 최대 약 35%까지 줄인다.
- counter steering velocity는 `42u/s`로 별도 cap을 둔다.
- damping 뒤에도 drift 방향 momentum을 최소 `28u/s` 유지한다.
- 따라서 counter는 sprite/angle을 `steer-2 → steer-1`로 완화하고 라인을 천천히 조절한다.
- 반대 drift는 기존처럼 `counter + throttle lift + 재가속`에서만 commit한다.

### 블로그 글감

**드리프트의 방향과 실제 조향을 분리한 뒤에도, counter가 너무 강하면 차는 반대 방향으로 미끄러진다.** 해결은 drift momentum만 유지하는 데 있지 않았다. 일반 steering force도 drift 상태에서는 별도의 authority와 velocity cap을 가져야 했다. 이 분리로 counter는 슬라이드를 끝내는 버튼이 아니라, 같은 방향 drift의 각도와 라인을 다듬는 입력이 된다.

## 2026-07-13 Counter Pull 제거 기록

### 재검토

counter authority를 줄인 뒤에는 반대 차선으로 튀는 문제는 줄었지만, counter 중 drift momentum을 최소값으로 강제 복구하는 로직이 남았다. telemetry에서는 drift momentum과 steering velocity가 서로 반대 방향으로 계속 유지되어 차량이 고무줄처럼 끌리는 감각이 생겼다.

### 결정

- `driftCounterHoldSpeed`의 hard floor를 제거한다.
- counter 시작 시의 drift momentum을 기록하고, `0.45초` 동안 0을 향해 부드럽게 target을 이동한다.
- counter authority는 짧은 입력에서 낮고, 유지 시간에 따라 높아지는 곡선으로 둔다.
- counter만으로 momentum 부호를 반전하지 않는다. 반대 drift는 lift/re-accel 전환만 쓴다.

### 블로그 글감

**아케이드 드리프트에서 counter는 힘을 반대로 더하는 입력이 아니라, 남은 슬라이드의 목표값을 바꾸는 입력에 가깝다.** 최소 momentum을 계속 강제하면 차량은 관성을 가진 것처럼 보이지만, 실제로는 플레이어와 반대 힘이 싸우며 “끌리는” 감각을 만든다. entry momentum을 기준으로 0까지 수렴시키면 drift의 방향은 남기면서도 counter의 해제감과 라인 조절을 함께 만들 수 있다.

## 2026-07-13 Counter Release Drift Resume 기록

### 관찰

counter를 개선한 뒤에도 조향을 놓는 순간 `DRIFT → RECOVERY`로 들어가고, `driftLateralVelocity`가 0에 남았다. 따라서 오른쪽 steer로 시작한 drift에서 왼쪽 counter를 잠깐 넣었다가 놓아도, 원래의 오른쪽 슬라이드가 이어지지 않았다.

### 결정

- drift entry가 만든 `driftBaseLateralVelocity`를 별도로 보존한다.
- counter는 `counterTrimRatio`를 올려 base momentum을 임시로 낮춘다.
- counter 해제 뒤에는 trim ratio가 약 `0.25초`에 걸쳐 감소하며, 같은 방향 drift target이 복원된다.
- throttle을 유지하는 neutral steering은 drift hold다. throttle lift와 neutral, 저속, 커브 종료가 recovery를 만든다.
- 반대 drift는 여전히 counter + lift + 재가속에서만 commit한다.

### 블로그 글감

**counter를 놓는 순간 drift가 끝나면, counter는 제어가 아니라 취소 버튼이 된다.** 아케이드 다운힐에서는 진입 조향이 만든 base momentum을 보존하고, counter는 그 위에 잠시 걸리는 trim으로 다루는 편이 자연스럽다. 이 구조는 “오른쪽으로 흘리며 왼쪽으로 각도를 잡고, 손을 놓으면 다시 오른쪽으로 흐르는” 리듬을 만든다.
