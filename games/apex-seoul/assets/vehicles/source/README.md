# Apex Seoul source vehicle models

This directory is for POC-only source 3D models that are rendered into fixed
2D pose sheets.

Keep downloaded model attribution metadata next to each model, for example:

```text
models/gt86-poc.glb
models/gt86-poc.sketchfab.json
```

Do not treat real-name vehicle models, badges, or trademarks as final public
game assets without a separate licensing and branding pass.

Keep original downloads separate from optimized render inputs:

```text
assets/vehicles/toyota_gt86.glb
assets/vehicles/kia_stinger.glb
assets/vehicles/genesis_g70.glb
assets/vehicles/optimized/*-optimized.glb
```

Generate optimized GLBs before rendering POC pose sheets:

```bash
npm run optimize:real-vehicle-models
npm run render:real-vehicle-pocs
```
