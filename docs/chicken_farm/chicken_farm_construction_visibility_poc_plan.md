# Chicken Farm Construction Visibility PoC Plan

이 문서는 현재 Construction Placement PoC의 카메라 zoom과 맵 거리감은 유지하면서, 실제 조작 대상의 시인성을 높이는 P0 작업을 정리한다.

목표는 "확대해서 크게 보이게 만들기"가 아니라, Warcraft III식 넓은 시야와 닭농장 맵 기준을 유지한 상태에서 유닛, 건물, 건설 상태, 명령 피드백을 읽기 쉽게 만드는 것이다.

## 1. 결정 사항

- 카메라 zoom은 현재 닭농장 맵 기준값을 유지한다.
- footprint, collision, blocker, pathing 판정은 W3X `pathTex`와 runtime grid 기준을 바꾸지 않는다.
- 시인성 개선은 render scale, overlay, stroke, bar 최소 크기, focus pulse, HUD 정보 우선순위로 처리한다.
- `P3 PLAYER` debug marker는 계속 기본 비활성화한다. 실제 조작 대상은 controllable `farmer`/`dog`다.
- 이번 PoC는 최종 sprite 품질 작업이 아니다. 임시 shape/sprite 상태에서도 조작 판독성을 먼저 올린다.

## 2. 현재 문제

현재 zoom 기준에서 한 화면은 월드 기준 약 `2048 x 1152px`, 즉 `16 x 9 major tiles`를 보여준다. 이 기준은 농장/스폰/중앙 허브 거리감 검증에는 필요하지만, 건설 PoC 조작에는 다음 문제가 있다.

| 영역 | 현재 상태 | 문제 |
| --- | --- | --- |
| 유닛 | 농부/개 임시 shape와 선택 ring | 넓은 화면에서 현재 선택 대상과 작업자가 잘 안 보인다. |
| 건물 | footprint 크기의 반투명 rectangle | 4x4/8x8 footprint는 맞지만 완성/건설/paused 차이가 약하다. |
| HP/progress bar | footprint width 기준 얇은 bar | zoom 축소 상태에서 bar 높이와 진행률이 작다. |
| placement ghost | fill `0.24`, stroke `2px` | valid/blocked 상태는 보이나 타일 위에서 대비가 낮다. |
| queued marker | 작은 circle + 번호 | 짧게 사라지고, 건설 예약과 이동 예약 구분이 약하다. |
| 선택 정보 | 하단 panel 표시 | 지도 위의 현재 대상 위치와 하단 정보가 시각적으로 연결되지 않는다. |

## 3. P0 구현 범위

### 3.1 Unit Readability

목표:

- 농부/개가 실제 조작 대상임을 화면에서 즉시 알아볼 수 있게 한다.

구현 후보:

- selection ring은 현재 zoom과 무관하게 최소 화면 크기를 갖도록 보정한다.
- selected unit 아래에 짧은 pulsing ground ring을 추가한다.
- farmer는 builder 역할이므로 dog보다 더 따뜻한 색과 hammer/tool icon overlay를 둔다.
- build command 수행 중인 farmer에는 작은 작업 아이콘 또는 amber outline을 표시한다.
- idle/working/moving/queued 상태를 label 텍스트보다 stroke/ring 색으로 먼저 구분한다.

P0 완료 기준:

- P3 farm zone 화면에서 농부와 개가 겹치지 않고 구분된다.
- 농부를 선택한 상태와 건설 작업 중 상태가 지도 위에서 바로 구분된다.
- 하단 정보 패널을 보지 않아도 현재 선택 유닛 위치를 찾을 수 있다.

### 3.2 Building And Construction Readability

목표:

- planned, constructing, paused, complete 상태를 지도 위에서 구분한다.

구현 후보:

- 건물 body alpha만 바꾸지 말고 state별 stroke 색과 stroke 두께를 명확히 둔다.
- constructing은 scaffold hatch/cross-line pattern을 overlay한다.
- paused construction은 amber dashed/pulse stroke를 둔다.
- complete는 alpha를 올리고 HP bar만 남긴다.
- selected building에는 footprint 바깥쪽에 별도 selection outline을 표시한다.
- building label은 항상 표시하지 않고 selected/hover/constructing 상태에서 우선 표시한다.

