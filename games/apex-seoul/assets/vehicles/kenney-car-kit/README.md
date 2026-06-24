# Kenney Car Kit

Temporary source vehicle models for Apex Seoul player-car sprite rendering.

- Source: https://kenney.nl/assets/car-kit
- Downloaded: 2026-06-24
- Author: Kenney
- License: Creative Commons CC0
- License URL: https://creativecommons.org/publicdomain/zero/1.0/

The game uses rendered PNG sprites from the GLB models instead of loading the 3D models at runtime.

Download or refresh the source pack from the Apex Seoul project directory:

```bash
npm run download:vehicles
```

Regenerate sprites:

```bash
npm run render:vehicles
```

Default model:

```text
Models/GLB format/race-future.glb
```

Default outputs:

```text
../rendered/player-car-rear.png
../rendered/player-car-rear-left.png
../rendered/player-car-rear-right.png
```
