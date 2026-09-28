# 닭농장 RTX 3080 로컬 2D 스프라이트 제작 기준

작성·조사 기준: 2026-09-28. 이 문서는 닭농장 에셋 제작의 현재 기준이다. 이전 무료 에셋 우선/지면 교체 한정 계획보다 우선한다. 목표는 전체 등장 요소를 오리지널 아트로 매핑하고, **캐릭터 정체성·방향·동작·스타일의 일관성을 유지한 2D sprite/atlas**로 제공하는 것이다.

**추천 구성: 움직이는 유닛은 고정된 3D/2D 원본에서 프레임을 제작하고, 정적 에셋과 기준 디자인에는 SD 1.5 + 구조/이미지 reference를 사용한다. SDXL은 정적 품질 비교군, FLUX.2 klein 4B는 별도 메모리 검증을 거치는 편집 후보로 둔다.** 모델 성능보다 승인된 원본과 제작 규칙을 유지하는 것이 우선이다.

이는 실행 설계다. 이번 조사에서 GPU 실측, 신규 모델 설치, 학습, 생성 및 런타임 교체는 수행하지 않았다. 아래 세팅/수량/시간은 달리 표시하지 않으면 **실험 시작 가정**이며 보장 성능이 아니다.

## 1. 무엇의 context를 유지하는가

생성 모델의 prompt에는 이전 출력의 기억이 자동으로 남지 않는다. 매 작업마다 동일한 reference·설계·설정을 다시 제공한다. 작업자나 세션이 바뀌어도 같은 context를 복원할 수 있어야 한다.

| 유지 대상 | 기준 원본 | 고정 방법 |
| --- | --- | --- |
| 캐릭터 정체성 | 승인 정면/측면/후면, 색상·장비·비율 | character bible + ID + reference hash; 필요 시 identity LoRA |
| 아트 스타일 | 승인된 유닛·건물·아이콘 contact sheet | style bible, 팔레트, 모델/스타일 LoRA 버전 |
| 방향/카메라 | pose guide, rig, camera preset | 카메라 높이·투영·방위·scale 고정; ControlNet 보조 |
| 동작의 연결 | rig/키프레임, 접지·공격 시점 | frame timing/이벤트 metadata; 생성 prompt에 맡기지 않음 |
| 게임 의미 | rawcode → runtime ID → asset ID | 등급·팀·역할 매핑; recolor만으로 필요한 형태 차이를 지우지 않음 |
| 재현성 | source·mask·workflow·모델 | hash, seed, software revision, 전체 prompt, 설정 저장 |

동일 seed는 비교 실험을 통제하는 수단이다. 캐릭터 ID를 보장하지 않으며, GPU/라이브러리/정밀도 변경 뒤 bit-exact 재현도 보장하지 않는다. 승인된 PNG 자체를 보존한다.

## 2. 전체 포팅 범위

기존 `chicken_farm_sprite_asset_generation_plan.md`의 명시적 ID는 63개(유닛 14, 건물/건설 상태 28, 아이콘 12, 지형 4, 장식 5)로 전체 목록이 아니다. 원본 분석 표에는 건물 테크 39행, 전투 유닛 31행, 일반 적 18티어, 아이템 27행이 있다. 중복과 레거시 행을 제거한 실제 등장 목록을 만든다.

추가 범위는 가족·용병·소환체·보스·이벤트 NPC·목표 오브젝트·연구/스킬 아이콘·발사체·질병/치유/피격/사망·건설/피해/잔해·지형 경계·UI다. 사운드는 별도 제작 항목이며 이미지 완료에 포함시키지 않는다.

모든 등장 요소가 `unique / shared / palette_variant / procedural / excluded_with_evidence` 중 하나로 매핑되고 게임 내 검수를 통과해야 전체 완료다. 적 18티어를 모두 동일 늑대 색변경으로 처리하지 않는다. 후반의 다른 형태는 별도 원본이 필요하다.

## 3. RTX 3080 제작 방식 비교

저장소의 과거 기록은 10GB 3080을 전제로 한다. 3080에는 10/12GB 구성이 있으며 이번 환경에서는 `nvidia-smi`를 사용할 수 없어 실제 장치·여유 VRAM을 확인하지 못했다. 10GB를 기본 예산으로 삼는다. 시스템 RAM 32GB 이상은 offload 작업을 위한 계획상 권장값이며 필수 사양 확정값은 아니다.

