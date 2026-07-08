---
title: ComfyUI 결과를 게임 스프라이트로 쓰기까지 - FT86 palette compiler 만들기
date: 2026-07-08T20:30:00+09:00
summary: Three.js 렌더 보정 이후 ChatGPT 이미지 보정 실험을 로컬 RTX 3080 기반 ComfyUI 파이프라인으로 옮기고, FT86 spritesheet를 Phaser runtime에서 쓸 수 있도록 alpha, palette role, body color swap, edge cleanup 단계로 정리했습니다.
image: /images/posts/202607/apex-seoul-ft86-retro-cover.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - comfyui
    - pixel-art
    - game-art
    - game-dev
---

## 들어가며

[지난 Apex Seoul 글](/article/phaser4-apex-seoul-real-car-source-model-poc/)에서는 GT86, Kia Stinger, Genesis G70 3D 모델을 같은 렌더 파이프라인에 넣고 작은 차량 스프라이트에서 무엇이 잘 읽히는지 비교했다.

그때 FT86 쪽이 가장 괜찮았다.

작고 낮고, 후방 실루엣이 잘 읽혔다.

그 글의 중심은 Three.js 렌더링 보정이었다.

외부 3D 모델을 같은 카메라, 같은 pose sheet, 같은 cell size로 맞추고, 작은 스프라이트에서 차량이 어떻게 읽히는지 보는 작업이었다.

그 다음 문제는 "렌더링은 맞췄는데, 이걸 어떻게 게임용 pixel art 느낌으로 다듬을 것인가"였다.

여기서 ComfyUI가 들어왔다.

이번에는 그 FT86 spritesheet를 **ComfyUI Retro Style Filter**에 통과시킨 뒤, 실제 Phaser runtime에서 쓸 수 있는 게임 asset 후보로 다듬는 작업을 했다.

처음 생각은 단순했다.

```text
Three.js vehicle render
-> ComfyUI retro style filter
-> Phaser spritesheet
```

하지만 실제로는 중간에 훨씬 많은 단계가 필요했다.

```text
ComfyUI output
-> magenta-to-alpha
-> palette role audit
-> body palette swap
-> hidden RGB cleanup
-> edge-only cleanup
-> runtime atlas / shadow 생성
```

이번 글은 그 과정을 정리한 기록이다.

결론부터 말하면, ComfyUI는 좋은 style filter였지만 최종 게임 asset을 만들어주지는 않았다. 게임에 들어가는 마지막 이미지는 결국 asset compiler가 책임져야 했다.

![FT86 retro spritesheet pipeline](/images/posts/202607/apex-seoul-ft86-retro-pipeline.png)

## 왜 갑자기 ComfyUI였나

지난 단계까지는 Three.js 렌더링 보정이 핵심이었다.

차량을 어느 각도에서 찍을지, cell 안에서 얼마나 크게 둘지, 후방 실루엣이 작은 화면에서 읽히는지 같은 문제였다.

그런데 렌더링만으로는 여전히 "3D 모델을 줄인 이미지" 느낌이 남았다.

게임 화면에서는 조금 더 정리된 outline, 제한된 색, 작은 픽셀 디테일이 필요했다.

처음에는 ChatGPT 이미지 생성/보정으로 이 부분을 실험했다.

대화로 방향을 잡기 좋았고, "조금 더 레트로하게", "후면 실루엣은 유지하고", "픽셀카처럼" 같은 감각적인 요청을 빠르게 던져볼 수 있었다.

하지만 게임 asset pipeline으로 쓰기에는 한계가 있었다.

- 같은 조건으로 여러 번 반복하기 어렵다.
- 주간 한도나 세션 상태에 영향을 받는다.
- 어떤 prompt와 parameter로 결과가 나왔는지 프로젝트 안에 남기기 어렵다.
- spritesheet 전체를 안정적으로 같은 규칙으로 처리하기 어렵다.
- 결과를 다시 palette lock, alpha, atlas 생성으로 연결하려면 결국 별도 후처리가 필요하다.

그래서 방향을 바꿨다.

집에 있는 로컬 GPU, RTX 3080을 활용해서 ComfyUI를 돌리고, 이 과정을 repo 안의 스크립트로 호출하기로 했다.

목표는 "AI에게 예쁜 차 이미지를 부탁하기"가 아니었다.

ChatGPT로 하던 이미지 보정 실험을 로컬에서 반복 가능한 **asset compiler 단계**로 옮기는 것이었다.

```text
ChatGPT image correction experiment
-> local RTX 3080 ComfyUI workflow
-> scriptable retro style filter
-> deterministic postprocess
-> Phaser runtime QA
```

이렇게 하면 좋은 점이 있다.

ComfyUI workflow는 파일로 남는다.

