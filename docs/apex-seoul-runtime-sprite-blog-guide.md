# Apex Seoul Runtime Sprite Blog Guide

이 문서는 다음 Apex Seoul 구현 블로그를 쓰기 위한 내부 글감 정리다. 공개 글 원고가 아니라, 마지막 공개 글인 `phaser4-apex-seoul-real-car-source-model-poc.md` 이후 무엇을 구현했고 어떤 사진을 넣어야 하는지 정리하는 작성 가이드다.

## 이번 글의 한 줄

실제 차량 3D 모델 POC로 만든 128px pose sheet를 게임 안에 넣어보니, 문제는 "스프라이트가 예쁜가"가 아니라 "도로, 고저차, 조향, 그림자가 한 화면에서 같은 물리처럼 읽히는가"였다.

## 마지막 글과의 연결

지난 글의 결론은 다음과 같았다.

- GT86, Kia Stinger, Genesis G70 3D 모델을 같은 pose sheet 규격으로 렌더링했다.
- 실차 모델은 최종 배포 asset이 아니라 후방 실루엣, 전장 비율, 포즈 기준선을 잡기 위한 source reference다.
- 잘 나온 이미지 한 장에 기대지 않고, pose render -> pixel pass -> QA -> runtime 적용으로 가야 한다.

이번 글은 이 결론 다음 장면에서 시작한다. 즉 "POC pose sheet는 만들었다. 이제 실제 게임에서 주행하면 어떤 문제가 생기나?"를 다룬다.

## 제목 후보

1. `Phaser 4 Pseudo 3D 레이싱 게임 - 차량 스프라이트를 도로에 붙이기`
2. `Apex Seoul 런타임 스프라이트와 그림자 보정`
3. `Apex Seoul 차량 스프라이트는 통과했지만, 도로에 붙어 보이지 않았다`
4. `Apex Seoul approved sprite를 게임 안에서 검증하기`

가장 자연스러운 제목은 1번이다. 이전 글이 3D 모델 POC였다면, 이번 글은 runtime integration과 contact feeling이 주제다.

## 추천 frontmatter 초안

```yaml
---
title: Phaser 4 Pseudo 3D 레이싱 게임 - 차량 스프라이트를 도로에 붙이기
date: 2026-07-01T20:30:00+09:00
summary: Apex Seoul의 approved 128px 차량 스프라이트를 런타임에 연결하고, 조향 3way, 고저차 접지감, 주행 telemetry, silhouette shadow pass로 실제 게임 화면에서 검증했습니다.
image: /images/posts/202607/apex-seoul-runtime-sprite-shadow.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - pseudo-3d
    - game-art
    - telemetry
    - game-dev
---
```

## 이번 글에서 반드시 말할 구현

### 1. G70 128px approved sprite를 런타임 차량으로 연결

이번 구현의 출발점은 `Genesis G70` POC 128px sprite를 게임 안의 플레이어 차량으로 실제 연결한 것이다.

글에서는 G70이 최종 차량이라는 뉘앙스를 피한다. 현재 G70은 runtime 검증용 기준 차량이다. 최종 공개 asset은 fictional vehicle로 정리할 예정이고, G70/GT86/Stinger는 pose와 pipeline 검증용 reference다.

핵심 구현 파일:

```text
games/apex-seoul/src/main.ts
games/apex-seoul/assets/vehicles/approved/atlases/genesis-g70-poc-128.json
games/apex-seoul/assets/vehicles/approved/sprites/genesis-g70-poc-128.png
```

### 2. Grip 주행은 5way가 아니라 3way

초기에는 steering 값을 5분기 pose 선택으로 확장하려고 했지만, 실제 게임 화면에서는 기본 주행부터 안정적으로 읽히는 것이 먼저였다.

현재 방향:

```text
grip: steer-left-1 / center / steer-right-1
drift/slip future: steer-left-2 / steer-right-2
```

이 부분은 글에서 중요하다. 5way는 멋있지만 평상시 조향에서 너무 많은 yaw가 보이면 차가 도로와 따로 노는 느낌이 난다. OutRun식 감각도 기본 주행에서는 차량을 안정적으로 두고, 강한 pose는 미끄러짐이나 사고 상태에서 열어야 한다.

### 3. 고저차에서 차가 붕 떠 보이는 문제

가장 큰 시행착오는 내리막길에서 차량이 하늘에 떠 있는 것처럼 보인 문제였다.

정리할 관찰:

- 도로 projection만 움직이고 차량 기준선이 그대로 있으면 내리막에서 차가 뜬다.
- 그렇다고 차량 y를 앞쪽 도로 projection에 그대로 붙이면 조작 기준점이 흔들린다.
- pseudo-3D 레이싱에서는 플레이어 차량을 screen contact plane 근처에 안정적으로 두고, 고저차는 도로, horizon, pose, shadow로 읽히게 하는 편이 낫다.

현재 구현 방향:

```text
vehicle Y = fixed screen contact plane + small continuous slope offset
anchorZ = terrain pose/lookahead
contactZ = near road contact/curve/lateral sampling
```

글에서는 `anchorZ`와 `contactZ`를 분리한 이유를 설명한다. 먼 도로를 보고 차량 pose를 고르는 것과, 가까운 노면에 붙어 보이게 만드는 것은 같은 문제가 아니었다.

### 4. Drive telemetry를 넣어 감각을 로그로 보기

이전까지는 "눈으로 보면 이상하다"가 주된 판단이었다. 이번에는 런타임이 직접 주행 상태를 JSONL로 남기게 했다.

브라우저 URL:

```text
/game-assets/apex-seoul/?telemetry=1&telemetryDuration=60&telemetryHz=10
```

분석 명령:

```bash
npm run analyze:drive-telemetry --workspace @games/apex-seoul -- --input <apex-seoul-drive.jsonl>
```

글에 넣을 포인트:

- 처음에는 telemetry recorder가 scene 초기화보다 먼저 viewport를 읽어 `scale.height` undefined 오류가 났다.
- recorder 생성 위치를 `create()` 이후로 옮겨 해결했다.
- summary에 `terrainContactMismatchRatio`, `contactTerrainCue`, `maxVehicleYDeltaSameViewport` 같은 값을 넣었다.
- 실제로 `terrainCue`는 downhill인데 `contactTerrainCue`는 level로 남는 mismatch를 찾았다.
- threshold 판정만으로 y/shadow를 바꾸면 차가 위아래로 튀어서, `contactTerrainRatio` 연속값과 smoothstep 보간으로 바꿨다.

### 5. 그림자는 Phaser Graphics 타원만으로 부족했다

초기 그림자는 둥근 타원 또는 얇은 contact patch였다. 하지만 실제 화면에서는 차 밑에 동그란 얼룩이 생겼고, 차체가 도로에 눌려 붙는 느낌이 부족했다.

시행착오 순서:

```text
Graphics ellipse
-> chassis soft shadow + tire contact patch
-> per-frame shadowProfiles metadata
-> sprite silhouette shadow pass
-> black RGB shadow sprite sheet
```

핵심 결론:

- 그림자는 단순 원형 도형보다 차량 하단 실루엣을 따라가야 한다.
- Canvas renderer의 tint는 원본 색이 회색으로 비쳐 보일 수 있다.
- 그래서 원본 sprite sheet의 alpha만 유지하고 RGB를 검정으로 바꾼 `*-shadow.png`를 별도로 생성했다.

관련 asset:

```text
games/apex-seoul/assets/vehicles/approved/sprites/genesis-g70-poc-128-shadow.png
games/apex-seoul/assets/vehicles/approved/sprites/kia-stinger-poc-128-shadow.png
games/apex-seoul/assets/vehicles/approved/sprites/toyota-gt86-poc-128-shadow.png
games/apex-seoul/assets/vehicles/approved/atlases/genesis-g70-poc-128.json
games/apex-seoul/assets/vehicles/approved/atlases/kia-stinger-poc-128.json
games/apex-seoul/assets/vehicles/approved/atlases/toyota-gt86-poc-128.json
```

### 6. 다른 차량에도 shadow metadata와 shadow sheet를 맞췄다

이번 글에서는 G70이 화면 예시의 중심이지만, pipeline은 G70 전용으로 끝나지 않았다고 써야 한다.

적용된 범위:

- Genesis G70 128px
- Kia Stinger 128px
- Toyota GT86 128px

각 atlas에는 `apex.shadowProfiles`와 `meta.shadowImage`가 들어갔다. 런타임은 현재 G70만 직접 preload하지만, asset 규격은 세 차량 모두 같은 방향으로 정리됐다.

## 사진 구성

블로그는 이미지가 많아야 한다. 이번 글은 구현 설명보다 "왜 이상해 보였고, 어떤 방식으로 바로잡았는지"를 화면으로 보여주는 편이 설득력이 좋다.

### 대표 이미지

파일명:

```text
public/images/posts/202607/apex-seoul-runtime-sprite-shadow.png
```

내용:

