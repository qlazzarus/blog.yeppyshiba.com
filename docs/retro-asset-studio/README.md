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