| 방식 | 3080에서의 판단 | context 유지 | 추천 역할 |
| --- | --- | --- | --- |
| SD 1.5/DreamShaper 8 | 512px, batch 1부터 실험; 기존 실행 이력 있음 | 구조 guide + reference가 필요 | 정적 에셋, 승인 디자인 탐색, 제한적 스타일 처리 |
| SDXL base/동일 계열 파생 | 단일 이미지 비교 후보; refiner 생략, offload 필요 여부 실측 | SDXL 전용 adapter/LoRA/ControlNet 필요 | 큰 건물·보스 기준 이미지; 768–1024px 비교 |
| FLUX.2 klein 4B | 공식 일반 구성 약 13GB로 10/12GB를 초과; quantization/offload 별도 검증 | multi-reference 편집 지원, sprite 정합성은 별도 | 기준 캐릭터의 외형 편집 후보 |
| Z-Image-Turbo | 공식 안내 16GB급; 3080에서는 압축/offload 시험 필요 | 기본 txt2img만으로 ID 유지 불충분 | 기준 디자인 탐색 후순위 |
| FLUX.1 schnell 12B | 본체/encoder 메모리 부담, 압축/offload 필요 | SD 1.5 control 생태계를 그대로 사용 불가 | 신규 기본 공정으로 우선하지 않음 |
| Qwen-Image-Edit 계열 | reference 편집 기능은 유용; 3080 성능 검증 없는 무거운 후보 | 외형 편집과 프레임 정합성은 다른 문제 | 보류 비교군 |
| Blender/Three.js 원본 → sprite render | 단순 stylized mesh/rig는 diffusion 대형 모델보다 자원 제약이 작음; scene별 실측 | 동일 mesh/재질/rig로 방향·프레임 유지에 유리 | **다방향 유닛·건물의 권장 기반** |
| 2D 파츠/손그림/키프레임 | 작은 sprite는 GPU 모델 메모리에 거의 의존하지 않음 | 파츠·색·outline을 직접 고정 | UI/아이콘, 간단한 동작, 생성 결과 보정 |
| 마스크·벡터·절차적 생성 | 저비용, 재현 가능 | 정확한 경계/색상/상태 | 타일 연결, 팀 색상, UI, particle |

최신 모델의 공개 소개 수치는 해당 제공 환경의 값이다. 3080에서 실행 보장으로 바꾸어 읽지 않는다. 낮은 비트 수가 메모리를 줄여도 encoder/activation/VAE 메모리는 남으며 quantized 커널의 3080 지원도 따로 확인한다. 새 모델마다 10회 warm 추론, peak VRAM, wall time, offload 여부를 측정하기 전 대량 공정에 넣지 않는다. [SDXL][s3], [FLUX.2 klein][s4], [Z-Image][s5], [FLUX.1][s6], [Qwen Edit][s7]

## 4. 2D 결과물과 원본 제작의 관계

게임은 PNG RGBA/atlas를 읽는다. Blender나 Three.js는 **오프라인 원본 제작 도구**이며 런타임을 3D로 바꾸지 않는다.

권장 유닛 공정:

1. 캐릭터 기준 디자인 승인: 앞·옆·뒤와 대표 동작, 역할별 컬러.
2. 단순 mesh/rig 또는 방향별 2D 파츠 제작. diffuse 색/texture를 한 번 확정한다.
3. 고정 orthographic 카메라에서 모델/rig를 회전시키며 8방향을 render한다. 카메라/조명/scale을 매 프레임 바꾸지 않는다.
4. PNG alpha, 발 pivot, semantic mask(몸/부리/벼슬/장비/팀 색상)를 함께 export한다.
5. 승인 texture와 rig render로 품질이 충분하면 그대로 atlas화한다. 매 프레임 diffusion을 의무적으로 적용하지 않는다.
6. 스타일 처리가 꼭 필요할 때만 low-denoise + 구조 guide를 비교한다. flicker가 발생하면 원본 texture/재질을 수정하고 재렌더링한다.

2D 파츠 대안은 몸통·날개·다리·머리를 고정한 상태로 키프레임을 만든다. 8방향은 최소 여러 방향의 원화가 필요하다. 단일 측면 그림을 회전시켜 8방향으로 간주하지 않는다. 픽셀 애니메이션은 Aseprite 또는 동등한 편집기로 프레임을 정리할 수 있다. [Blender orthographic 안내][s11], [Aseprite animation][s12]

프로젝트 기본 스타일은 따뜻한 stylized 3/4 top-down으로 유지한다. **2D sprite와 pixel art는 별개다.** soft-painted와 pixel-cluster 두 후보 중 contact sheet 검수로 선택한다. 차량용 검정/파랑 팔레트를 닭농장에 상속하지 않는다.

