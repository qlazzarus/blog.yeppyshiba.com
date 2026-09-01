---
title: 이미지 한 장 대신 파이프라인으로 - Apex Seoul 7way 차량 sprite compiler
date: 2026-09-01T20:30:00+09:00
summary: 디더링된 5way 프로토타입이 전달하지 못하던 조향 정보를 7way로 확장하고, 3D 수정과 결정적 스크립트 가공만으로 Raven Coupe·Seorin GT·Mirae GT 후보 atlas를 만드는 과정을 정리합니다.
image: /images/posts/202609/apex-seoul-7way-vehicle-asset-compiler-cover.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - threejs
    - pixel-art
    - game-art
    - game-dev
---

## 오랜만에 차량 작업을 다시 열었다

[이전 글](/article/phaser4-apex-seoul-runtime-sprite-contact-shadow/)에서는 차량 sprite를 실제 Phaser runtime에 연결하고, 조향·고저차·접지 그림자를 게임 화면에서 검증했다.

그 뒤로 Apex Seoul은 코너링, 드리프트, 헤드라이트, 다운힐 속도 예산, 결승 연출처럼 **한 번의 주행이 어떻게 읽히는가**에 집중했다.

이번에는 다시 차량으로 돌아왔다.

이유는 단순하다. 게임을 실제로 오래 플레이해 보니 차량이 단지 도로 위의 아이콘으로 남으면 안 됐다. 차종마다 뒤쪽 실루엣이 구분되고, 작은 조향 변화가 보이며, 여러 색상도 같은 규칙으로 유지돼야 했다.

하지만 이번에는 “차 이미지를 더 예쁘게 만들자”로 시작하지 않았다.

목표는 세 대의 차량을 하나의 재현 가능한 asset compiler로 관리하는 것이었다. 먼저 왜 기존 sprite를 그대로 다듬지 않았는지부터 정리할 필요가 있다.

## 프로토타입을 다시 만든 이유

기존 prototype sprite는 빠르게 주행 감각을 검증하기에는 충분했다. 다만 128px 안에서 차체의 면과 반사를 표현하려고 디더링을 많이 사용했다. 정지 화면에서는 질감처럼 보이지만, 차가 작게 흔들리고 가속하는 실제 주행에서는 그 무늬가 차체 형태보다 먼저 읽혔다. 색상 variant를 만들 때도 어느 픽셀이 body인지 판단하기가 어려웠다.

더 큰 문제는 5way였다. center와 좌·우 조향 단계를 갖는 구조는 기본적인 방향 전환을 보여 주지만, center와 mild steer 사이의 작은 핸들 각도를 전달하지 못한다. 플레이어가 입력을 살짝 넣어 차가 도로를 따라 흐르는 순간에는 차의 진행 방향은 바뀌었는데 sprite의 태도는 아직 center에 머무는 구간이 생긴다. 이 차이는 속도가 올라갈수록 더 크게 느껴진다.

그래서 이번 pass는 아래 두 가지를 동시에 바꾸는 작업이었다.

- 5way를 7way로 늘려 center와 큰 조향 사이에 `steer-left-0`, `steer-right-0`를 둔다.
- 디더링을 2D filter로 덮어쓰지 않고, 먼저 3D model에서 공개 asset에 불필요한 형상과 재질 문제를 정리한 뒤 script가 안정적으로 읽을 수 있는 source를 만든다.

후자가 특히 중요했다. 이미지 AI나 수작업 보정에 의존하면 한 장은 좋아 보여도 다음 차종·다음 색상·다음 pose에서 같은 결과를 재현하기 어렵다. 반대로 source의 문제를 3D에서 해결하고, 2D는 role mask와 명시적인 규칙만 다루게 하면 세 차량과 모든 palette variant를 같은 명령으로 다시 만들 수 있다.

```text
frozen 3D master
-> 17-pose 7way beauty sheet
-> role masks
-> neutral pixel master
-> detail simplification
-> body palette variants
-> QA
-> Phaser candidate atlas
```

이번 글의 산출물은 게임에 아직 연결하지 않은 **candidate asset**이다. 따라서 여기서는 플레이 화면을 링크하거나 임베드하지 않는다. 기존 5way를 건드리지 않은 채, 새 source와 atlas가 나중에 런타임 검증을 받을 수 있는 상태까지 만드는 데 집중한다.

