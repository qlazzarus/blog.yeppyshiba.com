# Apex Seoul 헤드라이트 렌더링 설계

갱신일: 2026-07-21

## 목표

야간 다운힐에서 차량 앞 asphalt에 짧은 low-beam 주광을 만들고, 조향 시에는 주광 전체를 크게 회전시키지 않은 채 코너 안쪽 조사 영역만 제한적으로 확장한다. 최종 형상은 원·타원·링이 아니라 서로 연결된 soft trapezoid 계열의 footprint이며, 빛은 차량 뒤 바닥, 숲, 옹벽, 하늘 또는 crest 뒤 도로에 나타나면 안 된다.

## 실패한 첫 구현과 롤백 이유

첫 시도는 `roadRenderer`가 camera near-plane부터 road polygon을 다시 밝히는 Graphics pass였다. 차량 sprite는 화면상 `camera.z + 260z`의 접지점을 기준으로 고정돼 있는데, 조명은 `camera.z + 18z`부터 시작했다. 결과적으로 cone의 가장 밝은 부분이 차량 아래/뒤 화면에 생겼다.

또한 일반 alpha 합성은 어두운 road color 위에 미세한 색을 한 번 덧칠하는 수준이라, 헤드라이트의 광원감이 약했다. 이 구현은 롤백한다.

## 채택 구조

```text
차량 front anchor
  → full-screen additive headlight shader
  → 차량 전방 좌·우의 원근 fan과 다층 타원 light pool을 합산 계산
  → player sprite
```

### 책임 분리

| 요소 | 책임 |
| --- | --- |
| `headlightShader.ts` | 각 램프에서 전방으로 갈수록 넓어지는 원근 fan과 외곽 spill·주광부·hot spot을 계산하고, 중첩부를 밝기 합산한다. |
| `main.ts` | player render와 동일한 atlas frame·flip을 공유하고, frame별 좌우 emitter·pose aim·road assist·속도를 shader uniform으로 전달한다. |
| `RenderDepth.Headlight` | world/roadside보다 위, player shadow·player보다 아래에 헤드라이트를 둔다. |

## 왜 shader인가

shader는 cone의 중심 밝기, 좌우 soft edge, 거리 감쇠를 픽셀 단위로 처리할 수 있다. Graphics polygon만으로는 흰색 중심과 주변 spill의 부드러운 차이를 만들기 어렵다.

초기 RenderTexture mask는 shader 출력을 전부 막아 실제 주행에서 빛이 보이지 않았다. 현재 단계에서는 차량 앞의 짧고 좁은 cone만 shader로 렌더해 출력 신뢰성을 먼저 확보한다. 급커브까지 정확하게 asphalt 내부로 제한하는 road texture mask는 Phaser의 offscreen Graphics capture를 별도 검증한 뒤 재도입한다.

## shader uniform

| uniform | 의미 |
| --- | --- |
| `uLampLeftOrigin` | 렌더된 atlas frame과 `flipX`를 반영한 화면상 왼쪽 램프 좌표. |
| `uLampRightOrigin` | 렌더된 atlas frame과 `flipX`를 반영한 화면상 오른쪽 램프 좌표. |
| `uIntensity` | 속도에 따라 약하게 보정되는 전체 광량. 정지 상태에서도 0이 아니다. |
| `uBeamAimX` | beam 끝단이 차량 정면에서 좌·우로 이동할 감쇠된 화면상 거리. shader 내부에서 전방 거리에 비례한 shear로 적용한다. |
| `uResolution` | 화면 비율 보정에 사용한다. |

## 차량 방향 추종 개선 계획

### 문제 정의

정면 주행에서는 fan과 light pool이 의도대로 보이지만, 차량이 좌·우로 꺾이거나 drift에 들어가면 빛이 계속 화면 위쪽으로만 향해 차체 pose와 분리되어 보인다.

현재 uniform에는 위치·램프 간격·광량만 있고 방향값이 없다. 또한 shader는 `uCarFront`를 기준으로 만든 screen-space 좌표를 그대로 사용하므로 투사광의 중심선이 회전하지 않는다. `playerCar.rotation`만 따라가는 방식도 충분하지 않다. drift에서는 atlas pose가 차체 yaw를 표현하고, 별도 sprite rotation 값은 의도적으로 0이 될 수 있다.

### 조사 결론

검증 가능한 공개 구현과 엔진 문서를 기준으로 다음 패턴을 채택한다.

| 레퍼런스 | 관찰 | Apex Seoul 적용 |
| --- | --- | --- |
| Godot `SpotLight3D` | spotlight는 node의 local forward 방향으로 투사되고, child transform은 parent transform을 상속한다. | 헤드라이트 시작점과 기본 방향은 차량 차체 pose를 따라야 한다. |
| Unity light cookie | 광원 방향과 투사 패턴을 분리해, mask/cookie의 모양은 유지한 채 광원 transform을 바꾼다. | 현재 fan/pool 모양은 유지하고 방향 uniform만 추가한다. |
| Jake Gordon의 OutRun식 pseudo-3D racer | 커브는 실제 3D 차체 회전보다 전방 segment의 화면상 road center 이동으로 표현된다. | 차체 pose만 사용하지 않고, 렌더된 도로 중심선의 접선을 보조값으로 사용한다. |
| Unity `SmoothDampAngle` | 목표 각도를 overshoot 없이 시간에 따라 감쇠시킨다. | atlas frame 전환·steering 입력 변화에 light가 순간이동하지 않도록 aim 값을 감쇠한다. |

참고 링크:

- https://docs.godotengine.org/en/stable/classes/class_spotlight3d.html
- https://docs.godotengine.org/en/stable/classes/class_node3d.html
- https://docs.unity3d.com/Manual/Cookies.html
- https://docs.unity3d.com/ScriptReference/Mathf.SmoothDampAngle.html
- https://jakesgordon.com/writing/javascript-racer-v2-curves/

### 채택 방향

**차체 방향 추종 + 도로 접선 보조 + 시간 감쇠**를 사용한다.

| 후보 | 장점 | 제외/채택 이유 |
| --- | --- | --- |
| raw steering 입력만 사용 | 구현이 단순하다. | countersteer 때 차체 반대 방향으로 빛이 튀므로 제외한다. |
| `playerCar.rotation`만 사용 | sprite와 같은 transform을 쓴다. | drift atlas pose의 방향을 읽지 못하므로 단독 사용하지 않는다. |
| 도로 접선만 사용 | pseudo-3D road와 항상 정렬된다. | drift 중 차체가 향한 방향을 잃으므로 보조값으로만 사용한다. |
| 차체 pose + 도로 접선 | grip·drift·pseudo-3D 커브를 모두 반영한다. | 채택한다. |

### 목표 aim 계산

`main.ts`에 `headlightAimTargetX`와 감쇠된 `headlightAimX`를 둔다. 값은 beam 끝단이 이동할 화면상 X 거리(px)이며, shader로 전달할 때 viewport 너비로 정규화한다.

1. **도로 접선**: 차량 근처와 beam 도달 깊이의 road center를 같은 pseudo-3D projection으로 투영해 `roadAimX`를 만든다. 가능하면 `RoadRenderStats`에 해당 중심선 sample을 노출해 road renderer가 실제로 그린 geometry를 그대로 사용한다.
2. **차체 pose**: `getVehicleVisualSteeringState().value`를 기본 yaw cue로 쓴다. grip에서는 조향량을 작게 선행시키고, drift/setup/recovery에서는 `driftDirection` 기반 pose와 `slipAngle`을 우선한다.
3. **상태별 blend**:
   - grip: `roadAimX` 중심 + 작은 physical steering lead
   - drift/setup: 차체 pose 65~75%, road tangent 25~35%
   - recovery: drift pose의 비중을 점진적으로 줄여 road tangent로 복귀
4. **제한**: 초기 최대값은 beam 끝단 기준 `±60~75px`로 둔다. 저속에서는 감소시키고, 고속에서만 약하게 증가시킨다.

### shader 변경 방식

`HeadlightShaderUniforms`와 GLSL에 `beamAimX` / `uBeamAimX`를 추가한다. shader object 전체를 회전시키지 않고, 차량 front anchor에서는 0이며 전방으로 갈수록 커지는 screen-space shear를 적용한다.

```glsl
float aimProgress = pow(clamp(point.y / beamReach, 0.0, 1.0), 0.72);
point.x -= uBeamAimX * aimProgress;
```

이 방식은 다음을 보장한다.

- bumper의 좌·우 lamp 시작점은 차량에 고정된다.
- 역 사다리꼴 fan과 먼 light pool이 같은 방향으로 함께 이동한다.
- 단순 2D 회전으로 인해 pool이 화면 하단이나 차체 뒤로 기울어지는 문제를 피한다.
- 기존 `uCarFront`, lamp spacing, additive blend, shake depth 관계를 유지한다.

### 시간 감쇠 규칙

- 방향 전환 응답: 약 0.10~0.14초
- 중앙/도로 접선 복귀: 약 0.18~0.24초
- 목표값 변화가 클수록 최대 aim 속도를 제한한다.
- drift atlas frame이 바뀌어도 현재 aim 값에서 연속적으로 보간한다.

`SmoothDampAngle`과 같은 overshoot 없는 spring-damper 성격을 목표로 하되, Phaser update loop에서는 지수 감쇠 또는 속도 제한 보간으로 구현한다.

### 구현값 (2026-07-21)

- `RoadRenderStats.headlightRoadTangent`가 실제로 보이는 road segment에서 화면 높이 `68%`와 `48%` 지점의 중심을 샘플링한다. elevation 때문에 같은 Y에 여러 segment가 겹치면 최종 화면에서 위를 덮는 가장 가까운 segment를 사용한다.
- road tangent 단독 기여는 `±54px`, 전체 aim은 저속 `±44px`에서 고속 `±72px`까지 제한한다.
- grip은 road tangent에 physical steering `52px` 선행을 더한다. 이전 `18px` 값은 pool 깊이에서 약 `8px`만 움직여 실제 주행에서 방향 변화가 읽히지 않았다.
- drift는 차체 pose `52px`, slip `14px`, road tangent `30%`를 합성한다. setup·drift·recovery 상태에 따라 grip 결과와 연속 보간한다.
- 방향 전환은 `0.12초`, 중앙 복귀는 `0.22초` 지수 감쇠를 사용하고, 프레임당 변화량은 초당 `560px` 이하로 한 번 더 제한한다.
- shader는 bumper에서 shear가 `0`이고 beam reach에서 `uBeamAimX` 전체가 적용되도록 `pow(progress, 0.52)` 곡선을 사용한다. 가까운 pool에도 충분한 이동량을 주되, fan과 세 겹의 pool은 같은 좌표장을 공유하므로 서로 분리되지 않는다.
- runtime QA state의 `headlight`에 `aimTargetX`, `aimX`, `roadAimX`, `roadTangent`를 기록한다.

## 조향 pose 정합성 2차 수정 계획

### 캡처 리뷰

강한 우측 조향 순간 캡처에서 차량 노즈는 화면 오른쪽을 향하지만 light pool은 차량 중앙의 위·왼쪽에 남았다. 방향값 자체는 변하고 있으나, **차량이 보여 주는 pose와 광원 시작점·최종 투사 방향이 같은 좌표계로 묶여 있지 않다.**

현재 불일치 원인은 다음 세 가지다.

1. grip aim은 `roadAimX + physicalSteering * 52px` 구조다. road tangent는 최대 `54px`라서 차체 pose와 반대 방향일 때 조향 기여를 거의 전부 상쇄하거나 최종 부호까지 뒤집을 수 있다.
2. atlas frame은 steering threshold를 넘는 즉시 `center → steer-right-1 → steer-right-2`로 전환되지만 headlight aim은 `0.12초` 감쇠된다. 따라서 순간 캡처에서는 차체만 먼저 강한 quarter pose가 되고 빛은 이전 방향에 남는다.
3. `uCarFront`는 모든 frame에서 `playerCar.x`와 고정 Y offset을 사용한다. `steer-right-2`처럼 노즈가 sprite 오른쪽으로 크게 이동한 frame에서도 두 램프가 차량 중앙을 기준으로 대칭 배치된다. 좌측 frame은 `flipX`까지 사용하므로 frame별 발광점 정의 없이 정확한 정합이 불가능하다.

### 수정 원칙

- **차체 pose를 절대적인 1차 방향으로 사용한다.** road tangent는 약한 보조값이며, 둘이 충돌할 때 beam의 부호를 뒤집을 수 없다.
- **빛의 차체 성분은 sprite frame 전환과 같은 시점에 반영한다.** 감쇠는 road assist와 작은 잔진동에만 적용해 차체와 빛 사이의 시간차를 없앤다.
- **광원 시작점을 frame별 데이터로 관리한다.** 중앙 frame의 가상 bumper와 quarter frame의 실제 노즈 위치를 같은 방식으로 취급하지 않는다.
- 좌측 pose는 우측 profile을 단순히 `flipX` 하는 atlas 정책과 동일하게 emitter X도 frame origin을 기준으로 mirror한다.

