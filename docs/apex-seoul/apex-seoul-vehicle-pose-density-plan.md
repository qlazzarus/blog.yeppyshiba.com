# Apex Seoul 차량 조향 pose 밀도와 Three.js sprite 생성 계획

갱신일: 2026-08-19

상태: 3종 playable 후보의 공통 art direction 비교를 먼저 수행한다. ComfyUI style-filter 환경이 복구된 뒤 승인된 기준으로 7way 후보를 생성·QA한다. 현재 5way atlas·runtime은 유지한다.

## playable 차량 art direction 비교 — 다음 gate

대상은 **FT86, Stinger, G70 (Nieve)**다. 이 세 모델을 곧바로 runtime 차량으로 등록하지 않는다. 먼저 동일한 Three.js preview/render rig에서 비교해, 어떤 모델이더라도 하나의 Apex Seoul sprite family로 읽히는 기준을 고정한다.

| 비교 항목 | 고정 기준 | 승인 목적 |
| --- | --- | --- |
| scale | 실차 length 정규화, 공통 contact floor | 차종마다 차체가 떠 보이거나 도로 점유율이 달라지는 것을 방지 |
| camera/light | rear와 rear-quarter, 동일 orthographic camera·조명 | pose 차이가 차종이 아니라 rig 차이로 보이지 않게 함 |
| silhouette | roofline, fender, wheelbase, rear overhang | 128/256px에서도 각 차의 역할이 구분되는지 확인 |
| material roles | body / glass / wheel / lamp 분리 | palette pass와 lamp·shadow 후처리를 공통 규칙으로 유지 |
| sprite contract | alpha bounds, contact baseline, right-source→left flip | atlas·headlight·shadow QA가 세 차량에 같은 구조로 확장 가능함을 확인 |

G70 (Nieve)는 기존 G70 POC의 대체 **art donor**다. 원본의 한쪽 후면 배기구는 `flipX`에서 비대칭으로 보이므로, 양쪽 배기구를 갖는 파생 GLB를 sprite source로 고정한다. G70 runtime asset을 이 단계에서 제거하지 않으며, 실제 catalog 교체는 G70 (Nieve) pose sheet·pixel pass·atlas QA가 승인된 뒤에만 한다. real-name 모델은 POC/authoring reference이며, 공개 runtime 후보에는 Raven 계열의 fictionalized art·attribution 정책을 별도로 적용한다.

공개 차량명은 **Mirae GT**로 고정한다. `G70 (Nieve)`, `genesis_g70_nieve` 등의 명칭은 원본·파생 GLB·render manifest를 연결하는 내부 provenance 식별자이며, 게임 UI·차량 카드·공개 atlas metadata에는 사용하지 않는다. 이 명칭 변경은 source license의 attribution 표기를 대체하지 않는다.

## 공통 sprite artwork와 palette variant 계약

7way source를 만들기 전에 각 차량을 별도 완성작처럼 렌더하지 않는다. FT86, Stinger, G70 (Nieve)는 하나의 **Apex Seoul sprite family**로 읽혀야 하며, 차종 구분은 rear-quarter silhouette·roofline·wheelbase·lamp 폭처럼 저해상도에서도 남는 특징에만 둔다.

| 단계 | 공통화 규칙 | 차종별로 남길 것 |
| --- | --- | --- |
| 3D authoring | 로고·번호판·세밀한 그릴·현실적인 재질 편차를 약화하고 body/glass/wheel/lamp/chrome/shadow 역할을 분리 | 차체 비례, 루프·펜더 윤곽, 램프 폭, wheelbase, rear overhang |
| deterministic render | 공통 orthographic rig, 노출, outline·shadow 기준, contact baseline | 각 차량의 승인된 7way pose와 silhouette |
| pixel/style pass | 공통 명암 단계, 외곽선 두께, 유리·램프 발광 규칙 | 차체 역할 mask와 각 차종의 고유 silhouette |
| palette variant | body 역할만 교체하고 glass, lamp, tire, chrome, shadow는 고정 | `blue`, `red`, `silver`, `black`의 선택 가능한 차체색 |

색상 variant는 차종별 7way 3D render를 다시 만드는 작업이 아니다. 먼저 차종별 **neutral master 7way**를 승인하고, body-role mask를 이용해 후처리에서 색을 파생한다. 전체 RGB 치환은 lamp·반사광·shadow를 오염시키므로 금지한다. 기존 FT86 palette-role 후처리 구조를 세 차량 공통 manifest로 일반화한다.

원본 차량의 recognizability는 유지하되, 완성 sprite는 실차 홍보 렌더처럼 보이지 않도록 한다. 공개 후보에는 fictionalized Raven 계열 명명과 attribution을 함께 적용한다. FT86와 Stinger도 sprite authoring을 시작하기 전에 source URL·author·license·파생 기록 sidecar를 보완해야 하며, G70 (Nieve)는 원본과 대칭 배기구 파생본의 연결을 계속 기록한다.

### G70 (Nieve) 3D art-master 방향

