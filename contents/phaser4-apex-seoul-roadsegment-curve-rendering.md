---
title: Phaser 4 Pseudo 3D 레이싱 게임 — RoadSegment로 커브 도로 만들기
date: 2026-06-23T10:00:00+09:00
summary: Apex Seoul의 임시 직선 도로를 RoadSegment 기반 렌더러로 분리하고, curve 값을 누적해 pseudo 3D 커브 도로를 구현했습니다.
image: /images/posts/202606/apex-seoul-corner.jpg
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - ecs
    - pseudo-3d
    - game-physics
    - racing-game
    - game-dev
---

## 들어가며

[지난 글](/article/phaser4-apex-seoul-pseudo-3d-camera/)에서는 **Apex Seoul**의 첫 단계로 pseudo 3D camera를 만들었다.

그때 구현한 것은 카메라 앞에 놓인 직선 도로를 화면에 투영하는 정도였다. horizon, FOV, camera height를 이용해 가까운 도로는 크게, 먼 도로는 작게 보이게 만들었다.

이번에는 그 임시 도로 렌더링을 한 단계 정리했다.

목표는 두 가지였다.

- 도로를 `RoadSegment` 데이터 구조로 분리한다.
- segment의 `curve` 값을 이용해 커브 도로를 렌더링한다.

현재 데모는 아래에서 볼 수 있다.

[Apex Seoul 데모 보기](/games/apex-seoul/)

<div style="position: relative; width: 100%; height: min(70vh, 560px); margin: 24px 0;">
    <iframe
        src="/play/apex-seoul/"
        title="Apex Seoul"
        loading="lazy"
        style="position: absolute; inset: 0; width: 100%; height: 100%; border: 1px solid #26343c; border-radius: 8px; background: #101316;"
    ></iframe>
</div>

이번 구현 결과는 이런 모습이다.

![Apex Seoul corner rendering](/images/posts/202606/apex-seoul-corner.jpg)

아직 차도 없고, 조향도 없고, 드리프트도 없다.

하지만 이제 도로가 단순한 직선이 아니라, 데이터에 따라 좌우로 휘어진다. pseudo 3D 레이싱 게임으로 가기 위한 두 번째 기반이 생긴 셈이다.

## 왜 RoadSegment가 필요한가

지난 구현에서는 `main.ts` 안에서 바로 도로를 그렸다.

대략 이런 식이었다.

```ts
const nearWorldZ = (baseSegment + i) * SEGMENT_LENGTH;
const farWorldZ = nearWorldZ + SEGMENT_LENGTH;

const nearLeft = projectGroundPoint({ x: -ROAD_HALF_WIDTH, z: nearWorldZ }, camera, viewport);
const nearRight = projectGroundPoint({ x: ROAD_HALF_WIDTH, z: nearWorldZ }, camera, viewport);
```

직선 도로를 검증하기에는 충분했다.

하지만 이 구조로는 곧 막힌다.

커브를 넣으려면 segment마다 도로 중심 x가 달라져야 한다. 언덕을 넣으려면 segment마다 y elevation이 달라져야 한다. 차선 수, 도로 색상, 터널, 배경 오브젝트를 붙이려 해도 결국 “도로 조각마다 다른 데이터”가 필요해진다.

그래서 이번에는 도로를 `RoadSegment`로 표현했다.

```ts
export type RoadSegment = {
    curve: number;
    index: number;
    laneCount: number;
    length: number;
};
```

현재는 필드가 많지 않다.

- `curve`: 이 segment가 도로 중심선을 얼마나 좌우로 밀어내는지
- `index`: 트랙 안에서의 segment 번호
- `laneCount`: 차선 수
- `length`: segment의 z 길이

지금은 커브 렌더링이 목적이므로 `curve`가 가장 중요하다.

## 테스트 트랙 만들기

전체 도로는 `RoadTrack`으로 묶었다.

```ts
export type RoadTrack = {
    length: number;
    segmentLength: number;
    segments: RoadSegment[];
};
```

그리고 테스트 트랙은 section 단위로 만든다.

```ts
type TrackSection = {
    endCurve: number;
    startCurve: number;
    segments: number;
};
```

예를 들어 아래 section은 28개의 segment 동안 `curve`가 `0`에서 `0.48`까지 올라가는 구간이다.

```ts
{ endCurve: 0.48, segments: 28, startCurve: 0 }
```

반대로 아래 section은 34개의 segment 동안 왼쪽 커브에서 오른쪽 커브로 넘어가는 구간이다.

```ts
{ endCurve: -0.38, segments: 34, startCurve: 0.38 }
```

현재 테스트 트랙은 이런 흐름으로 구성했다.