parameter는 script에서 관리할 수 있다.

input/output 경로도 repo 안에 고정할 수 있다.

그리고 결과가 마음에 안 들면 "다시 한 장 만들어줘"가 아니라, `denoise`, `cfg`, `ControlNet strength`, `palette ramp`, `edge cleanup`처럼 파이프라인의 어느 단계를 조정할지 나눠서 볼 수 있다.

즉, ComfyUI는 갑자기 나온 새 장난감이 아니라, Three.js 렌더링 보정 다음에 붙인 로컬 이미지 보정 자동화 단계다.

## ComfyUI는 generator가 아니라 style filter로 쓴다

이번 작업에서 가장 먼저 정한 원칙은 이것이다.

ComfyUI가 차량을 새로 그리면 안 된다.

Apex Seoul의 플레이어 차량은 단순한 장식 이미지가 아니다.

- 정면, 측면, 전복 프레임이 정해진 순서로 있어야 한다.
- 각 프레임의 anchor가 맞아야 한다.
- 휠과 차체 위치가 고저차 cue와 맞아야 한다.
- Phaser atlas의 frame id와 runtime steering logic이 맞아야 한다.

즉, AI가 "더 멋진 차"를 그리는 순간 게임 asset으로는 불안해진다.

그래서 ComfyUI workflow는 img2img + Canny ControlNet 중심으로 두었다. 목표는 새 차를 만드는 것이 아니라, 이미 있는 Three.js/pixel-pass spritesheet에 retro pixel detail을 얹는 것이다.

현재 기준 후보는 `balanced` 결과다.

```text
input:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png

selected ComfyUI output:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced.png
```

safe, balanced, stylized 세 후보를 비교했는데, `balanced`가 가장 무난했다.

`safe`는 원본 보존은 좋지만 변화가 약했고, `stylized`는 디자인 변화는 크지만 전복 프레임과 하단부가 먹힐 위험이 있었다.

게임 asset에서는 신기한 한 장보다 반복 가능한 안정성이 더 중요하다.

## setTint는 빠르지만 최종 답이 아니었다

처음에는 Phaser의 `setTint()`를 떠올릴 수 있다.

차량을 빨강, 파랑, 노랑으로 바꾸고 싶다면 texture 하나를 두고 tint만 바꾸면 편하다.

하지만 이 방식은 내가 원하는 결과와 달랐다.

`setTint()`는 차체만 바꾸는 것이 아니라 스프라이트 전체에 색을 곱한다.

그러면 다음 영역까지 같이 물든다.

```text
차체
유리
타이어
outline
후미등
그림자
```

FT86에서 필요한 것은 차체색만 바꾸는 것이다.

유리, 타이어, 후미등, outline은 그대로 남아야 한다.

그래서 색상 변경은 runtime tint가 아니라 **body palette swap**으로 가기로 했다.

```text
body ramp:
silver -> red / blue / yellow

keep:
tire
outline
tail light
amber light
shadow
alpha
```

이 지점부터 작업은 "AI 이미지 생성"보다 "palette compiler"에 가까워졌다.

## 첫 실패: exact RGB replacement와 red speckle

처음 구현은 단순했다.

ComfyUI output은 palette lock 이후 색 수가 제한되어 있으니, body로 보이는 RGB를 다른 ramp로 치환하면 된다고 생각했다.

그런데 `vehicleColor=red`로 띄워보니 차체 위에 빨간 점들이 튀어 보였다.

처음에는 ComfyUI가 red noise를 만든 줄 알았다.

아니었다.

원인은 내 palette mapping이었다.

원본에서 body처럼 보이는 색이 기존 body ramp에 모두 들어 있지 않았다.

```text
원본에서 body처럼 보이던 색:
140,158,166
102,124,134
40,58,70

처음 replacement가 알고 있던 색:
48,60,70
72,86,96
100,116,126
118,132,140
154,166,172
```

즉, 일부 body pixel만 빨강으로 바뀌고 나머지는 회청색으로 남았다.

그 결과 빨간 잡티처럼 보였다.

여기서 배운 것은 간단했다.

색상 교체는 RGB 치환 문제가 아니라, 제한 palette의 각 색이 어떤 **material role**인지 정하는 문제다.

## palette role audit을 만들었다

그래서 후처리 스크립트에 role audit을 넣었다.

```text
games/apex-seoul/scripts/postprocess-ft86-retro-sheet.mjs
```

이 스크립트는 ComfyUI output을 읽고, 각 palette color를 다음 role로 분류한다.

```text
body
tire
outline
shadow
tail-light
amber-light
```

그리고 두 가지 debug output을 만든다.

```text
ft86-retro-palette-audit.json
sheet-256-ai-retro-v1-balanced-roles.png
```

