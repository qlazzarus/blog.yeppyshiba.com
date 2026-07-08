# Next GPT Handoff: FT86 ComfyUI Retro Design Pass

이 문서는 주간 한도 종료나 세션 전환에 대비한 다음 GPT 질문용 handoff다. 현재 목표는 G70/VDrift 변환을 진행하는 것이 아니라, 이미 존재하는 FT86 256px pixel candidate를 ComfyUI 후처리 디자인 실험 대상으로 삼아 retro vehicle style pass를 안정화하는 것이다.

## 다음 GPT에게 그대로 물어볼 프롬프트

```text
너는 `blog.yeppyshiba.com` repo를 함께 보는 Codex/GPT다.

현재 작업 위치:

repo: /home/monoless/blog.yeppyshiba.com
active package: docs/retro-asset-studio/package.json
ComfyUI bridge: docs/retro-asset-studio/scripts/run-retro-filter.mjs
progress note: docs/apex-seoul-retro-asset-studio-progress-notes.md

현재 목표:

G70/VDrift XG 교체는 아직 구현하지 않는다.
지금은 FT86 256px spritesheet의 ComfyUI 후처리 결과를 정리하고,
이미 구현된 magenta-to-alpha / body palette swap / Phaser runtime QA 경로를 검증한다.

현재 FT86 입력:

input:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png

transparent/source candidate:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256.png

QA:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256.qa.json

default output:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png

현재 구현 상태:

* `run-retro-filter.mjs`는 `ft86 / g70 / stinger` vehicle preset을 가진다.
* `run-retro-filter.mjs`는 `safe / balanced / stylized` variant preset을 가진다.
* `--variant all` 실행 시 세 결과를 suffix 파일로 생성한다.
* `package.json`에는 `run:ft86:safe`, `run:ft86:balanced`, `run:ft86:stylized`, `run:ft86:variants`가 있다.
* ComfyUI URL은 `COMFYUI_URL`, `COMFY_URL`, `--comfy-url`로 override 가능하고 기본값은 `http://127.0.0.1:8188`이다.
* workflow 변환은 `workflow.mjs`가 담당한다.
* `CLIPTextEncode`의 `widgets_values` → `inputs.text` 매핑은 해결되어 있다.
* 다운로드 후 `palette-lock.mjs`가 기본 실행된다.
* QA 기반 wheel ellipse correction은 기본 비활성화 상태를 유지해야 한다.

현재 FT86 판단:

safe:
- 실루엣 보존은 가장 좋음
- AI 후처리 변화는 약함
- fallback 후보

balanced:
- 현재 v1 기본 후보
- 실루엣, 휠, 배경, 차체 대비가 가장 균형 좋음
- sheet-256-ai-retro-v1.png 후보

stylized:
- 디자인 변화는 크지만 전복 프레임과 휠 하단부가 어두운 덩어리로 뭉칠 위험 있음
- 기본 후보로 사용하지 않음

중요한 제약:

* G70/VDrift XG 구현으로 넘어가지 않는다.
* source model, `real-vehicle-poc.json`, Phaser runtime import는 건드리지 않는다.
* wheel ellipse correction을 다시 켜지 않는다.
* FT86의 원래 실루엣과 viewpoint를 유지한다.
* ComfyUI는 generator가 아니라 style filter로 제한한다.
* `setTint()` 기반 색상 변경은 최종안으로 쓰지 않는다.

현재 후처리 구현:

1. `games/apex-seoul/scripts/postprocess-ft86-retro-sheet.mjs`가 magenta-to-alpha, role audit, body palette swap, shadow, runtime atlas를 생성한다.
2. body palette는 silver/red/blue/yellow flat 3-shade profile이다.
3. hidden magenta RGB는 제거했고, edge bleed 완화를 위해 차량 주변 transparent pixel에는 nearest opaque RGB를 채운다.
4. 차체 내부 디테일은 유지하고, 투명 배경/outline에 닿은 고립 edge body 픽셀만 outline으로 흡수한다.
5. Phaser runtime은 `?vehicle=ft86-retro&vehicleColor=silver|red|blue|yellow` URL parameter로 선택한다.

