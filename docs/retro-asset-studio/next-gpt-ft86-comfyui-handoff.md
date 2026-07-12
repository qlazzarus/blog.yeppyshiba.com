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
* Windows ComfyUI는 `http://192.168.0.17:8188`에서 확인되었고, ComfyUI `0.26.2` / RTX 3080에서 API 실행까지 성공했다.
* FT86 balanced 고정 시드(`464901062956189`) 실행은 약 78초에 성공했다. 출력 다운로드와 palette lock도 검증했다.
* `safe` 비교군은 생성됐지만, 현재 balanced 결과는 여전히 런타임 승인 전이다. 표면이 너무 현실적이고 일부 pose의 viewpoint가 목표보다 강하게 변한다.
* `run-retro-filter.mjs`는 명시 CLI experiment override가 variant preset에 덮어써지던 버그를 수정했다. `--controlnet-strength`, `--controlnet-end` 등 명시 옵션은 이제 preset보다 우선한다.
* 고정 seed에서 Canny `0.55 / 0.75` 강화안은 API와 metadata에는 적용됐지만 palette-locked 결과가 baseline과 byte-identical이었다. Canny 단독 강화는 현재 저 denoise regime에서 유효한 비교 축이 아니다.
* Windows ComfyUI native mask node(`LoadImageMask`, `InvertMask`, `VAEEncodeForInpaint`, `SetLatentNoiseMask`) 지원을 확인했다. `VAEEncodeForInpaint`는 일반 DreamShaper checkpoint에서 차량 내부를 회색으로 붕괴시켜 사용하지 않는다. `SetLatentNoiseMask` + source alpha는 배경/외곽을 유지하고 차량 영역만 샘플링하는 데 성공했지만, 현재 fixed seed/low denoise에서는 art style 개선 폭이 작다. 이 mask path도 아직 승인 후보가 아니다.
* latent-mask denoise sweep(`0.16`, `0.20`, `0.24`), seed sweep(3 seeds), 그리고 강화 PixelArt LoRA/prompt 후보(`0.75/0.9 @ denoise 0.22`, `0.9/1.0 @ denoise 0.28`)를 실행했다. 포즈와 외곽은 안정적이지만 모든 결과가 현실적인 회색 차량 재질에 머물렀다. 현재 DreamShaper + `[Qwen.Image]PixelArt_Redmond` 조합은 parameter tuning만으로 목표 스타일을 낼 수 없다는 결론이다.
* root cause candidate: `[Qwen.Image]PixelArt_Redmond`는 Qwen Image 2512 전용 LoRA이고 `dreamshaper_8`은 SD 1.5 계열이다. Windows ComfyUI에는 현재 이 두 파일만 설치돼 있다. 호환 후보와 설치 전 검증 계획은 `docs/retro-asset-studio/model-candidate-evaluation.md`에 정리했다.

중요한 제약:

* G70/VDrift XG 구현으로 넘어가지 않는다.
* source model, `real-vehicle-poc.json`, Phaser runtime import를 바꾸지 않는다.
* wheel ellipse correction을 다시 켜지 않는다.
* FT86의 원래 실루엣과 viewpoint를 유지한다.
* `setTint()` 기반 색상 변경은 최종안으로 쓰지 않는다.
* base sprite에는 glow, bloom, scene light, ground shadow를 굽지 않는다.

다음 작업 후보:

1. `SetLatentNoiseMask`는 source silhouette protection option으로만 보관한다. 현재 결과만으로 canonical/runtime path에 넣지 않는다.
2. 현재 checkpoint/LoRA에서 seed, denoise, prompt, LoRA strength sweep을 반복하지 않는다. 다른 compatible pixel-art checkpoint 또는 LoRA가 준비된 경우에만 다시 평가한다.
3. 새 model asset이 없으면 ComfyUI는 style reference로 한정하고 deterministic pixel/postprocess path를 우선한다.
4. 승인 후보가 생긴 경우에만 postprocess와 runtime color QA로 넘긴다.
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
