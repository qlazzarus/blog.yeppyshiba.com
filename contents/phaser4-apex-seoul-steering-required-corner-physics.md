---
title: 코너에서 핸들을 놓았는데 차가 도로를 따라갔다 - 자동 추종을 걷어낸 기록
date: 2026-07-24T14:20:00+09:00
summary: Apex Seoul의 무입력 차량이 코너를 따라가던 원인을 road-relative 좌표와 passive yaw에서 찾고, world heading 기반 횡이동, 조향 sprite 분리, 가드레일 contact lifecycle과 코너 출구 회전 제한으로 조향이 필요한 코너를 다시 만들었습니다.
image: /images/posts/202607/apex-seoul-corner-inertia-no-input.png
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

## 코너인데 액셀만 밟아도 지나갔다

[지난 글](/article/phaser4-apex-seoul-corner-flow-longitudinal-scale/)에서는 `225km/h`라는 숫자와 실제 도로 진행 속도를 분리했다.

물리 속도와 구동계는 유지하고, 월드 진행에 `longitudinalScale=2`를 적용했다. 코너와 가드레일이 화면을 통과하는 속도는 확실히 좋아졌다.

그런데 직접 주행하다가 더 큰 문제를 발견했다.

왼쪽으로 꺾이는 코너에서 액셀만 계속 밟고 있었는데 차가 오른쪽 가드레일을 향하지 않았다. 도로 중앙 부근을 유지한 채 코너를 따라갔다.

타임 어택 게임으로 보면 치명적인 문제였다.

```text
감속하지 않아도 된다.
turn-in 지점을 고를 필요가 없다.
grip과 drift의 차이를 배울 이유가 없다.
```

우리가 만들려던 것은 앞으로 달리는 화면이 아니었다. 코너를 얼마나 빠르게 통과할지 판단하고, grip으로 정교하게 가거나 drift로 다른 line을 선택하는 게임이었다.

그래서 기존 핸들링 승인을 다시 열었다.

[Apex Seoul 데모 보기](/games/apex-seoul/)

<div style="position: relative; width: 100%; height: min(70vh, 560px); margin: 24px 0;">
    <iframe
        src="/play/apex-seoul/"
        title="Apex Seoul"
        loading="lazy"
        style="position: absolute; inset: 0; width: 100%; height: 100%; border: 1px solid #26343c; border-radius: 8px; background: #101316;"
    ></iframe>
</div>

![왼쪽 코너에서 무입력 차량이 world heading을 유지하며 도로 바깥쪽으로 진행하는 최신 디버그 화면](/images/posts/202607/apex-seoul-corner-inertia-no-input.png)

*차량은 화면 중앙에 고정된 카메라 anchor가 아니라 도로 기준 `offset`으로 움직인다. 위 화면의 `car offset -438`과 rail contact cue는 무입력 직진이 코너 바깥쪽 위험으로 이어지는지 확인하기 위한 값이다.*

---

## `lateralOffset = 0`은 월드의 직진이 아니었다

처음에는 차량의 횡위치 `lateralOffset`을 그대로 유지하면 직진이라고 생각했다.

하지만 이 값은 월드의 고정 X 좌표가 아니었다. 매 프레임 달라지는 도로 중심을 기준으로 한 상대 위치였다.

```text
lateralOffset = 0
  = 월드에서 같은 방향으로 직진
  X

lateralOffset = 0
  = 현재 도로 중앙에 계속 붙어 있음
  O
```

도로가 왼쪽으로 돌아도 `0`을 유지하면 차량도 왼쪽으로 이동한 도로 중심을 따라간다. 코드상 횡이동이 없지만 플레이 결과는 자동 코너링이었다.

여기에 코너 곡률을 미리 읽어 차량 heading을 바꾸는 passive yaw까지 있었다. 위치와 방향이 모두 도로를 따라가는 쪽으로 작동했다.

그래서 “코너에서 바깥으로 밀리는 힘을 더한다”만으로는 해결되지 않았다. 먼저 어떤 좌표가 직진을 뜻하는지 다시 정의해야 했다.

