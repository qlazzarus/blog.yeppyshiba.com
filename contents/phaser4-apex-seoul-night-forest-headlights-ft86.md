---
title: Phaser 4 Pseudo 3D 레이싱 게임 - 숲, 어둠, 두 개의 헤드라이트를 다시 맞추기
date: 2026-07-20T10:30:00+09:00
summary: Apex Seoul의 밤 다운힐을 실제 주행 기준으로 다시 보며, 수평선에 잘리던 숲을 SVG 군집으로 교체하고, road와 roadside를 같은 어둠으로 수렴시키고, 차량 전방의 두 타원 헤드라이트와 FT86형 파워밴드를 시행착오 끝에 정리한 기록입니다.
image: /images/posts/202607/apex-seoul-night-forest-headlights-hero.png
coverCredit: OpenAI image generation — article illustration
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - pseudo-3d
    - game-art
    - rendering
    - racing-game
    - game-dev
---

## 정지 화면이 괜찮아도, 달리면 바로 들킨다

[지난 글](/article/phaser4-apex-seoul-roadside-collision-powerband/)에서는 Apex Seoul의 양옆을 비대칭으로 나눴다.

```text
왼쪽  : 가드레일 / 절벽 / 먼 도시
오른쪽: 옹벽 / 가까운 수목
```

방향 자체는 맞았다. 하지만 실제로 달려 보니 장면은 아직 한 장의 밤 산길로 읽히지 않았다.

- 옹벽 위 숲이 수평선과 도로 사이의 검은 band에 잘렸다.
- 오른쪽은 “벽 위에 나무 몇 개”처럼 보였고, 화면 끝까지 이어지는 숲 벽이 아니었다.
- 왼쪽 가드레일 너머 절벽은 비어 보였고, 먼 수관은 달릴 때 갑자기 생겼다.
- 숲과 옹벽은 멀리서 어두워졌지만 road와 차선은 여전히 선명했다.
- 가까운 도로를 밝혀 보려던 헤드라이트는 차 뒤에 생기거나, 화면 위에서 사라지거나, 너무 기하학적인 표식처럼 보였다.

이번 작업은 새 배경을 하나 더 추가한 일이 아니다. **무엇을 어느 거리에서 보이게 하고, 무엇을 어디에 그려야 하는지**를 다시 맞춘 작업이다.

[Apex Seoul 데모 보기](/games/apex-seoul/)

<div style="position: relative; width: 100%; height: min(70vh, 560px); margin: 24px 0;">
    <iframe
        src="/play/apex-seoul/"
        title="Apex Seoul"
        loading="lazy"
        style="position: absolute; inset: 0; width: 100%; height: 100%; border: 1px solid #26343c; border-radius: 8px; background: #101316;"
    ></iframe>
</div>

![오른쪽 숲 벽, 왼쪽 절벽 수관, 차량 전방의 두 타원 광원을 설명하기 위한 제작 이미지](/images/posts/202607/apex-seoul-night-forest-headlights-hero.png)

_이 글의 삽화는 실제 플레이 스크린샷이 아니라, 구현 목표와 장면 구성을 설명하기 위해 제작한 이미지다._

## 첫 실수: 숲 문제를 나무 모양 문제로 봤다

처음에는 오른쪽 나무 resource가 단순해서 어색하다고 생각했다. 물론 맞는 말이었다. 하지만 나무를 더 그려도 해결되지 않는 문제가 먼저 있었다.

옹벽 위의 숲은 road projection 사이의 빈 공간을 덮는 horizon occlusion보다 뒤에 그려지고 있었다. 그래서 나무가 수평선에서 잘린 것처럼 보였다.

처음 반응은 보통 이쪽이다.

```text
나무를 더 밝게 한다.
검은 band를 지운다.
나무의 크기를 키운다.
```

전부 결과를 건드리는 방법이다. 검은 band는 crest와 내리막에서 road와 원경 사이의 빈 공간을 숨기는 데 필요했다. 없애면 숲은 보일 수 있지만, 도로의 지형은 무너진다.

그래서 먼저 draw order를 분리했다.

```text
background / city / ridge
  → terrain horizon occlusion
  → left cliff canopy / right wall forest
  → road / wall / guardrail
  → headlight
  → player
  → HUD
```

