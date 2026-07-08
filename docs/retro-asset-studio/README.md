# Retro Asset Studio

Local ComfyUI bridge for Apex Seoul vehicle sprite experiments.

현재 목표는 Stable Diffusion을 차량 generator로 쓰는 것이 아니라, Three.js/pixel-pass로 만든 차량 spritesheet에 retro style filter를 얹고 마지막 palette를 게임용으로 고정하는 것이다.

```text
Three.js vehicle render
-> pixel candidate
-> ComfyUI img2img + Canny ControlNet
-> palette lock
-> postprocess for Phaser spritesheet
```

## Current Focus

FT86가 현재 기준 실험 차량이다.

```text
input:
../../games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png

default output / runtime alias:
../../games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png

current baseline candidate:
../../games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced.png
```

판단:

| Variant | Use |
| --- | --- |
| `balanced` | FT86 v1 기본 후보 |
| `safe` | 실루엣 보존 fallback |
| `stylized` | 디자인 실험용, runtime 기본 후보 아님 |

G70/VDrift XG 교체는 문서화만 완료된 보류 작업이다. 지금 단계에서 source model, `real-vehicle-poc.json`, Phaser runtime import는 건드리지 않는다.

## Requirements

Use Node.js 18 or newer in WSL. The bridge uses native ESM plus Node's built-in `fetch`, `Blob`, and `FormData` APIs.

```bash
node --version
```

If WSL still points at an old distro package such as Node 10, switch to a newer runtime before using the studio:

```bash
nvm install 22
nvm use 22
```

`package.json` declares `engines.node >=18`. `check-node-version.cjs` exists as a helper, but the current npm scripts do not run it as a `pre*` hook.

## Connection

ComfyUI is expected at:

```text
http://127.0.0.1:8188
```

The included `docker-compose.yml` publishes ComfyUI only on localhost:

```yaml
ports:
  - "127.0.0.1:8188:8188"
```

Codex and local scripts connect through the ComfyUI HTTP API. Browser automation for the ComfyUI UI is not needed.

Endpoint override:

```bash
COMFYUI_URL=http://127.0.0.1:8188 npm run ping
npm run ping -- --comfy-url http://127.0.0.1:8188
```

If this repo runs in WSL but ComfyUI runs directly on Windows, WSL's `127.0.0.1` may not be the Windows loopback. When the URL was not explicitly overridden, `npm run ping` first tries `127.0.0.1`, then probes common WSL host candidates.

For the most predictable Windows-host setup:

```bash
COMFYUI_URL=http://<windows-host-ip>:8188 npm run ping
```

## Commands

Run from this directory:

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

Other vehicle presets still exist for comparison:

```bash
npm run run:g70
npm run run:stinger
npm run run:all
```

Direct script form:

```bash
node scripts/run-retro-filter.mjs --ping
node scripts/run-retro-filter.mjs --dry-run
node scripts/run-retro-filter.mjs --run --vehicle ft86 --variant balanced
```

Useful options:

| Option | Meaning |
| --- | --- |
| `--vehicle ft86|g70|stinger|all` | Vehicle preset |
| `--variant safe|balanced|stylized|all` | Tuning preset |
| `--input`, `--output` | Override paths for a single vehicle/custom run |
| `--no-palette-lock` | Download ComfyUI output without palette lock |
| `--denoise`, `--cfg`, `--steps`, `--controlnet-strength` | Parameter experiments |
| `--comfy-url` | Endpoint override |

Safety rules:

- Do not combine `--vehicle all` with explicit `--input` or `--output`.
- Do not combine `--variant all` with explicit `--output`.
- Wheel ellipse correction remains disabled by default.
- ComfyUI remains a style filter, not a source vehicle generator.

## Vehicle Presets

| Preset | Input | Output |
| --- | --- | --- |
| `ft86` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png` |
| `g70` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png` |
| `stinger` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/kia-stinger-256/sheet-256-magenta-preview.png` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/kia-stinger-256/sheet-256-ai-retro-v1.png` |