## 세 대의 3D 모델은 여기서 멈췄다

이번 pass의 공개 차량명은 다음처럼 정리했다.

| 공개 이름 | 내부 source | sprite에서 남길 것 |
| --- | --- | --- |
| Raven Coupe | FT86 | 낮고 짧은 2도어 FR 비례, wheelbase, rear-quarter silhouette |
| Seorin GT | Stinger | 긴 fastback roofline, 넓은 후면, roll cage accent |
| Mirae GT | G70 (Nieve) | 세단형 roofline, rear overhang, 넓은 lamp housing |

실차 기반 모델을 쓰면 “조금만 더 바꿔 보자”는 유혹이 계속 생긴다. lamp를 더 키우고, bumper를 단순화하고, 휠을 바꾸고, 차체를 늘리다 보면 어느 순간 3D 모델과 sprite rig의 기준점이 같이 흔들린다.

그래서 이번에는 3D master를 **freeze**했다.

- 차체 비례, roofline, wheelbase, 휠 위치, 접지선은 유지한다.
- badge, 번호판, lettering처럼 공개 asset에 남기기 어려운 요소만 제거한다.
- flipX 대칭이 깨지거나, 구멍·z-fighting·접지 오류를 만드는 geometry만 예외적으로 고친다.
- 색상과 레트로 스타일은 이후 2D 단계에서만 바꾼다.

이 결정이 없으면 palette swap 하나를 고칠 때마다 3D render를 다시 의심하게 된다. 반대로 3D 기준이 고정되면 128px에서 필요한 문제만 2D 규칙으로 볼 수 있다.

## 5way를 덮어쓰지 않고 7way source를 만들었다

기존 runtime은 이미 5way steering 계약과 여러 주행 QA를 갖고 있다. 그래서 새 pose를 만들면서 기존 atlas를 바로 바꾸지 않았다.

대신 candidate source는 3 columns × 6 rows, 총 17 pose와 마지막 blank cell로 고정했다.

```text
center
steer-right-0     # 새 slight steer, rear angle 약 11°
steer-right-1
steer-right-2

spin / rollover / overturned
downhill / uphill
```

정상 조향은 다음처럼 확장된다.

```text
steer-left-2 → steer-left-1 → steer-left-0 → center
             → steer-right-0 → steer-right-1 → steer-right-2
```

좌측 세 pose를 새로 렌더하지 않은 것도 의도적이다. `steer-left-{0,1,2}`는 대응하는 right frame을 `flipX`한다. 이렇게 해야 source 수를 늘리지 않으면서 anchor와 baseline의 대칭 계약을 유지할 수 있다.

![Seorin GT의 3×6 17 pose 512px beauty source. 마지막 cell은 의도적으로 비워 둔다.](/images/posts/202609/apex-seoul-7way-compiler/seorin-gt-17pose-source.png)

중요한 점은 새 7way가 아직 runtime 전환이 아니라는 것이다. 기존 Phaser 5way atlas는 그대로 두고, 7way는 candidate sheet와 QA에서 먼저 검증한다. 즉, 이번 단계는 UX에 필요한 조향 정보를 더 촘촘히 준비하는 일이지, 게임의 현재 차량 표현을 교체하는 일은 아니다.

## texture가 아니라 역할을 분리했다

512px beauty sheet를 128px로 줄이기 전에 body, glass, lamp, wheel, accent 역할을 분리했다.

```text
body      -> 차체색 variant가 바뀌는 유일한 영역
glass     -> 차가운 tint와 제한된 highlight를 유지
lamp      -> 위치와 폭은 남기고 내부선을 줄이는 영역
wheel     -> 타이어·rim·brake를 보호하는 영역
accent    -> Seorin GT의 노란 roll cage 같은 고정 강조색
shadow    -> 비워 둠. Phaser runtime의 별도 shadow를 사용
```

휠은 특히 까다로웠다. screen-space에서 검은 원형만 찾으면 diffuser, undertray, 반대편 휠까지 tyre로 오인할 수 있다.