`RenderDepth` enum으로 이 순서를 이름 붙여 두고, horizon occlusion을 road 본체와 별도 Graphics pass로 옮겼다. 이 변경 뒤에야 “숲이 수평선에 잘린다”는 문제가 나무 asset이 아니라 layer 충돌이었다는 것이 명확해졌다.

## 기존 PNG를 버리고 SVG 다섯 종을 만든 이유

다음 문제는 실제로 나무였다.

기존의 wall-forest PNG는 한 장의 덩어리를 반복하는 방식이었다. 오른쪽 옹벽 위에서 수목의 밀도, 앞뒤 교차, 크기 변화를 제어하기에는 너무 거칠었다. 멀리서는 한 줄의 패턴으로 보이고, 가까이서는 숲이 아니라 이미지 타일처럼 보였다.

그래서 기존 resource를 제거하고 투명 배경 SVG 다섯 종을 새로 만들었다.

```text
tree-01-tall-pine.svg
tree-02-wide-pine.svg
tree-03-cypress.svg
tree-04-leaning-pine.svg
tree-05-broadleaf.svg
```

중요한 점은 “나무 다섯 장을 만들었다”가 아니다. 한 그루가 아래에서 위까지 완성되는 자산을 만들고, 같은 자산을 **어디서 얼마나 보여 줄지**를 양쪽에서 다르게 썼다.

![오른쪽 옹벽 위의 연속 숲과 왼쪽 가드레일 아래 수관을 설명하기 위한 제작 이미지](/images/posts/202607/apex-seoul-forest-wall-cliff-canopy.png)

_이 이미지는 실제 asset의 스크린샷이 아니라, 아래 배치 규칙을 설명하는 제작 이미지다._

### 오른쪽: 나무 몇 개가 아니라 화면을 덮는 숲 벽

처음에는 옹벽 가장자리에 나무를 몇 개 올렸다. 정지 화면에서는 그럴듯해도 주행하면 간격이 드러났다. 오른쪽은 숲의 시작점이 아니라, 가까운 벽과 수목이 화면 밖까지 계속 이어지는 닫힌 공간이어야 했다.

그래서 segment마다 back/front 두 군집을 만들고, SVG 종류·크기·위치를 교차시켰다.

```text
right wall top
  → back forest cluster
  → front forest cluster
  → next segment의 cluster와 겹침
  → screen-right edge까지 연속
```

이 구조는 숲의 디테일을 늘리는 것보다, 숲의 **끊기지 않는 경계선**을 먼저 보장한다.

### 왼쪽: 같은 나무를 절벽 아래로 숨겼다

왼쪽 가드레일 너머에는 줄기까지 보이는 나무가 필요하지 않았다. 오히려 줄기와 접지부가 화면에 들어오면 절벽의 높이와 가드레일 위치가 어색해졌다.

그래서 같은 SVG를 쓰되 상단 수관만 crop했다. 줄기는 절벽 아래에 숨기고, 수관만 guardrail 너머에서 보이게 했다. 이 군집을 왼쪽 화면 끝까지 이어 주면, 도로 옆에 나무를 세운 것이 아니라 절벽 아래 숲이 보이는 느낌이 난다.

```text
right: full tree silhouette above retaining wall
left : cropped canopy below guardrail
```

양쪽은 자산이 아니라 접지선이 다르다. 이 차이가 “벽 위의 숲”과 “절벽 아래의 숲”을 구분한다.

## 두 번째 실수: random 배치는 숲을 자연스럽게 만들지 않았다

SVG 종류와 크기를 랜덤으로 고르면 처음에는 반복이 줄어든 것처럼 보인다. 하지만 달리는 게임에서는 더 큰 문제가 생긴다. 멀리 있던 나무가 매 프레임 다른 형태로 바뀌거나, 새 군집이 갑자기 나타나는 느낌이 남는다.

해결은 random을 없애는 것이었다. 정확히는 매번 다른 random 대신 segment index 기반의 결정적 seed를 사용했다.

```text
same segment index
  → same SVG variant
  → same scale / x offset
  → same back/front layer
```

여기에 crest visibility와 distance fade를 붙였다. 먼 수관은 “생성”되는 것이 아니라, 지형 뒤와 어둠 속에서 서서히 열린다. 이 규칙은 오른쪽 옹벽 숲과 왼쪽 절벽 수관에 같이 적용했다.