다음 작업 후보:

1. dev server에서 FT86 색상 후보를 눈으로 확인한다.
2. `sheet-256-ai-retro-v1-balanced-roles.png`로 body/glass/tire/light role 분류를 검토한다.
3. 경계선이 계속 보이면 Phaser texture filtering/pixelArt 설정 또는 runtime display scale을 확인한다.
4. Windows/WSL browser capture 문제가 해결되면 `qa:ft86-runtime-colors` contact sheet를 생성한다.
5. edge cleanup이 너무 강하거나 약하면 ComfyUI가 아니라 `postprocess-ft86-retro-sheet.mjs`의 `cleanEdgeBodyNoise` 조건만 조정한다.
6. 이 단계가 안정화된 뒤에야 G70/VDrift XG 교체 계획으로 돌아간다.

```

## 현재 실제 스크립트 구현 정리

### `docs/retro-asset-studio/package.json`

현재 npm scripts:

```json
{
  "ping": "node scripts/run-retro-filter.mjs --ping",
  "dry-run": "node scripts/run-retro-filter.mjs --dry-run",
  "run": "node scripts/run-retro-filter.mjs --run",
  "run:all": "node scripts/run-retro-filter.mjs --run --vehicle all",
  "run:ft86": "node scripts/run-retro-filter.mjs --run --vehicle ft86",
  "run:ft86:safe": "node scripts/run-retro-filter.mjs --run --vehicle ft86 --variant safe",
  "run:ft86:balanced": "node scripts/run-retro-filter.mjs --run --vehicle ft86 --variant balanced",
  "run:ft86:stylized": "node scripts/run-retro-filter.mjs --run --vehicle ft86 --variant stylized",
  "run:ft86:variants": "node scripts/run-retro-filter.mjs --run --vehicle ft86 --variant all",
  "run:g70": "node scripts/run-retro-filter.mjs --run --vehicle g70",
  "run:stinger": "node scripts/run-retro-filter.mjs --run --vehicle stinger"
}
```

주의: `package.json`에는 `engines.node >=18`이 있지만 현재 `pre*` script는 없다. Node 18 미만에서는 먼저 `node --version`을 확인한다.

### `run-retro-filter.mjs`

역할:

- `--ping`: ComfyUI `/system_stats` 연결 확인
- `--dry-run`: UI workflow를 API prompt로 변환해 `workflows/retro_style_filter_v1.api.json` 저장
- `--run`: 입력 sheet 업로드, `/prompt` queue, history polling, output download
- `--vehicle ft86|g70|stinger|all`: preset 입력/출력 경로 사용
- `--no-palette-lock`: 후처리 palette lock 비활성화
- `--denoise`, `--cfg`, `--controlnet-strength`, `--steps`, `--seed` 등 실험 파라미터 override
- `--input`, `--output`: 단일 preset 실행 시 preset input/output보다 우선한다.

내부 세팅은 대부분 이 스크립트에서 관리한다. ComfyUI UI에서 매번 손으로 바꾸는 방식이 아니라, workflow JSON을 source로 두고 실행 시 CLI/env/script 값으로 patch해서 `/prompt` API에 넣는 구조다.

설정 주입 경로:

| 설정 | 위치 | 비고 |
| --- | --- | --- |
| ComfyUI endpoint | `COMFYUI_URL`, `COMFY_URL`, `--comfy-url` | 기본값은 `http://127.0.0.1:8188` |
| 입력/출력 이미지 | `vehiclePresets`, `--input`, `--output` | 단일 preset에서는 CLI override 우선 |
| checkpoint/LoRA/ControlNet | `config`, CLI args | ComfyUI에 모델 파일이 이미 있어야 함 |
| denoise/cfg/steps/sampler | `config`, CLI args | FT86 실험의 주 튜닝 대상 |
| prompt text | `retro_style_filter_v1.json`의 CLIPTextEncode widgets | 현재는 CLI prompt override 없음 |
| API prompt 변환 | `workflow.mjs` | UI workflow를 `/prompt` shape로 변환 |
| 최종 색 제한 | `palette-lock.mjs` | 기본 ON, `--no-palette-lock`으로 비교 가능 |

