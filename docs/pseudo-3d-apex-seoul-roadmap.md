# Apex Seoul 구현 로드맵

이 문서는 Phaser 4 기반 Pseudo 3D 드리프트 게임 Apex Seoul을 블로그 연재와 함께 완성하기 위한 구현 순서와 글감 범위를 정리한다.

Apex Seoul은 단순 레이싱 게임이 아니라 드리프트를 중심으로 한 아케이드 레이싱 게임이다.

프로젝트의 목표는 다음 세 가지다.

- Phaser 4 기반 Pseudo 3D 엔진 구현
- Drift Physics 구현
- 블로그 장기 연재 콘텐츠 확보

전체 연재는 13편 내외를 목표로 하며, 최종적으로 모바일 브라우저에서도 플레이 가능한 완성 게임을 공개한다.

---

# 프로젝트 정보

게임명

Apex Seoul

장르

Pseudo 3D Arcade Drift Racing

기술 스택

- Phaser 4
- TypeScript
- ECS Architecture
- Astro Integration

예정 경로

```text
게임:
/games/apex-seoul/

플레이:
/play/apex-seoul/

소스:
games/apex-seoul/
```

# 현재 구현 상태

- `games/apex-seoul/` Vite + Phaser 4 프로젝트 세팅
- `/games/apex-seoul/` 소개 페이지 연결
- `/play/apex-seoul/` 플레이 경로 연결
- Pseudo 3D Camera Resource 구현
- Horizon, FOV, Camera Height 기반 원근 투영 구현
- 직선 도로 형태의 카메라 검증용 projected ground 렌더링
- Arrow/AWSD로 lateral offset과 camera height 조정
- Q/E로 pitch 조정
- `RoadSegment` 기반 테스트 트랙 데이터 분리
- segment별 `curve`, `laneCount`, `length` 기반 도로 렌더링
- 직선-좌커브-우커브가 이어지는 첫 커브 렌더링 구현
- smoothstep 기반 curve ease-in/ease-out 테스트 트랙 구성
- 카메라 height/offset/pitch 입력 velocity 보간 적용
- Kenney Car Kit `race-future.glb` 기반 임시 플레이어 차량 sprite 3종 생성
- 후면, 후면 좌측, 후면 우측 차량 sprite 자동 렌더링 스크립트 추가
- 좌우 입력에 따른 차량 sprite 방향 전환
- 차량 lateral offset과 도로 중앙 복귀 추적 구현
- 차량 조향은 Left/Right 화살표로 분리
- 카메라 이동은 WASD와 Q/E로 분리
- 차량 anchor를 화면 고정값이 아니라 도로 투영점 기준으로 보정
- 차량 speed 상태 추가
- Up 화살표 악셀, Down 화살표 브레이크 입력 추가
- 입력 없음 상태에서 기본 cruise speed로 복귀
- 차량 speed와 camera z 이동 연결
- speed에 따른 약한 FOV 확장 적용
- 악셀/FOV 반응을 rate 기반으로 완만하게 조정
- 브레이크 감속을 즉시 0으로 수렴하지 않도록 완만하게 조정

# 다음 구현 방향

코너 렌더러 이후의 다음 우선순위는 플레이어 차량 렌더링이다. 현재는 임시 차량 sprite, 좌우 입력 반응, 도로 anchor 보정, 기본 악셀/브레이크 속도 제어까지 들어갔다. 다음 단계에서는 속도와 조향을 연결해 코너에서 바깥쪽으로 밀리는 감각을 만든다.

목표는 완성 차량 아트 제작이 아니라, pseudo 3D 도로 위에서 차량이 화면 하단 기준점으로 동작하는지를 먼저 검증하는 것이다. 따라서 1차 구현에서는 오픈소스 3D 차량 모델을 뒤쪽 또는 후면 3/4 각도로 렌더해서 임시 sprite로 사용하고, 라이선스 표기를 명확히 남긴다.

## 1차 차량 렌더링 목표

- 플레이어 차량 sprite 표시
- 화면 하단 anchor 기준 차량 위치 고정
- 좌우 입력에 따라 차량 x offset 변경
- 차량 yaw/tilt를 커브와 조향 입력에 맞춰 약하게 표현
- 도로 중심선 대비 lane position을 HUD 또는 debug 값으로 확인
- camera lateral offset 조작과 player vehicle offset 조작을 분리

## 임시 오픈소스 차량 에셋

