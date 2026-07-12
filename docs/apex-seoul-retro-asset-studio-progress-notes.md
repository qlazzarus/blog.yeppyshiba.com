# Apex Seoul Retro Asset Studio 진행 메모

이 문서는 Apex Seoul 차량 스프라이트 제작 파이프라인을 블로그 글로 정리하기 위한 임시 글감이다. 동시에 현재 진행 중인 `docs/retro-asset-studio` 작업 맥락을 잃지 않기 위한 작업 로그로 사용한다.

현재 주제는 "실제 차량 3D 모델을 직접 게임 asset으로 쓰는 것"이 아니라, Three.js로 만든 차량 스프라이트시트를 ComfyUI 기반 Retro Style Filter에 통과시켜 Phaser에서 쓸 수 있는 레트로 스프라이트 후보를 만드는 것이다.

## 2026-07-12: Windows ComfyUI 재검증과 FT86 control 실험

ComfyUI를 Windows PC의 `http://192.168.0.17:8188`에서 다시 연결했다. API ping, FT86 업로드, prompt queue, history polling, output download, palette lock까지 실제로 통과했다.

```text
ComfyUI 0.26.2
GPU: NVIDIA GeForce RTX 3080
FT86 balanced fixed seed: 464901062956189
prompt: d329d201-a6ed-4066-8035-094e0b02d9f0
execution: success, 약 78초
```

기술적 연결은 승인할 수 있지만, 결과물은 아직 art-direction 승인이 아니다. source pose grid는 유지됐으나 은색의 현실적 표면 질감이 남고 일부 pose의 viewpoint가 너무 강하게 변했다.

`safe`와 Canny 강화(`strength 0.55`, `end 0.75`) 비교도 실행했다. 이 과정에서 variant preset이 CLI 옵션을 다시 덮어쓰는 결함을 발견해 수정했다. 이제 명시한 `--controlnet-strength`, `--controlnet-end`, denoise, CFG, LoRA 강도, step 계열 옵션은 선택한 preset보다 우선한다.

수정 후 Canny 강화 값이 ComfyUI API prompt와 `.pipeline.json`에 기록된 것까지 확인했다. 그러나 고정 seed + 현재 저 denoise 조건에서는 강화안의 palette-locked PNG가 balanced baseline과 byte-identical이었다. 다음 비교는 Canny 수치만 올리는 것이 아니라, 원본 alpha silhouette/contact mask를 ComfyUI의 native mask 또는 추가 control로 연결하는 `drift-safe-mask`여야 한다.

Windows ComfyUI의 native mask nodes도 확인했다. `LoadImageMask`, `InvertMask`, `VAEEncodeForInpaint`, `SetLatentNoiseMask`를 이용해 source alpha 실험을 세 번 실행했다. alpha 방향을 그대로 쓴 inpaint는 배경을 변환했고, 반전한 inpaint는 일반 DreamShaper checkpoint와 맞지 않아 차량 내부가 회색 실루엣으로 붕괴했다. 반면 일반 `VAEEncode` 뒤에 `SetLatentNoiseMask`를 연결한 결과는 배경과 차량 외곽을 유지하면서 차량 영역만 샘플링했다.

이 latent-mask 결과는 technical feasibility를 통과했지만 승인 후보는 아니다. 현재 low denoise와 고정 seed에서는 balanced보다 art style이 충분히 개선되지 않는다. 따라서 mask path를 canonical workflow에 넣기 전에 seed 또는 denoise만 좁게 바꾼 추가 비교가 필요하다. 모든 실험 출력은 `/tmp`와 ComfyUI output에만 두었고, runtime asset은 바꾸지 않았다.

후속 sweep도 완료했다. latent-mask 상태에서 denoise `0.16`, `0.20`, `0.24`를 같은 seed로 비교했고, 가장 안정적인 `0.16`에서 3개 seed도 비교했다. 이어 PixelArt LoRA model/CLIP 강도를 `0.75/0.9`, `0.9/1.0`으로 올리고 flat 16-bit, chunky cluster, hard ramp, no photorealism prompt를 추가한 후보도 만들었다. 모든 후보가 외곽과 pose grid는 유지했지만 현실적인 회색 차량 재질을 유의미하게 벗어나지 못했다.

따라서 이번 모델 조합(DreamShaper 8 + `[Qwen.Image]PixelArt_Redmond`)에서는 parameter sweep을 더 넓히지 않는다. 이 모델은 현재 pipeline에서 silhouette-safe style reference일 뿐, final pixel-art generator가 아니다. 다음 개선은 compatible pixel-art checkpoint/LoRA를 확보해 같은 latent-mask safety path에서 재검증하거나, 새 모델 없이 deterministic pixel/postprocess를 우선하는 것이다.

후속 조사에서 원인 후보를 확인했다. 현재 LoRA는 Qwen Image 2512용이며 DreamShaper SD 1.5와 같은 architecture family가 아니다. 이 때문에 강도와 prompt를 바꿔도 의도한 pixel-art style이 거의 나타나지 않았을 가능성이 크다. 다음 설치 제안과 라이선스/검증 순서는 `docs/retro-asset-studio/model-candidate-evaluation.md`에 별도 기록했다. 가장 낮은 위험의 첫 후보는 DreamShaper를 그대로 쓰는 SD 1.5용 `PixelArtRedmond15V-PixelArt-PIXARFK.safetensors`다.

## 이번 글의 한 줄

Windows에서 굴리던 ComfyUI 실험을 WSL 아래 프로젝트로 옮기면서, localhost 연결 문제보다 먼저 Node 런타임과 ComfyUI workflow JSON 변환 문제가 파이프라인을 막고 있다는 것을 확인했다.

## 제목 후보

1. `Apex Seoul Retro Asset Studio - WSL에서 ComfyUI 파이프라인 살리기`
2. `Phaser 4 레이싱 게임 차량 스프라이트에 AI 스타일 필터 얹기`
3. `Apex Seoul 차량 스프라이트 제작 파이프라인을 ComfyUI API로 자동화하기`
4. `Three.js 렌더 스프라이트를 레트로 게임 asset으로 다듬기`

현재 톤으로는 1번이 가장 자연스럽다. 이번 글은 예쁜 결과물 자랑보다, 로컬 생성 파이프라인을 실제 프로젝트 안에 붙이는 과정에서 부딪힌 문제를 다루는 글이다.

## 배경

기존에는 Windows 환경에서 `blog.yeppyshiba.com` 프로젝트와 ComfyUI 실험을 진행했다. npm/node 이슈가 계속 걸려 프로젝트를 통째로 WSL 아래로 옮겼고, 이때 `docs/retro-asset-studio`가 함께 들어왔다.

이전 가정은 단순했다.

```text
ComfyUI:
http://127.0.0.1:8188

Script:
npm run ping
npm run run:g70
```

하지만 WSL에서는 `127.0.0.1`의 의미가 환경에 따라 달라질 수 있다. ComfyUI가 WSL 안의 Docker Compose로 떠 있으면 WSL의 localhost가 맞다. 반대로 ComfyUI가 Windows에서 직접 돌고 있으면 WSL의 localhost는 Windows 프로세스를 가리키지 않을 수 있다.

## 현재 Retro Asset Studio 구조

```text
docs/retro-asset-studio/
  README.md
  docker-compose.yml
  package.json
  retro_style_filter_v1.json
  workflows/
    retro_style_filter_v1.api.json
  scripts/
    check-node-version.cjs
    comfy-client.mjs
    run-retro-filter.mjs
    workflow.mjs
```

역할:

| 파일 | 역할 |
| --- | --- |
| `retro_style_filter_v1.json` | ComfyUI UI workflow export |
| `workflows/retro_style_filter_v1.api.json` | dry-run으로 만든 API prompt 확인용 JSON |
| `workflow.mjs` | UI workflow를 `/prompt` API용 prompt로 변환 |
| `comfy-client.mjs` | ComfyUI HTTP API 호출, upload, queue, history polling, download |
| `run-retro-filter.mjs` | ping, dry-run, vehicle preset 실행 |
| `check-node-version.cjs` | WSL의 오래된 Node를 빠르게 감지 |

## 차량 preset

현재 자동화 대상은 Apex Seoul의 256px magenta preview sheet다.