그래서 원본 GLB에서 wheel geometry만 파생하고, 차체를 depth-only occluder로 먼저 렌더한 뒤 가시 휠만 mask로 얻었다. 이 mask는 body alpha를 지우는 도구가 아니다. wheel이 body에 흡수되지 않도록 보호하는 QA 기준이다.

![Seorin GT의 role debug sheet. 차체·유리·램프·휠·accent를 분리해 이후 script가 다룰 pixel의 범위를 고정한다.](/images/posts/202609/apex-seoul-7way-compiler/seorin-gt-role-masks.png)

작은 pixel art에서는 “휠을 완벽히 그렸다”보다 “휠 때문에 차체가 구멍 나지 않는다”가 먼저다.

## 접지 그림자는 sprite에 넣지 않았다

처음 neutral sprite를 만들 때는 휠 아래에 작은 baked-in shadow를 넣었다.

그런데 기존 Phaser runtime을 다시 확인해 보니 이미 그림자를 별도의 layer로 그리고 있었다.

- silhouette shadow spritesheet
- blur가 적용된 soft shadow spritesheet
- 접지감을 위한 Graphics contact patch

그리고 이 세 요소는 조향, drift, 속도, 고저차에 따라 위치·크기·회전이 변한다.

sprite 안에 고정 그림자를 넣으면 이 runtime shadow와 겹치고, 경사나 slip에서 서로 다른 방향을 보게 된다. 그래서 neutral/variant sheet에서는 baked-in shadow를 완전히 제거했다.

차량 이미지는 투명하게 유지하고, 그림자는 Phaser가 담당한다.

이 분리는 사소해 보이지만 역할이 명확해진다.

```text
sprite compiler: 차량의 silhouette와 색
Phaser runtime: 도로 위 접지, 경사, 속도감
```

## 레트로화는 AI filter 대신 deterministic script로 처리했다

예전에는 이미지 생성과 ComfyUI style filter도 실험했다. 방향을 빠르게 탐색하는 데는 유용했다. 하지만 이번 후보는 반복 가능한 규칙이 필요했고, 2D 출력 단계에서는 이미지 AI를 사용하지 않기로 했다.

그래서 현재 2D pass는 이미지 AI가 아니라 Node와 Sharp 기반 script로 구성했다.

| 단계 | script | 결과 |
| --- | --- | --- |
| 0 | `render-real-vehicle-phaser-7way.mjs` | 512px 17-pose beauty source |
| 1 | `extract-vehicle-role-masks.mjs` | body/glass/lamp/wheel/accent mask |
| 2 | `stylize-vehicle-7way-sheet.mjs` | neutral 128px pixel master |
| 3 | `simplify-vehicle-details.mjs` | role 내부 texture noise를 줄인 detail master |
| 4 | `swap-vehicle-body-palette.mjs` | blue/red/silver/black variant |
| 5 | `qa-vehicle-7way-atlas.mjs` | pose·anchor·alpha·flip QA와 contact sheet |
| 6 | `write-vehicle-7way-atlas.mjs` | Phaser candidate atlas |

2번은 role별 제한된 색 단계와 1px outline을 적용한다. 3번은 alpha와 silhouette을 바꾸지 않은 채 body, glass, wheel 내부의 고주파 noise를 정리하고, lamp의 아주 짧은 내부 gap만 하나의 mass로 연결한다.

여기서 의도적으로 하지 않는 것도 있다.

- 차체 외곽선을 다시 그리지 않는다.
- wheelbase나 wheel contact를 움직이지 않는다.
- 번호판이나 로고를 pixel filter로 “지운 척” 하지 않는다.
- 전체 RGB를 한 번에 치환하지 않는다.

원본 3D에 남으면 안 되는 요소는 3D freeze 예외 수정으로 처리하고, 2D compiler는 이미 정해진 role만 다룬다. 이것이 디더링 제거를 단순한 후처리가 아니라 source 설계의 문제로 본 이유다.

![Seorin GT의 neutral 128px detail master. silhouette과 alpha를 고정한 채 내부 texture noise만 정리한 결과다.](/images/posts/202609/apex-seoul-7way-compiler/seorin-gt-neutral-detail-master.png)

