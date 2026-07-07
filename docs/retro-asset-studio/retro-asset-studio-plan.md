# Apex Seoul Retro Asset Studio 작업 전 정리

이 문서는 Apex Seoul 차량 스프라이트에 AI 스타일 필터를 적용하기 전, ComfyUI workflow와 프로젝트 내 작업 범위를 정리하기 위한 기준 문서다.

현재 단계의 목표는 구현이 아니라 문서와 workflow 상태를 명확히 맞추는 것이다. 실제 변환 자동화는 다음 단계에서 진행한다.

## 목표

Stable Diffusion을 차량 생성기로 쓰지 않고, Three.js로 렌더링한 차량 스프라이트시트에 레트로 스타일을 입히는 `Retro Style Filter / AI Asset Compiler`로 사용한다.

차량의 차종, 방향, 휠 위치, 라이트 위치, 실루엣은 Apex Seoul 게임플레이와 직결되므로 AI가 차량을 새로 그리면 안 된다. AI는 입력 스프라이트의 형태를 유지하면서 색감, 외곽선, 픽셀 디테일만 정리한다.

```text
GLB / 공개 3D 차량 모델
↓
Three.js orthographic render
↓
spritesheet 생성
↓
ComfyUI img2img
↓
DreamShaper SD1.5 + PixelArtRedmond LoRA + Canny ControlNet
↓
Retro Style Filter
↓
Palette / outline / transparency 후처리
↓
Phaser에서 사용 가능한 spritesheet
```

## 현재 파일

```text
docs/retro-asset-studio/
  README.md
  docker-compose.yml
  retro-asset-studio-plan.md
  retro_style_filter_v1.json
  scripts/
```

`retro_style_filter_v1.json`은 ComfyUI의 UI workflow export 형식이다. `/prompt` API에 바로 넣는 API prompt JSON이 아니다.

구현 단계에서는 둘 중 하나가 필요하다.

1. ComfyUI에서 `Save API Format` 또는 API용 export를 다시 저장한다.
2. 현재 UI workflow JSON을 API prompt JSON으로 변환하는 스크립트를 작성한다.

우선은 1번이 더 단순하다.

## ComfyUI 환경

```text
ComfyUI URL:
http://localhost:8188/

실행 환경:
개인 PC / RTX 3080 / Docker ComfyUI
```

사용 중인 모델 위치:

```text
data/ComfyUI/models/checkpoints/
- dreamshaper_8.safetensors

data/ComfyUI/models/loras/
- [Qwen.Image]PixelArt_Redmond.safetensors

data/ComfyUI/models/controlnet/
- control_v11p_sd15_canny.pth
- 또는 control_v11p_sd15_canny.safetensors

data/ComfyUI/models/ipadapter/
- ip-adapter_sd15.safetensors

data/ComfyUI/models/clip_vision/
- CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors
```

현재 v1에서는 IPAdapter를 사용하지 않는다. Three.js 렌더 결과 자체가 충분히 강한 reference 역할을 하므로, v1은 img2img + Canny ControlNet까지만 고정한다.

## Retro Style Filter v1 Workflow

현재 workflow 구성:

```text
CheckpointLoaderSimple
↓
LoraLoader
↓
LoadImage
↓
VAEEncode
↓
CLIPTextEncode Positive / Negative
↓
Canny
↓
ControlNetLoader
↓
ControlNetApplyAdvanced
↓
KSampler
↓
VAEDecode
↓
SaveImage
```

현재 JSON에서 확인된 노드와 값:

| 항목 | 노드 | 현재 값 |
| --- | --- | --- |
| Checkpoint | `CheckpointLoaderSimple` | `dreamshaper_8.safetensors` |
| LoRA | `LoraLoader` | `[Qwen.Image]PixelArt_Redmond.safetensors` |
| LoRA strength model | `LoraLoader` | `0.45` |
| LoRA strength clip | `LoraLoader` | `0.7` |
| Input image | `LoadImage` | `sheet-256-magenta-preview.png` |
| ControlNet model | `ControlNetLoader` | `control_v11p_sd15_canny.pth` |
| Canny low / high | `Canny` | `0.35 / 0.75` |
| ControlNet strength | `ControlNetApplyAdvanced` | `0.35` |
| ControlNet start / end | `ControlNetApplyAdvanced` | `0.0 / 0.60` |
| KSampler steps | `KSampler` | `20` |
| KSampler cfg | `KSampler` | `4.5` |
| KSampler sampler | `KSampler` | `euler` |
| KSampler scheduler | `KSampler` | `simple` |
| KSampler denoise | `KSampler` | `0.14` |
| Save prefix | `SaveImage` | `ComfyUI` |