```text
g70:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png
-> games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png

stinger:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/kia-stinger-256/sheet-256-magenta-preview.png
-> games/apex-seoul/assets/vehicles/generated/pixel-candidates/kia-stinger-256/sheet-256-ai-retro-v1.png

ft86:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png
-> games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png
```

## 문제 1: WSL의 Node 버전

처음 `npm run ping`을 실행했을 때 ComfyUI 연결 문제가 아니라 Node 문법 오류가 먼저 났다.

```text
SyntaxError: Unexpected identifier
```

원인은 WSL의 기본 `node`가 `v10.19.0`이었던 것이다. 현재 스크립트는 다음 기능에 기대고 있다.

- native ESM
- `fetch`
- `Blob`
- `FormData`

따라서 Node.js 18 이상이 필요하다. 이 문제를 빠르게 알아차릴 수 있도록 `package.json`에 `engines.node >=18`을 추가했고, `check-node-version.cjs` helper도 남겨뒀다.

현재 `package.json` scripts에는 아직 `pre*` hook이 없으므로, 오래된 Node에서 다음 안내를 항상 보장하려면 helper를 `preping`, `predry-run`, `prerun` 등에 연결해야 한다.

```text
retro-asset-studio requires Node.js 18 or newer.
```

글에 쓸 포인트:

- WSL로 프로젝트를 옮겼다고 해서 개발 런타임까지 자동으로 정리되는 것은 아니다.
- `localhost`를 의심하기 전에 `node --version`부터 확인해야 했다.
- 실패 메시지를 사람이 바로 이해할 수 있게 바꾸는 것도 파이프라인 안정화의 일부다.

## 문제 2: WSL localhost

`comfy-client.mjs`의 기본 endpoint는 다음 값이다.

```text
http://127.0.0.1:8188
```

이 값은 ComfyUI가 WSL 안에서 직접 실행 중이거나, WSL Docker Compose가 포트를 publish하는 경우에는 맞다.

하지만 ComfyUI가 Windows 쪽에서 돌고 있다면 WSL의 `127.0.0.1`이 곧바로 Windows 프로세스를 의미하지 않을 수 있다. 그래서 다음 개선을 넣었다.

- `COMFYUI_URL` 환경변수 지원
- `COMFY_URL` 환경변수 지원
- `--comfy-url` CLI 옵션 유지
- 기본 URL이 loopback일 때 WSL host 후보 자동 탐색
- ComfyUI API 요청 5초 timeout 추가

사용 예:

```bash
COMFYUI_URL=http://127.0.0.1:8188 npm run ping
npm run ping -- --comfy-url http://127.0.0.1:8188
COMFYUI_URL=http://<windows-host-ip>:8188 npm run ping
```

현재 실제 사용자의 WSL 터미널에서는 다음 연결이 성공했다.

```text
Connected to ComfyUI 0.26.2 at http://127.0.0.1:8188
```

즉 현재 PC에서는 `127.0.0.1:8188`로 ComfyUI 접근이 가능하다.

## 문제 3: ComfyUI UI workflow와 API prompt는 다르다

`retro_style_filter_v1.json`은 ComfyUI의 UI workflow export다. `/prompt` API가 받는 API prompt JSON과 구조가 다르다.

그래서 `workflow.mjs`에서 UI workflow를 API prompt로 변환하고 있다. 링크는 다음처럼 변환한다.

```text
UI input link
-> API input: ["nodeId", outputIndex]
```

또 ComfyUI widget 값은 노드 타입별로 API input 이름에 매핑해야 한다.

예:

```js
const widgetInputsByNodeType = {
    CheckpointLoaderSimple: ['ckpt_name'],
    LoadImage: ['image', 'upload'],
    KSampler: ['seed', 'control_after_generate', 'steps', 'cfg', 'sampler_name', 'scheduler', 'denoise'],
};
```

여기서 실제 오류가 발생했다.

## 문제 4: CLIPTextEncode의 text 누락

`npm run run:g70` 실행은 ComfyUI 연결과 이미지 업로드까지 성공했다.

```text
Connected to ComfyUI 0.26.2 at http://127.0.0.1:8188
[g70] Uploading games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png
[g70] Uploaded sheet-256-magenta-preview.png
```

하지만 `/prompt` 요청에서 400 오류가 났다.

```text
Prompt outputs failed validation
node_errors:
  13 CLIPTextEncode required_input_missing text
  14 CLIPTextEncode required_input_missing text
```

원인은 간단했다. UI workflow 안에는 Positive Prompt와 Negative Prompt가 `widgets_values`에 들어 있었다.

```text
node 13 Positive Prompt:
pixel art,
retro game sprite sheet,
same car as input image,
preserve original silhouette,
preserve original viewpoint,
clean outline,
limited color palette,
subtle pixel detail

node 14 Negative Prompt:
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

하지만 변환 테이블에 `CLIPTextEncode`가 없어서 API prompt의 `inputs.text`가 만들어지지 않았다.

수정:

```js
const widgetInputsByNodeType = {
    Canny: ['low_threshold', 'high_threshold'],
    CheckpointLoaderSimple: ['ckpt_name'],
    CLIPTextEncode: ['text'],
    ControlNetApplyAdvanced: ['strength', 'start_percent', 'end_percent'],
    ControlNetLoader: ['control_net_name'],
    KSampler: ['seed', 'control_after_generate', 'steps', 'cfg', 'sampler_name', 'scheduler', 'denoise'],
    LoadImage: ['image', 'upload'],
    LoraLoader: ['lora_name', 'strength_model', 'strength_clip'],
    SaveImage: ['filename_prefix'],
};
```

이후 `dry-run`으로 생성한 `workflows/retro_style_filter_v1.api.json`의 노드 13/14에 `text`가 들어가는 것을 확인했다.

## 현재 성공한 실행

수정 후 g70 preset 실행이 성공했다.

```text
Connected to ComfyUI 0.26.2 at http://127.0.0.1:8188
[g70] Uploading games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png
[g70] Uploaded sheet-256-magenta-preview.png
[g70] Queued prompt e00c768b-7a0b-49be-96c3-24b4f83bac21
[g70] Saved games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png
```

생성 산출물:

```text
games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png
```

현재 파일 크기:

```text
750K
```

## 색상 안정화 1차 조정

초기 `sheet-256-ai-retro-v1.png` 결과를 보니 차체가 너무 밝은 회청색으로 남고, 타이어/휠 색도 ComfyUI가 밝은 금속처럼 재해석하는 문제가 있었다.

이 문제는 ComfyUI prompt만으로 해결하기보다 파이프라인 책임을 나누는 쪽이 맞다.

```text
Three.js render:
차체/유리/라이트/타이어의 기준 재질과 색을 정한다.

pixel-pass:
타이어/림처럼 작은 부품을 geometry 기반으로 palette lock한다.

ComfyUI:
실루엣을 유지한 채 픽셀풍 디테일만 얹는다.

