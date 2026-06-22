---
title: Phaser 4로 Pseudo 3D 레이싱 게임 만들기 — Apex Seoul 카메라 구현
date: 2026-06-22T12:00:00+09:00
summary: Phaser 4와 TypeScript로 Apex Seoul 프로젝트를 세팅하고, horizon, FOV, camera height를 이용해 pseudo 3D 도로 카메라를 구현했습니다.
image: /images/posts/202606/apex-seoul-pseudo-3d-camera.png
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

블로그에 웹게임을 하나씩 올리면서 다음 실험으로 **Apex Seoul**을 시작했다.

Apex Seoul은 일반적인 2D 탑뷰 레이싱 게임이 아니라, 예전 아케이드 레이싱 게임처럼 도로가 화면 안쪽으로 뻗어 보이는 **pseudo 3D 드리프트 레이싱 게임**을 목표로 한다.

이번 글에서 구현한 범위는 아직 자동차도, 커브도, 드리프트도 아니다. 그 전에 반드시 필요한 기반인 **pseudo 3D camera**를 먼저 만들었다.

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

이번 결과물은 이런 모습이다.

![Apex Seoul pseudo 3D camera](/images/posts/202606/apex-seoul-pseudo-3d-camera.png)

구현한 내용은 다음과 같다.

- `games/apex-seoul/` Phaser 4 + Vite 프로젝트 세팅
- Astro의 `/games/apex-seoul/`, `/play/apex-seoul/` 경로 연결
- pseudo 3D camera resource 생성
- horizon, FOV, camera height 기반 원근 투영
- 직선 도로와 rumble strip 렌더링
- 카메라 z 스크롤
- AWSD/Arrow/Q/E 입력으로 카메라 offset, height, pitch 조정

## Pseudo 3D는 진짜 3D가 아니다

먼저 이름부터 정리해야 한다.

이번에 구현하는 pseudo 3D는 Three.js나 Unity처럼 3D mesh를 만들고, vertex를 GPU의 3D pipeline으로 넘기는 방식이 아니다.

오히려 생각은 훨씬 단순하다.

월드 안에 있는 점을 화면 위의 2D 좌표로 직접 계산한다.

```txt
world point
  x: 좌우 위치
  y: 높이
  z: 카메라 앞쪽 거리

screen point
  x: 화면 좌우 위치
  y: 화면 위아래 위치
  scale: z 거리에 따른 확대/축소 비율
```

즉 pseudo 3D의 핵심은 이것이다.

> 멀리 있는 것은 작게, 가까이 있는 것은 크게 그린다.

우리는 3D 공간 전체를 정확하게 렌더링하지 않는다. 도로 게임에 필요한 만큼만 속인다.

그래서 pseudo 3D 레이싱 게임은 대체로 아래 제약을 받아들인다.

- 카메라는 도로를 따라 앞으로 움직인다.
- 도로는 segment 단위로 나뉜다.
- 각 segment의 가까운 점과 먼 점을 화면에 투영한다.
- 투영된 네 점을 사다리꼴로 채운다.
- 커브와 언덕은 segment의 x offset, y elevation을 바꾸며 만든다.

이번 글에서는 그중 첫 단계인 “카메라 앞의 평평한 직선 도로”까지만 구현했다.

## Horizon이 먼저 필요하다

화면에서 하늘과 땅이 만나는 선을 horizon이라고 부른다.

레이싱 게임에서는 이 horizon이 아주 중요하다. 도로는 horizon 근처로 갈수록 좁아지고, 카메라에 가까워질수록 넓어진다.

이번 구현에서는 카메라 resource에 `horizonRatio`를 넣었다.

```ts
export type Pseudo3dCamera = {
    fovDegrees: number;
    height: number;
    horizonRatio: number;
    lateralOffset: number;
    pitch: number;
    z: number;
};
```

`horizonRatio`는 화면 높이에서 horizon이 어느 위치에 있는지 나타낸다.

```ts
export function getHorizonY(camera: Pseudo3dCamera, viewport: Viewport) {
    return viewport.height * camera.horizonRatio + camera.pitch;
}
```

현재 기본값은 `0.38`이다.

화면 높이가 760px이면 horizon은 대략 `760 * 0.38 = 288.8px` 근처에 놓인다. 그 위는 하늘, 아래는 땅과 도로가 된다.

여기서 `pitch`를 더한 이유는 나중에 카메라가 위아래로 고개를 드는 느낌을 만들기 위해서다. 지금 데모에서도 `Q/E`로 pitch를 바꿀 수 있다.

## FOV와 focal length

다음으로 필요한 값은 FOV다.

FOV는 field of view, 즉 시야각이다. FOV가 넓으면 광각 렌즈처럼 주변이 넓게 보이고, FOV가 좁으면 망원 렌즈처럼 멀리 있는 것이 압축되어 보인다.

하지만 투영 계산에 바로 쓰기 좋은 값은 각도 자체가 아니라 **focal length**다.

이번 구현에서는 화면 높이와 FOV로 focal length를 구했다.

