---
title: 225km/h인데도 코너가 느려 보였다 - grip sprite와 도로 진행 배율을 다시 나누기
date: 2026-07-23T12:00:00+09:00
summary: 최고속과 가드레일을 맞춘 뒤에도 코너는 느리고 차체는 과하게 꺾여 보였습니다. grip과 drift의 sprite 역할을 분리하고, 코너 리듬과 near-field 표식을 고친 뒤, 다른 pseudo 3D 레이싱 게임과 화면 흐름을 비교해 physical speed와 world progression 사이에 longitudinal scale을 도입한 과정을 정리합니다.
image: /images/posts/202607/apex-seoul-roadside-flow-guardrail-wall.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - pseudo-3d
    - telemetry
    - game-physics
    - racing-game
    - game-dev
---

## 자동 QA를 통과한 다음에야 보인 문제

[지난 글](/article/phaser4-apex-seoul-physics-screen-space-trials/)에서는 Raven Coupe의 최고속 평형과 가드레일 충돌, 차량의 화면상 접점을 다시 맞췄다.

차량은 내리막에서 표시 최고속 `225km/h`에 도달했고, 물리 가드레일과 화면의 가드레일도 같은 지점에서 차체와 만났다. grip과 drift 자동 주행에서도 거짓 충돌은 나오지 않았다.

그런데 직접 코너를 돌아보니 두 가지가 여전히 어색했다.

1. grip 주행인데 차량이 드리프트처럼 크게 꺾인 sprite를 사용했다.
2. HUD에는 충분히 높은 속도가 표시되는데 코너와 도로는 느리게 지나갔다.

둘 다 숫자만 보면 정상인 문제였다. 조향 입력은 실제로 크게 들어왔고, 표시 속도도 물리 속도와 일치했다. 하지만 화면이 전달하는 의미는 달랐다.

| 보이는 현상                      | 실제 문제                                 | 수정 방향                                 |
| -------------------------------- | ----------------------------------------- | ----------------------------------------- |
| grip 코너에서 차체가 크게 틀어짐 | 조향 입력 크기를 차체 slip처럼 표현       | 큰 yaw sprite를 drift 상태에만 허용       |
| 한 코너에 오래 머무는 느낌       | 같은 방향 commitment 구간이 너무 김       | 코너를 압축하고 recovery를 늘림           |
| 도로가 천천히 다가옴             | 표시 속도와 world unit 환산이 너무 보수적 | longitudinal unit scale을 명시적으로 분리 |

이번 작업은 효과를 더 세게 만드는 방향으로 시작하지 않았다. 먼저 **차량 pose가 어떤 상태를 의미하는지**, 그리고 **표시 km/h가 월드를 얼마나 빨리 통과해야 하는지**를 다시 정의했다.

[Apex Seoul 데모 보기](/games/apex-seoul/)

<div style="position: relative; width: 100%; height: min(70vh, 560px); margin: 24px 0;">
    <iframe
        src="/play/apex-seoul/"
        title="Apex Seoul"
        loading="lazy"
        style="position: absolute; inset: 0; width: 100%; height: 100%; border: 1px solid #26343c; border-radius: 8px; background: #101316;"
    ></iframe>
</div>

---

## 1. 조향을 끝까지 눌렀다고 드리프트는 아니다

Raven Coupe atlas에는 중앙, 약한 조향, 강한 조향 pose가 있다.

```text
center
steer-left/right-1
steer-left/right-2
```

기존 frame 선택은 시각 조향값이 threshold를 넘으면 `-2` pose를 선택했다. 물리적으로 타이어가 접지한 grip 상태인지, 차체가 실제로 미끄러지는 drift 상태인지는 보지 않았다.

그래서 grip 코너에서 방향키를 길게 누르면 물리는 접지를 유지하는데 sprite만 크게 돌아갔다. 화면에서는 스티어링 휠을 많이 돌렸다는 뜻보다, 차체 뒤가 빠져 yaw가 생겼다는 뜻으로 읽혔다.

이 둘은 같은 값이 아니다.

```text
steering input
  = 플레이어가 요청한 조향

body yaw / slip pose
  = 차량이 실제로 도로 진행 방향과 어긋난 상태
```

### 강한 pose를 상태에 따라 열었다

frame 선택 함수에 `allowStrongSteering`을 추가했다.