final palette lock:
ComfyUI가 흔든 색을 게임용 제한 palette로 다시 고정한다.
```

현재 반영한 내용:

- `real-vehicle-poc.json`의 `genesis-g70-poc`에 `materialOverrides["#0"]` 추가
- `pixel-pass-vehicle-sheet.mjs`의 wheel restore 대상 pose를 left/right 전체로 확장
- `run-retro-filter.mjs` 기본 `denoise`를 `0.14`에서 `0.1`로 낮춤
- ComfyUI prompt에 `preserve input body color`, `dark rubber tires` 추가
- negative prompt에 `changed body color`, `white tires`, `chrome tires` 추가
- `palette-lock.mjs`를 추가해 ComfyUI 다운로드 후 차체/유리/타이어/라이트 palette를 결정론적으로 고정
- `palette-lock.mjs`의 색상을 `body`, `glass`, `lights`, `wheel` 역할별 palette로 분리
- 차후 Phaser 런타임에서 차체색을 바꿀 때는 최종 PNG의 `body` palette 색만 exact-color replacement 또는 small lookup shader로 교체하는 방향을 우선 검토

현재 한계:

- Codex WSL 환경에서 Playwright Chromium 실행에 필요한 시스템 라이브러리(`libatk-1.0.so.0`)가 없어 Three.js pose sheet 재렌더는 완료하지 못했다.
- `playwright install-deps chromium`은 sudo 비밀번호가 필요해 중단됐다.
- 따라서 현재 생성된 `sheet-256-ai-retro-v1.png`는 기존 pose sheet 기반 pixel-pass + ComfyUI + final palette lock 결과다.
- material override는 manifest에 반영됐지만, 실제 pose sheet에는 아직 재렌더가 필요하다.

현재 palette lock 결과는 파일 크기가 크게 줄어 제한 palette가 적용된 상태다.

```text
games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png
59K
```

추가 조정:

- 사용자가 타이어와 차체가 여전히 같은 색처럼 보인다고 리뷰했다.
- 확인 결과 파일은 맞았지만 차체 최빈색이 너무 어두워 타이어와 시각적으로 붙어 보였다.
- 차체/유리 계열 palette를 한 단계 더 밝히고, 타이어는 `8,10,14`로 유지했다.
- 이후 정후면 프레임의 차체 하단에 두 개의 동그라미가 생기는 문제가 발견됐다.
- 원인은 `center`, `downhill-center`, `uphill-center` 같은 rear-facing pose에서 QA의 `wheelCenters`를 그대로 타이어 ellipse로 칠한 것이다.
- rear-facing pose에서는 원형 wheel lock을 적용하지 않고, 해당 영역을 차체 하단 음영으로 되돌리도록수정했다.
- 추가 리뷰에서 다른 spritesheet pose에도 둥근 원이 남는 것이 확인됐다.
- 결론: 현재 QA 기반 wheel ellipse 보정 자체가 spritesheet에 잘못된 타이어 마크를 찍을 위험이 크다.
- 따라서 `palette-lock.mjs`의 wheel palette lock은 기본 비활성화하고, ComfyUI 결과에는 차체/유리/라이트 palette lock만 적용한다.
- 타이어 색상은 추후 Three.js material 또는 별도 semantic mask가 생긴 뒤 다시 다룬다.
- 최신 `sheet-256-ai-retro-v1.png`의 주요 palette:

```text
background: 255,0,255
body/glass base: 102,124,134
tire: 8,10,14
rear light dark: 88,18,24
rim: 62,76,86
```

## 현재 명령어

기본 연결 확인:

```bash
cd docs/retro-asset-studio
npm run ping
```

API prompt 생성 확인:

```bash
npm run dry-run
```

G70 실행:

```bash
npm run run:g70
```

전체 차량 실행:

```bash
npm run run:all
```

## 소스 모델 방향 전환: VDrift asset 우선

현재 `genesis-g70-256` 결과에서 반복되는 핵심 문제는 ComfyUI가 아니라 입력 3D 모델/렌더 소스 쪽에 가깝다.

확인한 내용:

- 현재 `genesis_g70-optimized.glb`는 mesh/material 이름이 `Object_0`, `Material__279`처럼 비의미적이다.
- glTF 내부 material factor도 대부분 `[1, 1, 1, 1]` 계열이라 차체/유리/타이어/림/라이트를 안정적으로 분리하기 어렵다.
- QA의 `wheelCenters`를 이용해 타이어 ellipse를 덧칠하는 방식은 rear/side pose에서 잘못된 원형 마크를 만들 수 있다.
- 따라서 현재 모델 위에서 타이어를 억지로 보정하는 방식은 중단한다.

다음 방향은 VDrift asset을 기반으로 coupe/sports-car proxy를 찾는 것이다.

선택 이유:

- VDrift는 오픈소스 레이싱/드리프트 시뮬레이터 asset pool이라 차량용 mesh를 찾을 가능성이 높다.
- 실제 Genesis Coupe 이름이나 브랜드를 그대로 쓰지 않고, Apex Seoul용 fictional coupe proxy로 재해석하기에 적합하다.
- 중요한 기준은 "정확히 Genesis Coupe와 닮았는가"보다 "Three.js 렌더에서 body/glass/tire/rim/light material을 분리할 수 있는가"다.

다음 세션에서 할 일:

1. VDrift repository/asset 구조를 내려받거나 확인한다.
2. coupe 또는 sports-car 계열 후보 모델을 2-3개 고른다.
3. 각 후보의 license, format, texture/material 구조를 확인한다.
4. Three.js/glTF 변환이 쉬운 후보를 하나 선택한다.
5. 기존 `genesis-g70-256` pipeline을 새 fictional coupe preset으로 복제한다.
6. 차체 색상은 Phaser 런타임에서 교체 가능하도록 body palette 또는 body material ID를 분리해 유지한다.

판단 기준:

```text
우선순위 1: material/part separation
우선순위 2: low-angle sprite에서 coupe silhouette가 읽히는지
우선순위 3: license를 프로젝트 문서에 명확히 남길 수 있는지
우선순위 4: Genesis Coupe의 비율을 느슨하게 참고할 수 있는지
```

블로그 글에서는 이 전환을 "AI 후처리 실패"가 아니라 "asset compiler에서 입력 truth의 품질이 더 중요하다는 교훈"으로 정리하면 좋다.

### VDrift 후보 1차 조사 결과

VDrift 공식 문서 기준으로 차량 데이터는 GitHub code repository가 아니라 SourceForge의 `vdrift-data` SVN repository에 있다. 전체 data snapshot은 매우 크므로, 이번에는 후보 차량의 tree HTML과 `.car` 설정만 내려받아 구조를 비교했다.

VDrift 차량 포맷의 장점:

- 차량은 `.car` 설정 파일에서 `[body]`, `[glass]`, `[interior]`, `[wheel.*]`, `[wheel.*.tire]`, `[light-brake]`, `[light-reverse]`처럼 파트가 분리된다.
- mesh는 `body.joe`, `glass.joe`, `interior.joe`, `oem_wheel.joe` 같은 JOE 파일로 나뉜다.
- texture도 `body00.png`, `glass.png`, `interior.png`, `oem_wheel.png`, `brake.png`, `reverse.png`로 나뉜다.
- 따라서 지금 문제가 된 "타이어/차체가 한 덩어리로 보이는 문제"를 소스 asset 단계에서 해결하기에 적합하다.

비교한 후보:

| 후보 | 원본 참조명 | 평가 |
| --- | --- | --- |
| `350Z` | Nissan 350Z | 실루엣은 좋지만 wheel mesh가 shared `carparts` 참조라 intake 범위가 조금 넓어진다. |
| `M7` | Mazda RX-7 FD | 스포츠 coupe 실루엣은 좋지만 wheel mesh가 shared `carparts` 참조다. |
| `TC6` | Toyota Celica 6th generation | local `oem_wheel`까지 있어 구조는 좋지만 90년대 Celica/Rally 느낌이 강하다. |
| `XG` | BMW 330cxi | body/glass/interior/oem_wheel/brake/reverse가 모두 있고 현대 coupe proxy로 가장 균형이 좋다. |
| `Z06` | Chevrolet C5 Corvette Z06 | 실루엣은 강하지만 별도 `interior.joe`가 없어 우선순위가 내려간다. |

현재 선택:

```text
selected VDrift candidate: XG
fictional preset id: raven-xg-coupe-poc
source manifest: games/apex-seoul/assets/vehicles/source/manifests/vdrift-coupe-intake.json
```

주의할 점:

* `XG`라는 원본 ID와 원본 차량명은 작업용 source reference로만 둔다.
* 게임 안에서는 `Raven XG Coupe POC` 또는 이후 더 적절한 fictional 이름으로 사용한다.
* VDrift asset은 GPL-3.0 프로젝트/data 계열로 취급해야 하므로, 실제 포함/배포 전에 라이선스 표기를 명확히 해야 한다.
* 현재 Apex Seoul 렌더 파이프라인은 GLB/Three.js 중심이다. VDrift의 `.joe` 파일은 바로 렌더할 수 없으므로 JOE-to-glTF 변환 단계가 필요하다.

다음 구현 순서:

1. `XG`의 source files와 필요한 shared `carparts`만 내려받는다.
2. JOE mesh parser 또는 Blender import/export 경로로 `body`, `glass`, `interior`, `oem_wheel`을 glTF/GLB로 변환한다.
3. 변환된 GLB의 material name을 `body`, `glass`, `interior`, `wheel`, `tire`, `brake_light`, `reverse_light`로 고정한다.
4. 그 다음에만 `real-vehicle-poc.json`에 `raven-xg-coupe-poc`를 추가한다.
5. pose sheet -> pixel-pass -> ComfyUI retro filter 순서로 다시 검증한다.

## G70 대체 대작업 계획안

목표는 현재 player vehicle 기준처럼 쓰이고 있는 `genesis-g70-poc`/`g70` 라인을 VDrift `XG` 기반 fictional coupe로 교체하는 것이다. 단, 교체 결과물은 원본 `XG`/BMW 이름을 게임 표면에 노출하지 않고 `raven-xg-coupe-poc` 같은 내부 POC 이름으로만 다룬다.

이번 작업은 "기존 G70 asset을 덮어쓰기"가 아니라, 새 fictional coupe 라인을 끝까지 만든 뒤 런타임 참조를 갈아끼우는 방식으로 진행한다. 그래야 중간 실패 시 현재 실행 가능한 `genesis-g70-poc` approved asset을 보존할 수 있다.

### 교체 원칙

- `genesis-g70-poc` approved sprite/atlas는 새 후보가 승인되기 전까지 삭제하거나 덮어쓰지 않는다.
- 새 라인의 canonical id는 `raven-xg-coupe-poc`로 둔다.
- source reference는 `VDrift XG`지만, 게임 내 이름/블로그 표현은 fictional coupe로 정리한다.
- 타이어/차체 분리는 ComfyUI나 QA ellipse 보정으로 해결하지 않고, 변환된 GLB의 material/mesh name으로 해결한다.
- Phaser 런타임 차체색 교체를 위해 `body` material 또는 최종 `body` palette를 끝까지 보존한다.

### 예상 변경 범위

| 영역 | 현재 | 목표 |
| --- | --- | --- |
| source intake | `vdrift-coupe-intake.json` | `XG` 원본 파일과 shared carparts 목록 확정 |
| source model | 없음 | `assets/vehicles/source/vdrift/xg/...` 또는 유사 vendor 경로 |
| optimized model | 없음 | `assets/vehicles/optimized/raven-xg-coupe-poc.glb` |
| render manifest | `genesis-g70-poc` 중심 | `raven-xg-coupe-poc` 추가 후 검증 |
| pose sheet | `poc-genesis-g70-scaled-final.png` | `poc-raven-xg-coupe-256-source.png` 또는 동일 패턴 |
| pixel candidate | `genesis-g70-256` | `raven-xg-coupe-256` |
| retro preset | `run:g70` | `run:raven-xg` 추가 후 `run:g70` deprecate |
| approved atlas/sprite | `genesis-g70-poc-128.*` | `raven-xg-coupe-poc-128.*` |
| runtime import | `genesisG70Vehicle*` | `ravenXgCoupeVehicle*` |
| texture keys | `player-vehicle-genesis-g70-poc` | `player-vehicle-raven-xg-coupe-poc` |

### 단계별 실행 계획

1. Source intake 고정
   - VDrift `XG` 디렉터리에서 필요한 파일을 확정한다.
   - 최소 필요 파일은 `XG.car`, `body.joe`, `body00.png`, `body-misc1.png`, `glass.joe`, `glass.png`, `glass-misc1.png`, `interior.joe`, `interior.png`, `oem_wheel.joe`, `oem_wheel.png`, `oem_wheel-misc1.png`, `brake.png`, `reverse.png`다.
   - shared `carparts`에서 필요한 tire/rotor/driver/steering 파일은 첫 번째 POC에서는 제외하거나 placeholder material로 대체한다.

2. JOE-to-glTF 변환 경로 결정
   - 우선순위 A: VDrift JOE parser를 Node script로 최소 구현해 glTF를 생성한다.
   - 우선순위 B: VDrift blender-scripts 또는 Blender import/export를 사용한다.
   - 선택 기준은 "반복 가능한 CLI 자동화가 가능한가"와 "material name을 우리가 원하는 이름으로 고정할 수 있는가"다.

3. `raven-xg-coupe-poc.glb` 생성
   - mesh/material name을 최소 `body`, `glass`, `interior`, `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`, `brake_light`, `reverse_light`로 둔다.
   - tire가 procedural/generated인 경우라도 별도 dark material을 가진 mesh로 생성한다.
   - GLB 검수 JSON을 만들어 material 목록과 bounding box를 기록한다.

4. 렌더 manifest 추가
   - `real-vehicle-poc.json`에 `raven-xg-coupe-poc`를 추가한다.
   - 이때 `genesis-g70-poc`는 남겨둔다.
   - output은 `assets/vehicles/generated/pose-sheets/poc-raven-xg-coupe-scaled.png` 계열로 분리한다.

5. Pose sheet와 pixel candidate 생성
   - Playwright/Chromium system dependency 문제를 해결한 뒤 렌더한다.
   - `pixel-pass-vehicle-sheet.mjs`로 `raven-xg-coupe-256` 후보를 만든다.
   - QA wheel ellipse correction은 계속 기본 비활성화한다.

6. Retro Asset Studio preset 교체
   - `docs/retro-asset-studio/scripts/run-retro-filter.mjs`에 `raven-xg` preset을 추가한다.
   - `package.json`에 `run:raven-xg`를 추가한다.
   - `run:g70`는 바로 삭제하지 않고 deprecated alias로 잠시 유지할지 결정한다.
   - README와 plan 문서의 기준 샘플을 `genesis-g70-256`에서 `raven-xg-coupe-256`으로 바꾼다.

7. Approved asset export
   - 후보가 괜찮으면 `export-vehicle-atlas.mjs`로 `raven-xg-coupe-poc-128` 또는 필요한 target size를 export한다.
   - shadow sprite도 같은 이름으로 생성한다.
   - atlas metadata의 `vehicleId`가 `raven-xg-coupe-poc`인지 확인한다.
8. Phaser runtime 교체
   - `games/apex-seoul/src/main.ts`의 import를 `genesis-g70-poc` approved asset에서 `raven-xg-coupe-poc` approved asset으로 바꾼다.
   - `PLAYER_VEHICLE_TEXTURE_KEY`, `PLAYER_VEHICLE_SHADOW_TEXTURE_KEY`도 새 ID로 바꾼다.
   - 기존 steering/frame lookup은 atlas frame id가 같으면 유지한다.

9. 검증
   - asset pipeline: source -> GLB -> pose sheet -> pixel candidate -> retro filter -> approved atlas.
   - runtime: Phaser 화면에서 center/steer/uphill/downhill pose가 정상 표시되는지 확인.
   - 색상: body/glass/tire/rim/light palette가 서로 섞이지 않는지 확인.
   - 라이선스: VDrift GPL-3.0 출처와 사용 범위를 문서에 남긴다.

### 중단 가능한 체크포인트

```text
checkpoint 1: XG source files downloaded and license note written
checkpoint 2: JOE parser/converter produces inspectable GLB
checkpoint 3: GLB material names are semantic
checkpoint 4: raven-xg-coupe 256px pixel candidate exists
checkpoint 5: ComfyUI retro output exists without circular tire artifacts
checkpoint 6: approved atlas/sprite exported
checkpoint 7: runtime imports switched from genesis-g70-poc to raven-xg-coupe-poc
```

### 현재 블로커

- WSL에 `svn` command가 없다. SourceForge raw URL과 `curl`로 우회할 수 있지만, 대량 파일 동기화에는 별도 다운로드 스크립트가 필요하다.
- VDrift JOE mesh를 GLB로 변환하는 코드가 아직 없다.
- Playwright Chromium system dependency(`libatk-1.0.so.0`)가 없어 Three.js 렌더 검증이 현재 Codex 셸에서는 막힌 상태다.
- VDrift asset의 GPL-3.0 배포 영향은 게임 repo 공개/배포 방식과 함께 다시 확인해야 한다.

## 다음 GPT handoff: FT86 ComfyUI 디자인 실험

주간 한도 종료에 대비해 다음 GPT에게 바로 전달할 handoff 문서를 따로 만들었다.

```text
docs/retro-asset-studio/next-gpt-ft86-comfyui-handoff.md
```

현재 우선순위는 G70/VDrift 변환 구현이 아니다. G70 교체 계획은 문서화만 완료한 상태로 보류한다.

이번 스텝의 실제 목표:

- FT86 256px pixel candidate를 ComfyUI 후처리 디자인 실험 대상으로 사용한다.
- source model, `real-vehicle-poc.json`, Phaser runtime import는 건드리지 않는다.
- `npm run run:ft86` 기반으로 safe/balanced/stylized 결과를 비교한다.
- QA 기반 wheel ellipse correction은 계속 비활성화한다.
- palette lock이 FT86 디자인을 너무 회청색으로 고정하는지 검토한다.

현재 FT86 입력:

```text
input:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png