![193km/h에서 도로 곡률과 차량 offset, line, steering 상태를 함께 보던 이전 runtime 캡처](/images/posts/202607/apex-seoul-corner-flow-runtime.png)

*이전 글에서 속도감을 확인할 때 사용한 캡처를 다시 보면 `line`, `car offset`, `steer`가 한 화면에 있다. 당시에는 화면 흐름을 봤지만, 이번에는 같은 디버그 값으로 “입력이 없는데 누가 차를 돌리는가”를 추적했다.*

---

## 고정 곡률 테스트가 실제 코너를 대신하지 못했다

기존 자동 검사는 일정한 곡률을 몇 초 동안 유지했다. 이 조건에서는 바깥쪽 관성이 충분히 쌓였다.

하지만 실제 코스는 달랐다.

- 진입에서 곡률이 올라간다.
- apex 부근에서 짧게 유지된다.
- 출구에서 다시 풀린다.
- U2 진행 배율 때문에 같은 코너에 머무는 시간도 짧아졌다.

고정 곡률 `3초` 검사는 통과했지만 production 코너의 실제 체류 시간에서는 횡관성이 충분히 작용하지 않았다. 게다가 속도×곡률 기반 자동 감속이 먼저 차를 낮은 속도로 만들면, 바깥 궤적이 생기기도 전에 안전한 line이 만들어졌다.

이후부터는 테스트 방식을 바꿨다.

```text
production track에서 강한 코너 자동 탐색
  → 각 코너를 독립된 시작점으로 고정
  → 120 / 160 / 185km/h로 각각 실행
  → throttle 유지, steering = 0
  → 첫 이동 방향, shoulder, rail, impact 기록
```

현재 검사는 좌우 강코너 `8개 × 3속도`, 총 `24개` 분기를 매번 실행한다.

![무입력, 능동 조향, 가드레일 접촉의 새 게임 규칙을 요약한 다이어그램](/images/posts/202607/apex-seoul-steering-required-contract.svg)

---

## 도로가 아니라 차량의 world heading으로 움직인다

핵심 수정은 passive curve force를 더 약하게 만드는 것이 아니라 제거하는 것이었다.

차량은 이제 현재 접지점의 도로 방향과 자신의 world heading 차이를 상태로 가진다.

```text
relativeHeading
  = vehicleWorldHeading - roadHeadingAtContact

lateralVelocity
  = worldTravelSpeed × sin(relativeHeading)
```

왼쪽 코너가 시작됐는데 핸들을 돌리지 않으면 차량의 world heading은 그대로다. 반면 도로 heading은 왼쪽으로 변한다. 두 방향의 차이가 커지고 차량은 road-relative 좌표에서 오른쪽, 즉 코너 바깥쪽으로 이동한다.

이것이 원했던 규칙이다.

```text
무입력
  → world heading 유지
  → 코너 바깥쪽 rail 위협

prepared grip
  → 진입 전 감속
  → turn-in
  → 작은 slip으로 line 유지

drift
  → 더 큰 yaw와 횡속도
  → counter steer와 recovery 필요
```

자동 corner speed loss도 없애지는 않았다. 타이어가 버틸 수 없는 속도에서는 손실이 있어야 한다. 다만 full brake의 `20%`보다 커지지 않게 제한했다. 자동 감속이 플레이어 대신 안전한 주행선을 만드는 것을 막기 위해서다.

---

## 코너가 꺾인다고 sprite가 혼자 꺾이면 안 된다

물리 궤적을 고친 뒤에는 새로운 시각 회귀가 나타났다.

입력이 없는데도 차량 sprite가 좌우 조향 pose로 바뀌었다. 물리적으로는 world heading을 유지하면서 도로 바깥으로 나가고 있었지만, 화면에서는 운전자가 코너를 따라 핸들을 돌리는 것처럼 보였다.

원인은 road-relative heading을 sprite에도 사용한 것이었다.

이를 분리했다.