## 5. 고정된 시각 규격 — 승인 전 제안값

| 항목 | 제안 |
| --- | --- |
| 카메라 | orthographic, 수평면에서 내려다보는 elevation 45°를 첫 비교값으로 사용; 기존 맵과 맞춰 승인 후 고정 |
| 방향 | N, NE, E, SE, S, SW, W, NW; 각도보다 화면에서 보는 방향을 contact sheet에 표기 |
| 광원 | 화면 좌상단의 넓은 key light, 약한 ambient, 투사 그림자는 별도 layer |
| 유닛 | source 512px, runtime cell 소형 64×64/중형 96×96/보스 128–192px부터 검수 |
| 건물 | runtime source 128–320px 범위; 실제 `buildingTemplates.ts` footprint와 분리 |
| 아이콘 | 96px 승인본, runtime 48px 검수; label은 UI 코드 |
| 여백 | 모든 동작의 최대 bounds를 기준으로 고정 cell; 프레임별 자동 맞춤 확대 금지 |
| pivot/depth | 발/바닥 접점, footY depth; trimmed atlas는 원래 cell/pivot metadata 복원 |
| 픽셀 선택 시 | 24–32색 출발 팔레트, role별 고정 ramp; 재양자화 팔레트를 프레임마다 학습하지 않음 |
| soft-painted 선택 시 | 동일 색상 기준, 일정 outline/그림자 밀도; 가장자리 alpha와 축소 품질 검수 |

첫 팔레트 제안: outline `#302B29`, feather shadow `#BDB7A2`, feather mid `#E2DBC4`, feather light `#FFF0D2`, comb `#C74738`, beak/feet `#DFA34A`, wood `#87543C`, grass `#6B8244`. 아직 승인 palette가 아니며 prompt에 hex를 적는 것으로 정확한 출력 색을 보장하지 않는다. 최종 색은 mask/재질/후처리에서 고정한다.

닭 identity 제안: 둥근 크림색 몸, 작고 붉은 3갈래 벼슬, 짧은 황토색 부리, 황토색 다리, 짧고 위로 향한 꼬리. 거대한 볏/추가 장식/체형 변경은 금지 특성으로 기록한다. 가려진 방향에서 보이지 않는 부위를 억지로 추가하지 않는다.

## 6. context 패키지와 파일 계약

아래는 후속 제작용 디렉터리 제안이며 아직 생성된 에셋이 아니다.

```text
games/chicken-farm/assets/production/
  style/v001/{style-bible.md,palette.json,approved-contact-sheet.png}
  characters/chicken-basic/v001/
    identity.md
    references/{front.png,side.png,back.png}
    source/{rig.blend,camera.json,poses.json}
    masks/
    candidates/
    approved/{atlas.png,atlas.json,asset.json}
  workflows/{sd15-static-v001.json,sd15-controlled-v001.json}
  models.lock.json
  qa/{contact-sheets,metrics}
```

`asset.json`에 해당하는 metadata는 다음 항목을 가진다(필드 설계이며 runtime schema 구현은 후속):

```json
{
  "assetId": "unit_chicken_basic",
  "revision": "v001",
  "styleId": "farm-warm-v001",
  "identityId": "chicken-basic-v001",
  "modelLockId": "sd15-farm-v001",
  "workflowHash": "<sha256>",
  "referenceHashes": {"side": "<sha256>"},
  "sourceHash": "<sha256>",
  "paletteId": "farm-warm-v001",
  "cameraPresetId": "farm-ortho-v001",
  "cellSize": [64, 64],
  "pivotPx": [32, 52],
  "directions": ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
  "animations": {"walk": {"framesPerDirection": 6, "fps": 8}},
  "status": "candidate"
}
```

pivot/fps는 예시값이다. 프레임 sidecar에는 `direction, action, phase, seed, positive, negative, sampler, scheduler, steps, cfg, denoise, lora stack/weights, control/adapter parameters, guide hash, software versions, elapsedSec, peakVramMiB`를 저장한다. 모델 lock에는 checkpoint·VAE·LoRA·ControlNet·image encoder의 파일명/hash/architecture/출처/license를 기록한다.

새 세션은 이 문서 → style bible → identity → 승인 reference → model lock → 이번 변경값 순서로 읽는다. 마지막 생성 결과를 다음 생성의 유일한 reference로 계속 넘기면 drift가 누적되므로 승인 master를 항상 함께 사용한다. 모든 실험은 후보 폴더로 저장하고 승인 원본을 덮어쓰지 않는다.

## 7. SD 1.5 모델·LoRA·adapter 설정

### 7.1 호환성부터 고정