즉, GPT에게 물어볼 때는 "ComfyUI UI에서 뭘 눌러야 하냐"보다 "이 스크립트의 config/prompt/palette를 어떻게 바꿀지"를 물어보는 게 맞다.

현재 FT86 preset:

```js
ft86: {
    input: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png',
    output: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png',
}
```

기본 생성 파라미터:

```text
checkpoint: dreamshaper_8.safetensors
lora: [Qwen.Image]PixelArt_Redmond.safetensors
loraStrengthModel: 0.45
loraStrengthClip: 0.7
controlNet: control_v11p_sd15_canny.pth
controlNetStrength: 0.35
controlNetStart: 0
controlNetEnd: 0.6
cannyLow: 0.35
cannyHigh: 0.75
denoise: 0.12
cfg: 4.5
steps: 20
sampler: euler
scheduler: simple
```

### `workflow.mjs`

핵심:

- ComfyUI UI workflow JSON과 API prompt JSON을 모두 받을 수 있다.
- UI workflow의 `links`를 API prompt의 `["nodeId", outputIndex]` 연결로 변환한다.
- `widgets_values`를 node type별 input name으로 변환한다.
- `CLIPTextEncode: ['text']` 매핑이 있으므로 positive/negative prompt 누락 문제는 해결된 상태다.
- `patchRetroPrompt`가 첫 번째 matching node를 찾아 config 값을 덮어쓴다.

### `comfy-client.mjs`

핵심:

- `defaultComfyUrl = COMFYUI_URL ?? COMFY_URL ?? http://127.0.0.1:8188`
- `/upload/image`, `/prompt`, `/history/{promptId}`, `/view`, `/system_stats` 사용
- JSON request timeout은 5초
- prompt completion polling timeout은 10분

### `palette-lock.mjs`

핵심:

- ComfyUI output PNG를 읽고 magenta background를 다시 `255,0,255`로 고정한다.
- body/glass/light/wheel 계열 제한 palette로 색을 정리한다.
- `wheelPaletteLock` 기본값은 `false`다.
- `qaPath && wheelPaletteLock`일 때만 QA wheel ellipse correction을 수행한다.
- 이전 G70 검토에서 QA wheel ellipse correction이 잘못된 둥근 타이어 artifact를 만들었으므로 FT86 실험에서도 켜면 안 된다.

현재 palette:

```text
body base: 118,132,140
body dark: 72,86,96
body highlight: 154,166,172
glass mid: 102,124,134
tire: 8,10,14
rim: 62,76,86
red light: 164,34,38
amber light: 236,136,43
```

## FT86 ComfyUI 디자인 실험 제안

이번 단계는 source model 변경 없이 후처리만 본다. 즉, 목표는 "FT86을 더 멋진 새 차로 바꾸기"가 아니라 "현재 FT86 spritesheet의 실루엣을 유지하면서 retro sprite로 더 읽히게 만드는 것"이다.

추천 실험 preset:

```text
ft86-v1-safe:
denoise 0.08
cfg 4.0
controlNetStrength 0.42
steps 20
목표: 실루엣 보존 최우선

ft86-v2-balanced:
denoise 0.12
cfg 4.5
controlNetStrength 0.35
steps 24
목표: 현재 기본값보다 약간 더 픽셀 디테일 허용

ft86-v3-stylized:
denoise 0.16
cfg 5.0
controlNetStrength 0.30
steps 28
목표: 디자인 감이 살아나는지 확인, 실패 가능성 높음
```

실험 출력은 기존 `sheet-256-ai-retro-v1.png`를 덮어쓰지 말고 다음처럼 분리하는 것이 좋다.

```text
sheet-256-ai-retro-ft86-safe.png
sheet-256-ai-retro-ft86-balanced.png
sheet-256-ai-retro-ft86-stylized.png
```

