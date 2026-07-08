# Apex Seoul Retro Asset Studio Plan

이 문서는 `docs/retro-asset-studio`의 현재 작업 기준과 이후 진행 순서를 정리한다. merge 이전의 "구현 전 정리" 상태는 종료됐고, v1 자동화는 이미 동작한다.

## Current State

Retro Asset Studio v1은 ComfyUI를 차량 생성기가 아니라 style filter로 사용한다.

```text
Three.js / pixel-pass spritesheet
-> ComfyUI img2img + Canny ControlNet
-> palette-lock
-> Phaser용 후처리
```

구현된 것:

- ComfyUI `/system_stats`, `/upload/image`, `/prompt`, `/history`, `/view` API 연결
- WSL loopback fallback 및 `COMFYUI_URL` / `COMFY_URL` / `--comfy-url` override
- ComfyUI UI workflow JSON을 `/prompt` API prompt로 변환
- `CLIPTextEncode` prompt text widget mapping
- `ft86`, `g70`, `stinger` vehicle preset
- `safe`, `balanced`, `stylized`, `all` variant preset
- download 후 `palette-lock.mjs` 기반 제한 palette 후처리
- QA wheel ellipse correction 기본 비활성화

현재 기준 차량은 FT86이다. G70/VDrift XG 교체는 계획만 남기고 구현은 보류한다.

## Current Baseline: FT86

```text
input:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png

transparent/source candidate:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256.png

qa:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256.qa.json

runtime alias candidate:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png

current baseline:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced.png
```

Variant 판단:

| Variant | 평가 | 용도 |
| --- | --- | --- |
| `balanced` | 실루엣, 휠, 배경, 차체 대비가 가장 균형 좋음 | FT86 v1 기본 후보 |
| `safe` | 원본 보존이 가장 좋지만 변화가 약함 | fallback |
| `stylized` | 디자인 변화는 크지만 전복/휠 하단부가 먹힐 위험 있음 | 실험용 |

## Commands

```bash
cd docs/retro-asset-studio
npm run ping
npm run dry-run
npm run run:ft86
npm run run:ft86:safe
npm run run:ft86:balanced
npm run run:ft86:stylized
npm run run:ft86:variants
```

비교용 기존 vehicle preset:

```bash
npm run run:g70
npm run run:stinger
npm run run:all
```

주의:

- `--vehicle all`에서는 `--input` / `--output` override 금지
- `--variant all`에서는 명시 `--output` 금지
- wheel ellipse correction 재활성화 금지
- `setTint()`는 최종 차체색 교체 방식으로 쓰지 않음

## v1.5 Plan: Runtime Color Swap

이 단계는 구현됐다. 핵심은 ComfyUI 튜닝이 아니라 게임용 후처리다.

```text
AI retro output
-> magenta-to-alpha
-> palette role audit
-> body palette swap
-> Phaser runtime QA
```

현재 구현:

1. `postprocess-ft86-retro-sheet.mjs`가 `#ff00ff` magenta background를 alpha 0으로 복원한다.
2. source alpha와 runtime alpha를 분리해 저장한다.
3. limited palette를 `body / tire / outline / shadow / tail-light / amber-light` role로 분류한다.
4. `ft86-retro-palette-audit.json`과 false-color role preview를 생성한다.
5. body role만 silver / red / blue / yellow flat 3-shade profile로 교체한다.
6. FT86 runtime 256px atlas와 alpha shadow sheet를 생성한다.
7. Phaser는 URL parameter로만 FT86 retro 후보를 선택한다.
8. alpha 0 픽셀의 hidden magenta RGB를 제거하고, 차량 가장자리 주변 투명 픽셀에 nearest opaque RGB를 채워 edge bleed를 줄인다.
9. 차체 내부 디테일은 유지하고, 투명 배경/outline에 닿은 고립 edge body 픽셀만 outline으로 흡수한다.

교체 대상:

```text
body role
```

유지 대상:

```text
glass
tire
rim
tail light
outline
alpha
```

Runtime QA URL:

```text
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=red&qaFreeze=1&qaSteer=0&qaSpeed=440&qaZ=1200
```

다음 판단:

1. `sheet-256-ai-retro-v1-balanced-roles.png`로 role 분류가 맞는지 확인한다.
2. 경계선이 계속 보이면 Phaser texture filtering/pixelArt 설정 또는 runtime display scale을 확인한다.
3. Windows/WSL browser capture 문제가 해결되면 `qa:ft86-runtime-colors`로 contact sheet를 생성한다.
4. edge cleanup이 너무 강하거나 약하면 ComfyUI가 아니라 `postprocess-ft86-retro-sheet.mjs`의 `cleanEdgeBodyNoise` 조건만 조정한다.

## Deferred Plan: VDrift XG / Raven XG Coupe

G70 계열 입력 모델의 문제는 ComfyUI보다 source asset의 part/material separation에 가깝다. 그래서 VDrift `XG`를 fictional coupe proxy로 검토했다.

현재 선택:

```text
selected VDrift candidate: XG
fictional preset id: raven-xg-coupe-poc
source manifest: games/apex-seoul/assets/vehicles/source/manifests/vdrift-coupe-intake.json
```

보류 이유:

- FT86 후처리와 runtime color QA가 먼저다.
- VDrift JOE mesh를 GLB로 변환하는 반복 가능한 경로가 아직 없다.
- VDrift GPL-3.0 asset 배포 영향 확인이 필요하다.
- Playwright Chromium system dependency 문제로 현재 Codex 셸에서 Three.js 렌더 검증이 막혀 있다.

다시 시작할 때의 순서:

1. `XG` source files와 필요한 shared `carparts` 목록을 확정한다.
2. JOE-to-glTF 변환 경로를 고른다.
3. `raven-xg-coupe-poc.glb`를 만들고 material name을 `body`, `glass`, `interior`, `wheel`, `tire`, `brake_light`, `reverse_light`로 고정한다.
4. `real-vehicle-poc.json`에 새 preset을 추가하되 기존 `genesis-g70-poc`는 보존한다.
5. pose sheet -> pixel-pass -> ComfyUI retro filter -> approved atlas 순서로 검증한다.
6. runtime import는 새 asset이 승인된 뒤에만 교체한다.

중단 가능한 checkpoint:

```text
checkpoint 1: XG source files downloaded and license note written
checkpoint 2: JOE parser/converter produces inspectable GLB
checkpoint 3: GLB material names are semantic
checkpoint 4: raven-xg-coupe 256px pixel candidate exists
checkpoint 5: ComfyUI retro output exists without circular tire artifacts
checkpoint 6: approved atlas/sprite exported
checkpoint 7: runtime imports switched from genesis-g70-poc to raven-xg-coupe-poc
```
