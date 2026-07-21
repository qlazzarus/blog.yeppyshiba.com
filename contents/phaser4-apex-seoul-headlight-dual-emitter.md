---
title: Phaser 4 Pseudo 3D 레이싱 게임 - 헤드라이트를 사다리꼴 하나에서 두 개의 광원으로 바꾸기
date: 2026-07-21T17:00:00+09:00
summary: Apex Seoul의 야간 헤드라이트가 조향과 고저차에서 어색해진 이유를 좌표계·차량 sprite pose·광원 합성으로 나눠 추적했습니다. camera 기준 cone, 단일 회전 사다리꼴, 과도한 중심 수렴, 잘못된 lift를 버리고 실제 램프 anchor에서 시작하는 dual-emitter와 terrain별 anchor QA로 정리한 기록입니다.
image: /images/posts/202607/apex-seoul-night-forest-headlights-hero.png
coverCredit: OpenAI image generation — article illustration
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - webgl
    - shader
    - pseudo-3d
    - rendering
    - racing-game
    - game-dev
---

## 밤길을 밝히는 일보다, 빛이 어디서 출발하는지가 어려웠다

[이전 글](/article/phaser4-apex-seoul-night-forest-headlights-ft86/)에서는 밤 숲과 도로의 어둠을 정리하면서, 차량 앞에 두 개의 눌린 타원 광원을 놓는 데까지 갔다.

정면에서는 충분히 그럴듯했다. 문제는 차가 좌우로 꺾일 때였다. 차체 sprite는 이미 측면 pose로 바뀌는데, 빛은 여전히 화면 위쪽을 향하거나 하나의 큰 회전 사다리꼴로 보였다. 내리막과 오르막에서는 광원 시작점이 차체보다 낮게 깔려 보이기도 했다.

```text
정면: 두 개의 빛이 보인다.
측면: 빛이 차와 다른 방향을 본다.
고저차: 빛의 시작점이 차체 아래에 붙는다.
```

이번 작업의 목표는 실차 조명 시뮬레이션이 아니었다. rear-view pseudo-3D 화면에서 플레이어가 다음 세 가지를 믿게 만드는 일이었다.

1. 빛은 차량의 실제 앞쪽 램프에서 나온다.
2. 차량이 향한 방향과 빛의 방향이 같다.
3. 고저차와 좌우 mirror가 바뀌어도 빛의 시작점이 차체에서 떠나지 않는다.

[Apex Seoul 데모 보기](/games/apex-seoul/)

<div style="position: relative; width: 100%; height: min(70vh, 560px); margin: 24px 0;">
    <iframe
        src="/play/apex-seoul/"
        title="Apex Seoul"
        loading="lazy"
        style="position: absolute; inset: 0; width: 100%; height: 100%; border: 1px solid #26343c; border-radius: 8px; background: #101316;"
    ></iframe>
</div>

![이 글의 장면 목표를 설명하기 위해 제작한 콘셉트 이미지. 실제 게임 캡처가 아니다.](/images/posts/202607/apex-seoul-night-forest-headlights-hero.png)

_이 삽화는 구현 목표를 설명하기 위한 제작 이미지다. 아래의 matrix와 개별 장면은 실제 런타임 캡처다._

## 처음에는 빛의 모양부터 고치려 했다

가장 처음의 접근은 단순했다. 도로 위에 사다리꼴 cone을 그리고, 더 밝게 하거나 더 넓게 하면 야간 주행처럼 보일 것이라고 생각했다.

하지만 cone은 camera near-plane에서 시작하고, 차량 sprite는 road contact anchor에 붙어 있다. 둘은 같은 화면에 있어도 같은 좌표계가 아니다.

```text
camera near-plane cone
  ≠ visible vehicle front
```

그래서 밝은 부분이 차량 앞이 아니라 차량 아래·뒤에 생겼다. 색과 alpha를 조절해도 해결되지 않았다. 빛의 모양 문제가 아니라 **광원의 시작 기준이 차량이 아니었던 문제**였다.

### road mask를 먼저 붙인 실패

다음에는 빛이 guardrail이나 숲으로 새지 않도록 offscreen road mask를 붙이려 했다. 목적은 맞았다. 다만 Phaser의 offscreen Graphics capture와 shader output을 연결하는 과정에서 mask가 shader 결과를 통째로 가렸다. 일반 GameObject mask API도 이 full-screen shader pass에 그대로 적용할 수 없었다.

이 단계에서 얻은 원칙은 단순했다.

