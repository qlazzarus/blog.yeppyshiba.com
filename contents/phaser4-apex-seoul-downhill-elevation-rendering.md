---
title: Phaser 4 Pseudo 3D 레이싱 게임 — 북악 스카이웨이 inspired 다운힐 만들기
date: 2026-06-25T10:30:00+09:00
summary: Apex Seoul에 Bugak Ridge Downhill 단일 맵을 만들고, RoadSegment elevation, 고저차 projection, 차량 하단 고정, 레트로 차량 그림자를 구현했습니다.
image: /images/posts/202606/apex-seoul-bugak-downhill.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - pseudo-3d
    - game-physics
    - racing-game
    - game-dev
---

## 들어가며

[지난 글](/article/phaser4-apex-seoul-player-car-speed-control/)에서는 **Apex Seoul**에 플레이어 차량을 올렸다.

Kenney Car Kit의 3D 모델을 후면 스프라이트로 렌더링했고, 좌우 조향, 악셀, 브레이크, 기본 주행 속도 복귀까지 구현했다.

그 다음 고민은 이것이었다.

차량이 생겼으니 바로 코너 원심력이나 드리프트를 넣어야 할까?

처음에는 그쪽으로 가고 싶었다. 하지만 지금 차량 스프라이트는 후면, 후면 좌측, 후면 우측 세 장뿐이다. 이 상태에서 slip angle, 드리프트 각도, 바깥쪽 밀림 같은 디테일을 넣어도 시각적으로 충분히 표현하기 어렵다.

그래서 이번에는 물리 디테일보다 먼저 도로의 두 번째 축을 만들기로 했다.

커브가 도로 중심선의 x 변화라면, 고저차는 도로 중심선의 y 변화다.

이번 글에서는 다음 내용을 구현했다.

- 북악 스카이웨이를 참고한 fictional 코스 `Bugak Ridge Downhill`을 정한다.
- OSM/SRTM 데이터를 reference로 추출한다.
- `RoadSegment`에 `elevation`을 추가한다.
- 도로 body, shoulder, lane mark를 고저차와 함께 projection한다.
- 차량을 화면 하단 주행 기준점에 고정한다.
- 디버그 카메라 이동을 잠시 잠근다.
- 차량 아래에 레트로 스트라이프 그림자를 추가한다.

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

![Apex Seoul Bugak Ridge Downhill](/images/posts/202606/apex-seoul-bugak-downhill.png)

아직 실제 레이스라고 부르기에는 부족하다.

하지만 이제 도로는 단순히 휘기만 하지 않는다. 올라가고, 내려가고, 차량은 화면 하단의 기준점에 붙어 있다.

## 실제 북악 스카이웨이가 아니라 inspired 맵

이번 맵의 이름은 `Bugak Ridge Downhill`로 정했다.

이름에서 알 수 있듯이 실제 북악 스카이웨이를 1:1로 복제하는 맵은 아니다.

방향은 이렇다.

- 실제 북악 스카이웨이는 참고용이다.
- 게임 안의 코스는 fictional 코스다.
- 실제 좌표와 거리를 그대로 보존하지 않는다.
- 서울 산길 다운힐의 감각만 게임용 섹션으로 재구성한다.

이렇게 정한 이유는 두 가지다.

첫 번째는 게임 리듬이다.

실제 도로는 게임을 위해 설계된 코스가 아니다. 실제 거리와 곡률을 그대로 가져오면, 어떤 구간은 너무 길고 어떤 구간은 너무 심심할 수 있다.

두 번째는 라이선스다.

OSM 데이터는 ODbL 기반이다. 실제 도로 geometry를 변환해서 게임 런타임 데이터로 배포하면 출처 표기뿐 아니라 파생 데이터 관리도 고려해야 한다.

그래서 OSM과 DEM은 reference로만 사용한다.

실제 게임 트랙은 사람이 다시 구성한 `TrackSection[]`으로 만든다.

## reference 데이터 추출

우선 참고 자료를 만들기 위한 스크립트를 추가했다.

```json
{
    "extract:bugak-reference": "node scripts/extract-bugak-ridge-reference.mjs"
}
```

실행하면 OSM Overpass API와 OpenTopodata SRTM 30m API에서 참고 데이터를 가져온다.

```bash
npm run extract:bugak-reference --workspace @games/apex-seoul
```

결과는 다음 위치에 저장된다.

```text
games/apex-seoul/assets/tracks/reference/bugak-ridge-downhill-reference.json
```

이번 추출 결과는 대략 이랬다.

```text
OSM road ways: 24
landmarks: 5
elevation samples: 90
elevation range: 55m ~ 299m
```

이 JSON은 게임 런타임에서 직접 쓰지 않는다.

대신 이런 판단에 쓴다.