- checkpoint: 기존 실행 기록이 있는 `dreamshaper_8.safetensors`를 1차 기준으로 사용. 배포 파일의 hash/VAE/CLIP 설정을 실제 설치본에서 확인한다.
- ControlNet: `control_v11p_sd15_canny` 계열. alpha mask 자체를 Canny/Depth 모델에 그대로 넣지 않고 그 모델이 학습한 입력 표현으로 변환한다. depth는 별도 SD 1.5 depth 모델과 실제 depth guide가 필요하다.
- image reference: `ip-adapter-plus_sd15` + OpenCLIP ViT-H 대응 encoder. 이는 외형 conditioning이고 정확한 포즈/ID 보증이 아니다. Face/FaceID용 모델을 닭/늑대의 기본 모델로 쓰지 않는다. SDXL용 adapter/encoder와 혼용하지 않는다. [공식 adapter 모델 카드][s8]
- style LoRA: pixel 방향일 때만 SD 1.5용 `PixelArtRedmond15V` 또는 `Varo_pixel_Art`를 각각 비교한다. trigger는 각각 `PixArFK`, `pixelart_style`이다. 두 LoRA를 처음부터 함께 쓰지 않는다.
- identity LoRA: character identity 문제를 reference로 해결하지 못할 때 추가. 전체 닭농장의 모든 종을 하나의 identity LoRA에 섞지 않는다.

기존 `docs/retro-asset-studio/scripts/run-retro-filter.mjs`와 API workflow에는 `[Qwen.Image]PixelArt_Redmond.safetensors` 기본값이 남아 있다. **SD 1.5 제작에서는 사용하지 않는다.** 과거 모델 평가에는 SD 1.5용 PixelArtRedmond 실행 성공 기록이 있지만 현재 설치 상태·닭농장 품질은 미확인이다. 기존 차량 pipeline의 자동 재사용 대신 닭농장 전용 workflow에서 모델을 명시해야 한다.

ComfyUI 표준 CLIPTextEncode에 `<lora:name:0.6>`를 쓰는 것만으로 LoRA가 로드되는 것은 아니다. LoraLoader를 연결한다. UNet-only로 학습한 LoRA라면 CLIP 강도를 올려도 학습된 CLIP weight가 생기지 않는다.

### 7.2 추론 preset

모든 값은 시작 실험값이다. 동일 input·seed에서 한 축만 변경하며, 비교 후 preset을 versioning한다.

| 설정 | 정적 후보 | 구조를 고정한 유닛 스타일 처리 |
| --- | --- | --- |
| resolution / batch | 512×512 / 1 | 512×512 / 1 |
| sampler / scheduler | `dpmpp_2m` / `karras` | 동일 |
| steps / CFG | 24 / 6 | 24 / 5 |
| denoise | txt2img 1.0; blockout img2img 0.45 | 0.20–0.30, 최초 0.25 |
| style LoRA model strength | 0부터 기준선, 0.4/0.6/0.8 비교 | 승인 강도 유지; 형태 깨지면 낮춤 |
| style LoRA CLIP strength | CLIP weight가 있으면 0.5부터 | 동일 |
| identity LoRA | 최초 off; 학습 후 0.5/0.65/0.8 | 최초 0.65 후보 |
| Canny strength/start/end | guide 있을 때 0.65 / 0 / 0.8 | 0.75 / 0 / 0.9 |
| IP-Adapter scale | 최초 off; 필요 시 0.4–0.6 | 0.45부터, 구조 guide 우선 |
| seed | 101/202/303/404 비교 | 동일 noise 설정 비교 후 승인값 기록 |

ControlNet과 IP-Adapter의 scale은 서로 같은 척도가 아니다. custom node의 weight type/start/end 의미도 버전별 확인 후 기록한다. 먼저 `base → base+style → +Canny → +reference → +identity` 순서로 효과를 분리한다. 모든 제약을 최대치로 켜면 reference 포즈 복제, 뭉개짐, prompt 무시가 생길 수 있다.

메모리는 FP16/batch 1로 시작하고 reference encoder를 필요 시 offload한다. OOM이면 추가 adapter/ControlNet, 해상도, VAE 순서로 부하를 확인한다. denoise를 낮추는 것이 모델 메모리 해결책은 아니다. LoRA 추론 rank를 낮추기 위해 파일을 임의 절단하지 않는다.

## 8. 자체 LoRA 학습 설계

학습보다 먼저 승인 reference를 만든다. **일관성 없는 생성물을 많이 모아 학습하면 그 불일치도 학습한다.** 자체 학습은 2차 단계이며 3080에서 초기부터 모든 모델을 학습하는 계획은 아니다.

