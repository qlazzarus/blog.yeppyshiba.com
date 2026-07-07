# Retro Asset Studio

Local ComfyUI bridge for Apex Seoul sprite experiments.

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

Note: `check-node-version.cjs` exists as a helper, but the current `package.json` scripts do not yet run it as a `pre*` hook. For now, check `node --version` manually before running the studio. If this becomes a recurring issue, wire the helper into `preping`, `predry-run`, and `prerun` scripts.

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

Codex and local scripts can connect through the ComfyUI HTTP API. The UI does not need browser automation.

You can override the endpoint with either `COMFYUI_URL` or `--comfy-url`:

```bash
COMFYUI_URL=http://127.0.0.1:8188 npm run ping
npm run ping -- --comfy-url http://127.0.0.1:8188
```

### WSL and Windows-host ComfyUI

If this repo runs in WSL but ComfyUI is running directly on Windows, WSL's `127.0.0.1` may not be the Windows loopback. `npm run ping` first tries `127.0.0.1`, then probes common WSL host candidates when the URL was not explicitly overridden.

For the most predictable setup, set the endpoint yourself:

```bash
COMFYUI_URL=http://<windows-host-ip>:8188 npm run ping
```

Make sure the Windows ComfyUI process listens on an address reachable from WSL, not only Windows-only localhost.

## Commands

Ping the local ComfyUI server:

```bash
node docs/retro-asset-studio/scripts/run-retro-filter.mjs --ping
```

Or from this directory:

```bash
npm run ping
```

Convert the checked-in ComfyUI UI workflow JSON into API prompt JSON without running generation:

```bash
node docs/retro-asset-studio/scripts/run-retro-filter.mjs --dry-run
```

Run the full v1 filter:

```bash
node docs/retro-asset-studio/scripts/run-retro-filter.mjs --run
```

Or from this directory:

```bash
npm run run
```

Run one Apex Seoul vehicle preset:

## FT86 variant runs

FT86는 현재 Retro Style Filter v1의 기준 실험 차량이다.  
G70/VDrift 교체 작업은 보류하고, FT86 256px magenta preview sheet에서 `safe / balanced / stylized` 세 가지 후처리 결과를 비교한다.

기본 판단:

```text
safe      = 실루엣 보존 최우선, fallback 후보
balanced  = 현재 FT86 v1 기본 후보
stylized  = 디자인 실험용, 전복/휠 artifact 발생 시 폐기
```

실행:

```bash
npm run run:ft86
npm run run:ft86:safe
npm run run:ft86:balanced
npm run run:ft86:stylized
npm run run:ft86:variants
```

예상 출력:

```text
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-safe.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-stylized.png
```

현재 기본 `run:ft86`는 `balanced`와 같은 방향이다.
`run:ft86:variants`는 세 결과를 모두 생성해 비교용으로 남긴다.

주의:

* `--vehicle all`에서는 `--input`/`--output` override를 사용하지 않는다.
* `--variant all`과 명시 `--output`은 함께 쓰지 않는다.
* wheel ellipse correction은 기본 비활성화 상태를 유지한다.
* ComfyUI는 차량 generator가 아니라 style filter로만 사용한다.

```bash
npm run run:g70
npm run run:stinger
npm run run:ft86
```

Run all 256px magenta vehicle sheets:

```bash
npm run run:all
```

Default input:

```text
games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png
```

Default output:

```text
games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png
```

Vehicle presets:

| Preset | Input | Output |
| --- | --- | --- |
| `g70` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png` |
| `stinger` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/kia-stinger-256/sheet-256-magenta-preview.png` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/kia-stinger-256/sheet-256-ai-retro-v1.png` |
| `ft86` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png` | `games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png` |

## Notes

`retro_style_filter_v1.json` is a ComfyUI UI workflow export. The script converts the known v1 node graph into the API prompt shape used by `/prompt`.

Generation is only queued when `--run` is passed. `--ping` and `--dry-run` are safe setup checks.

## Current v1 filter defaults

현재 Retro Style Filter v1은 하나의 ComfyUI workflow JSON을 공통 템플릿으로 사용하고, 실행 시점에 vehicle preset과 variant preset을 patch한다.

```text
retro_style_filter_v1.json
  = ComfyUI UI workflow source

workflows/retro_style_filter_v1.api.json
  = dry-run 확인용 API prompt output

scripts/run-retro-filter.mjs
  = vehicle preset + variant preset patcher
````

현재 FT86 balanced 후보에서 유효했던 값:

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

현재 결론:

* FT86는 `balanced`를 v1 기본 후보로 둔다.
* `safe`는 fallback으로 보관한다.
* `stylized`는 전복 프레임과 휠 하단부가 어두운 덩어리로 뭉칠 수 있으므로 기본 후보로 쓰지 않는다.
