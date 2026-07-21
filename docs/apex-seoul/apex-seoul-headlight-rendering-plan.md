# Apex Seoul 헤드라이트 렌더링 설계

갱신일: 2026-07-21

## 목표

야간 다운힐에서 차량 **전방의 좌·우 헤드램프 각각**에 짧고 찌그러진 타원 light pool을 보인다. 두 pool의 중첩부는 밝기 합산으로 더 밝아져야 한다. 동심원이나 링은 사용하지 않는다. 빛은 차량 뒤 바닥, 숲, 옹벽, 하늘 또는 crest 뒤 도로에 나타나면 안 된다.

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
    lampLeft: { x: number; y: number };
    lampRight: { x: number; y: number };
    poseAimX: number;
};
```

- 좌표와 간격은 `0..1` sprite-local 비율로 저장한다.
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