- G70 runtime sprite가 도로 위에 있고, 검정 silhouette shadow가 차 아래/앞쪽으로 붙어 있는 화면.
- 가능하면 직선보다 약한 코너 화면이 좋다.
- 너무 확대하지 말고 도로, 차선, 차량, 그림자가 같이 보여야 한다.

Caption:

```markdown
![Apex Seoul runtime G70 sprite with silhouette shadow](/images/posts/202607/apex-seoul-runtime-sprite-shadow.png)
```

### 사진 1: 이전 글과 연결되는 POC 기준선

기존 이미지 재사용:

```text
/images/posts/202606/apex-seoul-real-car-poc-g70.png
/images/posts/202606/apex-seoul-real-car-poc-gt86.png
```

용도:

- "지난 글에서 여기까지 만들었다"를 빠르게 상기시킨다.
- 새 글의 초반에 1장만 사용한다.

Caption:

```markdown
![Apex Seoul real car POC pose sheet](/images/posts/202606/apex-seoul-real-car-poc-g70.png)
```

### 사진 2: approved 128px sprite sheet

촬영 또는 복사 후보:

```text
games/apex-seoul/assets/vehicles/approved/sprites/genesis-g70-poc-128.png
```

게시용 경로:

```text
public/images/posts/202607/apex-seoul-genesis-g70-approved-128.png
```

내용:

- 투명 배경이 잘 안 보이면 magenta 또는 checkerboard 배경에 올린 preview를 만들기.
- center, steer-right-1, downhill, uphill frame이 눈에 들어오게 자르거나 contact sheet로 구성.

Caption:

```markdown
![Genesis G70 approved 128px sprite sheet](/images/posts/202607/apex-seoul-genesis-g70-approved-128.png)
```

### 사진 3: 3way steering runtime contact sheet

게시용 경로:

```text
public/images/posts/202607/apex-seoul-runtime-3way-steering.png
```

내용:

- left / center / right 3장을 한 이미지로 묶는다.
- 같은 도로 위치, 같은 속도에서 frame만 바뀌는 그림이 좋다.
- 이 사진은 "기본 주행은 5way가 아니라 3way" 섹션에 넣는다.

촬영 URL 예시:

```text
/game-assets/apex-seoul/?qaFreeze=1&qaSteer=-1&qaSpeed=520
/game-assets/apex-seoul/?qaFreeze=1&qaSteer=0&qaSpeed=520
/game-assets/apex-seoul/?qaFreeze=1&qaSteer=1&qaSpeed=520
```

### 사진 4: 고저차에서 차가 떠 보였던 문제

게시용 경로:

```text
public/images/posts/202607/apex-seoul-downhill-floating-before.png
```

내용:

- 내리막 구간에서 도로는 내려가는데 차량 기준선과 그림자가 맞지 않아 떠 보이는 화면.
- 너무 나쁜 장면이어도 괜찮다. 이번 글의 문제 정의가 되기 때문이다.

주의:

- 이 이미지는 "실패 이미지"로 써야 한다.
- 캡션에 현재 상태가 아니라 과거 시행착오라고 명확히 쓴다.

Caption:

```markdown
![Apex Seoul downhill floating issue before contact tuning](/images/posts/202607/apex-seoul-downhill-floating-before.png)
```

### 사진 5: telemetry summary 또는 로그 분석 이미지

게시용 경로:

```text
public/images/posts/202607/apex-seoul-drive-telemetry-summary.png
```

내용:

- JSON summary 일부를 코드 블록 screenshot처럼 보여줘도 된다.
- 더 좋게는 `terrainCue`, `contactTerrainCue`, `vehicle.anchor.y`의 before/after를 간단한 표나 그래프로 만든다.

본문에 넣을 수치 예시:

```text
terrainContactMismatchRatio가 높으면 pose lookahead와 contact cue가 다른 경사를 보고 있다는 뜻이다.
maxVehicleYDeltaSameViewport는 viewport resize를 제외한 실제 차량 y 튐을 보는 값이다.
```

### 사진 6: 둥근 그림자 실패 장면

게시용 경로:

```text
public/images/posts/202607/apex-seoul-round-shadow-before.png
```

내용:

- 차 아래에 둥근 원/회색 얼룩처럼 보이는 기존 Graphics shadow.
- 독자가 "아, 붙은 그림자가 아니라 도형이구나"라고 바로 느껴야 한다.

Caption:

```markdown
![Apex Seoul round graphics shadow before silhouette pass](/images/posts/202607/apex-seoul-round-shadow-before.png)
```

### 사진 7: shadow sprite sheet

게시용 경로:

```text
public/images/posts/202607/apex-seoul-shadow-sheet-black-alpha.png
```

내용:

