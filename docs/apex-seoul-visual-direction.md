# Apex Seoul Visual Direction

이 문서는 Apex Seoul의 palette와 화면 무드를 빠르게 참고하기 위한 요약이다. 리소스 확보, 생성, 저장 위치, 라이선스, 승인 기준의 단일 기준은 [Apex Seoul 리소스 관리 원칙](apex-seoul-resource-management.md)에서 관리한다.

현재 최종 방향은 **black/blue dreamlike Seoul downhill**이다. 낮 시간대 레이싱, 녹색 산길, 밝은 OutRun 해변 톤이 아니라, 서울 산길을 밤에 내려가는 느낌을 우선한다.

## 현재 부족한 그래픽 요소

- 환경 팔레트 기준이 약했다. 런타임 배경은 낮 하늘, 녹지, 빨강/노랑 표지판 계열이어서 차량 후보의 블랙/블루 방향과 충돌했다.
- 차량 팔레트 락이 실버/회색을 기본으로 삼았다. blue variant는 있었지만 최종 무드의 기준 후보가 아니라 파생 색상처럼 취급됐다.
- 에셋 QA가 포즈, 앵커, 그림자 접지감에는 강했지만 전체 화면 색감 판단 축은 약했다.
- 도로 주변 오브젝트가 아직 일반 도로 표지/나무 느낌이다. 북악 다운힐의 밤 공기, 도시 전망, 산 능선 실루엣, 가로등/반사판 같은 장소성이 부족하다.
- 다운힐 자체의 감정선은 카메라 pitch와 elevation으로 생겼지만, 그래픽 에셋은 아직 "몽환적 내리막"을 설명할 정도의 블루 원근감, 헤이즈, 먼 도시 불빛을 갖고 있지 않다.

## Art Direction

### Palette

기본 화면은 거의 검정에 가까운 남색을 바탕으로 한다.

```text
background night: #050812, #07101f
far haze / horizon: #14395f, #245f9d
road asphalt: #0c121b, #101722
lane / sign glow: #67b7ff, #b8dcff
vehicle body baseline: black and deep blue
tail light accent: restrained red only
```

빨강, 노랑, 주황은 신호 역할로만 쓴다. 화면 전체 팔레트를 끌고 가면 안 된다.

### Vehicle Assets

차량은 "밝은 실버 차량"이 아니라 어두운 차체가 푸른 하이라이트로 읽히는 방향을 기본으로 한다.

우선순위:

1. `ft86-retro` blue variant를 런타임 기본 차량으로 둔다.
2. black variant는 최종 후보 비교용으로 반드시 생성한다.
3. silver/red/yellow는 QA 비교용 또는 블로그 설명용 보조 산출물이다.
4. base sprite에는 glow, bloom, ground shadow를 넣지 않는다. 빛 효과는 런타임 레이어에서 따로 붙인다.

### Environment Assets

다음 에셋이 우선 필요하다.

- 어두운 가드레일과 파란 반사판
- 먼 서울 도심 불빛 실루엣
- 산 능선과 낮은 블루 헤이즈 레이어
- 커브 진입을 읽게 하는 파란 chevron/sign set
- 다운힐 구간별로 달라지는 roadside marker
- 차량 뒤쪽 접지감을 살리는 별도 shadow/glow pass

## 백로그: 코너와 고저차에 반응하는 원경

### 3단 parallax layer

배경은 하늘 layer와 다음 원경 거리로 분리한다.

```text
sky     : 밝은 달과 그 앞을 느리게 지나는 어두운 구름
layer 1 : 가까운 산 능선
layer 2 : 가장 먼 도시와 도시 불빛
```

일정 속도의 무한 가로 스크롤은 사용하지 않는다. 도로가 좌우로 꺾이면서 시선 방향이 바뀐 양만큼 원경 layer를 제한된 범위에서 이동한다. 화면보다 조금 넓은 overscan 영역을 두고, 코너가 끝나면 layer offset이 천천히 중앙으로 복귀하게 한다. 달은 거의 고정하고, 구름만 화면 상단에서 매우 느린 풍향 이동을 한다.

