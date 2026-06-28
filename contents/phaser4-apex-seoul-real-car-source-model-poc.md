---
title: Phaser 4 Pseudo 3D 레이싱 게임 — 실제 차량 3D 모델로 스프라이트 POC 하기
date: 2026-06-28T20:30:00+09:00
summary: Apex Seoul 차량 스프라이트 품질을 올리기 위해 GT86, Kia Stinger, Genesis G70 3D 모델을 source로 가져와 실제 전장 기준으로 정렬하고, 후처리 자동화 방향을 다시 잡았습니다.
image: /images/posts/202606/apex-seoul-real-car-poc-gt86.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - pseudo-3d
    - game-art
    - 3d-modeling
    - game-dev
---

## 들어가며

[지난 글](/article/phaser4-apex-seoul-raven-coupe-sprite-pipeline/)에서는 **Apex Seoul**의 차량 스프라이트를 만들기 위해 3D pose sheet를 만들고, GPT 이미지 생성을 거쳐 레트로 차량 sprite sheet 후보를 만들었다.

결과는 나쁘지 않았다.

하지만 계속 볼수록 찜찜했다.

차량이 게임 자산처럼 안정적으로 읽히기보다는, "한 번 잘 나온 이미지"에 가까웠다. 포즈 순서, alpha, anchor, 차량 디테일을 모두 통제해야 하는 게임 스프라이트로는 아직 불안했다.

특히 `Raven Coupe`의 목표가 FT86풍 compact FR coupe라면, 지금 절차형 모델이나 Kenney 모델만 붙잡고 개선하는 것보다 실제 차의 3D 모델을 기준선으로 삼아보는 편이 낫겠다고 판단했다.

이번에는 그 시행착오를 정리한다.

- GT86, Kia Stinger, Genesis G70 모델을 받아본다.
- 기존 pose sheet 렌더러에 외부 GLB를 넣을 수 있게 한다.
- 모델마다 제각각인 축, 방향, 크기를 보정한다.
- 실제 차량 전장 기준으로 상대 크기를 맞춘다.
- 결과를 보고 후처리 자동화 방향을 다시 정한다.

결론부터 말하면, 플레이어 차량 기준선은 GT86 쪽이 가장 좋았다.

![Apex Seoul GT86 POC pose sheet](/images/posts/202606/apex-seoul-real-car-poc-gt86.png)

## 왜 실제 차량 모델을 봤나

Raven Coupe는 실존 차량을 복제하려는 차가 아니다.

하지만 완전히 허공에서 만든 차도 아니다.

목표는 이쪽이었다.

```text
fictional lightweight NA rear-wheel-drive compact FR coupe
```

말로는 쉽다.

그런데 작은 후방 스프라이트에서는 몇 픽셀 차이로 차의 인상이 바뀐다.

- 루프가 높으면 해치백처럼 보인다.
- 트렁크가 길면 세단처럼 보인다.
- 휠베이스가 길면 GT car처럼 보인다.
- 후미등 위치가 애매하면 그냥 흰 덩어리처럼 보인다.

GPT에게 "FT86풍"이라고 말해도, source pose model이 미래형이면 결과도 그쪽으로 끌려간다.

그래서 이번에는 반대로 접근했다.

실제 GT86, Stinger, G70 모델을 같은 카메라, 같은 pose, 같은 cell size로 렌더링한 뒤, 작은 스프라이트에서 무엇이 잘 읽히는지 보려고 했다.

이 모델을 최종 게임 자산으로 그대로 쓰겠다는 뜻은 아니다.

용도는 기준선이다.

## 다운로드한 모델

Sketchfab에서 직접 GLB를 받아 프로젝트에 넣었다.

```text
games/apex-seoul/assets/vehicles/toyota_gt86.glb
games/apex-seoul/assets/vehicles/kia_stinger.glb
games/apex-seoul/assets/vehicles/genesis_g70.glb
```