`ft86-retro-palette-audit.json`은 숫자로 보는 보고서다.

현재 기준 role count는 대략 이렇다.

```text
body: 53772
tire: 30837
outline: 22631
tail-light: 1647
shadow: 425
amber-light: 7
```

`sheet-256-ai-retro-v1-balanced-roles.png`는 false-color preview다.

body는 초록, light는 빨강/주황, tire와 outline은 어두운 색으로 보이게 했다.

![FT86 palette role preview](/images/posts/202607/apex-seoul-ft86-retro-role-preview.png)

이 이미지가 생기고 나서야 색상 교체가 안정되기 시작했다.

이전에는 "이 색도 차체 같은데?"라고 눈으로 추측했다면, 이제는 role preview를 보고 어떤 색을 body로 취급할지 결정할 수 있었다.

## magenta-to-alpha 이후에도 RGB는 남는다

ComfyUI에 넣은 입력은 magenta background를 사용했다.

검정 배경보다 마젠타가 낫다.

차량 하단 그림자나 타이어처럼 어두운 영역이 배경과 섞이지 않기 때문이다.

하지만 Phaser에 넣을 최종 spritesheet는 alpha가 필요하다.

그래서 첫 후처리 단계는 단순했다.

```text
#ff00ff -> alpha 0
나머지 픽셀 -> alpha 255
```

여기서 작은 함정이 있었다.

alpha만 0으로 바꾸면 화면에서는 투명해 보인다.

하지만 PNG pixel의 RGB는 그대로 `255,0,255`로 남을 수 있다.

이 값은 WebGL texture sampling이나 scaling에서 edge bleed로 튀어나올 수 있다.

처음 확인했을 때 상태는 이랬다.

```text
alpha 0 픽셀 수: 1070329
alpha 0인데 RGB가 magenta인 픽셀: 1070329
opaque 차량 픽셀 중 투명 magenta와 인접한 픽셀: 5372
```

즉 투명 픽셀 안에 마젠타가 그대로 숨어 있었다.

그래서 `magenta-to-alpha`는 alpha만 바꾸지 않는다.

현재는 다음을 같이 처리한다.

```text
magenta pixel:
RGB 255,0,255 / alpha 255
-> RGB 0,0,0 / alpha 0

차량 edge 주변 transparent pixel:
nearest opaque RGB를 2px radius 안에서 채움
```

이 작업 후에는 hidden magenta가 사라졌다.

```text
transparentMagenta: 0
adjacentMagenta: 0
transparentNearOpaque: 5402
transparentNearOpaqueNonZero: 5402
```

게임 sprite에서는 "보이는 픽셀"만 관리하면 부족하다.

투명 픽셀의 색도 asset 품질에 영향을 준다.

## 5톤에서 3톤으로 줄였다

색상 교체가 안정된 뒤에도 문제가 남았다.

silver, red, blue, yellow 모두 잘 바뀌기는 했다.

하지만 실제 runtime 크기로 보면 차체 위의 shade 차이가 작은 speckle처럼 보였다.

256px source에서는 하이라이트처럼 보이던 픽셀이, 도로 위 작은 차량에서는 얼룩처럼 읽혔다.

그래서 body ramp를 낮은 대비로 조정했고, 최종적으로는 3단계 flat profile로 줄였다.

현재 body ramp는 이렇다.

```text
silver:
58,72,82 / 104,118,126 / 132,146,154

red:
62,28,28 / 108,52,48 / 142,86,74

blue:
30,42,66 / 58,82,116 / 96,126,158

yellow:
76,62,26 / 124,102,42 / 176,154,82
```

결과적으로 색상 후보는 이 정도로 정리됐다.

![FT86 retro color variants](/images/posts/202607/apex-seoul-ft86-retro-color-variants.png)

이 이미지를 보면 색상 변경이 전체 tint가 아니라는 점이 보인다.

타이어와 outline, 후미등은 그대로 있고 차체만 바뀐다.

이것이 `setTint()`를 쓰지 않은 이유다.

## 2톤 profile은 과했다

여기서 한 번 더 욕심을 냈다.

차체 중앙의 shade 패턴이 여전히 얼룩처럼 보이는 듯해서, body-only despeckle과 2톤 profile을 시도했다.

노이즈는 줄었다.

하지만 차체의 맛도 같이 사라졌다.

스프라이트가 안정된 대신 너무 납작해졌다.

사용자가 원한 것은 차체 내부 디테일 제거가 아니라, 테두리 edge에 남는 노이즈 제거에 더 가까웠다.

그래서 2톤 profile은 폐기했다.

이 과정은 꽤 중요한 실패였다.

후처리는 강하게 할수록 쉬워 보인다.

하지만 게임 asset에서는 "얼마나 없앨 것인가"보다 "무엇을 남길 것인가"가 더 어렵다.

