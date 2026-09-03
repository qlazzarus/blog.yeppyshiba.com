# Apex Seoul 리소스 관리 원칙

갱신일: 2026-07-15

이 문서는 Apex Seoul의 차량·환경·UI·효과 리소스를 확보하고, 생성하고, 보관하고, 런타임에 승인하는 **단일 기준 문서**다. 실험 결과, 수치 baseline, 실패 원인은 이 문서에 누적하지 않는다. 그것들은 각 검증 기록에 남긴다.

## 목표와 역할 분리

최종 화면은 **black/blue dreamlike Seoul downhill**이다. 리소스는 화면에서 맡은 거리와 역할에 따라 나눈다.

| 거리/역할 | 런타임 책임 | 리소스 원칙 |
| --- | --- | --- |
| sky / far haze | 화면의 안정적인 색·공기감 | Graphics 또는 단순 gradient. 도로 pitch와 분리한다. |
| city light | 조망 구간의 먼 도시 밀도 | 도시 사진 한 장을 배경으로 쓰지 않는다. 낮은 실루엣·희소 점광의 별도 레이어로 둔다. |
| near ridge | 도시 하단·가장자리 차폐 | 능선/수목 silhouette 모듈. city light보다 조금 빠른 parallax만 허용한다. |
| roadside | 속도·위험도·장소성 | 도로 투영을 따르는 guardrail, reflector, chevron, retaining wall, wall-tree. |
| vehicle | 조작 기준점 | base sprite에는 bloom·smoke·접지광을 굽지 않고, runtime 효과로 분리한다. |
| HUD / feedback | 상태 전달 | 차량·도로보다 밝은 주목점을 만들지 않는다. |

속도감은 먼 도시를 빠르게 움직여 만들지 않는다. 가까운 roadside의 통과 리듬과 열린 조망의 대비로 만든다.

## 디렉터리와 상태

```text
games/apex-seoul/assets/
├── environment/
│   ├── source/       # 원본 다운로드, 라이선스·출처 메모
│   ├── generated/    # 생성 후보와 중간 산출물 (향후 추가)
│   └── approved/     # 런타임 교체가 승인된 환경 리소스 (향후 추가)
├── vehicles/
│   ├── source/       # 원본 모델과 attribution metadata
│   ├── optimized/    # 렌더 입력용 최적화 모델
│   ├── rendered/     # deterministic pose render
│   ├── generated/    # pixel/AI 후보와 QA 산출물
│   └── approved/     # 승인 sprite·atlas
└── telemetry/
    └── generated/    # 주행/시뮬레이션 검증 기록
```

- `source`는 수정하지 않는다. 다운로드 URL, 작성자, 라이선스, 취득일을 같은 디렉터리의 `README.md` 또는 manifest에 기록한다.
- `generated`는 후보이며 런타임 import 대상이 아니다.
- `approved`만 런타임 asset으로 승격할 수 있다. 기존 차량 POC처럼 예외가 필요하면 manifest에 이유와 교체 계획을 남긴다.
- 생성용 원본과 런타임용 파생물은 같은 파일을 공유하지 않는다.

## 라이선스와 출처

1. 라이선스가 확인되지 않은 다운로드·이미지·모델은 `source`에도 넣지 않는다.
2. CC0는 출처 메모를 남긴 뒤 사용할 수 있다. CC-BY 계열은 배포물에 필요한 attribution 형식을 먼저 확정한다.
3. 실차명·배지·로고가 포함된 차량 모델은 POC 소스로만 취급한다. 최종 공개 차량에는 fictional naming/branding 검토가 필요하다.
4. 생성 모델의 checkpoint, LoRA, ControlNet, 입력 레퍼런스도 배포 조건을 확인한다.

## 생성 도구의 역할

### Deterministic render / code-native art

- 차량 pose, road projection, HUD, 가드레일 형상, reflector 배치, city-view의 거리 관계는 코드 또는 deterministic renderer가 책임진다.
- Graphics mockup은 최종 아트 전 단계의 기준이다. 먼저 화면 비율, 차폐 순서, parallax 속도, loop 경계를 여기서 확정한다.

### Stable Diffusion / ComfyUI

Stable Diffusion은 **화면 전체 배경 생성기**가 아니라, 승인된 화면 역할을 채울 모듈형 bitmap 후보 생성기로 사용한다.

우선 생성 대상:

1. 오른쪽 retaining wall 타일 2종
2. wall-tree silhouette 3~5종
3. 왼쪽 near-ridge silhouette 2종
4. city-light band의 낮은 건물/점광 strip 후보

생성하지 않는 대상:

- sky, road, city, ridge가 합쳐진 완성 배경 한 장
- 가드레일·chevron처럼 게임플레이 읽기와 정확한 반복 간격이 필요한 오브젝트
- bake된 vehicle glow, smoke, shadow

입력은 Graphics mockup의 mask, silhouette, 배치 guide를 사용한다. 필요할 때 Canny/lineart/depth control로 외곽과 높이 관계를 묶는다. checkpoint와 LoRA는 같은 architecture family를 사용하며, 호환되지 않는 조합을 parameter sweep으로 보정하려 하지 않는다.

## 환경 리소스 파이프라인

```text
Graphics mockup
→ 모듈별 mask / control guide
→ Stable Diffusion 후보 contact sheet
→ alpha / chroma-key 정리
→ black/blue palette lock 및 tile/seam 정리
→ generated에 보관
→ runtime screenshot QA
→ approved 승격
```

- 투명 배경이 필요한 ridge/tree는 flat chroma-key 배경으로 생성한 뒤 alpha를 별도로 검증한다.
- 벽·horizon strip은 최소 2개 variation을 만들고, 좌우 반전만으로 variation 수를 부풀리지 않는다.
- palette lock 뒤의 색 기준은 아래를 우선한다.

```text
night base: #050812, #07101f
haze:       #14395f, #245f9d
roadside:   #0c121b, #101722
signal:     #67b7ff, #b8dcff
accent:     red/yellow only for brake and hazard meaning
```

## 차량 리소스 파이프라인

```text
source model
→ optimized / frozen GLB
→ deterministic 17-pose beauty sheet
→ role masks
→ neutral/detail pixel master
→ body palette variants
→ separate shadow + headlight metadata
→ runtime vehicle catalog
→ browser/runtime QA
→ approved atlas
```

ComfyUI는 탐색용 style filter로만 남기며, 현재 playable 7way trio의 승인 경로에는 넣지 않는다. 실루엣, pose grid, material 역할, palette와 alpha는 deterministic render와 script가 보장한다.

### 7way steering pose 확장

차량 steering pose를 늘릴 때는 source model을 새로 생성하지 않는다. 동일한 Three.js offline render rig에서 `center`, slight steer, mild steer, strong steer의 source pose를 고정 camera/light 조건으로 렌더하고, 좌측은 `flipX`로 파생한다. 5way→7way의 naming, source angle, atlas·headlight·shadow QA 조건은 [차량 7way pose·Three.js sprite 생성 계획](apex-seoul-vehicle-pose-density-plan.md)이 소유한다.

새 playable 차량을 늘릴 때는 sprite 후처리부터 시작하지 않는다. 먼저 모든 후보 3D 모델을 같은 preview rig와 실차 length 정규화로 비교해 silhouette, wheelbase, glass/lamp 분리, contact baseline을 승인한다. 이 비교가 끝난 뒤에만 차량별 pose sheet·pixel pass·atlas을 만든다.

차량의 selectable color는 3D 모델을 색마다 다시 렌더하는 방식보다 body/glass/wheel/lamp/chrome/shadow 역할 mask 기반 palette variant로 만든다. body 이외 역할의 전체 RGB 치환은 금지하며, neutral master와 모든 variant는 같은 alpha·contact baseline·frame metadata를 공유한다.

### Runtime vehicle·course catalog와 선택 상태

public runtime은 authoring 경로나 source model 이름을 노출하지 않는다. 시작 화면은 아래의 선택 id만 만들고, catalog가 실제 asset과 gameplay profile을 해석한다.

```text
vehicleId + colorId + courseId
→ vehicle catalog(atlas, body sheet, shadow sheet, headlight, engine)
→ course catalog(track, environment, checkpoints)
→ Phaser run
```

- public vehicle id는 `raven-coupe`, `seorin-gt`, `mirae-gt`만 사용한다. `FT86`, `Stinger`, `G70 (Nieve)`는 provenance/authoring 기록에만 둔다.
- 첫 selectable palette contract는 모든 차량 공통 `blue / red / silver / black`이다. color는 body sheet만 바꾸며 atlas, shadow, headlight, engine profile은 공유한다.
- 현재 192px 7way sheet와 네 palette는 세 차량 모두 생성·asset QA를 통과했다. Raven Coupe는 기본 runtime sprite로 연결됐고, Seorin GT/Mirae GT는 headlight profile 승인을 기다리는 hidden preview다. 즉 파일 생성 완료는 selectable catalog 등록 완료와 다르며, public selection에는 vehicle-local headlight·shadow·atlas·engine profile·fallback이 모두 승인돼야 한다.
- 현재 course catalog에는 `bugak-ridge-downhill` 하나만 등록한다. UI에는 선택 완료 카드로 보이되, state와 URL에는 항상 course id를 기록해 후속 코스가 추가돼도 save/QA 계약을 바꾸지 않는다.
- 선택은 `?vehicle=…&vehicleColor=…&course=…`로 직렬화해 reload와 browser QA가 같은 run을 재현하게 한다. 알 수 없는 id는 public 기본 조합으로 fallback한다.
- baked-in body shadow는 금지한다. color와 무관한 차량별 external shadow sheet/profile을 one-per-vehicle로 관리하며 Phaser의 silhouette, soft, contact layer가 이를 사용한다. `derive-vehicle-7way-shadow.mjs`는 neutral detail alpha와 pose anchor/baseline에서 `shadow-128.png`, `shadow-128.profile.json`, runtime-style debug preview, QA JSON을 함께 생성한다. 이 preview는 squash·soft layer·contact patch를 확인하는 asset-level gate이며, 최종 승인은 browser runtime screenshot으로 한다.

