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
4. anchor point를 통일한다.
5. footprint grid에 맞춰 scale을 정규화한다.
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
| 4x4 건물 | `256x256` | 마을회관, 신전 |
| UI 아이콘 | `96x96` source -> `48x48` runtime | ability/shop/reward |

## 4. 우선순위별 Asset Manifest

### P0. 현재/다음 PoC 필수

| Asset ID | 용도 | 타입 | 크기 | 프롬프트 키워드 |
| --- | --- | --- | ---: | --- |
| `unit_farmer` | 조작 캐릭터 `H000` 대응 | unit | `96x96` | sturdy farmer, simple tool belt, straw cap, readable from top-down |
| `unit_dog_basic` | 시작 개 `n002` 대응 | unit | `64x64` | loyal farm dog, alert stance, compact silhouette |
| `unit_wolf_basic` | 일반 늑대 baseline | unit | `64x64` | lean hungry wolf, dark gray fur, aggressive posture |
| `unit_spider_basic` | 초반 거미 사냥 | unit | `64x64` | oversized field spider, readable legs, not horror realistic |
| `building_fence_wood` | 기본 울타리 | building | `64x128` | wooden fence segment, defensive farm barricade |
| `building_tower_scout` | 초반 스카우트 타워 | building | `128x128` | small wooden watch tower, farm defense, simple roof |
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
| `building_coop_basic` | 기본 닭장 | building | `192x192` | small chicken coop, hay, red-brown wood |
| `building_coop_mid` | 중급 닭장 | building | `192x192` | upgraded chicken house, more sturdy, farm machinery hints |
| `building_coop_high` | 고급 양계장 | building | `192x192` | advanced fantasy poultry house, clean roof, premium look |
| `building_egg_storage` | 알 보관소 | building | `128x128` | small egg storage shed, crates of eggs |
| `icon_egg` | 알 resource | icon | `96x96` | single shiny egg, warm highlight |
| `icon_coin` | coin resource | icon | `96x96` | simple gold coin, farm market token |
| `icon_upgrade` | 업그레이드 | icon | `96x96` | upward arrow with hammer, rustic fantasy |

### P2. Core Buildings and Shop

| Asset ID | 용도 | 타입 | 크기 | 프롬프트 키워드 |
| --- | --- | --- | ---: | --- |
| `building_farm_house` | 농가 | building | `192x192` | cozy farm house, defensive homestead |
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
Visual traits: {visual_traits}.
The building must read clearly from top-down view, fit inside a square sprite, have no background, and leave space around the base for runtime selection/placement indicators.

{COMMON_NEGATIVE_PROMPT}
```

예시:

```text
original stylized top-down fantasy farm defense game sprite, chunky readable silhouette, 3/4 top-down view, hand-painted texture feel, warm rural palette, slightly whimsical but survival-defense mood, clean transparent background, game-ready concept sprite, not based on any existing game asset

Create one small wooden watch tower building sprite for a top-down farm defense game.
Gameplay role: early defensive tower.
Footprint: 2x2 grid cells.
Visual traits: wooden legs, compact lookout platform, simple red-brown roof, tiny farm-defense banner, readable attack tower silhouette.
The building must read clearly from top-down view, fit inside a square sprite, have no background, and leave space around the base for runtime selection/placement indicators.

no text, no logo, no watermark, no UI frame, no health bar, no selection circle, no existing game character, no Warcraft asset, no photorealism, no isometric city builder scale, no background scene, no cropped object
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

1. `unit_farmer`, `unit_dog_basic`
2. `marker_move_command`, `marker_target_command`, `icon_stop`
3. `unit_wolf_basic`, `building_fence_wood`, `building_tower_scout`
4. `unit_chicken_basic`, `building_coop_basic`, `icon_egg`, `icon_coin`
5. `building_farm_house`, `building_market`, `building_well_basic`
6. 방어/경제 upgrade line
7. 가족/보스/이벤트 NPC
8. map tile/doodad polish

이 순서는 현재 PoC 우선순위와 맞춘다. 먼저 War3 Player Command Control PoC에 필요한 조작 유닛/명령 feedback을 만들고, 그 다음 PoC 7 economy asset으로 넘어간다.

## 8. 품질 체크리스트

- 64px preview에서 역할이 구분되는가
- 같은 카테고리 안에서 palette와 light direction이 일관되는가
- runtime selection ring과 HP bar가 겹치지 않게 여백이 있는가
- 건물 footprint와 시각 크기가 크게 어긋나지 않는가
- silhouette가 기존 유명 게임 asset과 혼동되지 않는가
- alpha edge가 지저분하지 않은가
- 최종 sprite sheet packing 전에 anchor point가 통일되었는가

## 9. 보류

- 최종 animation frame 수는 Player Command Control PoC 이후 결정한다.
- 타일셋 전면 교체는 MVP core loop가 안정된 뒤 진행한다.
- 생성 이미지가 바로 법적/상업적 사용 가능하다는 전제로 두지 않는다. 공개 배포 전에는 사용 권리, 모델 정책, 유사성 리스크를 별도 검토한다.