### 8.1 데이터 분리

| 종류 | 시작 데이터 목표 | 포함/제외 |
| --- | --- | --- |
| project style | 승인된 60–120장, 여러 종/건물/아이콘 균형 | 동일 카메라/채색 규칙; 특정 닭만 반복해서 style과 identity 결합하지 않음 |
| chicken identity | 승인된 24–40장 | 정면/측면/후면/대각과 자세 다양성, 정확한 동일 외형; 같은 원본의 단순 확대/색변경으로 수량 부풀리지 않음 |
| validation | 각 집합 20%를 원본/포즈 단위 분리 | 같은 render의 crop을 train/validation에 나누지 않음 |

숫자는 프로젝트 실험용 제안이다. 부족한 후면은 모델의 추측으로 채워 승인하지 말고 직접 설계한다. style token과 identity token을 분리한다: `cfarmstyle` / `cfhen01`. 이 문자열은 새 tokenizer token을 자동 등록하는 명령이 아니며, caption에서 반복 사용하는 trigger 문자열이다. 실제 tokenization을 확인한다.

이미지+동일 basename `.txt` caption을 준비하고, 투명 PNG는 학습 전에 정해진 배경으로 합성한다. alpha는 별도 보관한다. caption에 방향·동작·배경처럼 바뀌는 요소를 명시한다. 좌우 반전은 장비/광원/방향 label을 바꾸므로 초기 `flip_aug=false`; 팔레트를 바꾸는 color augmentation도 끈다.

identity caption 예:

```text
cfhen01 chicken, cream feathers, red comb, ochre beak,
side view facing right, standing, wings folded, plain gray background
```

style caption 예:

```text
cfarmstyle, wooden chicken coop, red roof, front-right three-quarter view,
elevated view, plain gray background
```

caption에서 모든 이미지에 실제로 보이는 특성만 쓴다. 방향별 occlusion과 불일치하는 장비/얼굴 설명을 강요하지 않는다. trigger와 class noun은 caption dropout에서 보존하고, 첫 학습은 caption shuffle/dropout 없이 시작한다.

### 8.2 SD 1.5 training 시작 recipe

kohya `sd-scripts`의 SD 1.x `train_network.py` 계열을 기준으로 한 **설정 설계**다. 설치된 revision의 옵션을 확인하기 전 실행 명령으로 취급하지 않는다. 환경은 ComfyUI와 분리하고 trainer commit/dependencies를 고정한다. LoRA 관련 절약 설정은 공식 학습 안내를 참고한다. [sd-scripts][s9], [Diffusers LoRA][s10]

| 설정 | identity 시작안 | style 시작안 |
| --- | --- | --- |
| 학습 base | 실제 추론에 쓸 checkpoint/VAE hash 고정 | 동일 |
| network module | `networks.lora` | 동일 |
| network_dim / network_alpha | 16 / 16 | 16 / 16; 검증 후 32 / 16 비교 |
| 학습 대상 | UNet-only; text encoder 동결 | 동일 |
| resolution | 512, 정해진 canvas; 불필요한 random crop 없음 | 동일 |
| batch / gradient accumulation | 1 / 4 (한 GPU effective batch 4) | 동일 |
| precision | mixed precision FP16, 저장 FP16 | 동일 |
| optimizer | AdamW8bit 지원 확인; 미지원이면 AdamW 후 메모리 재측정 | 동일 |
| UNet learning rate | 5e-5 | 1e-4 |
| scheduler | constant with warmup, 초기 5% | 동일 |
| gradient checkpointing | on | on |
| cache latents | on; flip/color/random crop off와 함께 사용 | 동일 |
| 첫 update 예산 | 600 optimizer steps, 200마다 평가 | 1,200 steps, 200마다 평가 |
| 초기 범위 | 필요 시 400–1,200 내 비교 | 필요 시 800–2,000 내 비교 |

gradient accumulation은 한 sample의 activation peak를 줄이지 않는다. VRAM 여유가 없으면 해상도/네트워크/optimizer부터 확인한다. latent cache는 이미지 augmentation과 충돌할 수 있다. gradient checkpointing은 메모리를 줄이는 대신 계산량을 늘린다. 이 조합도 10GB에서 실행 성공을 보장하지 않으므로 처음 20 update로 메모리 smoke를 한다.

step은 raw image 처리 횟수와 구분한다. 예를 들어 train 32장, batch 1, accumulation 4라면 대략 epoch당 8 optimizer updates이고 600 updates는 약 75회 노출이다(실제 repeats·drop-last·분산 설정에 따라 다름). 작은 데이터에서는 과적합 가능성이 높으므로 마지막 checkpoint를 자동 채택하지 않는다.

