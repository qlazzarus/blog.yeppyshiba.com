# Apex Seoul 차량 조향 pose 밀도와 Three.js sprite 생성 계획

갱신일: 2026-09-02

상태: Raven Coupe / Seorin GT / Mirae GT의 17-pose 7way 192px body와 `blue / red / silver / black` palette QA를 마쳤다. Raven Coupe는 기본 진입 차량으로 승격했고, Seorin GT/Mirae GT는 192px hidden runtime debug preview까지 연결했다. 남은 범위는 신규 3D/2D authoring이 아니라 vehicle-local headlight 승인, 세 차량·색상 runtime catalog 승격, pre-run garage 선택과 course/start 흐름이다.

## 3D freeze와 2D 보정 전환 — 2026-08-26

Raven Coupe(내부 source `FT86`) / Seorin GT(내부 source `Stinger`) / Mirae GT(내부 source `G70 (Nieve)`)의 3D 단계는 sprite authoring용 **art-master freeze** 상태로 둔다. 이후 3D GLB에는 아래의 예외만 허용한다.

- GLB가 로드되지 않거나 `flipX` 대칭이 깨지는 오류의 수정
- 로고·번호판·문구처럼 공개에 남기면 안 되는 provenance 요소의 제거
- sprite render에서 구멍, z-fighting, 명백한 접지 오류를 만드는 geometry 결함의 수정

그 외 실차 식별성을 낮추는 작업과 palette variant는 2D 단계에서 해결한다. 차체 비례, roofline, wheelbase, 타이어 접지선, 휠 위치는 다시 변경하지 않는다.

Stinger art master에는 badge·번호판·rear lettering·rear lip spoiler를 제거했고, 후면 중앙 연결선과 rear-quarter의 빨간 panel line을 차체색으로 단순화했다. 흰 외장과 노란 roll cage는 2D master에서도 유지할 역할 기준이다. 이 변경은 `kia_stinger-sprite-master.glb`에 고정하며, 새 3D stylization pass를 열지 않는다.

### 기존 spritesheet 점검 기준선

| 내부 source | 현재 128px candidate | 점검 결과 | 2D 다음 작업 |
| --- | --- | --- | --- |
| Raven Coupe / 내부 source `FT86` | `toyota-gt86-128/sheet-128.png` | 3×6, 16 pose. normal driving은 `center / steer-right-1 / steer-right-2`의 기존 5way 계약이며 QA score 100. | lamp·grille·wheel·trim을 공통 sprite language로 재구성하고 body-role mask를 확정한다. |
| Stinger / 공개 `Seorin GT` | `kia-stinger-128/sheet-128.png` | 3×6, 16 pose. QA score 90. 현재 고정한 Stinger art master의 badge/plate/spoiler/panel-line 수정 전 POC다. | 새 art master로 neutral 7way source를 다시 렌더한 뒤, 2D에서 rear lamp 내부선·grille·trim을 단순화한다. |
| G70 (Nieve) / 공개 `Mirae GT` | `genesis-g70-128/sheet-128.png` | 3×6, 16 pose. QA score 90. 이는 기존 G70 POC이며 Mirae GT의 대칭 배기·lamp art master가 반영되지 않았다. | Mirae GT master로 neutral 7way source를 생성하고, 2D에서 lamp mass·glass·body role을 공통화한다. |

세 sheet 모두 center와 mild steer 사이의 `steer-right-0` / flip된 `steer-left-0`가 없다. 따라서 다음 sprite pass의 첫 산출물은 runtime atlas가 아니라, 동일 rig에서 만든 Phaser 구조의 17-pose beauty sheet와 각 frame의 body/glass/lamp/wheel/shadow role mask다.

### 2D 보정 우선순위

1. 각 neutral 7way source에서 차체 역할 mask를 확정한다. palette swap은 이 mask만 바꾸며 glass, lamp, tire, chrome, shadow는 바꾸지 않는다.
2. 공통 2D 언어로 lamp 내부선, grille 격자, badge/lettering, side marker, 작은 vent, 휠 spoke를 축약한다.
3. 128px에서 baseline·wheel contact·좌우 flip을 QA하고, 256px은 detail reference로만 사용한다.
4. `blue / red / silver / black` variant를 body palette swap으로 파생한 뒤, 공개 atlas에는 fictionalized vehicle name만 남긴다.

이 순서가 끝나기 전에는 7way frame selection이나 Phaser runtime atlas를 교체하지 않는다.

### 7way candidate 단일 입력·2D script 계약 — 2026-08-27

`assets/vehicles/generated/7way-sources/`의 4-pose 프리뷰와 `render:real-vehicle-7way-sources` 명령은 제거한다. 별도 preview source를 두면 2D 작업 대상과 Phaser atlas 구조가 다시 달라지기 때문이다.

이후 차량별 단일 beauty 입력은 아래 경로로 고정한다.

```text
assets/vehicles/generated/7way-candidates/{raven-coupe|seorin-gt|mirae-gt}/
  source-17pose-512.png      # 3 columns × 6 rows, source pose 17개와 마지막 blank cell
  source-17pose-512.json     # pose, baseline, anchor, camera metadata
```

`steer-right-0`는 rear angle `10–12°`의 새 source frame이다. normal driving의 좌측 세 상태는 별도의 이미지를 만들지 않고 해당 right source를 `flipX`한다. spin/crash/uphill/downhill pose는 기존 3×6 배치와 index를 유지한다. 즉, 7way는 steering state만 5→7로 늘리고 sheet의 Phaser frame 계약은 유지한다.

`phaser-128/`은 현재 beauty를 기계적으로 128px로 축소한 **검수용 export**다. 본격 2D 보정은 이 파일을 재가공하지 않고 늘 `source-17pose-512.png`와 metadata에서 시작한다. 승인된 2D 결과만 새 `processed/` 경로와 atlas로 작성하며, 현재 5way runtime asset은 그 전까지 교체하지 않는다.

#### 0번 render 기준선 — 2026-08-27 완료

Raven Coupe, Seorin GT, Mirae GT 모두 `source-17pose-512.png/json`의 17 source frame, 3×6 grid, 한 개의 마지막 blank cell, 7개 steering state export를 확인했다. 128px 검수 QA도 세 차량 모두 required frame 누락 없이 통과했다. Seorin GT는 재질을 강제로 `DoubleSide`로 만들지 않는다. 이 옵션은 겹친 차체 surface의 depth 경쟁을 만들어 흑백 얼룩처럼 보이는 z-fighting을 만들기 때문이다.

이 기준선의 source PNG는 **beauty reference**이며, 아직 runtime asset이나 최종 retro sprite가 아니다. 다음 작업은 이 세 source에 공통 role-mask를 만드는 1번이다.

#### 1번 role-mask 기준선 — 2026-08-27 완료

