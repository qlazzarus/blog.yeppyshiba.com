---
title: Phaser 4 Pseudo 3D 레이싱 게임 — 차량 스프라이트와 속도 조작 넣기
date: 2026-06-24T11:00:00+09:00
summary: Apex Seoul에 Kenney Car Kit 기반 임시 차량 스프라이트를 올리고, 좌우 조향, 악셀, 브레이크, 기본 주행 속도 복귀를 구현했습니다.
image: /images/posts/202606/apex-seoul-player-car-speed.png
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

[지난 글](/article/phaser4-apex-seoul-roadsegment-curve-rendering/)에서는 **Apex Seoul**의 도로를 `RoadSegment` 기반으로 바꾸고, segment의 `curve` 값을 이용해 pseudo 3D 커브 도로를 만들었다.

그때까지 화면에는 도로만 있었다.

도로가 휘고, 카메라가 앞으로 움직이고, 갓길과 차선이 원근감 있게 지나갔다. 하지만 레이싱 게임이라고 부르기에는 아직 가장 중요한 것이 빠져 있었다.

차다.

이번 글에서는 화면 하단에 플레이어 차량을 올렸다. 그리고 단순히 이미지만 띄우는 데서 끝내지 않고, 다음 내용을 함께 구현했다.

- 오픈소스 3D 차량 모델을 내려받는다.
- 3D 모델을 후면/후면 좌측/후면 우측 스프라이트로 자동 렌더링한다.
- 차량을 도로 위에 붙어 보이게 배치한다.
- `←/→`로 조향한다.
- `↑`로 악셀, `↓`로 브레이크를 구현한다.
- 입력이 없으면 기본 주행 속도로 돌아오게 한다.
- 속도에 따라 카메라 z 이동량과 FOV를 약하게 바꾼다.

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

![Apex Seoul player car and speed control](/images/posts/202606/apex-seoul-player-car-speed.png)

아직 드리프트도 없고, 충돌도 없고, AI 차량도 없다.

하지만 이제 도로만 움직이는 화면은 아니다. 플레이어 차량이 있고, 조향이 있고, 속도가 있다.

## 왜 2D 탑뷰 차량을 쓰지 않았나

처음에는 차량 에셋으로 Kenney의 `Racing Pack`을 검토했다.

Kenney 에셋은 라이선스가 깔끔하고, 프로토타입에 쓰기 좋다. 그런데 `Racing Pack`은 기본적으로 2D top-down 차량이다.

Apex Seoul은 위에서 내려다보는 탑뷰 레이싱 게임이 아니다. 화면 아래쪽에서 차 뒤를 보고, 도로가 horizon 쪽으로 뻗어 보이는 pseudo 3D 레이싱 게임이다.

따라서 위에서 본 차량을 화면 하단에 놓으면 시점이 어긋난다.

이번에 필요한 것은 이런 이미지다.

- 뒤에서 보이는 차량
- 약간 위에서 내려다보는 후면 시점
- 좌우 조향에 쓸 수 있는 후면 좌측/후면 우측 각도
- 배경이 투명한 PNG

그래서 2D 탑뷰 에셋 대신, 3D 모델을 원하는 각도로 렌더링해서 2D 스프라이트로 쓰는 쪽을 선택했다.

## Kenney Car Kit을 사용했다

이번 임시 차량 에셋은 Kenney `Car Kit`을 사용했다.

- 출처: <https://kenney.nl/assets/car-kit>
- 제작자: Kenney
- 라이선스: Creative Commons CC0

`Car Kit`은 GLB, FBX, OBJ 모델을 포함한 3D 차량 팩이다. 게임 런타임에서 3D 모델을 직접 로드하지는 않는다.

대신 빌드 전에 GLB 모델을 후면 각도로 렌더링하고, 결과 PNG만 Phaser에서 사용한다.

이번에 기본으로 사용한 모델은 `race-future.glb`다.

```text
games/apex-seoul/assets/vehicles/kenney-car-kit/Models/GLB format/race-future.glb
```

렌더링 결과는 아래 세 파일로 저장한다.

```text
games/apex-seoul/assets/vehicles/rendered/player-car-rear.png
games/apex-seoul/assets/vehicles/rendered/player-car-rear-left.png
games/apex-seoul/assets/vehicles/rendered/player-car-rear-right.png
```

## 에셋 다운로드와 렌더링 자동화

