# Apex Seoul 밤의 숲과 FT86 파워밴드 — 내부 블로그 글감

이 문서는 공개 원고가 아니라, 최근 Apex Seoul의 화면 깊이와 Raven Coupe 주행 감각을 다듬은 과정을 놓치지 않기 위한 내부 메모다. 한 편의 긴 글로 쓰거나, 렌더링/환경과 차량 파워밴드 두 편으로 나누는 데 사용할 수 있다.

## 한 줄 요약

`Apex Seoul`은 밤의 북악 다운힐을 만들면서, **무엇을 더 그릴지보다 무엇을 어느 거리와 순서로 숨길지**를 먼저 해결했다. 같은 원칙으로 숲과 road를 어둠에 수렴시키고, 차량 바로 앞에는 두 개의 겹치는 타원 light pool만 남겼다. 그리고 Raven Coupe의 변속에도 이를 적용해, 속도 숫자가 아니라 고회전 자연흡기 엔진의 리듬으로 차의 성격을 만들었다.

## 공개 글 방향

### 제목 후보

1. `Apex Seoul - 밤의 숲과 헤드라이트, FT86 파워밴드로 깊이를 만드는 법`
2. `Pseudo 3D 레이싱 게임의 원근감은 레이어, 빛, 변속에서 나온다`
3. `숲이 도로를 덮지 않게 만들고, 헤드라이트와 FT86의 리듬을 만들기`
4. `Apex Seoul 개선 기록 - 수평선, 숲, 안개, 두 개의 광원, 6단 수동의 리듬`

### 추천 구성

한 편으로 쓸 경우에는 아래 흐름이 자연스럽다.

```text
문제 장면
  → 레이어가 만든 숲의 단절
  → SVG 숲과 결정적 배치
  → 원근 안개로 도로/주변부를 함께 숨기기
  → 차량 앞만 드러내는 두 개의 헤드라이트 light pool
  → "달릴 때" 남은 어색함: 변속 리듬
  → FT86형 파워밴드와 자동 QA
  → 다음 과제
```

기술 밀도가 너무 높다면 다음 두 글로 분리한다.

| 글 | 중심 질문 | 핵심 코드 |
| --- | --- | --- |
| 1. 밤의 도로를 깊게 보이게 하기 | 숲·옹벽·도로·수평선을 어떻게 같은 거리 규칙으로 합성할까? | `renderDepth.ts`, `roadObjectRenderer.ts`, `worldDistanceFog.ts` |
| 2. 헤드라이트가 도로에 붙어 보이게 하기 | 왜 3D 조명 cone 대신 두 개의 화면 공간 타원을 합성했는가? | `headlightShader.ts`, `main.ts`, `renderDepth.ts` |
| 3. Raven Coupe를 FT86처럼 느끼게 하기 | 실제 출력 수치 대신 어떤 변속 리듬이 고회전 NA의 성격을 만드는가? | `engineProfile.ts`, `playerVehicleController.ts`, standing-start QA |

## 출발점: 보기 좋은 정지 화면과 달릴 때의 화면은 다르다

초기 화면은 검푸른 도시·산 능선·도로라는 구성만으로도 야간 다운힐처럼 보였다. 하지만 실제 주행에서는 문제가 연속해서 드러났다.

- 옹벽 위 수목 실루엣이 수평선과 도로 사이의 어두운 band에 가려졌다.
- 오른쪽 숲은 반복 오브젝트가 아닌 화면을 덮는 연속된 숲 벽처럼 보여야 했다.
- 왼쪽 가드레일 너머도 절벽 아래 수관이 이어져야 했고, 먼 수목이 갑자기 생기면 안 됐다.
- 도로는 먼 곳에서 어둠에 잠겼는데, 옹벽·가드레일·차선은 멀리까지 또렷해 원근이 분리돼 보였다.
- Raven Coupe는 1단이 지나치게 짧고 5→6단 변속이 최고속 직전에 몰려, 고회전 자연흡기 차량이 아니라 단순 속도계처럼 느껴졌다.