## palette swap은 body만 바꾼다

색상 variant의 핵심 규칙은 간단하다.

```text
body만 변경
glass / lamp / wheel / accent / outline / alpha는 유지
```

실제로는 한 가지 예외를 추가했다. Seorin GT의 하단 side skirt에 밝은 선이 남았다. 처음에는 chrome으로 분류된 작은 component가 body palette를 피해 간 문제였다. 이어서 512px에서 128px로 줄일 때 생긴 1px body fringe도 source mask 밖에 남는 것을 확인했다.

해결은 전체 색을 다시 바꾸는 것이 아니었다.

- 자동 chrome 분류를 비활성화한다.
- 확실한 neutral body ramp 색과 일치하는 1px fringe만 body로 간주한다.
- lamp mass의 red pixel은 계속 보호한다.

이렇게 하면 하단의 밝은 선은 차체색과 같이 바뀌고, lamp·glass·wheel은 그대로 남는다. palette swap은 보기에만 단순한 색 바꾸기가 아니라, **어떤 pixel이 차체인가**를 계속 검증하는 과정이었다.

![Raven Coupe palette QA contact sheet. blue·red·silver·black variant가 같은 pose와 alpha를 공유하는지 한 장에서 확인한다.](/images/posts/202609/apex-seoul-7way-compiler/raven-coupe-palette-contact-sheet.png)

## QA를 통과한 atlas도 아직 runtime은 아니다

마지막으로 세 차량의 네 색상, 총 12개 Phaser candidate atlas를 만들었다.

각 atlas는 다음을 통과해야 한다.

- 3×6 grid와 17 pose
- 마지막 blank cell의 완전한 투명성
- 모든 palette variant의 동일한 alpha
- candidate atlas의 frame, anchor, baseline
- `steer-left-{0,1,2}`의 right source `flipX` map

Raven Coupe와 Seorin GT의 normal steering baseline spread는 0px, Mirae GT는 1px이다. 128px sprite에서 이 정도는 frame 전환 시 눈에 띄는 점프를 만들지 않는 범위로 잡았다.

그래도 이 atlas는 모두 `candidateOnly: true`다.

```text
processed/{blue,red,silver,black}-128/
  sheet-128.png
  phaser-128.atlas.json
```

![Mirae GT의 Phaser candidate alpha preview. magenta는 투명 영역을 드러내기 위한 검수용 배경일 뿐 sprite에 포함되지 않는다.](/images/posts/202609/apex-seoul-7way-compiler/mirae-gt-phaser-alpha-preview.png)

현재 main game의 5way runtime atlas, texture key, vehicle catalog는 바꾸지 않았다. asset QA가 통과했다고 곧바로 게임 적용이 끝나는 것은 아니다. 다음 단계에서는 실제 Phaser runtime에 선택적으로 연결하고, steering state, headlight, shadow, browser screenshot QA를 다시 통과시켜야 한다.

## 이번 작업의 결론

이번에 얻은 것은 새 차량 이미지 몇 장이 아니다.

Raven Coupe, Seorin GT, Mirae GT를 같은 규칙으로 다룰 수 있는 경로다.

```text
3D 기준을 고정한다.
pose와 anchor를 먼저 보존한다.
pixel 역할을 분리한다.
색상은 body role 안에서만 바꾼다.
그림자는 runtime에 맡긴다.
QA가 통과한 atlas만 다음 단계로 보낸다.
```

이제 남은 일은 새 7way candidate를 실제 플레이 감각에 연결하는 것이다. 한 단계 더 작은 `steer-0`가 center와 mild steer 사이를 자연스럽게 메우는지, 세 차량이 같은 도로에서 같은 무게로 읽히는지, 그리고 기존의 접지 그림자·헤드라이트·드리프트 표현과 충돌하지 않는지를 게임 안에서 확인해야 한다. 하지만 그 전까지 이 글의 결과는 명확하다. 디더링과 5way의 한계를 AI 보정으로 가리지 않고, 3D source와 결정적 2D script를 통해 더 많은 조향 정보를 가진 후보 asset으로 바꿨다.

이번 pass는 그 검증을 시작할 수 있게 만든, 차량 asset pipeline의 새 기준선이다.
