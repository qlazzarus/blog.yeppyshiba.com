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

# 남은 연재 계획

## 3편

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

## 4편

플레이어 차량 렌더링

주제

- Vehicle Entity
- Sprite 또는 primitive vehicle renderer
- Screen-space anchor
- 차량 x offset

결과

- 플레이어 차량 표시
- 좌우 입력으로 차량 위치 변경
- 도로 중심 기준 lane position 표시

---

## 5편

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

## 6편

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