> 가림을 먼저 완벽하게 만들지 않는다. 먼저 차량과 같은 기준에서 시작하는 빛을 만든다.

road mask는 독립 POC가 성공할 때 다시 시도할 항목으로 남겼다.

## 두 타원은 정면에서는 맞고, 조향에서는 부족했다

camera cone을 버린 뒤에는 full-screen additive shader에서 좌우 lamp pool을 각각 계산했다.

```text
lamp left oval
  + lamp right oval
  = overlap brighter
```

정면 화면에서는 이 구조가 잘 작동했다. 두 광원이 차체 앞에 붙고, 중앙의 overlap이 조금 더 밝아졌다. 하지만 steering sprite는 정면 이미지를 회전한 것이 아니라, 이미 다른 방향으로 그려진 atlas frame이다. 화면의 X/Y만으로 pool을 옮기면 차체와 조명 방향이 다시 갈라졌다.

그 다음에는 두 pool을 하나의 회전 사다리꼴로 합쳤다. 이 역시 정면에는 보기 좋았다. 그러나 `78°`에 가까운 strong pose에서는 폭과 길이가 비슷해져, 빛이 도로를 비추는 것이 아니라 세로로 돌아간 광판처럼 읽혔다.

![단일 사다리꼴 시절의 FT86 QA matrix. 조향 강도가 커질수록 광원이 회전한 판처럼 보이던 문제를 확인했다.](/images/posts/202607/apex-seoul-headlight-rev6-before-matrix.png)

여기서 중요한 관찰은 “조향에 따라 빛을 조금 이동한다”로는 부족하다는 점이었다. **차량 pose가 가진 forward axis 자체를 빛이 알아야 했다.**

## sprite pose가 조명 축을 소유하게 했다

차량 atlas의 각 profile은 이미 아래 정보를 가지고 있었다.

```text
lampLeft / lampRight : sprite 안의 두 램프 위치
emitterForwardYawDeg: 해당 frame이 그려진 전방 방향
footprint           : reach, near padding, far width
optical             : 작은 corner swivel과 fill
```

런타임에서 lamp anchor에 sprite origin, display size, `flipX`, 작은 sprite rotation을 같은 순서로 적용한다. 그 뒤 atlas의 `emitterForwardYawDeg`와 runtime rotation을 합쳐 base forward axis를 만든다.

```text
atlas frame forward yaw
  + runtime sprite rotation
  = base beam axis

base beam axis
  + small optical swivel
  = final optical axis
```

큰 방향 변화는 atlas frame이 담당한다. runtime은 최대 `8°`의 작은 swivel만 더한다. 이 분리를 하지 않으면 조향할 때 이미 옆을 보는 차량 위로 별도의 큰 회전값을 또 얹게 된다.

좌우 left pose는 별도 asset이 아니라 right pose의 `flipX`를 재사용한다. 따라서 frame yaw와 lamp 순서를 함께 mirror해야 한다. lamp 위치만 뒤집거나 yaw만 부호 반전하면 둘 중 하나가 차체와 어긋난다.

## 단일 사다리꼴을 약한 spill과 두 core로 분리했다

frame 축을 얻어도, 하나의 큰 사다리꼴은 여전히 기계적이었다. 해결은 광원을 하나의 polygon으로 더 정교하게 그리는 것이 아니라, 역할을 나누는 것이었다.

```text
weak shared spill envelope
  + left lamp core
  + right lamp core
  → bounded overlap
  + short corner fill
```

### shared spill

shared spill은 전체적으로 road 위에 남는 약한 청색 면이다. soft edge와 최종 tail만 담당하고, 강한 중심 hotspot은 소유하지 않는다. 이것만 강하게 만들면 다시 회전한 사다리꼴 판으로 돌아간다.

### 두 lamp core

두 core는 계산용 평균 center가 아니라 실제 `lampLeft`, `lampRight` 화면 위치에서 각각 시작한다. near edge에서 두 개의 원형 pool로 읽히지 않도록 좁게 시작하고, 거리가 늘면서 폭이 넓어진다.

처음에는 두 core를 shared center까지 완전히 수렴시켰다. 논리적으로는 두 빛이 하나로 합쳐지는 것처럼 보였지만 medium pose에서는 S자형 합류와 둥근 blob이 생겼다. 실제 자동차의 low beam은 두 빛이 화면 중앙에서 교차하는 것보다 거의 평행하게 진행하며 폭으로 겹친다.