```ts
const TEST_TRACK_SECTIONS: TrackSection[] = [
    { endCurve: 0, segments: 20, startCurve: 0 },
    { endCurve: 0.48, segments: 28, startCurve: 0 },
    { endCurve: 0.48, segments: 30, startCurve: 0.48 },
    { endCurve: 0, segments: 24, startCurve: 0.48 },
    { endCurve: 0, segments: 14, startCurve: 0 },
    { endCurve: -0.52, segments: 32, startCurve: 0 },
    { endCurve: -0.52, segments: 34, startCurve: -0.52 },
    { endCurve: 0, segments: 28, startCurve: -0.52 },
    { endCurve: 0.38, segments: 22, startCurve: 0 },
    { endCurve: -0.38, segments: 34, startCurve: 0.38 },
    { endCurve: 0, segments: 24, startCurve: -0.38 },
    { endCurve: 0, segments: 32, startCurve: 0 },
];
```

숫자는 아직 물리적으로 정확한 코스 설계라기보다, 화면에서 커브가 잘 보이게 만든 테스트 값이다.

## 커브를 바로 바꾸면 틱틱 끊긴다

처음에는 section마다 curve 값을 고정해서 넣었다.

```ts
{ curve: 0.18, segments: 34 }
```

그런데 이렇게 하면 직선에서 커브로 들어가는 순간 값이 갑자기 바뀐다.

도로 중심선도 그 지점에서 갑자기 방향을 바꾸기 때문에, 화면에서 살짝 틱틱 끊기는 느낌이 난다.

그래서 이번에는 `startCurve`에서 `endCurve`까지 부드럽게 보간했다.

```ts
function ease(start: number, end: number, index: number, length: number) {
    if (length <= 1) return end;

    const t = index / (length - 1);
    const smooth = t * t * (3 - 2 * t);

    return start + (end - start) * smooth;
}
```

여기서 `t * t * (3 - 2 * t)`는 흔히 smoothstep이라고 부르는 형태다.

선형 보간은 시작부터 끝까지 같은 속도로 값이 바뀐다.

```txt
linear:     0.0 0.1 0.2 0.3 0.4 ...
smoothstep: 0.0 0.03 0.10 0.22 0.35 ...
```

smoothstep은 시작과 끝에서 변화가 느리고, 중간에서 더 빨라진다.

덕분에 직선에서 커브로 들어갈 때 도로가 갑자기 꺾이지 않고, 천천히 말려 들어가는 느낌이 난다.

## Pseudo 3D 커브는 중심선을 누적해서 만든다

진짜 3D 엔진이라면 도로 mesh 자체를 휘게 만들 수 있다.

하지만 지금 만드는 것은 pseudo 3D다. 우리는 도로를 사다리꼴 segment로 그린다.

커브를 표현하는 방법은 생각보다 단순하다.

멀리 있는 segment로 갈수록 도로 중심 x를 조금씩 옮긴다.

```txt
segment 0 center x = 0
segment 1 center x = 10
segment 2 center x = 25
segment 3 center x = 45
segment 4 center x = 70
```

이 중심점을 기준으로 도로 왼쪽/오른쪽을 만든다.

```txt
left  = centerX - roadHalfWidth
right = centerX + roadHalfWidth
```

그 다음 각 점을 지난 글에서 만든 `projectGroundPoint()`로 화면에 투영한다.

현재 렌더러에서는 `getVisibleBoundaryCenters()`가 이 역할을 한다.

```ts
function getVisibleBoundaryCenters(
    track: RoadTrack,
    baseSegment: number,
    progress: number,
) {
    const centers = [0];
    let centerX = 0;

    for (let boundary = 1; boundary <= DRAW_SEGMENTS + 1; boundary += 1) {
        const previousSegment = getRoadSegment(track, baseSegment + boundary - 1);
        const nextSegment = getRoadSegment(track, baseSegment + boundary);
        const distanceRatio = boundary === 1 ? 1 - progress : 1;
        const averageCurve = (previousSegment.curve + nextSegment.curve) / 2;

        centerX += averageCurve * CURVE_STEP * distanceRatio;
        centers.push(centerX);
    }

    return centers;
}
```

여기서 핵심은 세 가지다.

- 현재 카메라 앞에 보이는 segment boundary들의 center x를 미리 계산한다.
- 각 boundary는 이전 segment와 다음 segment의 평균 curve를 사용한다.
- 첫 boundary는 현재 segment 안에서 얼마나 진행했는지 `progress`를 반영한다.

처음에는 segment마다 near/far center를 바로 계산했다.

그 방식도 동작은 하지만, 카메라가 segment 경계를 넘어갈 때 중심선 계산이 한 프레임 단위로 바뀌며 미세하게 튀는 느낌이 있었다.

boundary center 배열을 먼저 만들면, 현재 카메라가 segment 안에서 이동하는 정도를 반영할 수 있어 조금 더 부드럽게 보인다.

## 한 segment는 여전히 사다리꼴이다

커브가 들어갔다고 해서 투영 방식이 크게 달라지는 것은 아니다.

한 segment는 여전히 네 점으로 그린다.

```ts
const nearCenterX = boundaryCenters[i - 1];
const farCenterX = boundaryCenters[i];
```

가까운 쪽 중심과 먼 쪽 중심이 다를 뿐이다.

```ts
const roadNearLeft = projectGroundPoint(
    { x: nearCenterX - ROAD_HALF_WIDTH, z: nearWorldZ },
    camera,
    viewport,
);

const roadFarLeft = projectGroundPoint(
    { x: farCenterX - ROAD_HALF_WIDTH, z: farWorldZ },
    camera,
    viewport,
);
```