```ts
export function getFocalLength(camera: Pseudo3dCamera, viewport: Viewport) {
    const fovRadians = (camera.fovDegrees * Math.PI) / 180;

    return viewport.height / 2 / Math.tan(fovRadians / 2);
}
```

이 식은 pinhole camera model에서 온다.

아주 단순하게 그리면 이런 관계다.

```txt
        viewport height / 2
             |
             |
camera -----+--------- projection plane
      focal length
```

FOV의 절반 각도와 화면 높이의 절반을 알면 삼각함수로 focal length를 구할 수 있다.

```txt
tan(fov / 2) = (viewport height / 2) / focal length
focal length = (viewport height / 2) / tan(fov / 2)
```

이 focal length가 커지면 같은 z 거리에서도 물체가 더 크게 보인다. 반대로 focal length가 작아지면 더 넓고 작게 보인다.

## 원근 투영 공식

이제 월드의 점 하나를 화면으로 옮겨보자.

핵심은 카메라와 점 사이의 z 거리다.

```ts
const cameraSpaceZ = point.z - camera.z;
```

월드에서 `point.z`가 2000이고 `camera.z`가 500이면, 카메라 기준으로 그 점은 1500만큼 앞에 있다.

이 값을 이용해 scale을 구한다.

```ts
const scale = focalLength / cameraSpaceZ;
```

멀리 있을수록 `cameraSpaceZ`가 커진다. 그러면 scale은 작아진다. 가까이 있을수록 `cameraSpaceZ`는 작아지고 scale은 커진다.

이것이 pseudo 3D 원근감의 핵심이다.

전체 투영 함수는 이렇게 생겼다.

```ts
export function projectGroundPoint(
    point: GroundPoint,
    camera: Pseudo3dCamera,
    viewport: Viewport,
): ScreenPoint {
    const cameraSpaceZ = point.z - camera.z;

    if (cameraSpaceZ <= MIN_CAMERA_SPACE_Z) {
        return {
            scale: 0,
            visible: false,
            x: viewport.width / 2,
            y: viewport.height + 1,
        };
    }

    const focalLength = getFocalLength(camera, viewport);
    const scale = focalLength / cameraSpaceZ;
    const horizonY = getHorizonY(camera, viewport);
    const worldY = point.y ?? 0;

    return {
        scale,
        visible: true,
        x: viewport.width / 2 + (point.x - camera.lateralOffset) * scale,
        y: horizonY + (camera.height - worldY) * scale,
    };
}
```

여기서 화면 x는 이렇게 계산한다.

```ts
x: viewport.width / 2 + (point.x - camera.lateralOffset) * scale
```

화면 가운데를 기준으로, 월드 x 위치에 scale을 곱해 좌우 위치를 만든다. `camera.lateralOffset`은 카메라가 차선 왼쪽이나 오른쪽으로 이동하는 효과를 만들기 위한 값이다.

화면 y는 이렇게 계산한다.

```ts
y: horizonY + (camera.height - worldY) * scale
```

카메라가 높을수록 가까운 바닥은 화면 아래로 더 크게 밀려난다. 반대로 z가 멀어질수록 scale이 작아지기 때문에 horizon에 가까워진다.

## 도로는 사다리꼴을 이어 붙인다

투영 함수가 생기면 도로를 그릴 수 있다.

이번 단계에서는 도로를 segment 단위로 나누었다.

```ts
const SEGMENT_LENGTH = 240;
const DRAW_SEGMENTS = 56;
```

각 segment는 가까운 z와 먼 z를 가진다.

```txt
nearWorldZ ----------------
                           segment
farWorldZ  ----------------
```

도로의 왼쪽과 오른쪽 x 좌표도 정해둔다.

```ts
const ROAD_HALF_WIDTH = 960;
```

그러면 한 segment는 네 점으로 표현된다.

```txt
far left       far right
    +-----------+
     \         /
      \       /
       +-----+
near left   near right
```

실제로는 이 네 점을 각각 화면에 투영한 뒤, Phaser의 `Graphics`로 polygon을 채운다.

```ts
this.fillQuad(
    farLeft,
    farRight,
    nearRight,
    nearLeft,
    stripeIndex % 2 === 0 ? 0x34383b : 0x303437,
);
```

도로 양쪽의 빨간색/흰색 rumble strip도 같은 방식으로 그린다.

도로 본체보다 조금 바깥쪽 x 범위를 잡고, 같은 z 구간을 투영한 뒤 사다리꼴로 채우면 된다.

```ts
const innerX = side * ROAD_HALF_WIDTH;
const outerX = side * (ROAD_HALF_WIDTH + RUMBLE_WIDTH);
```

중앙 차선도 같은 원리다.

```ts
const nearLeft = projectGroundPoint(
    { x: -LANE_MARK_WIDTH, z: nearWorldZ },
    camera,
    viewport,
);
```

결국 도로, 갓길, 차선은 모두 같은 원리로 그려진다.

- 월드 좌표 네 점을 만든다.
- 각 점을 screen 좌표로 projection한다.
- 네 점을 잇는 polygon을 채운다.

## 카메라 z와 segment 순환

이번 구현에서 한 번 실수한 부분이 있다.

