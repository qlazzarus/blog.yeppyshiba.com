# Apex Seoul Render Layer Tracker

이 문서는 Apex Seoul의 Phaser 렌더 순서와 레이어 충돌을 추적하는 작업 기준이다. CSS `z-index`가 아니라 Phaser Game Object의 `setDepth()`와 같은 `Graphics` 객체 안의 draw 순서가 실제 화면 순서를 결정한다.

## 운영 원칙

- 모든 Phaser depth는 `src/game/renderDepth.ts`의 `RenderDepth` enum으로만 선언한다. 같은 화면 관계에 creation order를 사용하지 않는다.
- 임의의 depth 숫자를 개별 수정하지 않는다. 먼저 이 문서의 레이어 대역과 소유 객체를 갱신한다.
- 원근에 따른 가림은 가능한 한 같은 월드 렌더 패스 안에서 처리한다. 화면 전체 effect와 UI는 월드 오브젝트의 가림 규칙을 대신하지 않는다.
- 같은 `Graphics` 객체에 기록된 도형은 Phaser depth로 분리할 수 없다. 분리된 가림 관계가 필요하면 `Graphics` 객체 또는 render pass를 분리한다.
- 동적 horizon/crest 가림은 road와 roadside의 지상 접점 규칙에는 적용하되, 이미 가시 판정을 통과한 옹벽 위 숲을 화면 전체의 어두운 띠로 다시 덮지 않는다.
- 도로와 모든 roadside object는 동일한 world-distance fog(`600z → 4300z`)를 공유한다. 멀리 있는 도로만 어두워지고 rail·wall·forest가 남는 상태를 허용하지 않는다.

## 현재 레이어 인벤토리

| Depth | 소유 객체 / 파일 | 내용 | 내부 또는 생성 순서 | 상태 |
| ---: | --- | --- | --- | --- |
| 0 | `backgroundGraphics` / `src/main.ts` | sky fill, haze, horizon 아래 base fill | 배경 도형 | 운영 중 |
| 0.50 | `moon` | 달 | sky sprite | 운영 중 |
| 0.60 / 0.61 | `farCloud` / `nearCloud` | 원·근경 구름 | sky sprite | 운영 중 |
| 1.00 / 1.01 / 1.20 | far city / city lights / near ridge | 도시 원경 패럴랙스 | sprite | 운영 중 |
| 1.85 | `terrainHorizonOcclusionGraphics` | 동적 horizon occlusion band | 별도 terrain pass | P0 적용 |
| 1.90 / 1.95 | `wallForestSprites` | SVG 수목 back/front 군집 | 별도 sprite | P0 적용 |
| 2.00 | `graphics` | road, shoulder, lane, 옹벽·가드레일·표지판, 접지 patch | road → roadside object → 접지 patch | 과밀 |
| 4.35 | `speedEffectShader` | screen-space speed streak | additive shader | 운영 중 |
| 4.80 / 5.00 | soft / silhouette player shadow | 차량 그림자 | sprite | 운영 중 |
| 6.00 / 6.10 | `foregroundOcclusionGraphics` / `playerCar` | 좌·우·하단 foreground matte / 플레이어 차량 | 명시적 depth 분리 | 운영 중 |
| 7.00 | `uiGraphics` | course progress | UI 도형 | 운영 중 |
| 8.00 | `hudText` | 디버그 HUD | text | 운영 중 |

현재 `hud.ts`는 text를 depth 10으로 생성하지만, 씬 생성부가 곧바로 8로 덮어쓴다. 실제 기준은 8이다.

## 현재 월드 렌더 패스

```text
background graphics
  → sky / city / ridge sprites
  → terrain horizon occlusion Graphics (1.85)
  → wall-top forest back/front sprites (1.90 / 1.95)
  → world Graphics (2.00)
      road: far segment → near segment
      road objects: far object → near object
      player contact patch
  → speed shader
  → player shadows → player car
  → foreground matte → UI
```

`wallForestSprites`는 SVG 수목 5종을 세그먼트 인덱스 기반으로 결정적으로 섞은 back/front 군집이다. world Graphics보다 낮은 depth이므로 옹벽·도로에는 가려지지만, 별도 terrain pass로 분리한 horizon band에는 더 이상 가려지지 않는다. Graphics 내부의 object 정렬(`wall-tree → wall span → rail span → post/reflector/chevron`)은 별도 Sprite인 숲에는 적용되지 않는다.

수목은 `7600z → 9800z` 원거리 범위에서 smooth alpha fade-in을 적용한다. object draw distance 경계에서 전체 alpha로 생성되는 pop-in을 막되, crest visibility에 따른 실제 지형 reveal 규칙은 바꾸지 않는다.

## 충돌 위험 백로그