`extract-vehicle-role-masks.mjs`가 3종의 `source-17pose-512.png/json`에서 `body / glass / lamp / wheel / chrome / accent / shadow` mask와 `roles-debug.png`, `roles.qa.json`을 생성한다. 각 opaque source pixel은 body fallback을 포함해 정확히 한 역할에만 들어가므로 mask 합계와 beauty silhouette이 일치한다. source beauty에 ground shadow는 없으므로 `shadow.png`는 비어 있으며 2번 stylize pass가 wheel-contact metadata로 새로 만든다.

Seorin GT의 roll cage는 `accent`로 분리해 palette swap에서 보존한다. `glass`는 512px cell 전체가 아니라 pose의 실제 opaque vehicle bounds 상단 42%에서만 분류한다. 따라서 차가 cell 상단에 배치된 frame에서도 휠·그릴·하부나 Mirae GT의 측면 도어 트림이 glass로 오인되어 body가 깨지는 문제가 없다. `wheel`은 하부의 검은 범퍼·디퓨저를 절대 포함하지 않도록 pose 안쪽의 원형 dark component만 보수적으로 채택한다. 타원을 탐색 보조로만 쓰고 실제 wheel mask에는 원본의 어두운 tyre/rim pixel만 넣으므로, Mirae GT처럼 밝은 fender가 휠 주변까지 함께 빠지는 현상을 막는다. rollover/overturned 물리 pose는 차체 하부와 타이어가 합쳐져 오인되므로 현 단계에서는 비워 둔다. 자동 chrome 판정은 차체색을 잘못 보호할 위험이 커서 현재는 빈 후보로 유지한다. chrome의 pixel-art 표현은 3번 detail recipe에서 필요한 위치에만 더한다. `roles-debug.png`는 승인용 시각 검수 파일이며, mask가 부족한 차종별 영역은 후속 recipe 규칙으로 보강한다.

#### 1a번 wheel geometry 내부 검증 — 2026-08-27 완료

색·명암만으로 tyre를 판별하면 rear wheel이 body에 흡수되는 pose가 있어, 원본 GLB에서 wheel geometry만 뽑는 내부 검증을 추가했다. `create-vehicle-wheel-role-models.mjs`는 art master를 수정하지 않고 다음 파생 GLB와 QA를 만든다.

```text
assets/vehicles/derived/wheel-role-{raven-coupe|seorin-gt|mirae-gt}.glb
assets/vehicles/generated/7way-candidates/{vehicle}/wheel-role-model.qa.json
```

- Raven Coupe: 네 tyre component, 8,623 triangles
- Seorin GT: tyre sidewall/tread component, 1,700 triangles
- Mirae GT: tyre·rim·brake component, 52개 / 98,105 triangles

동일한 3개 key pose에서 camera reference model을 숨긴 뒤 흰 실루엣으로 확인했다. 세 차종 모두 tyre 위치가 유지되며 차체 panel은 포함되지 않는다. Mirae GT는 rim/brake의 작은 부속 pixel이 함께 들어가지만, body를 삭제하거나 alpha를 빼는 pass가 아니므로 타이어가 사라지는 위험은 없다.

이 결과는 **wheel 보호/QA reference**이며, `render-vehicle-wheel-role-sheets.mjs`는 wheel-only GLB와 별도의 non-wheel depth occluder를 같은 camera/scale로 두 번 렌더해 `masks/wheel-geometry.png`를 만든다. 따라서 반대편 휠이 차체 위로 투영되어 `body`를 wheel로 오인하는 것을 막는다. role extractor는 이 가시 geometry alpha를 현행 screen-space `wheel.png`와 union한다. geometry에 잡히지 않은 tyre silhouette은 보수적인 screen-space 후보 또는 body fallback으로 남기며, beauty source의 alpha는 어떤 경우에도 삭제하지 않는다. rollover/overturned pose도 그대로 body fallback으로 둔다. 즉 최종 pose에 tyre 형상이 일부 남는 것은 허용하지만, mask 때문에 투명한 구멍이 생기는 것은 허용하지 않는다.

#### 예정 script 목록과 책임

| 순서 | script | 입력 → 출력 | 처리 내용 |
| --- | --- | --- | --- |
| 0 | `render-real-vehicle-phaser-7way.mjs` (존재) | frozen GLB → `source-17pose-512.png/json` | 3×6/17 pose, 공통 camera·light·baseline metadata를 결정적으로 렌더한다. 재질 깨짐·z-fighting이 있으면 이 단계에서 멈추며 2D pass로 숨기지 않는다. |
| 1 | `extract-vehicle-role-masks.mjs` (완료) | beauty + metadata → `masks/body.png`, `glass.png`, `lamp.png`, `wheel.png`, `chrome.png`, `accent.png`, `shadow.png` | source alpha·색·pose-local geometry guard로 screen-space role 후보를 만든다. mask는 서로 겹치지 않으며 합계가 opaque silhouette을 덮는지 검사한다. |
| 1a | `create-vehicle-wheel-role-models.mjs` (완료, internal QA) | frozen GLB → wheel-only derived GLB + QA JSON | GLB geometry component 기준으로 tyre/rim/brake 후보를 분리한다. `render-vehicle-pose-sheet.mjs --camera-reference-model-path --silhouette`로 beauty와 같은 camera key pose에서 tyre 보호 범위를 검증한다. final mask의 alpha 삭제 입력으로 사용하지 않는다. |
| 1b | `render-vehicle-wheel-role-sheets.mjs` (완료) | wheel-only GLB + non-wheel occluder → `masks/wheel-geometry.png/json` | 17 pose·beauty와 같은 camera/scale의 explicit depth prepass로 **가시 휠만** alpha 렌더한다. `extract-vehicle-role-masks.mjs`가 이 alpha를 opaque beauty pixel에만 union하여 `body.png`를 갱신한다. |
| 2 | `stylize-vehicle-7way-sheet.mjs` (완료) | beauty + role masks + recipe → `processed/neutral-128/sheet-128.png` | cell별 512→128 downsample, alpha hardening, role별 3~5단 명암 quantization, 검은 외곽선, lamp mass, glass tint를 적용한다. grid·bbox·anchor는 metadata에서 복사하고 다시 계산하지 않는다. 그림자는 bake하지 않는다. |
| 3 | `simplify-vehicle-details.mjs` (완료) | neutral sheet + role masks → `sheet-128-details.png` | role 내부의 고주파 texture를 mode smoothing하고, lamp 내부선의 2px 이하 gap만 하나의 mass로 합친다. grid·alpha·차체 silhouette·roofline·wheelbase·휠 위치는 수정 금지다. |
| 4 | `swap-vehicle-body-palette.mjs` (완료) | detail sheet + `body` mask + palette recipe → `processed/{blue,red,silver,black}-128/sheet-128.png` | 차체의 shade index만 variant ramp로 치환한다. glass/lamp/wheel/chrome/shadow/outline의 RGBA는 byte 단위로 유지한다. 전체 RGB 치환은 금지한다. |
| 5 | `qa-vehicle-7way-atlas.mjs` (완료) | detail/variant sheets + metadata → QA JSON/contact sheet | 17 frame index, blank cell, candidate atlas의 anchor/baseline, left flip map, variant alpha를 검사하고 4색 contact sheet를 만든다. |
| 6 | `write-vehicle-7way-atlas.mjs` (완료) | QA 통과 processed sheet + QA → Phaser candidate atlas JSON | `steer-left-{0,1,2}`가 대응하는 right source를 `flipX`하는 7 state map을 기록한다. 모든 output은 candidateOnly이며 approved/runtime 경로에 쓰지 않는다. |