에셋을 한 번 손으로 받아도 되지만, 나중에 다시 세팅할 때 같은 작업을 반복하고 싶지는 않았다.

그래서 두 개의 스크립트를 추가했다.

```json
{
    "download:vehicles": "node scripts/download-kenney-car-kit.mjs",
    "render:vehicles": "node scripts/render-vehicle-sprites.mjs"
}
```

다운로드 스크립트는 Kenney `Car Kit` 페이지에서 현재 zip 주소를 찾고, zip을 내려받아 `assets/vehicles/kenney-car-kit/`에 압축 해제한다.

```bash
npm run download:vehicles
```

렌더링 스크립트는 Three.js로 GLB 모델을 읽고, headless Edge로 캡처한 뒤, 초록색 배경을 투명화해서 PNG를 만든다.

```bash
npm run render:vehicles
```

처음에는 브라우저의 canvas에서 직접 `toDataURL()`을 읽어오려고 했다.

하지만 현재 개발 환경에서는 Linux Chromium 의존성 문제와 Windows Edge CDP 연결 문제가 겹쳤다. 결국 더 단순한 쪽으로 바꿨다.

- 임시 HTML 렌더러를 띄운다.
- Three.js로 차량 모델을 그린다.
- headless Edge의 `--screenshot`으로 캡처한다.
- `sharp`로 green screen 픽셀을 투명화한다.

투명 픽셀의 RGB 값이 초록색으로 남으면 Phaser에서 가장자리 색이 살짝 비칠 수 있었다. 그래서 투명 처리할 때 RGB도 0으로 지웠다.

```ts
if (isGreenScreen) {
    data[index] = 0;
    data[index + 1] = 0;
    data[index + 2] = 0;
    data[index + 3] = 0;
}
```

이제 스프라이트를 다시 만들고 싶으면 명령 한 번이면 된다.

## Phaser에서 차량 이미지 로드하기

Vite 프로젝트이므로 PNG를 import해서 Phaser loader에 넘겼다.

```ts
import playerCarRearLeftUrl from '../assets/vehicles/rendered/player-car-rear-left.png';
import playerCarRearRightUrl from '../assets/vehicles/rendered/player-car-rear-right.png';
import playerCarRearUrl from '../assets/vehicles/rendered/player-car-rear.png';
```

`preload()`에서는 세 이미지를 등록한다.

```ts
preload() {
    this.load.image('player-car-rear', playerCarRearUrl);
    this.load.image('player-car-rear-left', playerCarRearLeftUrl);
    this.load.image('player-car-rear-right', playerCarRearRightUrl);
}
```

그리고 `create()`에서 차량 이미지를 하나 만든다.

```ts
this.playerCar = this.add
    .image(0, 0, 'player-car-rear')
    .setDepth(6)
    .setOrigin(0.5, 0.78);
```

`origin`을 `0.5, 0.78`로 둔 이유는 차량 중심보다 살짝 아래쪽을 기준점으로 삼기 위해서다.

pseudo 3D 도로 위에서는 차량이 바닥에 닿아 보이는 지점이 중요하다. 이미지 정중앙을 기준점으로 두면 차가 살짝 떠 있는 것처럼 느껴질 수 있다.

## 차량 상태를 따로 만들었다

처음에는 카메라 lateral offset을 좌우 키로 직접 움직였다.

그런데 차량이 생기자 그 방식이 어색해졌다. 좌우 키를 눌렀는데 카메라가 움직이면, 내가 차를 조향하는지 화면을 움직이는지 헷갈린다.

그래서 차량 상태를 따로 만들었다.

```ts
type PlayerVehicleState = {
    lateralOffset: number;
    speed: number;
    steering: number;
    steeringVelocity: number;
};
```

각 값은 이런 역할을 한다.

- `lateralOffset`: 도로 중심에서 차가 얼마나 좌우로 벗어났는지
- `speed`: 현재 주행 속도
- `steering`: 화면에 보여줄 조향 상태
- `steeringVelocity`: 좌우 이동 속도

조작도 분리했다.

- `←/→`: 차량 조향
- `↑`: 악셀
- `↓`: 브레이크
- `WASD`: 카메라 디버그 이동
- `Q/E`: pitch 조정

이제 화살표 키는 플레이어 차량에 집중하고, WASD는 카메라 디버그용으로 남겨둘 수 있다.