source/transparent:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256.png

qa:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256.qa.json

default output:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png
```

주의할 구현 포인트:

- `run-retro-filter.mjs`의 `buildPresetJob`은 단일 preset 실행 시 명시 `--input`/`--output` override를 preset 경로보다 우선하도록 수정했다.
- `--vehicle all`에서는 여러 차량이 같은 파일에 쓰이는 사고를 막기 위해 `--input`/`--output` override를 금지한다.
- `/tmp/ft86-handoff-test.api.json` 대상으로 `--dry-run --vehicle ft86 --output ...` 검증을 완료했다.

### FT86 인터벌 실행 결과

2026-07-07에 `npm run run:ft86` 기반 safe/balanced/stylized 세 결과를 생성했다.

```text
safe:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-ft86-safe.png

balanced:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-ft86-balanced.png

stylized:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-ft86-stylized.png
```

간단 검수:

- 세 결과 모두 `768x1536`으로 정상 생성됐다.
- palette lock 후 색상 수는 `15~16`개 수준이다.
- 잘못된 원형 타이어 artifact는 보이지 않는다.
- 1차 후보는 `balanced`가 가장 무난해 보인다.
- 다만 세 결과 모두 차체가 회청색 palette로 강하게 묶이므로, 다음 조정은 FT86용 palette profile 또는 `--no-palette-lock` 비교가 좋다.

### FT86 safe / balanced / stylized 최종 비교

이후 `run-retro-filter.mjs`에 `--variant safe|balanced|stylized|all` 구조를 추가해 FT86만 대상으로 세 버전을 다시 비교했다.

최신 출력 기준:

```text
balanced:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced.png