이 문제들은 모두 별개의 에셋 결함처럼 보이지만, 실제로는 **거리·가시성·전환 시점의 관리 문제**였다.

## 1. 레이어 충돌: 숲이 수평선에 잘린 이유

### 관찰

옹벽 상단의 숲은 화면의 실루엣을 이어야 했지만, 도로의 projection 빈 공간을 덮는 horizon occlusion band가 그 위에 그려졌다. PNG/SVG 투명도 문제가 아니라, 같은 월드 안에서 필요한 두 요소의 그리기 순서가 뒤집힌 경우였다.

### 판단

수목을 더 밝게 만들거나 band를 없애면 문제의 원인이 아니라 결과를 건드리게 된다. band는 crest와 내리막에서 도로와 원경 사이의 빈 공간을 가리는 데 필요하다. 따라서 별도 terrain pass로 분리하고, 숲보다 아래 depth에 둔다.

```text
background · city · ridge
  → terrain horizon occlusion
  → wall-top forest
  → retaining wall · road · guardrail
  → player
  → HUD
```

### 구현 포인트

- depth를 숫자 리터럴로 흩어두지 않고 `RenderDepth` enum으로 관리했다.
- horizon occlusion은 road 본체와 분리된 Graphics pass로 옮겼다.
- `LeftCliffForest`, `RightForestBack`, `RightForestFront`을 별도 depth로 명시했다.
- player와 foreground matte도 같은 depth에 의존하지 않게 분리했다.

### 블로그에서 강조할 점

> pseudo-3D에서 depth는 단순한 화면 순서가 아니다. 고개 너머에 무엇이 존재하고, 무엇이 아직 보이면 안 되는지를 정의하는 지형 규칙에 가깝다.

관련 추적표: [Apex Seoul 렌더 레이어 추적표](apex-seoul-render-layer-tracker.md)

## 2. 수목 에셋: 한 장의 숲 대신 조립 가능한 SVG 다섯 종

### 왜 기존 리소스를 제거했나

기존 나무 resource는 오른쪽 옹벽 상단에서 실루엣 밀도와 반복성이 모두 부족했다. 한 장의 커다란 숲 이미지를 반복하는 방식은 원근·크기·교차 배치를 통제하기도 어려웠다.

그래서 투명 배경 SVG 다섯 종을 프로젝트 에셋으로 만들었다.

```text
tree-01-tall-pine.svg
tree-02-wide-pine.svg
tree-03-cypress.svg
tree-04-leaning-pine.svg
tree-05-broadleaf.svg
```

### 실제 진행 순서: 나무를 만든 뒤, 도로 양쪽의 빈 화면을 채우기까지

이 작업은 기존 나무 이미지를 단순 교체한 일이 아니었다. 처음에는 나무 하나를 화면에 올려 실루엣·색·크기를 확인하고, 같은 제작 규칙으로 다섯 종의 SVG를 확장했다. 이후 각 SVG가 혼자 보이는 장식이 아니라, 서로 앞뒤로 교차하는 숲을 구성하도록 배치 방식을 바꿨다.

1. 기존 wall-forest PNG resource를 제거했다. 반복 이미지의 한 덩어리로는 숲의 밀도와 원근을 제어하기 어려웠다.
2. 아래에서 위까지 한 그루가 완성되는 투명 SVG 다섯 종을 새로 만들었다. 키 큰 소나무·넓은 소나무·사이프러스·기울어진 소나무·활엽수로 실루엣의 리듬을 분산했다.
3. 오른쪽은 **옹벽 가장자리 몇 곳에 나무를 세우는 방식**을 버렸다. 옹벽 위부터 화면 오른쪽 끝까지 back/front 두 군집을 교차시키고, segment마다 SVG·크기·위치를 결정적으로 바꿔 끊기지 않는 숲 벽을 만들었다.
4. 왼쪽은 가드레일 너머가 비어 보이는 문제를 별도의 절벽 숲으로 해결했다. 같은 SVG의 줄기와 접지부는 절벽 아래로 숨기고 수관 상단만 crop해, 가드레일 아래·왼쪽 화면 끝까지 이어지는 나무 머리로 읽히게 했다.
5. 주행 중 먼 나무가 갑자기 생성되는 현상은 random 재배치를 멈추고, segment index 기반 seed와 crest/fog visibility를 적용해 해결했다. 따라서 같은 도로 위치에서는 같은 군집이 나타나며, 먼 수관은 지형과 어둠 속에서 열린다.