```ts
const allowStrongSteering = playerVehicle.driftState !== 'grip';

selectPlayerVehicleFrame(
    atlas,
    tuning,
    visualSteering,
    terrainCue,
    steeringThreshold,
    allowStrongSteering,
);
```

`grip`에서는 입력이 아무리 커도 약한 `-1` pose까지만 사용한다. `setup`, `drift`, `recovery`에서는 큰 yaw를 표현할 이유가 있으므로 `-2` pose를 다시 허용한다.

물리 조향량이나 횡이동 속도를 줄인 것이 아니다. 같은 grip trajectory를 유지하면서 sprite가 말하는 상태만 바로잡았다.

이 작은 분리가 핸들링 감각에 꽤 큰 차이를 만들었다. grip에서는 차가 도로에 붙어 코너를 따라가고, drift에 들어갔을 때만 차체 방향이 크게 벌어진다. 강한 sprite가 자주 나오지 않으니 실제 drift 진입도 더 분명해졌다.

![같은 고속 grip 입력에서 기존의 큰 차체 yaw와, 상태를 분리한 뒤의 읽기 쉬운 차체 pose 비교](/images/posts/202607/apex-seoul-high-speed-grip-angle-before-after.png)

*왼쪽은 입력 크기를 그대로 큰 pose로 읽힌 기존 표현이고, 오른쪽은 grip에서는 차체를 도로 흐름에 남긴 표현이다. 물리 궤적이 아니라 화면이 전달하는 상태를 고친 비교다.*

![grip의 작은 yaw와 drift의 큰 yaw가 각각 무엇을 뜻하는지 정리한 역할 카드](/images/posts/202607/apex-seoul-grip-drift-role.png)

이 두 장을 함께 보면 왜 `-2` pose를 없애는 대신 상태에 따라 열었는지가 보인다. 작은 pose는 조향 중인 grip을, 큰 pose는 진행 방향과 차체가 실제로 벌어진 drift를 읽게 한다.

---

## 2. 225km/h와 225km/h처럼 보이는 것은 다르다

sprite 역할을 고친 뒤 핸들링은 상당히 자연스러워졌다. 표시되는 km/h도 문제가 없었다. 그런데 코너를 지나가는 시간은 여전히 길게 느껴졌다.

처음에는 다음 후보를 생각할 수 있었다.

- FOV를 더 넓힌다.
- camera shake나 speed line을 강하게 만든다.
- 가드레일 post와 reflector를 더 많이 놓는다.
- 코스 전체를 길게 늘린다.

하지만 어느 것도 원인을 바로 설명하지는 못했다.

속도감은 적어도 세 가지 시간으로 나뉜다.

```text
vehicle speed
  = HUD와 구동계가 말하는 속도

corner duration
  = entry에서 exit까지 머무는 시간

screen-flow duration
  = 먼 표식이 화면 가까이 도달해 사라지는 시간
```

HUD 숫자가 맞아도 한 방향의 코너가 10초 넘게 이어지면 차는 코너 위에 머무는 것처럼 보인다. 가까운 lane dash가 자주 있어도 각각의 dash가 천천히 커지면 전체 도로 흐름은 여전히 느리다.

그래서 먼저 코너의 시간 구조와 표식의 통과 빈도를 분리해 측정했다.

---

## 3. 긴 코너를 줄이고 빠른 구간을 늘렸다

당시 Bugak Ridge Downhill은 `284 segment / 68,160 unit`이었다. 강한 commitment 구간 여섯 개의 길이는 다음과 같았다.

```text
27 / 20 / 20 / 20 / 15 / 18 segment
```

가장 긴 27 segment 코너는 130km/h에서 약 `14.8초`, 150km/h에서도 약 `12.8초`가 걸렸다. 이것은 코너를 빠르게 통과하는 장면이라기보다, 같은 방향으로 기울어진 화면을 오래 유지하는 장면에 가까웠다.

### 코너를 짧게 하고 회복 구간으로 길이를 돌렸다

peak curve, 좁은 도로 폭, 전체 고저차는 유지한 채 commitment run을 다시 나눴다.

```text
before  27 / 20 / 20 / 20 / 15 / 18
after   14 / 11 / 11 / 11 / 12 / 12
```

줄인 segment는 삭제하지 않았다. 24~32 segment의 recovery straight, 빠른 easy sweep, 후반의 low-demand S 구간으로 재배치했다.

최종 코스는 오히려 더 길어졌다.