현재 CLI는 단일 vehicle preset에서 output override를 지원하므로 새 script 없이도 가능하다.

예:

```bash
cd docs/retro-asset-studio
npm run run:ft86 -- --denoise 0.08 --cfg 4.0 --controlnet-strength 0.42 --steps 20 --output ../../games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-ft86-safe.png
npm run run:ft86 -- --denoise 0.12 --cfg 4.5 --controlnet-strength 0.35 --steps 24 --output ../../games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-ft86-balanced.png
npm run run:ft86 -- --denoise 0.16 --cfg 5.0 --controlnet-strength 0.30 --steps 28 --output ../../games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-ft86-stylized.png
```

주의: `--vehicle all`에서는 `--input`/`--output` override를 사용할 수 없다. 여러 차량이 같은 파일에 쓰이는 사고를 막기 위해 단일 preset에서만 허용한다.

## 2026-07-07 실행 결과

ComfyUI 연결:

```text
Connected to ComfyUI 0.26.2 at http://127.0.0.1:8188
```

생성 완료:

```text
safe:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-ft86-safe.png

balanced:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-ft86-balanced.png

stylized:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-ft86-stylized.png
```

실행한 파라미터:

| output | denoise | cfg | controlNetStrength | steps |
| --- | ---: | ---: | ---: | ---: |
| `safe` | `0.08` | `4.0` | `0.42` | `20` |
| `balanced` | `0.12` | `4.5` | `0.35` | `24` |
| `stylized` | `0.16` | `5.0` | `0.30` | `28` |

파일/팔레트 확인:

```text
safe      768x1536 colors=15 opaque=1179648 magenta=1070472 size=68K
balanced  768x1536 colors=16 opaque=1179648 magenta=1070423 size=67K
stylized  768x1536 colors=15 opaque=1179648 magenta=1070596 size=69K
```

1차 눈검수:

- 세 결과 모두 실루엣은 유지된다.
- G70 때처럼 QA wheel ellipse correction에서 생긴 둥근 타이어 artifact는 보이지 않는다.
- `safe`는 가장 보수적이고 원본 형태 보존이 좋다.
- `balanced`는 safe보다 명암이 조금 살아나며, 현재 기준으로 가장 무난한 후보처럼 보인다.
- `stylized`는 변화량은 가장 크지만 차체가 여전히 palette lock 때문에 회청색으로 많이 고정된다.
- 세 결과 모두 body palette가 다소 회청색으로 좁게 묶이는 느낌이 있어, 다음 조정은 prompt보다 `palette-lock.mjs`의 FT86/body palette profile 쪽일 가능성이 있다.

## 다음 Codex 작업 후보

1. dev server에서 `?vehicle=ft86-retro&vehicleColor=silver|red|blue|yellow` 후보를 확인한다.
2. `sheet-256-ai-retro-v1-balanced-roles.png`로 role 분류가 실제 차체/유리/타이어/후미등과 맞는지 확인한다.
3. 경계선이 계속 보이면 Phaser texture filtering/pixelArt 설정 또는 runtime display scale을 확인한다.
4. Windows/WSL browser capture 문제가 해결되면 `qa:ft86-runtime-colors` contact sheet를 생성한다.
5. edge cleanup이 너무 강하거나 약하면 `postprocess-ft86-retro-sheet.mjs`의 `cleanEdgeBodyNoise` 조건만 조정한다.

## 지금은 하지 않는 것

- G70/VDrift XG 변환 구현
- `real-vehicle-poc.json`에 `raven-xg-coupe-poc` 추가
- Phaser runtime player vehicle import 교체
- QA wheel ellipse correction 재활성화
- 기존 approved G70 asset 삭제 또는 덮어쓰기

## 다음 세션 첫 액션

1. 이 문서를 읽는다.
2. `docs/retro-asset-studio/README.md`와 `TODO.md`의 최신 next task를 확인한다.
3. ComfyUI 재실행이 필요한 작업인지, postprocess만 필요한 작업인지 구분한다.
4. 우선 runtime URL에서 FT86 edge-clean color 후보를 눈으로 확인한다.