그래서 최종적으로는 lamp offset의 최대 `28%`만 toe-in한다. 나머지 overlap은 widening lobe가 만든다.

```glsl
vec3 overlap = max(leftCore, rightCore)
             + min(leftCore, rightCore) * 0.32;
vec3 light = max(sharedSpill, overlap);
```

`max()`만 쓰면 겹쳐도 평평하다. 단순 additive는 중앙이 두 배로 포화된다. 위 식은 겹치는 영역을 단일 core보다 밝게 만들되, 두 배가 되지 않게 제한한다.

### 안쪽 코너를 위한 별도 fill

medium/strong에서 main beam을 과하게 꺾으면 바깥쪽 road coverage가 사라진다. 그래서 main axis 자체는 보존하고, 안쪽에만 짧은 corner-fill wedge를 추가했다.

| pose | main swivel | corner fill yaw | fill reach | fill intensity |
| --- | ---: | ---: | ---: | ---: |
| center | `0°` | 없음 | 없음 | 없음 |
| medium | `4°` | `7°` | main의 `55%` | `20%` |
| strong | `8°` | `12°` | main의 `65%` | `30%` |

corner fill도 additive로 더하지 않는다. `max(main, corner)` union으로 합쳐, 이미 밝은 core 위에 또 한 겹의 파란색이 쌓이지 않게 했다.

## 광도와 폭은 한 번에 고치지 않았다

“너무 넓다”라는 문제를 곧바로 light intensity로 해결하면 원인을 잃는다. 이번에는 reach, far width, core fade, intensity를 따로 조정했다.

### medium이 광판처럼 보인 이유

초기 downhill medium은 far half-width가 `0.135h`, reach가 `0.145h`였다. 760px viewport에서는 각각 약 `103px`, `110px`다. 이 비율을 `42°` 정도 회전하면 사실상 긴 빔보다 넓은 삼각형이 된다.

그래서 medium far width만 다음처럼 줄였다. center와 strong의 기준은 이 단계에서 건드리지 않았다.

| terrain | 이전 medium width | 최종 medium width |
| --- | ---: | ---: |
| level | `0.120h` | `0.090h` |
| downhill | `0.135h` | `0.100h` |
| uphill | `0.110h` | `0.080h` |

반대편 lamp는 perspective상 멀고 일부 가려진 것으로 보고, medium/strong에서 별도로 감쇠했다.

| pose | far lamp intensity | far lamp reach |
| --- | ---: | ---: |
| center | `1.00` | `1.00` |
| medium | `0.65` | `0.90` |
| strong | `0.35` | `0.82` |

처음에는 core fade를 reach의 `55%`부터 시작했다. 이 값은 먼 tail을 짧게 만드는 데는 좋았지만, 두 core가 충분히 겹치기 전에 사라졌다. final core fade 시작점은 `68%`로 옮겼고, 마지막 soft tail은 shared spill만 남도록 했다.

## 정면 reach를 70%로 줄인 이유

dual emitter가 안정된 뒤에도 정면 빔은 콘셉트 이미지보다 멀리 뻗었다. 여기서는 폭이나 광량을 다시 건드리지 않고 center reach만 이전의 `70%`로 줄였다.

| terrain | 이전 center reach | 최종 center reach |
| --- | ---: | ---: |
| level | `0.140h` | `0.098h` |
| downhill | `0.150h` | `0.105h` |
| uphill | `0.120h` | `0.084h` |

이렇게 하면 정면에서는 가까운 road를 읽게 하는 밝은 면이 남고, 멀리까지 뻗는 사다리꼴은 줄어든다. 조향 pose의 reach는 이 변경과 섞지 않았다. 길이를 바꾸는 실험과 방향을 바꾸는 실험을 분리하기 위해서다.

## 잘못된 높이 보정: beam을 들어 올리는 것은 시작점을 고치지 않는다

이 작업에서 가장 유용했던 실패는 측면 헤드라이트의 높이였다.

내리막과 오르막에서 빛이 차체 아래에 깔려 보였다. 처음에는 beam progress에 따라 shader 전체를 화면 위로 들어 올리는 `screenLift`를 넣었다.

```text
near edge : 그대로
mid / far : 위로 lift
```

이 방식은 light tail을 들어 올릴 뿐, 광원이 실제로 시작하는 점은 바꾸지 않았다. 결과적으로 조사각이 휘어 보였고, 사용자가 느낀 “차체보다 낮은 시작점”은 남았다.