### 데이터 모델

`VehicleAtlas.apex`에 frame별 `headlightProfiles`를 추가한다.

```ts
type VehicleHeadlightProfile = {
    beamYawDeg: number;
    footprint: {
        farHalfWidthRatio: number;
        nearPaddingPx: number;
        reachRatio: number;
    };
    lampLeft: { x: number; y: number };
    lampRight: { x: number; y: number };
    poseAimX: number;
};
```

- 좌표와 간격은 `0..1` sprite-local 비율로 저장한다.
- `beamYawDeg`는 화면 위쪽을 `0°`로 보고 우측을 양수로 한 profile의 명시적 차체 방향이다. runtime sprite rotation을 더하고, `flipX`에서는 부호를 반전한다.
- `footprint`는 화면 높이 기준 reach·far width와 pixel near padding을 profile별로 저장한다. sprite pose 축 계산은 공통으로 유지하고, 차량·terrain별로 이 세 수치만 보정한다.
- 최소 profile은 `center`, `steer-right-1`, `steer-right-2`, `downhill-*`, `uphill-*`를 제공한다.
- profile이 없는 frame은 terrain 접두사를 제거한 steering profile로 fallback한다.
- `flipX`일 때 frame origin을 기준으로 X offset을 반전하고, 좌·우 lamp 순서와 `poseAimX` 부호를 함께 반전한다.

### aim 합성 변경

현재 하나의 target을 모두 감쇠하는 구조를 다음처럼 분리한다.

```text
framePoseAim     = 선택된 atlas frame의 poseAimX, 즉시 반영
steeringFineAim  = frame 내부의 연속 steering 차이, 짧게 감쇠
roadAssistAim    = 실제 road tangent, 느리게 감쇠 및 약하게 제한
finalAim         = framePoseAim + steeringFineAim + roadAssistAim
```

- road assist는 초기 `±14~18px`로 제한한다.
- `abs(framePoseAim)`이 커질수록 road assist 가중치를 `35% → 10%`로 낮춘다.
- road assist가 pose와 반대 부호라면 `finalAim`이 0을 넘지 못하도록 제한한다.
- drift/setup/recovery에서는 raw steering이 아니라 `driftDirection` 기반 atlas pose를 계속 사용한다. countersteer는 차체 pose를 바꾸지 않는 동안 beam 부호도 바꾸지 않는다.
- frame pose는 즉시 또는 `0.04초` 이하로 반영하고, road assist 복귀만 현재 `0.18~0.24초` 범위를 유지한다.

### shader·uniform 변경

단일 `uCarFront + uLampHalfSpacing` 대신 실제 좌·우 emitter를 전달한다.

| uniform | 의미 |
| --- | --- |
| `uLampLeftOrigin` | 선택 frame과 flip을 반영한 왼쪽 램프의 화면 좌표 |
| `uLampRightOrigin` | 선택 frame과 flip을 반영한 오른쪽 램프의 화면 좌표 |
| `uBeamAimX` | 차체 pose 우선으로 합성한 beam 끝단 X 이동량 |

각 fan과 pool은 자기 lamp origin을 기준으로 계산한다. 강한 quarter pose에서는 두 램프의 화면상 간격을 줄여 원근상 가까운 램프와 먼 램프가 과도하게 벌어지지 않게 한다. 기존 shear silhouette과 additive 합성은 유지한다.

### 구현 순서

1. debug/telemetry에 선택 frame, `flipX`, 두 emitter 좌표, `framePoseAim`, `roadAssistAim`, `finalAim`을 노출한다.
2. FT86·G70 atlas에 frame별 `headlightProfiles`를 추가하고 좌우 mirror helper를 작성한다.
3. player render에서 계산한 **동일한 frame selection 결과**를 headlight uniform 생성에도 공유한다. headlight 쪽에서 steering으로 frame을 다시 추정하지 않는다.
4. aim을 frame pose·fine steering·road assist 상태로 분리하고 road assist의 반전 금지 규칙을 적용한다.
5. shader를 두 개의 실제 lamp origin 기반으로 전환한다.
6. 고정 장면과 실제 입력 전환을 QA한 뒤 profile 좌표와 최대 aim만 미세 조정한다.

### QA 및 완료 기준

| 장면 | 완료 기준 |
| --- | --- |
| `qaSteer=-1/-0.5/0/0.5/1` | 차체 노즈와 beam 중심선의 부호가 항상 일치한다. |
| frame threshold 왕복 | sprite frame과 emitter가 같은 frame에 바뀌며, 빛이 이전 방향에 남는 프레임이 없다. |
| 강한 좌·우 pose | emitter가 차량 중앙이 아니라 화면상 front third에 붙는다. |
| 반대 road tangent + steering | road assist가 빛을 중앙 반대편으로 넘기지 않는다. |
| drift + countersteer | 핸들 입력이 반대여도 차체 pose가 유지되는 동안 beam도 같은 방향을 유지한다. |
| recovery | frame pose가 중앙으로 바뀐 뒤 road tangent로 자연스럽게 복귀하며 overshoot가 없다. |
| uphill/downhill + flipX | terrain frame과 좌측 mirror에서도 emitter가 차체 밖이나 뒤쪽에 생기지 않는다. |

캡처의 우측 강조 pose 기준으로는 먼 beam 중심이 emitter보다 오른쪽에 있어야 하며, 차량 왼쪽 뒤에 밝은 pool이 남아서는 안 된다.

### 구현 결과 (2026-07-21)

- FT86·G70 atlas에 center·steer·uphill·downhill용 좌우 `headlightProfiles`를 추가했다.
- player shadow·sprite·headlight가 한 번 계산한 동일한 frame selection과 `flipX`를 공유한다.
- `vehicleHeadlight.ts`가 frame origin·display size·sprite rotation·flip을 반영해 두 lamp의 화면 좌표를 계산한다.
- frame pose aim은 frame 전환과 같은 렌더에서 즉시 적용한다. fine steering은 `0.05~0.10초`, road assist는 `0.20초`로 별도 감쇠한다.
- road tangent는 최대 `54px`를 입력으로 받지만 pose 강도에 따라 `35% → 10%`만 사용한다. 최종 합성에서 road assist가 frame pose의 부호를 뒤집지 못한다.
- shader는 단일 중앙 anchor를 제거하고 각 lamp origin에서 fan과 pool을 독립 계산한다.
- runtime telemetry에 profile/frame, 두 emitter, frame pose, fine aim, raw road aim, road assist와 final aim을 기록한다.
- `qa:headlight-profiles`가 두 atlas의 12개 방향 profile에 대해 좌우 mirror·front-third emitter·aim 부호·road 반전 방지를 검사한다.

## 조향 pose 정합성 3차 수정 계획 — 차체 로컬 축 기반 통합 footprint

### 재검토 결론

이전 보정은 두 lamp origin을 실제 sprite frame에 붙이는 데는 성공했지만, shader 내부의 투사 형상은 여전히 화면 X/Y 축에 정렬되어 있다. 각 lamp의 큰 타원 pool을 독립적으로 shear하면, 차량이 대각선 quarter pose를 보일 때에도 두 개의 원형/타원형 빛이 화면 위쪽을 향해 따로 남는다.

중앙에 별도 road wash를 더하는 방식은 사용하지 않는다. 그 방식은 두 실제 램프에서 출발한 빛처럼 보이지 않고, 차량과 분리된 중앙 조사광을 만든다.

차량은 하나의 sprite를 크게 회전시키는 구조가 아니다.

1. `center`, `steer-right-1`, `steer-right-2` atlas frame이 큰 yaw/quarter pose를 표현한다.
2. 선택 frame에 `flipX`가 적용되어 좌측 pose를 만든다.
3. 그 결과에 `rotationRadians`(최대 약 `±3.5°`)가 추가된다.

`getVehicleHeadlightScreenPose()`는 이미 이 frame·flip·회전을 반영한 좌우 lamp 화면 좌표를 만든다. 새 광원은 별도 steering 각도를 추정하지 않고, 이 최종 좌표를 차량의 기준 축으로 사용한다.

### 목표 형태

```text
실제 left lamp ───── 실제 right lamp    ← 사다리꼴의 시작 변
                    \              /
                     \            /
                      \__________/
                           ↑
                     차량의 실제 전방축
```

- 사다리꼴 시작 변은 두 실제 lamp origin을 연결한 선분이다.
- lamp 앞 `0~20%` 구간에는 두 발광점의 존재감이 남아도 된다.
- `20~35%` 거리에서 좌·우 밝기는 하나의 연속된 조사광으로 합쳐진다.
- 그 이후에는 하나의 넓고 부드러운 역 사다리꼴이 진행한다.
- 이 합쳐진 footprint는 중앙에 새로 생성한 원형광이 아니라, 두 lamp를 시작 변으로 하는 단일 기하 형상이다.

### 차체 로컬 축 계산

aspect-corrected screen 좌표에서 다음 값을 계산한다.

```text
lampCenter  = (lampLeft + lampRight) / 2
lateralAxis = normalize(lampRight - lampLeft)
forwardAxis = perpendicular(lateralAxis), 화면 위쪽을 향하는 부호 선택
```

- `lateralAxis`는 두 lamp를 잇는 차체 폭 방향이다.
- `forwardAxis`는 그에 직교하는 차체 진행 방향이다.
- 계산은 `flipX`와 `rotationRadians`를 적용한 후의 좌표에서 수행하므로, 강한 우측 frame에서는 우상단, 좌측 mirror에서는 좌상단을 향한다.
- shader fragment도 같은 로컬 좌표계를 쓴다.

```text
localX = dot(fragment - lampCenter, lateralAxis)
localY = dot(fragment - lampCenter, forwardAxis)
```

두 lamp의 선분이 아트상 차량 폭을 정확히 대표하지 않는 frame이 발견될 때만, atlas profile에 선택적 `forwardGuide`를 추가한다. 초기 구현은 기존 lamp 좌표에서 축을 유도해 새 수작업 데이터를 늘리지 않는다.

### shader 설계

기존 `getLampProjection()` 두 개와 큰 `getLampPool()` 두 개를 다음 구조로 교체한다.

1. 두 lamp 선분을 near edge로 삼고, `localY >= 0`인 전방만 허용한다.
2. 거리 progress에 따라 half-width를 넓혀 soft trapezoid mask를 만든다.
3. near edge에서는 lamp별 작은 lobe를 남기되, merge progress 이후에는 단일 body intensity로 보간한다.
4. far edge와 측면은 부드럽게 감쇠하고, hard polygon·ring·독립 원형 spill을 만들지 않는다.
5. 모든 밝기는 동일 trapezoid mask 내부에서만 계산해, lamp spot이 조사광 바깥에 따로 떠 보이지 않게 한다.

새 uniform은 개념적으로 아래와 같다.

| uniform | 의미 |
| --- | --- |
| `uLampLeftOrigin`, `uLampRightOrigin` | 실제 sprite frame에 붙은 near edge의 양 끝점 |
| `uBeamCenter` | 두 lamp의 중점 |
| `uBeamLateralAxis` | 차체 폭 방향 단위 벡터 |
| `uBeamForwardAxis` | 차체 전방 방향 단위 벡터 |
| `uFarAssist` | 차체 축을 바꾸지 않고 먼쪽만 미세 조정하는 잔여 보정 |

구현에서는 중점과 축을 TypeScript에서 계산해 전달한다. 이렇게 하면 같은 값으로 수치 QA와 debug overlay를 만들 수 있고, GLSL에서 screen-space 부호·aspect 계산을 중복하지 않는다.

### 방향 보정 역할 재정의

기존 `poseAimX`를 사다리꼴 방향에 다시 더하면 atlas frame에 이미 들어 있는 yaw가 중복된다. 새 역할은 다음과 같이 분리한다.

```text
기본 방향       = lampLeft/lampRight에서 도출한 sprite 실제 전방축
framePoseAimX   = telemetry 및 frame 선택 검증용 값
fine steering   = 사다리꼴 먼쪽 구간의 작은 lateral 보정
road assist     = 사다리꼴 먼쪽 구간의 작은 lateral 보정
```

- near edge에서는 fine steering과 road assist가 `0`이다.
- far쪽 `30%` 이후부터만 보정량을 증가시킨다.
- frame 전환 시 차체 축과 footprint 방향은 즉시 함께 바뀐다.
- fine steering·road assist만 기존의 짧은 감쇠를 유지한다.
- road assist는 차체 축을 반대편으로 꺾지 못하게 제한한다.

