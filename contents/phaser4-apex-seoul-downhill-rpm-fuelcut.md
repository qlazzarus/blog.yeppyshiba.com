---
title: Phaser 4 Pseudo 3D 레이싱 게임 - 다운힐 진행 구조와 RPM 계기판 만들기
date: 2026-07-10T15:30:00+09:00
summary: Apex Seoul을 한 번 내려오는 다운힐 런으로 정리하고, 고속 조향과 코너 감속을 실제 주행 로그로 다시 튜닝한 뒤, FT86 기반 Raven Coupe에 NA 고회전 RPM, 기어, 토크 곡선, fuel cut 상태를 붙였습니다.
image: /images/posts/202607/apex-seoul-black-blue-downhill-progress.png
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

[지난 글](/article/phaser4-apex-seoul-handling-log-tuning/)에서는 **Apex Seoul**의 핸들링 감각을 로그로 보기 시작했다.

그때의 핵심은 이랬다.

차가 느린 것이 아니라, 화면이 아직 빠르다고 충분히 말하지 못했다.

그래서 내부 speed와 표시 km/h를 분리했고, 고속에서 FOV와 speed cue를 조금 더 열었고, OutRun식 grip 감각을 기준으로 고속 yaw를 줄였다.

이번 글은 그 다음 이야기다.

이제 Apex Seoul은 단순히 도로 위를 계속 달리는 실험 화면이 아니라, 정상에서 출발해 아래로 내려오는 **한 판의 다운힐 런**에 가까워졌다. 동시에 차량의 속도계와 RPM도 디버그 숫자에서 벗어나기 시작했다.

이번 작업에서 다룬 것은 크게 세 가지다.

```text
1. 코스 진행 구조: finish, restart, 하단 progress line
2. 주행 감각: 고속 조향, 코너 속도 손실, 실제 로그 분석
3. 엔진 감각: 차량별 RPM/기어/토크 곡선과 fuel cut
```

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

![Apex Seoul black blue downhill progress](/images/posts/202607/apex-seoul-black-blue-downhill-progress.png)

## 한 번 내려오는 코스로 만들기

이전까지 Apex Seoul의 도로는 사실상 반복되는 테스트 트랙에 가까웠다.

`camera.z`가 계속 증가하고, 트랙 끝을 넘으면 다시 감기는 구조였다. 커브, 고저차, 차량 anchor를 검증하기에는 편했다. 하지만 게임으로 보면 "어디까지 왔는지"가 잘 보이지 않았다.

다운힐 게임이라면 한 판의 방향이 있어야 한다.

그래서 이번에는 코스를 순환 트랙이 아니라 단방향 run으로 바꿨다.

```text
start -> checkpoint 1 -> checkpoint 2 -> checkpoint 3 -> finish
```

finish에 도달하면 run이 끝나고, `R`을 누르면 처음부터 다시 시작한다.

여기서 중요한 결정을 하나 했다.

체크포인트를 도로 위에 세우지 않았다.

처음에는 도로 위 체커 밴드나 overhead gate를 생각했다. 하지만 지금 Apex Seoul은 pseudo 3D projection, 차량 anchor, 그림자, 도로 고저차를 계속 맞추는 중이다. 이 단계에서 월드 오브젝트처럼 보이는 체크포인트를 세우면, 표식이 도로에 붙어 보이지 않는 문제가 더 크게 보일 수 있다.

그래서 1차 체크포인트는 화면 하단 progress line의 tick으로만 표시했다.

```text
하단 라인:
start tick / checkpoint ticks / finish tick / player progress dot
```

게임 월드 안의 표식보다, HUD 쪽의 진행감부터 안정시키는 쪽을 택한 셈이다.

## 그래픽 방향도 다시 고정했다

이 작업을 하는 동안 그래픽 방향도 한 번 더 정리했다.

최종 목표는 밝은 낮 도로가 아니라, **black/blue dreamlike Seoul downhill**이다.

기존 POC 이미지에는 흰색, 실버, 노란 표지판, 낮 하늘이 많이 섞여 있었다. 하지만 최종 방향은 조금 다르다.

```text
black / deep blue body
blue reflection
night downhill
far city lights
dark road surface
cool speed streak
```

이 방향은 차량 sprite에도 영향을 준다.

