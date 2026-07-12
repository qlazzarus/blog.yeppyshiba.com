# Apex Seoul Pixel-Art Model Candidate Evaluation

작성일: 2026-07-12

## 결론

현재 Windows ComfyUI에 설치된 모델 조합은 Apex Seoul의 pixel-art style pass에 적합하지 않다.

```text
checkpoint: dreamshaper_8.safetensors
LoRA:       [Qwen.Image]PixelArt_Redmond.safetensors
```

`[Qwen.Image]PixelArt_Redmond`는 `Qwen/Qwen-Image-2512`를 base model로 요구하는 Qwen Image 전용 LoRA다. 반면 `dreamshaper_8`은 SD 1.5 계열 checkpoint다. 파일이 ComfyUI에서 선택되더라도 이 조합의 weight가 의도한 방식으로 적용된다고 볼 수 없다. 이번 parameter sweep에서 pixel-art style 변화가 거의 없었던 가장 유력한 원인이다.

현재 서버에 실제로 있는 checkpoint와 LoRA도 각각 하나뿐이다. 따라서 기존 workflow는 호환되는 SD 1.5 LoRA를 먼저 넣어 검증해야 한다.

## 후보와 우선순위

| 우선순위 | 후보 | 아키텍처/라이선스 | 적용 판단 |
| --- | --- | --- | --- |
| 1 | `PixelArtRedmond15V-PixelArt-PIXARFK.safetensors` | SD 1.5 LoRA, 27.2 MB, bespoke LoRA license | **먼저 설치·검증.** DreamShaper 8을 유지하므로 기존 Canny/latent-mask workflow를 가장 적게 바꾼다. Trigger는 `PixArFK`. 공개 배포 전에는 개별 라이선스 확인이 필요하다. |
| 2 | `Varo_pixel_Art` | SD 1.5 LoRA, Apache-2.0 | **보조 비교군.** retro RPG sprite 성격이 강하므로 차량의 black/blue Seoul downhill 톤에 맞는지는 별도 평가한다. 모델 카드의 trigger는 `pixelart_style`이다. |
| 3 | `SD_PixelArt_SpriteSheet_Generator` | SD 계열 checkpoint, Apache-2.0 | **별도 branch 전용.** 4방향 sprite sheet 생성에 특화됐지만, 현재 Three.js pose sheet와 정렬된 다중 pose를 보존하는 canonical img2img workflow를 바로 대체하면 안 된다. |
| 4 | `pixel-art-xl.safetensors` + SDXL base | SDXL LoRA 171 MB, CreativeML Open RAIL-M | **후순위 architecture migration.** SDXL base, SDXL용 Canny ControlNet, workflow/VRAM 재검증이 함께 필요하다. 10 GB RTX 3080에서는 memory-efficient 설정을 먼저 검증해야 한다. |
| 제외 | `[Qwen.Image]PixelArt_Redmond.safetensors` | Qwen Image 2512 LoRA | **DreamShaper path에서 제거 대상.** Qwen Image checkpoint와 별도 workflow를 준비할 때만 사용한다. |

## 권장 실험 순서

1. 기존 Qwen LoRA를 DreamShaper workflow에서 빼고, SD 1.5용 `PixelArtRedmond15V`를 추가한다.
2. `PixArFK` trigger를 positive prompt에 넣고, 같은 FT86 source alpha + latent-mask + fixed seed로 baseline 한 장을 만든다.
3. 현 `balanced`와 다음 항목을 pose set 단위로 비교한다: center/steer-1/steer-2 silhouette, tire contact, tail-light 위치, realistic texture 감소, pixel cluster의 일관성.
4. 통과하지 못하면 `Varo_pixel_Art`를 두 번째 SD 1.5 후보로만 비교한다. 둘을 동시에 섞지 않는다.
5. 두 SD 1.5 LoRA가 모두 실패할 때만 SDXL branch의 비용(새 base/ControlNet/VRAM)을 승인받아 검토한다.

## 2026-07-12 첫 호환성 검증

`PixelArtRedmond15V-PixelArt-PIXARFK.safetensors`가 Windows ComfyUI의 LoRA 목록에 정상 인식된 것을 확인했다. 다음 조건으로 FT86 balanced 1회 실행도 성공했다.

```text
seed: 464901062956189
LoRA model / CLIP strength: 0.9 / 0.9
positive addition: PixArFK, flat 16-bit pixel art, chunky pixel clusters, hard color ramps
negative addition: photorealistic, smooth shading, anti-aliased render
```

생성, download, palette lock, metadata sidecar는 정상 통과했다. 첫 결과는 silhouette과 pose grid를 유지했지만 pixel-art 변환 폭은 아직 작다. 따라서 이 LoRA는 architecture-compatible 후보임이 확인됐으나 승인 후보는 아니다. 다음 비교에서는 source alpha latent-mask를 다시 연결하고 denoise 또는 LoRA strength를 한 축만 조정한다.

## 설치 전 확인 항목

- 모델 파일은 Windows ComfyUI의 `models/loras`에만 추가한다. 현재 repo나 runtime import는 바꾸지 않는다.
- model card의 라이선스와 trigger word를 sidecar metadata에 기록한다.
- LoRA와 base checkpoint family가 정확히 일치하는지 확인한다.
- 모델을 새로 받는 행위는 용량·라이선스·Windows ComfyUI 상태에 영향을 주므로, 사용자 승인 후에만 실행한다.

## 출처

- [Qwen Image PixelArt Redmond model card](https://huggingface.co/artificialguybr/PIXELART-REDMOND-QWENIMAGE): base model `Qwen/Qwen-Image-2512`, trigger `Pixel Art`/`PixArFK`, 파일 약 590 MB.
- [PixelArt Redmond SD 1.5 LoRA](https://huggingface.co/artificialguybr/pixelartredmond-1-5v-pixel-art-loras-for-sd-1-5): SD 1.5 전용 `PixelArtRedmond15V-PixelArt-PIXARFK.safetensors`, 27.2 MB.
- [Varo Pixel Art LoRA](https://huggingface.co/VaroDZAKY/Varo_pixel_Art): SD 1.5 기반, Apache-2.0, retro RPG sprite 지향.
- [SD PixelArt SpriteSheet Generator](https://huggingface.co/Onodofthenorth/SD_PixelArt_SpriteSheet_Generator): Apache-2.0, 4방향 pixel-art sprite sheet checkpoint.
- [Pixel Art XL](https://huggingface.co/nerijs/pixel-art-xl): SDXL base 1.0용 LoRA, 171 MB; model card는 nearest-neighbor downscale과 별도 VAE를 권장한다.