## 차량을 화면 고정값이 아니라 도로 위에 붙인다

차량을 단순히 `viewport.height * 0.86`에 놓으면 처음에는 괜찮아 보인다.

하지만 카메라 높이를 바꾸면 차가 도로 위에 붙어 있지 않고, 화면 위를 떠다니는 것처럼 느껴진다.

그래서 차량 위치도 도로 위의 월드 좌표를 투영해서 구했다.

```ts
const roadAnchor = projectGroundPoint(
    {
        x: player.lateralOffset,
        z: this.cameraResource.z + PLAYER_ROAD_ANCHOR_DISTANCE,
    },
    this.cameraResource,
    viewport,
);
```

여기서 `PLAYER_ROAD_ANCHOR_DISTANCE`는 카메라 앞쪽 얼마 지점에 차량을 놓을지 정하는 값이다.

실제 3D 게임처럼 카메라와 차량의 상대 위치를 엄밀하게 모델링한 것은 아니다. 하지만 같은 projection 함수를 쓰기 때문에, 카메라 height나 pitch가 바뀌어도 차량이 도로 위에 더 잘 붙어 보인다.

최종 화면 좌표는 이렇게 잡았다.

```ts
const anchorX = roadAnchor.visible
    ? Phaser.Math.Clamp(roadAnchor.x, spriteSize * 0.35, viewport.width - spriteSize * 0.35)
    : viewport.width / 2;

const anchorY = roadAnchor.visible
    ? Phaser.Math.Clamp(roadAnchor.y + spriteSize * 0.1, viewport.height * 0.68, viewport.height * 0.96)
    : viewport.height * 0.86;
```

차량이 화면 밖으로 너무 나가지 않게 `Clamp`도 걸었다.

## 조향은 이미지 전환과 약한 회전으로 표현했다

아직 바퀴 회전이나 드리프트 물리는 없다.

그래도 좌우 키를 눌렀을 때 차가 반응해야 한다.

이번에는 세 장의 스프라이트를 조향 상태에 따라 바꿔 끼웠다.

```ts
const steerTexture =
    player.steering < -0.18
        ? 'player-car-rear-left'
        : player.steering > 0.18
            ? 'player-car-rear-right'
            : 'player-car-rear';
```

그리고 아주 약한 회전도 더했다.

```ts
this.playerCar
    .setTexture(steerTexture)
    .setPosition(anchorX, anchorY)
    .setDisplaySize(spriteSize, spriteSize)
    .setRotation(Phaser.Math.DegToRad(player.steering * 3.5));
```

이 회전값은 크면 금방 장난감처럼 보인다.

지금 단계에서는 “방향을 틀고 있다”는 힌트만 주는 정도가 낫다.

## 손을 놓으면 도로 중앙으로 돌아오게 했다

현재 차량 좌우 이동은 완전한 물리 모델이 아니다.

하지만 최소한 다음 느낌은 필요했다.

- 좌우 키를 누르면 차가 이동한다.
- 손을 놓으면 계속 밀려가지 않고 중앙으로 돌아온다.
- 좌우 끝에서는 더 밀리지 않는다.

그래서 간단한 힘 세 개를 더했다.

```ts
const centeringForce = -player.lateralOffset * PLAYER_CENTERING_RESPONSE;
const steeringForce = steerAxis * PLAYER_STEER_ACCELERATION;
const dampingForce = -player.steeringVelocity * PLAYER_STEER_DAMPING;

player.steeringVelocity += (steeringForce + centeringForce + dampingForce) * seconds;
player.lateralOffset += player.steeringVelocity * seconds;
```

정확한 차량 동역학은 아니다.

하지만 프로토타입 단계에서는 꽤 쓸 만하다. 조향 입력과 복귀 감각을 튜닝하기 쉽고, 나중에 드리프트 물리로 바꿔도 `lateralOffset`, `steeringVelocity` 같은 상태 이름은 계속 활용할 수 있다.

## 속도 상태를 camera z와 연결했다

이전까지 카메라는 고정 속도로 앞으로 움직였다.

```ts
camera.z = wrapDistance(camera.z + CAMERA_SCROLL_SPEED * seconds, this.roadTrack.length);
```

이번에는 차량의 `speed` 상태를 만들고, 이 값으로 `camera.z`를 움직이게 했다.

```ts
camera.z = wrapDistance(camera.z + this.playerVehicle.speed * seconds, this.roadTrack.length);
```