### 구현 단계

- [x] **1. 기하 데이터 단계**: `VehicleHeadlightScreenPose`에 `beamCenter`, `beamLateralAxis`, `beamForwardAxis`, `lampHalfSpan`을 추가했다. 값은 실제 player sprite와 같은 frame·flip·rotation transform 뒤에 계산하며, 좌우 mirror·축 직교·정규화·전방 방향을 수치 QA한다.
- [x] **2. 진단 단계**: `?debugGuides=true`에서 lamp 선분(황색), forward axis(청색), near/far trapezoid(분홍색)를 UI debug overlay로 표시한다. guide 꼭짓점은 1단계의 동일 pose data에서 계산하며, 수치 QA에서 forward·lateral offset 및 좌우 mirror를 검사한다. 실제 화면에서 center/right-1/right-2/flip 축이 sprite 노즈와 일치하는지는 3단계 전 수동 시각 QA로 확인한다.
- [x] **3. 기본 footprint 단계**: fine steering·road assist를 shader에서 일시적으로 사용하지 않고, `beamCenter`·`beamLateralAxis`·`beamForwardAxis`·`lampHalfSpan`으로 하나의 회전된 soft trapezoid를 구현했다. near edge는 실제 lamp segment 폭에서 시작하며, 중앙 별도 wash와 대형 lamp spill은 제거했다.
- [x] **4. 병합 단계**: near 구간의 작은 좌·우 lamp lobe를 추가하고, beam progress `12~35%`에서 단일 body로 감쇠·병합한다. lobe는 동일 soft trapezoid mask 안에서만 계산하므로, 독립 원형 두 개 또는 인위적인 중앙 원으로 분리되지 않는다.
- [x] **5. 잔여 조향 단계**: fine steering과 road tangent의 screen-X 잔여값을 local lateral axis로 변환하고 최대 `30px`으로 제한했다. shader는 beam progress `30~98%`에서만 이 offset을 적용하므로, near edge와 차체 기본 forward axis는 유지한다. debug trapezoid와 telemetry의 `farAssistX`도 같은 값을 사용한다.
- [x] **6. terrain/차량 단계**: FT86·G70의 모든 level/downhill/uphill·steer profile에 `footprint` 데이터를 추가하고 shader/debug guide가 같은 profile 값을 사용하게 했다. downhill은 level보다 reach·far width를 조금 키우고, uphill은 crest 누출을 막기 위해 줄였다. 강한 quarter frame도 폭·reach를 소폭 절제하며, 축 계산 방식은 공통으로 유지한다. QA는 terrain별 reach·width 순서와 범위를 검사한다.

### QA 및 완료 기준

| 장면 | 완료 기준 |
| --- | --- |
| 직선 | 두 lamp를 잇는 수평 near edge에서 자연스러운 단일 역 사다리꼴이 시작한다. |
| 강한 우측 frame | 사다리꼴 중심선이 차량 노즈의 우상단 방향과 일치하며, 화면 위쪽에 고정된 타원 두 개가 남지 않는다. |
| 강한 좌측 `flipX` | 우측 결과의 정확한 mirror이며, 좌상단 방향으로 같은 형태가 진행한다. |
| frame threshold 왕복 | sprite frame·near edge·forward axis가 같은 render에 함께 바뀌고, 이전 방향의 footprint가 잔류하지 않는다. |
| near merge 구간 | lamp 부근은 두 점이 읽혀도 중거리에서는 하나의 연속 광량이 된다. 중앙에 독립된 원형광이 생기지 않는다. |
| road assist 반대 방향 | far edge만 제한적으로 휘고, near edge 및 차체 기본 축이 반대편으로 뒤집히지 않는다. |
| uphill/downhill | terrain frame과 mirror에서도 조사광이 차체 뒤·도로 밖으로 새지 않는다. |

수치 QA에는 각 profile의 `forwardAxis`가 lamp baseline과 직교하는지, left/right mirror 축이 반전되는지, far trapezoid가 `localY > 0`에만 존재하는지를 추가한다. 브라우저 시각 QA는 `qaSteer=-1/-0.5/0/0.5/1`의 정지 프레임과 실제 좌·우 전환을 모두 확인한다.

## 4차 재조정 계획 — 짧은 순수 trapezoid와 명시적 yaw

### 3차 결과 평가

3차 구현은 구조적으로는 완료됐지만 시각 승인 기준은 충족하지 못했다. 다음 수정은 3차의 실제 lamp anchor·좌우 mirror·debug overlay·profile QA 인프라는 유지하되, **방향 기준과 광형상만 교체**한다.

| 항목 | HEAD 커밋 `5b1520b5` | 3차 worktree | 결론 |
| --- | --- | --- | --- |
| 광량 | 좌·우 fan과 세 겹 ellipse가 additive로 중복되어 쉽게 포화 | 통합 body는 약하고 near lobe만 순간적으로 밝음 | 단일 body의 광량을 두 버전 중간으로 맞춘다. |
| 도달 거리 | `0.295h` (`760h` 기준 약 `224px`) | terrain별 `0.256~0.305h` (`195~232px`) | 충분히 짧아지지 않았다. 컨셉 기준 차량 앞 `0.15~0.20h`로 줄인다. |
| 기본 방향 | `poseAimX`와 screen shear | lamp baseline의 수직축 | lamp baseline은 yaw 정보를 안정적으로 담지 않는다. |
| near 형상 | 독립 lamp pool | 작은 ellipse lobe + body | 별도 광원 ellipse를 모두 없애고 순수 trapezoid만 남긴다. |

현재 FT86 profile에서 `steer-right-1`/`steer-right-2` lamp baseline이 만드는 축은 각각 `21.8°`/`22.2°`이고, G70은 `20.0°`/`19.1°`다. 즉 약한 조향과 강한 조향의 기본 각도가 거의 같거나 역전된다. 이것이 좌·우 pose가 여전히 어색한 직접 원인이다.

### 확정 방향

```text
lamp anchor       = 차량 앞쪽 시작 위치만 결정
beamYawDeg        = atlas frame이 표현하는 차량 진행 방향
sprite rotation   = beamYawDeg에 실제 render rotation을 추가
far assist        = 먼쪽 단면만 아주 작게 이동
footprint         = ellipse 없이 하나의 짧은 soft trapezoid
```

- `lampLeft`/`lampRight`는 normalized sprite 좌표·origin·`flipX`·`rotationRadians` 변환을 계속 적용한다. 이 데이터는 near anchor의 중점과 폭을 결정한다.
- `beamForwardAxis`는 더 이상 lamp baseline의 수직벡터에서 만들지 않는다. profile의 명시적 `beamYawDeg`를 sprite rotation과 합성해 계산한다.
- `beamLateralAxis`는 새 forward axis의 직교축으로 만든다. near span은 lamp 점을 해당 lateral axis에 투영해 구한다.
- `poseAimX`는 이전 telemetry/road-assist 호환용 값으로 유지하되, 기본 footprint 방향의 원천으로는 사용하지 않는다.

### 초기 목표 수치

아래 값은 첫 visual QA를 위한 시작값이며, 캡처 승인 전에는 최종값으로 간주하지 않는다.

| profile | `beamYawDeg` | reach ratio | far half-width ratio |
| --- | ---: | ---: | ---: |
| center | `0°` | level `0.18`, downhill `0.20`, uphill `0.16` | level `0.15`, downhill `0.16`, uphill `0.14` |
| steer-right-1 | `+9°` | center보다 `0.005` 짧게 | center보다 `0.005` 좁게 |
| steer-right-2 | `+16°` | center보다 `0.010` 짧게 | center보다 `0.010` 좁게 |
| steer-left-* | right profile mirror | right profile mirror | right profile mirror |

- 실제 Phaser sprite rotation(`최대 약 ±3.5°`)은 위 yaw에 추가된다.
- far assist는 현재 최대 `30px`에서 `12~16px`으로 낮추고, beam progress `55%` 이후에만 적용한다.
- 단일 trapezoid body의 peak additive blue는 속도 intensity 적용 후 대략 `0.24~0.30`을 목표로 한다. 이는 현재 넓은 body보다 약 `1.7~2.0배` 밝고, HEAD의 중복 pool 포화보다 충분히 낮다.

### shader 형상 규칙

1. `softEllipse`, `leftLobe`, `rightLobe`를 제거한다.
2. `localY`의 near/far fade와 `abs(localX) < halfWidth(localY)`만으로 soft trapezoid mask를 만든다.
3. outer/body/core가 필요하면 모두 **같은 trapezoid signed-distance**에서 나온 농도 차이만 사용한다. 별도의 원·ring·emitter hotspot은 만들지 않는다.
4. far fade는 짧은 reach의 마지막 `20~25%`에서 끝나도록 하고, 광원이 vehicle 전방의 asphalt 안에만 머물게 한다.

### JSON 검증 상태와 보강 계획

- lamp 좌표는 normalized 좌표 → frame origin → display size → `flipX` → `rotationRadians` 순서로 변환된다. 연결 구조는 맞다.
- lamp 좌표는 실제 image의 전조등 픽셀을 자동 추출한 값이 아니라 후방 시점에서 가려진 전조등을 대신하는 front-anchor다. SOL-4 QA는 FT86/G70 sprite alpha bounds를 직접 읽어 18개 anchor가 실루엣 또는 노즈 전방 cell 크기 `3%` 이내에 있는지 검사한다. FT86 `downhill-right-2` 바깥 anchor는 이 기준에 맞춰 `x 0.830 → 0.825`로 보정했다. runtime 시각 승인은 SOL-5 캡처에서 확정한다.
- `footprint`는 SOL-4에서 level `0.18h / 0.15h`, downhill `0.20h / 0.16h`, uphill `0.16h / 0.14h`의 reach/far half-width를 기준으로 재설정했다. 각 terrain의 right-1/right-2는 단계마다 `0.005h`씩 짧고 좁아진다. 별도 `intensityGain`은 FT86/G70 차이가 SOL-5 캡처에서 확인될 때만 추가한다.
- `?debugGuides=true` overlay와 pose-sheet에서 lamp anchor, 명시 yaw 축, near/far edge를 동시에 확인한다. `center → right-1 → right-2`의 각도가 `0° → 약 9° → 약 16°`로 증가해야 한다.

### Sol 작업 분할

각 작업은 다른 Sol 작업의 파일을 동시에 수정하지 않도록 분리한다. 작업 완료 시 반드시 `npm run build`, `npm run qa:headlight-profiles`, `git diff --check`를 해당 범위에 맞춰 실행하고, 결과를 다음 작업자에게 전달한다.

| ID | 담당 범위 | 선행 | 변경 파일 | 완료 기준 |
| --- | --- | --- | --- | --- |
| `SOL-1` | 명시 yaw profile과 차체 축 계산 | 없음 | `vehicle.ts`, `vehicleHeadlight.ts`, 두 vehicle atlas JSON, `audit-headlight-profiles.ts` | `beamYawDeg`가 center/right-1/right-2에서 단조 증가하고 좌측 mirror·sprite rotation을 포함한 축 QA가 통과한다. lamp baseline 수직축 의존을 제거한다. |
| `SOL-2` | 순수 short trapezoid shader | `SOL-1` | `headlightShader.ts` | ellipse/lobe 코드가 제거되고, 명시 axis·short reach uniform만 쓰는 하나의 soft trapezoid가 된다. broad body peak는 목표 광량 범위의 초기값을 사용한다. |
| `SOL-3` | runtime uniform·far assist 재조정 | `SOL-1`, `SOL-2` | `main.ts`, 필요 시 `vehicleHeadlight.ts` | profile reach/width를 shader·debug guide에 동일 전달하고, far assist를 최대 `12~16px`, progress `55%+`로 제한한다. near edge가 assist로 움직이지 않는다. |
| `SOL-4` | atlas 수치 보정과 asset 정합 QA | `SOL-1`~`SOL-3` | 두 vehicle atlas JSON, `audit-headlight-profiles.ts`, 필요 시 pose-sheet script | FT86/G70·level/downhill/uphill의 short-reach 값이 범위·순서를 만족한다. anchor/yaw/near·far edge를 보는 debug pose-sheet 또는 overlay 검증을 추가한다. |
| `SOL-5` | 통합 visual QA와 최종 미세조정 | `SOL-4` | atlas JSON, 문서, 필요 시 shader 상수만 | `qaSteer=-1/-0.5/0/0.5/1`, level/uphill/downhill, FT86/G70 캡처에서 방향·길이·광량을 확인한다. 수치 변경은 이 작업에서만 최종 확정한다. |

### Sol 실행 상태