검증: 학습하지 않은 pose guide·배경과 같은 seed set을 사용한다. 몸 비율/색/벼슬/부리의 정체성을 유지하면서 새 방향을 따르는 가장 이른 checkpoint를 선택한다. reference 배경이나 자세를 복사하거나 새로운 방향을 거부하면 learning rate/steps/weight를 낮추고 데이터 구성을 수정한다. rank를 올리는 것은 마지막 조치다. 학습 loss 감소만으로 채택하지 않는다.

## 9. 재사용 prompt 규칙과 예시

prompt는 `style + identity + view + action + framing` 다섯 블록으로 관리한다. 변경은 view/action에 집중한다. SD 1.5에서는 핵심 외형·방향을 앞쪽에 두고 CLIP token 길이와 UI의 chunk/truncation 동작을 확인한다. 장문의 장식어를 쌓지 않는다.

`cfarmstyle`/`cfhen01`은 해당 LoRA가 학습·로드되기 전에는 의미를 학습한 trigger가 아니다. 초기 prompt에서는 제거한다. 외부 LoRA를 쓰는 경우 그 모델의 trigger만 사용한다.

### 9.1 기본 positive / negative

soft-painted positive:

```text
single chicken, cream feathers, small red comb, short ochre beak,
elevated three-quarter view, facing right, wings folded,
stylized farm game sprite, chunky silhouette, simple painted shading,
full body, centered, plain gray background
```

pixel 후보는 마지막 스타일 블록을 다음으로 교체한다(선택한 LoRA에 맞춰 trigger 하나만 사용):

```text
PixArFK, pixel art game sprite, chunky pixel clusters,
limited warm palette, crisp contour, full body, centered, plain gray background
```

SD 1.5 negative 시작안:

```text
multiple characters, extra limbs, duplicate head, cropped body,
text, logo, watermark, scenery, ground shadow, blurry, photorealistic
```

`3d`를 무조건 negative에 넣지 않는다. 승인 목표가 pre-rendered stylized 형태라면 원하는 볼륨까지 손상시킬 수 있다. transparent/checkerboard prompt는 alpha를 만드는 기능이 아니므로 배경 제거/원본 alpha 복원을 별도 처리한다.

### 9.2 identity LoRA 학습 후 방향·행동 템플릿

```text
cfhen01 chicken, cream feathers, small red comb, short ochre beak,
{view}, {pose}, stylized farm game sprite, chunky silhouette,
simple shading, full body, centered, plain gray background
```

| direction | `{view}` 예시 | guide가 담당할 내용 |
| --- | --- | --- |
| E | elevated side view, facing right | 정확한 측면 silhouette |
| W | elevated side view, facing left | 좌우 표식/조명 확인 |
| S | elevated front view, facing the viewer | 가슴·양발·벼슬 위치 |
| N | elevated back view, facing away | 꼬리·등, 얼굴 가림 |
| SE/SW | elevated front three-quarter view, facing right/left | 앞 대각 projection |
| NE/NW | elevated rear three-quarter view, facing right/left | 뒤 대각 projection |

pose 예: idle=`standing, wings folded`, walk contact=`walking, one foot planted, other foot forward`, peck=`head lowered, beak near the ground`. `frame 3 of 6`, `turn exactly 45 degrees`, `same chicken as before` 문구는 기하학적 제약을 대체하지 못한다. 정확한 발 위치·접지·phase는 pose guide로 제공한다.

### 9.3 농부/늑대/건물/아이콘

```text
single farmer, straw hat, rust-red tunic, dark brown trousers,
small wooden tool at the right hip, elevated front three-quarter view,
full body, stylized farm game sprite, simple shading, plain gray background
```

```text
single lean wolf, charcoal gray fur, pale muzzle, short thick tail,
elevated side view facing right, standing on four legs,
stylized farm game sprite, chunky silhouette, plain gray background
```

```text
single wooden chicken coop, red gable roof, one square entrance,
elevated front-right three-quarter view, compact square foundation,
stylized farm game sprite, simple painted shading, plain gray background
```

```text
single cream egg, warm highlight, simple bold silhouette,
painted inventory icon, centered, plain dark gray background
```

농부의 오른쪽 장비는 mirror 예외다. 건물의 문 개수·바닥 넓이·지붕 방향은 source blockout을 기준으로 검수한다. 아이콘의 프레임/문구는 나중에 코드로 합성한다.

### 9.4 편집 모델 비교용 prompt