파일 크기도 꽤 달랐다.

```text
toyota_gt86.glb   2.1M
kia_stinger.glb    29M
genesis_g70.glb    40M
```

GT86은 가볍고 다루기 좋았다.

Stinger와 G70은 텍스처와 geometry가 더 무거웠고, 렌더링도 더 오래 걸렸다.

이 차이는 나중에 자동화할 때도 중요했다.

큰 GLB를 병렬로 여러 개 렌더하면 로컬 정적 서버 fetch가 끊길 수 있었다. 그래서 실제 차량 POC 렌더는 순차 실행으로 바꿨다.

### 모델 출처와 라이선스

세 모델 모두 Sketchfab에서 받은 GLB이며, 파일 내부 `asset.extras` 기준으로 라이선스는 **CC-BY-4.0**이다.

| POC 모델 | 원본 모델 | 저자 | 라이선스 |
| --- | --- | --- | --- |
| GT86 | [Toyota GT86](https://sketchfab.com/3d-models/toyota-gt86-f02c802c32994b2784fa182a9ed71f84) | [Nieve5677](https://sketchfab.com/iori308408) | [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) |
| Kia Stinger | [Kia Stinger](https://sketchfab.com/3d-models/kia-stinger-b1493e68069f4b869743de7a4220a4f4) | [Car2022](https://sketchfab.com/Car2022) | [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) |
| Genesis G70 | [Genesis G70](https://sketchfab.com/3d-models/genesis-g70-ded2c8428fb9499ebd2bfc69c5592b02) | [Lucas.Karlsmoen](https://sketchfab.com/Lucas.Karlsmoen) | [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/) |

이 POC에서는 세 모델을 최종 배포용 게임 자산이 아니라 렌더링 기준선과 후처리 실험용 source로만 사용했다. 실차명, 제조사명, 엠블럼, 외형 trade dress는 별도 검토가 필요하므로, 최종 게임 자산은 fictional vehicle로 다시 정리하는 쪽이 안전하다.

## 첫 번째 문제: 렌더러가 Kenney 모델만 알고 있었다

기존 렌더러는 Kenney Car Kit의 모델 이름만 받았다.

```js
const modelPath = `assets/vehicles/kenney-car-kit/Models/GLB format/${config.model}.glb`;
```

외부 모델을 넣으려면 경로를 직접 받을 수 있어야 했다.

그래서 `--model-path` 옵션을 추가했다.

```bash
npm run render:vehicle-pose-sheet --workspace @games/apex-seoul -- \
  --model toyota-gt86-poc \
  --model-path assets/vehicles/toyota_gt86.glb \
  --vehicle-id toyota-gt86-poc \
  --output assets/vehicles/generated/pose-sheets/poc-toyota-gt86-raw.png
```

이 정도면 쉽게 끝날 줄 알았다.

하지만 바로 다음 문제가 나왔다.

## 두 번째 문제: 모델마다 축이 다르다

3D 모델은 모두 GLB였지만, 좌표계가 같지는 않았다.

원본 bounding box를 확인해보니 대략 이런 식이었다.

```text
GT86
- length axis: Z
- height axis: Y

Stinger
- length axis: Z
- height axis: Y

G70
- length axis: Y
- height axis: Z
```

GT86과 Stinger는 그래도 일반적인 차 모델처럼 서 있었다.

G70은 누워 있었다.

처음 렌더링하면 이런 식으로 나왔다.

```text
차가 옆으로 누운 상태로 보인다.
후방 pose sheet가 아니라 바닥면을 보는 그림이 된다.
```

그래서 모델별로 회전 보정이 필요했다.

GT86은 후방이 아니라 앞면이 카메라를 보고 있어서 yaw 180도가 필요했다.

```text
toyota-gt86-poc
- yaw offset: 180
```

G70은 더 복잡했다.

단순히 pitch만 돌리면 서긴 하지만, 후방과 상하 방향이 동시에 맞지 않았다. 결국 mirror scale까지 필요했다.

```text
genesis-g70-poc
- pitch offset: 90
- scaleX: -1
- scaleZ: -1
```

이런 보정값은 명령어에 계속 적기보다 manifest로 관리하는 편이 낫다.

그래서 `real-vehicle-poc.json`을 만들었다.

```text
games/apex-seoul/assets/vehicles/source/manifests/real-vehicle-poc.json
```

## 세 번째 문제: 모든 차를 같은 크기로 맞추면 안 된다

기존 렌더러는 모델의 가장 큰 축을 기준으로 항상 같은 크기로 맞췄다.

```js
const maxDimension = Math.max(size.x, size.y, size.z);
target.scale.setScalar(2.2 / maxDimension);
```

임시 모델 하나만 쓸 때는 괜찮다.

하지만 GT86, Stinger, G70을 비교하려면 틀렸다.

실제 Stinger는 GT86보다 길다.

그런데 max dimension 기준으로 모두 같은 크기로 맞추면, 세 차의 전장 차이가 사라진다.

이번 POC의 목적은 "실제 차량 실루엣을 기준선으로 삼는 것"이다. 그러면 상대 크기도 보존해야 한다.

그래서 `vehicle-length` scale mode를 추가했다.

기준은 GT86으로 잡았다.

```text
reference vehicle: GT86
reference length: 4.24m
reference render length: 2.2 units
```

차량별 실제 전장은 이렇게 넣었다.

```text
GT86: 4.24m
Stinger: 4.83m
G70: 4.69m
```

이제 Stinger는 GT86보다 실제 비율만큼 길게 렌더링된다.

반대로 각 모델을 cell에 꽉 채우는 자동 fit은 하지 않는다.

같은 카메라 frame 안에 넣어야 상대 크기가 보인다.

그래서 `--frame-size-units`도 추가했다.

```bash
--scale-mode vehicle-length \
--vehicle-length-m 4.24 \
--reference-length-m 4.24 \
--reference-length-units 2.2 \
--frame-size-units 2.95
```

## 네 번째 문제: center 보정 버그

Stinger를 처음 렌더링했을 때 거의 아무것도 보이지 않았다.

이미지가 비어 있는 줄 알았다.

원인은 normalize 코드였다.

기존 코드는 center를 뺀 뒤 scale을 적용했다.

```js
target.position.sub(center);
target.scale.setScalar(scale);
```

원점에서 멀리 떨어져 있는 GLB에서는 이 방식이 틀어질 수 있다.

scale이 적용된 뒤에도 position 보정이 원본 단위 기준으로 남아 있기 때문이다.

그래서 center 보정을 scale과 함께 계산하도록 바꿨다.

```js
target.scale.set(scaleX, scaleY, scaleZ);
target.position.set(
  -center.x * scaleX,
  -center.y * scaleY,
  -center.z * scaleZ
);
```

이걸 고치고 나니 Stinger도 정상적으로 화면에 들어왔다.

## 반복 실행 스크립트

최종적으로 세 모델 POC 렌더는 manifest 기반으로 반복 실행할 수 있게 했다.

```bash
npm run render:real-vehicle-pocs --workspace @games/apex-seoul
```

내부적으로는 세 모델을 순차 렌더링한다.

```text
Rendering toyota-gt86-poc
Rendering kia-stinger-poc
Rendering genesis-g70-poc
```

산출물은 다음과 같다.

```text
games/apex-seoul/assets/vehicles/generated/pose-sheets/poc-toyota-gt86-scaled.png
games/apex-seoul/assets/vehicles/generated/pose-sheets/poc-kia-stinger-scaled-rear.png
games/apex-seoul/assets/vehicles/generated/pose-sheets/poc-genesis-g70-scaled-final.png
```

## GT86 결과

GT86은 가장 의도에 가까웠다.

![Apex Seoul GT86 POC pose sheet](/images/posts/202606/apex-seoul-real-car-poc-gt86.png)

좋았던 점은 명확했다.

- 후방 실루엣이 작고 낮다.
- 루프라인이 compact coupe로 읽힌다.
- 트렁크가 너무 길지 않다.
- `steer-right-1`, `steer-right-2`에서 차체 방향 차이가 잘 보인다.
- 플레이어 차량으로 써도 화면을 과하게 차지하지 않는다.

물론 그대로 쓰기에는 너무 사진풍이다.

하지만 Raven Coupe의 source 기준선으로는 충분히 좋다.

이제 해야 할 일은 GT86을 그대로 복제하는 것이 아니라, GT86에서 읽히는 비율을 Raven Coupe의 fictional sprite로 번역하는 것이다.

## Stinger 결과

Stinger는 훨씬 길게 읽힌다.

![Apex Seoul Stinger POC pose sheet](/images/posts/202606/apex-seoul-real-car-poc-stinger.png)

이건 단점이라기보다 성격 차이다.

Stinger는 플레이어의 입문형 compact coupe라기보다 더 큰 fastback GT처럼 보인다.

그래서 플레이어 차량보다는 다음 역할이 맞아 보인다.

- 라이벌 차량
- 상위 클래스 차량
- 고속 직선형 차량
- 보스 차량

실제 전장 기준으로 렌더링하니 이 차이가 바로 보였다.

만약 모든 차량을 cell에 꽉 맞췄다면, 이런 차이를 놓쳤을 것이다.

## G70 결과

G70도 최종적으로 후방 기준 pose sheet를 만들 수 있었다.

![Apex Seoul G70 POC pose sheet](/images/posts/202606/apex-seoul-real-car-poc-g70.png)

하지만 Raven Coupe 기준선으로는 GT86보다 약했다.

후방 실루엣이 명확하긴 하지만, 작은 스프라이트에서는 "compact FR coupe"보다는 "세단"으로 읽힌다.

또 원본 모델의 축이 달라 보정이 가장 까다로웠다.

```text
pitch offset: 90
scaleX: -1
scaleZ: -1
```

이런 mirror 보정까지 필요하다는 것은, 외부 GLB를 사용할 때 단순히 파일만 바꿔 끼울 수 없다는 뜻이다.

모델별 metadata가 꼭 필요하다.

## 여기서 다시 후처리 방향을 정했다

지난 글에서는 GPT 이미지 변환을 꽤 크게 봤다.

이번 POC를 하고 나니 방향이 더 분명해졌다.

최종 런타임 자산은 다음 경로로 가야 한다.

```text
3D source render
-> deterministic pixel pass
-> palette / outline / alpha QA
-> optional GPT review
-> manual touch-up
-> approved sprite
```

GPT는 계속 쓸 수 있다.

하지만 역할은 바뀐다.

이전에는 "이 pose sheet를 레트로 sprite sheet로 바꿔줘"에 가까웠다.

이제는 이렇게 쓴다.

```text
이 후보가 pseudo-3D racing sprite로 읽히는지 검토해줘.
이미지를 새로 만들지 말고 수정 checklist를 줘.
```

즉 GPT는 생성기가 아니라 리뷰어다.

최종 asset은 deterministic script와 사람이 통제한다.

## PerfectPixel에서 힌트를 얻었다

이 방향을 정리하면서 [PerfectPixel Studio](https://github.com/qlazzarus/perfectpixel-studio)도 참고했다.

PerfectPixel은 캐릭터 sprite generation studio다.

우리처럼 차량 pose sheet를 만드는 도구는 아니다.

하지만 철학이 잘 맞았다.

```text
AI가 이미지를 만들 수는 있다.
하지만 게임에 넣을 수 있는 sprite로 만드는 것은 deterministic post-processing의 일이다.
```

README에서 설명하는 구조도 흥미로웠다.

- chroma matting
- projection profile + DP frame segmentation
- alpha-weighted centroid alignment
- shared palette quantization
- grid snap
- score-based quality validation

이 중에서 Apex Seoul에 바로 참고할 만한 것은 세 가지다.

첫 번째는 shared palette quantization이다.

pose마다 따로 색을 줄이면 차량 색이 흔들린다. GT86 11개 pose 전체에서 공통 palette를 뽑아야 한다.

두 번째는 alpha-weighted centroid다.

단순 bbox center를 anchor로 쓰면 휠이나 범퍼 때문에 중심이 흔들릴 수 있다. 차량도 차체 질량 중심과 하단 baseline을 같이 봐야 한다.

세 번째는 score report다.

사람이 보기 전에 script가 탈락시킬 수 있어야 한다.

예를 들면 이런 식이다.

```text
score starts at 100
-15 if anchor x jitter exceeds threshold
-15 if steer-right-1 and steer-right-2 are too similar
-10 if semi-transparent base pixels exceed threshold
-10 if rear light pixels are lost
-10 if palette color count exceeds target
```

PerfectPixel 전체를 도입하지는 않는다.

Go/Wails 앱 전체는 지금 파이프라인보다 무겁다.

대신 알고리즘 구조만 참고해 `scripts/pixel-pass-vehicle-sheet.mjs`와 `scripts/score-vehicle-sprite-sheet.mjs` 쪽으로 옮길 생각이다.

## 다음 단계

이제 다음 작업은 명확하다.

GT86 POC sheet를 기준으로 pixel pass를 만든다.

처음부터 모든 차량을 처리하지 않는다.

먼저 GT86만 한다.

```text
input:
  assets/vehicles/generated/pose-sheets/poc-toyota-gt86-scaled.png

outputs:
  assets/vehicles/generated/pixel-candidates/gt86-96/
  assets/vehicles/generated/pixel-candidates/gt86-128/
```

1차 후보는 두 가지로 만든다.

- 96px cell
- 128px cell

둘 다 해봐야 한다.

너무 작으면 후미등과 휠 arch가 사라진다.

너무 크면 사진풍 디테일이 남아 스프라이트처럼 보이지 않는다.

후처리 순서는 이렇게 잡는다.

```text
1. fixed 3x4 cell split
2. alpha cleanup
3. low-res downscale
4. shared palette extraction
5. palette quantization
6. grid snap
7. outline pass
8. alpha harden
9. magenta preview
10. QA / score report
```

score가 일정 기준을 넘으면 그때 Pixelorama에서 수동 보정을 한다.

수동 보정도 11개 pose를 한 번에 하지 않는다.

처음에는 세 개만 본다.

```text
center
steer-right-1
steer-right-2
```

이 세 개가 도로 위에서 읽히면 나머지 uphill, downhill, spin pose로 확장한다.

## 정리

이번 작업은 겉으로 보면 "차량 모델 세 개를 받아서 렌더링해봤다" 정도다.

하지만 실제로는 중요한 방향 전환이었다.

지난 글의 결론은 이랬다.

```text
3D pose sheet + GPT image generation + cleanup
```

이번에는 이렇게 바뀌었다.

```text
실제 차량 3D 모델로 source 기준선 확보
-> 실제 전장 기준 scale
-> 모델별 축/방향 metadata
-> deterministic pixel pass
-> GPT는 review/reference로 제한
```

이제 Apex Seoul의 차량 스프라이트는 "잘 나온 이미지 한 장"에 기대지 않는다.

다시 렌더링할 수 있고, 다시 후처리할 수 있고, 다시 검증할 수 있는 파이프라인으로 가야 한다.

다음 글에서는 GT86 pose sheet를 실제 pixel candidate로 바꾸는 첫 번째 pass를 구현해볼 예정이다.
