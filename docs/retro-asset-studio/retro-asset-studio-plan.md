# Apex Seoul Retro Asset Studio Plan

이 문서는 Retro Asset Studio의 구현 상태와 남은 계획만 정리한다. 현재 실행 방법은 `README.md`, 파이프라인 분류는 `pipeline-map.md`를 기준으로 한다.

## Implemented

Retro Asset Studio v1은 구현되어 있다.

```text
Three.js / pixel-pass spritesheet
-> ComfyUI img2img + Canny ControlNet
-> palette-lock
-> Phaser postprocess
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

Runtime color swap / postprocess path도 구현되어 있다.

```text
AI retro output
-> magenta-to-alpha
-> palette role audit
-> body palette swap
-> shadow sheet
-> runtime atlas
-> Phaser runtime QA
```

구현된 것:

- `postprocess-ft86-retro-sheet.mjs`가 magenta background를 alpha 0으로 복원한다.
- source alpha와 runtime alpha를 분리해 저장한다.
- limited palette를 `body / tire / outline / shadow / tail-light / amber-light` role로 분류한다.
- `ft86-retro-palette-audit.json`과 false-color role preview를 생성한다.
- body role만 `black / blue / silver / red / yellow` profile로 교체한다.
- FT86 runtime 256px atlas와 alpha shadow sheet를 생성한다.
- Phaser는 URL parameter로 FT86 retro 후보를 선택한다.
- hidden magenta RGB를 제거하고, edge bleed 완화를 위해 주변 transparent pixel에 nearest opaque RGB를 채운다.

## Current Baseline

현재 기준 차량은 FT86이다.

```text
input:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png

ComfyUI baseline:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced.png

runtime baseline:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-blue-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-black-alpha.png
```

Variant 판단:

| Variant | 평가 | 용도 |
| --- | --- | --- |
| `balanced` | 실루엣, 휠, 차체 대비가 가장 균형 좋음 | FT86 v1 기본 후보 |
| `safe` | 원본 보존이 가장 좋지만 변화가 약함 | fallback |
| `stylized` | 디자인 변화는 크지만 전복/휠 하단부가 먹힐 위험 있음 | 실험용 |

## Active Plan

1. FT86 runtime color QA contact sheet를 생성한다.
2. `blue`와 `black`을 black/blue downhill art direction의 실제 기준 후보로 비교한다.
3. `sheet-256-ai-retro-v1-balanced-roles.png`로 body role이 과하게 잡히지 않는지 확인한다.
4. runtime scale에서 edge speckle 또는 halo가 보이면 `cleanEdgeBodyNoise`만 조정한다.
5. base sprite가 안정되면 tail-light glow와 contact shadow를 runtime effect layer로 분리한다.

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
- Playwright Chromium system dependency 문제로 일부 Three.js 렌더 검증이 환경에 따라 막힐 수 있다.

재개 순서:

1. `XG` source files와 필요한 shared `carparts` 목록을 확정한다.
2. JOE-to-glTF 변환 경로를 고른다.
3. `raven-xg-coupe-poc.glb`를 만들고 material name을 `body`, `glass`, `interior`, `wheel`, `tire`, `brake_light`, `reverse_light`로 고정한다.
4. `real-vehicle-poc.json`에 새 preset을 추가하되 기존 `genesis-g70-poc`는 보존한다.
5. pose sheet -> pixel-pass -> canonical ComfyUI/postprocess/runtime QA 순서로 검증한다.
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