FT86 기반 Raven Coupe도 기본 후보는 밝은 실버가 아니라 blue/black 계열로 두었다. 아직 최종 asset은 아니지만, 화면에서 차량과 도로가 같은 세계에 있는 것처럼 보이려면 색 방향을 빨리 정해두는 편이 낫다.

이번 빌드에서는 런타임 배경도 이 방향으로 한 번 더 맞췄다. 하늘과 산은 거의 black에 가까운 navy로 누르고, 도로 엣지와 중앙선, 진행 라인은 차가운 blue 계열로 통일했다. 목표는 낮 트랙의 선명함이 아니라, 밤에 북악 능선을 내려오는 듯한 어두운 속도감이다.

![Apex Seoul downhill RPM runtime](/images/posts/202607/apex-seoul-downhill-rpm-fuelcut-runtime.png)

## 고속인데 너무 잘 꺾였다

코스 진행 구조를 넣고 실제로 60초 로그를 찍어보니, 다음 문제가 보였다.

속도는 충분히 빠르다.

하지만 고속인데도 핸들링이 너무 쉽게 꺾이는 느낌이 있었다.

초기 로그에서는 평균 speed가 `710u` 이상까지 올라갔고, 내부 속도만 보면 이미 빠르게 내려가고 있었다. 그런데 화면에서는 고속의 묵직함보다, 차량이 가볍게 좌우로 틀어지는 감각이 먼저 보였다.

그래서 최고속을 올리기보다 고속 조향을 눌렀다.

```text
highSpeedSteerForceDrop: 0.42 -> 0.62
highSpeedSteerVisualDrop: 0.38 -> 0.48
curveSteeringHighSpeedDrop: 0.38 -> 0.48
highSpeedInputResponseDrop: 0.35 추가
highSpeedSteeringSlewRate: 4.2 추가
highSpeedLateralVelocityCap: 56 추가
```

여기서 물리 조향과 시각 조향을 분리한 것이 중요했다.

`player.steering`은 여전히 입력과 물리 상태를 나타낸다. 하지만 sprite frame, rotation, shadow offset은 별도의 `visualSteering`을 사용하게 했다.

고속일수록 `visualSteering`을 압축하고, pose 전환 threshold도 높였다.

```text
raw steering: 물리/입력 상태
visual steering: 차량 sprite와 shadow에 쓰는 표시 상태
```

이렇게 해야 차는 실제로 조작되지만, 화면에서는 고속 grip이 과하게 비틀려 보이지 않는다.

![Apex Seoul high speed grip angle before after](/images/posts/202607/apex-seoul-high-speed-grip-angle-before-after.png)

## 코너에서는 속도가 떨어져야 한다

그 다음 피드백은 더 직접적이었다.

고속 코너인데 속도가 너무 잘 유지됐다.

다운힐 게임에서 코너링은 단순히 방향을 바꾸는 입력이 아니다. 진입 속도, 라인, 조향량이 모두 비용이 되어야 한다. Initial D 계열 감각을 떠올리면, 직선에서 속도를 얻고 코너에서 그 속도를 얼마나 덜 잃는지가 리듬이 된다.

그래서 코너 속도 손실을 다시 넣었다.

```text
cornerAccelSpeedDrop: 100 -> 190
cornerSpeedPull: 120 -> 210
steeringSpeedScrub: 64 추가
steeringSpeedScrubThreshold: 0.22 추가
highSpeedSteerWeakThreshold: 0.30 -> 0.34
```

핵심은 두 가지다.

강한 커브에서는 최고 가속 속도 상한을 낮춘다.

그리고 고속에서 조향을 많이 넣으면 steering scrub으로 추가 속도 손실을 준다.

이후 실제 플레이 로그에서는 이런 값이 나왔다.

```text
speed avg: 675.868u
speed min/max: 387.883 / 760u
speedDropFromPeak: 121.184u
lateralOffsetRms: 30.710

straight avg speed: 605.055u
mild curve avg speed: 736.157u
corner avg speed: 698.192u
hard corner avg speed: 644.663u
```

하드 코너 평균 속도가 `644.663u`까지 내려왔다.

처음 목표로 생각했던 `660~690u`보다도 낮다. 그래서 이 시점에서는 코너 감속을 더 키우기보다, HUD가 이 감속을 플레이어에게 제대로 말해주는 쪽이 중요해졌다.

![Apex Seoul handling simulation log](/images/posts/202607/apex-seoul-handling-sim-log.png)

