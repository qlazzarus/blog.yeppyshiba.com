# Chicken Farm Sprite Asset Generation Plan

이 문서는 Chicken Farm Phaser MVP에서 필요한 스프라이트/아이콘 에셋을 정리하고, 오픈소스 에셋 우선 도입 및 필요할 때의 생성·후처리 기준을 정의한다.

## 1. 방향

현재 기본 방침은 **오픈소스 에셋 우선**이다. GPT 이미지 생성은 적합한 오픈소스 후보가 없을 때만, **원본 후보 생성 + 후처리 + sprite sheet 정규화** 파이프라인의 앞단으로 사용한다.

효율적인 사용처:

- 캐릭터, 건물, 아이템, UI 아이콘의 컨셉 시안
- 일관된 색감과 실루엣을 잡는 style bible
- base sprite 후보 생성
- 능력/상점/보상 아이콘 생성
- 배경 장식물과 doodad 후보 생성

주의할 사용처:

- 완성된 tileset을 한 번에 생성하는 것
- 같은 캐릭터의 8방향 animation을 완전히 일관되게 생성하는 것
- 정확한 collision footprint가 필요한 건물 sprite
- 선택 ring, HP bar, team color 같은 runtime UI 요소를 이미지에 포함하는 것

### 1.1 라이선스·소싱 정책

- 우선순위는 `CC0`이다. 배포 표기 부담 없이 프로젝트 에셋으로 정규화할 수 있다.
- `CC-BY`는 원본 URL·저자·라이선스를 `docs/chicken_farm/`의 에셋 출처 목록에 기록할 수 있을 때만 사용한다.
- `CC-BY-SA`와 `GPL` 에셋은 프로젝트 전체 배포 라이선스에 영향을 줄 수 있으므로, 현재 MVP에는 도입하지 않는다.
- 다운로드한 외부 파일은 미리보기와 별개로 실제 압축 파일의 내용·라이선스 파일을 확인한 뒤 allowlist에 넣는다.
- 하나의 지면 레이어에는 같은 타일 규격·팔레트의 타일군만 사용한다. 서로 다른 타일셋을 한 장의 지면처럼 섞지 않는다.

### 1.2 현재 시각 에셋 스프린트 범위

이번 패스는 **타일셋 교체만** 수행한다.

- 기존 Kenney 지면 레이어를 CC0 잔디·흙 타일로 대체한다.
- 유닛, 건물, 아이콘, 이펙트, 게임 규칙과 충돌/pathing 데이터는 바꾸지 않는다.
- 건물 오픈소스 에셋의 다운로드·실제 sprite 교체는 다음 **건물 에셋 패스**에서 수행한다. 이소메트릭 원본을 2D sprite로 쓰는 방식 자체는 보류하지 않는다.
- 기존 맵은 Kenney의 tile ID를 참조하므로 이미지 파일만 바꾸지 않는다. 새 지면 레이어를 별도로 구성해 기존 object/collision 레이어와 분리한다.

### 1.3 현재 도입 에셋 출처