Kenney `Racing Pack`은 2D top-down 차량 에셋이라 Apex Seoul의 pseudo 3D 후면 차량 표현과 맞지 않는다. 1차 구현에서는 뒤에서 보이는 느낌을 만들기 위해 Kenney `Car Kit`의 CC0 3D 차량 모델을 사용하고, Three.js 캡처 스크립트로 후면/후면 3/4 sprite를 렌더한다.

### 채택 에셋: Kenney Car Kit

- 출처: <https://kenney.nl/assets/car-kit>
- 제작자: Kenney
- 라이선스: Creative Commons CC0
- 분류: 3D, car, vehicle, transportation
- 사용 목적: 후면/후면 3/4 각도 플레이어 차량 sprite 렌더링

Kenney `Car Kit`은 3D GLB 모델을 포함하고 있어 pseudo 3D 차량 sprite 생성에 적합하다. 우선 `race-future.glb`를 기본 모델로 사용하고, `player-car-rear.png`, `player-car-rear-left.png`, `player-car-rear-right.png`를 자동 렌더링한다.

### 보류 후보: Kenney Racing Kit

- 출처: <https://kenney.nl/assets/racing-kit>
- 제작자: Kenney
- 라이선스: Creative Commons CC0
- 분류: 3D, racing, tile, track, vehicle, car
- 판단: 차량보다 트랙/레이싱 키트 성격이 강하므로, 플레이어 차량보다는 도로변 오브젝트나 트랙 구성 참고용으로 검토한다.

예정 저장 위치

```text
games/apex-seoul/assets/vehicles/kenney-car-kit/
games/apex-seoul/assets/vehicles/kenney-car-kit/License.txt
games/apex-seoul/assets/vehicles/kenney-car-kit/README.md
games/apex-seoul/assets/vehicles/rendered/
```

자동화 명령

```bash
cd games/apex-seoul
npm run download:vehicles
npm run render:vehicles
```

예정 렌더 산출물

```text
games/apex-seoul/assets/vehicles/rendered/player-car-rear.png
games/apex-seoul/assets/vehicles/rendered/player-car-rear-left.png
games/apex-seoul/assets/vehicles/rendered/player-car-rear-right.png
```

에셋 반입 시 체크리스트

- 원본 다운로드 URL 기록
- 다운로드 날짜 기록
- 원본 라이선스 파일 또는 라이선스 문구 보관
- 사용한 파일명과 게임 내 용도 기록
- 후면 렌더 각도, 카메라 FOV, 조명 설정 기록
- 블로그 글 하단에 에셋 출처 표기

# 완료된 연재

## 1편

[Phaser 4로 Pseudo 3D 레이싱 게임 만들기 — Apex Seoul 카메라 구현](/article/phaser4-apex-seoul-pseudo-3d-camera/)

구현 범위

- `games/apex-seoul/` 프로젝트 세팅
- Astro `/games/apex-seoul/`, `/play/apex-seoul/` 연결
- Pseudo 3D Camera Resource
- Horizon, FOV, Camera Height 기반 원근 투영
- 직선 도로 형태의 카메라 검증용 projected ground
- 카메라 z 스크롤

---

## 2편

[Phaser 4 Pseudo 3D 레이싱 게임 — RoadSegment로 커브 도로 만들기](/article/phaser4-apex-seoul-roadsegment-curve-rendering/)

구현 범위

- `RoadSegment`, `RoadTrack`, 테스트 트랙 데이터 구조
- segment별 `curve`, `laneCount`, `length` 기반 도로 렌더링
- 직선-좌커브-우커브 테스트 트랙
- smoothstep 기반 curve ease-in/ease-out
- boundary center 누적 방식의 커브 렌더링
- 카메라 height/offset/pitch 입력 velocity 보간

---

# 시리즈 공통 태그

```yaml
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - ecs
    - pseudo-3d
    - game-physics
    - racing-game
```

---

# 차량 구성

## Raven Coupe

입문용 후륜구동 쿠페

- 출력 ★★★
- 그립 ★★★★
- 드리프트 ★★★★★

---

## Vortex GT

고출력 GT

- 출력 ★★★★★
- 그립 ★★★
- 드리프트 ★★★

---

## Apex S

밸런스형 스포츠 세단

- 출력 ★★★★
- 그립 ★★★★
- 드리프트 ★★★★

---

# 향후 자체 차량 이미지 생성 계획

