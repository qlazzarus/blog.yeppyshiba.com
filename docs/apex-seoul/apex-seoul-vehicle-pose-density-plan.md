# Apex Seoul 차량 조향 pose 밀도와 Three.js sprite 생성 계획

갱신일: 2026-07-28

상태: 설계 승인·구현 보류. ComfyUI style-filter 환경이 복구된 뒤 FT86부터 7way 후보를 생성·QA한다. 현재 5way atlas·runtime은 유지한다.

## 결정

현재 normal-driving pose는 아래 5way다.

```text
steer-left-2 → steer-left-1 → center → steer-right-1 → steer-right-2
```

`center`에서 첫 좌·우 pose로 넘어갈 때 차체 silhouette와 rear-quarter 노출이 크게 바뀌어, 저속 grip 조향에서 sprite 전환이 한 단계 뛰는 것처럼 읽힌다. 이를 다음 7way로 확장한다.

```text
steer-left-2 → steer-left-1 → steer-left-0 → center
             → steer-right-0 → steer-right-1 → steer-right-2
```

- `steer-*-0`: 정면과 현재 mild steer(`steer-*-1`) 사이의 **slight steer** pose다.
- 기존 `steer-*-1`, `steer-*-2`의 의미와 정상/dynamic drift 분리는 바꾸지 않는다.
- 좌 pose는 right source의 `flipX`를 계속 사용한다. 따라서 새 원본 렌더는 `center`, `steer-right-0`, `steer-right-1`, `steer-right-2` 네 장이다.
- 이 작업은 차량의 물리 steering, grip authority, drift state, heading을 바꾸지 않는 presentation/atlas 작업이다.

## pose·threshold 설계

| Runtime state | 원본 | rear angle 가이드 | 역할 |
| --- | --- | ---: | --- |
| `center` | center | 0° | neutral 및 steering release의 안정 기준 |
| `steer-right-0` | 새 원본 | 10–12° | center 바로 다음의 작은 조향 변화 |
| `steer-right-1` | 기존 원본 | 24° | 일반 grip turn-in이 읽히는 mild steer |
| `steer-right-2` | 기존 원본 | 44° | 큰 grip steer / strong corner pose |

`steer-left-*`는 같은 source frame을 `flipX`한다. 실제 frame 선택은 visual steering 값의 절대값을 세 구간으로 나누되, `0` 주변 dead zone은 center에 남긴다. 첫 pass 권장값은 atlas 크기와 QA를 확인한 뒤 정한다. 임의의 threshold tuning으로 기존 5way 프레임을 덮어쓰지 않는다.

### QA 기준

- center → `steer-0` → `steer-1` → `steer-2`에서 rear contact baseline과 vehicle origin이 연속적이다.
- `steer-0`가 center와 픽셀 단위로 동일하지 않고, `steer-1`과도 명확히 다르다.
- 좌우 flip에서 tail-light, wheel, shadow contact의 좌우 대칭이 유지된다.
- neutral command는 center frame을 유지하며, drift/spin/crash source pose는 normal steering threshold에 들어가지 않는다.
- 기존 steering/handling/browser screenshot QA와 production build를 통과한다.

## Three.js를 통한 sprite 생성 가능성

**가능하다.** 이 저장소의 `render-vehicle-pose-sheet.mjs`는 이미 Three.js로 GLB 또는 procedural vehicle을 렌더해 pose sheet를 만든다. 현재 지원 범위는 다음과 같다.

```text
GLB / procedural vehicle
→ model transform (yaw, pitch, roll, axis scale)
→ orthographic camera·조명·material override
→ deterministic RGBA pose sheet
→ pixel / ComfyUI style filter / alpha restore
→ Phaser atlas + runtime QA
```

Three.js renderer의 `WebGLRenderTarget` 또는 canvas render 결과는 이미지로 읽어 sprite sheet로 저장할 수 있다. Three.js 공식 문서도 scene+camera를 render target으로 렌더하고 그 결과 texture를 재사용하는 흐름을 지원한다. 이는 frame 수가 늘어나는 7way 후보를 같은 카메라·조명·alpha 조건으로 반복 생성하는 데 맞다.

### Codex가 맡을 수 있는 수정

- pose manifest에 slight-steer camera/yaw를 추가하고, deterministic sheet·atlas export·QA를 자동화한다.
- procedural vehicle의 차체 비율, wheelbase, 휠·lamp·glass·재질 역할을 코드로 수정한다.
- GLB의 scene graph transform, 재질 override, scale/axis 보정, camera/light rig를 수정한다.
- sprite export 후 alpha, palette, contact baseline, frame/atlas metadata를 검사하고 고친다.

### 범위 밖 / 별도 도구가 필요한 수정

- 임의 GLB의 정교한 mesh sculpt, topology repair, UV unwrap, rigging, 고품질 텍스처 페인팅은 Three.js/Codex만으로 안정적으로 대체하지 않는다.
- 이런 원본 모델 편집은 Blender 등 DCC에서 수행하고, Codex는 repeatable export script·manifest·render QA를 소유한다.
- 런타임 Phaser를 Three.js로 교체하지 않는다. Three.js는 **offline sprite authoring renderer**이며 게임은 기존 Phaser pseudo-3D를 유지한다.

## 실행 순서

1. 현재 FT86 5way의 pose sheet/atlas/runtime screenshot을 baseline으로 보관한다.
2. `steer-right-0`(10–12°)만 추가한 4-source/7-runtime pose manifest 후보를 만든다.
3. 동일 Three.js rig로 256px sheet를 렌더하고, 현재 pixel·style-filter·alpha restore pipeline을 통과시킨다.
4. contact baseline, left/right flip, `center ↔ steer-0 ↔ steer-1` 차이를 QA한다.
5. atlas type·frame selection threshold·headlight/shadow profile을 함께 확장한다.
6. runtime screenshot과 handling regression을 통과한 후보만 `approved`로 승격한다.

### 보류 사유 — 2026-07-28

Three.js raw render만으로 만든 intermediate pose는 현재 FT86 256px style-filter 승인본과 시각적으로 튀었다. 따라서 해당 runtime atlas·sprite·frame selection 변경은 모두 되돌렸다. ComfyUI style-filter 환경이 복구되기 전에는 7way source frame을 runtime에 부분 합성하지 않는다.

이 pass는 차량 art/presentation 작업이 열릴 때만 시작한다. 핸들링 기준선은 이를 위해 재조정하지 않는다.
