---
title: Phaser 4 Pseudo 3D 레이싱 게임 - 핸들링 감각을 로그로 튜닝하기
date: 2026-07-03T20:30:00+09:00
summary: Apex Seoul의 주행 감각을 OutRun식 grip 기준으로 다시 보고, 고정 화면 비율, WebGL 전환, 속도 표시 보정, shader speed cue, 자동 handling simulation으로 핸들링 후보를 반복 비교했습니다.
image: /images/posts/202607/apex-seoul-handling-speed-cue.png
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

## 들어가며

[지난 글](/article/phaser4-apex-seoul-runtime-sprite-contact-shadow/)에서는 **Apex Seoul**의 차량 스프라이트를 게임 안에 붙여보았다.

Genesis G70 128px approved sprite를 런타임 차량으로 연결했고, 기본 grip steering은 5way가 아니라 3way로 두었다. 고저차에서 차가 떠 보이는 문제를 contact cue와 그림자로 다시 잡았고, 둥근 타원 그림자 대신 silhouette shadow pass도 넣었다.

그때의 결론은 이랬다.

차량은 이미지 파일로 완성되는 것이 아니라, 도로 위에서 붙어 보일 때 완성된다.

이번에는 그 다음 문제를 봤다.

차량은 이제 어느 정도 붙어 보인다.

그런데 달려보면 아직 이상하다.

정지 상태에서 가속하는 느낌이 어색하고, 속도 수치와 체감이 맞지 않고, 고속에서 차체가 너무 크게 틀어져 보이기도 했다.

이번 글에서는 그 감각을 한 번에 고치지 않고, 작은 지표로 쪼개서 반복 비교할 수 있게 만든 과정을 정리한다.

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

![Apex Seoul handling speed cue](/images/posts/202607/apex-seoul-handling-speed-cue.png)

## 먼저 코드를 쪼갰다

핸들링을 고치기 전에 `main.ts`부터 쪼갰다.

처음에는 게임이 작으니 한 파일에 있어도 괜찮았다.

하지만 핸들링을 보기 시작하니 문제가 생겼다.

속도, 조향, HUD, runtime query, telemetry, road object, shader가 한 파일에 있으면 어떤 값이 감각을 바꾸는지 따라가기 어렵다.

그래서 현재는 대략 이렇게 나누었다.

```text
game/runtimeConfig.ts
game/runtimeTelemetry.ts
game/playerVehicleController.ts
game/hud.ts
game/roadObjectRenderer.ts
game/speedEffectShader.ts
```

특히 중요한 것은 `playerVehicleController.ts`다.

자동 테스트에서 Phaser scene 전체를 띄우지 않고도 차량 속도와 조향만 돌려보고 싶었기 때문이다.

그래서 차량 컨트롤러는 가능하면 Phaser에 기대지 않게 만들었다.

```ts
export type PlayerVehicleControllerConfig = {
    accelSpeed: number;
    engineAcceleration: number;
    highSpeedSteerForceDrop: number;
    highSpeedSteerVisualDrop: number;
    curveDriftAcceleration: number;
    curveSteeringCue: number;
};
```

이렇게 나누고 나니 이후 작업이 훨씬 편해졌다.

게임 화면에서 보는 값과, 브라우저 없이 빠르게 비교하는 값이 같은 설정을 바라볼 수 있게 되었기 때문이다.

## 화면 비율을 고정했다

그 다음은 화면 비율이었다.

이전에는 화면 크기에 따라 감각이 조금씩 달라졌다.

일반 UI라면 반응형이 좋은 방향일 수 있다. 하지만 pseudo 3D 레이싱에서는 horizon, 차량 anchor, road width, FOV의 관계가 곧 조작 감각이 된다.

같은 속도와 같은 커브라도 화면 비율이 바뀌면 도로가 더 길어 보이거나, 차량이 더 답답해 보이거나, 조향이 더 큰 것처럼 느껴질 수 있다.

그래서 논리 화면을 고정했다.

```text
logical size: 1200 x 760
Phaser scale mode: FIT
```

브라우저 크기는 바뀔 수 있지만, 게임 안에서 보는 기준 화면은 항상 같은 비율을 유지한다.

이 작업은 화려하지 않지만 중요했다.

핸들링 튜닝을 할 때 기준 화면이 흔들리면, 내가 고친 것이 물리인지 화면 비율인지 알 수 없기 때문이다.

## WebGL로 바꾸고 속도 cue를 다시 봤다

지난 글에서는 Canvas 단계에서도 silhouette shadow를 붙였다.