| 용도 | 파일 | 원본 | 라이선스 | 적용 방식 |
| --- | --- | --- | --- | --- |
| 잔디 지면 | `tilesets/opengameart-theness/forest.png` | TheNess, [Grass and dirt tileset (Warcraft II style)](https://opengameart.org/content/grass-and-dirt-tileset-warcraft-ii-style) | CC0 | 8×8 중심 타일을 nearest-neighbor로 16×16 논리 타일에 맞춰 렌더링 |
| 흙길 지면 | `tilesets/opengameart-theness/dirt.png` | TheNess, [Grass and dirt tileset (Warcraft II style)](https://opengameart.org/content/grass-and-dirt-tileset-warcraft-ii-style) | CC0 | 기존 ground 레이어의 흙길 위치만 매핑 |

## 2. 공통 스타일 가이드

프로젝트는 원본 Warcraft III 유즈맵의 룰 감각을 참고하지만, 원본 에셋/아이콘/모델/명칭을 복제하지 않는다.

공통 방향:

- 오리지널 stylized top-down fantasy farm defense
- 작은 화면에서도 읽히는 큼직한 실루엣
- 따뜻한 농장 색감과 어두운 밤 방어 분위기가 공존
- 건물은 이소메트릭(2.5D) 원본을 우선 허용하며, 런타임에서는 **하나의 2D 평면 sprite**로 배치한다. 3D 카메라나 메시 렌더링은 사용하지 않는다.
- 유닛은 mobile/web 화면에서도 식별되도록 머리/몸/무기/역할이 명확해야 함
- 선택 ring, HP bar, range indicator, shadow는 가능하면 runtime에서 별도 처리

### 2.1 World depth / 앞뒤 가림 규칙

건물과 유닛은 모두 2D sprite지만, 화면상 앞뒤 관계는 **발밑 기준 y-depth**로 정렬한다. 따라서 유닛이 건물의 위쪽(작은 y)으로 지나가면 건물 뒤로, 아래쪽(큰 y)으로 지나가면 건물 앞으로 보인다.

| 레이어 | depth 규칙 | 목적 |
| --- | --- | --- |
| 지면 | 고정 최하위 | 잔디·흙길 |
| 건물·유닛 본체 | `WORLD_DEPTH_BASE + footY` | 같은 월드 평면에서 앞뒤 가림 |
| selection ring·발 그림자 | 본체보다 소폭 낮음 | 본체 아래에만 보이게 처리 |
| HP/progress/nameplate | 본체보다 소폭 높음 | 건물 지붕이나 다른 본체에 가려지지 않게 처리 |
| 건설 ghost·드래그 선택 | world actor보다 높음 | 입력 피드백 유지 |
| fog/UI | world depth와 분리한 고정 상위 레이어 | 월드 정렬의 영향을 받지 않음 |

구현 규칙:

- `footY`는 유닛의 발밑 중심, 건물의 `footprint_bottom_center.y`다. 이미지 높이, 투명 여백, 이소메트릭 지붕 높이로 depth를 정하지 않는다.
- 하나의 entity를 여러 Phaser object로 그릴 때는 본체·shadow·overlay가 같은 `footY`에서 파생된 depth를 사용한다. container 자체의 고정 depth와 자식의 임의 depth를 섞지 않는다.
- 동일 `footY` 동률은 안정적인 entity id offset으로만 해소한다. 게임 상태·충돌·선택 판정은 draw depth에 의존하지 않는다.
- 건물 sprite import 전, `unit above building -> 뒤`, `unit below building -> 앞`, `footY 동률 -> 결정적 순서` 세 경우를 headless/브라우저 측정으로 검증한다.

공통 positive prompt:

```text
original stylized top-down fantasy farm defense game sprite, chunky readable silhouette, 3/4 top-down view, hand-painted texture feel, warm rural palette, slightly whimsical but survival-defense mood, clean transparent background, game-ready concept sprite, not based on any existing game asset
```

공통 negative prompt:

```text
no text, no logo, no watermark, no UI frame, no health bar, no selection circle, no existing game character, no Warcraft asset, no photorealism, no background scene, no cropped object
```

## 3. 생성/후처리 파이프라인

1. 문서의 asset row 단위로 GPT 이미지 후보를 3~6개 생성한다.
2. 가장 읽히는 실루엣을 고른다.
3. 배경 제거와 alpha cleanup을 수행한다.
4. anchor point를 통일한다. 유닛은 발밑 중심, 건물은 footprint 바닥 중심을 기본으로 둔다.
5. footprint grid에 맞춰 scale을 정규화한다. 건물 collision footprint와 sprite source 크기는 분리한다.
6. 그림자, 선택 ring, HP bar, team color는 runtime layer로 분리한다.
7. animation이 필요한 유닛은 idle/move/attack frame을 별도 sheet로 만든다.
8. 최종 파일명과 runtime id를 asset manifest에 기록한다.

권장 output 크기:

| 종류 | 기준 크기 | 비고 |
| --- | ---: | --- |
| 소형 유닛 | `64x64` | 닭, 개, 늑대, 거미 |
| 중형 유닛 | `96x96` | 농부, 아내, 큰 개, 보스 소형 |
| 대형 보스 | `128x128` 또는 `192x192` | boss silhouette 우선 |
| 1x1 prop | `64x64` | item pickup, 작은 장식 |
| 2x2 건물 | `128x128` | 타워, 우물, 시장 소형 |
| 3x3 건물 | `192x192` | 닭장, 연구소, 배럭 |
| 4x4 건물 | `128x128` 또는 `256x256` | blocker는 128px, source는 detail 필요 시 256px |
| 8x8 건물 | `256x256` 또는 `320x320` | 농가, 마을회관, 대형 핵심 건물 |
| UI 아이콘 | `96x96` source -> `48x48` runtime | ability/shop/reward |

건물 크기 기준:

- `footprintCells`는 pathing/collision/build placement의 논리 크기다.
- 현재 runtime footprint cell은 32px이고, placement snap은 minor tile 2개 단위인 64px이다.
- sprite source 크기는 시각 품질 기준이다. 예를 들어 3x3 건물은 collision footprint가 `96x96`이어도 source sprite는 `192x192`로 둔다.
- W3X/Warsmash 근접 footprint는 `pathTex`를 우선한다. `4x4SimpleSolid`는 `4x4`, `8x8SimpleSolid`는 `8x8`로 해석한다.
- 이소메트릭 건물 원본도 `footprint_bottom_center`에 anchor를 맞춘 2D 평면 sprite로 취급한다. 지붕/장식·투명 여백은 footprint 밖으로 올라와도 되지만, 바닥 접촉부는 footprint 안에서 읽혀야 한다.
- 건물의 draw depth는 sprite 전체 높이가 아니라 `footprint_bottom_center`의 y값을 기준으로 정한다. 따라서 서로 다른 이소메트릭 원본을 써도 앞뒤 겹침과 선택 판정은 논리 footprint로 일관되게 유지한다.
- HP bar, 건설 progress bar, selection outline, range indicator는 runtime overlay로 처리한다.
- 워3식 하단 정보 패널에 쓰는 건물 portrait는 1차에서는 `iconId`를 재사용한다. 필요하면 후속으로 `portraitId`를 manifest에 추가한다.

## 3.1 Building Data and Asset Manifest Fields

건설 PoC 이후 건물은 데이터와 에셋이 같은 id 체계를 공유해야 한다. `buildingTemplates.ts`의 building id마다 아래 manifest 필드를 매핑한다.

```ts
type ExternalAssetCandidateId = string;

type BuildingAssetManifestEntry = {
    readonly id: MvpBuildingId;
    readonly spriteId: string;
    readonly constructionSpriteId: string;
    readonly iconId: string;
    readonly candidateSourceIds?: readonly ExternalAssetCandidateId[];
    readonly footprintCells: { readonly w: number; readonly h: number };
    readonly selectionBoundsPx?: { readonly w: number; readonly h: number };
    readonly sourceSizePx: { readonly w: number; readonly h: number };
    readonly anchor: 'footprint_bottom_center';
};
```

건물 데이터에서 우선 채워야 하는 runtime 필드:

| 필드 | 목적 |
| --- | --- |
| `footprintCells` | pathing, build placement, blocker 크기 |
| `hp` / `armor` | 늑대 공격, 수리, 파괴 판정 |
| `buildTimeSec` | 농부 작업 시간과 progress bar |
| `costCoins` / `costLumber` | 건설 비용 |
| `blocksPath` | dynamic blocker 등록 여부 |
| `targetableByWolves` | 늑대 공격 후보 여부 |
| `spriteId` | 완성 건물 sprite |
| `constructionSpriteId` | 건설 중 scaffold 또는 단계별 sprite |
| `iconId` | command card/build menu icon |
| `selectionBoundsPx` | sprite가 footprint보다 크거나 작을 때 클릭/선택 보정 |
| `candidateSourceIds` | 생성 전에 우선 검토할 외부 리소스 후보 id. 채택 전까지 runtime 의존성은 만들지 않음 |

원본 build time은 아직 SLK/W3X 교차 검증이 부족하므로, MVP에서는 체감값을 먼저 채우고 `source.notes` 또는 별도 TSV에 원본 검증 상태를 남긴다.

## 3.2 Building Runtime Visual States

건물 sprite는 최소 5개 상태를 고려한다.

| 상태 | 의미 | 시각 처리 |
| --- | --- | --- |
| `planned` | 농부가 이동 중인 예정 부지 | 노란 footprint outline, sprite 없음 |
| `constructing` | 농부가 작업 중 | scaffold sprite + progress bar |
| `complete` | 완성 | 완성 sprite + HP bar |
| `damaged` | 완성 후 피해 | 완성 sprite 위에 damage overlay/cracks 후보 |
| `destroyed` | 파괴 | 잔해 sprite 또는 runtime debris |

1차 에셋 범위:

- `planned`는 runtime graphics만 사용한다.
- `constructing`은 footprint 크기별 공통 scaffold sprite를 사용한다.
- `complete`는 building별 sprite를 사용한다.
- `damaged`와 `destroyed`는 MVP 후속으로 미룬다. 단, sprite manifest에는 미래 확장을 위한 id 규칙을 남긴다.

건설 중 blocker 정책 후보:

- 현재 구현은 `complete` 상태만 dynamic blocker로 등록한다.
- 워3 체감에 가까운 후속 정책은 `constructing`도 blocker로 등록하되, 농부가 footprint 밖 접근점에 도착한 뒤 착공하게 보장하는 것이다.
- 늑대 combat 재연결 시 `constructing` 건물을 targetable로 볼지 별도 결정한다.

## 4. 우선순위별 Asset Manifest

아래 목록은 더 이상 “전부 새로 생성할 리소스”만 뜻하지 않는다. 각 `Asset ID`는 **외부 유력 후보를 먼저 검토하고, 맞지 않을 때만 생성**한다. 후보는 sprite의 역할·실루엣·라이선스가 맞는지를 빠르게 검증하기 위한 연결이며, 다운로드·정규화·manifest 등록 전에는 채택으로 간주하지 않는다.

### 4.1 확보 리소스 → Asset ID 연결

`CC0`과 출처 표기 조건을 충족하면 사용할 수 있는 `CC-BY`만 연결했다. 보류·제외 리소스는 이 표에 넣지 않는다.

| Candidate source ID | 리소스 | 라이선스 | 우선 연결 Asset ID | 채택 시 처리 |
| --- | --- | --- | --- | --- |
| `oga_theness_terrain` | [Grass and dirt tileset](https://opengameart.org/content/grass-and-dirt-tileset-warcraft-ii-style) | CC0 | `tile_grass_base`, `tile_dirt_path`, `tile_dark_forest_edge` | 현재 잔디·흙길에 적용됨. edge/overlay 확장은 같은 타일군에서만 추가. |
| `kenney_tiny_farm` | Kenney Tiny Farm | CC0 | `tile_grass_base`, `tile_dirt_path`, `doodad_hay_bale`, `doodad_crate`, `building_coop_basic`, `building_market` | TheNess 지면과 무분별하게 섞지 않고, props 또는 교체 패스 단위로 palette를 확인. |
| `kenney_animal_pack_redux` | Kenney Animal Pack Redux | CC0 | `unit_dog_basic` | 실제 dog frame·방향 수를 archive에서 확인한 뒤 임시/정식 여부 결정. |
| `oga_chicken_sprites` | [OpenGameArt Chicken Sprites](https://opengameart.org/content/chicken-sprites) | CC0 | `unit_chicken_basic`, `unit_chicken_mid`, `unit_chicken_giant` | walk/peck frame을 우선 사용하고 등급별 recolor/scale은 후속 정규화. |
| `oga_lpc_farm_animals` | OpenGameArt LPC style farm animals | CC-BY 3.0 경로 | `unit_chicken_basic`, `unit_chicken_mid`, `unit_chicken_giant` | GPL 파일은 제외하고 CC-BY 사용 파일만 allowlist·credits에 기록. |
| `oga_lpc_wolf` | OpenGameArt LPC Wolf Animation | CC-BY/OGA-BY 경로 | `unit_wolf_basic` | 선택한 라이선스 경로·저자·URL·sheet frame mapping을 credits에 기록. |
| `oga_lpc_cats_dogs` | OpenGameArt LPC Cats and Dogs | CC-BY/OGA-BY 경로 | `unit_dog_basic` | 선택한 라이선스 경로만 allowlist에 기록. |
| `oga_guard_tower_iso` | [Medieval Wooden Guard Tower](https://opengameart.org/content/medieval-wooden-guard-tower-isometric-25d) | CC0 | `building_tower_scout` | 첫 2D isometric sprite adapter 및 y-depth 자동 측정 fixture. |
| `oga_viking_archer_tower_iso` | [Viking Archer Tower](https://opengameart.org/content/viking-archer-tower-low-poly) | CC0 | `building_tower_guard_small`, `building_tower_guard_large` | base/roof/archer가 분리돼 있으면 본체와 overlay의 공통 `footY`를 검증. |
| `oga_medieval_fountain_iso` | [Medieval Fountain](https://opengameart.org/content/medieval-fountain-with-animated-water) | CC0 | `building_well_basic` | 첫 패스는 정적 frame; 물 애니메이션은 후속 sprite sheet 작업. |
| `oga_western_castle_iso` | [Western-European Castle](https://opengameart.org/content/western-european-castle-isometric-25d) | CC0 | `building_town_hall` | 대형 landmark라 footprint·selection bounds를 별도 조정. |
| `oga_old_well_iso` | [Old Well](https://opengameart.org/content/old-well-bleeds-game-art) | CC-BY 3.0 | `building_well_basic` | CC0 분수보다 농장 우물 실루엣이 적합할 때의 대체 후보. Bleed 표기 필수. |
| `oga_timbered_house_iso` | [Timbered House](https://opengameart.org/content/timbered-house) | CC-BY 3.0 | `building_farm_house`, `building_coop_basic` | 농가 우선 후보. Bleed 표기 필수, 닭장 전환 시 기능 표식은 runtime overlay로 보완. |
| `oga_powers_icons` | [Powers Icons](https://opengameart.org/content/powers-icons) | CC0 | `icon_build`, `icon_cancel`, `icon_repair`, `icon_sell`, `icon_stop`, `icon_attack_move`, `icon_upgrade`, `icon_heal`, `icon_blessing` | 각 command의 의미가 맞는 개별 아이콘만 선택하고, 단축키 텍스트는 runtime UI로 유지. |
| `oga_explosion_fx` | [Explosion](https://opengameart.org/content/explosion) | CC0 | `marker_target_command`, `building_destroyed_fx`(후속), `attack_impact_fx`(후속) | 기존 manifest에 없는 후속 FX id는 실제 전투·파괴 구현과 함께 추가. |

### 4.2 추가 조사 유력 후보

조사일: 2026-07-14. 아래는 현재 렌더링 구조에 맞는 추가 후보만 기록했다. 공통 기준은 **직교 지면은 유지하고, 이소메트릭 원본은 `footY` 정렬되는 독립 2D sprite로 사용**하는 것이다.

| 우선도 | Candidate source ID | 리소스 | 라이선스 | 연결 Asset ID | 적합성·도입 조건 |
| --- | --- | --- | --- | --- | --- |
| A | `kenney_isometric_miniature_farm` | [Kenney Isometric Miniature Farm](https://kenney.nl/assets/isometric-miniature-farm) | CC0 | `building_coop_basic`, `building_egg_storage`, `building_market`, `building_farm_house`, `doodad_hay_bale`, `doodad_crate` | 농장 전용 60개 타일/오브젝트와 Tiled sample이 있어 가장 폭넓게 맞는다. 256×512 원본 전체를 한 번에 로드하지 않고 실제 채택한 PNG만 잘라 sprite atlas로 정규화한다. |
| A | `oga_iso_spider` | [ISO Spider spritesheet](https://opengameart.org/content/iso-spider-spritesheet) | CC0 | `unit_spider_basic` | 8방향·13프레임 walk sheet라 현재 `footY` 정렬 검증에 적합하다. 2.1MB sheet에서 필요한 frame만 atlas로 추출한다. |
| A | `oga_medieval_blacksmith_iso` | [Medieval Blacksmith](https://opengameart.org/content/medieval-blacksmith-isometric-25d) | CC0 | `building_blacksmith` | 동일 Feudal Wars 계열이라 기존 가드 타워·성 후보와 광원/시점 일관성이 높다. |
| A | `oga_iso_medieval_set` | [Isometric (2.5D) Medieval Set](https://opengameart.org/content/isometric-25d-medieval-set) | CC0 공개 컬렉션 | `building_mercenary_barracks`, `building_tower_guard_*`, `building_town_hall` | barracks·archery range·stable·house 등으로 확장할 수 있다. 실제 사용할 개별 파일의 페이지·라이선스를 import 때 다시 기록한다. |
| A | `oga_isometric_barn_farmhouse` | [Isometric Barn / Farmhouse](https://opengameart.org/content/isometric-barn-farmhouse) | CC0 선택 가능(다중 라이선스) | `building_farm_house`, `building_coop_basic` | 농장 역할과 실루엣이 정확히 맞는다. archive 내부 라이선스가 CC0 선택을 허용하는지 확인한 뒤만 도입한다. |
| B | `oga_isometric_houses` | [Isometric Houses](https://opengameart.org/content/isometric-houses) | CC0 | `building_farm_house`, `building_market`, `building_grand_market` | 128×128, 16종 주택과 4방향이라 보급이 좋다. 농장 전용 표식(알 상자·간판)은 runtime prop으로 보완한다. |
| B | `oga_isometric_house_pack` | [Isometric House Pack](https://opengameart.org/content/isometric-house-pack) | CC0 | `building_farm_house`, `building_market` | 작은 pixel-art 건물의 빠른 placeholder 후보. 기존 후보와 팔레트·광원 비교 후 한 계열만 채택한다. |
| B | `oga_pixel_farm_shack` | [Pixel farm and shack](https://opengameart.org/content/pixel-farm-and-shack) | CC0 | `doodad_hay_bale`, `tile_trampled_grass`, `building_coop_basic` | 농작물·shack 구성은 적합하지만 크기 불일치 이력이 있어 지면 전체 교체용이 아니라 crop/doodad 선택 후보로 제한한다. |
| B | `oga_iso_plants` | [Free isometric plants-pack](https://opengameart.org/content/free-isometric-plants-pack) | CC0 | `doodad_tree_small`, `doodad_bush`, `prop_spider_den` | 64×32 isometric 기준이라 depth 정렬과 잘 맞는다. archive가 크므로 필요 PNG만 선별하고 mobile texture budget을 측정한다. |
| B | `oga_farmer_bleed_iso` | [Farmer — Bleed's Game Art](https://opengameart.org/content/farmer-bleeds-game-art) | CC-BY 3.0 | `unit_farmer` | 8방향의 걷기·괭이·씨앗·물주기 동작이 경제 루프와 매우 잘 맞는다. Bleed/URL/CC-BY 3.0을 credits에 기록한다. |
| B | `oga_fences_walls_gate` | [Fences, Walls and a Gate](https://opengameart.org/content/fences-walls-and-a-gate) | CC0 | `building_fence_wood`, `building_wall_stone`, `building_gate_wood` | 역할은 정확하지만 이소메트릭 광원·원근은 archive preview로 확인해야 한다. 맞지 않으면 Feudal Wars 계열을 우선한다. |
| B | `oga_iso_medieval_buildings` | [isometric medieval buildings](https://opengameart.org/content/isometric-medieval-buildings) | CC0 | `building_farm_house`, `building_mercenary_barracks` | 64×32/128×64 출력·그림자 variation이 있어 선택 폭이 넓다. 25MB archive라 필요한 sheet만 선별한다. |
| B | `oga_svg_iso_buildings` | [SVG Isometric buildings](https://opengameart.org/content/svg-isometric-buildings) | CC0 | `building_farm_house`, `building_market`, `doodad_tree_small` | PNG sheet와 SVG가 함께 있어 해상도 정규화에 유리하다. SVG를 런타임에 직접 렌더링하지 않고 사전 PNG atlas로 변환한다. |
| C | `oga_devolution_topdown` | [Devolution Topdown tilesets and sprites](https://opengameart.org/content/devolution-topdown-tilesets-and-sprites) | CC0 | `unit_farmer` 임시안, `unit_spider_basic` 임시안, `icon_*` | 16×16 top-down 계열이라 지면/유닛의 임시 placeholder에는 맞지만, 확정한 이소메트릭 건물 스타일과는 별도 계열이다. 건물에는 사용하지 않는다. |

도입 순서:

1. `kenney_isometric_miniature_farm`에서 닭장·시장·농가 후보를 선정한다.
2. `oga_guard_tower_iso`와 `oga_iso_spider`를 각각 건물/유닛의 `footY` 앞뒤 가림 fixture로 쓴다.
3. Feudal Wars CC0 계열(blacksmith, barracks, house)을 같은 광원 방향으로 묶어 방어·테크 건물을 채운다.
4. CC-BY `oga_farmer_bleed_iso`는 credits manifest를 먼저 만든 후에만 가져온다.

### P0. 현재/다음 PoC 필수

유력 외부 후보: `unit_farmer` → `oga_farmer_bleed_iso`(CC-BY credits 조건), `unit_dog_basic` → `kenney_animal_pack_redux` 또는 `oga_lpc_cats_dogs`, `unit_wolf_basic` → `oga_lpc_wolf`, `unit_spider_basic` → `oga_iso_spider`, `building_tower_scout` → `oga_guard_tower_iso`, `building_farm_house`/`building_coop_basic` → `kenney_isometric_miniature_farm` 또는 `oga_isometric_barn_farmhouse`, `building_fence_wood` → `oga_fences_walls_gate`, command icon 묶음 → `oga_powers_icons`.

| Asset ID | 용도 | 타입 | 크기 | 프롬프트 키워드 |
| --- | --- | --- | ---: | --- |
| `unit_farmer` | 조작 캐릭터 `H000` 대응 | unit | `96x96` | sturdy farmer, simple tool belt, straw cap, readable from top-down |
| `unit_dog_basic` | 시작 개 `n002` 대응 | unit | `64x64` | loyal farm dog, alert stance, compact silhouette |
| `unit_wolf_basic` | 일반 늑대 baseline | unit | `64x64` | lean hungry wolf, dark gray fur, aggressive posture |
| `unit_spider_basic` | 초반 거미 사냥 | unit | `64x64` | oversized field spider, readable legs, not horror realistic |
| `building_fence_wood` | 기본 울타리, W3X 4x4 blocker | building | `128x128` | wooden fence segment inside 4x4 footprint, defensive farm barricade |
| `building_tower_scout` | 초반 스카우트 타워 | building | `128x128` | small wooden watch tower, farm defense, simple roof |
| `building_farm_house` | 건설 PoC core 건물, W3X 8x8 blocker | building | `256x256` | cozy large farm house, defensive homestead |
| `building_coop_basic` | 건설 PoC economy 건물, W3X 4x4 blocker | building | `128x128` 또는 `256x256` | small chicken coop, hay, red-brown wood |
| `building_scaffold_4x4` | 4x4 건설 중 공통 scaffold | building_state | `256x256` | larger wooden construction scaffold, sturdy frame, planks |
| `building_scaffold_8x8` | 8x8 건설 중 공통 scaffold | building_state | `256x256` 또는 `320x320` | large wooden construction scaffold, broad foundation, planks |
| `icon_build` | build page 진입 command | icon | `96x96` | rustic hammer and blueprint, construction command |
| `icon_cancel` | placement/build 취소 | icon | `96x96` | crossed wooden stakes, cancel construction motif |
| `icon_repair` | 건물 수리 command 후보 | icon | `96x96` | wooden hammer with green repair spark |
| `icon_sell` | 건물 판매 command 후보 | icon | `96x96` | coin and small house silhouette, rustic market |
| `marker_move_command` | 우클릭 이동 feedback | fx/ui | `64x64` | small glowing ground marker, green-blue, transparent |
| `marker_target_command` | 우클릭 대상 feedback | fx/ui | `64x64` | sharp target ping, amber, transparent |
| `icon_stop` | stop command | icon | `96x96` | hand stop symbol, wooden shield motif |
| `icon_attack_move` | attack-move 후보 | icon | `96x96` | crossed farm tool and arrow, aggressive command icon |

### P1. PoC 7 Economy

유력 외부 후보: `unit_chicken_*` → `oga_chicken_sprites` 우선, CC-BY 대체안은 `oga_lpc_farm_animals`; `building_coop_mid`/`building_coop_high`/`building_egg_storage` → `kenney_isometric_miniature_farm`; `icon_upgrade` → `oga_powers_icons`. `icon_egg`·`icon_coin`은 정확한 의미의 CC0 후보를 별도 선별하거나 생성한다.

| Asset ID | 용도 | 타입 | 크기 | 프롬프트 키워드 |
| --- | --- | --- | ---: | --- |
| `unit_chicken_basic` | 기본 닭 | unit | `64x64` | plump white chicken, cute but readable |
| `unit_chicken_mid` | 중급 닭 | unit | `64x64` | larger golden chicken, slightly proud |
| `unit_chicken_giant` | 고급/후반 닭 | unit | `96x96` | oversized prize chicken, fantasy farm |
| `building_coop_mid` | 중급 닭장 | building | `192x192` | upgraded chicken house, more sturdy, farm machinery hints |
| `building_coop_high` | 고급 양계장 | building | `192x192` | advanced fantasy poultry house, clean roof, premium look |
| `building_egg_storage` | 알 보관소 | building | `128x128` | small egg storage shed, crates of eggs |
| `icon_egg` | 알 resource | icon | `96x96` | single shiny egg, warm highlight |
| `icon_coin` | coin resource | icon | `96x96` | simple gold coin, farm market token |
| `icon_upgrade` | 업그레이드 | icon | `96x96` | upward arrow with hammer, rustic fantasy |

### P2. Core Buildings and Shop

유력 외부 후보: `building_town_hall` → `oga_western_castle_iso` 또는 `oga_iso_medieval_set`; `building_market`/`building_grand_market` → `kenney_isometric_miniature_farm` 또는 `oga_isometric_houses`; `building_well_basic` → `oga_medieval_fountain_iso` 우선, 농장 우물 실루엣 대체안은 `oga_old_well_iso`(CC-BY credits 조건); `building_mercenary_barracks` → `oga_iso_medieval_set`; `building_blacksmith` → `oga_medieval_blacksmith_iso`.

| Asset ID | 용도 | 타입 | 크기 | 프롬프트 키워드 |
| --- | --- | --- | ---: | --- |
| `building_town_hall` | 마을회관 | building | `256x256` | larger rural town hall, fortified farm center |
| `building_family_temple` | 신전/가족 테크 | building | `256x256` | warm rustic shrine, family blessing theme |
| `building_market` | 시장 | building | `128x128` | small farm market stall, crates and canopy |
| `building_grand_market` | 대형 시장 | building | `192x192` | upgraded market hall, colorful but readable |
| `building_well_basic` | 우물 | building | `128x128` | stone well, healing water glow |
| `building_lumber_mill` | 수익/테크 건물 | building | `192x192` | compact lumber mill, saw wheel, farm economy |
| `building_mercenary_barracks` | 용병소 | building | `192x192` | rugged barracks, training yard hints |
| `building_blacksmith` | 블랙스미스 | building | `192x192` | small forge, anvil, warm orange light |
| `building_workshop_lab` | 워크샵 | building | `192x192` | tinkerer workshop, gears, farm machines |
| `building_arcane_lab` | 아케인 생텀 | building | `192x192` | rustic magic laboratory, blue glow, not sci-fi |

### P3. Defense Upgrade Lines

유력 외부 후보: `building_fence_bronze`/`building_wall_stone`/`building_gate_wood` → `oga_fences_walls_gate`; `building_tower_guard_small`/`building_tower_guard_large` → `oga_viking_archer_tower_iso`; arcane·plasma 계열은 시각 역할이 달라 새 생성 대상으로 유지한다.

| Asset ID | 용도 | 타입 | 크기 | 프롬프트 키워드 |
| --- | --- | --- | ---: | --- |
| `building_fence_bronze` | 청동 울타리 | building | `64x128` | reinforced bronze fence segment |
| `building_wall_stone` | 돌 벽 | building | `64x128` | chunky stone wall segment |
| `building_barrier_magic` | 마법 결계 | building | `64x128` | magical barrier posts, subtle glow |
| `building_plasma_wall` | 최종 벽 | building | `64x128` | fantasy energy wall, grounded farm-defense design |
| `building_gate_wood` | 대문 | building | `128x64` | wooden defensive farm gate, closed |
| `building_tower_guard_small` | 가드 타워 소형 | building | `128x128` | small guard tower, simple archer platform |
| `building_tower_guard_large` | 가드 타워 상위 | building | `128x128` | reinforced guard tower, larger roof, stronger silhouette |
| `building_tower_arcane_small` | 아케인 타워 소형 | building | `128x128` | small arcane defense tower, blue crystal |
| `building_tower_arcane_large` | 아케인 타워 상위 | building | `128x128` | grand arcane tower, larger crystal, magical energy |

### P4. Family, Support, Boss, Rewards

유력 외부 후보: `unit_dog_big` → `kenney_animal_pack_redux` 또는 `oga_lpc_cats_dogs`의 scale/recolor 확장; `prop_spider_den` → `oga_iso_plants`를 배경 식생으로 사용하고 거미줄은 runtime overlay 또는 새 생성; `icon_heal`/`icon_blessing` → `oga_powers_icons`. 가족·보스·와이번·거북이·보상 상자는 현재 적합한 후보가 없어 새 생성 대상으로 유지한다.

| Asset ID | 용도 | 타입 | 크기 | 프롬프트 키워드 |
| --- | --- | --- | ---: | --- |
| `unit_spouse` | 아내/가족 테크 | unit | `96x96` | farm healer companion, apron, gentle magic |
| `unit_child_son` | 아들 | unit | `64x64` | young farm helper boy, small tool |
| `unit_child_daughter` | 딸 | unit | `64x64` | young farm helper girl, healing satchel |
| `unit_dog_big` | 큰 개 | unit | `96x96` | large guard dog, protective stance |
| `unit_wyvern_support` | 와이번 후보 | unit | `128x128` | small friendly wyvern mount, farm fantasy |
| `unit_wolf_boss` | 보스 늑대 | unit | `192x192` | massive alpha wolf boss, dark fur, glowing eyes |
| `unit_turtle_npc` | 거북이 이벤트 NPC | unit | `96x96` | wise turtle merchant, small pack |
| `prop_wolf_stone` | 늑대의 돌 | prop | `128x128` | ancient wolf stone shrine, runes |
| `prop_spider_den` | 거미 구역 장식 | prop | `128x128` | field spider nest, webbed grass |
| `icon_heal` | 치료 스킬 | icon | `96x96` | warm healing hand, farm magic |
| `icon_blessing` | 축복/버프 | icon | `96x96` | golden family blessing, soft glow |
| `icon_reward_chest` | 보상 | icon | `96x96` | rustic reward chest, eggs and coins |

### P5. Map Tiles and Doodads

유력 외부 후보: `tile_grass_base`/`tile_dirt_path`/`tile_dark_forest_edge` → `oga_theness_terrain`; `tile_trampled_grass` → `oga_pixel_farm_shack`의 선택 crop 또는 새 생성; `doodad_tree_small`/`doodad_bush` → `oga_iso_plants` 또는 `oga_svg_iso_buildings`; `doodad_hay_bale`/`doodad_crate` → `kenney_isometric_miniature_farm`; `doodad_lamp_post`은 새 생성 또는 Kenney sample 안의 실물 확인 후 결정한다.

| Asset ID | 용도 | 타입 | 크기 | 프롬프트 키워드 |
| --- | --- | --- | ---: | --- |
| `tile_grass_base` | 기본 잔디 | tile | `64x64` | seamless top-down grass tile, warm farm field |
| `tile_dirt_path` | 흙길 | tile | `64x64` | seamless dirt path, farm trail |
| `tile_trampled_grass` | 이동 흔적 | tile | `64x64` | trampled grass, subtle |
| `tile_dark_forest_edge` | 외곽 늑대 구역 | tile | `64x64` | dark forest edge ground, moody |
| `doodad_tree_small` | 나무 장식 | prop | `96x96` | small stylized tree, top-down |
| `doodad_bush` | 덤불 | prop | `64x64` | rounded farm bush |
| `doodad_hay_bale` | 건초 | prop | `64x64` | hay bale stack |
| `doodad_crate` | 상자 | prop | `64x64` | wooden crate, farm storage |
| `doodad_lamp_post` | 조명 | prop | `64x64` | rustic lamp post, warm glow |

Tileset은 단일 이미지 생성보다 수작업/절차적 보정이 더 중요하다. GPT는 tile concept과 texture 후보까지만 사용하고, 실제 seamless tile은 별도 편집으로 맞춘다.

## 5. 프롬프트 템플릿

### Unit Sprite

```text
{COMMON_POSITIVE_PROMPT}

Create a single {unit_name} for a top-down farm defense game.
Role: {gameplay_role}.
Visual traits: {visual_traits}.
The sprite must have a strong readable silhouette at 64px scale, facing slightly down-right, full body visible, transparent background.

{COMMON_NEGATIVE_PROMPT}
```

예시:

```text
original stylized top-down fantasy farm defense game sprite, chunky readable silhouette, 3/4 top-down view, hand-painted texture feel, warm rural palette, slightly whimsical but survival-defense mood, clean transparent background, game-ready concept sprite, not based on any existing game asset

Create a single farmer hero for a top-down farm defense game.
Role: player-controlled builder and repair unit.
Visual traits: straw cap, sturdy boots, small tool belt, simple wooden hammer, warm tan shirt, compact body shape.
The sprite must have a strong readable silhouette at 64px scale, facing slightly down-right, full body visible, transparent background.

no text, no logo, no watermark, no UI frame, no health bar, no selection circle, no existing game character, no Warcraft asset, no photorealism, no isometric city builder scale, no background scene, no cropped object
```

### Building Sprite

```text
{COMMON_POSITIVE_PROMPT}

Create one {building_name} as an isometric 2.5D building sprite for a farm defense game.
Gameplay role: {gameplay_role}.
Footprint: {footprint_cells} grid cells.
Runtime footprint: {runtime_footprint_px}.
Source sprite size: {source_size_px}.
Visual traits: {visual_traits}.
The building must read clearly as a 2D sprite, have no background, and leave space around the base for runtime selection/placement indicators. The base should align to a footprint-bottom-center anchor so units can depth-sort in front of and behind it.

{COMMON_NEGATIVE_PROMPT}
```

예시:

```text
original stylized top-down fantasy farm defense game sprite, chunky readable silhouette, 3/4 top-down view, hand-painted texture feel, warm rural palette, slightly whimsical but survival-defense mood, clean transparent background, game-ready concept sprite, not based on any existing game asset

Create one small wooden watch tower as an isometric 2.5D building sprite for a farm defense game.
Gameplay role: early defensive tower.
Footprint: 4x4 grid cells.
Runtime footprint: 128x128 px.
Source sprite size: 128x128 px.
Visual traits: wooden legs, compact lookout platform, simple red-brown roof, tiny farm-defense banner, readable attack tower silhouette.
The building must read clearly from top-down view, fit inside a square sprite, have no background, and leave space around the base for runtime selection/placement indicators. The base should align to a footprint-bottom-center anchor.

no text, no logo, no watermark, no UI frame, no health bar, no selection circle, no existing game character, no Warcraft asset, no photorealism, no isometric city builder scale, no background scene, no cropped object
```

### Construction Scaffold Sprite

```text
{COMMON_POSITIVE_PROMPT}

Create one construction scaffold sprite for a top-down farm defense game.
Purpose: shared building-under-construction visual.
Footprint: {footprint_cells} grid cells.
Runtime footprint: {runtime_footprint_px}.
Source sprite size: {source_size_px}.
Visual traits: unfinished wooden frame, planks, rope, hay bundles, simple foundation, readable as in-progress construction, no complete building roof.
The sprite must fit the footprint-bottom-center anchor and leave room for runtime progress bar and worker unit.

{COMMON_NEGATIVE_PROMPT}
```

### UI Icon

```text
Create a square game UI icon for {icon_name}.
Style: hand-painted fantasy farm defense, bold silhouette, high contrast, readable at 32px, centered object, transparent background.
Motif: {motif}.
Do not include text, numbers, frames, logos, watermarks, or existing game symbols.
```

### Tile/Texture Concept

```text
Create a seamless top-down {tile_name} texture concept for a stylized fantasy farm defense game.
Mood: {mood}.
Surface details: {details}.
No props, no units, no buildings, no text, no logos.
```

## 6. 파일명 규칙

권장 경로:

- Source 후보: `games/chicken-farm/assets/source/generated/`
- 정리된 sprite: `games/chicken-farm/assets/sprites/`
- UI icon: `games/chicken-farm/assets/ui/icons/`
- Tile/prop: `games/chicken-farm/assets/tilesets/` 또는 `games/chicken-farm/assets/props/`

파일명 규칙:

```text
{category}_{asset_id}_{variant}_{size}.png
```

예시:

- `unit_farmer_v01_96.png`
- `unit_dog_basic_v02_64.png`
- `building_tower_scout_v01_128.png`
- `icon_stop_v01_96.png`

## 7. 현재 추천 생성 순서

2026-07-08 기준으로는 새 생성 전에 오픈소스/무료 후보를 먼저 선별한다. 닭농장 MVP가 공개 배포될 수 있으므로, 1차 선택은 CC0 또는 명확한 attribution 라이선스를 우선한다.

1. 오픈소스 후보 중 `unit_chicken_basic`, `unit_dog_basic`, `unit_wolf_basic`, farm tiles/props를 먼저 고른다.
2. `unit_farmer`는 LPC generator 조합 또는 신규 생성 중 하나를 선택한다.
3. `icon_build`, `icon_stop`, `marker_move_command`, `marker_target_command`
4. `building_scaffold_4x4`, `building_scaffold_8x8`
5. `building_fence_wood`, `building_tower_scout`, `building_farm_house`, `building_coop_basic`
6. `unit_spider_basic`, `icon_egg`, `icon_coin`
7. `building_market`, `building_well_basic`
8. 방어/경제 upgrade line
9. 가족/보스/이벤트 NPC
10. map tile/doodad polish

이 순서는 현재 Construction Placement PoC 우선순위와 맞춘다. 먼저 농부/명령 UI/건설 중 상태/4개 배치 건물을 만들고, 그 다음 combat/economy asset으로 넘어간다.

## 7.1 오픈소스/무료 에셋 후보

조사일: 2026-07-08. 라이선스는 각 배포 페이지 표기를 기준으로 기록한다. 실제 repo import 전에는 다운로드 archive 안의 `LICENSE`, `CREDITS`, `README`를 다시 확인한다.

선택 기준:

- `CC0`는 repo에 포함하기 가장 쉽다.
- `CC-BY`, `OGA-BY`는 가능하지만 credits 파일과 asset manifest에 출처를 남긴다.
- `CC-BY-SA`, `GPL` 계열은 파생/결합물 배포 정책이 프로젝트 전체 배포 방식에 영향을 줄 수 있어 prototype/reference로 먼저 둔다.
- itch 무료판 중 `non-commercial only`, `no redistribution` 조건이 있는 것은 공개 repo에 직접 포함하지 않는다.

### 추천 후보

| 후보 | URL | 라이선스/조건 | 맞는 Asset ID | 장점 | 리스크/처리 |
| --- | --- | --- | --- | --- | --- |
| Kenney Tiny Farm | https://kenney.nl/assets/tiny-farm | CC0 | `tile_grass_base`, `tile_dirt_path`, farm props, placeholder buildings | farm/rpg/map 태그, 16x16 tile, repo 배포 부담이 낮다. | 현재 맵의 Kenney Tiny Town과 섞기 쉽지만 P0 유닛/건물 실루엣은 부족할 수 있다. |
| Kenney Tiny Town | https://kenney.nl/assets/tiny-town | CC0 | 현재 tileset 유지, village/overworld props | 이미 `games/chicken-farm/assets/tilesets/kenney-tiny-town/`에 들어간 계열이라 일관성 확보가 쉽다. | 닭농장 전용 닭/닭장/늑대 감성은 별도 보강 필요. |
| Kenney Animal Pack Redux | https://kenney.nl/assets/animal-pack-redux | CC0 | animal placeholder, `unit_dog_basic` 후보 | 2D animal/pet pack이고 CC0라 prototype import가 쉽다. | 실제 chicken/wolf 포함 여부와 방향 animation은 archive 확인 후 매핑한다. |
| OpenGameArt Chicken Sprites | https://opengameart.org/content/chicken-sprites | CC0 | `unit_chicken_basic`, chick/peck animation 후보 | 닭 전용 sprite sheet, walk/peck animation이 있어 PoC 7 경제 루프에 바로 맞다. | 기존 pixel scale과 palette가 Kenney Tiny 계열과 다르므로 palette/outline 정규화 필요. |
| OpenGameArt LPC style farm animals | https://opengameart.org/content/lpc-style-farm-animals | CC-BY 3.0 / GPL 2.0 | `unit_chicken_basic`, cow/pig/sheep future variants | walking/eating animation과 shadow가 있고 farm animal 구성이 풍부하다. | attribution 필수. GPL 대신 CC-BY 경로를 선택하고 credits 관리 필요. |
| OpenGameArt LPC Wolf Animation | https://opengameart.org/content/lpc-wolf-animation | CC-BY 4.0 / CC-BY 3.0 / OGA-BY 3.0 / GPL | `unit_wolf_basic`, wolf tier recolor 후보 | walk/run/bite/howl/die, 6 color sheet로 늑대 웨이브에 매우 잘 맞다. | attribution 필수. sheet frame mapping 작업 필요. |
| OpenGameArt LPC Cats and Dogs | https://opengameart.org/content/lpc-cats-and-dogs | CC-BY 3.0 / OGA-BY 3.0 / GPL / CC-BY-SA | `unit_dog_basic`, pet variants | 4방향 walk, 색상 variation, 닭농장 시작 개에 맞다. | attribution 필수. CC-BY 경로로 쓰고 credits를 남긴다. |
| OpenGameArt LPC Character Bases + Universal LPC Spritesheet Generator | https://opengameart.org/content/lpc-character-bases | CC-BY-SA 3.0 / GPL 3.0 | `unit_farmer`, `unit_spouse`, children 후보 | 농부/가족/상인형 humanoid를 generator로 빠르게 만들 수 있다. | share-alike/GPL 부담이 커서 MVP repo 포함 전 라이선스 정책 결정 필요. |
| OpenGameArt LPC Farming tilesets, magic animations and UI elements | https://opengameart.org/content/lpc-farming-tilesets-magic-animations-and-ui-elements | CC-BY-SA 3.0 / GPL 3.0 | fences, crops, market props, UI scroll blocks | 농장/시장/작물/울타리 reference가 풍부하다. | share-alike/GPL 부담. reference 또는 internal prototype 후보로 둔다. |

### 제공 후보 라이선스 결정표

분류 기준은 공개 웹 배포를 전제로 한 MVP의 보수적 운영 정책이다. 이는 법률 자문이 아니며, 실제 import 시 내려받은 파일 안의 라이선스·크레딧도 다시 대조한다.

| 분류 | 후보 | 라이선스 | 결정 |
| --- | --- | --- | --- |
| 즉시 후보 | [Grass and dirt tileset](https://opengameart.org/content/grass-and-dirt-tileset-warcraft-ii-style) | CC0 | 이미 지면에 적용. |
| 즉시 후보 | [Medieval Wooden Guard Tower](https://opengameart.org/content/medieval-wooden-guard-tower-isometric-25d) | CC0 | `building_tower_scout`의 첫 이소메트릭 2D sprite 후보. |
| 즉시 후보 | [Viking Archer Tower](https://opengameart.org/content/viking-archer-tower-low-poly) | CC0 | `building_tower_guard_*` 후보. base/roof/archer 분리 구성은 runtime layer로 활용 가능. |
| 즉시 후보 | [Medieval Fountain](https://opengameart.org/content/medieval-fountain-with-animated-water) | CC0 | 우물 또는 중앙 장식 후보. 애니메이션은 정적 sprite 도입 뒤 후속 적용. |
| 즉시 후보 | [Western-European Castle](https://opengameart.org/content/western-european-castle-isometric-25d) | CC0 | `building_town_hall` 또는 후반 landmark 후보. |
| 즉시 후보 | [Powers Icons](https://opengameart.org/content/powers-icons), [Explosion](https://opengameart.org/content/explosion) | CC0 | command card icon·전투 FX 후보. |
| 출처 표기 후 후보 | [Old Well](https://opengameart.org/content/old-well-bleeds-game-art), [Timbered House](https://opengameart.org/content/timbered-house) | CC-BY 3.0 | 저자(Bleed), URL, CC-BY 3.0을 credits와 asset manifest에 기록한 경우만 import. |
| 다운로드 검사 후 결정 | [RPG Tilesets pack](https://opengameart.org/content/rpg-tilesets-pack) | 페이지 표기는 CC0 | 16×16이라 기술적으로 좋지만, 게시물 댓글에 과거 라이선스 우려가 남아 있다. archive 내용과 제외 파일을 확인하기 전에는 import하지 않는다. |
| 현재 제외 | [16x16 RPG Tileset](https://opengameart.org/content/16x16-rpg-tileset) | CC-BY-SA 3.0 / GPL 3.0 | 공개 MVP의 에셋 정책과 맞지 않는다. |
| 현재 제외 | [Medieval Building Tiles](https://opengameart.org/content/medieval-building-tiles) | GPL 2.0 / GPL 3.0 / CC-BY-SA 3.0 | 공개 MVP의 에셋 정책과 맞지 않는다. |
| 현재 제외 | [6 Isometric buildings](https://opengameart.org/content/6-isometric-buildings) | CC-BY-SA 3.0 | 공개 MVP의 에셋 정책과 맞지 않는다. |

### 보류 후보

| 후보 | URL | 조건 | 판단 |
| --- | --- | --- | --- |
| Sprout Lands - Asset Pack | https://cupnooble.itch.io/sprout-lands-asset-pack | 무료판은 non-commercial only, premium은 상업 사용 가능하지만 resell/redistribution 금지 | 스타일은 좋고 chicken update가 있지만, 공개 repo에 직접 포함하기 어렵다. 유료 prototype 또는 스타일 reference 후보. |
| Cozy Farm Asset Pack | https://shubibubi.itch.io/cozy-farm | 무료판은 non-commercial only, full version은 결제형 | cute top-down farm 감성은 맞지만 오픈소스 배포용 직접 import 후보는 아니다. 스타일 reference 후보. |

### 선택지

| 선택지 | 구성 | 장점 | 단점 | 추천도 |
| --- | --- | --- | --- | --- |
| A. CC0 우선 | Kenney Tiny Farm/Tiny Town + OGA Chicken Sprites | 라이선스 부담이 가장 작고 바로 repo에 넣기 쉽다. | dog/wolf/farmer는 별도 제작 또는 attribution 후보가 필요하다. | 1차 추천 |
| B. LPC 전투/동물 세트 | OGA LPC chicken/dog/wolf/farmer 계열 | 유닛 animation이 풍부하고 4방향 이동/공격이 준비되어 있다. | credits와 라이선스 관리가 필수이고 일부 share-alike/GPL 후보는 조심해야 한다. | 전투 PoC용 추천 |
| C. Kenney tile + LPC unit 혼합 | Kenney 맵/props + OGA LPC animal/enemy | 현재 타일맵을 유지하면서 닭/개/늑대만 빠르게 실체화할 수 있다. | pixel density와 palette 보정이 필요하다. | 현실적 추천 |
| D. itch cozy pack | Sprout Lands/Cozy Farm paid/free | 화면 분위기는 가장 농장답다. | 공개 repo 직접 포함과 재배포가 까다롭다. | 보류 |

### 현재 권장 결정

1. 지면 다음의 건물 에셋 패스는 CC0 `Medieval Wooden Guard Tower`로 시작한다. `building_tower_scout`에 2D sprite adapter와 y-depth 자동 측정을 먼저 연결한다.
2. 늑대와 개는 `OpenGameArt LPC Wolf Animation`, `OpenGameArt LPC Cats and Dogs`를 attribution 포함 후보로 둔다.
3. 농부는 당장 LPC Character Bases를 넣기보다, `unit_farmer`만 신규 생성/수작업 보정하거나 generator 결과를 internal prototype으로 비교한다.
4. 최종 repo import 전에 `games/chicken-farm/assets/THIRD_PARTY_ASSETS.md`를 만들고 asset id, source URL, author, license, local file path를 기록한다.

## 8. 품질 체크리스트

- 64px preview에서 역할이 구분되는가
- 같은 카테고리 안에서 palette와 light direction이 일관되는가
- runtime selection ring과 HP bar가 겹치지 않게 여백이 있는가
- 건물 footprint와 시각 크기가 크게 어긋나지 않는가
- 건물 sprite anchor가 footprint bottom center 기준으로 맞는가
- construction scaffold가 완성 건물과 명확히 구분되는가
- 64px placement snap에서 건물 바닥이 grid에 어색하게 떠 보이지 않는가
- 32px footprint cell과 64px placement snap의 차이가 asset scale에 반영되었는가
- silhouette가 기존 유명 게임 asset과 혼동되지 않는가
- alpha edge가 지저분하지 않은가
- 최종 sprite sheet packing 전에 anchor point가 통일되었는가

## 9. 보류

- 최종 animation frame 수는 Player Command Control PoC 이후 결정한다.
- 타일셋 전면 교체는 MVP core loop가 안정된 뒤 진행한다.
- 생성 이미지가 바로 법적/상업적 사용 가능하다는 전제로 두지 않는다. 공개 배포 전에는 사용 권리, 모델 정책, 유사성 리스크를 별도 검토한다.