이 순서가 중요한 이유는 “오른쪽 옹벽 위 숲”과 “왼쪽 가드레일 아래 수관”이 서로 다른 에셋 문제가 아니기 때문이다. 둘 다 **도로 바깥의 빈 영역을, 시야에 맞는 접지선과 가시성 규칙으로 계속 채우는 문제**였다.

### 배치 규칙

- 오른쪽 옹벽: segment마다 겹치는 back/front 군집을 여러 개 두어, 옹벽 위부터 화면 우측 끝까지 끊기지 않는 숲 벽으로 읽히게 한다.
- 왼쪽 절벽: 같은 수목의 상단 수관만 보이게 잘라 guardrail 너머 절벽 아래에 배치하고, 왼쪽 화면 끝까지 이어 준다. 즉, 나무를 새로 만들기보다 **보이는 부분과 접지선**을 바꾼다.
- 변형과 선택은 segment index 기반의 결정적 seed를 쓴다. 같은 위치를 다시 볼 때 임의로 다른 나무가 생기지 않는다.
- crest visibility와 거리 fade를 같이 적용한다. 멀리 있는 수목은 갑자기 생성되지 않고 안개와 지형 뒤에서 자연스럽게 열린다.
- road와 guardrail과 같은 camera shake를 적용해, 화면 가장자리 숲만 따로 미끄러져 보이는 현상을 막는다.

### SVG 로딩에서 만난 실패 사례

Vite가 SVG를 data URI로 번들링한 뒤 Phaser의 SVG loader가 이를 `atob()`로 처리하면서 `InvalidCharacterError`가 발생했다. SVG 자체의 문법 문제가 아니라 전달 형식이 Phaser loader의 기대와 달랐던 것이다.

해결은 SVG import에 `?no-inline`을 붙여 URL asset으로 로드하는 것이었다. 이 사건은 글에서 짧은 트러블슈팅 박스로 쓸 만하다.

> 이미지가 깨졌다고 해서 항상 그림 파일을 의심할 필요는 없다. 번들러의 asset inline 정책과 엔진 loader의 data URI 처리 방식이 충돌할 수도 있다.

## 3. 원근 안개: roadside만 어두워서는 충분하지 않았다

### 문제

숲·옹벽·가드레일에는 거리 fade를 넣었는데 road 본체와 차선은 계속 선명했다. 결과적으로 주변부만 안개에 잠기고, 도로가 화면 멀리까지 네온 라인처럼 떠 보였다.

### 구현 원칙

`worldDistanceFog.ts`를 단일 기준으로 두고 road와 roadside가 같은 거리에서 같은 밤색으로 수렴하게 했다.

```text
near                 : 도로 형상과 현재 line을 읽을 수 있다.
mid                  : asphalt contrast와 edge line이 점진적으로 약해진다.
far (약 4300z 이후) : road, wall, rail, foliage가 함께 거의 검정으로 수렴한다.
```

- fog 시작: 약 `600z`
- fog 종료: 약 `4300z`
- asphalt/shoulder/edge/lane의 색을 같은 fog color로 보간한다.
- 차선과 edge line은 asphalt보다 빠르게 contrast를 잃게 해, 먼 곳의 밝은 선이 도로를 평면처럼 보이게 하는 문제를 줄였다.
- reflector는 완전히 사라지기 전까지 작은 점광만 남긴다.