현재 `drawCityView()`는 far city와 ridge를 각각 전방 `2800z`·`1200z`의 road center offset으로 움직인다.

```text
near ridge    : 가까운 전방 sample, 큰 offset
far city      : 먼 전방 sample, 작은 offset
moon / cloud  : 도로와 무관한 sky anchor와 저속 풍향 이동
```

현재 curve 하나를 offset으로 직접 사용하지 않는다. 거리별 road center offset과 layer별 이동 한계로 급격한 좌우 움직임을 막는다. 가까운 guardrail과 옹벽은 속도감을 담당하고, 배경 layer는 코너 방향과 공간의 깊이를 담당한다.

#### CC0 source 적용 — 2026-07-16

첫 구현은 아래 CC0 원본을 black/blue strip으로 결정적으로 가공해 적용한다.

| Runtime layer | CC0 source | Generated asset |
| --- | --- | --- |
| near ridge | Fupi, Mountains and Trees Parallax Background Detail | `ridge-near-blueblack.png` |
| mid buildings (보관) | Kutejnikov, Mountains and Buildings | `buildings-mid-blueblack.png` |
| far city/light | FabinhoSC, Skyline Background | `city-far-blueblack.png` + light overlay |
| moon | bart, Moon overlay texture | `moon-cool-blue.png` |
| dark cloud | WickedInsignia, Clouds with Transparency | `cloud-dark-blue.png` |
| wall-top forest | Robotrage, Forest Parallax | `wall-forest-clump-blueblack.png` |

원본과 다운로드 URL·라이선스는 `assets/environment/source`의 각 `README.md`에 보관한다. 가공은 `npm run build:parallax-assets --workspace @games/apex-seoul`가 담당하며, 642px/250px 원본을 단순 확대하지 않고 잘라낸 건물 덩어리와 좌우 반전 변형을 겹쳐 `1600px` 폭 strip으로 재조합한다.

runtime에는 far / ridge 순서로 각각 `2800z / 1200z` look-ahead를 사용한다. 최대 이동량은 `18px / 64px`로 제한해, 코너를 설명하되 배경이 속도감의 주체가 되지 않게 한다. 중간 건물 strip은 보관하되, 현재 runtime에서는 CC0 달 overlay와 투명 구름 strip이 그 화면 역할을 대체한다. 달은 고정 sky anchor이며, 두 구름 strip만 서로 다른 저속으로 이동한다.

도시 실루엣은 far `112px`로 확보하고, 전경 능선은 `150px` 높이와 horizon 아래 `42px` baseline을 사용한다. 따라서 높은 봉우리는 도시를 가리지만, 능선의 골과 상단에는 먼 도시 불빛이 드러난다. 건물 불빛은 별도 overlay로 두고, 진행 위치와 무관하게 기본 노출을 유지한 채 주기적 점멸만 적용한다.

### 야간 depth palette

먼 layer일수록 색 범위와 contrast를 줄이되, 모든 layer를 검게 합치지 않는다.

```text
가까운 능선 : 가장 어두운 silhouette, 비교적 선명한 경계
먼 도시     : 약한 형태, 드문 창문과 도로 불빛만 유지
달과 구름   : 달은 차가운 고휘도 anchor, 구름은 그 앞을 지나며 달빛을 부분 차폐
```

거리 표현은 alpha 하나가 아니라 palette, contrast, light density를 함께 조절한다. 먼 도시는 형태보다 일부 불빛으로 존재하고, 가까운 능선이 그 불빛을 가리며 깊이를 만든다.

전경 능선은 항상 먼 도시 layer 앞에 남긴다. 건물 실루엣과 불빛은 완전히 숨기지 않으며, 불빛만 주기적으로 점멸해 야간의 방향성과 도시 존재감을 보장한다. 결과적인 깊이 순서는 `하늘 → 달 → 구름 → 먼 도시 불빛 → 전경 산 능선 → 도로`다.

