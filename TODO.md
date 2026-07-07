## 9. 내일 Codex에게 바로 줄 짧은 작업 지시

문서 맨 마지막이나 별도 handoff에 넣기 좋은 압축 버전이야.

```md
# Tomorrow Codex Task: FT86 postprocess docs-first handoff

Do not work on G70/VDrift XG yet.

Current focus:
- FT86 256px AI retro balanced candidate
- magenta-to-alpha postprocess
- body palette swap design
- Phaser runtime visibility QA plan

Current default candidate:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced.png

Runtime alias candidate:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png

Do not:
- change source models
- change runtime imports
- enable wheel ellipse correction
- use setTint as final recolor method
- move to VDrift XG implementation

Next implementation candidates:
1. Add magenta-to-alpha postprocess script.
2. Add body palette swap utility.
3. Generate FT86 red/blue/yellow/silver variants from balanced-alpha.
4. Add temporary Phaser runtime QA scene or debug toggle to compare vehicle colors on road.
5. If body is too dark, adjust only body ramp in palette-lock.mjs.
````
