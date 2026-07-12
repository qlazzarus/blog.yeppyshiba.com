# Apex Seoul Vehicle Sprite Pipeline Map

이 문서는 Apex Seoul 차량 이미지 생성 경로를 현재 기준으로 분류한다.

## Canonical Pipeline

현재 승인 대상은 이 경로다.

```text
Three.js pose sheet
-> deterministic pixel candidate / source alpha
-> ComfyUI img2img + Canny ControlNet + vehicle-specific prompt
-> palette-lock
-> source-alpha restoration + postprocess-ft86-retro-sheet
-> runtime screenshot QA
```

현재 기준 차량:

```text
ft86-retro
```

현재 승인 색상:

```text
blue
black
```

주요 명령:

```bash
cd docs/retro-asset-studio
npm run run:ft86:balanced

cd ../..
npm run postprocess:ft86-retro --workspace @games/apex-seoul
npm run qa:ft86-runtime-colors --workspace @games/apex-seoul -- --manifest-only
```

승인 기준:

- ComfyUI는 style filter 역할만 한다.
- 차량 형태와 포즈는 입력 spritesheet가 책임진다.
- 차량별 prompt는 차체의 성격과 표면 어조만 바꾸며, viewpoint/pose/contact baseline은 바꾸지 않는다.
- 최종 색상, alpha, outline cleanup은 deterministic postprocess가 책임진다.
- 승인 판단은 runtime screenshot QA에서 한다.

각 ComfyUI 실행은 `<output>.pipeline.json` sidecar를 남긴다. 이 파일은 input/workflow hash, seed, checkpoint, LoRA, ControlNet, sampler, prompt를 보관하며 승인 asset의 재현 기준이다.

## Planned Control Reinforcement

현재 workflow에는 Canny ControlNet이 이미 들어 있다. 다음 개선은 Canny를 새로 덧붙이는 것이 아니라, Three.js 원본에서 나온 silhouette/contact 정보를 함께 보존하는 것이다.

```text
Three.js pose sheet
-> source alpha silhouette mask + Canny edge map
-> ComfyUI style filter
-> restore source alpha
-> palette/role postprocess
-> pose-set QA + runtime QA
```

초기 비교 대상은 다음 세 가지다.

- `balanced-v1`: 현재 Canny baseline.
- `drift-safe-canny`: Canny strength/end percent를 올려 strong steer와 future drift pose의 형태 보존을 확인하는 후보.
- `drift-safe-mask`: 현재 Canny baseline에 source alpha silhouette mask를 추가해 형태 보존과 스타일 변형의 균형을 확인하는 후보.

강한 pose는 `center`, `steer-right-1`, `steer-right-2`를 하나의 승인 단위로 본다. full sheet의 색감만 통과해도, strong steer의 폭/접지선/후미등 위치가 무너지면 후보를 승인하지 않는다.

추가 산출물:

```text
reproducibility sidecar: seed, workflow/input hash, checkpoint, LoRA, ControlNet params
semantic masks: body, tail-light, tire, glass
pose QA: baseline jitter, pose delta, tire contact, alpha edge
```

## Legacy GPT Image Path

초기 Raven Coupe 블로그 글에서 사용한 경로다.

```text
3D pose sheet
-> GPT image transform
-> clean-vehicle-sprite-sheet
-> finalize-vehicle-sprite-sheet
-> atlas/runtime experiment
```

상태:

```text
legacy / blog reference
```

이 경로는 "게임 asset은 이미지 한 장이 아니라 compiler output이어야 한다"는 교훈을 남겼지만, 현재 canonical path는 아니다.

관련 글:

```text
contents/phaser4-apex-seoul-raven-coupe-sprite-pipeline.md
```

## Real-Car POC Path

GT86, G70, Stinger 실차/참조 모델로 pose, scale, readability를 비교한 경로다.

```text
real/reference GLB
-> render-real-vehicle-pocs
-> render-vehicle-pose-sheet
-> pixel-pass-vehicle-sheet
-> approved/runtime POC
```

상태:

```text
reference / comparison
```

실차 모델은 최종 공개 asset이 아니라 포즈, 길이감, 휠 분리감, 후방 실루엣을 검증하기 위한 source reference다.

## Deferred VDrift / Raven XG Path

최종 fictional coupe source 후보를 찾기 위한 보류 경로다.

```text
VDrift source
-> JOE/glTF conversion
-> semantic materials
-> pose sheet
-> canonical ComfyUI/postprocess/runtime QA
```

상태:

```text
deferred
```

재개 조건:

- FT86 postprocess/runtime QA path가 안정화된다.
- VDrift license/distribution implications are documented.
- JOE-to-glTF conversion is repeatable.
- Material names can be fixed to semantic roles such as `body`, `glass`, `tire`, `wheel`, `brake_light`.

## Runtime Effect Path

base sprite에 굽지 말아야 하는 효과는 별도 runtime layer로 간다.

```text
base sprite
-> silhouette/contact shadow
-> tail-light glow
-> brake/speed glow
-> wet-road/reflection experiment
```

상태:

```text
planned runtime layer
```

규칙:

- base sprite에는 glow, bloom, scene light, ground shadow를 굽지 않는다.
- tail light와 shadow는 speed/brake/contact state에 따라 런타임에서 조절한다.
