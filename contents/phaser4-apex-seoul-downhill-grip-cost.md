---
title: Phaser 4 Pseudo 3D 레이싱 게임 - 내리막 고속 grip에 비용을 만드는 법
date: 2026-07-14T06:00:00+09:00
summary: Apex Seoul에서 200km/h grip 주행이 너무 쉽게 느껴진 이유를 주행 로그로 분해하고, 코스 곡률을 바꾸지 않은 채 하향 코너 속도 예산·understeer·안전 여유 비용·자동 검증으로 다운힐의 선택을 만들었습니다.
image: /images/posts/202607/apex-seoul-night-downhill-grip-hero.png
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

## 200km/h로 돌아도 되는 코너는 코너가 아니었다

[지난 글](/article/phaser4-apex-seoul-drift-state-telemetry/)에서는 브레이크로 드리프트에 들어가고, 카운터와 엑셀로 그 각을 제어하는 상태기를 만들었다.

드리프트는 어느 정도 손에 잡혔다.

그 다음에 보인 문제는 반대편이었다.

```text
드리프트를 쓰지 않아도,
다운힐에서 액셀을 계속 밟고
거의 최고속으로 코너를 통과할 수 있다.
```

그 자체가 버그는 아니다. OutRun 계열의 즐거움에는 빠른 흐름이 있다. 하지만 Apex Seoul의 코너가 플레이어에게 속도를 준비할지, 바깥으로 흐를지, 드리프트를 쓸지 묻지 못한다면 그 흐름은 너무 평평해진다.

이번 작업의 목표는 코스를 갑자기 더 급하게 만들거나, 모든 코너에 강제 감속을 거는 일이 아니었다. 이미 있는 도로에서 **내리막으로 얻은 속도는 다음 코너에서 갚아야 한다**는 관계를 만드는 일이었다.

[Apex Seoul 데모 보기](/games/apex-seoul/)

<div style="position: relative; width: 100%; height: min(70vh, 560px); margin: 24px 0;">
    <iframe
        src="/play/apex-seoul/"
        title="Apex Seoul"
        loading="lazy"
        style="position: absolute; inset: 0; width: 100%; height: 100%; border: 1px solid #26343c; border-radius: 8px; background: #101316;"
    ></iframe>
</div>

![같은 sharp 코너에서 level, downhill full throttle, prepared grip을 비교한 최신 자동 측정 차트](/images/posts/202607/apex-seoul-downhill-grip-cost-matrix.png)

## 먼저, 고속이라는 말을 수치로 나눴다

처음에는 단순히 “200km/h가 너무 빠르다”고 느꼈다. 하지만 주행 로그를 보면 이 문장은 물리와 화면 표시를 섞고 있다.

60초 drive telemetry에서 Raven Coupe의 최고 표시 속도는 `205km/h`, 상위 10%는 `202.7km/h`, 평균은 `180.3km/h`였다. 다만 `190km/h` 이상 sample은 sharp 코너에는 없었다. 대부분 easy bend, straight, 일부 medium에 있었다.

sharp 구간만 따로 보면 평균은 `165.3km/h`, 최고는 `189.0km/h`였다. sharp의 표시 speed budget은 약 `129.5km/h`였고, 과속 understeer는 최대 `1.0`까지 올라갔다.

따라서 문제는 단순한 최고속 제한이 아니었다.

```text
straight / easy : 빠르게 달릴 보상이 필요하다.
medium / sharp : 같은 속도를 다음 구간까지 가져가면 비용이 필요하다.
HUD             : 물리 감각보다 과장된 숫자로 읽히면 안 된다.
```

이 분리는 중요하다. 최고속만 낮추면 쉬운 구간의 보상도 같이 사라진다. 반대로 숫자만 낮추면 코너에서 공짜로 버티는 문제는 남는다.

## 정답 apex를 만들지 않았다

처음 떠오를 수 있는 해결은 “최선의 레이싱 라인을 벗어나면 감점”이다. 하지만 그 방식은 Apex Seoul에 맞지 않았다.

아직은 pseudo 3D 도로의 원근과 차량 anchor를 다듬는 단계다. 특정 offset을 정답으로 고정하면, 플레이어는 코너를 읽기보다 보이지 않는 채점선을 외우게 된다.

그래서 기준을 바꿨다.

```text
정답 apex를 지났는가?       -> 묻지 않는다.
현재 속도로 도로 여유를 쓰는가? -> 묻는다.
```

`cornerSpeedBudget`을 easy / medium / sharp별로 계산하고, 액셀과 실제 조향 입력을 유지한 채 budget을 넘을 때만 grip understeer를 쌓았다. understeer는 두 가지 결과를 만든다.