- 어디쯤 고점이 있는가
- 전체 고도 흐름이 어느 정도인가
- 곡선 리듬을 어떻게 압축할 것인가
- 팔각정 inspired 지점을 체크포인트처럼 둘 수 있는가

즉, 데이터는 지도가 아니라 스케치북이다.

## RoadSegment에 elevation 추가

기존 `RoadSegment`는 `curve`만 가지고 있었다.

```ts
export type RoadSegment = {
    curve: number;
    index: number;
    laneCount: number;
    length: number;
};
```

이번에는 여기에 `elevation`을 추가했다.

```ts
export type RoadSegment = {
    curve: number;
    elevation: number;
    index: number;
    laneCount: number;
    length: number;
};
```

트랙 섹션도 curve만 보간하던 구조에서 elevation을 함께 보간하도록 바꿨다.

```ts
type TrackSection = {
    endCurve: number;
    endElevation: number;
    startCurve: number;
    startElevation: number;
    segments: number;
};
```

`Bugak Ridge Downhill`은 하나의 단일 맵으로 구성했다.

```ts
const BUGAK_RIDGE_DOWNHILL_SECTIONS: TrackSection[] = [
    { endCurve: 0, endElevation: 540, segments: 8, startCurve: 0, startElevation: 560 },
    { endCurve: 0.22, endElevation: 360, segments: 20, startCurve: 0, startElevation: 540 },
    { endCurve: 0.62, endElevation: 220, segments: 28, startCurve: 0.22, startElevation: 360 },
    // ...
];
```

고도값은 실제 meter를 그대로 쓰지 않았다.

실제 고도는 reference다. 게임 안에서는 pseudo 3D 화면에서 읽히는 정도가 더 중요하다. 그래서 실제 값을 그대로 옮기기보다, 내리막이 화면에서 보이도록 게임용 단위로 다시 잡았다.

## 도로 projection에 y를 넣는다

다행히 `projectGroundPoint()`는 이미 `point.y`를 받을 수 있는 구조였다.

```ts
const worldY = point.y ?? 0;

return {
    scale,
    visible: true,
    x: viewport.width / 2 + (point.x - camera.lateralOffset) * scale,
    y: horizonY + (camera.height - worldY) * scale,
};
```

그래서 projection 함수 자체를 크게 바꾸지는 않았다.

대신 도로를 그리는 쪽에서 near/far elevation을 넘기도록 바꿨다.

```ts
const roadNearLeft = projectGroundPoint(
    { x: nearCenterX - ROAD_HALF_WIDTH, y: nearElevation, z: nearWorldZ },
    camera,
    viewport,
);
```

도로 body뿐 아니라 shoulder와 lane mark도 같은 elevation을 사용한다.

이게 중요하다. 도로 몸통만 고저차를 받고, 차선이나 갓길이 평면 기준으로 그려지면 화면이 바로 찢어진다.

## 절대 고도보다 상대 고도

처음에는 segment의 elevation을 그대로 projection에 넣었다.

그런데 화면에서 고저차가 잘 느껴지지 않았다.

문제는 카메라 기준이었다.

차량이 현재 달리고 있는 도로 높이가 있는데, 앞쪽 도로도 절대 높이로만 계산하면 운전자가 체감하는 경사 차이가 약하게 보인다.

그래서 현재 카메라 위치의 도로 elevation을 기준으로 앞쪽 elevation을 상대값으로 바꿨다.

```ts
const currentElevation = getRoadElevationAt(track, camera.z);

const nearY = (nearElevation - currentElevation) * ELEVATION_VISUAL_SCALE;
const farY = (farElevation - currentElevation) * ELEVATION_VISUAL_SCALE;
```

그리고 pseudo 3D 화면에서는 멀리 있는 고도 차이가 scale 때문에 많이 죽는다.

그래서 렌더링 전용 과장값을 두었다.

```ts
export const ELEVATION_VISUAL_SCALE = 4.2;
```

이 값은 물리값이 아니다.

화면에서 "아, 내려가고 있구나"라고 읽히게 만드는 시각 보정값이다.

## 차량은 도로를 그대로 따라가지 않는다

고저차를 넣은 뒤 가장 어색했던 부분은 차량이었다.

처음에는 차량 anchor도 도로 투영점에 붙였다. 논리적으로는 맞아 보인다.

하지만 실제 화면에서는 차량이 위아래로 흔들리거나, 그림자가 떨어져 보이면서 차가 붕 뜬 느낌이 났다.

그래서 원칙을 바꿨다.

차량은 화면 하단의 주행 기준점에 안정적으로 붙인다.

도로와 카메라, horizon이 움직이며 경사감을 전달한다.

현재 코드는 차량 y를 거의 고정하고, 도로 투영 y는 아주 약하게만 보조 반영한다.