임시 오픈소스 차량으로 플레이 감각을 먼저 검증한 뒤, Apex Seoul 전용 차량 이미지를 생성해서 교체한다.

## ChatGPT 앱 사용 검토

전용 차량 이미지는 우선 ChatGPT 앱에서 생성하는 방식을 권장한다.

이유는 다음과 같다.

- 차량 디자인은 초기에는 반복 피드백이 중요하다.
- ChatGPT Images는 대화 맥락을 유지하면서 이미지를 다듬을 수 있다.
- 배경 투명 이미지 생성과 기존 이미지 편집을 지원한다.
- 프롬프트를 한 번에 고정하기보다, 생성 결과를 보고 차체 비율과 색상, 각도, 그림자 강도를 조정하기 좋다.

다만 최종 빌드 파이프라인까지 자동화해야 할 때는 API 기반 이미지 생성으로 옮기는 편이 낫다. 블로그 연재와 소규모 게임 아트 탐색 단계에서는 ChatGPT 앱으로 후보 이미지를 만들고, 선택된 결과와 최종 프롬프트를 문서에 남기는 방식이 더 빠르다.

참고 자료

- ChatGPT 이미지 생성 도움말: <https://help.openai.com/en/articles/8932459-creating-images-in-chatgpt>
- 4o 이미지 생성 소개: <https://openai.com/index/introducing-4o-image-generation/>
- OpenAI API 이미지 생성 문서: <https://platform.openai.com/docs/guides/image-generation>

## 생성 목표

- pseudo 3D 레이싱 게임 화면 하단에 배치할 플레이어 차량 sprite
- 후면 3/4 시점 또는 거의 후면 시점
- 도로와 조명에 맞는 아케이드 레이싱 스타일
- 배경 투명 PNG
- 게임 내 크롭을 고려한 넉넉한 여백
- 실제 브랜드, 로고, 상표를 사용하지 않는 가상 차량

## 기본 프롬프트

```text
Create a transparent-background 2D game sprite of an original fictional sports coupe for a pseudo-3D arcade drift racing game named "Apex Seoul".

Camera/view:
- rear three-quarter view, slightly top-down
- the car is facing away from the viewer, aligned toward the road horizon
- centered composition

Design:
- compact Korean urban night-racing sports coupe
- no real-world brand logos, no readable trademarks
- wide body kit, clean aerodynamic silhouette
- subtle cyber Seoul street-racing mood
- glossy deep graphite body with restrained red and cool white accents
- visible rear lights, rear bumper, rear window, roofline, and rear wheels

Rendering style:
- polished game sprite
- semi-realistic arcade style
- crisp silhouette
- readable at small size
- soft under-car shadow separated as transparent pixels if possible
- no background, transparent PNG

Output:
- square canvas
- high resolution
- leave padding around the car for rotation and scaling
```

## Raven Coupe 변형 프롬프트

```text
Create a transparent-background 2D game sprite of the "Raven Coupe", an original fictional entry-level rear-wheel-drive drift car for Apex Seoul.

Use a rear three-quarter, slightly top-down camera view. The car should face away from the viewer as if driving into a pseudo-3D racing road.

The Raven Coupe should feel lightweight, agile, and beginner-friendly:
- short coupe body
- clean drift tuner silhouette
- graphite black paint
- small red accent stripe
- bright but simple rear lights
- modest wing
- no real brand marks or readable text

Style: polished arcade racing game sprite, crisp edges, transparent background, readable at small on-screen size, centered on a square canvas with padding.
```

## Vortex GT 변형 프롬프트

```text
Create a transparent-background 2D game sprite of the "Vortex GT", an original fictional high-power GT drift car for Apex Seoul.

Rear three-quarter, slightly top-down view. The car faces away from the viewer toward the road horizon.

The Vortex GT should feel powerful and slightly aggressive:
- long GT body
- wide rear stance
- larger rear wing
- deep metallic blue-black paint
- cool white racing accents
- strong rear diffuser
- bright rear lights
- no real-world logos or readable trademarks

Style: semi-realistic arcade racing sprite, clean silhouette, transparent PNG, centered square canvas, enough padding for in-game rotation.
```

## Apex S 변형 프롬프트