## 속도계가 속도를 설득해야 한다

여기서 다시 속도계 문제가 나왔다.

내부 speed는 world unit이다.

하지만 플레이어가 보는 것은 km/h, RPM, 기어, 부스트 같은 계기판 정보다.

단순히 내부 speed를 선형 변환하면 애매했다.

그래서 표시 속도는 차량별 `displayTopSpeedKmh`를 기준으로 smoothstep 변환을 사용했다.

```ts
displaySpeedKmh = smoothstep(speed / accelSpeed) * displayTopSpeedKmh;
```

FT86 기반 Raven Coupe는 이렇게 잡았다.

```text
displayTopSpeedKmh: 205
```

즉 내부 speed가 최고속 `760u`에 가까워질 때 표시 속도는 약 `205km/h` 근처로 간다.

낮은 속도에서는 숫자가 조금 빠르게 올라가고, 고속에서는 숫자 상승이 둔해진다. 그래서 180km/h 이후의 긴장감은 숫자보다 RPM, FOV, speed cue, road object flow가 맡게 된다.

## 차량별 엔진 프로필을 만들었다

속도계만으로는 부족했다.

차량이 달라지면 RPM 움직임도 달라져야 한다.

그래서 `engineProfile.ts`를 새로 만들고, 차량별 drivetrain profile을 분리했다.

```text
games/apex-seoul/src/game/engineProfile.ts
```

현재 준비한 프로필은 세 가지다.

```text
Raven Coupe / FT86 inspired
- induction: NA
- gears: 6
- maxRpm: 7800
- displayTopSpeedKmh: 205
- character: 고회전, 즉답성, 리듬감

Vortex GT / Stinger inspired
- induction: Twin Turbo
- gears: 8
- maxRpm: 7000
- displayTopSpeedKmh: 230
- character: 중후한 차체 + 고속에서 크게 살아나는 부스트

Apex S / Genesis Coupe inspired
- induction: Single Turbo
- gears: 6
- maxRpm: 7200
- displayTopSpeedKmh: 215
- character: 터보랙 이후 중속 토크가 두껍게 붙는 가속
```

이번 구현에서 실제 기본 차량은 FT86 기반 Raven Coupe다.

나머지 두 차량은 아직 정식 런타임 차량은 아니지만, 같은 구조에 바로 꽂을 수 있도록 먼저 프로필을 만들어두었다.

이제 `PlayerVehicleState`에는 이런 값이 들어간다.

```ts
type PlayerVehicleState = {
    gearIndex: number;
    rpm: number;
    torqueScale: number;
    engineTorqueScale: number;
    boostRatio: number;
    fuelCutActive: boolean;
    fuelCutTimer: number;
};
```

아직 원형 타코미터 그래픽은 넣지 않았다.

대신 텍스트 HUD와 telemetry에 먼저 노출했다.

```text
speed 205 km/h (760u) | gear 6 | rpm 7750 | torque 0.85 | boost 0.00 | fuel cut on
```

![Apex Seoul RPM HUD night](/images/posts/202607/apex-seoul-rpm-hud-night.png)

화려한 계기판을 먼저 그리면 보기에는 좋다.

하지만 이 단계에서는 로그에 찍히는 값이 먼저 맞아야 한다. 그래야 다음에 원형 tachometer, gear number, boost bar를 붙일 때 어떤 값이 이상한지 알 수 있다.

## 토크 그래프는 normalized curve로 시작했다

실차 엔진 스펙을 그대로 복제하지는 않았다.

Apex Seoul의 내부 speed는 실제 물리 단위가 아니고, 목표도 시뮬레이터가 아니라 아케이드 다운힐이다. 그래서 절대 토크 Nm 대신 `torqueScale` 곡선을 만들었다.

Raven Coupe의 NA 토크 곡선은 이렇게 시작한다.

```text
1000 rpm -> 0.28
2500 rpm -> 0.42
4000 rpm -> 0.62
5500 rpm -> 0.82
6800 rpm -> 1.00
7400 rpm -> 0.95
7800 rpm -> 0.78
```

터보 차량은 나중에 `boostRatio`를 이용한다.

```text
Single Turbo:
- boost starts: 3600+
- boost peak: 5000~6500

Twin Turbo:
- small boost: 2800+
- main boost: 5200+
```

NA 차량은 boost UI가 없다.

