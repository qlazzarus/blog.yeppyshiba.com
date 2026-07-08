# Chicken Farm Sprite Asset Generation Plan

이 문서는 Chicken Farm Phaser MVP에서 필요한 스프라이트/아이콘 에셋을 정리하고, 차후 GPT 이미지 생성을 통해 일관된 원본 후보를 만들기 위한 프롬프트 기준을 정의한다.

## 1. 방향

GPT 이미지 생성은 최종 game-ready sprite를 한 번에 뽑는 용도가 아니라, **원본 후보 생성 + 후처리 + sprite sheet 정규화** 파이프라인의 앞단으로 사용한다.

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

## 2. 공통 스타일 가이드

프로젝트는 원본 Warcraft III 유즈맵의 룰 감각을 참고하지만, 원본 에셋/아이콘/모델/명칭을 복제하지 않는다.

공통 방향:

- 오리지널 stylized top-down fantasy farm defense
- 작은 화면에서도 읽히는 큼직한 실루엣
- 따뜻한 농장 색감과 어두운 밤 방어 분위기가 공존
- 건물은 footprint가 읽히도록 위에서 약간 내려다본 3/4 top-down view
- 유닛은 mobile/web 화면에서도 식별되도록 머리/몸/무기/역할이 명확해야 함
- 선택 ring, HP bar, range indicator, shadow는 가능하면 runtime에서 별도 처리

공통 positive prompt:

```text
original stylized top-down fantasy farm defense game sprite, chunky readable silhouette, 3/4 top-down view, hand-painted texture feel, warm rural palette, slightly whimsical but survival-defense mood, clean transparent background, game-ready concept sprite, not based on any existing game asset
```

공통 negative prompt:

```text
no text, no logo, no watermark, no UI frame, no health bar, no selection circle, no existing game character, no Warcraft asset, no photorealism, no isometric city builder scale, no background scene, no cropped object
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
- 건물 sprite는 footprint 바닥 중심에 anchor를 맞춘다. 지붕/장식은 footprint 밖으로 살짝 올라와도 되지만, 바닥 접촉부는 footprint 안에서 읽혀야 한다.
- HP bar, 건설 progress bar, selection outline, range indicator는 runtime overlay로 처리한다.
- 워3식 하단 정보 패널에 쓰는 건물 portrait는 1차에서는 `iconId`를 재사용한다. 필요하면 후속으로 `portraitId`를 manifest에 추가한다.

## 3.1 Building Data and Asset Manifest Fields

건설 PoC 이후 건물은 데이터와 에셋이 같은 id 체계를 공유해야 한다. `buildingTemplates.ts`의 building id마다 아래 manifest 필드를 매핑한다.

```ts
type BuildingAssetManifestEntry = {
    readonly id: MvpBuildingId;
    readonly spriteId: string;
    readonly constructionSpriteId: string;
    readonly iconId: string;
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

### P0. 현재/다음 PoC 필수

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

Create one {building_name} building sprite for a top-down farm defense game.
Gameplay role: {gameplay_role}.
Footprint: {footprint_cells} grid cells.
Runtime footprint: {runtime_footprint_px}.
Source sprite size: {source_size_px}.
Visual traits: {visual_traits}.
The building must read clearly from top-down view, fit inside a square sprite, have no background, and leave space around the base for runtime selection/placement indicators. The base should align to a footprint-bottom-center anchor.

{COMMON_NEGATIVE_PROMPT}
```

예시:

```text
original stylized top-down fantasy farm defense game sprite, chunky readable silhouette, 3/4 top-down view, hand-painted texture feel, warm rural palette, slightly whimsical but survival-defense mood, clean transparent background, game-ready concept sprite, not based on any existing game asset

Create one small wooden watch tower building sprite for a top-down farm defense game.
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

1. P0 import는 `Kenney Tiny Farm`과 `OpenGameArt Chicken Sprites`를 먼저 검증한다.
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