```ts
const PLAYER_SCREEN_ANCHOR_RATIO = 0.88;
const PLAYER_SCREEN_ANCHOR_RESPONSE = 0.06;
```

```ts
const fixedAnchorY = viewport.height * PLAYER_SCREEN_ANCHOR_RATIO;

const anchorY = Phaser.Math.Clamp(
    Phaser.Math.Linear(fixedAnchorY, roadAnchor.y + spriteSize * 0.08, PLAYER_SCREEN_ANCHOR_RESPONSE),
    viewport.height * 0.84,
    viewport.height * 0.93,
);
```

이렇게 하니 차가 도로 고저차를 따라 춤추는 대신, 화면 아래에서 플레이어 기준점으로 안정된다.

예전 아케이드 레이싱 게임의 감각에도 이쪽이 더 가깝다.

## 디버그 카메라를 잠갔다

이전까지는 WASD와 Q/E로 카메라를 움직일 수 있었다.

카메라 구현을 검증할 때는 좋았다. 하지만 지금은 차량 접지감과 다운힐 감각을 봐야 한다.

카메라가 계속 움직이면 문제가 차량 anchor인지, 도로 projection인지, 카메라 디버그 입력 때문인지 헷갈린다.

그래서 디버그 카메라 입력을 플래그로 잠갔다.

```ts
const ENABLE_DEBUG_CAMERA_CONTROLS = false;
```

나중에 다시 필요하면 이 값을 `true`로 바꾸면 된다.

지금은 차량이 화면 하단에 붙고, 도로가 움직이는 감각을 우선 검증한다.

## 레트로 스트라이프 그림자

차량이 떠 보이는 문제는 그림자도 크게 작용했다.

단순히 반투명 타원을 차량 아래에 그릴 수도 있다. 하지만 그 방식은 너무 placeholder처럼 보였다.

그래서 `Phaser.Graphics`로 납작한 타원을 그리고, 그 위에 가로 줄을 여러 개 얹었다.

```ts
this.graphics.fillStyle(0x071013, alpha * 0.92);
this.graphics.fillEllipse(anchor.x + steeringOffset, centerY, width, height);

this.graphics.lineStyle(2, 0x11191c, alpha);

for (let stripe = -3; stripe <= 3; stripe += 1) {
    const stripeY = centerY + stripe * (height / 8);
    const stripeRatio = 1 - Math.abs(stripe) / 4;
    const stripeHalfWidth = (width / 2) * Math.sqrt(Math.max(0, stripeRatio));

    this.graphics.lineBetween(
        anchor.x + steeringOffset - stripeHalfWidth,
        stripeY,
        anchor.x + steeringOffset + stripeHalfWidth,
        stripeY,
    );
}
```

이 그림자는 실제 물리 그림자라기보다 접지감 표시다.

차량이 도로 위에 놓여 있다는 것을 플레이어에게 계속 알려주는 작은 UI에 가깝다.

그래도 단순 타원보다 레트로 분위기가 있고, 현재 Apex Seoul의 실험 단계에는 잘 맞는다.

## 다음 속도감 강화 방향

이번 구현으로 차량 기준점과 고저차는 어느 정도 정리됐다.

다음은 속도감이다.

속도감을 만들 때 차량 자체를 위아래로 흔드는 방식은 피하려고 한다. 그러면 다시 붕 뜬 느낌이 돌아올 수 있다.

대신 다음 레이어를 먼저 강화할 생각이다.

1. lane mark와 rumble strip의 흐름을 더 빠르게 읽히게 한다.
2. 도로변 가드레일, 가로등, 표지판 같은 반복 오브젝트를 추가한다.
3. 악셀 입력 순간에 짧은 FOV impulse를 준다.
4. 화면 가장자리에 낮은 alpha의 speed line을 검토한다.
5. 고속에서 horizon과 pitch를 아주 작게 반응시킨다.

가장 먼저 해볼 것은 도로 표식이다.

차선과 갓길 패턴이 빨리 흘러야, 숫자로 표시된 speed보다 먼저 몸이 속도를 느낀다.

## 마치며

이번 구현은 눈에 확 띄는 기능 하나를 추가했다기보다, 레이싱 게임의 기준점을 다시 잡는 작업에 가까웠다.

처음에는 "도로에 고저차를 넣으면 차량도 도로를 따라 움직여야 자연스럽지 않을까?"라고 생각했다.

하지만 실제로는 반대였다.

차량은 화면 하단에 안정적으로 붙어 있어야 한다.

도로와 horizon, 차선, 갓길, 그림자가 움직이면서 속도와 경사를 전달해야 한다.

이제 Apex Seoul은 단순 커브 도로에서 한 단계 더 내려왔다.

다음에는 이 도로가 정말 빠르게 느껴지도록, 도로 표식과 주변 오브젝트를 손볼 차례다.