| 우선순위 | 증상 / 충돌 | 현재 원인 | 안전한 해결 방향 | 완료 판정 |
| --- | --- | --- | --- | --- |
| **P0** | 옹벽 위 숲이 지평선과 배경 사이의 어두운 horizon band에 잘려, 화면 중간을 가로지르는 검은 선처럼 보인다. | 숲은 depth 1.95지만 `horizonOcclusionY` band는 `graphics`(depth 2)에 road와 함께 그려져 숲을 덮었다. | horizon occlusion을 road/world Graphics에서 분리해 **숲 아래**, 배경·city/ridge 위의 전용 terrain-occlusion pass(depth 1.85)로 이동했다. 숲은 계속 옹벽/road 아래에 둔다. | 내리막·crest·좌우 커브에서 숲의 base가 옹벽 coping에 붙고, horizon band가 숲 몸통을 직선으로 자르지 않는다. road projection gap은 계속 숨겨진다. |
| P1 | 단일 `graphics`가 road·roadside·접지 patch까지 소유해 object별 depth 정책을 적용할 수 없다. | Phaser depth는 Graphics 객체 단위이며 내부 도형에는 적용되지 않는다. | `road`, `roadside`, `terrain occlusion`, `contact patch`의 책임을 별도 pass로 분리한다. P0 분리 뒤에 범위를 결정한다. | 새 object를 추가할 때 어느 pass에 속하는지 명시할 수 있고, pass 간 가림 관계가 문서 표와 일치한다. |
| P1 | 먼 roadside object가 near road 형상과 다른 패스에서 합성되어 원근 가림이 어긋날 수 있다. | road 전체를 그린 뒤 roadside 전체를 그린다. | 원근을 유지해야 하는 object는 road slice와 같은 거리 순서로 합성하거나, 필요한 경우 segment별 pass를 둔다. | 급커브·고저차 QA에서 먼 object가 가까운 road/옹벽 위로 비정상적으로 올라오지 않는다. |
| P2 | foreground matte와 player car가 둘 다 depth 6이다. | 동 depth는 생성 순서로 결정되며 player가 matte 뒤에 생성된다. | **해결:** `ForegroundMatte = 6`, `Player = 6.1`로 명시 분리했다. | 차량은 foreground matte 위에 일관되게 표시된다. |
| P2 | speed shader가 road와 roadside 위에 표시된다. | shader depth 4.35가 world Graphics보다 높다. | 셰이더가 asphalt만 밝히도록 mask를 강화하거나 road 전용 pass와 결합한다. | 가드레일·옹벽·표지판에 road glint가 눈에 띄게 번지지 않는다. |
| P3 | HUD depth가 두 곳에서 서로 다르게 선언된다. | 생성 함수 10, 씬에서 8로 재설정. | 레이어 상수를 단일 소스로 만들고 HUD는 그 값만 사용한다. | 추적 표·코드·실제 depth가 일치한다. |

## P0: 옹벽 위 숲 / horizon occlusion 분리 설계

**구현 상태: 적용됨, 수동 시각 QA 대기.** `renderRoad()`는 이제 horizon occlusion draw를 끌 수 있고, 씬은 `renderHorizonOcclusion()`을 terrain 전용 Graphics에 호출한다. 게임 object와 HUD·shader도 `RenderDepth` enum을 사용한다.

### 관찰된 현상

첨부 화면처럼 옹벽 위 숲 실루엣이 살아 있어야 할 높이에서, horizon과 배경의 경계를 가리는 어두운 수평 band가 숲을 덮는다. 이는 에셋 투명도나 도시 패럴랙스 문제가 아니라 현재 depth 순서의 직접적인 결과다.

### 유지할 관계

```text
background · city · ridge
  → terrain horizon occlusion band
  → wall-top forest
  → retaining wall · road · guardrail
  → player
  → UI
```

이 순서는 숲을 배경/원경과 구분하면서도 옹벽과 도로 앞에는 나오지 않게 한다. 숲의 지상 접점은 기존처럼 crest visibility envelope로 먼저 판정한다. 즉 crest 뒤의 숲을 새로 노출하는 변경이 아니라, **이미 표시할 숲을 horizon fill이 재차 가리는 문제만 제거**한다.

### 구현 전 확인 항목

- `drawHorizonOcclusion()`을 `roadRenderer.ts`의 road 본체 draw와 분리할 수 있는 최소 API를 정한다. 예: 계산된 `horizonOcclusionY`는 유지하고 draw 대상 Graphics만 scene에서 선택한다.
- 새 terrain-occlusion Graphics는 `nearRidgeParallax`(1.2)보다 높고 `wallForestSprites`(1.95)보다 낮은 대역에 둔다. 초기 제안 depth는 `1.85`다.
- road와 roadside가 동일 crest envelope를 쓰는 기존 가시성 규칙은 변경하지 않는다.
- 동적 band의 색·alpha·높이는 유지한다. P0의 범위는 layer 분리이며 art tuning이 아니다.

### QA 매트릭스

| 장면 | 확인할 것 |
| --- | --- |
| downhill straight | 숲이 horizon band에 수평으로 절단되지 않으며 도로 gap은 보이지 않는다. |
| crest approach / crossing | crest 뒤 숲은 기존 envelope대로 숨고, reveal 때 base가 옹벽 상단에서 자연스럽게 열린다. |
| 좌·우 sharp curve | 숲이 옹벽 앞이나 road 위로 튀어나오지 않고, 배경 도시와의 원근도 유지한다. |
| camera shake / speed effect | terrain band와 forest가 shake 정책상 의도치 않게 서로 어긋나지 않는다. |

## 관련 코드

- `games/apex-seoul/src/main.ts`: scene object 생성, frame render pass, forest sprite 동기화
- `games/apex-seoul/src/game/roadRenderer.ts`: road render 및 `drawHorizonOcclusion()`
- `games/apex-seoul/src/game/roadObjectRenderer.ts`: roadside projection, crest visibility, object 내부 정렬
- `games/apex-seoul/src/game/speedEffectShader.ts`: speed effect depth
- `docs/apex-seoul-visual-direction.md`: 배경·crest·옹벽 위 숲의 시각 방향