- [x] `SOL-1` — 두 atlas에 `beamYawDeg` `0° / 9° / 16°`를 추가했다. beam forward/lateral axis는 lamp baseline이 아니라 `mirror된 profile yaw + 실제 sprite rotation`으로 계산하며, lamp point는 anchor와 projected near span에만 사용한다. 단조 증가·좌우 mirror·rotation 합성은 profile QA로 고정했다.
- [x] `SOL-2` — `softEllipse`와 좌·우 lobe를 제거했다. 하나의 widening trapezoid signed-distance에서 outer/body/core 농도를 만들고, near/far fade도 동일 mask에 적용한다. runtime intensity `0.72~0.90`에서 peak additive blue가 약 `0.24~0.30`이 되도록 초기 광량을 설정했다. 브라우저 회귀 캡처로 원형 hotspot 없이 단일 trapezoid가 렌더링되는 것을 확인했다. 실제 short reach 수치 전달과 far assist 제한은 `SOL-3`, 차량별 수치 확정은 `SOL-4/5`에서 진행한다.
- [x] `SOL-3` — profile footprint를 viewport pixel 치수로 변환하는 공통 함수를 추가해 shader와 debug guide가 동일한 reach·far width·near padding을 사용하도록 고정했다. fallback은 목표 시작값인 reach `0.18h`, far half-width `0.15h`로 낮췄다. far assist는 최대 `30px → 14px`로 제한했고, shader에서는 progress `55%` 이전까지 `0`을 유지한다. QA는 assist가 near edge를 움직이지 않고 far center만 lateral axis로 최대 `14px` 이동하는지 검증한다.
- [x] `SOL-4` — FT86/G70의 level/downhill/uphill footprint를 short-reach 목표값으로 교체하고, 각 terrain에서 `center > right-1 > right-2`의 reach·width 순서를 QA로 고정했다. `sharp` 기반 asset QA가 두 sprite sheet의 실제 alpha bounds와 18개 lamp anchor를 비교하며, steering anchor가 우측 노즈 영역에 있는지도 검사한다. FT86 downhill strong-right anchor 한 점을 `x 0.825`로 보정했다. build와 12개 방향 profile·18개 sprite anchor QA는 통과했다.
- [x] `SOL-5` — FT86/G70 각각 `downhill/level/uphill × qaSteer -1/-0.5/0/0.5/1` 15장씩, 총 30장을 동일 viewport·속도·위치에서 캡처했다. 좌우 mirror, steering 단계별 단조 방향 변화, terrain reach 순서, 차량별 anchor 연결, 단일 trapezoid 유지, 도로 표식 비포화를 확인했다. SOL-4 수치가 광량·길이·방향 목표를 충족해 추가 atlas/shader 미세조정 없이 최종 승인했다. 캡처 도구는 steering 5열 contact sheet와 WSL→Windows Node 자동 위임을 지원하며, 결과는 ignored QA 경로 `.astro/headlight-sol5-{ft86,g70}`에 생성한다.

### Sol handoff 규칙

1. `SOL-1`이 새 uniform/data contract(`beamYawDeg`, forward/lateral axis, projected near span)를 문서와 QA에 먼저 고정한다.
2. `SOL-2`와 `SOL-3`은 그 contract를 바꾸지 않는다. contract 변경이 필요하면 `SOL-1`로 되돌린다.
3. `SOL-4`는 형상을 변경하지 않고 profile 수치와 asset 정합만 다룬다.
4. `SOL-5`만 시각 캡처를 근거로 intensity·reach·width 수치를 최종 조정한다. HEAD처럼 개별 lamp pool을 복원하거나 중앙 원형 wash를 추가하지 않는다.

### 4차 완료 기준

- 넓은 광량은 하나의 짧은 soft trapezoid뿐이며, ellipse hotspot·두 원·중앙 원이 보이지 않는다.
- `right-1`보다 `right-2`의 기본 yaw가 명확히 크고, 좌측은 정확한 mirror다.
- level reach는 viewport height의 `0.18` 전후이며, 컨셉 이미지처럼 차량 앞 asphalt에 집중된다.
- 광량은 현재 broad body보다 확실히 읽히지만, HEAD의 additive saturation으로 도로 표식·guardrail을 과노출하지 않는다.
- FT86/G70와 level/downhill/uphill의 JSON profile이 같은 data contract를 충족하고, debug overlay와 shader가 동일 값을 사용한다.

### SOL-5 visual QA 결과

| 검증 항목 | 결과 |
| --- | --- |
| 방향 | center에서 좌·우 medium, strong으로 갈수록 단조롭게 회전하며 좌우가 mirror된다. strong pose에서도 beam이 차체 반대쪽으로 역전되지 않는다. |
| 형상 | 두 원·중앙 원·ellipse hotspot 없이 하나의 widening trapezoid만 보인다. near edge는 차체에 남고 먼 단면만 assist를 받는다. |
| 길이 | level `0.18h`, downhill `0.20h`, uphill `0.16h`가 차량 앞 asphalt 범위에서 구분된다. 이전 `0.256~0.305h`처럼 원거리까지 뻗지 않는다. |
| 광량 | additive blue peak `0.24~0.30` 초기값이 도로에서 읽히면서 차선·guardrail을 포화시키지 않는다. HEAD의 중복 pool보다 약하고 3차 broad body보다 명확하다. |
| 차량 정합 | FT86/G70 모두 같은 형상 계약을 유지하며, 차량 크기와 frame별 lamp anchor 차이로 인한 분리나 순간적인 방향 점프가 없다. |

최종 visual QA에서는 수치 변경을 추가하지 않았다. SOL-4의 atlas 값, SOL-3의 far assist `14px / progress 55%+`, SOL-2의 단일 trapezoid 광량을 최종값으로 유지한다.

## 5차 재설계 계획 — 실제 AFS를 축약한 짧은 주광과 코너 조사

### 사용자 리뷰와 이전 승인 철회

SOL-5 치트시트는 수치 QA와 좌우 mirror에는 통과했지만, 최종 시각 품질에 대한 사용자 승인을 받지 못했다. 따라서 위의 SOL-5 결과는 **기술적 회귀 기준**으로만 보존하고, 광형상 최종 승인으로 간주하지 않는다.

확인된 문제는 두 가지다.

1. 정면의 level reach `0.18h`는 이전 버전보다는 짧지만, 컨셉 이미지와 실제 플레이 화면에서는 여전히 차량 앞보다 너무 멀리 뻗는다.
2. 좌·우 조향은 `beamYawDeg`가 `0° → 9° → 16°`로 증가하고 실제 sprite rotation 최대 약 `3.5°`가 다시 더해진다. strong pose의 합성 광축이 약 `19.5°`가 되며, 하나의 대칭 사다리꼴 전체가 회전해 도로 조명보다 평면 decal처럼 보인다.

현재 합성은 다음 코드 계약에 고정돼 있다.

```text
beamYawRadians = mirror(profile.beamYawDeg) + sprite.rotationRadians
shape          = 위 합성축으로 회전한 하나의 대칭 trapezoid
far assist     = progress 55% 이후의 작은 중심 이동
```

5차에서는 lamp anchor·frame selection·좌우 mirror·terrain profile·contact-sheet 도구는 유지하고, **reach, 광축 입력, 조향 시 광량 분배**를 교체한다.

### 실제 헤드라이트 벤치마크