```text
Create a transparent-background 2D game sprite of the "Apex S", an original fictional balanced sports sedan for Apex Seoul.

Rear three-quarter, slightly top-down view. The car faces away from the viewer, centered for a pseudo-3D arcade racing game.

The Apex S should feel balanced, precise, and modern:
- sporty sedan body
- stable stance
- subtle aero kit
- pearl white body with black roof
- restrained red and cyan accent details
- clean rear lights
- no real-world logos, badges, or readable text

Style: polished arcade game sprite, crisp outline, transparent background, readable at small size, square canvas with padding.
```

## 후처리 메모

- 결과 이미지에서 배경이 완전히 투명한지 확인한다.
- 차량이 화면 하단 anchor에 맞게 아래쪽이 너무 잘리지 않았는지 확인한다.
- sprite 회전 시 여백이 충분한지 확인한다.
- 후면 시점이 약하면 "more rear-facing, less side view"로 재생성한다.
- 너무 사실적이면 "cleaner arcade game sprite, stronger silhouette"를 추가한다.
- 로고나 문자 비슷한 요소가 나오면 제거 요청 후 재생성한다.

---

# 남은 연재 계획

## 3편

플레이어 차량 렌더링

주제

- Vehicle Entity
- Open Source Prototype Asset
- Screen-space Anchor
- Vehicle x Offset
- Curve/Steering Tilt

결과

- Kenney Car Kit 기반 임시 플레이어 차량 표시
- 차량 anchor, scale, depth 조정
- 좌우 입력으로 차량 위치 변경
- 커브와 입력에 맞춘 약한 차량 회전 표현
- 출처와 라이선스 표기 문서화

---

## 4편

가속과 브레이크

주제

- Acceleration
- Friction
- Max Speed

결과

- 차량 주행 가능
- 카메라 z 속도를 차량 속도와 연결
- HUD에 speed 표시

---

## 5편

조향 시스템

주제

- Steering
- Cornering
- Track Boundary
- Curve pull
- Off-road slowdown

결과

- 정상적인 코너링
- 커브에서 차량이 바깥쪽으로 밀리는 기본 주행감

---

## 6편

언덕 구현

주제

- Hill Segment
- Elevation
- Horizon Shift

결과

- `RoadSegment`에 elevation 추가
- 언덕과 내리막이 있는 테스트 트랙
- horizon shift와 camera height 보정
- 커브 + 언덕 조합 렌더링

---

## 7편

Drift Physics

주제

- Velocity Direction
- Heading
- Slip Angle

결과

- 드리프트 판정

시리즈 핵심 콘텐츠

---

## 8편

Drift Score

주제

- Combo
- Angle Bonus
- Speed Bonus

결과

- 점수 시스템

---

## 9편

Tire Mark와 Smoke

주제

- Particle
- Skid Mark
- Camera Shake

결과

- 시각 효과 강화

---

## 10편

차량 선택

주제

- Raven Coupe
- Vortex GT
- Apex S

결과

- 차량 선택 화면

---

## 11편

AI 차량과 장애물

주제

- Traffic
- Near Miss
- Collision

결과

- 플레이 요소 추가

---

## 12편

모바일 대응

주제

- Landscape
- Touch Input
- Responsive HUD

결과

- 모바일 플레이 가능

---

## 13편

기록 저장과 최종 Polish

주제

- localStorage
- Best Score
- Best Combo
- UI 정리

결과

- 공개 가능한 완성 버전

---

# 외전 후보

## Pseudo 3D 원리 분석

검색 키워드

- phaser pseudo 3d
- outrun renderer
- javascript pseudo 3d

---

## ECS로 레이싱 게임 만들기

검색 키워드

- phaser ecs
- entity component system

---

## Drift Physics 이해하기

검색 키워드

- slip angle
- drift physics
- racing game physics

---

# MVP 기준

최초 공개 버전

- 직선 도로
- 커브
- 언덕
- 차량 이동
- 드리프트 판정
- 드리프트 점수
- 차량 3종
- localStorage 기록

---

# 핵심 설계 원칙

- 게임 규칙은 Phaser에 의존하지 않는다.
- ECS World는 순수 TypeScript로 유지한다.
- Scene은 입력과 렌더링 Adapter 역할만 담당한다.
- Pseudo 3D 렌더링은 Render System으로 분리한다.
- 차량 데이터는 Config 기반으로 관리한다.
- Drift Physics를 프로젝트의 핵심 시스템으로 둔다.

최종 목표는 단순 기술 데모가 아니라 블로그 연재와 함께 성장하는 완성형 웹 게임이다.