속도 값은 세 가지 기준을 둔다.

```ts
const PLAYER_CRUISE_SPEED = 440;
const PLAYER_ACCEL_SPEED = 760;
const PLAYER_BRAKE_SPEED = 0;
```

아무것도 누르지 않으면 `440` 근처로 돌아온다.

`↑`를 누르면 `760` 쪽으로 올라간다.

`↓`를 누르면 `0` 쪽으로 내려간다.

처음에는 `Phaser.Math.Linear()`로 목표 속도를 빠르게 따라가게 했다. 그런데 악셀을 밟으면 FOV가 너무 빨리 벌어지고, 브레이크를 밟으면 속도가 너무 빨리 0이 됐다.

그래서 속도 변화는 초당 변화량 기반으로 바꿨다.

```ts
if (brakePressed) {
    player.speed = Math.max(PLAYER_BRAKE_SPEED, player.speed - PLAYER_BRAKING * seconds);
} else if (accelPressed) {
    player.speed = Math.min(PLAYER_ACCEL_SPEED, player.speed + PLAYER_ACCELERATION * seconds);
} else if (player.speed > PLAYER_CRUISE_SPEED) {
    player.speed = Math.max(PLAYER_CRUISE_SPEED, player.speed - PLAYER_CRUISE_PULL * seconds);
} else if (player.speed < PLAYER_CRUISE_SPEED) {
    player.speed = Math.min(PLAYER_CRUISE_SPEED, player.speed + PLAYER_CRUISE_PULL * seconds);
}
```

현재 값은 이렇다.

```ts
const PLAYER_ACCELERATION = 185;
const PLAYER_BRAKING = 260;
const PLAYER_CRUISE_PULL = 115;
```

브레이크는 악셀보다 강하지만, 즉시 멈추지는 않는다.

입력이 없을 때는 천천히 기본 주행 속도로 돌아온다.

이 방식이 지금 단계에서는 훨씬 다루기 쉽다.

## FOV는 속도보다 더 늦게 따라오게 했다

속도가 빨라질 때 FOV를 조금 넓히면 속도감이 생긴다.

하지만 FOV가 너무 빠르게 바뀌면 자동차가 빨라지는 느낌보다 카메라가 튀는 느낌이 먼저 온다.

처음에는 속도 비율로 FOV를 바로 계산했다.

```ts
return CAMERA_BASE_FOV + speedRatio * CAMERA_SPEED_FOV_BONUS;
```

이 방식은 반응이 즉각적이다.

그래서 FOV도 별도 상태로 두고 천천히 따라가게 했다.

```ts
const targetFov = CAMERA_BASE_FOV + speedRatio * CAMERA_SPEED_FOV_BONUS;
const fovBlend = 1 - Math.exp(-CAMERA_FOV_RESPONSE * seconds);

this.cameraFov = Phaser.Math.Linear(this.cameraFov, targetFov, fovBlend);
```

그리고 FOV bonus도 줄였다.

```ts
const CAMERA_SPEED_FOV_BONUS = 2.4;
const CAMERA_FOV_RESPONSE = 1.25;
```

지금은 아주 약하게만 반응한다.

속도감은 도로 차선과 rumble strip이 지나가는 속도에서 주로 나오고, FOV는 보조로만 쓴다.

## 이번 단계의 한계

이제 차량이 있고, 조향이 있고, 속도가 있다.

하지만 아직 실제 코너링은 아니다.

현재 차량은 좌우 키에 따라 도로 위 x 위치를 바꾸고, 손을 놓으면 중앙으로 돌아온다. 커브에서 바깥쪽으로 밀리는 힘, 속도가 높을 때 조향이 둔해지는 감각, 드리프트 상태 같은 것은 아직 없다.

다음 단계에서 다룰 만한 것은 이쪽이다.

- 속도가 높을수록 조향 반응 줄이기
- 커브 방향과 속도에 따른 바깥쪽 힘 추가
- 도로 밖으로 나가면 감속
- slip angle과 drift score의 기반 만들기

그래도 이번 구현으로 큰 경계 하나는 넘었다.

도로만 흐르는 화면에서, 플레이어가 조작하는 차가 있는 화면이 됐다.

아직은 작은 파란 차 한 대지만, 이제 Apex Seoul은 도로 데모가 아니라 레이싱 게임 쪽으로 움직이기 시작했다.