| 공식 레퍼런스 | 관찰 | Apex Seoul 적용 |
| --- | --- | --- |
| [HELLA AFS](https://www.hella.com/techworld/us/technical/automotive-lighting/adaptive-headlights/) | AFS는 조향각·속도·도로 조건에 따라 서로 다른 light distribution을 사용하며, 동적 bend lighting은 최대 약 `15°`까지 회전한다. | sprite pose 각도를 광축에 그대로 더하지 않는다. 주광의 게임상 각도는 실제 상한보다 충분히 작게 제한한다. |
| [HELLA Bend Lighting](https://www.hella.com/techworld/us/technical/automotive-lighting/bend-lighting/) | 동적 low beam swivel은 정적 bend/cornering light와 함께 사용될 수 있고, 보조광은 abrupt on/off 대신 부드럽게 점멸한다. | 제한적으로 움직이는 main beam과 짧은 inside-corner fill을 분리한다. corner fill은 조향량에 따라 부드럽게 가감한다. |
| [KOITO Intelligent AFS](https://www.koito.co.jp/english/news/docs/20150226145045124314302554eeb4359e5be.pdf) | 조향각과 속도로 회전 반경을 계산해 low-beam axis를 제어하며, 예시 시스템은 램프별 최대 회전각을 `15°`와 `5°`로 다르게 둔다. | 좌우 램프를 같은 각도의 단일 강체 footprint로 취급하지 않는다. 하나의 주광 위에 회전 안쪽의 비대칭 광량을 추가한다. |
| [IIHS Headlight Test](https://www.iihs.org/ratings/about-our-tests/headlights) | 직선·완만한 좌우 곡선·급한 좌우 곡선을 별도로 측정하며, 직선보다 곡선에서 요구되는 조사거리가 짧다. | strong steering에서 사다리꼴을 더 멀리 보내지 않는다. 코너 보조광은 main beam보다 짧게 유지한다. |

실차의 미터 단위 조사거리는 Apex Seoul의 pseudo-3D 화면 픽셀과 직접 대응하지 않는다. 이번 벤치마크에서는 **최대 회전각, 주광과 보조광의 역할 분리, 곡선에서의 상대적 도달거리, 연속적인 전환**만 차용한다.

### 확정 렌더링 모델

```text
lamp anchors
  ├─ main low-beam footprint
  │    ├─ 짧은 전방 reach
  │    ├─ near 30~35%는 차량에 고정
  │    └─ mid/far 단면만 제한된 각도로 코너 쪽 이동
  └─ inside-corner fill
       ├─ main보다 짧은 trapezoid/wedge
       ├─ 회전 안쪽만 확장
       └─ steering에 따라 부드럽게 fade in/out
```

- `lampLeft`와 `lampRight`는 기존처럼 선택된 atlas frame의 실제 near anchor와 시작 폭만 결정한다.
- atlas frame과 `flipX`는 player sprite, shadow, headlight에서 계속 공유한다.
- sprite rotation은 시각적 차체 pose이며, 광축에 `100%` 더하지 않는다. 기본값은 영향도 `0`이고 실제 캡처에서 필요할 때만 최대 `0.25`까지 허용한다.
- main beam은 하나의 soft trapezoid signed-distance를 유지하지만, 전체 도형을 강체 회전하지 않는다.
- corner fill도 원이나 ellipse가 아니라 main near edge와 연결되는 짧은 trapezoid 또는 wedge signed-distance로 만든다.
- 두 mask가 겹치는 부분은 독립된 두 도형으로 읽히지 않도록 하나의 연속된 광량으로 합성한다. 별도 중앙 wash·원형 hotspot·ring은 만들지 않는다.

### 초기 목표 수치

수치는 구현 시작점이며, 마지막 visual QA 전에는 최종값으로 간주하지 않는다.

#### 정면 main footprint

| terrain | 현재 reach | 5차 시작 reach | far half-width 시작값 | 760px viewport의 총 reach |
| --- | ---: | ---: | ---: | ---: |
| level | `0.18h` | `0.13~0.14h` | `0.12~0.13h` | 약 `99~106px` |
| downhill | `0.20h` | `0.15h` | `0.14h` | 약 `114px` |
| uphill | `0.16h` | `0.12h` | `0.11~0.12h` | 약 `91px` |

- far fade는 현재 progress `76%`가 아니라 `62~65%`에서 시작한다.
- level의 고광량 body는 약 `75~85px`에서 끝나고, soft tail만 `100~110px` 이내에 남기는 것을 목표로 한다.
- steering profile은 center보다 main reach를 늘리지 않는다. medium은 terrain 기준의 약 `96%`, strong은 약 `92%`를 시작값으로 사용한다.

#### 조향 분배

| 항목 | center | medium | strong |
| --- | ---: | ---: | ---: |
| main optical swivel | `0°` | `3~4°` | `6~8°` |
| corner-fill 축 | 비활성 | 약 `7°` | 최대 약 `12°` |
| corner-fill reach | 비활성 | main의 약 `55%` | main의 약 `60~65%` |
| corner-fill 광량 | `0` | main peak의 약 `20%` | main peak의 약 `25~30%` |

- main과 corner fill을 포함한 어떤 광축도 벤치마크 상한 `15°`를 넘지 않는다.
- corner fill은 조향 안쪽의 폭을 넓히는 역할이며 main beam보다 멀리 도달하지 않는다.
- 좌회전은 우회전 로직을 mirror하되, 한쪽으로 회전한 뒤 중앙 복귀 시 snap이나 잔광이 생기지 않게 기존 시간 감쇠를 재사용한다.

### 조향 입력과 광축 계약

atlas pose는 lamp anchor를 선택하는 데 사용하고, optical turn은 연속적인 runtime 값으로 계산한다.

```text
frame/flip             = lamp anchor와 terrain footprint 선택
curveIntent            = road tangent + vehicle travel/visual state의 제한된 연속값
mainSwivel             = curveIntent를 0~8°에 매핑
cornerFillWeight       = abs(curveIntent)의 dead-zone 이후 0~1 보간
spriteYawContribution  = 기본 0, 승인된 경우에만 최대 25%
```

- raw steering만 직접 사용하지 않는다. drift의 countersteer에서 조사 방향이 차체 진행 방향 반대로 튈 수 있기 때문이다.
- grip에서는 road tangent 비중을 높이고, drift/setup/recovery에서는 기존 vehicle visual/drift state를 함께 사용한다.
- frame별 `beamYawDeg 9°/16°`를 optical turn의 최종값으로 사용하지 않는다. 새 계약으로 이관한 뒤 기존 필드는 제거하거나 deprecated QA 대상으로 남긴다.
- 기존 `farAssist`는 main shape의 추가 방향 원천이 아니라 road tangent의 미세한 far-section 보정으로만 남기며, HL-REV-3에서 새 progressive swivel과 중복되면 제거한다.

### shader 형상 계약

main beam의 near edge를 고정하면서 실제 각도처럼 먼 단면이 코너 쪽으로 이동하게 한다.

```glsl
float swivelBlend = pow(smoothstep(0.30, 1.0, progress), 1.2);
float swivelOffset = tan(radians(uMainSwivelDeg)) * localY * swivelBlend;
float mainX = localX - swivelOffset;
```

- progress `0~30%`는 lamp anchor에 고정한다.
- progress `30~100%`에서만 main 중심이 제한적으로 이동한다.
- 안쪽 side edge는 조향량에 따라 조금 더 넓어지고, 바깥쪽 edge는 가능한 한 전방 coverage를 유지한다.
- 기존처럼 전체 좌표계를 `16°+` 회전하지 않으므로 strong pose에서도 near edge가 옆으로 미끄러지지 않는다.
- corner fill mask는 main near/mid 영역과 반드시 겹쳐야 하며, 단독 원형광처럼 분리되는 배치는 허용하지 않는다.

### 목표 데이터 계약

구현 중 실제 TypeScript 명칭은 기존 naming convention에 맞출 수 있지만 역할은 다음처럼 분리한다.

```ts
type VehicleHeadlightProfile = {
    lampLeft: NormalizedPoint;
    lampRight: NormalizedPoint;
    footprint: {
        reachRatio: number;
        farHalfWidthRatio: number;
        nearPaddingPx: number;
        farFadeStart: number;
    };
    optical: {
        mainSwivelDeg: number;
        cornerFillYawDeg: number;
        cornerFillReachScale: number;
        cornerFillIntensity: number;
    };
};
```

- 차량 JSON은 FT86/G70의 anchor와 terrain footprint 차이만 소유한다.
- runtime은 연속 `curveIntent`로 center/medium/strong 사이 optical 값을 보간한다.
- shader, debug guide, telemetry는 동일한 main/corner 값을 전달받는다.
- `audit-headlight-profiles.ts`는 범위뿐 아니라 `corner reach < main reach`, `main ≤ 8°`, `corner ≤ 12°`, 좌우 mirror를 검사한다.

### 실행 단위

각 작업은 한 턴에서 구현·검증·체크까지 끝낼 수 있도록 순차 실행한다. 다음 단계는 선행 단계의 완료 기준이 충족된 뒤에만 시작하며, 여러 단계를 한 번에 미세조정하지 않는다.

| ID | 담당 범위 | 선행 | 주요 변경 파일 | 완료 기준 |
| --- | --- | --- | --- | --- |
| `HL-REV-1` | 정면 reach와 fade 축소 | 없음 | 두 vehicle atlas JSON, `headlightShader.ts`, `audit-headlight-profiles.ts` | center 치트시트에서 level soft tail `100~110px` 이내, terrain 순서 `downhill > level > uphill`, 조향 로직은 변경하지 않는다. |
| `HL-REV-2` | 광축 입력 분리와 데이터 계약 | `HL-REV-1` | `vehicle.ts`, `vehicleHeadlight.ts`, `main.ts`, 두 vehicle atlas JSON, `audit-headlight-profiles.ts` | sprite rotation 100% 합산을 제거하고 `curveIntent`, main/corner 각도, debug axis, telemetry가 같은 값을 사용한다. 이 단계에서는 corner fill을 아직 렌더하지 않는다. |
| `HL-REV-3` | progressive main footprint | `HL-REV-2` | `headlightShader.ts`, `main.ts`, 필요 시 `vehicleHeadlight.ts` | near 30%는 고정되고 mid/far만 최대 `6~8°` 이동한다. 전체 강체 회전과 중복 far assist를 제거하며 원·ellipse는 추가하지 않는다. |
| `HL-REV-4` | inside-corner fill | `HL-REV-3` | `headlightShader.ts`, `main.ts`, `vehicle.ts` | 회전 안쪽에 main보다 짧은 trapezoid/wedge가 연속 합성된다. strong에서도 fill reach `≤65%`, peak `≤30%`, 축 `≤12°`를 만족하고 독립된 blob이 없다. |
| `HL-REV-5` | 차량·terrain 통합 visual QA와 최종 수치 확정 | `HL-REV-4` | 두 vehicle atlas JSON, QA/capture script, 문서, 필요 시 shader 상수 | FT86/G70 30장 치트시트와 실제 좌우 전환에서 정면 길이, 비대칭 코너 coverage, 좌우 mirror, 무점프 전환을 승인한다. 구조 변경 없이 수치만 최종 조정한다. |

### 단계별 상세 handoff

#### HL-REV-1 — 정면 reach와 fade 축소

1. center profile의 level/downhill/uphill reach와 far width를 시작 범위로 낮춘다.
2. `farFadeStart`를 profile에 둘지 전역 shader 상수로 둘지 결정한다. terrain별 차이가 필요하지 않으면 전역 `0.63`으로 시작한다.
3. 기존 audit의 reach 허용 범위 `0.15~0.20`을 새 범위로 갱신한다.
4. FT86/G70 center 3 terrain만 먼저 캡처한다. 이 단계에서 steering yaw나 광량은 조정하지 않는다.

Handoff에는 선택한 level reach(`0.13` 또는 `0.14`), 실제 pixel tail, 두 차량에서 동일하게 읽히는지 기록한다.

**실행 결과 (2026-07-21)**

- level 시작값은 광량 손실을 최소화하는 `0.14h`를 선택했다. 760px viewport의 mask cutoff는 기존 `136.8px → 106.4px`로 약 `22%` 짧아졌다.
- downhill은 `0.15h = 114px`, uphill은 `0.12h = 91.2px`이며 `downhill > level > uphill` 순서를 유지한다.
- far half-width는 center 기준 level `0.125h`, downhill `0.14h`, uphill `0.115h`로 줄였다. medium/strong은 각 terrain에서 `0.005h`씩 추가로 짧고 좁게 유지한다.
- far fade 시작은 전역 `0.63`으로 앞당겼다. level에서는 약 `67px`부터 soft fade가 시작되고 `106.4px`에서 끝나므로, 고광량 body는 차량 가까이에 남고 먼쪽은 부드러운 tail로만 보인다.
- fallback footprint도 level center와 같은 `reach 0.14h / far half-width 0.125h`로 맞춰 profile 누락 시 이전 장거리 형상으로 돌아가지 않게 했다.
- FT86/G70 각각 15장씩 총 30장을 동일한 1200×760 조건으로 캡처했다. 두 차량 모두 center에서 짧아진 footprint가 같은 화면 범위로 읽히며, 원형 hotspot이나 분리된 중앙광은 새로 생기지 않았다.
- 결과 경로: `.astro/headlight-hl-rev-1-ft86/contact-sheet.png`, `.astro/headlight-hl-rev-1-g70/contact-sheet.png`.
- `beamYawDeg`, sprite rotation 합성, `farAssist`, 광량 상수는 HL-REV-1에서 변경하지 않았다.

#### HL-REV-2 — 광축 입력 분리

1. `beamYawDeg + rotationRadians` 합성을 새 optical contract로 교체한다.
2. frame transform은 lamp point에 계속 적용하되 sprite rotation의 optical 영향도는 기본 `0`으로 둔다.
3. 연속 `curveIntent`, `mainSwivelDeg`, `cornerFillWeight`를 runtime QA state에 기록한다.
4. debug overlay에 vehicle/sprite axis, main optical axis, 향후 corner-fill axis를 서로 다른 색으로 표시한다.
5. audit에서 strong main angle `≤8°`, 전체 허용 상한 `<15°`, 좌우 mirror를 검사한다.

Handoff에는 조향 `-1/-0.5/0/0.5/1`의 계산 각도와 sprite pose 각도를 표로 남긴다.

**실행 결과 (2026-07-21)**

- 두 atlas의 18개 `beamYawDeg` 필드를 제거하고 `optical` profile로 교체했다. canonical center/medium/strong 값은 main `0° / 4° / 8°`, corner preview `0° / 7° / 12°`다.
- `curveIntent`는 `-1..1` 연속값이며 canonical profile 사이를 선형 보간한다. grip에서는 road tangent `55%`, vehicle visual direction `45%`, drift/setup/recovery에서는 road `30%`, vehicle direction `70%`로 합성해 countersteer 반전을 줄인다.
- curve intent의 방향 전환·증가 응답은 `0.10초`, 중앙 또는 작은 값으로 복귀하는 응답은 `0.18초`로 설정했다.
- sprite rotation은 기존처럼 lamp anchor transform에는 `100%` 적용하지만 optical axis 영향도는 `0`으로 고정했다. strong pose에서도 `8° + 3.5°`가 되지 않고 main axis는 최대 `8°`에 머문다.
- 현재 shader는 새 main axis를 사용하지만 여전히 하나의 trapezoid 전체가 해당 축으로 회전한다. near 고정 + progressive offset은 의도대로 HL-REV-3 범위로 남겼고 corner fill도 아직 렌더하지 않는다.

| canonical `curveIntent` | grip sprite transform | main optical axis | corner preview axis | sprite optical contribution |
| ---: | ---: | ---: | ---: | ---: |
| `-1` | `-3.5°` | `-8°` | `-12°` | `0°` |
| `-0.5` | `-1.75°` | `-4°` | `-7°` | `0°` |
| `0` | `0°` | `0°` | `0°` | `0°` |
| `0.5` | `1.75°` | `4°` | `7°` | `0°` |
| `1` | `3.5°` | `8°` | `12°` | `0°` |

- debug guide는 lamp near edge를 황색, sprite transform axis를 흰색, main optical axis를 청색, 향후 corner-fill axis를 녹색으로 표시한다. 분홍색 footprint guide는 청색 main axis와 같은 runtime 값을 사용한다.
- runtime QA state에 `curveIntentTarget`, 감쇠된 `curveIntent`, main/corner 각도, corner reach/intensity/weight, `spriteYawInfluence`와 pose의 실제 sprite rotation/contribution을 기록한다.
- `qa:headlight-profiles`는 두 atlas의 terrain-independent optical contract, canonical 5단계 보간, main `≤8°`, corner `≤12°`, corner reach `< main`, intensity `≤30%`, 좌우 mirror, sprite yaw contribution `0`을 검사한다.
- FT86/G70 각각 15장씩 총 30장의 debug 캡처를 완료했다. 결과 경로는 `.astro/headlight-hl-rev-2-ft86/contact-sheet.png`, `.astro/headlight-hl-rev-2-g70/contact-sheet.png`다.

#### HL-REV-3 — main footprint 변형

1. 기존 회전된 local basis 대신 near 고정 + progressive offset 공식을 적용한다.
2. progress `30%` 이전 offset이 수치상 `0`인지 shader 대응 helper 또는 audit로 검증한다.
3. 안쪽 edge만 소폭 확장하고 바깥 edge는 급격히 사라지지 않도록 asymmetric half-width를 적용한다.
4. `farAssist`와 progressive swivel이 같은 값을 중복 적용하면 legacy far assist를 제거한다.
5. center 결과가 HL-REV-1과 동일한지 회귀 캡처한다.

Handoff에는 near/mid/far 세 단면의 중심 X와 좌우 edge 좌표를 기록한다.

**실행 결과 (2026-07-21)**

- main footprint의 좌표계를 lamp anchor 기준 screen-forward 축으로 고정했다. `mainSwivelDeg`는 전체 사다리꼴을 회전시키지 않고 progress `30%` 이후의 단면 중심에만 점진적으로 적용된다.
- swivel blend는 `pow(smoothstep(0.30, 1.0, progress), 1.2)`이며 최대 main swivel은 HL-REV-2 계약과 같은 `8°`다. 따라서 차량 바로 앞 `0~30%`는 조향과 무관하게 lamp anchor에 고정된다.
- 폭 보간은 `progress^0.72`를 사용한다. 조향 바깥쪽 edge는 swivel offset만큼 half-width를 보상해 정면 coverage를 보존하고, 안쪽 edge만 far half-width의 최대 `12%`까지 추가 확장한다.
- shader와 TypeScript debug guide가 같은 progress·폭·swivel·inside expansion 상수를 공유한다. guide는 near `0%`, mid `65%`, far `100%` 단면을 표시해 shader 형상과 수치 QA를 같은 계약으로 비교할 수 있다.
- 기존 `farAssist`는 progressive swivel과 중복되는 두 번째 방향 원천이므로 runtime 상태, telemetry, shader uniform, guide, audit에서 제거했다. main footprint의 방향 입력은 이제 `mainSwivelDeg` 하나뿐이다.
- `mainSwivelDeg = 0°`이면 모든 swivel/inside expansion 값이 정확히 `0`이므로 center 결과는 HL-REV-1의 정면 사다리꼴과 동일하다. corner fill은 이 단계에서 렌더하지 않았다.

FT86 level strong-right를 760px viewport에서 계산한 lamp-center 상대 lateral 좌표는 다음과 같다. longitudinal은 차량 앞 방향 거리이며 center/edge는 오른쪽을 양수로 둔다. 좌회전은 아래 값의 정확한 mirror다.

| 단면 | progress | longitudinal | center X | left edge | right edge |
| --- | ---: | ---: | ---: | ---: | ---: |
| near | `0.00` | `0.0px` | `0.0px` | `-21.6px` | `21.6px` |
| anchor boundary | `0.30` | `29.6px` | `0.0px` | `-49.2px` | `49.2px` |
| mid | `0.65` | `64.2px` | `3.9px` | `-69.9px` | `78.3px` |
| far | `1.00` | `98.8px` | `13.9px` | `-87.4px` | `111.8px` |

- far 바깥쪽 edge `-87.4px`는 center profile의 기존 far edge와 같고, 코너 안쪽 edge만 `111.8px`까지 확장된다. 이로써 전체 강체 회전 때 발생하던 바깥쪽 도로 coverage 손실을 막았다.
- `qa:headlight-profiles`는 near `30%`의 offset/inside expansion `0`, main 축 `≤8°`, base/main 축 분리, 바깥 edge 보존, mid/far 좌우 mirror를 두 atlas에서 검사한다.
- FT86/G70 각각 15장씩 총 30장의 level/uphill/downhill × center/medium/strong debug 캡처를 완료했다. 결과 경로는 `.astro/headlight-hl-rev-3-ft86/contact-sheet.png`, `.astro/headlight-hl-rev-3-g70/contact-sheet.png`다.

#### HL-REV-4 — corner fill 추가

1. main과 같은 local coordinate에서 inside-corner trapezoid/wedge SDF를 만든다.
2. steering dead-zone 이후에만 weight를 올리고 중앙 복귀 시 기존 감쇠 시간으로 fade out한다.
3. fill 시작부를 main footprint 안에 겹쳐 독립된 도형의 경계가 보이지 않게 한다.
4. main과 fill을 additive로 무제한 합산하지 않고 peak 상한을 유지한다.
5. left/right mirror에서 inside edge 선택이 반전되는지 audit한다.

Handoff에는 medium/strong의 fill reach, yaw, peak, main 대비 coverage 차이를 기록한다.

**실행 결과 (2026-07-21)**

- corner fill을 main과 같은 lamp-center 좌표에서 시작하는 하나의 비대칭 trapezoid/wedge SDF로 구현했다. near half-width는 main near의 `72%`라 시작부가 main 안에 완전히 겹치며 별도 원형광이나 분리된 발광점이 생기지 않는다.
- 조향 크기 `0.12`까지는 fill weight가 정확히 `0`인 dead-zone으로 두고, `0.12~0.50`에서 smoothstep으로 활성화한다. medium `0.50`부터 weight `1`이며 중앙 복귀와 좌우 전환은 HL-REV-2의 동일한 감쇠된 `curveIntent`를 사용한다.
- medium/strong의 atlas optical 계약은 변경하지 않았다. medium은 yaw `7°`, main reach의 `55%`, main peak의 `20%`이고 strong은 yaw `12°`, reach `65%`, peak `30%`다.
- fill far 단면은 조향 바깥쪽 half-width를 main far-width의 `75%`, 안쪽을 `95%`로 구성했다. 따라서 회전 안쪽만 main coverage 밖으로 확장되고 바깥쪽 edge는 main footprint 내부에 남는다.
- fill은 자체 reach `68%`부터 fade out하며 main과 단순 additive 합산하지 않는다. shader에서 채널별 `max(mainColor, cornerColor)`로 bounded union을 만들어 main과 겹치는 부분의 광도가 최대 `30%`만큼 다시 누적되지 않게 했다.
- shader와 TypeScript debug guide는 같은 yaw/reach/near·outside·inside width 상수를 사용한다. debug 화면의 녹색 wedge는 실제 shader fill의 near/far 단면이며 분홍색 main guide와 직접 비교할 수 있다.

FT86 level의 760px viewport 기준 right-turn handoff 수치는 다음과 같다. 좌회전은 정확한 mirror다.

| 단계 | main reach | fill reach | fill yaw | fill peak | main inside edge¹ | fill inside edge¹ | inside coverage 증가 | fill outside edge¹ | main outside edge¹ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| medium | `102.6px` | `56.4px` (`55%`) | `7°` | `20%` | `68.1px` | `92.9px` | `+24.8px` | `-61.0px` | `-66.1px` |
| strong | `98.8px` | `64.2px` (`65%`) | `12°` | `30%` | `76.9px` | `94.6px` | `+17.7px` | `-50.8px` | `-69.1px` |

¹ fill 중심이 끝나는 screen-forward 단면에서 lamp center에 대한 lateral 좌표다. 양수는 right-turn 안쪽이며, fill outside edge가 main outside edge보다 안쪽에 있으므로 반대편 coverage를 침범하지 않는다.

- `qa:headlight-profiles`는 dead-zone과 연속 활성화, yaw `≤12°`, reach `≤65%`, peak `≤30%`, inside edge 확장, outside edge 내부 유지 및 좌우 guide mirror를 두 atlas의 12개 방향 profile에서 검사한다.
- FT86/G70 각각 15장씩 총 30장의 level/uphill/downhill × center/medium/strong debug 캡처를 완료했다. center에서는 녹색 fill이 비활성이고, 두 차량의 medium/strong에서 같은 짧은 비대칭 wedge로 읽힌다.
- 결과 경로는 `.astro/headlight-hl-rev-4-ft86/contact-sheet.png`, `.astro/headlight-hl-rev-4-g70/contact-sheet.png`다.

#### HL-REV-5 — 최종 visual QA

동일 viewport·속도·위치에서 다음 30장을 생성한다.

```text
FT86, G70
  × level, uphill, downhill
  × qaSteer -1, -0.5, 0, 0.5, 1
```

contact sheet에는 일반 렌더와 함께 다음 guide를 확인할 수 있어야 한다.

- lamp near edge
- main axis와 reach 끝점
- corner-fill axis와 reach 끝점
- main/fill 광량 비율
- `curveIntent`와 sprite rotation contribution

실제 입력 QA에서는 직선 복귀, 좌→우 전환, 우→좌 전환, grip curve, drift/countersteer를 확인한다.

**실행 결과 및 최종 승인값 (2026-07-21)**

- 구조 변경 없이 HL-REV-1~4의 수치를 최종 승인했다. 일반 렌더에서 광량은 속도에 따라 `0.72~0.90`, main peak blue는 약 `0.24~0.30`이며 기존의 과포화 버전과 약한 버전 사이에서 도로 형상이 읽히는 수준이다.
- main reach는 center 기준 downhill/level/uphill `0.15h / 0.14h / 0.12h`, level medium/strong `0.135h / 0.13h`다. far fade는 main reach `63%`부터 시작한다.
- main optical axis는 center/medium/strong `0° / 4° / 8°`, near 고정 구간은 `30%`, inside edge 확장은 최대 `12%`다. sprite optical contribution은 최종 `0`이다.
- corner fill은 dead-zone `0.12`, medium `7° / 55% / 20%`, strong `12° / 65% / 30%`를 유지한다. outside/inside far-width는 main far-width의 `75% / 95%`, fill fade 시작은 자체 reach의 `68%`이며 main과 채널별 max 합성한다.
- curve intent 응답은 방향 전환·증가 attack `0.10초`, 중앙/작은 값 복귀 `0.18초`로 확정했다. 해당 감쇠를 공용 helper로 분리하고 center→right, right→center, right→left, left→right 60fps sequence의 단조성, 무오버슈트, center sign crossing `≤1`을 audit에 추가했다.

최종 정적 visual QA는 FT86/G70 각각 `3 terrain × 5 steering = 15장`, 총 30장이다. 각 contact sheet의 위쪽은 일반 렌더, 아래쪽은 동일 프레임의 lamp/main/corner guide다.

- FT86: `.astro/headlight-hl-rev-5-ft86-normal/contact-sheet.png`
- G70: `.astro/headlight-hl-rev-5-g70-normal/contact-sheet.png`
- center level의 soft tail은 `106.4px`, downhill `114px`, uphill `91.2px`에서 끝난다. 일반 렌더에서 독립된 원·타원·중앙 blob, 가드레일 포화, crest 너머 누출은 확인되지 않았다.
- 두 차량은 같은 screen footprint와 optical contract를 사용하면서 atlas lamp anchor만 다르며, center/medium/strong과 좌우 결과가 mirror된다.

실제 입력 telemetry도 `20Hz`로 교차 검증했다.

| 시나리오 | samples | 관찰 결과 |
| --- | ---: | --- |
| `curve-counter-steer` | `400` | main 최대 `3.599°`, corner 최대 `6.299°`, dead-zone 위반 `0`, sprite optical contribution `0` |
| `slalom-40s` | `800` | 좌우 sign crossing `11회`, main 최대 `±4.508°`, 20Hz sample 최대 변화 `2.804°`, dead-zone 위반 `0` |
| `brake-on-curve`, `qaSpeed=650` | `360` | grip/setup/drift/recovery `306/2/50/2` samples, main 최대 `7.019°`, corner 최대 `10.774°`, 20Hz sample 최대 변화 `2.324°` |

- slalom의 네 차례 steering release에서 corner fill은 `0~0.10초` 안에 꺼졌고 main yaw는 `0.15~0.25초` 안에 `±0.2°` 이내로 복귀했다. snap이나 잔류 corner fill은 없었다.
- drift/setup/recovery의 non-grip active sample은 54개였고 방향 sign-crossing의 단일 `50ms` 경계 sample 외에는 visual travel 방향과 일치했다. main `8°`, corner `12°` 상한을 넘거나 countersteer 반대로 지속되는 상태는 없었다.
- QA 도구에는 일반 렌더와 기존 guide 캡처를 상하로 합치는 `--guide-dir`을 추가했다. WSL에서 Windows Edge telemetry가 CDP bridge에 의존하지 않도록 Windows Node 위임 경로를 추가했고, 실제 게임 조작과 다르던 `brake-on-curve`의 브레이크 입력을 `ArrowDown`에서 `Space`로 수정했다.

### 5차 완료 기준

- level 정면에서 고광량 body가 차량 앞 약 `75~85px`에 집중되고 soft tail이 `100~110px`를 넘지 않는다.
- downhill이 level보다 길고 uphill이 level보다 짧지만, 어느 terrain에서도 이전 level `0.18h`보다 과도하게 멀리 뻗지 않는다.
- strong 조향에서 main axis는 `8°` 이내이며, sprite rotation을 더해 `19.5°`까지 회전하는 이전 동작이 없다.
- near `30%`는 차량에 고정되고, mid/far와 inside edge만 코너 방향으로 확장된다.
- corner fill은 main보다 짧고 약하며, 독립된 원·타원·중앙 광원으로 읽히지 않는다.
- 좌우 결과는 mirror되고 center/medium/strong 전환은 단조롭고 연속적이다.
- FT86/G70의 lamp anchor와 terrain footprint JSON은 동일한 data contract와 audit를 통과한다.
- 차선·guardrail을 포화시키거나 숲·옹벽·crest 뒤 road를 비추지 않는다.

### 5차 실행 상태

- [x] `HL-REV-1` — 정면 reach와 fade 축소. level `0.14h`, downhill `0.15h`, uphill `0.12h`, far fade `0.63`을 적용하고 FT86/G70 30장 캡처를 완료했다.
- [x] `HL-REV-2` — 광축 입력 분리와 데이터 계약. 연속 curve intent, main `0/4/8°`, corner preview `0/7/12°`, sprite yaw contribution `0`을 적용하고 두 차량 debug 캡처를 완료했다.
- [x] `HL-REV-3` — progressive main footprint. near `30%` 고정, 최대 main swivel `8°`, 안쪽 edge 최대 `12%` 확장, 바깥 edge 보존을 적용하고 중복 `farAssist`를 제거했다.
- [x] `HL-REV-4` — inside-corner fill. dead-zone `0.12`, medium `7°/55%/20%`, strong `12°/65%/30%`의 짧은 비대칭 wedge와 bounded max 합성을 적용하고 두 차량 캡처를 완료했다.
- [x] `HL-REV-5` — 통합 visual QA와 최종 수치 확정. 두 차량 일반+guide 30장, 순수 전환 sequence, 실제 counter-steer/slalom/drift 1,560 samples를 통과하고 HL-REV-1~4 수치를 최종 승인했다.

### 5차 공통 검증과 변경 규칙

각 단계 완료 시 최소 다음 명령을 실행한다.

```bash
npm run build
npm run qa:headlight-profiles
git diff --check
```

브라우저 렌더가 바뀌는 `HL-REV-1`, `HL-REV-3`, `HL-REV-4`, `HL-REV-5`는 해당 단계의 contact sheet 또는 고정 프레임 캡처도 남긴다.

1. 각 단계는 자신의 완료 기준을 만족한 뒤 문서의 체크박스와 handoff 결과를 갱신한다.
2. `HL-REV-1`에서는 방향을, `HL-REV-2`에서는 형상과 광량을, `HL-REV-3/4`에서는 atlas anchor를 함께 조정하지 않는다.
3. 새 원·ellipse·ring·독립 중앙 wash는 회귀로 간주한다.
4. 다음 단계에서 선행 단계의 승인값을 변경해야 하면 이유와 before/after 캡처를 handoff에 명시한다.
5. 최종 수치 미세조정은 `HL-REV-5`에서만 수행하고, 구조 문제가 발견되면 해당 구조 단계로 되돌린다.

## 6차 방향 정합 개선 — atlas pose 전방축 기반 회전 footprint

### 사용자 리뷰와 문제 재정의

`ft86-retro-fov69-downhill-left-strong.png`에서 차량은 거의 측면을 향하지만 main footprint는 여전히 화면 위쪽을 향한다. HL-REV-2~5는 runtime optical swivel을 main `0/4/8°`, corner fill `0/7/12°`로 제한했지만, strong pose의 큰 yaw는 sprite transform이 아니라 atlas frame 이미지 자체에 그려져 있다. 따라서 `HEADLIGHT_SPRITE_YAW_INFLUENCE = 0`과 screen-forward base basis를 유지하는 현재 구조에서는 차체와 광축이 일치할 수 없다.

Absolute Drift의 공식 Midnight 장면처럼 drift 궤적과 차체 방향이 달라도 헤드라이트는 진행 경로나 화면 전방이 아니라 차량 노즈를 기준으로 투사되어야 한다. strong pose에서는 시각적으로 거의 `90°` 회전한 footprint가 정상에 가깝지만, 원근이 포함된 sprite이므로 고정 `90°`가 아니라 frame별로 승인한 전방축을 사용한다.

참고 링크:

- https://flippfly.com/presskit/absolute_drift/images/13.png
- https://flippfly.com/presskit/sheet.php?p=absolute_drift
- https://docs.godotengine.org/en/stable/classes/class_spotlight3d.html
- https://docs.unity.cn/Manual/UsingLights.html
- https://store.steampowered.com/app/732810/Slipstream/?l=english

### 확정 축 계약

큰 pose yaw와 작은 optical 보조각을 분리한다.

```text
frameForwardYaw = atlas frame 이미지에 그려진 차량 전방축
mirroredYaw     = flipX ? -frameForwardYaw : frameForwardYaw
baseBeamYaw     = mirroredYaw + sprite transform rotation
mainBeamYaw     = baseBeamYaw + mainSwivel
cornerBeamYaw   = baseBeamYaw + cornerFillYaw
```

- `emitterForwardYawDeg`는 우측 원본 frame 기준 양수값으로 차량 JSON이 소유한다.
- `flipX`는 lamp point와 동일하게 전방축 부호도 반전한다.
- sprite의 실제 `rotationRadians`는 lamp 좌표와 전방축에 같은 transform으로 100% 적용한다. 이는 atlas frame pose를 추정하는 값이 아니라 최종 sprite transform을 동일하게 반영하기 위한 값이다.
- 기존 main `0/4/8°`와 corner `0/7/12°`는 screen-forward 절대각이 아니라 frame 전방축에 대한 상대 optical 각도로 유지한다.
- road tangent와 curve intent는 상대 optical 각도를 계산하는 보조 입력이며 frame 전방축을 반전시키거나 대체하지 않는다.

### 데이터 계약

```ts
type VehicleHeadlightProfile = {
    emitterForwardYawDeg: number;
    footprint: {
        reachRatio: number;
        farHalfWidthRatio: number;
        nearPaddingPx: number;
    };
    lampLeft: NormalizedPoint;
    lampRight: NormalizedPoint;
    optical: VehicleHeadlightOpticalProfile;
    poseAimX: number;
};
```

초기 후보값은 center `0°`, medium `42°`, strong `78°`다. strong은 비교 캡처에서 `72°/78°/82°/90°`를 확인해 차량별로 조정할 수 있으나 좌우는 반드시 정확한 mirror여야 한다. terrain variant는 같은 steering pose의 전방축을 공유한다.

### 형상과 투영 규칙

1. `beamForwardAxis`와 `beamLateralAxis` 전체를 `baseBeamYaw`로 회전한다. near/mid/far 단면이 모두 같은 frame 전방축을 사용하므로 strong pose의 사다리꼴 전체가 차량 노즈 방향으로 이동한다.
2. near edge 중심은 기존 두 lamp anchor의 평균에 고정한다. strong pose에서 두 램프가 원근상 거의 겹치면 projected lamp span이 자연스럽게 줄어 하나의 통합 사다리꼴로 읽히게 한다.
3. progressive main swivel은 회전된 base basis 위에서 progress `30%` 이후에만 상대적으로 적용한다. near anchor 고정 규칙은 유지한다.
4. corner fill도 회전된 base basis에 대한 상대 yaw로 계산한다. screen-forward 절대각을 다시 사용하지 않는다.
5. 측면 pose는 기존 far width를 그대로 회전하면 세로로 과도하게 넓어질 수 있으므로 medium/strong의 `farHalfWidthRatio`를 줄인다. center 광도·reach·fade는 HL-REV-5 승인값을 유지한다.
6. strong의 reach는 center보다 늘리지 않고 현재 terrain별 축소 순서를 유지한다. 방향 정합과 광량 튜닝을 한 단계에서 섞지 않는다.

### 실행 단위

| ID | 범위 | 주요 변경 | 완료 기준 |
| --- | --- | --- | --- |
| `HL-REV-6A` | 문서와 데이터 계약 | 문서, `vehicle.ts`, 두 atlas JSON | 모든 profile에 `emitterForwardYawDeg`가 있고 center/medium/strong 및 terrain 공유 규칙을 audit한다. |
| `HL-REV-6B` | base beam basis | `vehicleHeadlight.ts`, `main.ts` | frame yaw·flip·sprite rotation을 합성하며 strong 좌우 base axis가 정확히 mirror된다. |
| `HL-REV-6C` | 회전 main/corner footprint | `vehicleHeadlight.ts`, shader 주석/guide | main과 corner가 회전된 base basis를 공유하고 optical `8°/12°`는 상대각으로 유지된다. |
| `HL-REV-6D` | 측면 투영 보정 | 두 atlas JSON, audit | center는 변화가 없고 medium/strong의 회전 footprint가 차량 뒤나 화면 하단에 과도하게 걸리지 않는다. |
| `HL-REV-6E` | 통합 QA | audit/capture script, 문서 | FT86/G70 30장과 실제 좌우 전환에서 노즈-광축 차이, mirror, 무점프 전환을 확인한다. |

### 완료 기준

- FT86/G70 strong pose에서 base beam axis가 visible nose 방향과 같은 부호이며, 승인된 frame yaw와 오차 `1°` 이내다.
- 최종 main axis와 frame 전방축 차이는 기존 상대 optical 상한 `8°` 이내다.
- corner fill은 frame 전방축 기준 `12°` 이내이고 main보다 짧고 약하다.
- center `emitterForwardYawDeg = 0°`에서 HL-REV-5의 reach, width, 광도, fade가 변하지 않는다.
- left/right의 lamp, base/main/corner axis, near/mid/far 단면이 정확히 mirror된다.
- medium/strong frame 전환에서 전방축이 단조롭게 변하고 반대편으로 snap하지 않는다.
- strong 측면 pose의 빛이 화면 위쪽에 남지 않고 차량 노즈 쪽으로 크게 회전한다.

### 6차 실행 상태

- [x] `HL-REV-6A` — 방향 계약과 실행 단위를 문서화했다.
- [x] `HL-REV-6B` — frame pose 전방축과 sprite transform을 base basis에 합성했다.
- [x] `HL-REV-6C` — main/corner footprint를 회전된 base basis에 연결했다.
- [x] `HL-REV-6D` — medium/strong 측면 투영 수치를 보정했다.
- [x] `HL-REV-6E` — 수치 audit와 FT86/G70 visual QA를 완료했다.

### 6차 구현 결과 (2026-07-21)

- 두 atlas의 18개 profile에 `emitterForwardYawDeg`를 추가했다. center/medium/strong은 `0°/42°/78°`이며 level/downhill/uphill에서 같은 steering pose 축을 공유한다.
- `getVehicleHeadlightScreenPose()`는 `frame yaw → flipX mirror → sprite rotation → 상대 main swivel` 순서로 광축을 합성한다. strong의 main 최종축은 sprite rotation이 `0°`일 때 우측 `86°`, 좌측 `-86°`이며 base axis에 대한 optical 차이는 기존 상한 `8°`를 유지한다.
- shader의 main/corner는 회전된 `beamForwardAxis`와 `beamLateralAxis`를 공통 사용한다. main progressive swivel과 corner fill `12°`는 모두 atlas frame 전방축에 대한 상대각이다.
- 첫 visual capture에서 strong far width를 그대로 회전하면 세로로 두꺼운 광주처럼 보였다. center와 medium은 유지하고 strong far half-width만 level/downhill/uphill `0.065h/0.075h/0.055h`로 축소했다. strong reach는 기존 `0.13h/0.14h/0.11h`를 유지해 길이와 광도 변경을 분리했다.
- debug guide는 atlas frame 축(흰색), sprite transform까지 반영한 base 축(청록색), 상대 optical까지 반영한 main 축(청색)을 분리 표시한다.
- `qa:headlight-profiles`는 2개 atlas의 directional profile 12개와 sprite anchor 18개를 검사했다. frame yaw, flip mirror, sprite rotation 합성, main `≤8°`, corner `≤12°`, 회전된 near/mid/far 및 corner edge mirror를 모두 통과했다.
- FT86/G70 각각 level/uphill/downhill × left strong/medium/center/right medium/strong 15장, 총 30장을 1200×760 조건에서 캡처했다. 실패 장면은 `0`이며 strong 좌우에서 footprint가 화면 전방에 남지 않고 차량 노즈 쪽으로 크게 회전한다.
- 결과 경로:
  - FT86: `.astro/headlight-hl-rev-6-ft86-final/contact-sheet.png`
  - G70: `.astro/headlight-hl-rev-6-g70-final/contact-sheet.png`
- `npm run build`, `npm run qa:headlight-profiles`, `git diff --check`를 통과했다.

## 7차 광원 구조 개선 — dual emitter와 shared spill

### 사용자 리뷰와 원인

HL-REV-6에서 사다리꼴의 방향은 차량 pose와 일치하지만, `ft86-retro-fov69-downhill-left-medium.png`에서는 바깥쪽 광원이 넓은 판처럼 보이고 두 헤드라이트의 중첩과 끝단이 하나의 회전 사다리꼴로 마무리된다.

현재 shader는 실제 `lampLeft`와 `lampRight`를 받지 않고 두 좌표의 평균인 `uBeamCenter`와 투영된 반간격 `uLampHalfSpan`만 사용한다. 따라서 다음 요소를 표현할 수 없다.

1. 두 램프에서 따로 시작하는 좁은 core beam
2. medium/strong 측면 pose에서 카메라 반대편 램프가 차체에 가려지는 원근 차이
3. 두 core가 중거리에서 합쳐지며 중앙만 조금 더 밝아지는 overlap
4. 각 core가 서로 다른 거리에서 먼저 감쇠한 뒤 약한 공통 spill만 남는 끝단

downhill medium은 far half-width가 `0.135h = 102.6px`이고 reach가 `0.145h = 110.2px`다. 42° 회전 상태에서 폭과 길이가 거의 같아 광원이 사다리꼴보다 넓은 삼각 광판으로 읽힌다. 반면 HL-REV-6에서 strong width는 `0.075h = 57px`로 이미 줄였으므로 medium에서 현상이 가장 크게 보인다.

### 확정 렌더링 모델

```text
weak shared spill envelope
  + left lamp narrow core
  + right lamp narrow core
  → perspective-weighted bounded overlap
  → existing short corner fill
```

- shared spill은 현재 전체 silhouette과 soft edge만 담당하며 core/hot spot을 소유하지 않는다.
- 두 core는 실제 lamp origin에서 각각 시작하되 축을 거의 평행하게 유지한다. shared beam center까지 완전히 교차시키지 않고 lamp offset의 최대 `28%`만 toe-in하며, widening lobe가 자연스럽게 겹치도록 한다. `mergeStartRatio`는 toe-in이 완료되는 기준점이고 실제 변화는 그 값의 `45%` 지점부터 시작한다.
- 개별 core의 far width는 shared envelope의 약 `52~60%`만 사용한다.
- center는 두 램프를 같은 광량과 reach로 사용한다.
- medium/strong에서는 노즈 방향의 가까운 램프를 `1.0`, 반대편 램프를 각각 약 `0.65/0.35`로 낮춘다.
- 반대편 램프의 reach도 medium/strong에서 약 `0.90/0.82`로 줄여 두 core의 끝이 같은 직선으로 잘리지 않게 한다.
- core는 전체 reach의 `68%`부터 fade out하고, 최종 soft tail은 shared spill만 남긴다. 첫 캡처의 `55%` 시작값은 merge 구간과 겹쳐 두 core가 합쳐지기 전에 소실되었으므로 폐기했다.
- shared spill 광량은 `0.45 + 0.55 × farLampIntensity`로 perspective 감쇠해 center에서는 연결 면을 충분히 유지하고 medium/strong에서는 다시 단단한 회전 사다리꼴로 보이지 않게 한다.

### overlap 계약

두 core는 단순 additive나 `max()`만 사용하지 않는다.

```glsl
vec3 overlap = max(leftCore, rightCore)
             + min(leftCore, rightCore) * 0.32;
vec3 main = max(sharedSpill, overlap);
```

- 단순 합산처럼 중앙을 두 배로 포화시키지 않는다.
- `max()`만 사용할 때 사라지는 중첩의 밝기 차이는 `32%` overlap gain으로 복원한다.
- 최종 Phaser ADD pass의 peak는 HL-REV-5 승인 광도 범위를 넘지 않게 lobe RGB를 정규화한다.
- corner fill은 dual core 합성 이후 `max(main, corner)`로 연결해 독립 blob이나 추가 포화를 만들지 않는다.

### 데이터 계약

```ts
type VehicleHeadlightEmitterProfile = {
    farLampIntensity: number;
    farLampReachScale: number;
    lobeWidthScale: number;
    mergeStartRatio: number;
};
```

초기 canonical 값은 다음과 같다.

| pose | far lamp intensity | far lamp reach | lobe width | merge start |
| --- | ---: | ---: | ---: | ---: |
| center | `1.00` | `1.00` | `0.60` | `0.58` |
| medium | `0.65` | `0.90` | `0.56` | `0.52` |
| strong | `0.35` | `0.82` | `0.52` | `0.42` |

- 우측 원본 pose에서는 screen-right/nose-side lamp가 가까운 램프이고 screen-left가 far lamp다.
- `flipX` 좌측 pose에서는 두 역할과 수치가 정확히 mirror된다.
- terrain variant는 같은 steering pose의 emitter profile을 공유한다.

### medium 투영 폭 보정

HL-REV-6 각도와 reach는 유지하면서 medium far half-width만 줄인다.

| terrain | 기존 medium | HL-REV-7 시작값 |
| --- | ---: | ---: |
| level | `0.120h` | `0.090h` |
| downhill | `0.135h` | `0.100h` |
| uphill | `0.110h` | `0.080h` |

center와 strong의 footprint 수치는 변경하지 않는다.

### 실행 단위

| ID | 범위 | 완료 기준 |
| --- | --- | --- |
| `HL-REV-7A` | 문서·emitter 데이터 계약·medium 폭 | 두 atlas 18개 profile이 canonical emitter 값과 terrain 공유 규칙을 만족한다. |
| `HL-REV-7B` | 실제 두 lamp uniform과 core lobe | 각 core가 실제 lamp origin에서 시작하고 거의 평행한 축과 제한된 toe-in을 유지한다. |
| `HL-REV-7C` | perspective occlusion과 bounded overlap | 좌우 near/far 역할이 mirror되고 center peak가 기존 광도 범위를 넘지 않는다. |
| `HL-REV-7D` | staggered fade·shared tail·corner 연결 | 두 core 끝단이 한 선으로 잘리지 않고 shared spill만 최종 reach까지 남는다. |
| `HL-REV-7E` | FT86/G70 visual QA | medium-left 외측 광판, 분리 blob, 중앙 과포화 없이 30장 매트릭스를 통과한다. |

### 완료 기준

- FT86 downhill medium-left에서 두 core가 차량 가까이에서는 구분되고 widening과 bounded overlap으로 중거리에서 연결된다.
- 외측 edge는 세로 광주나 회전한 판으로 읽히지 않는다.
- medium far width는 strong보다 크지만 reach와 거의 같은 폭이 되지 않는다.
- far lamp는 medium/strong에서 각각 near lamp보다 약하고 짧다.
- 겹침부는 단일 core보다 밝지만 두 배로 포화되지 않는다.
- far end는 개별 core 경계가 아니라 약한 shared soft tail로 끝난다.
- center의 방향, reach, far width와 전체 peak 광도는 HL-REV-6 이전 결과에서 크게 변하지 않는다.
- FT86/G70과 좌우 flip에서 동일한 data contract와 정확한 mirror를 유지한다.

### 7차 실행 상태

- [x] `HL-REV-7A` 문서화
- [x] `HL-REV-7A` emitter 데이터와 medium 폭
- [x] `HL-REV-7B` dual core lobe
- [x] `HL-REV-7C` perspective와 overlap
- [x] `HL-REV-7D` staggered fade와 corner 연결
- [x] `HL-REV-7E` 통합 QA

### HL-REV-7 구현 결과

- FT86/G70의 18개 headlight profile에 `emitter` 계약을 추가했고 center/medium/strong canonical 값과 terrain 공유 규칙을 audit한다.
- medium far width를 level/downhill/uphill `0.090/0.100/0.080h`로 줄였다. strong과 center 수치는 유지했다.
- shader는 약한 shared spill과 실제 `lampLeft/lampRight`에서 시작하는 두 core를 합성한다. core 축은 완전히 교차하지 않고 최대 `28%` toe-in만 적용하며, 겹침은 `max + min × 0.32`로 제한한다.
- medium/strong의 반대편 램프는 광도 `0.65/0.35`, reach `0.90/0.82`로 감쇠하고 좌우 flip에서 near/far 역할을 mirror한다.
- 첫 visual pass에서 core fade `0.55`가 merge 전에 끝나는 회귀를 확인해 `0.68`로 수정했다. 두 번째 pass의 완전 중심 수렴도 S자형 blob을 만들어 제한된 toe-in으로 교체했다.
- 최종 QA는 `qa:headlight-profiles`의 방향 profile 12개·sprite anchor 18개를 통과했다. visual matrix는 FT86 15장과 G70 15장 모두 실패 없이 캡처했다.
- 최종 캡처는 `.astro/headlight-hl-rev-7-ft86-final-v3/`와 `.astro/headlight-hl-rev-7-g70-final/`에 저장했다.

## 기존 1차 구현 기록

### 구현 순서

1. `headlightShader.ts`에 direction uniform과 shear를 추가하고, fan·pool 모두 같은 변환을 적용한다.
2. `main.ts`에서 차체 pose 기반 target aim과 시간 감쇠 상태를 추가한다.
3. `roadRenderer.ts` 또는 `RoadRenderStats`에 projected road center/tangent sample을 추가하고, grip 상태에서 aim에 blend한다.
4. road edge로의 누출이 확인될 때만 road geometry mask 또는 beam far-limit을 추가한다. 방향 추종 구현 전에 mask를 다시 도입하지 않는다.
5. runtime telemetry/QA에 `headlightAimTargetX`, `headlightAimX`, road tangent, drift state를 기록한다.

### 방향 추종 QA 매트릭스

| 장면 | 확인 항목 |
| --- | --- |
| 직선·정지/중속/고속 | 중앙 복귀, 속도별 aim 제한, 차체 분리 여부 |
| 좌·우 grip 커브 | pool과 fan이 road tangent 쪽으로 자연스럽게 이동하는지 |
| 좌·우 drift 진입/유지 | 차체 pose를 따라가되 raw steering 반대 방향으로 튀지 않는지 |
| countersteer·recovery | atlas pose 전환 시 snap/overshoot 없이 도로 방향으로 복귀하는지 |
| S-curve | aim 전환이 다음 코너를 미리 과도하게 가리키지 않는지 |
| crest·도로 가장자리 | guardrail·옹벽·숲·숨겨진 road에 번짐이 생기지 않는지 |

## visual 규칙

- light pool은 각 frame별 lamp origin보다 조금 화면 위쪽에 존재한다.
- 각 램프의 투사광은 bumper 부근의 좁은 폭에서 시작해 전방으로 갈수록 넓어지는 역 사다리꼴 silhouette을 만든다. 끝단은 부드럽게 감쇠해 hard polygon처럼 보이지 않아야 한다.
- 각 pool은 넓고 약한 spill, 주광부, 작은 청백색 hot spot을 별도 경계선 없이 연속 합성한다. 야간 asphalt에서 인지될 수 있도록 타원 반경과 중심 광량은 충분히 확보하되, 넓은 외곽광은 절제해 두 타원이 하나의 구름처럼 뭉개지지 않게 한다. 램프 간격은 차체 중앙에 가깝게 유지하되, 두 중심이 분명히 읽히도록 분리한다.
- Phaser `ADD` blend에는 shader RGB를 그대로 전달한다. RGB에 alpha를 다시 곱하면 감쇠가 제곱되어 pool이 얇고 어두운 띠로 축소된다.
- 좌·우 pool은 독립적으로 계산하고 밝기를 합산하므로, 가운데 겹침부가 자연스럽게 더 밝다. 동심원·링·표식 같은 별도 밴드는 만들지 않는다.
- 반경은 화면 높이의 약 16% 이내로 제한한다.
- 타원 pool은 차량 전방 중심의 좁은 범위만 쓰므로, 일반 도로 폭 안에 남아야 한다.
- crest와 급커브에서 도로 밖 번짐이 보이면 shader-only 단계를 중단하고 road mask를 재검토한다.
- shader와 도로는 같은 shake offset을 써서 따로 미끄러지지 않게 한다.

## 검증 기준

1. 차량 뒤/하단에 밝은 trapezoid가 생기지 않는다.
2. 직선과 좌우 커브에서 cone이 asphalt 내부에만 남는다.
3. guardrail·옹벽·숲에 광원이 번지지 않는다.
4. crest 접근 시 cone이 숨겨진 road를 드러내지 않는다.
5. 저속·고속 모두 cone이 보이되, 고속에서만 과도하게 밝아지지 않는다.
6. player sprite, HUD, foreground matte의 depth 관계가 변하지 않는다.

## 구현 상태

- [x] 잘못된 camera-near-plane Graphics cone 롤백
- [ ] road geometry mask — RenderTexture capture가 출력을 막아 보류
- [x] additive headlight shader
- [x] 직선·다운힐 커브·crest 고정 장면 시각 QA
- [x] 차체 pose + road tangent 기반 방향 목표값
- [x] fan·pool 공통 screen-space shear
- [x] 방향 전환/중앙 복귀 감쇠와 최대 속도 제한
- [x] headlight aim runtime telemetry
- [x] Apex Seoul production build
- [x] frame별 좌우 emitter profile과 origin 기준 mirror
- [x] player render와 headlight frame selection 공유
- [x] pose aim·fine steering·road assist 분리
- [x] road assist의 차체 pose 부호 반전 방지
- [x] 좌우 독립 lamp origin shader
- [x] FT86·G70 headlight profile 수치 QA
- [ ] 좌·우 grip·drift·countersteer 브라우저 시각 QA — 현재 WSL에서 Windows Edge CDP 연결이 열리지 않아 실제 입력 캡처는 보류