## 최종안: edge-only cleanup

현재 최종 방향은 이렇다.

```text
유지:
3단계 flat body profile

폐기:
차체 내부 전체 despeckle
2톤 runtime-clean profile

추가:
투명 배경/outline에 닿은 고립 edge body 픽셀만 outline으로 흡수
```

코드에서는 `cleanEdgeBodyNoise`가 이 역할을 한다.

조건은 보수적으로 잡았다.

```text
대상:
body pixel

조건:
투명 픽셀과 인접
주변 body 연결이 약함
주변 outline/tire 계열 dark pixel이 충분함

결과:
outline color 16,20,25로 흡수
```

이 방식은 차체 내부의 질감은 건드리지 않는다.

edge에 걸린 고립 body pixel만 outline으로 흡수한다.

재생성 후 silver 기준 body 분포는 다시 3톤 구조를 유지한다.

```text
silver body:
132,146,154: 29492
104,118,126: 18555
58,72,82: 3914

outline:
24442
```

2톤으로 뭉갰을 때보다 훨씬 낫다.

차체는 여전히 스프라이트답게 살아 있고, 테두리 주변의 노이즈만 줄었다.

![FT86 edge cleanup runtime scale](/images/posts/202607/apex-seoul-ft86-retro-edge-clean-runtime.png)

## Phaser runtime에는 URL parameter로 연결했다

기본 player vehicle은 아직 Genesis G70 approved asset을 유지한다.

FT86 retro 후보는 URL parameter로만 선택한다.

```text
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=silver
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=red
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=blue
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=yellow
```

QA freeze와 함께 쓰면 같은 도로/카메라 상태에서 색상 후보를 비교할 수 있다.

```text
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=red&qaFreeze=1&qaSteer=0&qaSpeed=440&qaZ=1200
```

후처리 스크립트는 runtime atlas와 shadow sheet도 같이 만든다.

```text
sheet-256-ai-retro-v1-balanced-alpha.png
sheet-256-ai-retro-v1-balanced-red-alpha.png
sheet-256-ai-retro-v1-balanced-blue-alpha.png
sheet-256-ai-retro-v1-balanced-yellow-alpha.png
sheet-256-ai-retro-v1-balanced-alpha-shadow.png
ft86-retro-runtime-256.json
```

`capture-runtime-vehicle-qa.mjs`에도 `--vehicle`, `--vehicle-colors` 옵션을 추가했다.

다만 현재 WSL 환경에서는 Windows Edge headless capture가 `UtilBindVsockAnyPort` 오류로 막혀 있어 screenshot contact sheet 생성은 보류했다.

manifest-only URL matrix는 남겨두었다.

```bash
npm run qa:ft86-runtime-colors --workspace @games/apex-seoul -- --manifest-only
```

## 이번 작업의 결론

처음에는 ComfyUI 결과를 받아서 Phaser에 넣으면 끝날 줄 알았다.

하지만 게임에서 쓰려면 그 사이에 compiler가 필요했다.

이번 FT86 작업에서 만든 compiler 단계는 대략 이렇다.

```text
1. magenta background를 alpha로 복원한다.
2. hidden magenta RGB를 제거한다.
3. transparent edge pixel에 가까운 opaque RGB를 채운다.
4. palette color를 body/tire/outline/light role로 나눈다.
5. body role만 색상별 ramp로 교체한다.
6. runtime scale에서 튀는 body ramp를 3단계로 줄인다.
7. 과한 2톤 정리는 폐기한다.
8. edge-only cleanup만 남긴다.
9. runtime atlas와 shadow sheet를 생성한다.
```

이 작업을 하고 나니 ComfyUI의 위치가 더 분명해졌다.

ComfyUI는 좋은 style filter다.

하지만 게임 asset의 마지막 책임자는 아니다.

마지막 책임자는 source truth, palette role, alpha, edge, atlas metadata를 알고 있는 asset compiler다.

다음 작업은 두 갈래다.

하나는 FT86 후보를 더 제대로 QA하는 것이다.

- runtime color contact sheet 생성
- Phaser texture filtering / pixelArt 설정 확인
- edge cleanup 조건 미세 조정

다른 하나는 보류해둔 VDrift XG / Raven XG Coupe 라인이다.

다만 그 작업은 아직 시작하지 않는다.

FT86 postprocess path가 충분히 안정된 뒤에 다시 보는 편이 맞다.

이번에는 여기까지다.

AI가 이미지를 만들어주는 것보다, AI가 만든 이미지를 게임 안에서 버틸 수 있는 asset으로 정리하는 일이 더 오래 걸렸다.

그리고 아마 이쪽이 진짜 게임 개발에 가까운 일 같다.