safe:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-safe.png

stylized:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-stylized.png

input:
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png
```

판단:

| variant | 평가 | 용도 |
| --- | --- | --- |
| `balanced` | 실루엣, 휠, 배경, 차체 대비가 가장 무난하다. | FT86 v1 기본 후보 |
| `safe` | 원본 보존은 가장 좋지만 AI 후처리 차이가 적다. | fallback 후보 |
| `stylized` | 차체 정리는 강하지만 전복 프레임이 검게 뭉치고 휠/하단부가 먹힐 위험이 있다. | 디자인 실험용, 기본 후보 제외 |

최종 결정:

```text
FT86 Retro Style Filter v1 default candidate:
sheet-256-ai-retro-v1-balanced.png
```

런타임 적용용 alias가 필요하면 `balanced`를 보존한 뒤 다음 파일로 복사한다.

```bash
cp games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced.png \\
   games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png
```

이후 Phaser에 넣기 전에는 magenta background를 alpha로 복원하는 후처리가 필요하다.

```text
sheet-256-ai-retro-v1-balanced.png
-> sheet-256-ai-retro-v1-balanced-alpha.png
```

기본 규칙:

```text
#ff00ff -> alpha 0
나머지 픽셀 -> alpha 255
```

현재 balanced 결과는 마젠타 배경이 깨끗하게 유지되어 있어 alpha 복원이 안전하다.

### FT86 차체 색상 변경 가능성 검토

질문: `balanced` 결과물을 사용했을 때 Phaser에서 차량 색상을 바꿀 수 있는가?

결론:

```text
가능하다.
다만 Phaser의 setTint()가 아니라 body palette swap으로 구현해야 한다.
```

`setTint()`는 스프라이트 전체에 tint를 곱하는 방식이라 차체뿐 아니라 유리, 타이어, 후미등, 윤곽선까지 같이 물들 수 있다. Apex Seoul에서 필요한 것은 차체색만 바꾸고 나머지 부품은 유지하는 것이다.

원하는 결과:

```text
차체 회청색 ramp -> 빨강 / 파랑 / 노랑 / 검정 등으로 교체
유리 / 타이어 / 윤곽 / 후미등 / 마젠타 배경은 유지
```

현재 `balanced`는 palette lock 이후 색상이 제한되어 있어 이 방식에 적합하다. 대략 다음 계열로 분리할 수 있다.

```text
body ramp:
- dark body shadow
- body shadow
- body mid
- body light
- body highlight

keep:
- magenta background
- black/dark outline
- tire dark
- glass dark
- red tail lights
- rim gray
```

따라서 구현은 다음 파이프라인이 적절하다.

```text
AI Retro Filter
-> palette-lock
-> magenta-to-alpha
-> body palette swap
-> Phaser spritesheet 등록
```

#### 추천 구현: 로딩 시 색상별 texture 생성

원본 텍스처는 하나만 유지한다.

```text
sheet-256-ai-retro-v1-balanced-alpha.png
```

게임 시작 시 색상별 texture를 생성한다.

```text
ft86-silver
ft86-red
ft86-blue
ft86-yellow
ft86-black
```

기본 아이디어:

```ts
type RGB = [number, number, number];

const MAGENTA: RGB = [255, 0, 255];

const BODY_RAMP: RGB[] = [
  [40, 58, 70],
  [72, 86, 96],
  [100, 116, 126],
  [102, 124, 134],
  [118, 132, 140],
  [140, 158, 166],
  [154, 166, 172],
];

const RED_BODY_RAMP: RGB[] = [
  [54, 18, 18],
  [82, 28, 28],
  [116, 38, 38],
  [142, 48, 48],
  [166, 64, 64],
  [198, 92, 86],
  [226, 132, 118],
];

function sameRgb(data: Uint8ClampedArray, i: number, rgb: RGB) {
  return data[i] === rgb[0] && data[i + 1] === rgb[1] && data[i + 2] === rgb[2];
}

function setRgb(data: Uint8ClampedArray, i: number, rgb: RGB) {
  data[i] = rgb[0];
  data[i + 1] = rgb[1];
  data[i + 2] = rgb[2];
}

function recolorBodyPixels(
  imageData: ImageData,
  fromRamp: RGB[],
  toRamp: RGB[],
) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    if (sameRgb(data, i, MAGENTA)) continue;

    const rampIndex = fromRamp.findIndex((rgb) => sameRgb(data, i, rgb));

    if (rampIndex >= 0) {
      setRgb(data, i, toRamp\[rampIndex]);
    }
  }

  return imageData;
}
```

Phaser 쪽 texture 생성 흐름:

```ts
async function createVehicleColorTexture(
  scene: Phaser.Scene,
  sourceKey: string,
  targetKey: string,
  targetRamp: RGB\[],
) {
  const source = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement;

  const canvasTexture = scene.textures.createCanvas(
    targetKey,
    source.width,
    source.height,
  );

  if (!canvasTexture) {
    throw new Error(`Failed to create canvas texture: ${targetKey}`);
  }

  const ctx = canvasTexture.getContext();

  ctx.clearRect(0, 0, source.width, source.height);
  ctx.drawImage(source, 0, 0);

  const imageData = ctx.getImageData(0, 0, source.width, source.height);

  recolorBodyPixels(imageData, BODY_RAMP, targetRamp);

  ctx.putImageData(imageData, 0, 0);
  canvasTexture.refresh();

  return targetKey;
}
```

spritesheet grid frame을 다시 붙이는 helper:

```ts
function addGridFrames(
  scene: Phaser.Scene,
  textureKey: string,
  frameWidth: number,
  frameHeight: number,
  columns: number,
  rows: number,
) {
  const texture = scene.textures.get(textureKey);

  let frameIndex = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      texture.add(
        String(frameIndex),
        0,
        col * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight,
      );

      frameIndex += 1;
    }
  }
}
```

FT86 256px sheet 기준:

```ts
addGridFrames(scene, 'ft86-red', 256, 256, 3, 6);
```

#### 후보 body color ramp

Blue:

```ts
const BLUE_BODY_RAMP: RGB[] = [
  [18, 28, 54],
  [28, 42, 82],
  [38, 64, 116],
  [48, 84, 142],
  [64, 108, 166],
  [92, 142, 198],
  [126, 174, 226],
];
```

Yellow:

```ts
const YELLOW_BODY_RAMP: RGB[] = [
  [62, 48, 16],
  [92, 70, 22],
  [126, 96, 28],
  [156, 122, 36],
  [186, 152, 48],
  [218, 188, 78],
  [242, 220, 124],
];
```

Silver:

```ts
const SILVER_BODY_RAMP: RGB[] = [
  [54, 66, 72],
  [82, 98, 106],
  [120, 140, 148],
  [140, 158, 166],
  [166, 182, 188],
  [204, 214, 216],
  [230, 236, 236],
];
```

#### 구현 주의점

- body ramp exact-color replacement를 우선 사용한다.
- glass/tire/light/outline은 절대 바꾸지 않는다.
- magenta preview를 직접 대상으로 테스트할 경우 `#ff00ff`는 유지한다.
- alpha 버전을 대상으로 하면 alpha 0 픽셀은 건드리지 않는다.
- `setTint()`는 빠른 테스트 외에는 사용하지 않는다.
- shader palette swap은 나중에 커스터마이징 UI가 필요해질 때 검토한다.