- `genesis-g70-poc-128-shadow.png`를 checkerboard 또는 밝은 배경 위에 올린다.
- 원본 차량 색을 tint로 어둡게 한 것이 아니라, alpha는 유지하고 RGB를 검정으로 만든 별도 sheet임을 보여준다.

Caption:

```markdown
![Black alpha-preserved shadow sheet for G70 sprite](/images/posts/202607/apex-seoul-shadow-sheet-black-alpha.png)
```

### 사진 8: 최종 runtime before/after

게시용 경로:

```text
public/images/posts/202607/apex-seoul-shadow-before-after.png
```

내용:

- 왼쪽: 둥근 Graphics shadow
- 오른쪽: silhouette shadow pass
- 같은 도로, 같은 프레임이면 가장 좋다.

Caption:

```markdown
![Apex Seoul shadow before and after silhouette pass](/images/posts/202607/apex-seoul-shadow-before-after.png)
```

### 사진 9: 전체 파이프라인 다이어그램

게시용 경로:

```text
public/images/posts/202607/apex-seoul-runtime-sprite-pipeline.png
```

내용:

```text
3D POC pose sheet
-> pixel pass
-> approved 128px atlas
-> runtime 3way steering
-> contact/elevation telemetry
-> silhouette shadow sheet
-> runtime QA screenshot
```

다이어그램은 정교할 필요 없다. 이번 글의 결론을 한 장으로 정리하는 용도다.

## 추천 본문 구조

### 1. 들어가며

지난 글에서 실제 차량 3D 모델을 이용해 pose sheet POC를 만들었다고 시작한다. 하지만 스프라이트는 파일로 볼 때와 게임 화면에서 볼 때 전혀 다르게 느껴진다.

첫 문단 후보:

```text
지난 글에서는 GT86, Stinger, G70 3D 모델을 같은 카메라와 같은 pose sheet 규격으로 렌더링했다. 파일만 놓고 보면 꽤 그럴듯했다. 그런데 게임에 넣는 순간 다른 문제가 보였다. 차가 도로 위에 있는 것이 아니라, 도로와 차가 각자 따로 움직이는 것처럼 느껴졌다.
```

### 2. 먼저 G70을 게임 안에 넣었다

G70을 선택한 이유는 최종 차량이라서가 아니라, 런타임 검증용으로 후방 실루엣과 세단형 차체가 잘 드러났기 때문이라고 설명한다.

넣을 코드/파일명:

```text
genesis-g70-poc-128.png
genesis-g70-poc-128.json
PLAYER_VEHICLE_ATLAS
```

### 3. 기본 조향은 3way로 줄였다

5way steering은 드리프트 이후로 미룬다. 기본 grip에서는 3way가 맞다.

본문 포인트:

- 작은 128px sprite에서는 미세한 yaw 차이가 생각보다 크게 보인다.
- 기본 주행에서 강한 조향 pose를 쓰면 차가 미끄러지는 것처럼 보인다.
- grip은 안정, drift/slip은 과장이라는 역할 분리가 필요하다.

### 4. 고저차는 차를 직접 많이 움직이는 문제가 아니었다

이 섹션이 글의 중심이다.

설명할 순서:

1. 내리막에서 도로가 내려가는데 차는 고정되어 떠 보였다.
2. 차를 projected road y에 붙이면 기준점이 흔들려 조작감이 나빠졌다.
3. OutRun식 pseudo-3D 감각에서는 차량을 near contact plane에 두고, 도로와 horizon으로 경사를 보여주는 편이 맞았다.
4. 그래서 `anchorZ`와 `contactZ`를 분리했다.
5. y/shadow는 `contactTerrainRatio` 연속값으로 작게 보정했다.

코드 설명은 짧게 유지한다. 독자가 가져갈 핵심은 "고저차를 물리 좌표처럼 그대로 붙이면 오히려 게임 감각이 깨진다"이다.

### 5. 로그를 남기니 감각 문제가 숫자로 보였다

telemetry URL과 analyzer를 소개한다.

넣을 코드 블록:

```text
/game-assets/apex-seoul/?telemetry=1&telemetryDuration=60&telemetryHz=10
```

```bash
npm run analyze:drive-telemetry --workspace @games/apex-seoul -- --input <apex-seoul-drive.jsonl>
```

본문 포인트:

- `terrainCue`는 차량 pose를 위한 먼 lookahead다.
- `contactTerrainCue`는 그림자와 접지감을 위한 가까운 sample이다.
- 둘이 어긋나면 차체 pose는 내리막인데 그림자는 level처럼 남는다.
- threshold 기반 on/off는 튐을 만들 수 있어 ratio 기반 보간이 필요했다.

