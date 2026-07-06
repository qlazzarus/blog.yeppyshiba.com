# Apex Seoul Retro Asset Studio 진행 메모

이 문서는 Apex Seoul 차량 스프라이트 제작 파이프라인을 블로그 글로 정리하기 위한 임시 글감이다. 동시에 현재 진행 중인 `docs/retro-asset-studio` 작업 맥락을 잃지 않기 위한 작업 로그로 사용한다.

현재 주제는 "실제 차량 3D 모델을 직접 게임 asset으로 쓰는 것"이 아니라, Three.js로 만든 차량 스프라이트시트를 ComfyUI 기반 Retro Style Filter에 통과시켜 Phaser에서 쓸 수 있는 레트로 스프라이트 후보를 만드는 것이다.

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

따라서 Node.js 18 이상이 필요하다. 이 문제를 빠르게 알아차릴 수 있도록 `package.json`에 `engines.node >=18`을 추가하고, npm script 앞에 `check-node-version.cjs`를 붙였다.

이제 오래된 Node에서는 이상한 `.mjs` 파싱 오류 대신 다음 안내가 나온다.

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
- rear-facing pose에서는 원형 wheel lock을 적용하지 않고, 해당 영역을 차체 하단 음영으로 되돌리도록 수정했다.
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

- `XG`라는 원본 ID와 원본 차량명은 작업용 source reference로만 둔다.
- 게임 안에서는 `Raven XG Coupe POC` 또는 이후 더 적절한 fictional 이름으로 사용한다.
- VDrift asset은 GPL-3.0 프로젝트/data 계열로 취급해야 하므로, 실제 포함/배포 전에 라이선스 표기를 명확히 해야 한다.
- 현재 Apex Seoul 렌더 파이프라인은 GLB/Three.js 중심이다. VDrift의 `.joe` 파일은 바로 렌더할 수 없으므로 JOE-to-glTF 변환 단계가 필요하다.

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
JOE-to-glTF conversion: not yet implemented
stinger / ft86 / all: not yet verified
postprocessing: not yet started
runtime integration: not yet started
```