이번에는 renderer를 WebGL로 바꾸고, 속도감 연출도 다시 보았다.

처음에는 속도가 올라갈 때 카메라를 확대하는 연출을 생각했다.

하지만 실제로는 별로 좋은 방향이 아니라고 판단했다.

고속에서 차량을 크게 확대하면 도로를 읽을 공간이 줄어든다. 조작 기준점도 무거워지고, pseudo 3D 도로의 원근감이 답답해질 수 있다.

그래서 확대가 아니라 반대에 가까운 방향으로 갔다.

고속에서 FOV를 조금 넓히고, 도로 하단과 shoulder 쪽에 얇은 speed streak를 더했다.

현재 값은 이렇다.

```text
camera FOV speed bonus: 3.5
speed effect min ratio: 0.42
speed effect max alpha: 0.88
speed effect time scale: 1.7
```

이 speed cue는 `Phaser.GameObjects.Shader`로 만들었다.

전체 화면 blur는 쓰지 않았다. HUD와 차량을 덮지 않도록 player shadow보다 낮은 depth에 두고, 도로 흐름을 보조하는 정도로만 넣었다.

속도감은 한 가지 효과로 만들기 어렵다.

도로 segment의 흐름, roadside object, FOV, horizon, shader cue가 같이 만들어야 한다.

이번 작업은 그중에서 FOV와 shader 쪽을 조금 열어둔 단계다.

## speed 700은 700km/h가 아니다

작업 중에 헷갈렸던 부분이 하나 있었다.

HUD에 보이는 speed가 `700` 근처까지 올라간다.

처음 보면 700km/h처럼 느껴질 수 있다.

하지만 Apex Seoul의 내부 `speed`는 실제 km/h가 아니다. 도로 z를 얼마나 빨리 진행시키는지를 나타내는 world unit/sec에 가깝다.

그래서 표시용 속도와 내부 속도를 분리했다.

현재 표시 기준은 이렇게 잡았다.

```text
760u = 200 km/h
700u = 184 km/h
440u = 116 km/h
```

즉 `speed 700`대는 현실 속도 700km/h가 아니라, 표시 기준으로는 약 180km/h대다.

다운힐 공도 감각이라면 200km/h를 크게 넘는 표시는 어색하다. 대신 실제 속도감은 도로 흐름과 화면 cue로 만든다.

HUD에는 둘을 같이 보이게 했다.

```text
speed 184 km/h (700u)
```

이렇게 해두면 디버깅할 때는 내부 단위를 볼 수 있고, 플레이어에게 보여줄 감각은 km/h 기준으로 조정할 수 있다.

## 정지 출발은 full throttle이 아니어야 했다

정지 상태에서 가속할 때도 이상함이 있었다.

엔진 가속을 높이면 고속 추진감은 좋아진다.

그런데 그 값을 그대로 정지 출발에 쓰면 출발 순간이 너무 튄다.

반대로 엔진 가속을 낮추면 출발은 부드럽지만, 고속으로 올라가는 과정이 답답해진다.

그래서 저속 구간에 별도 throttle ratio를 넣었다.

```text
engineAcceleration: 170
launchThrottleMinRatio: 0.30
launchThrottleFullSpeedRatio: 0.38
```

정지 근처에서는 엔진 힘을 30% 정도로 시작하고, speed ratio가 `0.38` 근처에 갈수록 full throttle에 가까워진다.

시뮬레이션 기준으로 0-100km/h 표시 속도는 약 5초 근처가 되었다.

정확한 차량 시뮬레이션을 만들려는 것은 아니다.

목표는 정지 출발에서 "차가 순간이동하듯 튄다"와 "차가 깨어나지 않는다" 사이를 찾는 것이다.

## OutRun식 기준을 문서로 먼저 세웠다

핸들링을 바로 수정하기 전에 먼저 문서로 비교 기준을 잡았다.

문서 이름은 `docs/apex-seoul-handling-outrun-review.md`다.

여기서 중요한 점은 OutRun을 복제하겠다는 뜻이 아니라는 것이다.

원본 sprite나 물리값을 가져오려는 것이 아니다.

참고한 것은 감각의 구조다.

내가 잡은 기준은 이렇다.

```text
1. 화면 하단 차량은 안정적인 기준점이어야 한다.
2. grip 조향은 빠르지만 과장되지 않아야 한다.
3. 도로 커브가 차를 밀어야 하지만 조작권을 빼앗으면 안 된다.
4. 코너 감속은 벌점처럼 느껴지면 안 된다.
5. 속도감은 수치보다 도로 흐름과 FOV가 먼저다.
```