#### 다음 구현 작업

1. `magenta-to-alpha` 후처리 스크립트 추가
2. `body-palette-swap` 유틸 추가
3. FT86 balanced-alpha를 기준으로 red/blue/yellow/black texture 생성 테스트
4. Phaser scene에서 같은 위치 또는 나란히 표시해 도로 위 시인성 확인
5. body ramp가 너무 어두우면 `palette-lock.mjs`의 body ramp만 한 단계 밝힌다

### Retro Asset Studio variant 실행 구조

현재 `retro_style_filter_v1.api.json`은 공통 ComfyUI workflow 템플릿으로 유지한다. `safe`, `balanced`, `stylized`를 위해 JSON을 3개로 복제하지 않는다.

역할 분리:

```text
retro_style_filter_v1.api.json
  = 공통 ComfyUI workflow 템플릿

run-retro-filter.mjs
  = vehicle preset + variant preset patcher

package.json
  = 실행 shortcut
```

`run-retro-filter.mjs`에 추가한 variant preset:

```js
const variantPresets = {
    safe: {
        cannyHigh: 0.75,
        cannyLow: 0.35,
        cfg: 4.0,
        controlNetEnd: 0.7,
        controlNetStart: 0,
        controlNetStrength: 0.45,
        denoise: 0.08,
        loraStrengthClip: 0.6,
        loraStrengthModel: 0.35,
        steps: 16,
    },
    balanced: {
        cannyHigh: 0.75,
        cannyLow: 0.35,
        cfg: 4.5,
        controlNetEnd: 0.6,
        controlNetStart: 0,
        controlNetStrength: 0.35,
        denoise: 0.12,
        loraStrengthClip: 0.7,
        loraStrengthModel: 0.45,
        steps: 20,
    },
    stylized: {
        cannyHigh: 0.75,
        cannyLow: 0.3,
        cfg: 4.8,
        controlNetEnd: 0.5,
        controlNetStart: 0,
        controlNetStrength: 0.28,
        denoise: 0.16,
        loraStrengthClip: 0.75,
        loraStrengthModel: 0.55,
        steps: 22,
    },
};
```

실행 명령:

```bash
npm run run:ft86
npm run run:ft86:safe
npm run run:ft86:balanced
npm run run:ft86:stylized
npm run run:ft86:variants
```

생성 예상:

```text
sheet-256-ai-retro-v1.png
sheet-256-ai-retro-v1-safe.png
sheet-256-ai-retro-v1-balanced.png
sheet-256-ai-retro-v1-stylized.png
```

`balanced`는 기본값이며, `safe/stylized` 또는 `variant all`에서는 suffix를 붙여 비교 산출물로 남긴다.

## 블로그에서 강조할 관찰

이번 작업의 핵심은 AI 이미지 생성 자체가 아니다.

중요한 것은 다음이다.

- Three.js 렌더 결과를 원본 truth로 둔다.
- ComfyUI는 차량을 새로 그리는 generator가 아니라, 스타일 필터로 제한한다.
- ControlNet Canny와 낮은 denoise로 실루엣과 viewpoint를 묶는다.
- prompt보다 API 변환과 파일 입출력 자동화가 먼저 안정적이어야 한다.
- WSL 이전에서는 `localhost`, `node`, `docker`, `ComfyUI API format`이 모두 실패 지점이 될 수 있다.

글의 결론은 "멋진 프롬프트 하나로 asset이 나온다"가 아니라, "반복 가능한 asset compiler를 만들려면 생성 모델 밖의 접착 코드가 훨씬 중요하다"로 잡는 것이 좋다.

## 다음 작업 후보

1. VDrift `XG` source files와 필요한 shared `carparts`만 내려받기
2. JOE-to-glTF 변환 경로 결정
3. `raven-xg-coupe-poc.glb` 생성
4. body/glass/tire/rim/light material 또는 mask 분리 검증
5. `real-vehicle-poc.json`에 `raven-xg-coupe-poc` 추가
6. Three.js pose sheet 렌더
7. ComfyUI retro filter 재실행
8. magenta background 제거 또는 alpha 복원 후처리 추가
9. Phaser runtime에서 256px 후보를 임시 로드해 contact shadow와 도로 위 시인성 확인

## 공개 글로 옮길 때 넣을 이미지 후보

- 원본 `sheet-256-magenta-preview.png`
- 생성 결과 `sheet-256-ai-retro-v1.png`
- ComfyUI workflow 캡처
- `/prompt` 400 오류 일부 캡처
- `CLIPTextEncode: ['text']` 수정 전후 API JSON 비교
- Phaser runtime 화면에 적용한 후보 스크린샷

## 현재 상태 요약

```text
WSL project migration: done
Node version guard: done
ComfyUI endpoint override: done
WSL localhost fallback: done
UI workflow -> API prompt converter: working
CLIPTextEncode text mapping: fixed
g70 ComfyUI run: success
g70 source model material separation: insufficient
QA wheel ellipse correction: disabled by default
next source model direction: VDrift coupe/sports proxy
VDrift candidate comparison: done
selected VDrift candidate: XG
fictional coupe intake manifest: done
G70 replacement plan: documented
next GPT handoff for FT86 ComfyUI pass: documented
JOE-to-glTF conversion: not yet implemented
stinger / all: not yet verified
ft86 ComfyUI variants: verified
ft86 balanced candidate: selected as v1 default candidate
retro filter variants safe/balanced/stylized: implemented in run-retro-filter
postprocessing: magenta-to-alpha and body palette swap planned
postprocessing: magenta-to-alpha and body palette swap implemented
runtime integration: FT86 retro color QA route implemented
Phaser vehicle color swap: feasible via body palette swap, not setTint
```

## 2026-07-07 추가 결론: FT86 balanced 후보와 색상 변경 방향

FT86 256px spritesheet에 대해 `safe / balanced / stylized` 세 가지 ComfyUI 후처리 결과를 비교했다.

결론:

```text
선택 후보:
sheet-256-ai-retro-v1-balanced.png

런타임 후보 alias:
sheet-256-ai-retro-v1.png

fallback:
sheet-256-ai-retro-v1-safe.png

보류:
sheet-256-ai-retro-v1-stylized.png
```

판단 이유:

* `balanced`는 실루엣 유지, 마젠타 배경 유지, 휠 artifact 억제, 도로 위 시인성의 균형이 가장 좋다.
* `safe`는 안정적이지만 원본 대비 변화가 적다.
* `stylized`는 디자인 변화가 크지만 전복 프레임과 하단부가 검게 뭉칠 위험이 있다.
* 현재 단계에서 추가 ComfyUI 파라미터 튜닝보다 후처리와 runtime QA가 더 중요하다.

다음 구현 방향:

```text
ComfyUI balanced output
↓
palette-lock
↓
magenta-to-alpha
↓
body palette swap
↓
Phaser runtime road visibility QA
```

### Phaser 차량 색상 변경 판단

`balanced` 결과물은 Phaser에서 차량 색상 변경이 가능하다.
단, `sprite.setTint()` 방식은 최종안으로 쓰지 않는다.

`setTint()`는 차체뿐 아니라 유리, 타이어, 후미등, 윤곽선까지 같이 물들일 가능성이 크다.
Apex Seoul에서는 body palette exact-color replacement를 우선 사용한다.

목표:

```text
body ramp만 교체
glass / tire / rim / lights / outline / alpha는 유지
```

추천 구조:

```text
sheet-256-ai-retro-v1-balanced-alpha.png
↓
ft86-red texture
ft86-blue texture
ft86-yellow texture
ft86-silver texture
```

후보 body ramp:

```ts
type RGB = [number, number, number];

const SOURCE_BODY_RAMP: RGB[] = [
  [48, 60, 70],
  [72, 86, 96],
  [100, 116, 126],
  [118, 132, 140],
  [154, 166, 172],
];

const BLUE_BODY_RAMP: RGB[] = [
  [18, 28, 54],
  [28, 42, 82],
  [38, 64, 116],
  [64, 108, 166],
  [126, 174, 226],
];

const RED_BODY_RAMP: RGB[] = [
  [54, 18, 18],
  [82, 28, 28],
  [116, 38, 38],
  [166, 64, 64],
  [226, 132, 118],
];

const YELLOW_BODY_RAMP: RGB[] = [
  [62, 48, 16],
  [92, 70, 22],
  [126, 96, 28],
  [186, 152, 48],
  [242, 220, 124],
];
```

구현 주의:

* alpha 0 픽셀은 건드리지 않는다.
* preview sheet를 대상으로 할 경우 `#ff00ff`는 절대 바꾸지 않는다.
* tire 계열 `8,10,14`는 body dark로 흡수하지 않는다.
* glass 계열은 body ramp와 분리한다.
* red tail light는 유지한다.
* wheel ellipse correction은 계속 기본 OFF다.

## 2026-07-08 추가 결론: 색상 교체는 tint가 아니라 palette compiler 문제였다

FT86 `balanced` 후보를 실제 Phaser runtime에 넣기 위해 후처리 스크립트를 추가했다.

```text
ComfyUI balanced output
↓
magenta-to-alpha
↓
palette role audit
↓
body palette swap
↓
runtime atlas / shadow 생성
↓
Phaser runtime QA URL
```

구현 위치:

```text
games/apex-seoul/scripts/postprocess-ft86-retro-sheet.mjs
```

생성 산출물:

```text
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-source-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-red-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-blue-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-yellow-alpha.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-alpha-shadow.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/ft86-retro-runtime-256.json
```

실행:

```bash
npm run postprocess:ft86-retro --workspace @games/apex-seoul
```

### 첫 번째 구현: exact-color body ramp swap

처음에는 `SOURCE_BODY_RAMP` 5색만 다른 색 ramp로 치환했다.
이 방식은 `setTint()`보다 낫다. 유리, 타이어, 후미등, 윤곽선까지 같이 물들이지 않기 때문이다.

하지만 runtime에서 `vehicleColor=red`를 적용해 보니 차체 위에 red speckle처럼 보이는 점들이 생겼다.
처음에는 ComfyUI 결과에 남은 red noise로 의심했지만, 실제 원인은 palette swap 쪽에 있었다.

원인:

```text
원본 palette에서 body처럼 보이는 색:
140,158,166
102,124,134
40,58,70

기존 SOURCE_BODY_RAMP에 포함된 색:
48,60,70
72,86,96
100,116,126
118,132,140
154,166,172
```

즉 차체 전체가 red ramp로 바뀐 것이 아니라, 일부 차체 픽셀만 red로 바뀌고 나머지 회청색 픽셀은 남았다.
그 결과 "빨간 잡티"처럼 보였다.

블로그 포인트:

* AI가 이상한 speckle을 만든 것이 아니라, 사람이 만든 palette mapping이 차체 role을 충분히 설명하지 못했다.
* 색상 교체는 단순한 RGB 치환이 아니라, 제한 palette의 각 색을 어떤 material role로 볼지 정하는 문제다.
* `setTint()`를 피한 뒤에도 semantic palette mapping이 필요하다.

### 두 번째 구현: palette role audit

후처리 스크립트에 palette role audit을 추가했다.

```text
ft86-retro-palette-audit.json
sheet-256-ai-retro-v1-balanced-roles.png
```

역할 분류:

```text
body
tire
outline
shadow
tail-light
amber-light
```

현재 audit 기준:

```text
body: 53772
tire: 30837
outline: 22631
tail-light: 1647
shadow: 425
amber-light: 7
```

`sheet-256-ai-retro-v1-balanced-roles.png`는 false-color preview다.
body는 초록, tire/outline은 어두운 회색, light는 빨강/주황으로 표시한다.
이 이미지는 블로그에서 "왜 palette role이 필요한가"를 보여주는 좋은 그림이 된다.

### 세 번째 구현: soft ramp

role 기반 swap 이후에는 색상은 안정적으로 바뀌었다.
하지만 runtime 크기로 축소하면 body shade 간 gradient 차이가 작은 speckle처럼 보일 수 있었다.

특히 기존 blue/yellow ramp는 상위 shade 간 점프가 컸다.

```text
blue old highlight:
64,108,166 -> 126,174,226

yellow old highlight:
186,152,48 -> 242,220,124
```

그래서 runtime sprite용 body ramp를 더 낮은 대비의 soft ramp로 바꿨다.

현재 방향:

```text
색을 예쁘게 크게 보여주는 ramp
    보다
도로 위 작은 sprite에서 덜 튀는 ramp
```

블로그 포인트:

* pixel art asset에서는 "색상 후보가 예쁜가"보다 "게임 카메라 크기에서 읽히는가"가 중요하다.
* 256px source에서는 좋아 보이는 하이라이트가 runtime scale에서는 speckle처럼 보일 수 있다.
* palette compiler는 최종 표시 크기까지 고려해야 한다.

### 네 번째 구현: alpha edge bleed 정리

Git changes에서 생성된 PNG를 확인하니 차량 테두리 주변에 경계선이 생긴 것처럼 보였다.
이 문제는 body ramp보다 alpha PNG의 hidden RGB 문제일 가능성이 컸다.

확인 결과:

```text
alpha 0 픽셀 수: 1070329
alpha 0인데 RGB가 magenta인 픽셀: 1070329
opaque 차량 픽셀 중 투명 magenta와 인접한 픽셀: 5372
```

즉 `magenta-to-alpha`가 alpha만 0으로 바꾸고, RGB는 `255,0,255`로 남기고 있었다.
PNG 자체를 확대해서 볼 때는 투명하므로 잘 안 보이지만, WebGL texture sampling이나 scaling에서는 이 hidden RGB가 경계 bleed로 보일 수 있다.

수정:

```text
alpha 0 + magenta RGB
↓
alpha 0 + transparent RGB cleanup
↓
nearest opaque RGB를 2px radius 안에서 투명 영역으로 확장
```

수정 후 확인:

```text
transparentMagenta: 0
adjacentMagenta: 0
transparentNearOpaque: 5402
transparentNearOpaqueNonZero: 5402
```

의미:

* 더 이상 hidden magenta가 투명 픽셀에 남아 있지 않다.
* 차량 가장자리 주변 투명 픽셀은 가까운 차량 색을 품고 있어서 linear filtering이 걸려도 magenta halo가 나오지 않는다.
* 완전히 먼 투명 배경은 검정 RGB에 alpha 0으로 유지된다.

블로그 포인트:

* alpha 0이면 끝이 아니다. GPU sampling은 hidden RGB까지 끌고 들어올 수 있다.
* magenta keying을 alpha로 바꾼 뒤에는 RGB cleanup 또는 edge padding이 필요하다.
* sprite compiler는 "보이는 픽셀"뿐 아니라 "투명 픽셀의 색"도 관리해야 한다.

### 다섯 번째 구현: flat body profile