기존 `pixel-pass-vehicle-sheet.mjs`는 resize·alpha hardening·quantization·outline·wheel restore의 참고 구현으로 유지한다. 기존 `postprocess-ft86-retro-sheet.mjs`의 palette-role audit과 variant ramp도 재사용하되, 특정 FT86 색값에 의존하는 부분은 위의 공통 `body` mask 기반 script로 일반화한 뒤에만 3종에 적용한다.

#### 2번 neutral retro sheet — 2026-08-31 완료

`npm run stylize:vehicle-7way --workspace @games/apex-seoul`는 Raven Coupe, Seorin GT, Mirae GT의 512px beauty와 1번 role mask만 읽어 아래의 별도 중간 산출물을 만든다. `--vehicle {raven-coupe|seorin-gt|mirae-gt}`로 한 차종만 다시 생성할 수도 있다.

```text
assets/vehicles/generated/7way-candidates/{vehicle}/processed/neutral-128/
  sheet-128.png                  # 투명 RGBA의 3×6 neutral master
  sheet-128.json                 # 원래 pose/cell/anchor 계약을 128px 기준으로 복사
  sheet-128.qa.json              # pose별 role pixel·접지 shadow·blank-cell 검사 결과
  sheet-128-checker-preview.png  # 투명 영역을 확인하기 위한 검수용 파일
```

- 마지막 18번째 cell은 명시적으로 투명인지 QA하며, 기존 5way runtime atlas와 approved asset에는 쓰지 않는다.
- body / glass / lamp / wheel / accent는 고정된 role palette에서만 명암을 선택한다. 자동 `chrome` 후보는 false positive가 더 위험하므로 비워 두며, 필요할 때만 detail recipe에서 명시적으로 추가한다. 이 결과는 원본 텍스처의 RGB를 직접 보정하거나 전체 색상을 치환하지 않는다.
- 1px outline은 cell 경계를 넘지 않는다. **접지 shadow는 sheet에 bake하지 않는다.** Phaser는 같은 frame의 별도 shadow spritesheet를 silhouette/soft 두 layer로 렌더하고, drift·경사·속도에 맞춰 회전·크기를 동적으로 조정한다. 따라서 neutral/variant sheet는 이 기존 shadow pipeline을 그대로 재사용한다.
- 이 산출물은 다음 3번 detail simplification과 4번 body palette swap의 단일 입력이다.

#### 3번 detail simplification — 2026-08-31 완료

`npm run simplify:vehicle-details --workspace @games/apex-seoul`는 2번 neutral master를 변경하지 않고, 다음의 병렬 산출물을 만든다. `--vehicle {raven-coupe|seorin-gt|mirae-gt}`로 한 차종만 재생성할 수 있다.

```text
assets/vehicles/generated/7way-candidates/{vehicle}/processed/neutral-128/
  sheet-128-details.png          # 4번 palette swap의 입력 후보
  sheet-128-details.json         # source pose/cell/anchor를 그대로 계승
  sheet-128-details.qa.json      # alpha·blank cell 불변, pose별 smoothing 수 검사
```

- `body / glass / wheel / accent / chrome`은 같은 role의 3×3 내부에서만 가장 빈번한 색으로 정리한다. role 경계와 outline은 건드리지 않는다.
- lamp는 같은 row에서 2px 이하로 끊긴 body gap만 중간 lamp tone으로 메운다. 좌우 housing 사이처럼 넓은 간격이나 lamp의 폭·위치는 합치지 않는다.
- source와 output의 alpha byte는 완전히 같고 마지막 blank cell도 투명인지 검사한다. baked-in shadow는 생성하지 않는다.
- 결과적으로 grille lattice, wheel spoke, 작은 lens/trim noise가 저주파 pixel mass로 정리되지만, badge·lettering처럼 3D source에 남아 있는 provenance 요소를 이 pass가 임의로 감추지는 않는다. 그런 요소는 3D freeze 예외 수정 또는 명시 recipe 대상으로만 처리한다.

#### 4번 body palette variant — 2026-08-31 완료

`npm run swap:vehicle-body-palette --workspace @games/apex-seoul`는 3번의 `sheet-128-details.png`에서 body role의 neutral shade index만 치환해, 세 차량 각각의 `blue`, `red`, `silver`, `black` variant를 만든다. `--vehicle`과 `--variant`를 함께 사용해 한 차량·한 색상만 재생성할 수 있다.

```text
assets/vehicles/generated/7way-candidates/{vehicle}/processed/{blue,red,silver,black}-128/
  sheet-128.png
  sheet-128.json
  sheet-128.qa.json
```

- 입력의 `body.png`와 512→128 Lanczos 축소에서 생긴 1px body fringe(정확한 neutral body ramp 색)만 body ramp로 변경한다. 3번이 lamp mass로 바꾼 red pixel은 detail 보호 규칙으로 lamp로 남긴다. 자동 chrome 후보는 비워 둬 painted side skirt 같은 밝은 차체 trim이 흰 선으로 보호되지 않게 한다.
- glass, lamp, wheel, accent, chrome, outline, transparent pixel의 RGBA와 모든 alpha byte는 비교 QA에서 0 변경이어야 한다. 마지막 blank cell 역시 투명이어야 한다.
- variant는 authoring 중간 산출물이다. 현재 Phaser 5way runtime atlas·shadow asset·catalog는 교체하지 않는다.

#### 5번 7way atlas QA — 2026-08-31 완료

`npm run qa:vehicle-7way-atlas --workspace @games/apex-seoul`는 3번 detail master, 네 body palette variant, 기존 candidate `phaser-128.atlas.json`을 읽고 아래의 승인용 QA를 만든다. `--vehicle`로 한 차종만 검사할 수 있다.

```text
assets/vehicles/generated/7way-candidates/{vehicle}/processed/qa/
  7way-atlas.qa.json
  palette-contact-sheet.png       # blue, red, silver, black 순서의 2×2 검수 sheet
```

