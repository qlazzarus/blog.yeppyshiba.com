# Retro Asset Studio

Local ComfyUI bridge and postprocess guide for Apex Seoul vehicle sprite assets.

This README is the current operational guide. Historical experiments and blog notes live in `../apex-seoul-retro-asset-studio-progress-notes.md`; deferred source-model plans live in `retro-asset-studio-plan.md`.

## Current Pipeline

Apex Seoul's active vehicle sprite path is:

```text
Three.js pose sheet / pixel candidate
-> ComfyUI img2img + Canny ControlNet style filter
-> palette lock
-> Phaser postprocess variants
-> runtime screenshot QA
```

ComfyUI is a style filter, not a vehicle generator. Vehicle identity, pose order, silhouette, and cell alignment must come from the input spritesheet.

The visual target is defined in `../apex-seoul-visual-direction.md`: **black/blue dreamlike Seoul downhill**.

## Current Baseline

FT86 is the current pipeline stabilization vehicle.

```text
input:
../../games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png

ComfyUI balanced output:
../../games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced.png

runtime art-direction candidates:
../../games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-blue-alpha.png
../../games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-black-alpha.png
```

Variant policy:

| Variant | Use |
| --- | --- |
| `balanced` | FT86 v1 baseline |
| `safe` | silhouette-preserving fallback |
| `stylized` | design experiment, not runtime default |

G70, Stinger, and VDrift/XG paths are comparison or deferred paths. Do not switch Phaser runtime imports to them until the FT86 postprocess/runtime QA path is approved.

## Commands

Run ComfyUI bridge commands from this directory:

```bash
cd docs/retro-asset-studio
npm run ping
npm run dry-run
npm run run:ft86:balanced
npm run run:ft86:variants
```

Run Phaser postprocess/runtime QA from the repo root:

```bash
npm run postprocess:ft86-retro --workspace @games/apex-seoul
npm run qa:ft86-runtime-colors --workspace @games/apex-seoul -- --manifest-only
```

Useful ComfyUI options:

| Option | Meaning |
| --- | --- |
| `--vehicle ft86|g70|stinger|all` | Vehicle preset |
| `--variant safe|balanced|stylized|all` | ComfyUI tuning preset |
| `--input`, `--output` | Override paths for a single run |
| `--no-palette-lock` | Download raw ComfyUI output without palette lock |
| `--denoise`, `--cfg`, `--steps`, `--controlnet-strength` | Parameter experiments |
| `--comfy-url` | Endpoint override |

Safety rules:

- Do not combine `--vehicle all` with explicit `--input` or `--output`.
- Do not combine `--variant all` with explicit `--output`.
- Keep QA wheel ellipse correction disabled unless a semantic mask replaces the current heuristic.
- Do not use Phaser `setTint()` as the final body color system.

## Requirements

Use Node.js 18 or newer. The bridge uses native ESM plus built-in `fetch`, `Blob`, and `FormData`.

```bash
node --version
```

ComfyUI defaults to:

```text
http://127.0.0.1:8188
```

Endpoint override:

```bash
COMFYUI_URL=http://127.0.0.1:8188 npm run ping
npm run ping -- --comfy-url http://127.0.0.1:8188
```

When ComfyUI runs on Windows and this repo runs in WSL, the script tries common WSL host candidates if the default loopback URL fails.

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
  deterministic limited-palette cleanup after ComfyUI

../../games/apex-seoul/scripts/postprocess-ft86-retro-sheet.mjs
  magenta-to-alpha, role audit, body variants, shadow sheet, runtime atlas

../../games/apex-seoul/scripts/capture-runtime-vehicle-qa.mjs
  runtime screenshot QA manifest/contact sheet
```

## Filter Defaults

The default `run:ft86:balanced` path uses:

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

`palette-lock.mjs` keeps the ComfyUI result in a limited vehicle palette. Alpha restoration happens later in the Phaser postprocess step.

## Postprocess Outputs

```text
source alpha:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-source-alpha.png

runtime variants:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-blue-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-black-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-red-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-yellow-alpha.png

debug:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/ft86-retro-palette-audit.json
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-roles.png
```

Body ramps:

| Variant | Body shades |
| --- | --- |
| `black` | `8,12,20` / `16,28,48` / `44,78,118` |
| `blue` | `10,18,34` / `24,52,92` / `70,118,180` |
| `silver` | `58,72,82` / `104,118,126` / `132,146,154` |
| `red` | `62,28,28` / `108,52,48` / `142,86,74` |
| `yellow` | `76,62,26` / `124,102,42` / `176,154,82` |

Body color swap is role-based. Use `sheet-256-ai-retro-v1-balanced-roles.png` to verify that glass, tires, rims, outlines, and lights are not treated as body pixels.

## Runtime Approval

Runtime preview URLs:

```text
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=blue
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=black
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=silver
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=red
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=yellow
```

Approval checklist:

- Same vehicle identity survives center, steer, downhill, uphill, and future crash poses.
- Wheel/tire separation is readable at runtime scale.
- Blue and black variants are both generated and compared.
- Alpha output has no hidden magenta RGB or baked background.
- Base sprite does not rely on glow, bloom, or baked ground shadow.
- Runtime QA includes downhill, level, uphill and left, center, right steering.
- Vehicle remains visible on the black/blue road without overpowering the scene.

## Next Checks

1. Capture the FT86 runtime color QA contact sheet.
2. Compare blue and black as the actual art-direction baseline.
3. Verify tail lights, glass, tires, outline, and rollover frames are not recolored by body palette swap.
4. If edge lines remain visible, inspect Phaser texture filtering / pixelArt settings and runtime display scale.
5. If edge cleanup is too strong or too weak, adjust only `cleanEdgeBodyNoise` in `postprocess-ft86-retro-sheet.mjs`.