## Workflow Files

```text
retro_style_filter_v1.json
  ComfyUI UI workflow source

workflows/retro_style_filter_v1.api.json
  dry-run API prompt output

scripts/workflow.mjs
  UI workflow -> /prompt API converter

scripts/comfy-client.mjs
  upload, prompt queue, history polling, download

scripts/run-retro-filter.mjs
  CLI entrypoint, vehicle/variant patching

scripts/palette-lock.mjs
  deterministic game palette cleanup
```

`retro_style_filter_v1.json` is a ComfyUI UI workflow export. `workflow.mjs` converts it into the API prompt shape used by `/prompt`, including `CLIPTextEncode` widget text mapping.

## Current Filter Defaults

The default `run:ft86` path uses the `balanced` variant.

```text
checkpoint: dreamshaper_8.safetensors
lora: [Qwen.Image]PixelArt_Redmond.safetensors
controlNet: control_v11p_sd15_canny.pth

variant: balanced
denoise: 0.12
cfg: 4.5
steps: 20
sampler: euler
scheduler: simple

cannyLow: 0.35
cannyHigh: 0.75
controlNetStrength: 0.35
controlNetStart: 0
controlNetEnd: 0.6

loraStrengthModel: 0.45
loraStrengthClip: 0.7
```

`palette-lock.mjs` then forces the output back into a limited vehicle palette. It keeps magenta as `255,0,255`; alpha restoration is a later postprocess step.

Important palette behavior:

- body/glass/light/wheel colors are quantized after download
- `wheelPaletteLock` defaults to `false`
- QA-based wheel ellipse correction should stay disabled unless a semantic mask replaces the current heuristic

## Next Work

The first postprocess/runtime QA path is now implemented in the Apex Seoul package:

```bash
npm run postprocess:ft86-retro --workspace @games/apex-seoul
npm run qa:ft86-runtime-colors --workspace @games/apex-seoul -- --manifest-only
```

Postprocess outputs:

```text
source alpha:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-source-alpha.png

runtime variants:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-red-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-blue-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-yellow-alpha.png

debug:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/ft86-retro-palette-audit.json
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-roles.png
```

The body color swap is role-based, not a global tint. `ft86-retro-palette-audit.json` assigns the limited palette to body, tire, outline, shadow, tail-light, and amber-light roles. `sheet-256-ai-retro-v1-balanced-roles.png` is a false-color preview for checking those roles before changing ramps.

Current color ramps use a flat 3-shade body profile plus edge-only body cleanup. Brighter ramps looked fine as standalone PNGs, and even the lower-contrast soft ramps were acceptable at source size, but runtime scale still made some shade transitions read like speckle. A more aggressive 2-shade cleanup was rejected because it made the car body too flat.

Current body colors after postprocess:

| Variant | Body shades |
| --- | --- |
| `silver` | `58,72,82` / `104,118,126` / `132,146,154` |
| `red` | `62,28,28` / `108,52,48` / `142,86,74` |
| `blue` | `30,42,66` / `58,82,116` / `96,126,158` |
| `yellow` | `76,62,26` / `124,102,42` / `176,154,82` |

The postprocess also makes alpha output texture-filter safe. Magenta-keyed pixels become alpha 0, hidden magenta RGB is removed, and transparent pixels close to the car receive nearby opaque RGB to reduce edge bleed during WebGL scaling.

Runtime preview URLs:

```text
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=silver
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=red
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=blue
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=yellow
```

Next checks:

1. Capture the FT86 runtime color QA contact sheet.
2. Verify tail lights, glass, tires, outline, and rollover frames are not recolored by body palette swap.
3. If edge lines remain visible, inspect Phaser texture filtering / pixelArt settings and runtime display scale.
4. If edge cleanup is too strong or too weak, adjust only `cleanEdgeBodyNoise` in `postprocess-ft86-retro-sheet.mjs`.

VDrift XG / `raven-xg-coupe-poc` work resumes only after the FT86 postprocess path is stable.