- 3×6 / 17 pose / 마지막 blank cell, 각 variant의 alpha 동일성·blank cell 투명성을 검사한다.
- candidate atlas의 pose cell·anchor·baseline을 source metadata와 대조한다. normal steering의 baseline spread는 1px 이하여야 한다.
- `steer-left-{0,1,2}` → 대응 `steer-right-*`의 `flipX`, center/right state의 직접 source 사용을 검사한다.
- 세 차량 모두 통과했다. Raven Coupe와 Seorin GT의 normal baseline spread는 0px, Mirae GT는 1px이다. 이 QA는 아직 기존 Phaser 5way runtime atlas를 교체하지 않는다.

#### 6번 Phaser candidate atlas 작성 — 2026-09-01 완료

`npm run write:vehicle-7way-atlas --workspace @games/apex-seoul`는 5번 QA가 통과한 경우에만 세 차량의 네 palette variant에 candidate Phaser atlas를 작성한다. `--vehicle`, `--variant`로 대상 하나만 다시 쓸 수 있다.

```text
assets/vehicles/generated/7way-candidates/{vehicle}/processed/{blue,red,silver,black}-128/
  sheet-128.png
  sheet-128.json
  sheet-128.qa.json
  phaser-128.atlas.json
```

- 12개 atlas 모두 `candidateOnly: true`이며 `promotionState`가 runtime 미승인 상태를 명시한다.
- 기존 candidate atlas의 frame rectangle, anchor, baseline, 7way steering map을 그대로 계승한다. left steering은 새 left image를 만들지 않고 대응하는 right frame을 `flipX`한다.
- 각 atlas는 동 폴더의 `sheet-128.png`만 참조하고, sheet에는 baked-in shadow가 없음을 기록한다. Phaser의 기존 separate/dynamic shadow atlas를 사용한다.
- 현재 main game의 5way runtime atlas, texture key, vehicle catalog에는 이 파일을 연결하지 않았다. 다음 작업은 runtime integration 전용 변경과 browser QA다.

#### 7번 runtime integration과 pre-run 선택 계약 — 진행 중

최종 진입 흐름은 차량 sprite를 import한 즉시 주행하는 구조가 아니다. 플레이어는 **차량 선택 → 색상 선택 → 코스 선택 → Start Run → Phaser 주행** 순서로 한 번의 run 구성을 확정한다. 현재 코스는 `bugak-ridge-downhill` 하나뿐이지만, 선택 state에는 처음부터 `courseId`를 둔다. 단일 코스는 선택 불가 UI로 숨기지 않고 `Selected` 상태의 코스 카드로 표시한다.

```text
vehicleId: raven-coupe | seorin-gt | mirae-gt
colorId: blue | red | silver | black
courseId: bugak-ridge-downhill
```

- 선택 화면은 sprite file path, frame index, GLB provenance를 직접 알지 않는다. public vehicle id와 color id만 고르고, runtime catalog가 atlas·body sheet·shadow sheet·headlight profile·engine profile을 해석한다.
- 첫 runtime pass에서는 URL query(`?vehicle=raven-coupe&vehicleColor=blue&course=bugak-ridge-downhill`)로 선택을 직렬화한다. reload, browser screenshot QA, 재현 가능한 bug report가 같은 run 조합을 가리켜야 한다.
- 기본 URL은 Raven Coupe 192px 7way asset을 선택한다. `?vehicle=ft86-retro`는 기존 256px 5way prototype을 명시적으로 선택하는 비교·롤백 route로 유지한다. 선택 전환은 catalog QA와 browser QA를 통과한 경우에만 한다.
- 7way input state는 `center`, `steer-left/right-0`, `steer-left/right-1`, `steer-left/right-2`다. `steer-0`는 0 dead-zone과 기존 mild steer 사이에서만 선택하며 physics/grip/drift state를 바꾸지 않는다.
- 현재 uphill/downhill row에는 `right-0` art가 없다. 첫 적용에서는 terrain 상태의 slight steer를 `uphill/downhill-center`로 fallback한다. 경사에서도 7way pose가 실제로 필요하다고 검증된 경우에만 right-source 두 장을 추가해 17 pose를 19 pose로 확장한다.

차량별 runtime 준비물은 아래와 같다.

| 준비물 | 수량 | 책임 |
| --- | ---: | --- |
| body sheet | 3차종 × 4색 = 12 | 이미 생성한 palette variant. 색상 변경은 body sheet URL만 교체한다. |
| atlas metadata | 차량당 1개 | frame/origin/7way map은 색상과 독립적이다. 색상별로 중복 소유하지 않는다. |
| external shadow sheet·profile | 차량당 1개 | baked-in shadow 없이 Phaser의 silhouette/soft/contact layer를 유지한다. neutral detail alpha와 frame metadata를 입력으로 결정적으로 생성·QA한다. |
| headlight profile | 차량당 1개 | center/right-1/right-2와 terrain fallback을 제공한다. `right-0`은 첫 pass에서 center와 mild profile 사이를 보간하거나 center를 재사용한다. |
| engine profile | 차량당 1개 | vehicle id에서 선택하며, 초기에는 visual integration과 독립적으로 기존 검증값을 유지한다. |

`yellow`는 현행 FT86 전용 legacy variant다. 신규 trio의 최초 public contract는 공통 네 색으로 고정한다. yellow를 다시 공개할 경우에는 한 차량만 추가하지 않고 세 차량 모두에 같은 palette recipe와 alpha QA를 적용해 5색 계약으로 승격한다.

runtime promotion gate는 다음을 모두 만족해야 한다.

1. 세 차량이 각자 7way atlas, headlight profile, separate shadow profile을 가진다.
2. 3차종 × 4색의 body alpha/frame/origin이 동일하고, 선택한 color가 lamp·glass·wheel·accent를 바꾸지 않는다.
3. URL의 알 수 없는 vehicle/color/course는 안전한 기본 `raven-coupe / blue / bugak-ridge-downhill`으로 fallback한다.
4. level, uphill, downhill, drift, flipX, finish coast에서 body·shadow·headlight가 frame index를 공유한다.
5. 후보 query browser screenshot QA와 기존 handling/collision/build 회귀를 통과한 뒤에만 기본 진입 차량을 바꾼다.

##### 7a번 external shadow sheet — 2026-09-02 완료

`npm run derive:vehicle-7way-shadow --workspace @games/apex-seoul`는 기본 trio의 `processed/neutral-128/sheet-128-details.png` alpha를 읽어 아래의 별도 Phaser shadow candidate를 만든다. `--vehicle <public-id>`는 고정 목록이 아니라 해당 후보 디렉터리의 17-pose metadata·atlas를 직접 검증하므로, 같은 계약을 지키는 후속 차량에도 그대로 사용한다.

```text
assets/vehicles/generated/7way-candidates/{vehicle}/phaser-128/
  shadow-128.png
  shadow-128.profile.json
  shadow-128-runtime-preview.png
  shadow-128-runtime-footprint-debug.png
  shadow-128.qa.json
```