초기 실험에서 후보로 남겨둔 튜닝 범위:

```text
LoRA:
- strength_model: 0.45 ~ 0.50
- strength_clip: 0.70

KSampler:
- steps: 20
- cfg: 4.5
- sampler: euler
- scheduler: simple
- denoise: 0.12 ~ 0.14

Canny:
- 현재 JSON: 0.35 / 0.75

ControlNet:
- 현재 JSON: strength 0.35, end 0.60
```

첫 구현 전에는 현재 JSON 값을 기준으로 한 번 재현하고 이후 후보값을 비교한다.

## Prompt

Positive prompt:

```text
pixel art,
retro game sprite sheet,
same car as input image,
preserve original silhouette,
preserve original viewpoint,
clean outline,
limited color palette,
subtle pixel detail
```

Negative prompt:

```text
different car,
convertible,
pickup truck,
changed viewpoint,
extra wheels,
deformed car,
photo,
realistic,
blur,
watermark,
text,
logo,
gradient
```

## 입력 이미지 정책

검정 배경보다 마젠타 배경을 우선 사용한다.

검정 배경은 차량 하단 그림자와 바퀴를 배경으로 혼동하기 쉽다. 마젠타 배경은 전경과 배경의 경계가 분명해서 차량 실루엣, 창문, 루프라인 유지에 유리했다.

대표 입력:

```text
games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png
```

현재 repo에는 같은 패턴으로 `genesis-g70`, `kia-stinger`, `toyota-gt86`의 96/128/256 후보가 있다. v1 검증은 `genesis-g70-256` 한 장을 기준 샘플로 삼는다.

## 프로젝트 내 배치 방향

Apex Seoul에는 이미 `games/apex-seoul/scripts/` 아래에 차량 렌더링, 픽셀 패스, QA 스크립트가 모여 있다. 따라서 v1 구현은 별도 `tools/` 폴더보다 기존 스크립트 흐름에 맞춰 `scripts/ai-asset-compiler/` 아래에 두는 편이 자연스럽다.

권장 구조:

```text
games/apex-seoul/
  scripts/
    ai-asset-compiler/
      comfy-client.mjs
      run-apex-retro-filter.mjs
      README.md
      workflows/
        retro-style-filter-v1.workflow.json
        retro-style-filter-v1.api.json
```

파일 역할:

| 파일 | 역할 |
| --- | --- |
| `retro-style-filter-v1.workflow.json` | ComfyUI UI workflow 원본 보관용 |
| `retro-style-filter-v1.api.json` | `/prompt` API 호출용 JSON |
| `comfy-client.mjs` | ComfyUI HTTP API 호출, history polling, output 다운로드 |
| `run-apex-retro-filter.mjs` | Apex Seoul 차량 시트 하나를 입력으로 받아 결과 PNG 저장 |
| `README.md` | ComfyUI 실행 조건, 모델 경로, 추천 파라미터, 실행 예시 |

현재 `docs/retro-asset-studio/retro_style_filter_v1.json`은 문서 검토용 원본으로 유지한다. 구현 단계에서 위 workflow 폴더로 복사하거나 API format export를 새로 저장한다.

## 구현 전 결정해야 할 것

1. `retro_style_filter_v1.json`을 API prompt format으로 다시 export할지, 현재 변환 스크립트를 사용할지 결정한다.
2. ComfyUI 입력 이미지는 우선 `/upload/image` API로 보낸다.
3. 결과 파일명 규칙을 정한다.
4. 첫 기준 파라미터는 JSON 현재값으로 둔다.

v1에서는 단순함을 우선한다.

```text
입력:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png

출력:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png
```

## 다음 구현 단계

문서 정리가 끝나면 다음 순서로 진행한다.