정답은 shader가 아니라 atlas였다. 측면 profile의 `lampLeft.y`, `lampRight.y`를 **같은 양만큼** 위로 옮겼다.

```text
medium: two lamp Y -= 0.030 frame ratio
strong: two lamp Y -= 0.040 frame ratio
```

두 lamp에 같은 delta를 적용하면 lamp segment의 기울기와 beam axis는 그대로다. 즉 빛의 방향을 고친 것이 아니라, 빛이 출발하는 위치와 footprint 전체를 평행 이동한 것이다.

### terrain profile에는 한 번 더 보정이 필요했다

평지 left/right는 이 보정 후 괜찮았지만, downhill/uphill에는 elevation용 기존 Y offset이 남아 있었다. terrain side profile에만 `-0.030` frame ratio를 추가 적용했다.

```text
level side     : 승인값 유지
downhill side  : terrain anchor만 추가 상승
uphill side    : terrain anchor만 추가 상승
```

최종 규칙은 “terrain side lamp 평균 Y가 승인된 level side lamp보다 의미 있게 아래로 내려갈 수 없다”다. 이를 자동 검증으로 고정했다.

![최종 FT86 matrix. 정면은 짧은 reach를 유지하고, level·downhill·uphill의 좌우 pose는 같은 lamp-anchor 계약을 공유한다.](/images/posts/202607/apex-seoul-headlight-rev9-ft86-matrix.png)

![FT86 downhill medium-left. 광원 시작점은 차체의 앞쪽 높이에 붙고, 두 core는 가까운 road에서만 겹친다.](/images/posts/202607/apex-seoul-headlight-rev9-ft86-downhill-left-medium.png)

![FT86 uphill medium-left. terrain profile이 달라도 조사각을 바꾸지 않고 anchor만 보정한다.](/images/posts/202607/apex-seoul-headlight-rev9-ft86-uphill-left-medium.png)

## 사람이 보는 문제를 자동 검증으로 옮겼다

시각 효과는 최종적으로 캡처를 봐야 한다. 그렇다고 캡처만 보면 data contract가 조용히 깨졌을 때 원인을 찾기 어렵다. 그래서 `qa:headlight-profiles`에 다음을 고정했다.

```text
2 atlases
18 sprite anchor checks
12 directional profiles
left/right mirror
frame yaw + sprite rotation + optical swivel composition
medium/strong far lamp intensity and reach mirror
terrain side anchor must not sit below approved level anchor
```

그리고 FT86과 Genesis G70에서 각각 15개 장면을 캡처한다.

```bash
npm run qa:headlight-profiles --workspace @games/apex-seoul
npm run qa:runtime-vehicle --workspace @games/apex-seoul -- --vehicle ft86-retro
npm run qa:runtime-vehicle --workspace @games/apex-seoul -- --vehicle genesis-g70-poc
npm run build --workspace @games/apex-seoul
```

![같은 dual-emitter와 terrain anchor 계약을 Genesis G70에도 적용한 최종 QA matrix](/images/posts/202607/apex-seoul-headlight-rev9-g70-matrix.png)

이 검증은 광량의 미적 판단까지 대신하지 않는다. 대신 “left에는 맞는데 right에서 lamp 순서가 바뀌었다”, “terrain profile에서 시작점만 아래로 내려갔다”, “frame yaw가 sprite rotation과 중복됐다” 같은 회귀를 빠르게 막는다.

## 이번 반복에서 남은 기준

이번 작업을 지나며 헤드라이트에는 다음 순서가 남았다.

```text
1. 광원 시작점은 실제 sprite lamp anchor에서 얻는다.
2. 큰 방향 변화는 atlas pose가 소유한다.
3. runtime optical은 작은 상대 swivel만 담당한다.
4. 두 lamp는 independent core로 계산한다.
5. overlap은 밝되 포화되지 않게 제한한다.
6. terrain은 조사각이 아니라 anchor height를 먼저 확인한다.
```

아직 road-only mask와 wet asphalt 반사는 남아 있다. 하지만 그 전에 해결해야 했던 것은 빛을 더 화려하게 만드는 일이 아니었다. 플레이어가 차를 꺾었을 때, 빛도 같은 차에서 나오는 것처럼 보이게 하는 일이었다.

이번 반복의 결론은 이렇다.

> 헤드라이트는 하나의 예쁜 사다리꼴이 아니라, 차량 pose·두 lamp 위치·고저차 profile·합성 규칙이 함께 만드는 화면상의 약속이다.