오른쪽 retaining wall은 roadside profile과 무관하게 모든 segment에 연속 span으로 둔다. body는 road보다 한 단계 밝은 청회색(`0x0b243a`), 수평 이음선은 제한된 blue-gray highlight(`0x2e5e80`)로 유지해 야간에도 도로 가장자리를 읽게 한다. 벽면은 상단으로 갈수록 도로 반대편(화면 오른쪽)으로 후퇴하는 단면으로 두어 단순 수직 평면처럼 보이지 않게 한다. 상단에는 도로 쪽으로 조금 돌출된 청회색 coping/턱을 두어 벽의 두께와 지형 단차를 읽게 한다.

guardrail과 retaining wall 같은 연속 span은 point marker보다 이른 near clip에서 시작한다. retaining wall은 `520z`, 도로에 더 가까운 guardrail은 `320z`에서 시작한다. guardrail은 가까운 투영일수록 도로 밖으로 더 크게 벌어지므로, 이 거리에서 시작해야 코너·crest에서도 near endpoint가 화면 밖에 남는다. 결과적으로 segment 교체가 화면 경계에서 잘린 것처럼 보이지 않고 도로 가장자리 밖으로 자연스럽게 이어진다.

연속 span은 다음 road segment의 `42%`까지 겹쳐 그린다. 가까운 span을 나중에 그려 overlap을 덮기 때문에, curve·고저차·raster 경계에서 한 frame씩 생길 수 있는 guardrail/옹벽의 이음 틈을 숨긴다.

canvas 경계에서는 연속 구조물도 결국 잘릴 수밖에 있으므로, road/object layer 위·HUD 아래에 야간 foreground matte를 둔다. 좌우와 하단의 다단 암부가 guardrail과 옹벽을 경계 전에 어둠으로 수렴시켜, 화면 바깥으로 계속되는 전경처럼 읽게 한다.

옹벽 위의 숲은 CC0 `Forest Parallax`의 front·middle silhouette을 가공한 clump/canopy sprite로 교차 배치한다. 기존보다 `20%` 큰 scale과 두 배의 배치 빈도로 옹벽 상단을 빽빽하게 채워, downhill에서 숲속으로 진입하는 밀도를 만든다. tree ground contact는 road와 같은 crest visibility envelope를 사용하고, sprite는 wall보다 뒤·road보다 앞의 depth에서 base가 옹벽 상단 coping의 표면에 맞도록 둔다.

### 도로 depth lighting — 2026-07-16 적용

배경의 depth palette와 도로의 밝기 규칙은 분리한다. 배경은 haze와 도시 불빛 때문에 먼 layer가 부분적으로 밝을 수 있지만, 도로는 차량 조명의 영향을 받는 가까운 구간이 가장 잘 보여야 한다.

```text
가까운 도로 : asphalt와 경계가 선명하고 차량의 현재 line을 읽을 수 있다.
중간 도로   : asphalt contrast가 점차 줄지만 중앙선과 edge line은 유지한다.
먼 도로     : asphalt는 밤색으로 수렴하고 반사 요소만 제한적으로 남긴다.
```

`roadRenderer.ts`는 road slice의 world distance로 smoothstep fade를 계산한다. 야간 농도를 높이기 위해 약 `600z`까지만 가까운 asphalt palette를 유지하고, `4300z`에서 거의 검은 원경 암부로 수렴한다.

- asphalt의 두 교차 색은 멀어질수록 같은 `0x050a11`로 수렴해 horizon 근처 stripe와 moire를 줄인다.
- shoulder는 asphalt보다 어둡게 유지한다.
- 중앙선과 edge line도 감쇠하지만 asphalt보다 밝은 blue를 남겨 다음 코너 방향을 읽게 한다.
- speed shader는 계속 throttle/downhill/drift event cue만 담당하며 상시 전조등으로 사용하지 않는다.

후속 전조등 cone을 추가할 경우 world-distance fade를 대체하지 않고, 가까운 화면 영역에 screen-space mask를 곱하는 별도 layer로 둔다. crest 뒤의 도로를 밝히지 않도록 visibility envelope 적용 이후에 연결한다.

검증 기준은 다음과 같다.