- 출력은 3×6 / 17 pose / 마지막 blank cell을 body sheet와 정확히 공유한다. opaque body alpha는 검정 `210` alpha로, transparent pixel은 완전 투명으로 변환한다.
- shadow sheet는 silhouette와 soft layer의 source일 뿐이며, body sheet에는 다시 bake하지 않는다. Phaser의 contact patch와 drift·경사·속도에 따른 transform은 runtime이 계속 소유한다.
- QA는 source/shadow alpha shape, blank cell, pose별 opaque pixel, 단일 shadow alpha를 검사한다. 색상 variant와 무관하므로 차량당 한 장만 생성한다.
- `shadow-128.profile.json`은 각 pose의 alpha bounds와 anchor/baseline에서 chassis contact center·patch 크기·tire contact 후보를 파생한다. `shadow-profile-overrides.json`이 있으면 이를 pose별로 병합하므로, 새 차량은 자동 초안을 baseline으로 두고 browser QA에서 확인된 값만 recipe로 고정한다. Raven Coupe는 같은 source인 기존 FT86 runtime profile을 seed로 재사용하고, `steer-right-0`처럼 새 frame만 자동 초안을 사용한다.
- `shadow-128-runtime-preview.png`는 checker 배경에서 Phaser와 같은 silhouette squash, soft-shadow 확장, chassis center, contact patch를 적용한 3×6 검수용 합성본이다. 배경은 실제 게임보다 밝은 진단용 road tone으로 고정해 검정 multiply shadow가 사라져 보이지 않게 한다. 이는 GPU blur·실제 drift transform을 완전히 대체하지 않으며, 17 pose의 접지 위치를 빠르게 확인하는 asset-level debug다.
- `shadow-128-runtime-footprint-debug.png`는 위 합성에서 body만 제외한 debug sheet다. body와 겹쳐 미세해지는 actual-preview와 함께 열어 shadow의 폭·squash·접지 중심이 실제로 생성됐는지 분리 확인한다.

##### 7b번 Raven Coupe hidden runtime adapter — 2026-09-02 완료

`npm run write:vehicle-7way-runtime-adapter --workspace @games/apex-seoul`는 candidate atlas를 즉시 approved asset으로 승격하지 않고, runtime이 요구하는 `headlightProfiles`와 separate `shadowProfiles`를 결합한 Raven 전용 adapter를 작성한다.

```text
assets/vehicles/generated/7way-candidates/raven-coupe/runtime-128/
  runtime-128.atlas.json
  runtime-128.qa.json
```

- Raven Coupe는 FT86과 같은 frozen source를 쓰므로, 검증된 기존 FT86 headlight profile을 seed로 재사용한다. 새 `steer-right-0` profile은 `center → steer-right-1` 보간값으로 기록하지만 아직 selection에 사용하지 않는다.
- shadow profile은 7a의 128px Raven output을 사용한다. 따라서 body·shadow가 모두 같은 3×6, 17-pose frame index를 공유한다.
- 현행 controller는 안정성 확인을 위해 여전히 `center / left-1 / left-2 / right-1 / right-2` 5개 state만 선택한다. `right-0`는 다음 selector pass에서만 활성화한다.
- `?vehicle=raven-coupe&vehicleColor={blue|red|silver|black}`가 이 adapter, 대응 body variant, shared shadow를 선택한다. 기본 URL과 `?vehicle=ft86-retro`는 기존 256px FT86 asset을 계속 사용한다. 이 hidden query browser QA가 통과하기 전에는 default를 바꾸지 않는다.
- adapter generator는 다른 차량의 profile을 추측해 승격하지 않는다. Seorin GT/Mirae GT는 차량별 headlight override가 준비되기 전에는 명시적으로 실패한다.
- Runtime HUD는 `headlight frame / profile / pose aim / swivel`을 표시하고, `debugGuides=1` query는 lamp segment·frame forward axis·optical swivel·footprint를 road 위에 겹쳐 그린다. `window.__apexSeoulQaState.headlight.frameId/profileId`에도 같은 값을 publish하므로 screenshot/automation QA가 body frame과 headlight profile의 결합을 검사할 수 있다.

##### 7c번 Raven Coupe level 7way selector와 pose QA — 2026-09-02 완료

Raven Coupe runtime adapter는 이제 `center / left-0 / left-1 / left-2 / right-0 / right-1 / right-2`를 모두 전달한다. level 주행에서 `steerWeakThreshold`의 55%부터 새 slight pose(`±0`)를 선택하고, 기존 mild/strong threshold와 drift strong-art 정책은 유지한다. FT86/Genesis처럼 `±0` frame이 없는 legacy atlas는 같은 구간에서 center로 안전 fallback한다.

- `qaPose={steer-left-2|steer-left-1|steer-left-0|center|steer-right-0|steer-right-1|steer-right-2}`는 selector threshold와 관계없이 한 pose를 고정한다. `qaFreeze=1&debugGuides=1`과 함께 body/shadow/headlight profile을 한 화면에서 확인한다.
- `qaSteer`는 실제 selector 경계를 확인한다. 기본 고속 QA(`qaSpeed=440`)에서는 `0.15 → right-0`, `0.5 → right-1`, `1 → right-2`가 된다. 음수는 대응 right source를 flip한다.
- downhill/uphill에는 `±0` art가 없으므로 slight steering은 `${terrain}-center`를 **flip 없이** 사용한다. 이는 17-pose 계약을 유지하는 의도적 fallback이며, 19-pose 확장은 browser QA에서 시각적 필요가 확인될 때만 연다.
- `npm run qa:vehicle-7way-selector --workspace @games/apex-seoul`는 Raven level의 center/slight/mild/strong 및 양쪽 slight, downhill left/right slight fallback을 검사한다.

##### 7d번 Raven Coupe 256px beauty 비교 preview — 2026-09-02 완료

128px retro sheet의 detail 손실을 runtime 크기에서 비교하기 위해 `npm run render:vehicle-7way-runtime-preview --workspace @games/apex-seoul -- --vehicle raven-coupe --cell-size {192|256}`를 추가했다. 이 명령은 frozen 512px beauty source를 Lanczos로 192px 또는 256px 3×6/17-pose sheet로 축소하고, 같은 alpha에서 별도 shadow와 matching atlas를 같이 만든다.

```text
assets/vehicles/generated/7way-candidates/raven-coupe/runtime-preview-{192|256}/
  sheet-{192|256}.png
  shadow-{192|256}.png
  runtime-{192|256}.atlas.json
  runtime-{192|256}.qa.json
```

- `?vehicle=raven-coupe-192-preview`와 `?vehicle=raven-coupe-256-preview`는 각각 한 장의 neutral beauty sheet를 사용한다. palette variant, approved asset, 기본 진입 차량에는 영향을 주지 않는다.
- profile·shadow·7way state는 Raven runtime adapter와 같고 frame px coordinate만 두 배로 스케일한다. QA는 17 pose, 마지막 blank cell, body/shadow alpha shape, 256px frame rectangle을 검사한다.
- 이는 128px retro style을 대체할 최종 output이 아니다. source texture가 충분히 읽히는지와 runtime 예산(현재 body는 192px 약 192KB, 256px 약 311KB)을 판단하는 임시 비교 기준이다.

