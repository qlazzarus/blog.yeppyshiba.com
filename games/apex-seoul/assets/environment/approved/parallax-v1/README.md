# Apex Seoul Parallax v1

## Runtime assets

| File | Layer | Source |
| --- | --- | --- |
| `ridge-near-blueblack.png` | 가까운 산·수목 능선 | `source/oga-mountains-trees` |
| `buildings-mid-blueblack.png` | 중간 거리 건물 (보관, 현재 runtime 미사용) | `source/oga-mountains-buildings` |
| `buildings-mid-lights-bluewhite.png` | 중간 거리 창문 불빛 overlay (보관) | `source/oga-mountains-buildings` |
| `city-far-blueblack.png` | 가장 먼 도시와 점광 | `source/oga-skyline` |
| `city-far-lights-bluewhite.png` | 가장 먼 도시 불빛 overlay | `source/oga-skyline` |
| `moon-cool-blue.png` | sky layer의 청색 반달 | `source/oga-moon-overlay` |
| `cloud-dark-blue.png` | sky layer의 어두운 투명 구름 strip | `source/oga-transparent-clouds` |

All sources are CC0. `scripts/build-parallax-assets.mjs` generates the candidates using deterministic resize, palette conversion, alpha extraction, and strip composition. The generated point-light overlays only place lights inside opaque source building pixels, letting runtime flicker lights without fading the building silhouettes.

오른쪽 옹벽 위 수목은 이 PNG strip 세트에 포함하지 않는다. 프로젝트 소유의 투명 SVG 5종은 `../wall-forest-svg/`에 두고, 런타임이 세그먼트별 back/front 군집으로 배치한다.

## Runtime constraints

- Each strip is `1600px` wide for a `1200px` viewport plus constrained lateral overscan.
- Far / mid / ridge use separate look-ahead distances and offsets; they do not infinite-scroll with vehicle speed.
- The images are black/blue palette derivatives, not copies of real Seoul architecture.