1. `docs/retro-asset-studio/scripts/run-retro-filter.mjs --ping`으로 ComfyUI 연결을 확인한다.
2. `--dry-run`으로 API prompt JSON 변환 결과를 저장한다.
3. `npm run run:g70`로 `genesis-g70-256` 한 장을 먼저 변환한다.
4. 결과 이미지를 육안 확인해서 차종, 방향, 바퀴 위치, 창문/루프라인이 유지되는지 본다.
5. `npm run run:stinger`, `npm run run:ft86`로 나머지 두 장을 변환한다.
6. 세 차량 모두 같은 품질이면 `npm run run:all`을 정식 배치 명령으로 사용한다.
7. 결과가 흔들리면 denoise, ControlNet strength/end, Canny threshold 순서로만 좁게 튜닝한다.

예상 실행 형태:

```bash
node docs/retro-asset-studio/scripts/run-retro-filter.mjs --run \
  --input games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png \
  --output games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png
```

차량 preset 실행:

```bash
cd docs/retro-asset-studio
npm run ping
npm run dry-run
npm run run:g70
npm run run:stinger
npm run run:ft86
```

전체 배치:

```bash
cd docs/retro-asset-studio
npm run run:all
```

## v2 이후 계획

v1은 현재 workflow의 재현성과 자동화에 집중한다.

v2에서는 Three.js renderer에서 아래 보조 이미지를 함께 출력하도록 확장한다.

```text
sheet.png
sheet-depth.png
sheet-normal.png
sheet-mask.png
```

v2 목표:

```text
Three.js Render
↓
Color / Depth / Normal / Mask 출력
↓
ComfyUI에서 Depth ControlNet 추가
↓
차량 볼륨, 루프, 휀더, 범퍼 형태 유지 개선
```

v3 목표:

```text
AI output
↓
Palette Quantization
↓
Outline Cleanup
↓
Magenta to Transparent
↓
SpriteSheet Optimizer
```

최종 목표는 Apex Seoul 전용 `AI Asset Compiler`다. 다만 당장은 `genesis-g70-256` 한 장을 안정적으로 변환하는 v1 파이프라인을 먼저 고정한다.

## 현재 구현 상태와 다음 단계

v1의 기본 자동화는 동작한다.

완료된 것:

```text
ComfyUI Docker/local endpoint 연결
WSL loopback fallback
UI workflow JSON -> API prompt 변환
CLIPTextEncode text mapping
image upload -> /prompt -> history polling -> output download
vehicle preset: ft86 / g70 / stinger
variant preset: safe / balanced / stylized
palette-lock 후처리
````

현재 기준 실험 차량은 FT86이다.
G70/VDrift XG 교체는 문서화만 완료하고 구현은 보류한다.

FT86 실행:

```bash
cd docs/retro-asset-studio
npm run ping
npm run dry-run
npm run run:ft86
npm run run:ft86:variants
```

현재 판단:

```text
safe:
fallback 후보

balanced:
FT86 v1 기본 후보

stylized:
디자인 실험용, runtime 기본 후보 아님
```

다음 구현 단계는 ComfyUI 튜닝이 아니라 게임용 후처리다.

1. `sheet-256-ai-retro-v1-balanced.png`를 기준 후보로 유지한다.
2. `sheet-256-ai-retro-v1.png`는 runtime alias 후보로 둔다.
3. magenta background를 alpha로 복원하는 후처리 스크립트를 만든다.
4. body palette만 교체하는 utility를 만든다.
5. Phaser runtime에서 red/blue/yellow/silver FT86 후보를 나란히 표시한다.
6. 도로 위 시인성, 후미등, 휠, 전복 프레임을 QA한다.
7. body가 너무 어두우면 `palette-lock.mjs`의 body ramp만 조정한다.

### v1.5: runtime color swap

Depth/Normal/Mask로 넘어가기 전에, 현재 balanced output이 Phaser에서 색상 교체 가능한지 먼저 확인한다.

목표:

```text
AI retro output
↓
magenta-to-alpha
↓
body palette swap
↓
Phaser runtime QA
````

이 단계에서는 shader보다 exact-color palette replacement를 우선한다.
`setTint()`는 빠른 테스트 외에는 사용하지 않는다. 차체뿐 아니라 유리, 타이어, 후미등까지 물들 가능성이 있기 때문이다.

색상 교체 대상은 body ramp뿐이다.

```text
교체 대상:
body base / body dark / body highlight

유지 대상:
glass
tire
rim
tail light
outline
alpha
```