이렇게 하면 segment 하나하나는 약간 비틀린 사다리꼴이 된다.

그 사다리꼴을 멀리 있는 것부터 가까운 것 순서로 계속 그리면, 도로가 좌우로 휘어 보인다.

```ts
for (let i = projectedSegments.length - 1; i >= 0; i -= 1) {
    const projected = projectedSegments[i];

    drawRoadBody(graphics, projected.road, projected.absoluteIndex);
    drawShoulder(graphics, projected.road, projected.absoluteIndex, -1, camera, viewport);
    drawShoulder(graphics, projected.road, projected.absoluteIndex, 1, camera, viewport);
    drawLaneMarks(
        graphics,
        projected.road,
        projected.absoluteIndex,
        projected.segment.laneCount,
        camera,
        viewport,
    );
}
```

## 갓길과 차선도 같은 원리다

도로 본체만 커브를 따라가면 어색하다.

빨간색/흰색 rumble strip과 중앙 차선도 같은 center x를 기준으로 그려야 한다.

갓길은 도로 바깥쪽 x 범위를 잡는다.

```ts
const innerNearX = road.nearCenterX + side * ROAD_HALF_WIDTH;
const outerNearX = road.nearCenterX + side * (ROAD_HALF_WIDTH + RUMBLE_WIDTH);
const innerFarX = road.farCenterX + side * ROAD_HALF_WIDTH;
const outerFarX = road.farCenterX + side * (ROAD_HALF_WIDTH + RUMBLE_WIDTH);
```

중앙 차선은 차선 수에 따라 도로 폭 안에서 위치를 나눈다.

```ts
const laneCenterRatio = lane / laneCount;
const nearLaneCenterX = Phaser.Math.Linear(
    road.nearCenterX - ROAD_HALF_WIDTH,
    road.nearCenterX + ROAD_HALF_WIDTH,
    laneCenterRatio,
);
```

그리고 도로 본체와 똑같이 네 점을 투영해 polygon으로 채운다.

결국 pseudo 3D 도로 렌더러는 같은 패턴을 반복한다.

- 월드 x/z 점 네 개를 만든다.
- 카메라 기준으로 projection한다.
- 화면 좌표 polygon을 채운다.

도로 본체, 갓길, 차선은 재료만 다를 뿐이다.

## 카메라 디버그 입력도 부드럽게 만들었다

커브를 테스트하다 보니 AWSD/QE로 카메라 값을 바꿀 때도 딱딱하게 느껴졌다.

처음에는 키가 눌린 동안 값을 바로 더했다.

```ts
if (this.cursors.left.isDown || this.keys.a.isDown) {
    camera.lateralOffset -= 820 * seconds;
}
```

이 방식은 단순하지만, 키를 누르는 순간 속도가 바로 최대가 되고 키를 떼는 순간 바로 0이 된다.

디버그 입력이라도 화면을 보며 감각을 조정할 때는 이 시작/정지가 거칠게 느껴진다.

그래서 입력을 velocity로 바꾸고, 목표 속도를 부드럽게 따라가게 했다.

```ts
const inputBlend = 1 - Math.exp(-CAMERA_INPUT_RESPONSE * seconds);

this.cameraVelocity.lateral = Phaser.Math.Linear(
    this.cameraVelocity.lateral,
    targetLateralVelocity,
    inputBlend,
);
```

`Math.exp()`를 이용한 이 방식은 프레임 시간에 비교적 덜 민감하다.

프레임이 조금 길어져도 `inputBlend`가 그만큼 커지고, 프레임이 짧으면 작아진다. 그래서 60fps 기준으로만 맞춘 고정 보간보다 안정적이다.

이제 카메라 offset, height, pitch가 키 입력을 조금 더 자연스럽게 따라간다.

## 이번 단계의 한계

이번 구현은 “커브 렌더링”까지만 다룬다.

아직 차량이 커브를 따라 움직이지 않는다. 커브에서 차가 바깥쪽으로 밀리는 느낌도 없고, 핸들을 꺾거나 드리프트하는 물리도 없다.

지금 화면에서 도로가 휘는 것은 다음 단계를 위한 기반이다.

하지만 이 기반은 중요하다.

이제 도로를 단순한 그림이 아니라 데이터로 다룰 수 있다.

- `curve`가 있으면 커브를 만들 수 있다.
- 나중에 `elevation`을 추가하면 언덕을 만들 수 있다.
- `laneCount`를 이용하면 구간별 차선 수를 바꿀 수 있다.
- segment index를 이용하면 체크포인트나 코스 이벤트도 붙일 수 있다.

다음에는 여기에 플레이어 차량을 올릴 수 있다.

화면 아래쪽에 차를 하나 두고, 좌우 입력으로 도로 위 위치를 바꾸는 단계다. 그때부터는 정말 레이싱 게임처럼 보이기 시작할 것이다.

아직 차는 없지만 도로가 먼저 달릴 준비를 마쳤다. 이 정도면 엔진의 뼈대가 조금씩 모양을 갖추고 있다.