##### 7e번 세 차량 192px processed runtime debug preview — 2026-09-03 완료

192px는 128px의 wheel·lamp·panel detail 손실과 256px의 과도한 화면 점유 사이의 중간 기준이다. 세 차량 모두 neutral/detail/palette script를 거친 `blue-192` sheet를 runtime preview에 연결했다. 3D beauty source를 그대로 쓰는 비교 route와 달리, 이 route는 실제로 게임 적용 후보가 사용할 deterministic 2D processing 결과를 검토한다.

```text
assets/vehicles/generated/7way-candidates/{raven-coupe|seorin-gt|mirae-gt}/
  processed/{neutral|blue|red|silver|black}-192/
  runtime-192-blue/
    sheet-192.png
    shadow-192.png
    runtime-192.atlas.json
    runtime-192.qa.json
```

- 숨김 debug route는 `?vehicle={raven-coupe|seorin-gt|mirae-gt}-192-preview`다. 현재 각 route는 `blue` processed sheet 하나만 선택한다. 네 palette source는 생성·QA됐지만, 아직 player-facing color selector에는 연결하지 않는다.
- 세 route는 모두 3×6/17-pose body와 matching external shadow를 쓴다. `qaPose`, `qaSteer`, `qaFreeze=1`, `debugGuides=1`으로 center/0/1/2 pose 및 body·shadow·headlight profile을 함께 검수한다.
- Raven Coupe는 FT86과 source가 같으므로 검증된 FT86 headlight profile을 seed로 쓴다. Seorin GT와 Mirae GT의 profile은 **initial debug seed**다. atlas/frame 계약을 먼저 검증하기 위한 값이며, `debugGuides=1`에서 lamp segment가 각 차체 lamp에 맞는지 확인하기 전에는 approved profile이나 기본 차량 선택으로 승격하지 않는다.
- `npm run qa:vehicle-catalog --workspace @games/apex-seoul`, `npm run qa:vehicle-7way-selector --workspace @games/apex-seoul`, production build는 이 세 route의 asset 선택과 7way threshold regression을 함께 검사한다.

##### 7f번 Raven Coupe 기본 sprite 교체 — 2026-09-03 완료

기본 진입 URL은 Raven Coupe의 192px processed 7way asset을 사용하도록 승격했다. `blue / red / silver / black`은 같은 192px atlas와 external shadow를 공유하며, 기존 FT86의 engine·launch-control behavior는 유지한다. 이 교체는 sprite presentation 범위에만 한정한다.

- `?vehicle=ft86-retro`는 기존 256px prototype sheet를 계속 선택한다. 이는 이전 상태의 비교·롤백 route이며, 기본 선택에는 사용하지 않는다.
- Seorin GT와 Mirae GT의 default/catalog 진입은 바꾸지 않는다. 두 차량은 headlight guide tuning과 profile approval 이후에만 같은 승격 절차를 밟는다.
- Raven Coupe는 같은 FT86 source에 맞춘 192px processed center silhouette이 legacy 256px center보다 약 3% 크게 측정됐다. runtime asset의 `presentationScale: 0.97`을 body·separate shadow에 함께 적용해 기존 도로 대비 크기와 맞춘다. 도로 폭·경사·finish coast에 따른 scale 계산과 physics는 변경하지 않는다.

##### 7g번 세 차량 실차 비율·runtime 크기 검수 — 2026-09-03 완료

공통 render rig는 `vehicle-length` mode로 Raven Coupe의 4.240m를 기준 길이로 삼는다. Seorin GT(4.830m)는 1.139×, Mirae GT(4.690m)는 1.106× 길이로 3D source를 정규화한 뒤 같은 camera rig에 렌더한다. 192px body alpha를 검수한 결과, rear width / 24° rear-quarter / side length의 sprite 비율은 각 실차 폭·투영 폭·전장 비율에서 최대 약 1.3% 이내다.

- legacy FT86과 맞추기 위한 `0.97`은 차량별 비율 보정이 아닌 **192px candidate family 공통** presentation scale이다. Raven Coupe default와 Raven/Seorin/Mirae 192px hidden preview에 함께 적용해 도로 대비 기준선은 맞추되 차량 간 실제 비율은 보존한다.
- Seorin GT와 Mirae GT는 이 scale을 hidden preview에서만 검수한다. headlight profile 승인 전에는 기본 vehicle/catalog으로 승격하지 않는다.

##### 7h번 게임 연동 잔여 범위 — 2026-09-03

세 차량의 7way source, deterministic 2D processing, 네 palette, external shadow와 실차 비율 기준선은 준비됐다. 아래는 **asset 생성 작업이 아닌 game integration**이며, 순서를 건너뛰어 선택 UI부터 만들지 않는다.

| 순서 | 상태 | 잔여 작업 | 완료 기준 |
| --- | --- | --- | --- |
| 1 | 다음 | Seorin GT/Mirae GT의 vehicle-local headlight profile tuning | `debugGuides=1`에서 center/0/1/2 pose의 lamp segment·swivel·footprint가 각 차체 lamp와 일치하고 browser screenshot QA를 통과한다. Raven Coupe는 현행 profile을 유지한다. |
| 2 | 다음 | 세 차량 × 4색 runtime asset promotion | palette sheet 네 장이 같은 192px atlas·shadow·approved profile을 공유하도록 catalog entry를 만든다. `generated` candidate를 그대로 public contract로 남기지 않고 approved/runtime 경로와 manifest를 확정한다. |
| 3 | 다음 | vehicle catalog 완성 | public id `raven-coupe / seorin-gt / mirae-gt`, 공통 color `blue / red / silver / black`, texture key, fallback, presentation scale, engine profile/capability를 하나의 typed catalog에서 해석한다. Seorin/Mirae의 첫 주행 profile은 명시적으로 승인하거나 temporary shared profile임을 UI 밖의 metadata에 기록한다. |
| 4 | 다음 | course catalog 및 선택 state | 현재 Bugak Ridge Downhill 하나를 `bugak-ridge-downhill`로 등록한다. `vehicleId / colorId / courseId`를 URL·in-memory selection·run telemetry에 같은 값으로 직렬화하고 unknown id는 Raven blue/Bugak으로 fallback한다. |
| 5 | 다음 | startup LoadingScene | runtime manifest의 UI/environment/effect/one course/3 vehicles × 4 colors/body-shadow-atlas/runtime audio를 실제 Loader progress와 함께 일괄 로드한다. Main 이후에는 same cache key를 재사용하며 GLB·source·QA asset은 넣지 않는다. |
| 6 | 다음 | pre-run garage → ready/start | 차량 선택 → 색상 선택 → 코스 확인 → ready/countdown의 UI를 만든다. 선택 화면은 source GLB/path/frame index를 모르며 public catalog id만 쓴다. 선택이 끝나기 전에는 run을 시작하지 않는다. `vehicle-preview.html`의 Sprite turntable은 현재 192px body·external shadow·color sheet로 검수하는 prototype이며, garage는 이 public catalog 입력만 재사용한다. |
| 7 | 다음 | 결과/retry와 저장 | finish/result/retry가 선택 조합을 유지한다. best record는 `vehicleId + courseId` 범위로 분리하고, cosmetic `colorId`는 run metadata에만 남긴다. 새로고침/공유 URL도 동일 조합을 복원한다. |
| 8 | gate | browser/runtime QA matrix | startup loading progress/error/retry, 3 vehicles × 4 colors의 load/fallback, 7way pose/flip, external shadow, approved headlight, start/retry/refresh 및 desktop/mobile screenshot을 검사한다. handling·road-scale·build 회귀도 함께 통과해야 한다. |