특히 grip과 drift의 역할 분리가 중요했다.

기본 grip 상태에서 차체 yaw가 너무 크면, 플레이어는 "잘 돌고 있다"보다 "이미 미끄러지고 있다"로 읽을 수 있다.

그래서 기본 주행에서는 작은 yaw만 쓰고, `steer-left-2`, `steer-right-2`처럼 큰 yaw pose는 나중에 drift/slip 상태를 만들 때 열기로 했다.

![Grip yaw and drift yaw role](/images/posts/202607/apex-seoul-grip-drift-role.png)

## 자동 반복 테스트를 만들었다

문서를 만들고 나니 다음 문제가 생겼다.

이 기준을 매번 사람이 직접 플레이하면서 비교하기에는 시간이 너무 많이 든다.

그래서 브라우저 없이 빠르게 도는 simulation runner를 만들었다.

```bash
npm run qa:handling-sim --workspace @games/apex-seoul
```

이 스크립트는 Phaser scene 전체를 띄우지 않는다.

`playerVehicleController`만 직접 돌리면서 후보 설정을 비교한다.

렌더링, road object, shader, 실제 sprite frame은 볼 수 없다. 대신 속도, lateral offset, steering, curve force 같은 값은 아주 빠르게 비교할 수 있다.

시나리오는 이렇게 나누었다.

```text
standing-start-12s
straight-accel-20s
micro-tap-left
hold-left-1s-release
left-hold-3s-release
slalom-20s
curve-no-input
curve-counter-steer
```

각 시나리오는 사람이 느끼는 애매함을 작게 쪼갠 것이다.

예를 들어 `micro-tap-left`는 아주 짧게 왼쪽을 눌렀을 때 차가 얼마나 움직이는지 본다.

짧게 톡 눌렀는데 차가 너무 많이 움직이면 불안하다.

반대로 전혀 반응하지 않으면 둔하다.

`curve-counter-steer`는 커브가 차를 밀 때 반대 조향으로 회복 가능한지를 본다.

점수는 절대적인 재미 점수가 아니다.

자동화로 좋은 핸들링을 증명할 수는 없다.

다만 이상한 후보를 빠르게 탈락시키고, 사람이 실제 화면으로 볼 후보를 줄일 수는 있다.

![Apex Seoul handling simulation log](/images/posts/202607/apex-seoul-handling-sim-log.png)

## 실제로 적용한 1차 튜닝

처음에는 커브가 차를 너무 강하게 빼앗는 느낌과, 코너에서 속도가 벌점처럼 죽는 느낌을 줄였다.

대략 이런 값들이 바뀌었다.

```text
curveDriftAcceleration: 260 -> 160
curveSteeringCue: 0.10 -> 0.06
cornerAccelSpeedDrop: 150 -> 100
cornerSpeedPull: 190 -> 120
engineAcceleration: 128 -> 170
steeringVelocityCue: 0.38 -> 0.25
highSpeedSteerVisualDrop: 0.34 -> 0.25
steerWeak: 0.18 -> 0.16
```

이 단계의 목적은 차를 더 빠르게 만드는 것이 아니었다.

도로가 커브를 전달하되, 운전자가 조작권을 빼앗긴 것처럼 느끼지 않게 하는 것이었다.

그리고 throttle을 누르고 있는데 코너에서 갑자기 엔진이 꺼진 것처럼 느껴지는 것도 줄이고 싶었다.

## 2차 튜닝은 pose와 lateral movement를 나눠 보았다

그 다음에는 조향 감각을 봤다.

시각 pose는 빨리 읽혀야 한다.

하지만 실제 lateral movement가 너무 쉽게 커지면 차가 차선을 먹고 들어가는 것처럼 불안해진다.

그래서 두 가지를 같이 보았다.

```text
inputResponse: 16 -> 18
steeringVelocityCue: 0.25 -> 0.20
steerWeak: 0.16 -> 0.14
steerAcceleration: 1750 -> 1650
centeringResponse: 1.9 -> 1.75
```

`inputResponse`와 `steerWeak`는 pose가 더 빨리 읽히도록 한다.

반대로 `steeringVelocityCue`는 줄였다.

입력 해제 후 lateral velocity 때문에 차체가 오래 비틀려 보이는 것을 줄이기 위해서다.

`steerAcceleration`과 `centeringResponse`는 actual lateral movement의 무게를 조금 조정했다.

결과적으로 짧은 탭이나 슬라럼에서 lateral offset이 조금 더 예측 가능해졌다.

## 고속 grip 각도를 줄였다

