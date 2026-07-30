# Apex Seoul 출발 rev·launch control·burnout 설계

갱신일: 2026-07-27

상태: LCH-1~LCH-5 구현 완료. 후속 traction-release tuning과 CC0 smoke-sprite pass를 적용했다. P1 time attack loop의 countdown 후속으로만 구현한다. 오디오 작업은 범위에서 제외한다.

## 문서 목적

현재 countdown은 일반 플레이에서 3초 동안 차량과 run timer를 정지시키고, QA URL은 즉시 시작한다. 이 정지 구간에 가속 입력의 의미가 없어서 출발이 평평하게 느껴진다.

이 문서는 다음을 하나의 출발 상호작용으로 정의한다.

```text
countdown 중 throttle
  → clutch-disengaged rev build
  → GO 순간 RPM/입력 판정
  → 짧은 clutch engagement
  → rear-tire burnout 시각 효과 + 조건부 launch force
  → 일반 물리 주행으로 복귀
```

목표는 출발을 한 번의 작은 판단으로 만들되, 기존 Raven Coupe의 파워밴드, 코너링, 최고속과 standing-start 회귀를 바꾸지 않는 것이다.

## 제품 판단

### 채택 방향

**접근성 있는 rev limiter + 짧고 조건부인 launch 보정**을 채택한다.

- countdown 중 Up 입력은 엔진 RPM만 올린다. 차량 위치, speed, run timer는 진행하지 않는다.
- 키보드의 on/off throttle을 고려해, pre-launch RPM은 적정 영역 근처에서 limiter로 머문다. 단순히 버튼을 계속 눌렀다는 이유로 fuel cut 실패를 강제하지 않는다.
- GO 순간에도 throttle을 유지하면 RPM에 따라 launch quality를 한 번 판정한다.
- 좋은 출발의 보상은 낮은 속도에서만 끝나는 작은 engine-force 보정이다. speed를 순간 증가시키거나 전역 engineAcceleration을 바꾸지 않는다.
- burnout은 출발 직후의 rear-tire cue이며 drift 상태, lateral velocity, steer authority를 재사용하지 않는다.
- 오디오·engine sample·타이어 소리는 이 pass에 넣지 않는다.

### 비교와 적용

| 방향 | 관찰 | Apex Seoul 적용 |
| --- | --- | --- |
| Gran Turismo식 | 출발에서는 접지가 잡힌 뒤 가속을 여는 것이 핵심이며, 과한 wheelspin은 정답이 아니다. | 높은 RPM 자체가 항상 최고 보상이 되지 않게 한다. 적정 RPM만 짧은 force 보정을 받는다. |
| Forza식 | traction control은 과도한 휠스핀에 제동/출력 컷으로 대응해 controller에서도 안정적인 출발을 만든다. | 키보드 플레이어를 위해 pre-launch limiter를 둔다. 과회전은 화려하지만 더 빠르지 않다. |
| 아케이드 레이서식 | 출발 순간의 연기, 짧은 진동, 화면 flash가 체감 보상으로 작동한다. | 물리 drift를 만들지 않고 후륜 연기·스크럽·짧은 speed cue만으로 만족감을 만든다. |

