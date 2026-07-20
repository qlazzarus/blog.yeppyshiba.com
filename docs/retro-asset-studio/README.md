# Retro Asset Studio

Local ComfyUI bridge and postprocess guide for Apex Seoul vehicle sprite assets.

This README is the current operational guide. Published experiments live in `../../contents/phaser4-apex-seoul-comfyui-retro-palette-compiler.md`; deferred source-model plans live in `retro-asset-studio-plan.md`.

## Current Pipeline

Apex Seoul's active vehicle sprite path is:

```text
Three.js pose sheet
-> deterministic pixel candidate / silhouette source
-> ComfyUI img2img + Canny ControlNet + vehicle-specific prompt
-> palette lock
-> restore source alpha + deterministic pixel/outline postprocess variants
-> runtime screenshot QA
```

ComfyUI is a style filter, not a vehicle generator. Vehicle identity, pose order, silhouette, and cell alignment must come from the input spritesheet. The postprocess restores the original pixel candidate alpha, so ComfyUI cannot become the authority for the vehicle footprint or road-contact baseline.

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
| `--positive-prompt`, `--negative-prompt` | Append an experiment-specific vehicle direction to the preset prompt |
| `--seed` | Use one reproducible seed instead of a generated seed |
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
  CLI entrypoint, vehicle/variant prompt patching, reproducibility sidecar

scripts/palette-lock.mjs
  deterministic limited-palette cleanup after ComfyUI

../../games/apex-seoul/scripts/postprocess-ft86-retro-sheet.mjs
  magenta compatibility cleanup, source-alpha restoration, role audit, body variants, shadow sheet, runtime atlas

../../games/apex-seoul/scripts/capture-runtime-vehicle-qa.mjs
  runtime screenshot QA manifest/contact sheet
```

## Model Compatibility And Candidate Plan

The current server has a DreamShaper SD 1.5 checkpoint but its installed
`[Qwen.Image]PixelArt_Redmond` LoRA targets Qwen Image, not SD 1.5. Do not use
that LoRA in the canonical DreamShaper workflow. The recommended first
replacement is the SD 1.5-compatible `PixelArtRedmond15V` LoRA; installation
and validation order are documented in
[`model-candidate-evaluation.md`](model-candidate-evaluation.md).

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

Vehicle presets supply a narrow art-direction clause after the shared preservation prompt. For example, FT86 emphasizes a nimble compact rear-wheel-drive downhill coupe, while Stinger emphasizes a wide fastback twin-turbo GT. The prompt may change surface character and proportion cues, but Canny plus restored source alpha still owns viewpoint, pose order, and contact baseline.

## ControlNet Reinforcement Plan

The current workflow already uses one Canny ControlNet. The next improvement is not simply raising its strength. Canny preserves visible edges, but it does not explicitly preserve the vehicle silhouette, road-contact baseline, or the semantic difference between a mild steer and a drift pose.

For the downhill drift direction, reinforce the source constraints in this order:

```text
Three.js pose render
-> source alpha / silhouette mask
-> Canny edge map from the same source
-> ComfyUI img2img style pass
-> restore original alpha deterministically
-> palette lock and role postprocess
```

Rules:

- Keep Canny as the primary shape guide. It is the lowest-risk control for preserving the rear-view pixel composition.
- Generate a source-derived silhouette mask and use it as an additional control or mask input when the ComfyUI installation supports it. The mask must preserve each cell's vehicle footprint and contact baseline, not create a new background.
- Do not raise `controlNetStrength` globally first. Compare a drift-safe candidate around `0.50-0.60` strength and `0.70-0.80` end percent against the current balanced baseline (`0.35 / 0.60`). Strong control can preserve the pose but can also flatten the pixel styling.
- Treat `center`, `steer-right-1`, and `steer-right-2` as a linked pose set. Approve or reject the set together; do not approve a strong drift pose only because the center frame looks good.
- Preserve the original Three.js alpha after ComfyUI. Magenta removal remains a compatibility path, not the ideal long-term silhouette source.

Recommended experiments:

| Candidate | Canny | Mask/silhouette control | Purpose |
| --- | --- | --- | --- |
| `balanced-v1` | `0.35`, end `0.60` | none | Current approved comparison baseline. |
| `drift-safe-canny` | `0.50-0.60`, end `0.70-0.80` | none | Check whether strong steering and future drift poses retain their width and tire contact. |
| `drift-safe-mask` | current balanced Canny | source alpha silhouette mask | Check whether pose identity improves without losing pixel-art variation. |

The goal is not a photorealistic depth or normal ControlNet pass. For this pseudo-3D rear-view sprite pipeline, alpha silhouette and Canny are more useful than depth because they protect the readable 2D outline and road-contact line that the runtime depends on.

## Reproducibility And Drift QA

Before expanding to another vehicle, add these pipeline checks:

1. Persist the actual ComfyUI seed, workflow hash, input hash, checkpoint, LoRA, and control parameters beside every approved output. The bridge now writes `<output>.pipeline.json`; approval should require that sidecar.
2. Run sprite QA per cell, not only for the full sheet: baseline jitter, center-to-steer-1 difference, steer-1-to-steer-2 difference, tire contact position, tail-light position, and alpha edge quality.
3. Export semantic role masks for `body`, `tail-light`, `tire`, and `glass` from deterministic postprocess. Runtime drift smoke, brake glow, and tail-light pulse must use these masks rather than modifying the base sprite.
4. Add runtime QA samples for the future drift pose separately from ordinary left/center/right grip steering.

## Postprocess Outputs

```text
source alpha:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-source-alpha.png

silhouette source:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256.png

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

1. Capture the FT86 runtime color QA contact sheet and compare blue/black on the same pose set.
2. Add reproducible ComfyUI output metadata before producing new candidates.
3. Run `balanced-v1`, `drift-safe-canny`, and `drift-safe-mask` on the same fixed seed; compare the three linked driving poses together. Use each output's `.pipeline.json` sidecar for the review record.
4. Verify tail lights, glass, tires, outline, and future strong drift frames are not recolored by body palette swap.
5. Export and review semantic role masks before adding runtime drift glow or smoke.
6. If edge lines remain visible, inspect Phaser texture filtering / pixelArt settings and runtime display scale before changing the ComfyUI prompt.