P0 완료 기준:

- 건설 중 건물과 완성 건물이 같은 색 사각형처럼 보이지 않는다.
- paused construction은 worker가 없다는 것을 지도 위에서 알 수 있다.
- 건설 중 건물을 클릭해야 하는 resume/cancel 루프가 시각적으로 자연스럽다.

### 3.3 Bar Minimum Size

목표:

- HP bar와 construction progress bar를 현재 zoom에서도 읽을 수 있게 한다.

구현 후보:

- bar height는 최소 화면 크기 기준을 둔다. zoom이 낮아도 4~6 screen px 이상으로 보이게 보정한다.
- 4x4 건물도 progress bar가 너무 얇지 않게 최소 world height를 둔다.
- construction progress fill은 amber, HP fill은 green, blocked/damaged는 red 계열로 고정한다.
- paused 상태에서는 progress bar 뒤에 amber stroke 또는 pause tick mark를 넣는다.

P0 완료 기준:

- 4x4 `tower_scout`/`coop_basic`의 construction percent가 시각적으로 읽힌다.
- progress와 HP bar가 겹치지 않는다.
- 하단 panel의 percent와 지도 위 progress가 같은 상태로 보인다.

### 3.4 Placement Ghost Contrast

목표:

- 배치 가능/불가능/예약 상태가 현재 타일 위에서 확실히 보인다.

구현 후보:

- valid ghost: green fill + thick bright outer stroke + subtle corner ticks.
- blocked ghost: red fill + thick red outer stroke + diagonal hatch.
- pending build site: yellow/amber outline과 sequence number.
- Shift 연속 배치 중에는 active ghost와 pending site를 색으로 구분한다.
- reject 시 짧은 red pulse marker와 reason text 후보를 표시한다.

P0 완료 기준:

- valid/blocked ghost가 색약 환경까지 완전히 해결할 필요는 없지만, fill 색만으로 판단하지 않는다.
- 64px snap grid 위에서 footprint 크기와 배치 기준점이 명확하다.
- Shift 건설 예약이 여러 개 찍혔을 때 순서를 읽을 수 있다.

### 3.5 Focus Pulse And Command Feedback

목표:

- 넓은 화면에서 현재 조작 대상과 명령 대상의 연결을 빠르게 찾게 한다.

구현 후보:

- 유닛 선택, 건물 선택, resume target, build order accepted 시 0.4~0.8초 pulse를 띄운다.
- command marker는 move/attack/build/resume마다 색과 shape를 다르게 둔다.
- queued command marker는 번호 표시 시간을 늘리고, 마지막 명령만이 아니라 queue 전체가 잠깐 보이게 한다.
- 건설 예약은 movement queue marker와 구분되는 hammer/build icon shape를 사용한다.

P0 완료 기준:

- 농부 선택 후 `B -> T -> 클릭`했을 때 농부 이동, 부지, 착공 상태가 연결되어 보인다.
- pause된 건물 우클릭 resume 시 어떤 건물로 복귀하는지 pulse로 확인된다.
- 이동 예약과 건설 예약이 같은 작은 점으로 보이지 않는다.

## 4. 코드 Touchpoint

우선 수정 후보:

| 파일 | 현재 역할 | P0 수정 방향 |
| --- | --- | --- |
| `games/chicken-farm/src/game/systems/controllableUnitSystem.ts` | 유닛 view, selection ring, queued marker | unit ring 최소 크기, selected/working pulse, command marker shape 분리 |
| `games/chicken-farm/src/game/systems/buildingSystem.ts` | building body, HP/progress bar, label | state별 overlay, bar 최소 크기, selected building outline API |
| `games/chicken-farm/src/game/systems/constructionPlacementSystem.ts` | placement ghost, pending order graphics | ghost contrast, hatch/corner ticks, pending sequence marker |
| `games/chicken-farm/src/main.ts` | selection info, selectedBuildingId, pointer flow | selection/focus pulse trigger, building selection outline wiring |
| `games/chicken-farm/src/game/ui/farmHud.ts` | resource/selection info/debug/command card | 하단 정보는 유지하되 지도 위 feedback과 중복되는 설명은 줄임 |

후속 분리 후보:

- `constructionVisualFeedbackSystem.ts`
- `commandMarkerRenderer.ts`
- `selectionOverlayRenderer.ts`

P0에서는 새 파일을 만들기보다 기존 시스템 안의 렌더링 상수를 정리해도 된다. 반복 로직이 늘어나면 위 renderer로 분리한다.

## 5. 구현 순서

1. State color/stroke token을 정한다.
2. `BuildingSystem`의 건물 body/progress/HP bar 시인성을 먼저 보강한다.
3. `ConstructionPlacementSystem`의 ghost valid/blocked/pending 표시를 보강한다.
4. `ControllableUnitSystem`의 selected/working/queued marker를 보강한다.
5. `main.ts`에서 selection/build/resume 이벤트에 focus pulse를 연결한다.
6. desktop viewport에서 P3 farm zone 기준 screenshot 또는 수동 확인을 남긴다.

권장 색상 역할:

| 역할 | 색 |
| --- | --- |
| selected | green |
| working/building | amber |
| valid placement | green |
| blocked placement | red |
| pending/queued build | yellow |
| move command | blue-green |
| attack/hostile | red-orange |
| paused | amber + pulse |

## 6. 검증 체크리스트

- P3 farm zone 시작 화면에서 farmer/dog/building이 `P3 PLAYER` debug marker 없이 잘 보인다.
- `B -> F/T/H/C` placement ghost가 타일 위에서 명확하다.
- valid/blocked placement는 fill 색 없이도 stroke/hatch로 구분된다.
- Shift로 건설 예약을 여러 개 찍었을 때 순서가 보인다.
- 농부가 건설 현장으로 이동 중인지, 작업 중인지, paused인지 구분된다.
- 건설 중 건물을 선택하지 않아도 progress가 보이고, 선택하면 하단 정보와 지도 위 상태가 일치한다.
- pause된 건물을 우클릭 resume할 때 target building이 pulse된다.
- zoom, footprint, blocker, pathing 수치는 바뀌지 않는다.

## 7. 이번 PoC에서 하지 않는 것

- 최종 sprite asset 교체.
- 모든 건물별 고유 animation.
- 색약 접근성 완성판.
- 모바일 viewport 최적화.
- combat 재활성화.
- production queue UI.

이 문서의 P0가 통과한 뒤, sprite asset manifest와 실제 bitmap asset을 붙이면 된다.

## 8. 구현 스냅샷

2026-07-03 기준 반영:

- `BuildingSystem`
  - 건물 HP/progress bar 높이를 키우고, HP와 건설 progress가 겹치지 않게 상단 간격을 벌렸다.
  - 건물 HP bar를 검은 슬롯 + inset HP fill 구조로 바꾸고, 체력 비율별 green/yellow/red fill을 적용했다.
  - complete/constructing/paused 상태별 stroke 색과 두께를 분리했다.
  - constructing 상태에는 hatch overlay를 추가하고, paused 상태는 더 강한 amber outline으로 표시한다.
  - complete 건물은 내부 gold outline만 남기고, 건물 label은 constructing 상태 중심으로 표시한다.
- `ConstructionPlacementSystem`
  - placement ghost에 thick outer stroke, inner stroke, corner tick을 추가했다.
  - blocked placement는 red fill만 의존하지 않고 diagonal hatch로 구분한다.
  - pending build site는 amber outline, corner tick, badge, target line으로 이동 예약 marker와 구분한다.
  - build order accepted/resume order issued 시 footprint pulse를 표시한다.
- `ControllableUnitSystem`
  - farmer/dog selection ring 크기와 stroke를 키웠다.
  - farmer/dog HP bar 폭과 높이를 키우고, 검은 슬롯 + 체력 비율별 inset fill 색을 적용했다.
  - farmer가 build command 수행 중이면 amber ring과 `BUILD` label로 표시한다.
  - queued command가 있으면 ring과 `QUEUE n` label이 남는다.
  - move/queued command marker 크기와 표시 시간을 키웠다.

아직 남은 P0 후보:

- 선택된 건물 전용 footprint outline API.
- 건물 선택/유닛 선택 시 공통 focus pulse renderer 분리.
- pending build badge를 실제 sequence number text 또는 icon으로 개선.
- desktop screenshot 기반 시각 검증 기록.
