# Next GPT Handoff: FT86 Retro Sprite Pipeline

이 문서는 세션 전환 때 다음 Codex/GPT에게 넘길 최신 handoff다.

## Prompt

```text
너는 `blog.yeppyshiba.com` repo를 함께 보는 Codex/GPT다.

현재 작업 위치:

repo: /home/monoless/wsl-projects/blog.yeppyshiba.com
ComfyUI bridge: docs/retro-asset-studio/scripts/run-retro-filter.mjs
current guide: docs/retro-asset-studio/README.md
pipeline map: docs/retro-asset-studio/pipeline-map.md
visual direction: docs/apex-seoul-visual-direction.md

현재 목표:

Apex Seoul 차량 sprite 생성 파이프라인을 FT86 기준으로 안정화한다.
최종 art direction은 black/blue dreamlike Seoul downhill이다.
ComfyUI는 generator가 아니라 style filter로만 쓴다.

Canonical pipeline:

Three.js pose sheet / pixel candidate
-> ComfyUI img2img + Canny ControlNet style filter
-> palette-lock
-> postprocess-ft86-retro-sheet
-> runtime screenshot QA

현재 FT86 입력:

games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png

현재 ComfyUI baseline:

games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced.png

현재 runtime art-direction 후보:

games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-blue-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-black-alpha.png

현재 구현 상태:

* `run-retro-filter.mjs`는 `ft86 / g70 / stinger` vehicle preset을 가진다.
* `run-retro-filter.mjs`는 `safe / balanced / stylized / all` variant preset을 가진다.
* ComfyUI URL은 `COMFYUI_URL`, `COMFY_URL`, `--comfy-url`로 override 가능하고 기본값은 `http://127.0.0.1:8188`이다.
* workflow 변환은 `workflow.mjs`가 담당한다.
* `CLIPTextEncode`의 `widgets_values` -> `inputs.text` 매핑은 해결되어 있다.
* 다운로드 후 `palette-lock.mjs`가 기본 실행된다.
* QA 기반 wheel ellipse correction은 기본 비활성화 상태를 유지해야 한다.
* `postprocess-ft86-retro-sheet.mjs`가 magenta-to-alpha, role audit, body palette swap, shadow, runtime atlas를 생성한다.
* body palette는 black / blue / silver / red / yellow profile을 가진다.
* Phaser runtime은 `?vehicle=ft86-retro&vehicleColor=blue|black|silver|red|yellow` URL parameter로 선택한다.

중요한 제약:

* G70/VDrift XG 구현으로 넘어가지 않는다.
* source model, `real-vehicle-poc.json`, Phaser runtime import를 바꾸지 않는다.
* wheel ellipse correction을 다시 켜지 않는다.
* FT86의 원래 실루엣과 viewpoint를 유지한다.
* `setTint()` 기반 색상 변경은 최종안으로 쓰지 않는다.
* base sprite에는 glow, bloom, scene light, ground shadow를 굽지 않는다.

다음 작업 후보:

1. `npm run qa:ft86-runtime-colors --workspace @games/apex-seoul`로 runtime color contact sheet를 생성한다.
2. `blue`와 `black`을 실제 art-direction baseline으로 비교한다.
3. `sheet-256-ai-retro-v1-balanced-roles.png`로 body/glass/tire/light role 분류를 검토한다.
4. edge 문제가 보이면 ComfyUI가 아니라 `postprocess-ft86-retro-sheet.mjs`의 `cleanEdgeBodyNoise`와 Phaser texture filtering/display scale을 확인한다.
5. base sprite가 승인되면 tail-light glow/contact shadow를 runtime effect layer로 분리한다.
```

## Quick Commands

```bash
cd docs/retro-asset-studio
npm run ping
npm run run:ft86:balanced

cd ../..
npm run postprocess:ft86-retro --workspace @games/apex-seoul
npm run qa:ft86-runtime-colors --workspace @games/apex-seoul -- --manifest-only
```

## Current Approval URLs

```text
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=blue
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=black
```

Use `qaFreeze`, `qaSteer`, `qaSpeed`, and `qaZ` for deterministic frame checks.