```text
vehicleHeadingError
  → 궤적, 충돌, telemetry

physicalSteeringCommand
  → grip sprite 방향
```

raw input이 들어오면 physical command가 즉시 `1`로 점프하지 않고 짧게 올라간다. 반대로 입력을 놓으면 command가 중립으로 돌아온다. sprite는 이 command를 표현한다.

자동 검사에서 유효 command와 sprite 방향 불일치는 `0건`, 입력 해제 뒤 settled pose 최대값은 `0.0002`였다. 무입력 왼쪽 코너에서는 heading error와 lateral offset이 커져도 body pose는 `0`을 유지한다.

차가 미끄러지는 방향과 운전자가 핸들을 돌린 방향은 같은 정보가 아니다.

---

## 가드레일 한 번 접촉이 11번 충돌로 기록됐다

무입력 차량이 바깥 rail에 닿기 시작하자 또 다른 문제가 보였다.

같은 가드레일에 계속 붙어 있는 동안 충돌 cooldown이 끝날 때마다 새 impact가 발생했다. 코너 하나에서 `4~11회`의 bounce와 heading damping이 반복됐다.

이것은 충돌이 아니라 핀볼에 가까웠다. 한 번 바깥으로 나간 차량이 반복 impulse 때문에 반대 방향으로 발사되는 감각도 만들었다.

충돌을 시간 간격이 아니라 접촉 생명주기로 바꿨다.

```text
clear
  → enter : bounce, heading damping, speed loss 1회
  → stay  : rail clamp와 접촉 마찰만 적용
  → exit  : 충분히 안쪽으로 이탈하면 재무장
```

현재 production `185km/h` 무입력 검사에서는 강코너 `8개` 모두 예상 바깥 rail에 먼저 닿고, 같은 rail impact는 전부 `1회`, 반대 rail 재충돌은 `0회`다.

![가드레일의 화면 위치와 차량 접점을 맞춘 이전 충돌 검증 화면](/images/posts/202607/apex-seoul-physics-screen-space-rail-projection-final.png)

*화면상 rail boundary를 맞춘 이전 캡처를 재사용했다. 당시에는 “어디서 닿는가”가 문제였고, 이번에는 같은 접촉을 “몇 번의 사건으로 셀 것인가”가 문제였다.*

---

## 조향을 요구하되 코너 출구에서 반대편으로 던지지 않는다

가드레일 반복 impulse를 없앤 뒤에도 코너 출구에서 차가 반대편으로 과하게 넘어가는 경우가 남았다.

이번에는 충돌이 원인이 아니었다.

바깥쪽 heading debt를 없애려고 코너 방향으로 계속 조향하면 road-aligned 지점을 지난 뒤에도 같은 방향 회전이 쌓였다. drift에서는 heading steering과 slip 횡속도가 함께 작동해 이 현상이 더 컸다.

그래서 코너 안쪽 heading의 **증가량**만 제한했다.

```text
grip allowance : 0.06 rad
drift allowance: 최대 0.18 rad
```

중요한 것은 차를 도로 방향으로 되돌리는 clamp가 아니라는 점이다.

- 이미 큰 heading을 가진 차를 한 프레임에 당기지 않는다.
- neutral input에서는 동작하지 않는다.
- counter steer를 막지 않는다.
- 직선에서 계속 조향하면 차량은 계속 회전한다.
- drift의 slip과 횡속도도 그대로 유지한다.

좌우 대칭 drift exit 자동 검사에서 최대 inside heading은 `0.179rad`였고, 직선 full steer는 `1초` 뒤 `0.635rad`까지 정상적으로 회전했다.

---

## 다른 레이싱 게임에도 공통적인가

특정 게임의 물리식을 그대로 복제할 필요는 없다. 하지만 레이싱 게임이 성립하려면 다음 관계는 공통적이다.

```text
코스가 돈다
≠ 차가 자동으로 돈다

속도가 높다
→ 같은 조향으로 원하는 line을 유지하기 어려워진다

접지 한계를 넘는다
→ understeer, slip, 속도 손실 또는 충돌 위험이 생긴다
```