- 공개 표기는 `Mirae GT`다. 원본 차명·제조사명은 source/attribution 기록에만 남기고, 플레이어에게 보이는 catalog·garage·sprite 설명에는 노출하지 않는다.
- 차체 silhouette, roofline, wheelbase, rear overhang은 유지한다. 차고·바디킷·휠 위치처럼 contact baseline을 바꾸는 수정은 하지 않는다.
- Genesis badge와 실차 번호판 텍스처는 제거하거나 generic 처리한다. 차종의 읽힘은 logo가 아니라 비례·유리선·rear lamp·배기구에서 만든다.
- 차체는 neutral `role-body`로만 렌더한다. selectable body color는 3D GLB가 아니라 승인된 spritesheet의 body-role palette swap으로만 만든다.
- glass는 차가운 tint와 통제된 반사 강도로 정리한다. 모든 palette variant가 같은 glass 역할을 공유한다.
- rear lamp는 유지할 대표 캐릭터 요소다. lamp housing의 위치와 폭은 보존한다. 단일 연속 lamp는 원본 lamp geometry의 layered insert를 제거하고 남은 broad lamp mesh를 재질 role로 재가공한 후보로만 진행하며, 차체 위에 plane/housing을 덧대는 방식은 preview QA에서 rejected다.

### FT86 / Raven Coupe 가상화 방향

- 공개 차량명은 기존처럼 `Raven Coupe`를 사용한다. `FT86`, `GT86`, `toyota_gt86`은 source·render·physics reference를 연결하는 내부 식별자이며, 공개 catalog·garage·sprite 설명에는 사용하지 않는다.
- 현재 최적화된 FT86 GLB는 차체와 투명 파트가 각각 통합 mesh로 병합되어 있다. 따라서 특정 lamp·grille·bumper mesh만 안전하게 분리·재가공하는 작업은 G70 (Nieve)보다 적합하지 않다. 임의 geometry 삭제나 scale 변형으로 해결하려 하지 않는다.
- 기본 경로는 **render 후 sprite-stage 가상화**다. source render의 compact 2-door FR 비례, roofline, wheelbase, contact baseline은 유지하고, 식별성이 높은 전·후면 요소를 pixel/style pass에서 대체한다.

| 우선순위 | sprite 가상화 작업 | 유지/제거 기준 |
| --- | --- | --- |
| 1 | 전·후 lamp를 원본의 분할·곡선 내부선 대신 단순한 단일 lamp mass로 재구성 | lamp의 대략적 위치와 폭은 유지, 원본 lens signature는 제거 |
| 2 | 전면 grille와 lower intake를 넓고 단순한 가상 opening으로 재구성 | bumper 외곽과 차체 접지선은 유지, 원본 grille pattern은 제거 |
| 3 | 번호판, badge, 차명, side marker, 작은 vent를 제거하거나 추상화 | 문구·상표·고유한 소형 trim은 남기지 않음 |
| 4 | 휠을 공통 5-spoke 또는 disc 계열 sprite role로 단순화 | 타이어 위치·wheelbase는 유지, 실차 특유 wheel design은 제거 |
| 5 | glass와 door seam을 적은 명암 단계로 정리 | 2-door cabin 비례는 유지, 세밀한 window/trim signature는 약화 |

- 이 pass의 승인 기준은 128/256px에서 `낮고 짧은 2도어 FR 쿠페`로 읽히되, 특정 실차의 전·후면으로 즉시 읽히지 않는 것이다. 이름 변경이나 pixelation만으로 권리 검토가 완료되는 것은 아니며, source attribution 기록은 별도로 유지한다.
- 위 가상화 pass로도 결과가 충분히 분리되지 않으면, 실차 GLB를 더 변형하지 않는다. 저장소의 `raven-coupe-procedural`을 다음 후보로 삼아 같은 pose·palette·atlas 계약에 맞춰 발전시킨다. 이 절차형 모델은 실차 POC를 pose·scale·readability 참고로만 쓰고 trade dress를 복제하지 않는 경로다.

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

1. FT86, Stinger, G70 (Nieve)의 source model·license metadata와 preview를 같은 rig로 보관한다. G70 (Nieve)는 원본과 대칭 배기구 파생본의 provenance를 함께 보관한다.
2. 위 비교 표의 scale/camera/silhouette/material/sprite contract를 승인하고 공통 art direction을 문서화한다.
3. 현재 FT86 5way의 pose sheet/atlas/runtime screenshot을 baseline으로 보관한다.
4. 차종별 body/glass/wheel/lamp/chrome/shadow role manifest와 neutral master palette를 승인한다.
5. `steer-right-0`(10–12°)만 추가한 4-source/7-runtime pose manifest 후보를 만든다.
6. 동일 Three.js rig로 256px neutral master sheet를 렌더하고, 현재 pixel·style-filter·alpha restore pipeline을 통과시킨다.
7. body-role mask로 `blue`, `red`, `silver`, `black` 후보를 파생하고, lamp·glass·chrome·shadow가 바뀌지 않는지 검사한다.
8. contact baseline, left/right flip, `center ↔ steer-0 ↔ steer-1` 차이를 QA한다.
9. atlas type·frame selection threshold·headlight/shadow profile을 함께 확장한다.
10. runtime screenshot과 handling regression을 통과한 neutral master 및 palette variant만 `approved`로 승격하고, 그 뒤에 catalog·vehicle physics 차이를 정의한다.

### 보류 사유 — 2026-07-28

Three.js raw render만으로 만든 intermediate pose는 현재 FT86 256px style-filter 승인본과 시각적으로 튀었다. 따라서 해당 runtime atlas·sprite·frame selection 변경은 모두 되돌렸다. ComfyUI style-filter 환경이 복구되기 전에는 7way source frame을 runtime에 부분 합성하지 않는다.

이 pass는 차량 art/presentation 작업이 열릴 때만 시작한다. 핸들링 기준선은 이를 위해 재조정하지 않는다.