1. 고속일수록 grip 조향 여유가 줄어든다.
2. 차는 커브 바깥 방향으로 짧은 횡운동을 쌓아, 같은 핸들 입력으로 더 큰 반경을 그린다.

핸들을 무겁게 만드는 것만으로는 부족했다. 플레이어는 “입력이 죽었다”고 느끼기 쉽다. 바깥으로 조금 흐르는 결과가 함께 있어야 “이 속도로 들어와서 차가 넓게 나갔다”고 읽힌다.

![최신 blue Raven runtime: 고속 grip에서도 차량은 도로 하단의 읽기 쉬운 기준점으로 남는다](/images/posts/202607/apex-seoul-road-relative-downhill.png)

Need for Speed의 handling 문서도 grip과 drift를 한 축의 설정으로 다루면서, 고속에서의 조향 범위와 안정성이 체감을 바꾼다고 설명한다. 여기서 참고한 것은 특정 수치가 아니라, 고속의 위험을 단순 감속 대신 차량 반응으로 전달한다는 원칙이다. [EA의 Handling Tips & Tricks](https://www.ea.com/news/handling101)

## 내리막 가속은 직선 보너스가 아니라 코너의 빚이다

이전 구현에도 slope acceleration은 있었다. 내리막에서 차는 더 빨리 가속한다. 그러나 그 속도는 코너에 들어가는 순간 별도의 부담으로 바뀌지 않았다.

그래서 medium과 sharp에만 `downhillCornerCarryRatio`를 추가했다.

```ts
const downhillCarry = smoothstep(slopeAcceleration / 65);
const cornerBudget = baseCornerBudget * (1 - downhillCarry * 0.08);
```

의미는 단순하다.

- 직선의 downhill acceleration은 그대로 둔다.
- 내리막이 강할수록 technical corner의 유효 budget만 최대 8% 낮춘다.
- 이미 과속인 grip 코너에서만 추가 scrub을 건다.
- drift 상태와 counter 입력에는 이 grip 규칙을 섞지 않는다.

이렇게 하면 고저차가 화면의 배경 장식에 머물지 않는다. 내리막에서 얻은 속도는 다음 코너의 더 이른 lift, brake, 혹은 바깥 여유 사용으로 이어진다.

## 바깥 여유는 shoulder 직전부터가 아니었다

안전 여유 비용도 너무 늦게 시작하면 체감이 약하다.

차가 실제로 road shoulder에 닿은 뒤에만 감속하면, 플레이어는 여전히 최고속 grip이 된다고 느낀다. 이번에는 road width의 약 `16%`부터 safety margin을 쌓고, 약 `32%`에서 충분한 exit scrub이 보이게 했다.

중요한 제한도 뒀다.

```text
over-budget + accel hold + steer input + grip
```

이 조건이 겹칠 때만 비용이 생긴다. straight, neutral steering, 액셀 오프, drift에 상시 고무줄 같은 힘이 걸리지 않게 하기 위해서다.

이전에는 반대 조향을 주면 중앙 복귀 힘이 외측 이동을 상쇄해, 고속 grip이 오히려 편해 보이는 결함도 있었다. grip의 반대 조향은 별도의 counter-road 상태로 분리했다. 짧은 탭은 자세를 고치는 입력으로 남지만, 오래 유지하면 바깥 이동과 exit speed 손실이 누적된다.

## 사람의 느낌을 회귀 테스트로 바꿨다

이 작업에서 가장 큰 변화는 튜닝 값 하나가 아니었다. 같은 감각을 매번 다시 확인할 수 있게 된 점이다.

`qa:handling-sim`은 Phaser 화면을 띄우지 않고 controller만 직접 돌린다. 따라서 렌더링의 아름다움은 판정하지 못하지만, 속도·횡이동·understeer·drift 상태 관계는 빠르게 비교할 수 있다.

이번에 추가한 핵심 pair는 다음과 같다.

```text
level sharp full throttle
downhill sharp full throttle
downhill sharp prepared grip
```

최신 baseline의 결과는 이렇다.

| scenario                     | entry budget | entry over budget | outside excursion | exit speed |
| ---------------------------- | -----------: | ----------------: | ----------------: | ---------: |
| level sharp full throttle    |       448.4u |           +283.3u |            133.7u |     609.1u |
| downhill sharp full throttle |       412.5u |           +321.4u |            177.0u |     531.0u |
| downhill prepared grip       |       412.5u |           +111.4u |            164.1u |     533.8u |

downhill full-throttle은 level 대비 budget이 `35.9u` 낮고, 바깥 이탈은 `43.3u` 커지며, exit speed는 `78.2u` 낮다. 반대로 prepared grip은 full-throttle보다 entry over-budget을 `210.0u` 덜 남긴다.

여기서 중요한 것은 prepared grip이 “정답 라인”을 맞혀서 보상받은 것이 아니라는 점이다. 같은 road에서 속도를 준비했기 때문에 조향권과 여유를 되찾은 것이다.

```bash
npm run qa:handling-sim --workspace @games/apex-seoul
```

현재 baseline은 `93.9/100`이다. 남은 경고는 sharp brake recovery가 `900ms`로 목표 `800ms`보다 느린 한 항목이며, 이번 downhill 비용화의 실패는 아니다.

## 차량도 도로 폭에 맞춰 움직여야 했다

주행 감각을 다듬는 중에는 화면상 차량 크기도 무시할 수 없었다. 도로의 폭과 높낮이는 크게 변하는데 차량 폭이 고정이면, 차는 road 위를 달리기보다 HUD처럼 보인다.

그래서 차량 anchor 위치에서의 road width와 sprite body width를 telemetry로 남겼다.

```text
vehicleRoadRatio : vehicle body width / road width
sizeDeltaPerSec  : sprite width의 초당 변화량
```

첫 로그에서는 비율이 `48.6~64.6%`, 평균 `53.1%`였다. 이후 목표를 `54%`로 두고 response time과 dead zone을 넣었다. 자동 시뮬레이션은 ratio `51.5~60.8%`, 최대 크기 변화율 `71.3px/s`로 통과했다.

차를 도로 폭에 즉시 묶지는 않았다. 바로 따라가면 고저차마다 zoom하는 UI처럼 보이기 때문이다. pseudo 3D의 차량은 물리적으로 정확한 3D 모델이기 전에, 플레이어가 조작을 읽는 화면 기준점이기도 하다.

![level 구간의 road-relative vehicle scale: 도로 폭이 넓어도 차량이 HUD처럼 분리되지 않는다](/images/posts/202607/apex-seoul-road-relative-level.png)

## 속도계는 물리와 분리했다

마지막으로 숫자를 정리했다. 내부 `speed`는 world unit이고, HUD의 km/h와 동일하지 않다. 이번 로그에서 200km/h라는 표기가 감각보다 과장돼 보였지만, handling 자체는 이미 원하는 방향에 가까웠다.

그래서 Raven Coupe의 물리 최고속, 토크 곡선, 기어비는 건드리지 않고 표시 최고속만 `205 → 185km/h`로 재보정했다.

```text
기존 HUD 200km/h  -> 새 HUD 약 180km/h
기존 최고 205km/h -> 새 최고 185km/h
```

corner budget 표기도 같은 display curve를 공유한다. 플레이어가 보는 현재 속도와 “이 코너에서 준비해야 할 속도”가 서로 다른 단위를 말하지 않게 하기 위해서다. telemetry에는 이제 raw speed와 함께 `speedKmh`를 직접 기록한다.

![ridge 구간의 road-relative vehicle scale: 고저와 원근이 바뀌어도 차량 크기 변화는 부드럽게 제한된다](/images/posts/202607/apex-seoul-road-relative-uphill.png)

## 다음은 엔진을 더 크게 만드는 일이 아니다

차량마다 RPM torque curve, gear range, fuel cut, turbo spool은 이미 있다. 하지만 지금은 자동 변속이 매끈해서, powerband가 차량 성격으로 읽히는 정도는 아직 약하다.

다음 구현에서는 handling을 다시 흔들지 않고 아래만 별도로 다룰 예정이다.

- 짧은 shift torque cut과 RPM drop
- 자연흡기 Raven, turbo Vortex, single-turbo Apex S의 재가속 리듬 차이
- gear/RPM/torque/boost/shift telemetry
- 변속이 drift, understeer, corner budget을 바꾸지 않는 자동 검증

이 작업은 “더 빠른 차”를 만드는 일보다, 같은 downhill을 각 차량이 다른 호흡으로 내려오게 만드는 일에 가깝다.

## 마치며

이번에 얻은 결론은 단순하다.

> 속도감은 속도계 숫자 하나로 만들 수 없다. 내리막에서 얻은 속도가 다음 코너의 반경, 도로 여유, 탈출 속도에 남을 때 비로소 빠르게 느껴진다.

그래서 Apex Seoul은 코스를 먼저 더 어렵게 만들지 않았다. 현재 road와 차량 controller 사이의 관계를 먼저 수치화했다. 그 뒤에야 high-speed grip은 조금 덜 공짜가 되고, lift·brake·drift는 선택지가 되기 시작했다.

다음 글에서는 이 기준 위에 차량별 powerband와 변속의 리듬을 올려볼 생각이다.