- 차량 주변 asphalt와 포장 경계가 HUD나 차량 sprite에 묻히지 않는다.
- 먼 asphalt가 중앙 buffer와 자연스럽게 이어지되 도로 진행 방향은 읽힌다.
- 먼 segment의 교차 stripe가 깜빡이거나 하나의 밝은 띠로 뭉치지 않는다.
- 중앙선, edge line, reflector가 모두 같은 속도로 사라지지 않는다.
- 오르막과 내리막에서 동일 world distance의 밝기 변화가 갑자기 튀지 않는다.

### 동적 horizon occlusion

Lotus III의 도로와 원경 사이 중앙 buffer처럼 projection gap을 가릴 수는 있지만, 고정된 검은 띠는 사용하지 않는다. 고정 높이의 buffer는 오르막과 내리막을 같은 모양으로 가려 elevation을 평평하게 만들 수 있다.

배경 합성 순서는 다음을 기준으로 한다.

```text
하늘 -> 달 -> 구름 -> 먼 도시 -> 가까운 능선 -> 도로
```

`roadRenderer.ts`는 downhill cue, `horizonGapY`, 가장 먼 projected road의 상단으로 `horizonOcclusionY`를 계산한다. 이 값까지 거의 검정에 가까운 남청색 terrain band를 road 위에 덮어 road projection의 빈 구간을 가리고, 같은 경계보다 먼 roadside object는 렌더하지 않는다. 중앙 buffer는 별도 장식이 아니라 지형 occlusion의 결과로 보인다.

현재 horizon occlusion band는 내리막에서만 활성화한다. crest visibility envelope는 모든 고저차 구간에서 적용한다.

### crest visibility와 내리막 reveal

Lotus III와 OutRun 계열의 고갯마루 감각은 camera pitch만으로 만들지 않는다. 마루 뒤의 도로와 오브젝트를 숨겼다가 정상 통과 후 순서대로 다시 보여주는 것이 핵심이다.

```text
오르막 접근 : 가까운 road가 원경을 가린다.
마루 진입   : crest 뒤의 road segment와 roadside object를 숨긴다.
정상 통과   : 먼 도시나 하늘이 먼저 열린다.
내리막 전환 : 아래쪽 road segment가 순서대로 나타난다.
```

구현 규칙은 다음과 같다.

1. 가까운 projected road slice부터 화면상 가장 높은 crest Y를 누적한다.
2. 더 먼 slice의 ground Y가 누적 crest보다 화면 아래이면 그 slice는 crest 뒤로 판단해 그리지 않는다.
3. roadside object도 자신의 ground contact가 속한 road slice의 가시 상태를 같은 envelope에서 조회한다. point object는 hidden slice일 때만 숨기고, guardrail·옹벽 span은 crest 전의 마지막 visible slice에서 잘라낸다.
4. camera가 crest를 넘으면 누적 crest가 낮아지고, 실제 projection 순서에 따라 road → guardrail span → post/sign이 다시 드러난다. 별도 alpha fade는 사용하지 않는다.

downhill horizon fill은 envelope의 가장 먼 유효 경계를 사용한다. road slice와 roadside object가 같은 envelope를 사용해야 산 뒤의 표지판이나 나무가 먼저 비치는 오류를 막을 수 있다.

고개를 넘는 순간의 짧은 horizon reveal이나 FOV impulse는 마지막 polish로 둔다. 먼저 geometry와 object visibility가 일치하는지 검증한다.

### 구현 순서

1. 기존 Graphics mockup을 세 background layer로 분리한다.
2. layer별 look-ahead 거리, offset 한계, 복귀 속도를 설정한다.
3. 거리별 palette, contrast, light density를 검증한다.
4. `horizonGapY`와 elevation 기반의 동적 occlusion band를 적용한다. ✅
5. 오르막 crest visibility envelope를 road와 roadside object에 함께 적용한다. ✅
6. 마지막에 bitmap asset과 작은 FOV/camera cue를 연결한다.

## 리소스 관리

차량/환경 파이프라인, Stable Diffusion·ComfyUI의 역할, source/generated/approved 디렉터리, 라이선스와 승인 체크리스트는 [리소스 관리 원칙](apex-seoul-resource-management.md)을 따른다. 실험 결과와 runtime QA 수치는 [Retro Asset Studio 진행 메모](apex-seoul-retro-asset-studio-progress-notes.md)에 남긴다.