| 항목               |       이전 |    변경 후 |
| ------------------ | ---------: | ---------: |
| 전체 segment       |        284 |        348 |
| 전체 길이          |    68,160u |    83,520u |
| 가장 긴 commitment | 27 segment | 14 segment |
| 130km/h 최장 체류  |  약 14.8초 |  약 7.65초 |
| 150km/h 최장 체류  |  약 12.8초 |  약 6.63초 |

중요한 것은 코스를 늘렸다는 사실이 아니다. 느린 코너를 그대로 복제하지 않고, 긴 commitment를 압축한 뒤 고속으로 숨을 돌릴 공간을 늘린 점이다.

### 코너에서만 가까운 표식의 cadence를 높였다

코너 안에서는 원근 때문에 lane dash가 중앙에 겹치고, 가드레일은 하나의 긴 덩어리처럼 보인다. 그래서 `abs(curve) >= 0.18`인 구간에만 한 segment 안의 lane dash와 바깥쪽 reflector를 두 지점으로 나눴다.

```text
straight
  1 lane-dash event / segment

corner
  2 short lane-dash events / segment
  2 outside reflector events / segment
```

물리 segment를 잘게 쪼갠 것은 아니다. 렌더 표식만 fractional Z에 배치했다.

| 표시 속도 | 직선 lane/s | 코너 lane/s | 코너 reflector/s |
| --------: | ----------: | ----------: | ---------------: |
|   110km/h |       1.548 |       3.096 |            3.096 |
|   150km/h |       2.111 |       4.222 |            4.222 |
|   185km/h |       2.604 |       5.207 |            5.207 |

첫 코너 runtime 측정에서는 가까운 motion anchor가 최대 초당 6개 지나갔고, 화면상 최대 이동 속도는 약 `142.4px/s`였다.

이 단계에서 코너의 entry, apex, exit는 이전보다 빨리 바뀌었다. 실제 주행에서도 분명히 개선됐다. 하지만 여전히 “표시 속도에 비해 도로 자체가 천천히 다가온다”는 느낌이 남았다.

표식 수를 더 늘리는 것으로는 해결되지 않는 문제였다.

![코너에서 차체 접점, 도로 폭, 가드레일이 같은 화면 좌표계로 읽히도록 맞춘 주행 화면](/images/posts/202607/apex-seoul-physics-screen-space-cornering-hero.png)

*가까운 표식의 개수와 별개로, 도로 전체가 화면을 통과하는 시간은 길 수 있다. 이번 글에서 분리한 것은 바로 이 두 감각이다.*

---

## 4. 다른 게임의 unit를 그대로 비교하지 않았다

다른 pseudo 3D 레이싱 게임을 참고할 때 가장 위험한 비교는 `speed = 12000` 같은 내부 숫자를 그대로 가져오는 것이다.

게임마다 segment 길이, 도로 폭, 카메라 높이, FOV와 표시 속도의 의미가 다르다. 한 게임의 1 unit와 다른 게임의 1 unit는 같은 거리가 아니다.

그래서 비교 단위를 다음처럼 바꿨다.

- 초당 몇 segment를 통과하는가
- 초당 도로 폭 몇 개만큼 진행하는가
- 화면 Y 60%의 지면 표식이 85%까지 오는 데 몇 초가 걸리는가
- roadside object가 16px에서 32px, 32px에서 64px로 커지는 데 몇 초가 걸리는가

아래는 이 측정을 남긴 Apex Seoul의 runtime 캡처다. 디버그 정보는 화면을 예쁘게 보이게 하려는 것이 아니라, `193km/h`라는 HUD 수치와 도로의 진행량·표식 통과를 같은 프레임에서 확인하기 위해 남겼다.

![193km/h 주행에서 HUD 속도와 도로 진행, 가드레일과 lane dash의 화면 흐름을 함께 기록한 runtime 캡처](/images/posts/202607/apex-seoul-corner-flow-runtime.png)

*HUD 속도는 충분히 높지만, 이 한 장만으로도 도로 표식이 화면 가까이 오는 시간과 코너가 유지되는 시간을 별도로 봐야 함을 확인할 수 있다.*

오픈소스 구현은 설정과 projection 식을 읽고, 상용 게임은 공식 60fps 영상의 화면 구간을 frame 단위로 표시했다.

참고한 구현과 영상:

- [Javascript Racer source](https://github.com/jakesgordon/javascript-racer/blob/master/v4.final.html)
- [CannonBall road-position conversion](https://github.com/djyt/cannonball/blob/master/src/main/engine/oferrari.cpp#L1527-L1549)
- [Horizon Chase Turbo](https://store.steampowered.com/app/389140/Horizon_Chase_Turbo/)
- [Slipstream](https://store.steampowered.com/app/732810/Slipstream/)

이 비교는 다른 게임의 속도를 정답으로 삼기 위한 것이 아니다. Apex Seoul의 문제가 marker 수인지, projection인지, world unit 환산인지 구분하기 위한 진단이었다.

### 같은 장르가 화면에 남기는 흐름

아래 두 장은 수치를 뽑은 정확한 프레임이 아니라, 비교 대상으로 삼은 게임이 도로·차·HUD를 어떤 밀도로 화면에 두는지 보기 위한 공식 스크린샷이다. 그래서 이 이미지를 pixel 수치의 근거로 쓰지는 않았고, 각 게임의 카메라와 연출을 그대로 복사하지도 않았다.

![Horizon Chase Turbo의 넓은 전방 시야와 여러 겹의 도로·차량 표식을 보여 주는 공식 스크린샷](/images/posts/202607/horizon-chase-turbo-official-screenshot.jpg)

*Horizon Chase Turbo 공식 Steam 스크린샷. 넓은 화면 안에서도 차선, 경쟁 차량, 표지판이 차례로 다가오는 계층을 참고했다. [출처: Steam](https://store.steampowered.com/app/389140/Horizon_Chase_Turbo/)*

![Slipstream의 해안 도로와 빠르게 반복되는 노면 표식을 보여 주는 공식 스크린샷](/images/posts/202607/slipstream-official-screenshot.jpg)

*Slipstream 공식 Steam 스크린샷. 노면 질감과 차선 표식은 많지만, 이번 진단에서는 표식 수 자체보다 화면을 가로지르는 시간을 분리해 측정했다. [출처: Steam](https://store.steampowered.com/app/732810/Slipstream/)*

### 현재 빌드의 화면 통과 시간이 길었다

기존 Apex Seoul에서 225km/h는 내부 `760u/s`, 약 `3.167 segment/s`였다. steady FOV를 적용해도 화면 Y 60%의 지면이 85%까지 오는 데 약 `2.061초`가 걸렸다.

Javascript Racer의 configured maximum은 `60 segment/s`, 같은 projection 기준 통과 시간은 약 `0.250초`였다. 공식 영상에서 수동으로 표시한 Horizon Chase Turbo와 Slipstream의 표식도 훨씬 빠르게 화면 가까이 도달했다.

물론 이것을 보고 Apex Seoul을 60 segment/s로 바꿀 수는 없다. Javascript Racer의 최고속은 60Hz에서 한 frame에 한 segment를 넘지 않도록 정한 엔진 안전 조건이고, 상용 게임 영상에는 서로 다른 카메라와 연출이 들어 있다.

하지만 한 가지는 분명했다.

```text
near marker cadence는 이미 목표 범위다.
그런데 marker 하나가 화면을 통과하는 시간은 길다.
```

따라서 같은 표식을 더 촘촘하게 놓는 것은 1차 해법이 아니었다. 카메라 FOV도 속도에 따라 `70.98° → 74.2°`로 이미 변하고 있었지만 2초대의 통과 시간은 그대로 남았다.

ORS-1 audit의 결론은 다음과 같았다.

| 후보 원인                                  | 판단          |
| ------------------------------------------ | ------------- |
| marker density                             | 1차 원인 아님 |
| camera projection                          | 보조 원인     |
| 큰 landmark가 드문 content gap             | 보조 원인     |
| 표시 속도와 longitudinal world unit의 환산 | 1차 원인      |

---

## 5. physical speed와 world travel speed를 분리했다

이전에는 차량의 내부 속도를 그대로 `camera.z`에 더했다.

```ts
camera.z += playerVehicle.speed * deltaTime;
```

이 값은 우연히 두 역할을 동시에 맡고 있었다.

1. 엔진, 기어, 조향과 HUD가 해석하는 차량 속도
2. 도로, 코너, object와 finish가 해석하는 월드 진행 속도

표시 km/h와 파워트레인은 이미 승인된 상태였다. 느린 화면을 고치려고 `playerVehicle.speed`를 키우면 0–100km/h, RPM, corner budget과 최고속 평형까지 다시 바뀐다.

반대로 렌더러에서만 road를 빠르게 움직이면 차량과 collision, checkpoint, object가 서로 다른 Z를 사용하게 된다.

그래서 두 값 사이에 명시적인 환산층을 추가했다.

```text
physicalSpeed
  → engine / gear / RPM
  → HUD km/h
  → steering / grip / drift

worldTravelSpeed = physicalSpeed × longitudinalScale
  → canonical camera.z
  → road / curve / elevation
  → object / collision / checkpoint / finish
```

코드의 핵심은 단순하다.

```ts
function getLongitudinalWorldTravelSpeed(physicalSpeed: number, scale: number) {
    return Math.max(0, physicalSpeed) * scale;
}

camera.z +=
    getLongitudinalWorldTravelSpeed(playerVehicle.speed, longitudinalScale) * deltaTime;
```

이것은 렌더 전용 배속이 아니다. 모든 longitudinal spatial consumer가 같은 canonical Z를 계속 사용하고, 그 Z로 들어가는 단위 환산만 명시한 것이다.

---

## 6. 1.0, 1.5, 2.0, 3.0을 같은 조건에서 비교했다

비교 후보는 네 개로 잡았다.

| 후보 | scale | 역할            |
| ---- | ----: | --------------- |
| U0   |  1.00 | 기존 기준선     |
| U1   |  1.50 | 보수적 증가     |
| U2   |  2.00 | production 후보 |
| U3   |  3.00 | 진단 상한       |

URL의 `longitudinalScale` query로 직접 선택할 수 있고, 게임 안에서는 `B` 키로 다음 후보를 선택한 뒤 clean run으로 다시 시작하게 했다.

```text
?longitudinalScale=1
?longitudinalScale=1.5
?longitudinalScale=2
?longitudinalScale=3
```

scale만 바뀌고 다음 값은 고정했다.

- 표시 km/h
- 엔진 출력과 기어비
- 조향, grip, understeer와 drift
- FOV와 shader
- marker density

### 화면 흐름 비교

| 후보 | 185km/h segment/s | 225km/h segment/s | 185km/h 60→85% | 225km/h 60→85% |
| ---- | ----------------: | ----------------: | -------------: | -------------: |
| U0   |             2.604 |             3.167 |        2.567초 |        2.061초 |
| U1   |             3.906 |             4.750 |        1.711초 |        1.374초 |
| U2   |             5.207 |             6.333 |        1.283초 |        1.031초 |
| U3   |             7.811 |             9.500 |        0.856초 |        0.687초 |

scale을 높이면 화면 흐름은 빨라지지만 코너를 조작할 시간도 함께 줄어든다. 그래서 entry, apex, exit window를 별도로 계산했다.

U2에서 185km/h의 가장 짧은 commitment는 약 `2.112초`, 60Hz 기준 약 `126.7 sample`이었다. 225km/h에서도 약 `1.737초`, `104.2 sample`이 남았다.

U3는 같은 구간이 185km/h에서 `1.408초`까지 줄었다. 빠르다는 차이는 확실했지만 production 기본값으로 쓰기에는 조작 window를 지나치게 압축할 가능성이 있었다.

직접 A/B한 결과 U2 `longitudinalScale=2`가 가장 나았다. 표시 속도는 그대로인데 도로가 더 빠르게 다가오고, 이미 짧게 정리한 코너도 답답하게 늘어지지 않았다.

이 선택이 단순히 화면을 빠르게 넘긴 결과가 아님은, 앞서 맞춘 가드레일과 차체 접점에서도 확인할 수 있다. 동일한 주행 장면에서 차는 여전히 도로 하단의 기준점에 남고, 가드레일은 도로 진행과 같은 Z 계약을 사용한다.

![속도감 보정 이전에 확인한 차체 접점과 가드레일의 화면상 정렬 장면](/images/posts/202607/apex-seoul-roadside-flow-guardrail-wall.png)

*longitudinal scale은 이 정렬을 무시하고 road만 배속하는 옵션이 아니다. collision, object, checkpoint까지 같은 canonical `camera.z`를 따라가도록 단위 환산을 바꾼다.*

최종 값은 다음과 같다.

```text
185km/h
physicalSpeed      624.889u/s
worldTravelSpeed  1249.778u/s

225km/h
physicalSpeed      760u/s
worldTravelSpeed  1520u/s
```

---

## 7. 배율을 올린 뒤 기존 QA를 보존하는 법

longitudinal scale은 화면 효과보다 영향 범위가 크다. 코너에 도달하는 시간, finish 시간, roadside object와 collision sample이 모두 빨라진다.

그래서 A/B audit에 다음 조건을 넣었다.

- 기본 후보는 U2 `2.00`이어야 한다.
- 표시 km/h 오차는 `0`이어야 한다.
- powertrain 코드가 longitudinal scale에 의존하면 안 된다.
- 기존의 `camera.z += physicalSpeed` 경로가 남아 있으면 안 된다.
- 30Hz 한 step의 진행량은 어떤 후보에서도 `0.5 segment` 이하여야 한다.
- 과거 SH-7/TSE-5 비교 시나리오는 U0에 고정한다.

U3의 최대 진행량도 225km/h에서 한 step당 약 `0.317 segment`였다. 현재 runtime safety 기준 안에 남았다.

과거 시나리오를 U0에 고정한 것도 중요했다. production 기본값을 U2로 바꾸면 예전 자동 주행은 같은 입력 시각에 다른 코너에 도달한다. 그 상태로 이전 결과와 비교하면 handling 회귀인지 진행 배율 차이인지 알 수 없다.

새 ORS 측정은 U2를 사용하고, 과거 named scenario는 U0를 사용한다. A/B 후보를 남겨둔 이유도 단순한 debug 편의가 아니라 회귀 기준을 보존하기 위해서다.

---

## 8. 더 강한 효과를 넣지 않고 마감했다

처음 검토했던 추가 FOV impulse, 상시 shake, 코너 roll, 더 강한 speed line은 적용하지 않았다.

이번 사이클에서 실제로 필요했던 것은 다음 네 가지였다.

1. grip과 drift의 sprite 역할 분리
2. 긴 commitment를 압축한 코스 리듬
3. 코너에서 읽히는 near-field event
4. 표시 속도와 world progression 사이의 명시적 unit scale

ORS-2B roadside hero object, traffic, sector transition, 사건 기반 audio도 지금 속도감 문제를 가리기 위해 먼저 넣지 않기로 했다. 이 항목들은 나중에 코스 환경, 경쟁 시스템, 오디오 피드백을 만들 때 각각 상위 기능에 합칠 예정이다.

현재 판단은 이렇다.

```text
handling   production 기준선 확보
drift      grip과 역할 분리 완료
speed      표시 km/h와 최고속 평형 유지
speed feel U2 longitudinal scale로 승인
```

다음 단계는 또 다른 속도 효과가 아니다. 이제 주행을 명확히 시작하고 끝내며 다시 도전할 이유를 만드는 time attack loop로 넘어간다.

```text
countdown
  → timed run
  → checkpoint split
  → finish result
  → best record
  → restart
```

---

## 마무리: 속도감도 하나의 단위 계약이다

이번 작업 전에는 속도감을 주로 FOV, shader, roadside marker의 문제로 봤다. 모두 필요한 요소였지만, 표시 속도와 월드 진행이 어떤 비율로 연결되는지 먼저 정하지 않으면 효과만으로는 한계가 있었다.

Pseudo 3D 레이싱에서 내부 속도는 현실의 m/s가 아니다. segment 길이도 실제 미터가 아니고, road width도 다른 엔진과 바로 비교할 수 없다.

그렇다고 모든 것이 감각의 영역인 것은 아니다.

- 표시 km/h와 엔진은 `physicalSpeed`를 공유한다.
- 도로와 object, collision, finish는 canonical `camera.z`를 공유한다.
- 두 좌표계 사이는 `longitudinalScale`이라는 명시적인 계약으로 연결한다.
- 화면 흐름은 segment/s와 screen pass time으로 비교한다.
- 조작 가능성은 entry/apex/exit 시간과 sample 수로 다시 확인한다.

속도감을 개선한 최종 값은 단순히 `2배`가 아니다. 무엇을 두 배로 하고, 무엇은 그대로 둘지를 분리한 결과다.

225km/h라는 숫자를 더 크게 만들지 않고도 더 빠르게 달리는 것처럼 보이게 된 이유는, 화면 효과를 과장해서가 아니라 그 숫자가 월드에서 의미하는 진행량을 다시 정의했기 때문이다.
