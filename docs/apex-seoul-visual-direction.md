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

## 리소스 관리

차량/환경 파이프라인, Stable Diffusion·ComfyUI의 역할, source/generated/approved 디렉터리, 라이선스와 승인 체크리스트는 [리소스 관리 원칙](apex-seoul-resource-management.md)을 따른다. 실험 결과와 runtime QA 수치는 [Retro Asset Studio 진행 메모](apex-seoul-retro-asset-studio-progress-notes.md)에 남긴다.