대신 RPM 바늘이 빠르게 치고 올라가고, redline 근처에서 fuel cut bounce가 짧게 보여야 한다.

## fuel cut이 안 터졌다

여기서 재미있는 버그가 하나 나왔다.

fuel cut을 구현했는데, 실제 로그에서는 한 번도 켜지지 않았다.

처음에는 코드가 안 도는 줄 알았다.

하지만 로그를 보니 이유가 달랐다.

```text
fuelCutStartRpm: 7800
redlineStartRpm: 7200
max observed rpm: 7667
fuelCutActive samples: 0
rpm >= 7800 samples: 0
rpm >= 7200 samples: 138
```

즉 fuel cut 로직은 있었지만, RPM이 거기까지 닿지 못했다.

이유는 6단 설정이었다.

```text
6th rpmMax: 7200
throttleLift: +240
theoretical max: 7440
```

최고속에서도 6단 RPM이 7400대에서 멈췄다.

FT86 기반 NA 고회전 차량이라면, 최고속 근처에서 레드존 끝까지 바늘이 붙는 편이 더 재미있다. 그래서 6단 rpmMax를 열고, fuel cut 진입점을 조금 낮췄다.

```text
6th rpmMax: 7200 -> 7800
fuelCutStartRpm: 7800 -> 7750
fuelCutReturnRpm: 7350 유지
```

그리고 fuel cut이 켜져 있는 동안에는 target RPM을 `fuelCutReturnRpm` 쪽으로 당겼다.

이렇게 해야 단순히 `fuelCutActive = true`가 되는 것이 아니라, 실제로 RPM 바늘이 짧게 내려왔다가 다시 붙는 bounce가 생긴다.

짧은 시뮬레이션에서는 이렇게 확인됐다.

```text
first fuel cut: 약 745.9u / 6단
max rpm: 약 7755rpm
fuel cut 이후 0.4초 내 최저 rpm: 약 7508rpm
```

이제 로그상으로도 fuel cut이 도달 가능한 상태가 되었다.

## 이번 작업에서 남긴 것

이번 작업은 화면에 큰 새 기능이 생긴 것처럼 보이지 않을 수 있다.

하지만 게임 구조 쪽에서는 꽤 중요한 선을 넘었다.

이제 Apex Seoul에는 다음 상태가 있다.

```text
한 번 내려오는 코스 진행
하단 progress line checkpoint
finish / restart
고속 visual steering 압축
코너 속도 손실
차량별 engine profile
gear / rpm / torque / boost / fuel cut telemetry
```

특히 엔진 프로필은 앞으로 차량 선택과 바로 연결된다.

Raven Coupe는 NA 고회전 입문차다.

Vortex GT는 트윈터보 GT다.

Apex S는 싱글터보 스포츠 쿠페다.

세 차량은 최고속만 다르게 느껴지면 안 된다.

언제 RPM이 살아나는지, 언제 boost가 차는지, fuel cut을 맞았을 때 손실이 얼마나 큰지까지 달라야 한다.

이번 구현은 그 차이를 만들기 위한 바닥 공사다.

![FT86 retro color variants](/images/posts/202607/apex-seoul-ft86-retro-color-variants.png)

## 마치며

지난 글에서는 Apex Seoul의 주행 감각을 로그로 보기 시작했다.

이번에는 그 로그를 바탕으로 한 번 더 아래로 내려갔다.

코스는 한 판의 다운힐 런이 되었고, 체크포인트는 도로 위 표식이 아니라 하단 진행 라인으로 들어갔다. 고속 조향은 더 묵직해졌고, 코너에서는 속도가 실제로 떨어지기 시작했다.

그리고 속도계/RPM은 이제 단순 디버그 숫자가 아니라 차량 성격을 말할 준비를 시작했다.

아직 다음 작업이 남아 있다.

원형 tachometer를 그리고, gear number를 크게 보여주고, 터보 차량에는 boost bar를 붙여야 한다. fuel cut도 지금은 텍스트와 로그에 먼저 드러나는 상태라, 실제 HUD와 사운드/이펙트로 옮겨야 한다.

하지만 이번 지점에서 한 번 끊고 가는 것이 맞다.

이제 Apex Seoul은 "차가 도로에 붙어 보이는 실험"에서 조금 더 나아가, "한 대의 차가 한 코스를 내려오는 게임"에 가까워졌다.