처음에는 도로 segment를 계산할 때 카메라 z를 두 번 더했다.

그 결과 도로가 앞으로 흘러오는 것이 아니라, 시간이 지날수록 점점 멀어지는 것처럼 보였다.

pseudo 3D에서 중요한 구분은 이것이다.

- segment의 z는 월드 좌표다.
- 카메라의 z도 월드 좌표다.
- 화면 투영에서는 `segmentWorldZ - camera.z`만 사용한다.

그래서 현재 코드는 segment의 절대 월드 z를 만들고, projection 함수에서만 카메라 z를 뺀다.

```ts
const baseSegment = Math.floor(camera.z / SEGMENT_LENGTH);

for (let i = DRAW_SEGMENTS; i >= 1; i -= 1) {
    const nearWorldZ = (baseSegment + i) * SEGMENT_LENGTH;
    const farWorldZ = nearWorldZ + SEGMENT_LENGTH;
    const stripeIndex = baseSegment + i;

    const nearLeft = projectGroundPoint(
        { x: -ROAD_HALF_WIDTH, z: nearWorldZ },
        camera,
        viewport,
    );
}
```

이렇게 하면 `camera.z`가 증가할 때마다 현재 카메라 앞에 있는 segment 범위만 다시 잡힌다. 도로가 끝없이 이어지는 것처럼 보이지만, 실제로는 제한된 개수의 segment를 매 프레임 다시 투영하고 있을 뿐이다.

이 구조는 나중에 커브와 언덕을 붙일 때도 그대로 이어진다.

## 왜 아직 ECS를 크게 만들지 않았나

로드맵에는 ECS Architecture라고 적어두었다.

하지만 이번 단계에서 `Entity`, `Component`, `System`을 먼저 크게 만들지는 않았다.

이유는 단순하다. 아직 엔티티보다 중요한 것이 카메라 수학이기 때문이다.

지금 필요한 영속 상태는 `Pseudo3dCamera` 하나에 가깝다.

```ts
export function createDefaultCamera(): Pseudo3dCamera {
    return {
        fovDegrees: 72,
        height: 980,
        horizonRatio: 0.38,
        lateralOffset: 0,
        pitch: 0,
        z: 0,
    };
}
```

이 상태는 나중에 ECS의 resource로 들어가면 된다.

아직 자동차, 도로 데이터, 충돌 대상, 체크포인트, 상대 차량이 없는데 ECS 골격부터 크게 만들면 오히려 글과 코드가 뻣뻣해진다.

이번에는 먼저 카메라를 검증하고, 다음 단계에서 도로 segment 데이터를 분리하는 편이 낫다.

## Phaser에서는 Graphics로 충분하다

이번 렌더링은 Phaser의 `Graphics`만 사용했다.

```ts
this.graphics.fillStyle(color, 1);
this.graphics.beginPath();
this.graphics.moveTo(a.x, a.y);
this.graphics.lineTo(b.x, b.y);
this.graphics.lineTo(c.x, c.y);
this.graphics.lineTo(d.x, d.y);
this.graphics.closePath();
this.graphics.fillPath();
```

아직 sprite도, texture atlas도 필요 없다.

오히려 지금은 사다리꼴이 어떻게 투영되는지 직접 보기 위해 단색 polygon이 더 좋다. 도로가 제대로 움직이는지, horizon에 수렴하는지, 카메라 높이를 바꿨을 때 화면이 어떻게 달라지는지 확인하기 쉽다.

구현 중에는 headless browser로 캡처를 찍어 화면이 비어 있지 않은지도 확인했다. 이 과정에서 WebGL 캡처가 검게 찍히는 문제가 있어서, 현재 Apex Seoul은 일단 `Phaser.CANVAS` 렌더러로 고정했다.

```ts
const config: Phaser.Types.Core.GameConfig = {
    parent: 'game',
    scene: [ApexSeoulScene],
    type: Phaser.CANVAS,
};
```

이번 단계는 2D polygon 렌더링만 있으면 충분하므로 Canvas renderer로도 문제가 없다.

## 다음 단계

이번 글에서 만든 것은 pseudo 3D 엔진의 가장 작은 단위다.

아직 레이싱 게임이라고 부르기에는 많이 이르다. 하지만 이제 중요한 기반은 생겼다.

- 카메라 앞의 월드 좌표를 화면으로 투영할 수 있다.
- 도로 segment를 사다리꼴로 이어 붙일 수 있다.
- 카메라 z가 증가하면 도로가 앞으로 흐르는 것처럼 보인다.
- horizon, FOV, camera height를 조정하며 화면 감각을 잡을 수 있다.

다음 단계에서는 이 임시 도로 렌더링을 실제 `RoadSegment` 데이터 구조로 분리할 생각이다.

그 다음에는 직선 도로를 넘어서 커브를 넣어야 한다. pseudo 3D 레이싱 게임에서 진짜 재미가 시작되는 지점은 그때부터다.

차가 아직 없는데도 벌써 도로가 살짝 달리는 척을 한다. 이 정도면 첫 삽으로는 나쁘지 않다.