### Runtime loading manifest와 scene cache

runtime asset은 source directory scan이나 Scene 내부의 흩어진 `load.*` 호출로 찾지 않는다. typed manifest가 public runtime key, loader type, URL, spritesheet frame size, public loading label을 소유한다.

```text
startup manifest
  → LoadingScene (actual Loader progress)
  → MainScene / VehicleSelectScene / GameScene / ResultScene
  → shared Phaser cache key reuse
```

- `startup`에는 현재 출시 범위의 UI, environment/effect, `bugak-ridge-downhill`, 세 차량의 네 color sheet, external shadow/atlas, runtime audio만 넣는다. 선택 UI는 같은 192px body/shadow cache를 사용한다.
- source GLB, frozen beauty sheet, role mask, QA contact sheet, authoring/debug preview는 manifest에 넣지 않는다. Vite import가 존재해도 runtime loader에 등록하지 않으면 browser가 gameplay asset으로 받지 않는다.
- Loading bar는 byte/file 추측값이 아니라 Phaser Loader `progress`로 그린다. public label은 `Raven Coupe · Blue`처럼 loading UI에만 쓰며 provenance path·source model name을 노출하지 않는다.
- Scene stop은 Phaser TextureManager의 asset을 자동으로 비우지 않는다. startup asset은 session 동안 cache에 유지하고, optional manifest를 도입했을 때만 owner/ref-count 정책과 명시적 texture removal을 추가한다. 선택 화면을 닫을 때 shared vehicle texture를 제거하지 않는다.
- `RunSetup`은 vehicle/color/course 선택을 고정해 GameScene으로 전달한다. `RunResult`는 run time, split, selected ids, record update를 ResultScene으로 전달한다. cosmetic color는 telemetry에는 기록하지만 best record key는 vehicle performance와 course를 기준으로 정한다.

Three.js는 GLB scene transform·camera·light·material·procedural mesh를 결정적으로 수정/렌더하는 authoring 도구다. source mesh의 topology/UV/sculpt 같은 DCC 작업을 대체한다고 취급하지 않는다.

## 승인 체크리스트

리소스를 `approved` 또는 런타임 import로 올리기 전에 모두 확인한다.

- 출처·라이선스·모델 조건이 기록되어 있다.
- 원본과 파생물이 분리되어 있다.
- 차량 palette variant는 body-role mask를 사용하며 lamp·glass·chrome·shadow 역할을 보존한다.
- 역할에 맞는 alpha, 크기, anchor, tile/seam 조건을 만족한다.
- black/blue palette와 제한된 signal accent를 지킨다.
- 차량보다 도로/표지/도시가 과도하게 밝지 않다.
- skyline은 도로 pitch와 독립적이며, city-view 구간 밖에는 남지 않는다.
- desktop·mobile screenshot matrix와 해당 telemetry/QA를 통과한다.
- 승인 파일명, manifest, runtime import가 함께 갱신되었다.

## 문서 역할

- 이 문서: 리소스 정책, 파이프라인, 저장 위치, 승인 기준
- [내부 문서 안내](apex-seoul/README.md): 현재 Apex Seoul 문서의 진입점
- [Visual Direction](apex-seoul-visual-direction.md): palette와 화면 무드의 짧은 참조
- [다음 구현 우선순위](apex-seoul-next-priority-plan.md): 구현 순서와 현재 백로그
- [Retro Asset Studio 운영 가이드](retro-asset-studio/README.md): ComfyUI/차량 생성·후처리 절차
- `assets/**/source/**/README.md`, manifest: 개별 원본의 출처·라이선스 기록

새 실험의 일회성 수치와 실패 사례를 이 문서에 누적하지 않는다. 반복 가능한 절차는 운영 가이드에, 승인 결과는 asset manifest와 QA 산출물에 남긴다.
