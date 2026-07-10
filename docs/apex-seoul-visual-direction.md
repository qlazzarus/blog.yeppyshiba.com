# Apex Seoul Visual Direction

이 문서는 Apex Seoul의 그래픽 에셋 제작 기준을 하나로 묶기 위한 작업 메모다.

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

## Pipeline Rules

Three.js pose sheet와 ComfyUI retro filter는 소스 형태와 픽셀 스타일만 만든다. 최종 색은 deterministic postprocess에서 고정한다.

```text
pose render
-> pixel candidate
-> ComfyUI retro style filter
-> palette lock
-> black/blue postprocess variants
-> runtime screenshot QA
```

새 차량이나 variant를 추가할 때는 다음을 통과해야 한다.

- black/blue variant가 생성된다.
- alpha sprite에는 배경 glow나 baked shadow가 없다.
- runtime QA는 `vehicle=ft86-retro&vehicleColor=blue`와 `vehicleColor=black`을 함께 비교한다.
- 도로/표지/배경 색은 같은 screenshot에서 차량보다 더 밝게 주목을 빼앗지 않는다.

## Asset Work Status

Done:

- `postprocess:ft86-retro`가 black variant 산출물을 생성한다.
- runtime QA color set은 `blue,black,silver,red,yellow` 순서다.
- 런타임 기본 차량은 `ft86-retro` blue variant 기준으로 바뀌었다.
- 도로/표지/배경 색은 black/blue downhill 방향으로 1차 조정됐다.

Next:

1. FT86 runtime color QA contact sheet에서 blue와 black을 비교한다.
2. 도시 불빛 horizon strip을 Graphics 임시 구현으로 먼저 만들고, 마음에 들면 bitmap/background layer로 분리한다.
3. roadside object를 guard-post 중심에서 blue reflector/chevron pack 중심으로 재구성한다.
4. 차량 tail light glow는 base sprite가 아니라 speed/brake 상태 기반 런타임 효과로 분리한다.