참고: [GT7 Beyond the Apex](https://www.gran-turismo.com/sg/gt7/apex/driving_technique/07), [Forza Motorsport accessibility/traction control](https://support.forzamotorsport.net/hc/en-us/articles/46524064744851-Forza-Motorsport-Accessibility-Support).

## 현재 코드 제약

- `updatePlayerVehicle()`은 speed에서 gear RPM을 계산한다. 정지 상태에서는 throttle을 눌러도 RPM이 작은 throttle lift 이상으로 올라가지 않는다.
- Raven Coupe는 `6,400–6,600rpm`에서 토크 피크를 갖고, production 0–100 기준은 약 `8.1초`다.
- 현재 drift는 중·고속 코너의 횡운동 상태다. 출발 번아웃에 연결하면 낮은 속도에 가짜 lateral motion과 잘못된 drift transition을 만든다.
- `tireScrubGraphics`는 player 아래의 독립 렌더 레이어이며, 현재 understeer line cue에만 쓴다. start 전용 cue를 이 레이어에 추가할 수 있다.

## 상태·입력 설계

### 상태 모델

`CourseRunState` 또는 launch 전용 상태에 아래 값을 둔다.

```ts
type LaunchState = {
    burnoutRemainingSec: number;
    clutchEngagement: number; // 0 = 분리, 1 = 완전 결합
    launchForceRatio: number;
    quality: 'none' | 'cold' | 'hooked' | 'overrev';
    startRpm: number | null;
};
```

`countdown` 동안에는 `clutchEngagement = 0`이다. GO 직후 약 `0.12–0.18초` 동안 1로 보간한 뒤 launch state를 제거한다.

### pre-launch rev

1. 첫 기어를 유지하고 camera/vehicle speed는 0으로 잠근다.
2. Up 입력이 있으면 RPM target을 launch limiter까지 올리고, limiter 도달 뒤에는 fuel cut band 안에서 반복한다.
3. Up을 놓으면 idle RPM으로 감쇠한다.
4. countdown 중에는 fuel-cut, 자동 변속, boost 및 run timer를 실행하지 않는다.

초기 Raven 값은 다음 범위로 시작한다.

| 범위 | RPM | 결과 |
| --- | ---: | --- |
| cold | `< 4,800` | 일반 출발, 시각 cue 없음 |
| hooked | `5,800–6,600` | 짧은 burnout과 launch force |
| overrev | `> 6,800` | 더 긴 burnout, 접지 손실로 force 보정 없음 또는 감소 |

키보드 기본 limiter는 `6,400rpm`, fuel-cut recovery는 `5,800rpm`으로 둔다. 따라서 Up을 유지하면 고정 RPM 대신 해당 band를 반복하며 hooked 영역에 머문다. 실제 idle까지 떨어뜨리지는 않아 GO 판정과 키보드 반응을 안정적으로 유지한다.

### GO 판정과 힘

- GO 프레임에서 Up이 눌려 있고 start RPM이 `hooked` 범위면 quality를 `hooked`로 고정한다.
- `hooked`는 `0.45–0.60초` 동안 engine force의 최대 `+8–10%`만 추가한다.
- 보정은 `45km/h` 전후에서 0으로 감쇠하며, 첫 gear의 정상 torque/shift schedule은 그대로 사용한다.
- `cold`는 기존 force 식 그대로 시작한다.
- `overrev`는 연기 지속 시간은 늘리되, traction penalty 때문에 `hooked`보다 빠를 수 없다.
- 입력을 GO 전에 놓거나 GO 후 즉시 brake하면 launch effect를 취소한다.

**금지:** speed 직접 가산, camera.z 직접 이동, 전역 `engineAcceleration` 변경, corner/drift 계수 변경.

## burnout 시각 효과

### 의도

화면상 차량 뒤쪽 접지점에서만 “후륜이 잠깐 헛돈 뒤 노면을 문다”는 감각을 만든다. 지속 smoke로 차체·코스를 가리거나, grip 상황을 drift처럼 보이게 하지 않는다.

### 채택: Graphics skid + CC0 smoke-sprite 기반의 2층 cue

skid는 `tireScrubGraphics` primitive로, 연기는 짧은 CC0 PNG puff pool로 그린다. Phaser emitter를 매번 생성하지 않고 장면 시작 시 image 4개를 만든 뒤 launch timer 동안만 재사용한다. 넓은 rear-contact flash는 smoke 뒤에서 충격파로 읽혀 제거했다.

```text
rear tire contact
  ├─ 1. dark twin skid: 짧은 두 줄, 0.20~0.35초
  └─ 2. pale dust puffs: 뒤·바깥 방향의 작은 반투명 원 4~6개
```

| 층 | 구현 | 제한 |
| --- | --- | --- |
| twin skid | 두 rear tire X 좌표에서 아래쪽으로 짧은 선을 그리고 alpha를 빠르게 감쇠한다. | road 방향으로만, 횡방향 skew 없음 |
| dust puff | fixed-size burst state 4개에 Kenney CC0 white-puff PNG를 풀링하고, runtime에서 저채도 tint·downscale·rotation·alpha만 갱신한다. | 차량 높이의 35%를 넘지 않고 0.35초 안에 소멸 |

모든 cue는 `PlayerTireCue` depth에서 player sprite 뒤에 렌더한다. road object depth, headlight와 독립이고 HUD 아래에 남는다.

### 후속 — 짧은 traction release

hooked launch는 GO 직후 바로 최대 force를 전달하지 않는다. `0.14초` 동안 clutch engagement가 `0 → 1`로 올라가며, rear tire cue가 먼저 읽힌 뒤 접지가 붙는다. overrev는 `0.18초`으로 더 길고, 기존의 더 낮은 force bonus를 유지한다. cold는 active launch state에 들어가지 않아 즉시 출발한다.

- force는 `clutchEngagement × (1 + launchForceBonus)`로만 전달하며 speed/camera 위치를 직접 바꾸지 않는다.
- `qa:launch-control`은 hooked 첫 frame multiplier가 `0 < x < 1`, bite 이후 `x > 1`인 것을 확인한다.
- standing-start regression은 Raven 0–60 `4.05초`, 0–100 `8.10초`으로 기존 gate 안에 남았다.

### 후보 비교

| 후보 | 판단 | 이유 |
| --- | --- | --- |
| Phaser particle emitter + smoke texture | 보류 | launch마다 emitter를 만들 필요가 없고, 4개의 재사용 image가 현재 사건 길이에는 더 예측 가능하다. |
| shader smoke | 보류 | pseudo-3D road mask와 차량 anchor 정합 문제가 먼저 생긴다. |
| drift smoke 재사용 | 제외 | 출발에 drift state와 횡슬립을 암시해 gameplay 의미가 틀어진다. |
| Graphics skid + pooled smoke sprite burst | 채택 | 현재 tire cue 레이어·차량 anchor를 그대로 쓰고, CC0 puff 4개만 재사용해 짧은 사건을 읽게 할 수 있다. |

### 실패 방지 규칙

- 일반 grip, 코너 understeer, 이후 drift에는 start-only dust가 나오지 않는다.
- 효과는 `launchForceRatio`가 아니라 `burnoutRemainingSec`으로 표현한다. 시각 보상과 물리 보상을 독립적으로 조정한다.
- camera shake는 추가하지 않는다. 이미 도로·collision cue가 있어 start effect로 과잉 연출하지 않는다.
- 연기는 야간 palette의 저채도 청회색/회색으로 제한하고, headlight보다 밝거나 큰 흰 덩어리가 되지 않는다.

## 구현 단계

### LCH-1 — launch 상태와 pre-launch RPM

- countdown update에서 speed 고정과 별도로 throttle input을 읽는다.
- clutch-disengaged RPM target과 limiter를 구현한다.
- QA URL은 현재처럼 countdown/launch state를 우회한다.
- launch meter는 debug HUD가 아닌 최소 gameplay HUD 위치에 추가한다.

완료 조건:

- countdown 중 RPM은 입력에 따라 오르내린다.
- camera.z, player speed, elapsedSec은 0에서 유지된다.
- countdown 종료 때 RPM이 wheel-speed RPM으로 즉시 튀지 않고 clutch engagement 동안 연속적으로 연결된다.

### LCH-2 — launch quality와 force 보정

- GO 순간 RPM·throttle을 snapshot한다.
- cold/hooked/overrev 3상태와 감쇠되는 force ratio를 만든다.
- Raven만 먼저 적용하고 다른 engine profile은 baseline으로 둔다.

구현 결과:

- `launchControl.ts`가 `cold/hooked/overrev` quality, `0.55초` force window, `45km/h` 감쇠, clutch engagement와 burnout timer를 분리해 소유한다.
- 일반 countdown에서 Up을 유지하면 `6,400rpm` limiter가 `5,800–6,600rpm` hooked window에 들어온다.
- controller에는 `launchForceMultiplier`만 전달한다. existing QA URL은 countdown을 건너뛰므로 launch multiplier도 적용되지 않는다.

완료 조건:

- hooked가 cold보다 0–60에서만 작은 이득을 낸다.
- 45km/h 이후 force 보정은 0이다.
- overrev가 hooked보다 빠르지 않다.

### LCH-3 — burnout cue

- rear anchor와 display size에서 twin skid/dust burst 위치를 계산한다.
- Graphics burst pool과 `launch` speed-effect event를 추가한다.
- HUD에는 `GOOD LAUNCH` 같은 한 번의 짧은 텍스트만 표시한다.

구현 결과:

- 기존 `PlayerTireCue` Graphics layer에 rear twin skid와 반투명 dust puff 4개를 추가했다. rear contact flash는 smoke 뒤의 충격파로 읽혀 제거했다.
- hooked는 `0.28초`, overrev는 `0.35초` 동안 cue를 유지한다. dust는 매 프레임 emitter를 만들지 않고 launch timer와 고정된 offset에서 직접 도형을 그린다.
- effect는 player sprite 뒤에만 남고 drift/understeer/controller/camera state를 변경하지 않는다.

### LCH-5 — smoke sprite 질감 pass

- [Kenney Smoke particle assets](https://opengameart.org/content/smoke-particle-assets)의 CC0 `White puff` 원본 3종을 `assets/effects/approved/kenney-smoke-particle-assets/`에 추가했다. 원본 파일은 rename만 했고 라이선스·원본명은 같은 폴더의 `README.md`에 보존한다.
- `burnout-puff-a/b/c`는 `PlayerTireCue` depth에서 4개만 pool로 유지한다. launch cue가 없으면 즉시 숨기므로 일반 주행 draw를 늘리지 않는다.
- 기존 원형 Graphics dust를 PNG puff로 교체했다. 움직임은 기존 anchor·launch timer의 순수 presentation 값을 그대로 쓰며, runtime에서만 크기(기존 radius의 6배), tint, rotation, alpha를 적용한다.
- smoke 전용 timer는 hooked `0.78초`, overrev `0.95초`다. force/clutch timer와 독립이라 접지는 기존처럼 빠르게 붙고, puff는 앞 65% 동안 읽힌 뒤 마지막 35%에서 사라진다.
- `burnoutRemainingSec`은 force phase가 complete가 된 뒤에도 계속 감소한다. 따라서 smoke duration이 force window보다 길어도 마지막 puff가 고정된 채 남지 않는다.
- twin skid는 launch 첫 순간에만 양쪽 rear contact의 **월드 좌표**(road Z·lateral offset)에 짧은 두 줄을 남긴다. clutch가 붙은 뒤에는 burnout visual timer가 남아도 추가 자국을 만들지 않는다. 위치만 매 프레임 현재 camera로 다시 투영하고, 선 길이·두께는 생성 시의 screen size로 고정해 camera에 가까워질 때 원근상 팽창하는 충격파가 생기지 않게 한다. 일반 주행에는 생성되지 않는다.

완료 조건:

- smoke는 rear contact에서만 나오고 차량 sprite 앞이나 HUD 위로 올라가지 않는다.
- 흰 원본을 그대로 쓰지 않고 야간 팔레트의 저채도 청회색 tint로 제한한다.
- 일반 grip/understeer/drift에는 pool image가 모두 hidden 상태다.

완료 조건:

- 정지 화면과 1×/2× 진행 배율에서 효과가 차량 뒤에 붙는다.
- cue가 0.35초 안에 사라지고, player/road/HUD depth를 침범하지 않는다.
- drift·understeer cue와 동시에 잘못 발화하지 않는다.

### LCH-4 — 회귀와 실주행 판단

다음 fixture를 별도 launch QA에 넣는다.

| fixture | 기대 결과 |
| --- | --- |
| no throttle | cold, 기본 standing start |
| held limiter | hooked, 짧은 force/dust burst |
| release before GO | cold, effect 취소 |
| forced overrev | 더 긴 dust, hooked보다 느리거나 동일 |
| QA URL | countdown/launch 효과 없이 기존 telemetry 유지 |

필수 수치 gate:

- cold 0–60/0–100은 현재 standing-start 기준과 허용 오차 안
- hooked 0–60 이득은 `0.15–0.25초`
- hooked 0–100은 기존 기준보다 `0.25초` 이상 빨라지지 않음
- top speed, gear/RPM schedule, corner handling 결과는 불변

구현 결과:

- `npm run qa:launch-control --workspace @games/apex-seoul`가 순수 launch state를 네 fixture로 검사한다.
- held limiter는 `6,400rpm`에서 hooked, 첫 frame multiplier 약 `1.097`, `50km/h`에서는 multiplier `1.000`을 확인한다.
- forced overrev는 hooked보다 긴 burnout과 더 작은 multiplier를 확인한다.
- launch QA snapshot은 `launchRuntimeQa.ts`를 통해 runtime telemetry와 같은 schema로 노출한다.

```bash
npm run qa:standing-start --workspace @games/apex-seoul
npm run qa:top-speed-regression --workspace @games/apex-seoul
npm run qa:handling-relations --workspace @games/apex-seoul
npm run qa:corner-production --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

## 블로그 글감·컨텍스트 보존

### 잠정 제목

`3초 카운트다운을 플레이로 바꾸기: Apex Seoul의 rev limiter와 가짜가 아닌 번아웃`

### 글의 중심 질문

“정지 상태의 레이싱 게임에서 출발 전 3초는 단순 대기인가, 아니면 플레이어가 첫 번째 결정을 내리는 구간인가?”

### 보존할 서사

1. 처음에는 countdown이 speed·timer를 멈추는 데 성공했지만, 가속 입력까지 무의미하게 만들어 출발이 평평했다.
2. 실제 Raven의 RPM은 바퀴 속도에 묶여 있어서, 정지 상태 rev는 단순 HUD 숫자 변경이 아니라 clutch 분리라는 상태 전환을 요구했다.
3. 번아웃을 drift로 재활용하면 구현은 쉬워도 의미가 틀어진다. 출발 번아웃은 직진 traction 사건이며, 코너 drift는 횡방향 판단 사건이다.
4. 좋은 출발의 보상은 speed cheat가 아니라 제한된 저속 force와 짧은 시각 cue여야 기존 0–100/최고속/코너 회귀를 보존한다.

### 캡처·측정 목록

- `3 → 2 → 1` 중 rev meter가 limiter에 닿는 장면
- cold/hooked/overrev를 나란히 둔 첫 0.6초 GIF 또는 3연속 프레임
- rear skid와 dust가 player anchor 뒤에만 남는 프레임
- cold vs hooked speed/RPM/force 표와 0–60 차이
- QA URL에서 countdown/launch state가 우회되는 telemetry 비교

### 글에서 피할 주장

- “실차 번아웃을 정확히 시뮬레이션했다”는 표현
- smoke가 많을수록 속도감이 좋다는 표현
- raw speed boost를 실차 torque 또는 turbo boost로 부르는 표현
- 한 번의 좋은 출발이 time attack 전체를 결정한다는 표현

## 범위 밖

- 엔진·타이어·whoosh 오디오
- manual clutch 버튼, false start, grid 경쟁, multiplayer fairness
- 차량별 launch tuning과 turbo spool 차별화
- 장시간 smoke, tire texture, exhaust flame, 상시 camera shake

차량별 launch 성격은 garage/vehicle progression이 실제로 열릴 때 재검토한다.