Raven Coupe는 현재 기본 진입 경로로만 먼저 연결됐으며, `?vehicle=ft86-retro`는 비교·롤백 route로 유지한다. Seorin GT/Mirae GT의 192px preview가 존재한다고 해서 garage 선택 대상으로 승격된 것은 아니다.

Sprite turntable은 17-pose driving sheet의 rear/quarter/front-spin source와 `flipX`를 연결한 15-frame selection loop다. rollover·uphill·downhill pose는 쓰지 않는다. 이 sheet에는 dedicated front-centre frame이 없으므로 front 영역은 좌우 front-quarter 두 frame 사이로 짧게 통과한다. 이는 garage에서 차종·색상을 빠르게 읽게 하는 임시 presentation이며, 별도의 360° authoring atlas를 요구하거나 driving pose 계약을 바꾸지 않는다.

#### Retro sprite recipe

| 역할 | script 처리 | palette swap 여부 |
| --- | --- | --- |
| silhouette / outline | alpha 1-bit화 뒤 1px dark outline. isolated pixel과 지글거리는 계단은 cell 안에서만 정리한다. | 아니오 |
| body | neutral gray-blue의 3~5 shade ramp로 묶고, 큰 panel만 남긴다. door seam·fender는 1 shade 차이를 넘지 않는다. | 예 |
| glass | 2 shade cool tint와 제한된 하이라이트만 남긴다. 내부 roll cage는 별도 accent로 보존한다. | 아니오 |
| lamp | housing 폭과 위치를 남기고 내부선·LED dot은 1~2개의 mass로 합친다. | 아니오 |
| grille / vent | grid texture를 면 또는 낮은 빈도의 2-tone hatch로 축약한다. logo·문구는 남기지 않는다. | 아니오 |
| wheel / brake | tire/rim/brake 역할을 mask로 보호하고, spoke는 회전 인지가 가능한 수만 남긴다. wheel centre·접지선은 이동하지 않는다. | 아니오 |
| shadow | body와 분리한 dark-blue translucent ground blob으로 재작성하고 모든 palette variant에 재사용한다. | 아니오 |

각 원본 pose는 512px 투명 PNG로 유지하고, 아래의 동기화된 레이어와 metadata를 함께 저장한다. 게임용 128px atlas는 이 source 묶음으로부터만 파생한다.

| 출력 | 용도 | 2D 처리 원칙 |
| --- | --- | --- |
| `beauty` | 원본 silhouette·차체 명암 기준 | 직접 palette 교체하지 않는다. |
| `body-mask` | body palette swap 대상 | blue/red/silver/black 변형은 이 mask 안에서만 수행한다. |
| `glass-mask` | 유리·window trim 보호 | tint/반사 단계만 공통화하고 body palette의 영향을 받지 않는다. |
| `lamp-mask` | rear lamp 및 발광 역할 | lamp mass는 단순화할 수 있으나 body color로 치환하지 않는다. |
| `wheel-mask` | 타이어·림·브레이크 보호 | wheelbase·접지 위치를 바꾸지 않는다. |
| `accent-mask` | roll cage·amber signal 등 body가 아닌 색상 강조 | body palette의 영향을 받지 않는다. |
| `shadow` | 접지 그림자 | 차체와 분리해 공통 baseline에 맞춘다. |
| `metadata` | bbox, anchor, baseline, rear angle | 후처리·flip·atlas QA의 단일 기준이다. |

렌더러는 이미 transparent RGBA pose sheet와 JSON pose metadata를 만들고, 후처리 스크립트는 resize, alpha hardening, palette quantization, outline, wheel 보호, baseline QA를 지원한다. 새 작업은 이 파이프라인에 role-mask pass와 7way pose manifest를 추가하는 범위다. 이미지 AI style filter는 이 계약의 필수 단계가 아니다.

#### 차량별 가능성 점검

| 차량 | 7way source render | 역할 mask 난도 | 사용할 3D source | 판정 |
| --- | --- | --- | --- | --- |
| Raven Coupe / 내부 source `FT86` | 가능. 0°/11°/24°/44° camera 궤적을 기존 rig에 추가한다. | 중간~높음. 최적화 GLB가 2 mesh·2 material이라 body/lamp/glass를 재질명만으로 분리할 수 없다. alpha·색·screen-space 규칙을 보조로 쓰고 결과를 frame별 QA한다. | `optimized/toyota_gt86-optimized.glb` | 가능. 2D mask 검수가 핵심이다. |
| Stinger / 공개 `Seorin GT` | 가능. 확정 art master를 offline renderer에 직접 연결한다. | 낮음~중간. art master가 22 mesh·14 material이라 badge 제거 후 body/glass/lamp/wheel 후보를 mesh·material 기준으로 분리할 수 있다. | `derived/kia_stinger-sprite-master.glb` | 가능. 세 차량 중 역할 분리가 가장 명확하다. |
| G70 (Nieve) / 공개 `Mirae GT` | 가능. 대칭 배기와 lamp 변경을 포함한 master로 출력한다. | 중간. 16 mesh·12 material이 있어 mask 후보는 충분하나 palette 계열 material은 역할이 겹칠 수 있어 semantic mapping을 명시한다. | `optimized/genesis_g70_nieve-sprite-master-optimized.glb` | 가능. 경량화 master를 사용하므로 batch render에도 적합하다. |

세 차량 모두 현재 Node/GLTF pipeline에서 extension을 등록한 reader로 읽히는 것을 확인했다. 단, 기존 `real-vehicle-poc` manifest는 Stinger(공개 `Seorin GT`)와 G70의 과거 optimized POC를 가리키므로 7way pass를 시작할 때 위 표의 확정 master 경로로 교체해야 한다. 이 manifest 전환 전의 sheet는 비교 기준일 뿐 새 atlas의 source가 아니다.