마지막으로 본 것은 고속 grip 각도였다.

여기서 문제가 꽤 분명했다.

고속에서는 실제 조향 힘이 줄어든다.

하지만 visual pose는 그만큼 줄지 않았다.

기존 구조는 대략 이랬다.

```text
steerForceRatio = highSpeedSteerForceDrop 0.42
steerVisualRatio = highSpeedSteerVisualDrop 0.25
curve visual cue = currentCurve * speedRatio * curveSteeringCue
```

최고속 근처에서 실제 조향 힘은 약 58%까지 줄어든다.

하지만 visual pose는 약 75%까지밖에 줄지 않았다.

게다가 커브 visual cue는 `speedRatio`에 비례해서 커졌다.

즉 차는 고속이라 덜 돌아야 하는데, 화면에서는 아직 꽤 크게 틀어져 보일 수 있었다.

OutRun식 grip 감각으로 보면 이건 좋지 않다.

기본 grip 상태의 차체 yaw가 커지면, 커브를 도는 것이 아니라 drift 중인 것처럼 읽힌다.

그래서 고속 grip에서는 보이는 각도만 더 눌렀다.

```text
highSpeedSteerVisualDrop: 0.25 -> 0.38
curveSteeringHighSpeedDrop: 0.00 -> 0.38
curveSteeringCue: 0.06 유지
```

중요한 점은 lateral physics를 크게 바꾸지 않았다는 것이다.

차가 실제로 움직이는 양을 먼저 바꾸면 조작감이 또 달라진다.

이번에는 "보이는 고속 yaw"만 줄여서, grip과 drift의 시각 역할을 분리했다.

시뮬레이션 로그는 이렇게 나왔다.

```text
previous-grip-angle score: 97.0
baseline score: 96.9
extra-grip-angle-damping score: 96.5

left-hold-3s highSpeedSteeringMaxAbs:
0.790 -> 0.674

curve-no-input highSpeedCurveSteeringMaxAbs:
0.035 -> 0.022
```

`0.45`까지 더 강하게 누르는 후보도 있었다.

하지만 그 후보는 pose가 너무 죽을 수 있어 보류했다.

현재는 `0.38`이 적당한 1차 지점으로 보인다.

![Apex Seoul high speed grip angle before after](/images/posts/202607/apex-seoul-high-speed-grip-angle-before-after.png)

## 자동 테스트가 못 보는 것

이번 작업에서 자동 시뮬레이션은 꽤 도움이 되었다.

하지만 이것이 핸들링을 완성했다는 뜻은 아니다.

자동 simulation이 보는 것은 이런 값이다.

```text
speed
lateralOffset
steering
curve force
candidate score
```

반대로 아직 못 보는 것도 많다.

```text
road object flow
shader speed cue의 실제 화면 느낌
sprite frame의 시각적 무게
shadow와 pose가 같이 읽히는지
손으로 조작할 때의 심리적 반응
```

게임 감각은 결국 사람이 봐야 한다.

다만 사람이 매번 같은 후보를 직접 달려보는 것은 비싸다.

자동화는 감각을 대체하는 것이 아니라, 감각을 확인할 후보를 줄이는 도구다.

이번 작업에서 가장 큰 수확도 그것이었다.

"뭔가 이상하다"를 다시 같은 조건으로 불러올 수 있게 되었다.

## 마치며

차량이 도로에 붙어 보이는 것과, 달릴 때 믿을 수 있는 것은 다른 문제였다.

지난 글에서는 sprite, 고저차, shadow를 한 화면의 물리처럼 맞추는 데 집중했다.

이번에는 그 다음 단계로 속도, 조향, 커브 감각을 OutRun식 grip 기준으로 다시 쪼갰다.

내부 speed unit과 표시 km/h를 분리했고, 정지 출발 throttle을 보정했고, WebGL shader로 속도 cue를 조금 더했다.

그리고 무엇보다 자동 handling simulation을 만들어 튜닝 후보를 반복 비교할 수 있게 했다.

아직 최종 핸들링은 아니다.

다음에는 `curveDriftAcceleration: 160 -> 130` 후보를 실제 브라우저 화면에서 다시 보고 싶다. road object flow와 shader speed cue도 더 다듬어야 한다.

언젠가는 drift/slip 상태를 만들고, 지금 아껴둔 강한 yaw pose도 다시 열어야 한다.

하지만 이제 방향은 조금 더 분명하다.

좋은 주행 감각은 한 번에 맞추는 것이 아니라, 이상한 느낌을 다시 불러와 비교할 수 있을 때 가까워진다.