### 6. 그림자는 도형이 아니라 차체 실루엣이어야 했다

이 섹션은 사진으로 설득한다.

본문 포인트:

- 처음에는 둥근 ellipse를 썼다.
- 조금 더 나아가 tire contact patch를 추가했다.
- 하지만 차 밑이 도로에 눌리는 느낌은 실루엣 기반 그림자가 훨씬 좋았다.
- Canvas tint는 회색 차체가 비쳐 보일 수 있어 black shadow sheet를 별도로 만들었다.

넣을 짧은 pipeline:

```text
approved sprite alpha
-> RGB black shadow sheet
-> preload as second spritesheet
-> playerShadowCar
-> same frame / same flipX / squashed display
```

### 7. 자동화 방향

이번 글의 마지막은 다음 단계로 자연스럽게 이어져야 한다.

정리할 자동화 루프:

```text
approved atlas/sprite
-> frozen runtime screenshot QA
-> drive telemetry JSONL
-> summary metric
-> shadow/contact review
-> tuning update
```

아직 완전 자동 승인까지 간 것은 아니라고 써야 한다. 현재 목표는 사람이 직접 계속 플레이하며 보는 비용을 줄이는 것이다.

### 8. 마치며

마지막 메시지는 다음처럼 잡는다.

```text
이번 작업을 하고 나니, 차량 스프라이트 품질은 PNG 파일 안에서 끝나지 않는다는 걸 다시 확인했다. 같은 sprite도 도로 projection, 고저차 cue, shadow, camera pitch와 맞지 않으면 게임 안에서는 떠 보인다. 그래서 Apex Seoul의 다음 파이프라인은 "잘 만든 sprite"가 아니라 "게임 안에서 반복 검증되는 sprite" 쪽으로 가야 한다.
```

## 글에서 피해야 할 표현

- G70을 최종 공개 차량으로 확정했다고 쓰지 않는다.
- 실차 모델을 그대로 게임 asset으로 배포한다고 쓰지 않는다.
- telemetry가 조작감을 완전히 판정한다고 과장하지 않는다.
- shadow silhouette pass를 최종 그림자 시스템이라고 단정하지 않는다. WebGL blur/mask 전환 여지가 있다.
- OutRun 원본 sprite를 직접 가져왔다고 쓰지 않는다. 참조한 것은 위치/방향 설계와 감각이다.

## 코드와 명령 스니펫 후보

Telemetry 실행:

```text
/game-assets/apex-seoul/?telemetry=1&telemetryDuration=60&telemetryHz=10
```

Telemetry 수동 export:

```text
telemetryAutoExport=0
L key
```

Telemetry 분석:

```bash
npm run analyze:drive-telemetry --workspace @games/apex-seoul -- --input <apex-seoul-drive.jsonl>
```

QA freeze 촬영:

```text
/game-assets/apex-seoul/?qaFreeze=1&qaSteer=0&qaSpeed=520
/game-assets/apex-seoul/?qaFreeze=1&qaSteer=-1&qaSpeed=520
/game-assets/apex-seoul/?qaFreeze=1&qaSteer=1&qaSpeed=520
```

고저차 테스트:

```text
/game-assets/apex-seoul/?track=elevation-test&terrainScale=0.06&contactZ=220
```

## 사진 촬영 체크리스트

- viewport는 가급적 1200x760으로 고정한다.
- telemetry 비교용 screenshot은 브라우저 크기를 중간에 바꾸지 않는다.
- before/after는 같은 `qaFreeze`, `qaZ`, `qaSteer`, `qaSpeed` 조합으로 찍는다.
- 그림자 이미지는 확대 crop도 필요하다. 전체 화면 1장과 차량 주변 확대 1장을 같이 준비한다.
- 투명 PNG asset은 checkerboard 또는 magenta 배경 preview로 만들어 블로그에 넣는다.
- 실패 장면에는 캡션에서 "before" 또는 "시행착오"라고 명확히 쓴다.

## 발행 전 확인

- `public/images/posts/202607/` 아래 이미지 파일명이 frontmatter와 본문에서 일치하는지 확인한다.
- 기존 글 링크는 `/article/phaser4-apex-seoul-real-car-source-model-poc/`로 연결한다.
- 코드 파일명은 실제 repo 경로와 맞춘다.
- `G70`, `Stinger`, `GT86`은 reference/POC라는 표현을 유지한다.
- 최종 문장에는 다음 단계인 WebGL shadow, drift/slip 5way, runtime QA 자동화를 열어둔다.