## alpha를 낮춘다고 밤이 되는 것은 아니었다

수목을 정리하고 나니 또 다른 문제가 보였다. roadside는 멀리서 사라지는데 road body와 차선은 계속 밝았다. 결과적으로 숲만 안개에 잠기고 도로는 멀리까지 떠 있는 것처럼 보였다.

처음에는 alpha를 낮추는 식의 fade를 생각했다. 하지만 alpha는 뒤의 배경을 드러낼 뿐, 같은 장면 안의 다른 요소를 같은 색으로 수렴시키지 않는다.

그래서 fog를 투명도 효과가 아니라 color compositing 규칙으로 바꿨다.

```text
near : asphalt, rail, foliage의 형태를 읽을 수 있다.
mid  : asphalt contrast와 edge line이 함께 약해진다.
far  : road, wall, rail, foliage가 같은 blue-black에 가까워진다.
```

road, shoulder, lane mark, retaining wall, guardrail, forest가 같은 거리 기준을 공유해야 했다. 특히 차선과 edge line은 asphalt보다 먼저 contrast를 잃게 했다. 그렇지 않으면 멀리 있는 차선이 야간 도로가 아니라 화면 위에 그은 밝은 선처럼 보인다.

이 작업 뒤의 기준은 단순하다.

> 멀리 있는 요소는 투명해지는 것이 아니라, 같은 밤색 속으로 들어가야 한다.

## 헤드라이트는 cone보다 두 개의 타원이 맞았다

_아래는 이 글을 작성한 시점의 초기 광원 구조다. 조향 pose와 terrain까지 포함한 후속 시행착오와 최종 dual-emitter 구조는 [헤드라이트를 사다리꼴 하나에서 두 개의 광원으로 바꾸기](/article/phaser4-apex-seoul-headlight-dual-emitter/)에 별도로 정리했다._

원근 안개를 넣으면 가까운 road에 작은 밝기 기준점이 필요해진다. 이 단계의 시행착오는 가장 많았다.

### 실패 1: 3D road cone은 차량 앞이 아니라 camera 앞에서 시작했다

처음에는 road polygon 위에 사다리꼴 cone을 다시 그렸다. 하지만 차량 sprite는 화면 하단의 road contact anchor에 고정돼 있고, cone은 camera near-plane을 기준으로 시작했다.

그래서 가장 밝은 부분이 차량 앞이 아니라 차량 아래나 뒤에 나타났다.

이건 cone의 색이나 alpha 문제가 아니었다. **서로 다른 좌표 기준을 같은 광원으로 착각한 문제**였다. 이 pass는 롤백했다.

### 실패 2: mask를 먼저 붙이면 빛 자체가 사라졌다

다음에는 road만 밝히기 위해 RenderTexture mask를 시도했다. 방향은 좋았다. 급커브에서도 guardrail과 숲에 빛이 번지지 않게 만들 수 있기 때문이다.

하지만 Phaser의 offscreen Graphics capture와 shader output을 연결하는 단계에서 mask가 결과를 전부 막았다. `Shader` 객체에 일반 GameObject mask API를 붙이는 시도도 맞지 않았다.

이때 중요한 선택은 mask 문제를 더 오래 붙잡지 않는 것이었다. 우선 차량과 확실히 연동되고, 화면에서 보이는 구조를 만든다. road mask는 별도 POC가 성공할 때만 다시 붙인다.

### 현재 구조: 두 개의 눌린 타원을 더한다

현재는 full-screen additive shader 한 장에서 좌·우 헤드라이트 pool을 따로 계산한다.

```text
visible car front anchor
  → left flattened oval pool
  + right flattened oval pool
  → overlap = brighter
```

- `uCarFront`는 atlas의 투명 여백을 보정한 visible car front다.
- 램프 간격은 sprite 폭에 비례해 바뀌므로, 차량 크기가 달라져도 두 광원이 차체에서 떨어져 보이지 않는다.
- 각 pool은 동심원이나 링이 없는 단일 청백색 타원이다.
- 두 타원은 독립적으로 계산하고 밝기를 더한다. 따라서 겹치는 중앙부가 자연스럽게 더 밝다.
- road와 shader에 같은 camera shake를 적용해, 화면이 흔들릴 때 빛만 미끄러지지 않게 했다.