아케이드 게임은 이 현상을 실제 차량보다 읽기 쉽게 과장하거나 회복을 빠르게 만들 수 있다. 그래도 플레이어의 감속·turn-in·counter steer 선택을 없애면 코너는 게임 규칙이 아니라 배경 애니메이션이 된다.

아래 이미지는 이번 물리 수치의 근거가 아니라, 같은 pseudo 3D 계열 게임이 코너를 읽게 하는 화면 요소를 보기 위해 이전 조사에서 사용한 공식 스크린샷이다.

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 24px 0;">
    <figure style="margin: 0;">
        <img src="/images/posts/202607/horizon-chase-turbo-official-screenshot.jpg" alt="Horizon Chase Turbo 공식 스크린샷" loading="lazy" />
        <figcaption style="font-size: 0.9em; opacity: 0.78; margin-top: 8px;">Horizon Chase Turbo 공식 Steam 스크린샷. 차량, 경쟁차, 차선과 roadside가 코너 방향을 함께 읽게 한다. <a href="https://store.steampowered.com/app/389140/Horizon_Chase_Turbo/">출처: Steam</a></figcaption>
    </figure>
    <figure style="margin: 0;">
        <img src="/images/posts/202607/slipstream-official-screenshot.jpg" alt="Slipstream 공식 스크린샷" loading="lazy" />
        <figcaption style="font-size: 0.9em; opacity: 0.78; margin-top: 8px;">Slipstream 공식 Steam 스크린샷. 노면과 차선의 흐름이 빠른 코너 판단을 돕는다. <a href="https://store.steampowered.com/app/732810/Slipstream/">출처: Steam</a></figcaption>
    </figure>
</div>

---

## 현재 자동 검사 결과

최종 기준선은 다음과 같다.

| 계약 | 결과 |
| --- | ---: |
| production 무입력 코너 | `24 / 24` 바깥쪽 첫 이동 |
| 185km/h 강코너 | `8 / 8` 예상 바깥 rail 접촉 |
| 같은 rail 반복 impact | 코너당 `4~11회 → 1회` |
| 반대 rail 재충돌 | `0회` |
| world-line cornering | `7 / 7 PASS` |
| grip trajectory / sprite | `8 / 8 PASS` |
| drift exit inside heading | 좌우 최대 `0.179rad` |
| production diagnosis / gameplay | `14 / 14`, `6 / 6 PASS` |

자동 검사의 목적은 재미를 판정하는 것이 아니다. “입력이 없는데 차가 코너를 따라간다”, “한 번의 접촉이 여러 번의 충돌이 된다”처럼 명백히 잘못된 후보를 다시 들이지 않는 데 있다.

---

## 아직 20% 정도는 아쉽다

이번 단계로 핵심 규칙은 복구됐다.

핸들을 놓으면 차는 코너를 자동으로 따라가지 않는다. 과속 무입력 차량은 바깥 rail을 향한다. grip sprite는 실제 조향 command를 보여주고, 가드레일은 한 번의 접촉에서 한 번만 차를 튕긴다.

다만 직접 주행한 감각은 아직 약 `20%` 정도 아쉽다.

남은 후보는 두 가지다.

1. 일부 코너의 turn-in과 apex 유지 시간이 너무 짧은 코스 디자인 문제
2. grip과 drift의 line·exit speed 차이가 실제 section time에 얼마나 남는지의 문제

지금은 수치를 더 만지지 않고 HR-3K를 임시 기준선으로 동결했다. 다음 단계에서는 먼저 countdown, timed run, checkpoint split, result와 best record를 만든다.

기록을 비교할 수 있게 된 뒤 같은 코너에서 `무입력 / prepared grip / drift`의 section time을 나란히 보면, 남은 문제가 물리인지 코스인지 더 정확하게 분리할 수 있다.

코너링을 완성했다고 선언하기보다, 다음 판단이 가능해지는 게임 loop를 먼저 만드는 쪽을 선택했다.