FLUX.2 klein 등 reference 편집 후보는 자연어로 변경/보존 범위를 지시하고 승인 master를 다시 제공한다. 다음 문구는 기능 검증용이며 해당 노드의 reference 순서 지원을 확인해야 한다.

```text
Use reference A for the chicken's identity and colors.
Use reference B for the body pose and viewing direction.
Render one full-body chicken in the pose of B.
Keep the cream feathers, small red comb, short ochre beak, and compact proportions of A.
Keep the plain background and the framing of B.
```

지원되지 않는 negative prompt/CFG를 SD preset에서 복사하지 않는다. Z-Image-Turbo 공식 예제는 guidance_scale=0.0을 사용하며 SD의 CFG 6과 다르다. distilled/base 모델도 scheduler/steps와 LoRA 호환을 따로 고정한다. 최신 편집 모델에서도 출력 크기·부리 모양·alpha·pivot은 자동 보장되지 않는다.

## 10. drift 원인별 수정

| 증상 | 먼저 바꿀 것 |
| --- | --- |
| 같은 종인데 매번 다른 캐릭터 | 승인 reference 고정, identity 명세 확인; 그래도 실패하면 identity LoRA |
| 그림체만 달라짐 | checkpoint/style LoRA/palette 버전 고정; 같은 style contact sheet 제공 |
| reference 방향을 계속 복사 | IP-Adapter 강도 낮춤, 요청 방향 reference 추가, 구조 guide 강화 |
| 몸/부리/다리가 찌그러짐 | guide 자체와 denoise 점검; CFG/여러 LoRA를 동시에 올리지 않음 |
| walk frame마다 무늬/outline 깜빡임 | 독립 diffusion을 중단하고 고정 texture/rig 렌더 또는 수작업 수정 |
| alpha는 맞는데 내부 색/부위가 틀림 | semantic mask/texture 수정; alpha 복원만으로 해결됐다고 보지 않음 |
| 발이 미끄러짐 | rig의 접지와 게임 이동속도/animation timing 조정 |
| atlas에서 덜컥거림 | 프레임별 trim/scale/pivot 차이 확인; 고정 원본 cell 복원 |
| 타일이 반복 경계에서 끊김 | 명시적 edge/corner mask 및 인접 타일 검수 |

## 11. 실행 단계와 완료 기준

### 단계 A — context와 환경 고정

모델 lock/설치 확인, GPU VRAM·driver·ComfyUI revision 기록. 스타일 2개를 비교해 한 개 승인. 닭 identity sheet, 카메라, palette, cell/pivot을 고정한다. 기존 공정의 queue/sidecar/palette 기능은 재사용하고 차량 prompt/바퀴/차체 마스크는 제거한 별도 workflow를 설계한다.

### 단계 B — 80회 이내 생성 비교 + 비생성 기준선

- 닭·농부·늑대·닭장·타워·알 아이콘 6종 × baseline/style 두 설정 × 4 seeds = 48회.
- 닭 하나의 4방향 × walk 4프레임 = 16개 source pose를 먼저 제작. 무처리 rig render를 기준선으로 보존한다.
- 같은 pose에 스타일 처리안 2개 = 32회. 합계 80회, 새 학습 없음.
- 후보별 warm 시간, VRAM peak, 채택률, 수작업 분량을 기록한다. 통과한 공정만 8방향·6프레임으로 확장한다.

### 단계 C — 원인이 확인될 때만 LoRA 학습

style 문제와 identity 문제를 분리한다. 포즈 문제를 identity LoRA 학습으로 해결하려 하지 않는다. 승인 데이터 확보 후 20-step 메모리 smoke, checkpoint별 holdout 검증을 수행한다. 학습/추론 환경과 결과를 별도 보존한다.

### 단계 D — 전체 목록 확장

정적 건물·아이콘·소품부터 적용하고, 유닛은 같은 rig/원본 계열 단위로 확장한다. 등급별 공통 재질/장식 재사용은 역할 식별성을 유지할 때만 허용한다. 상태별 scaffold/damage/rubble과 effects를 연결하고 atlas/manifest를 실제 runtime ID와 매핑한다.

완료 기준 제안:

- 작은 runtime 크기에서 종/역할/등급이 구분되고 주요 외형 특징이 모든 해당 방향에 유지된다.
- 고정 지면 pivot 오차는 source 기준 0px를 목표로 한다. 의도된 신체 바운스는 허용하되 canvas 위치가 흔들리지 않는다.
- 모든 동작이 cell 안에 들어가며 무기/부리/발이 잘리지 않는다. endpoint loop에는 불필요한 duplicate frame이 없다.
- 접지 phase와 이동속도가 맞고 공격/작업 frame timing이 simulation 이벤트와 연결된다.
- alpha halo/배경색 오염, atlas 이웃 프레임 번짐, 색상 flicker가 없다. pixel 선택 시 최종 팔레트/정수 배율을 검수한다.
- 건물 앞/뒤 y-depth, footprint, 팀 색상, 낮/밤 배경 가독성을 게임에서 확인한다.
- 대표 pose에서 silhouette IoU 같은 수치를 비교할 수 있지만 움직이는 서로 다른 pose끼리 높은 IoU를 강요하지 않는다. 정체성 판정은 contact sheet 시각 검수를 병행한다.

## 12. 비용과 최종 선택 기준

보유 장비의 로컬 추론에는 API 종량 요금이 없다. 모델/도구별 배포·상업 이용 조건과 실제 파일 출처를 기록한다. Aseprite 등 선택 도구의 구매 비용은 별도이며 무료 도구/직접 렌더링으로도 구성할 수 있다. 모델 라이선스 표기가 학습 데이터와 모든 결합 모델의 조건을 대신하지 않는다.

전력 예산 예시: 장당 10–30초, PC 전체 0.45kW, 200–400원/kWh를 가정한다. **실측 속도나 실제 가구 요금표가 아니다.**

| 생성량 | 순수 추론 시간 | 예시 전기료 |
| --- | ---: | ---: |
| 1,000회 | 2.8–8.3시간 | 250–1,500원 |
| 2,500회 | 6.9–20.8시간 | 625–3,750원 |
| 10,000회 | 27.8–83.3시간 | 2,500–15,000원 |

모델 로딩·후처리·학습·offload 대기는 제외다. 실제 전력비는 전체 wall time × 콘센트 측정 kW × 추가 전력 단가로 계산한다. 학습 시간은 실측 sec/update × optimizer steps + validation으로 따로 계산한다.

전체 생산성은 `(원본 제작 + 학습 준비 + 선별 + 수작업 + 렌더/생성 + 통합 시간) / 승인 asset 수`로 비교한다. 유닛 40종 × 8방향 × 4상태 × 6프레임은 7,680개 프레임이지만 rig 공정에서는 7,680번 새 디자인을 할 필요가 없다. 이 차이가 context 유지와 비용 절감의 핵심이다.

현재 선택은 **고정 원본 기반 애니메이션 + SD 1.5 정적/디자인 보조**다. 최신 모델로의 전환은 승인 asset당 수정 시간이 줄어든다는 실측이 있을 때 결정한다.

## 출처와 이어서 읽을 문서

- [현재 구현 context](./chicken_farm_current_context.md), [기존 ID/크기/레이어 명세](./chicken_farm_sprite_asset_generation_plan.md), [원본 분석](./chicken_farm_w3x_analysis.md).
- [기존 로컬 공정](../retro-asset-studio/README.md), [모델 평가·실행 이력](../retro-asset-studio/model-candidate-evaluation.md).
- [SD 1.5 모델 카드][s1], [ControlNet 원저자][s2], [SDXL][s3], [FLUX.2 klein 4B][s4], [Z-Image-Turbo][s5], [FLUX.1 schnell][s6], [Qwen Edit][s7].
- [IP-Adapter 모델/encoder 대응][s8], [sd-scripts trainer][s9], [Diffusers LoRA 학습][s10], [Blender 카메라][s11], [Aseprite 애니메이션][s12].
- [DreamShaper 8](https://huggingface.co/Lykon/dreamshaper-8), [PixelArtRedmond SD 1.5](https://huggingface.co/artificialguybr/pixelartredmond-1-5v-pixel-art-loras-for-sd-1-5), [Varo Pixel Art](https://huggingface.co/VaroDZAKY/Varo_pixel_Art).

[s1]: https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5
[s2]: https://github.com/lllyasviel/ControlNet
[s3]: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
[s4]: https://huggingface.co/black-forest-labs/FLUX.2-klein-4B
[s5]: https://huggingface.co/Tongyi-MAI/Z-Image-Turbo
[s6]: https://github.com/black-forest-labs/flux
[s7]: https://huggingface.co/Qwen/Qwen-Image-Edit-2509
[s8]: https://huggingface.co/h94/IP-Adapter
[s9]: https://github.com/kohya-ss/sd-scripts
[s10]: https://huggingface.co/docs/diffusers/training/lora
[s11]: https://docs.blender.org/manual/id/5.0/editors/3dview/navigate/projections.html
[s12]: https://www.aseprite.org/docs/animation/