### 글의 핵심 문장

> 원근 안개는 alpha 효과가 아니라 합성 규칙이다. 도로만, 나무만, 가드레일만 따로 사라지면 세계는 한 장면이 아니라 서로 다른 필터를 씌운 레이어가 된다.

## 4. 헤드라이트: cone보다 두 개의 겹치는 타원이 맞았던 이유

### 문제

원근 안개를 적용하면 멀리 있는 road와 roadside는 자연스럽게 사라진다. 대신 차량 바로 앞 asphalt에는 시선이 머무를 작은 밝기 기준점이 필요했다. 처음에는 흔히 떠올리는 사다리꼴 cone을 썼지만, pseudo-3D camera의 near-plane과 화면에 고정된 차량 sprite의 기준이 달라 빛이 차량 밑이나 뒤에 생겼다.

render texture로 road만 mask하려는 시도도 있었다. 하지만 Phaser의 offscreen Graphics capture가 shader 출력을 막아, 빛 자체가 보이지 않는 상태가 됐다. 이때 road mask를 계속 붙잡기보다, 먼저 **출력 좌표와 차량 연동이 확실한 단순 구조**로 돌아가는 것이 맞았다.

### 채택한 구조

```text
visible car front anchor
  → 좌측의 납작한 청백색 타원 pool
  + 우측의 납작한 청백색 타원 pool
  → 두 타원의 중첩부는 밝기 합산
  → player sprite
```

- shader는 full-screen additive pass지만, `uCarFront`와 sprite 폭 기반 램프 간격을 받아 차량 전방에만 놓인다.
- 타원은 screen-space에서 세로로 눌러 asphalt 위 반사광처럼 읽히게 한다.
- 두 광원은 따로 계산한다. 중심은 분리해 두 개의 램프라는 인상을 남기고, 넓은 가장자리는 겹쳐져 중앙부가 더 밝아진다.
- 동심원, 링, 표식 같은 band는 제거했다. 야간 도로의 빛이 아니라 HUD target처럼 보였기 때문이다.
- shader, road, vehicle은 같은 camera shake offset을 사용해 서로 미끄러지지 않게 했다.

### 블로그에서 강조할 점

> 이 화면에서 헤드라이트는 실제 광학을 시뮬레이션하지 않는다. 플레이어가 보는 rear-view 차량과 도로 사이에, 두 개의 광원이 존재한다는 최소한의 공간 단서를 합성한다.

### 남은 검증 과제

- 급커브와 crest에서 타원이 road 밖, guardrail, 숲으로 새지 않는지 실제 주행으로 확인한다.
- 현재 shader-only 구조는 출력 신뢰성을 우선한다. 향후 road mask는 Phaser의 offscreen rendering을 별도 POC로 검증한 뒤에만 다시 시도한다.
- 광원 크기·간격·밝기는 차량 sprite의 visible body 폭과 비교해 수동으로 최종 조정한다.

## 5. 화면 개선 뒤 남은 문제: Raven Coupe의 변속 리듬

화면이 자연스러워지자, 달릴 때 더 선명하게 들리는 문제가 있었다. Raven Coupe의 기존 자동변속은 실질적으로 `speedRatioMax`만 넘으면 다음 단으로 올라갔다. 프로필에 있던 `shiftUpRpm`, `shiftDropRpm`은 런타임의 실제 변속 조건에 쓰이지 않았다.

그 결과는 다음과 같았다.

| 항목 | 이전 | 문제 |
| --- | ---: | --- |
| 1→2단 | 약 15km/h | 출발 직후 1단이 끝나 고회전 NA의 리듬을 느낄 수 없었다. |
| 5→6단 | 약 179km/h | 최고속 직전에 단수가 몰려 5·6단의 역할이 겹쳤다. |
| 변속 조건 | 속도 경계 | 엔진 회전수 설정이 실제 변속 감각을 만들지 못했다. |

### FT86 2.0 NA를 참고한 판단

