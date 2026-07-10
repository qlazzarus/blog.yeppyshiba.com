# Apex Seoul Vehicle Sprite Pipeline Map

이 문서는 Apex Seoul 차량 이미지 생성 경로를 현재 기준으로 분류한다.

## Canonical Pipeline

현재 승인 대상은 이 경로다.

```text
Three.js pose sheet / pixel candidate
-> ComfyUI img2img + Canny ControlNet style filter
-> palette-lock
-> postprocess-ft86-retro-sheet
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
- 최종 색상과 alpha는 deterministic postprocess가 책임진다.
- 승인 판단은 runtime screenshot QA에서 한다.

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