처음에는 동심원을 넣어 광원 두 개를 읽히게 하려 했다. 하지만 결과는 헤드라이트 반사보다 HUD target에 가까웠다. 반대로 타원을 너무 넓히면 두 개가 하나의 푸른 구름으로 합쳐졌다.

현재도 실제 주행 화면에서 크기·간격·감쇠를 계속 조정 중이다. 여기서의 결론은 “완벽한 물리 조명”이 아니라, rear-view pseudo-3D 화면에서 **두 개의 광원이 도로 위에 존재한다는 최소 단서**를 남기는 것이다.

## 화면이 정리되자, FT86형 파워밴드 문제도 더 잘 들렸다

시각적인 잡음이 줄어들자 Raven Coupe의 변속 리듬이 더 선명하게 어색해졌다. 이전 자동 변속은 사실상 speed threshold를 넘으면 다음 단으로 바뀌었다. 프로필에 있던 RPM 값은 실제 upshift 조건에 충분히 쓰이지 않았다.

그래서 2.0L 자연흡기 FR coupe의 감각을 목표로 기어 구간을 다시 배치했다. 실차 기어비를 복제한 것은 아니다. 고회전에서 변속하고, 다음 단에서도 다시 토크 구간에 들어오는 리듬을 참고한 것이다.

| 단수 | 주된 사용 구간 | 변속 지점 |
| --- | ---: | ---: |
| 1단 | 0–36km/h | 약 36km/h |
| 2단 | 36–67km/h | 약 67km/h |
| 3단 | 67–97km/h | 약 97km/h |
| 4단 | 97–127km/h | 약 127km/h |
| 5단 | 127–157km/h | 약 157km/h |
| 6단 | 157–185km/h | 고속 순항 |

함께 바꾼 점은 다음과 같다.

- powered upshift는 `7,400rpm` 근처에서 일어난다.
- 변속 뒤 RPM은 `5,400rpm` 이상을 목표로 둔다.
- torque curve는 `5,500rpm` 이후 올라가 `6,600~7,000rpm` 부근에서 가장 즐겁게 느껴지게 한다.
- 길어진 저단 때문에 출발이 지나치게 느려지지 않도록 Raven만 acceleration scale을 소폭 보정했다.

`qa:standing-start` 결과는 Raven 기준 `0–60km/h 9.917초`, `0–100km/h 13.133초`였다. 숫자 자체보다 중요한 것은 30km/h에서 아직 1단을 쓰고, 60km/h가 2단 후반을 거쳐, 100km/h가 4단 초반으로 이어진다는 점이다.

## 이번 반복에서 남은 원칙

이번 작업은 숲, 안개, 헤드라이트, 파워밴드라는 서로 다른 항목처럼 보인다. 하지만 모두 같은 질문에서 시작했다.

```text
이 요소는 언제 보이기 시작해야 하는가?
무엇과 같은 좌표 기준을 공유해야 하는가?
전환 뒤에도 이전 상태와 자연스럽게 이어지는가?
```

- 숲에는 layer, crest visibility, 결정적 배치가 필요했다.
- road와 roadside에는 같은 distance fog가 필요했다.
- 헤드라이트에는 camera 기준 cone이 아니라 차량 front anchor가 필요했다.
- 엔진에는 단순 속도 경계가 아니라 RPM drop을 고려한 변속 목표가 필요했다.

아직 남은 일도 있다.

- 실제 플레이에서 헤드라이트 두 타원의 크기·간격·광량을 더 검증한다.
- offscreen road mask는 독립 POC에서 output이 보장된 뒤에만 다시 시도한다.
- 숲 SVG의 실루엣 밀도는 더 다듬되, 좌우의 접지선·가시성·결정적 배치 규칙은 유지한다.
- Raven 외 다른 차량에도 powerband 차이를 넣되, 코너 속도 예산과 lateral handling을 섞지 않는다.

정지 화면을 예쁘게 만드는 일과 달리는 화면을 믿게 만드는 일은 다르다. 이번 반복은 그 차이를 확인하고, 각 요소가 갑자기 나타나거나 엉뚱한 기준에서 빛나지 않게 만드는 과정이었다.