Toyota 86 수동은 2.0L 자연흡기 엔진으로, 7,000rpm 부근에서 205hp, 6,400~6,600rpm에서 최대토크를 낸다. 따라서 이 게임에서는 실차의 모든 기어비를 복제하기보다, **고회전에서 변속하고 다음 단에서도 토크 구간으로 복귀하는 리듬**을 재현하는 편이 맞다. [Toyota 86 e-brochure](https://www.toyota.com/content/dam/toyota/brochures/pdf/2020/86_ebrochure.pdf)

### 적용한 Raven Coupe 구간

표시 속도는 게임의 display-speed curve 기준이다. 실제 물리 단위와 실차 속도계를 1:1로 맞춘 값은 아니다.

| 단수 | 변속 지점 | 주된 사용 구간 | 변속 후 목표 |
| --- | ---: | ---: | ---: |
| 1단 | 약 36km/h | 0–36km/h | 5,400rpm 이상 |
| 2단 | 약 67km/h | 36–67km/h | 5,400~5,800rpm |
| 3단 | 약 97km/h | 67–97km/h | 5,400~5,800rpm |
| 4단 | 약 127km/h | 97–127km/h | 5,400~5,800rpm |
| 5단 | 약 157km/h | 127–157km/h | 5,400~5,800rpm |
| 6단 | — | 157–185km/h | 고속 순항 및 최고속 |

### 코드 변경

- Raven의 gear speed ratio를 위 구간에 맞춰 재배치했다.
- `shiftUpRpm = 7,400rpm`을 powered upshift의 실제 조건으로 사용한다.
- `shiftDropRpm = 5,400rpm`을 업시프트 직후 RPM의 최저 목표로 사용한다.
- torque curve는 5,500rpm 이후 강하게 올라 6,600~7,000rpm에서 가장 즐겁게 느껴지도록 조정했다.
- 길어진 저단으로 출발이 지나치게 느려지지 않도록 Raven만 `accelerationScale = 1.05`로 소폭 보정했다.
- shift cut은 기존처럼 구동 토크에만 적용하며 steering/lateral/corner budget을 건드리지 않는다.

### 중요한 설계 원칙

```text
표시 속도와 내부 물리 단위는 분리한다.
기어비 조정과 코너 속도 예산은 분리한다.
변속 cut과 조향/드리프트 상태는 분리한다.
```

이 분리가 있어야 파워밴드를 바꿀 때 차량이 갑자기 더 미끄러지거나, 코너 난이도가 우연히 달라지는 부작용을 막을 수 있다.

## 6. 수치로 확인한 결과

코드 변경 후 `qa:standing-start`와 `qa:powerband-reference`로 회귀를 확인했다.

| 항목 | 결과 | 기준 |
| --- | ---: | --- |
| Raven 0–60km/h | 9.917초 | 8.0–10.5초 |
| Raven 0–100km/h | 13.133초 | 12.0–13.8초 |
| 100km/h 기어 | 4단 | 4단 이하 |
| 0–100 중 lateral offset | 0 | 0.1 이하 |
| 100km/h 시 drift state | grip | grip 유지 |
| production build | 통과 | TypeScript/Vite build |

여기서 중요한 것은 0–100 기록 자체보다 다음이다.

- 30km/h에서 아직 1단을 쓸 수 있다.
- 60km/h는 2단 후반, 100km/h는 4단 초반으로 이어진다.
- 단순히 기어 숫자만 바꾼 것이 아니라, 변속 후 다시 당기는 RPM 영역이 유지된다.
- 자동차의 longitudinal tuning이 lateral handling 회귀를 만들지 않았음을 자동 테스트로 확인했다.

## 재사용 가능한 글 구조

### 도입 문단 초안

> 레이싱 게임 화면에서 숲은 배경 장식처럼 보인다. 그런데 밤의 산길에서는 숲이 어디서 끊기고, 얼마나 어두워지고, 도로보다 앞에 오는지가 속도감 자체를 바꾼다. Apex Seoul을 다듬으며 처음 고친 것은 나무의 모양이 아니라, 나무가 보일 자격이 있는 거리와 레이어였다.

### 중간 전환 문단 초안

> 화면의 원근이 정리되자 이번에는 엔진이 이상하게 들렸다. Raven Coupe에는 RPM과 기어가 있었지만, 변속은 사실상 속도 경계에서 일어났다. 고회전 자연흡기 차량을 만들고 싶다면 최고 출력 숫자보다 먼저, 언제 끌고 언제 다음 단으로 떨어뜨릴지를 코드가 알아야 했다.

### 결론 문단 초안

> 이번 개선에서 공통된 규칙은 하나였다. 멀리 있는 것은 갑자기 나타나면 안 되고, 빛은 차량과 떨어져 보이면 안 되며, 높은 회전수도 이유 없이 다음 단으로 넘어가면 안 된다. 숲에는 crest와 fog가, 헤드라이트에는 두 개의 겹치는 light pool이, 엔진에는 powerband와 shift target이 필요했다. Apex Seoul의 다음 작업도 새 요소를 추가하기보다 이 전환 규칙을 더 선명하게 만드는 일이 될 것이다.

## 캡처/자료 제안

공개 글에는 아래 전후 비교가 있으면 좋다.

1. **horizon band가 숲을 자르는 이전 화면 / 분리 뒤 화면**
2. **오른쪽 옹벽 숲이 희소한 화면 / 화면 끝까지 이어지는 교차 군집 화면**
3. **왼쪽 가드레일 아래 수관 전후**
4. **fog 적용 전후** — 먼 road line과 roadside가 동시에 어둠으로 수렴하는 장면
5. **헤드라이트 실패/개선 비교** — 차량 뒤에 생긴 cone, 과한 동심원, 두 개의 겹치는 타원 최종안
6. **HUD 또는 디버그 로그** — 1~6단 변속 구간과 RPM drop이 보이는 짧은 GIF
7. **standing-start QA JSON 일부** — 감각을 자동 검증으로 연결한 근거

캡처는 같은 커브·같은 속도·같은 카메라 위치에서 맞춰야 비교가 설득력을 갖는다.

## 다음 과제

- 실제 브라우저 플레이에서 1→2단의 RPM drop과 shift cut이 충분히 읽히는지 수동 QA한다.
- 헤드라이트의 두 타원 크기·간격·밝기를 실제 주행 장면에서 최종 QA한다. crest 뒤 road를 밝히지 않도록 shader-only 범위를 유지한다.
- offscreen road mask는 현재 구현을 대체하지 않는다. Phaser POC에서 출력과 mask 동작이 재현될 때만 재검토한다.
- road 전용 speed effect mask를 강화해 road glint가 roadside에 번지지 않게 한다.
- 수목 SVG의 형태 언어와 밀도를 더 다듬되, 배치 규칙·접지선·거리 fade는 유지한다.
- Raven 외 Vortex/Apex S도 같은 원칙으로 차별화하되, 코너 budget·grip을 엔진 프로필 변경에 섞지 않는다.

## 관련 파일

- `games/apex-seoul/src/game/renderDepth.ts`
- `games/apex-seoul/src/game/worldDistanceFog.ts`
- `games/apex-seoul/src/game/roadRenderer.ts`
- `games/apex-seoul/src/game/roadObjectRenderer.ts`
- `games/apex-seoul/src/game/headlightShader.ts`
- `games/apex-seoul/src/game/engineProfile.ts`
- `games/apex-seoul/src/game/playerVehicleController.ts`
- `games/apex-seoul/scripts/audit-powerband-reference.mjs`
- `games/apex-seoul/scripts/simulate-standing-start.mjs`
- `docs/apex-seoul-render-layer-tracker.md`
- `docs/apex-seoul-headlight-rendering-plan.md`
- `docs/apex-seoul-visual-direction.md`