#### 7way pass 승인 기준

1. source 4장과 flip된 3장이 같은 `baseline` 및 `anchor` 계약을 만족한다.
2. `steer-right-0`는 0°와 24° 사이에서 silhouette 폭·노출이 단조롭게 변하고, 128px에서 양쪽 frame과 구별된다.
3. body palette swap이 lamp/glass/wheel/shadow의 RGB와 alpha를 바꾸지 않는다.
4. Seorin GT와 Mirae GT는 후면에서 FlipX 대칭이 유지되는지 별도 contact sheet로 확인한다.
5. dynamic spin/crash/uphill/downhill row에는 이번 7way 증설을 적용하지 않는다.

## playable 차량 art direction 비교 — 다음 gate

대상은 **Raven Coupe, Seorin GT, Mirae GT**다. 내부 source는 각각 `FT86`, `Stinger`, `G70 (Nieve)`다. 이 세 모델을 곧바로 runtime 차량으로 등록하지 않는다. 먼저 동일한 Three.js preview/render rig에서 비교해, 어떤 모델이더라도 하나의 Apex Seoul sprite family로 읽히는 기준을 고정한다.

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

7way source를 만들기 전에 각 차량을 별도 완성작처럼 렌더하지 않는다. Raven Coupe, Seorin GT, Mirae GT는 하나의 **Apex Seoul sprite family**로 읽혀야 하며, 차종 구분은 rear-quarter silhouette·roofline·wheelbase·lamp 폭처럼 저해상도에서도 남는 특징에만 둔다.

| 단계 | 공통화 규칙 | 차종별로 남길 것 |
| --- | --- | --- |
| 3D authoring | 로고·번호판·세밀한 그릴·현실적인 재질 편차를 약화하고 body/glass/wheel/lamp/chrome/shadow 역할을 분리 | 차체 비례, 루프·펜더 윤곽, 램프 폭, wheelbase, rear overhang |
| deterministic render | 공통 orthographic rig, 노출, outline·shadow 기준, contact baseline | 각 차량의 승인된 7way pose와 silhouette |
| pixel/style pass | 공통 명암 단계, 외곽선 두께, 유리·램프 발광 규칙 | 차체 역할 mask와 각 차종의 고유 silhouette |
| palette variant | body 역할만 교체하고 glass, lamp, tire, chrome, shadow는 고정 | `blue`, `red`, `silver`, `black`의 선택 가능한 차체색 |

색상 variant는 차종별 7way 3D render를 다시 만드는 작업이 아니다. 먼저 차종별 **neutral master 7way**를 승인하고, body-role mask를 이용해 후처리에서 색을 파생한다. 전체 RGB 치환은 lamp·반사광·shadow를 오염시키므로 금지한다. 기존 FT86 palette-role 후처리 구조를 세 차량 공통 manifest로 일반화한다.

원본 차량의 recognizability는 유지하되, 완성 sprite는 실차 홍보 렌더처럼 보이지 않도록 한다. 공개 후보에는 Raven Coupe/Seorin GT/Mirae GT 명명과 attribution을 함께 적용한다. Raven Coupe source(`FT86`)와 Seorin GT source(`Stinger`)도 sprite authoring을 시작하기 전에 source URL·author·license·파생 기록 sidecar를 보완해야 하며, Mirae GT는 원본과 대칭 배기구 파생본의 연결을 계속 기록한다.

### G70 (Nieve) 3D art-master 방향

- 공개 표기는 `Mirae GT`다. 원본 차명·제조사명은 source/attribution 기록에만 남기고, 플레이어에게 보이는 catalog·garage·sprite 설명에는 노출하지 않는다.
- 차체 silhouette, roofline, wheelbase, rear overhang은 유지한다. 차고·바디킷·휠 위치처럼 contact baseline을 바꾸는 수정은 하지 않는다.
- Genesis badge와 실차 번호판 텍스처는 제거하거나 generic 처리한다. 차종의 읽힘은 logo가 아니라 비례·유리선·rear lamp·배기구에서 만든다.
- 차체는 neutral `role-body`로만 렌더한다. selectable body color는 3D GLB가 아니라 승인된 spritesheet의 body-role palette swap으로만 만든다.
- glass는 차가운 tint와 통제된 반사 강도로 정리한다. 모든 palette variant가 같은 glass 역할을 공유한다.
- rear lamp는 유지할 대표 캐릭터 요소다. lamp housing의 위치와 폭은 보존한다. 단일 연속 lamp는 원본 lamp geometry의 layered insert를 제거하고 남은 broad lamp mesh를 재질 role로 재가공한 후보로만 진행하며, 차체 위에 plane/housing을 덧대는 방식은 preview QA에서 rejected다.

### Raven Coupe 가상화 방향

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

1. Raven Coupe, Seorin GT, Mirae GT의 source model·license metadata와 preview를 같은 rig로 보관한다. 내부 source는 각각 `FT86`, `Stinger`, `G70 (Nieve)`로 기록하고, Mirae GT는 원본과 대칭 배기구 파생본의 provenance를 함께 보관한다.
2. 위 비교 표의 scale/camera/silhouette/material/sprite contract를 승인하고 공통 art direction을 문서화한다.
3. 현재 Raven Coupe 5way의 pose sheet/atlas/runtime screenshot을 baseline으로 보관한다.
4. 차종별 body/glass/wheel/lamp/chrome/shadow role manifest와 neutral master palette를 승인한다.
5. `steer-right-0`(10–12°)만 추가한 4-source/7-runtime pose manifest 후보를 만든다.
6. 동일 Three.js rig로 256px neutral master sheet를 렌더하고, 현재 pixel·style-filter·alpha restore pipeline을 통과시킨다.
7. body-role mask로 `blue`, `red`, `silver`, `black` 후보를 파생하고, lamp·glass·chrome·shadow가 바뀌지 않는지 검사한다.
8. contact baseline, left/right flip, `center ↔ steer-0 ↔ steer-1` 차이를 QA한다.
9. atlas type·frame selection threshold·headlight/shadow profile을 함께 확장한다.
10. runtime screenshot과 handling regression을 통과한 neutral master 및 palette variant만 `approved`로 승격하고, 그 뒤에 catalog·vehicle physics 차이를 정의한다.

### 보류 사유 — 2026-07-28

Three.js raw render만으로 만든 intermediate pose는 현재 Raven Coupe 256px 승인본과 시각적으로 튀었다. 따라서 해당 runtime atlas·sprite·frame selection 변경은 모두 되돌렸다. 이후 7way source frame은 이 문서의 role-mask 기반 deterministic 2D pass와 QA를 통과하기 전에는 runtime에 부분 합성하지 않는다.

이 pass는 차량 art/presentation 작업이 열릴 때만 시작한다. 핸들링 기준선은 이를 위해 재조정하지 않는다.