edge bleed를 정리한 뒤에도 runtime 크기에서는 silver/red/blue/yellow의 그라데이션 차이가 작은 speckle처럼 보일 수 있었다.
이 단계에서는 ComfyUI를 다시 돌리는 것보다 최종 표시 크기에 맞게 body shade 수를 줄이는 편이 맞다.

수정:

```text
기존:
body shade 5단계에 가까운 soft ramp

변경:
body shade를 3단계 flat profile로 병합
```

현재 `postprocess-ft86-retro-sheet.mjs`의 색상별 body shade:

```text
silver:
58,72,82 / 104,118,126 / 132,146,154

red:
62,28,28 / 108,52,48 / 142,86,74

blue:
30,42,66 / 58,82,116 / 96,126,158

yellow:
76,62,26 / 124,102,42 / 176,154,82
```

실제 생성 PNG의 opaque 색상 분포도 이 방향으로 정리됐다.

```text
silver body:
132,146,154: 29545
104,118,126: 19360
58,72,82: 4867

red body:
142,86,74: 29545
108,52,48: 19360
62,28,28: 4867

blue body:
96,126,158: 29545
58,82,116: 19360
30,42,66: 4867

yellow body:
176,154,82: 29545
124,102,42: 19360
76,62,26: 4867
```

타이어, 윤곽선, 후미등, amber light는 기존 role 그대로 유지된다.

블로그 포인트:

* 좋은 palette는 source PNG에서만 판단하면 안 된다.
* 작은 runtime sprite에서는 shade 수가 많을수록 디테일이 아니라 노이즈처럼 읽힐 수 있다.
* 마지막 body color는 ComfyUI가 아니라 postprocess compiler가 책임지는 편이 안정적이다.

### 여섯 번째 구현: 2톤 profile은 과했고 edge-only cleanup으로 되돌림

3단계 flat profile 이후에도 테두리 근처에 남은 색 노이즈가 보여서, 한때 body-only despeckle과 2톤 profile을 시도했다.
하지만 이 방향은 차체 중앙 디테일까지 뭉개서 사용자가 원한 결과보다 너무 단순해졌다.

따라서 2톤 profile은 폐기하고, 현재 구현은 다음 원칙으로 되돌렸다.

```text
유지:
3단계 flat body profile

제거:
차체 내부 전체 despeckle
2톤 runtime-clean profile

추가:
투명 배경/outline에 닿은 고립 edge body 픽셀만 outline으로 흡수
```

현재 cleanup은 `cleanEdgeBodyNoise`에서 처리한다.
조건은 보수적으로 잡았다.

```text
대상:
body pixel

조건:
투명 픽셀과 인접
주변 body 연결이 약함
주변 outline/tire 계열 dark pixel이 충분함

결과:
outline color 16,20,25로 흡수
```

재생성 후 색상 분포는 다시 3톤 구조를 유지한다.

```text
silver body:
132,146,154: 29492
104,118,126: 18555
58,72,82: 3914

blue body:
96,126,158: 29492
58,82,116: 18555
30,42,66: 3914
```

outline은 edge cleanup 영향으로 늘었다.

```text
outline:
24442
```

블로그 포인트:

* 후처리는 적게 고치는 쪽이 더 어렵다.
* 차체 내부 디테일을 제거하면 노이즈는 사라지지만 sprite의 맛도 같이 사라진다.
* 이번 문제의 중심은 body shade 전체가 아니라 edge에 남은 고립 픽셀이었다.

### Phaser runtime QA

Phaser runtime에서는 기본 G70 import를 그대로 두고, URL parameter로만 FT86 retro 후보를 선택하게 했다.

```text
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=silver
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=red
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=blue
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=yellow
```

QA freeze와 함께 쓰면 같은 도로/카메라 상태에서 색상 후보를 비교할 수 있다.

```text
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=red&qaFreeze=1&qaSteer=0&qaSpeed=440&qaZ=1200
```

`capture-runtime-vehicle-qa.mjs`에도 `--vehicle`과 `--vehicle-colors` 옵션을 추가했다.

```bash
npm run qa:ft86-runtime-colors --workspace @games/apex-seoul -- --manifest-only
```

현재 WSL 환경에서 Windows Edge headless capture는 `UtilBindVsockAnyPort` 오류로 실패했다.
따라서 screenshot capture는 보류하고, manifest-only URL matrix를 먼저 남겨둔다.

### 공개 글로 풀 때의 흐름

이번 파트는 "AI가 만든 이미지를 색만 바꿨다"보다 다음 흐름으로 쓰는 편이 좋다.

1. ComfyUI는 sprite generator가 아니라 style filter다.
2. palette lock으로 색 수를 줄이면 색상 교체가 가능해진다.
3. `setTint()`는 빠르지만 부품 전체를 물들이므로 최종안이 아니다.
4. exact RGB replacement도 role 정의가 틀리면 speckle처럼 보인다.
5. 그래서 palette role audit과 false-color preview가 필요했다.
6. runtime scale에서는 soft ramp도 작은 얼룩처럼 보일 수 있어 3단계 flat profile로 줄였다.
7. 2톤 profile은 차체를 너무 뭉개므로 폐기하고, edge-only cleanup만 남겼다.
8. alpha edge bleed까지 정리해야 WebGL scaling에서 테두리 경계선이 줄어든다.

### 다음 턴 블로그 초안 구조

제목 후보:

1. `ComfyUI 결과를 게임 스프라이트로 쓰기까지: FT86 palette compiler 만들기`
2. `AI가 만든 픽셀카를 Phaser에 넣으려면 색부터 다시 컴파일해야 했다`
3. `Apex Seoul Retro Asset Studio: style filter 이후의 후처리 이야기`

추천 제목은 1번이다.
이번 글의 핵심은 ComfyUI 자체보다 "이미 나온 AI 결과물을 게임에서 안정적으로 쓰기 위해 어떤 compiler 단계를 붙였는가"에 있다.

글의 한 줄:

```text
ComfyUI는 FT86 spritesheet에 레트로 스타일을 얹어줬지만, Phaser runtime에 넣기 위해서는 alpha, palette role, body color swap, edge bleed까지 다시 asset compiler로 정리해야 했다.
```

본문 구조:

1. 왜 ComfyUI를 generator가 아니라 style filter로 제한했는가
2. `setTint()`가 빠른 답처럼 보였지만 최종 답이 아니었던 이유
3. exact RGB replacement에서 red speckle처럼 보인 실패
4. palette role audit과 false-color preview를 만든 이유
5. magenta-to-alpha 이후 hidden RGB가 edge bleed를 만들 수 있다는 점
6. runtime scale에서 soft/3-shade ramp를 조정한 과정
7. 2톤 profile을 시도했다가 너무 뭉개져 폐기한 과정
8. 최종적으로 edge-only cleanup만 남긴 이유
9. 다음 작업: QA contact sheet, texture filtering/pixelArt 검토, VDrift XG는 아직 보류

넣기 좋은 코드/파일:

```text
games/apex-seoul/scripts/postprocess-ft86-retro-sheet.mjs
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/ft86-retro-palette-audit.json
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-roles.png
games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-alpha.png
```

넣기 좋은 URL:

```text
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=silver
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=red
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=blue
/game-assets/apex-seoul/?vehicle=ft86-retro&vehicleColor=yellow
```

글에서 조심할 표현:

* "AI가 망쳤다"보다 "AI output을 game-ready asset으로 컴파일하는 단계가 필요했다"로 쓴다.
* 2톤 profile은 최종안이 아니라 과보정 실패 사례로 설명한다.
* 현재 최종 방향은 3단계 body profile 유지 + edge-only cleanup이다.
* G70/VDrift XG는 다음 대작업 계획으로만 언급하고, 이 글에서는 구현으로 넘어가지 않는다.

### 다음 세션의 우선순위

1. 위 구조를 바탕으로 블로그 초안을 작성한다.
2. 필요하면 dev server에서 silver/red/blue/yellow 후보를 다시 확인한다.
3. 스크린샷이 필요하면 `qa:ft86-runtime-colors` contact sheet 또는 수동 캡처를 사용한다.
4. 기술 후속 작업은 texture filtering/pixelArt 설정 확인과 `cleanEdgeBodyNoise` 조건 조정으로 분리한다.
