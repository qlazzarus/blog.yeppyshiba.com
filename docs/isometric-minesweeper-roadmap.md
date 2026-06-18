# Isometric Minesweeper 구현 로드맵

이 문서는 Phaser 4 기반 Isometric Minesweeper를 블로그 연재와 함께 완성하기 위한
구현 순서와 글감 범위를 정리한다.

현재 구현은 ECS scaffold, isometric 보드 렌더링, pointer hover 판정, 첫 클릭 지뢰
배치, 주변 지뢰 수 계산, 기본 reveal/flag, 빈 칸 연쇄 오픈, 새 게임 버튼, 난이도
선택, 타이머, 1차 렌더링 polish까지 들어간 상태다.

4편 글 초안과 대표 스크린샷까지 작성/생성했다. 5편 구현 준비로 모바일 tap/long press
입력과 반응형 layout 대응까지 들어간 상태다. 이후 작업은 기록 저장, 고급 입력을
차례로 올리는 방향으로 진행한다.

## 현재 상태

- 게임 데모: `/games/isometric-minesweeper/`
- 플레이 iframe: `/play/isometric-minesweeper/`
- 게임 소스: `games/isometric-minesweeper/`
- 4편 대표 이미지:
  `/images/posts/202606/isometric-minesweeper-difficulty-timer-polish.png`
- 4편 글:
  `contents/phaser4-isometric-minesweeper-difficulty-timer-render-polish.md`
- 5편 글:
  `contents/phaser4-isometric-minesweeper-mobile-landscape-responsive.md`
- 5편 대표 이미지:
  `/images/posts/202606/isometric-minesweeper-mobile-landscape.png`
- 5편 보조 이미지:
  `/images/posts/202606/isometric-minesweeper-mobile-portrait.png`
- 5편 구현:
  모바일 long press flag, 반응형 board layout, compact/landscape HUD 재배치
- 최근 검증:
  - `npx tsc --project games/isometric-minesweeper/tsconfig.json`
  - `npm --workspace @games/isometric-minesweeper run build`
  - `npm run build:games`
  - `npm run build:site`

## 연재 방향

전체 연재는 7~8편 안에서 완성한다.

- 완료: 1편: Phaser 4로 Isometric Minesweeper 만들기 - ECS 기본 구조와 hover 판정
- 완료: 2편: ECS로 지뢰찾기 데이터 모델링하고 첫 클릭에 지뢰 배치하기
- 완료: 3편: 빈 칸 연쇄 오픈과 새 게임 흐름 만들기
- 완료: 4편: 난이도, 타이머, 렌더링 polish 넣기
- 완료: 5편: 반응형/모바일 대응과 블로그 iframe 서비스 품질 정리
- 후보: 6편: localStorage 기록 저장과 플레이 polish
- 후보: 7편: chord reveal과 고급 입력
- 선택 외전: 작은 게임에서 ECS를 쓰며 느낀 장단점

## 완료한 구현

### 1편 범위

- Phaser 4/Vite 게임 scaffold
- Astro 블로그 iframe embedding
- ECS 형태의 `World`, entity, component map 구성
- isometric 좌표 변환
- 보드 타일 렌더링
- pointer hover 판정
- hover 상태를 `WorldResources`로 이동

### 2편 범위

- `GameStatus` resource 추가
- `minefieldReady` resource 추가
- 지뢰 component 역할의 `Set<EntityId>` 추가
- flag component 역할의 `Set<EntityId>` 추가
- 주변 지뢰 수 component 역할의 `Map<EntityId, number>` 추가
- 첫 클릭 이후 지뢰 배치
- 첫 클릭 타일과 주변 8칸 안전 처리
- 좌표 기반 entity lookup 개선
- 좌클릭 reveal
- 우클릭 flag
- 주변 지뢰 수 표시
- 패배 시 전체 지뢰 공개
- 승리 조건 계산

### 3편 범위

- 주변 지뢰 수가 0인 타일을 열었을 때 BFS 기반 연쇄 오픈
- 연결된 0 타일과 경계 숫자 타일 reveal
- flag, mine, 이미 열린 타일은 자동 reveal 대상에서 제외
- 연쇄 오픈 이후 승리 조건 재계산
- 새 게임 버튼 추가
- `World` 재생성과 보드 재생성을 통한 reset 흐름
- 남은 지뢰 수 UI 추가

### 4편 범위

- Beginner / Standard / Expert 난이도 추가
- 난이도별 보드 크기와 지뢰 수 적용
- 큰 보드가 화면 안에 들어오도록 타일 크기 조정
- 첫 reveal 이후 타이머 시작
- 승리/패배 시 타이머 정지
- 새 게임과 난이도 변경 시 타이머 초기화
- `F`, `M` 텍스트 대신 Phaser `Graphics` 기반 깃발/지뢰 아이콘 렌더링
- 숫자 라벨 크기와 색상 정리
- 타일 상태별 fill/stroke 개선
- 게임 상태별 status text 색상 변경

### 5편 준비 범위

- Phaser scale mode를 `FIT`에서 `RESIZE`로 변경
- desktop/mobile viewport에 따라 board origin과 tile width 재계산
- 모바일에서도 Expert 보드가 화면 안에 들어오도록 최소 타일 폭 조정
- isometric diamond의 실제 가로 폭과 viewport height를 함께 고려해 타일 크기 계산
- resize 시 기존 entity의 `RenderComponent` screen 좌표를 다시 계산하는
  `updateBoardRenderSystem` 추가
- compact viewport에서 title, hint, status, 난이도 버튼, 새 게임 버튼을 세로로 재배치
- 낮은 height의 모바일 landscape viewport에서는 HUD를 더 낮고 작게 압축
- 모바일 portrait viewport에서는 landscape 회전 안내를 표시하고 보드 입력을 막음
- compact viewport에서 status text word wrap 적용
- tap reveal 입력 추가
- right click flag 유지
- long press flag 입력 추가
- long press 이후 pointerup reveal이 이어서 실행되지 않도록 방지
- pointerout/reset 시 long press timer 정리
- 작은 타일에서도 숫자 라벨이 깨지지 않도록 최소 font size 조정

## 완료한 글과 이미지

- 1편 글: `contents/phaser4-isometric-minesweeper-ecs-scaffold.md`
- 1편 이미지: `/images/posts/202606/isometric-minesweeper.png`
- 2편 글: `contents/phaser4-isometric-minesweeper-minefield-first-click.md`
- 2편 이미지: `/images/posts/202606/isometric-minesweeper-click.jpg`
- 3편 글: `contents/phaser4-isometric-minesweeper-reveal-cascade-reset.md`
- 3편 이미지: `/images/posts/202606/isometric-minesweeper-combo.jpg`
- 4편 글: `contents/phaser4-isometric-minesweeper-difficulty-timer-render-polish.md`
- 4편 이미지: `/images/posts/202606/isometric-minesweeper-difficulty-timer-polish.png`
- 5편 글: `contents/phaser4-isometric-minesweeper-mobile-landscape-responsive.md`
- 5편 이미지:
  `/images/posts/202606/isometric-minesweeper-mobile-landscape.png`
  `/images/posts/202606/isometric-minesweeper-mobile-portrait.png`

## 4편 글감 메모

주제:

```text
난이도, 타이머, 렌더링 polish 넣기
```

글에서 다룰 포인트:

- 난이도는 `World`보다 Scene이 들고 있는 session 설정에 가깝다.
- 난이도 변경과 새 게임은 거의 같은 reset 흐름을 타게 만들 수 있다.
- 타이머는 페이지 로드가 아니라 첫 reveal 이후 시작해야 플레이 기록으로 의미가 있다.
- `timerStartedAt`과 `elapsedSeconds`를 분리하면 정지 상태와 진행 상태를 단순하게 다룰 수 있다.
- 텍스트 `F`, `M`을 없애고 Phaser `Graphics`로 아이콘을 그리면 작은 구현으로 화면 인상이 크게 바뀐다.
- 숫자 Text와 icon Graphics를 분리하면 이후 sprite atlas로 넘어가기 쉽다.

## 완료한 글감: 5편 범위

주제:

```text
반응형/모바일 대응과 블로그 iframe 서비스 품질 정리
```

목표:

- 모바일에서 기본 플레이가 가능해야 한다.
- 작은 iframe에서도 HUD와 보드가 겹치지 않아야 한다.
- 게임 asset 서빙 경로가 dev/build 모두에서 안정적으로 동작해야 한다.

구현 후보:

- 완료: mobile tap reveal
- 완료: long press flag
- 완료: long press 중 실수 reveal 방지
- 완료: pointer/touch 입력 흐름 정리
- 완료: `resize` 이벤트 대응
- 완료: 난이도별 board layout 재계산
- 완료: HUD 고정 좌표 개선
- 완료: 작은 화면에서는 버튼/상태 문구를 여러 줄로 재배치
- 완료: 작은 화면에서 숫자 라벨 최소 크기 조정
- 완료: 모바일 landscape orientation 기준 HUD/보드 배치 보정
- 완료: 모바일 portrait orientation 안내 표시
- iframe wrapper 높이와 game canvas 비율 재검토
- `/play/:slug/assets/:file` endpoint 유지 여부 검토
- favicon 404 정리

글에서 다룰 포인트:

- 데스크톱 우클릭 입력은 모바일에서 그대로 쓸 수 없다.
- long press는 UX가 단순하지만 타이밍과 취소 조건을 신경 써야 한다.
- `RenderComponent`에 screen 좌표를 저장하는 구조는 resize 대응에서 다시 고민할 지점이다.
- `FIT`은 비율 유지에는 편하지만, 블로그 iframe 안에서 HUD/보드 재배치를 제어하기 어렵다.
- `RESIZE`로 전환하면 scene scale width 기준으로 UI와 board layout을 직접 재계산할 수 있다.
- 모바일 landscape는 width만 보면 넉넉해 보여도 height가 낮아서 보드가 잘릴 수 있다.
- isometric 보드는 grid width가 아니라 diamond footprint를 기준으로 화면 fit을 계산해야 한다.
- 웹에서 orientation lock은 브라우저 제약이 있으므로 강제 회전보다 안내와 landscape 최적화가 현실적이다.
- tap 입력은 pointerdown이 아니라 pointerup에서 reveal해야 long press flag와 충돌하지 않는다.
- 블로그 iframe에서 게임을 서비스하면 game build asset 경로와 Astro dev server 동작까지 같이 봐야 한다.

## 다음 작업 후보

- localStorage 최고 기록 저장
- 난이도별 최고 기록 저장
- chord reveal
- sprite atlas 기반 icon 교체
- 클릭 애니메이션
- 실제 모바일 기기에서 tap/long press 수동 검증
- 모바일 landscape 대표 스크린샷 캡처

## 구현 메모

현재 `RenderComponent`는 `screenX`, `screenY`를 저장한다. 반응형 대응 단계에서는
`PositionComponent`의 grid 좌표를 기준으로 렌더 시점에 screen 좌표를 계산하는 구조를
다시 검토한다. 5편 준비 구현에서는 구조를 크게 바꾸지 않고 `resize` 시점에
`updateBoardRenderSystem`으로 screen 좌표를 갱신하는 방식을 선택했다. 이 정도면 현재
규모에서는 단순하고, 이후 렌더링 책임을 더 분리할 때 자연스럽게 개선할 수 있다.

지뢰찾기 규칙 system은 Phaser에 의존하지 않게 유지한다. Phaser Scene은 입력 이벤트를
받아 system을 호출하고, 렌더 system을 다시 실행하는 adapter 역할에 가깝게 둔다.

현재 `/play/:slug/assets/:file` endpoint를 추가해 게임 빌드 asset을 `/play` 경로에서도
서빙한다. Astro dev server가 새로 생성된 `public/game-assets`를 즉시 잡지 못해 404가
나는 상황을 줄이기 위한 보완이다.

4편 대표 스크린샷은 headless Edge로 실제 Phaser canvas를 캡처했다. 게임오버 상태의
타이머, 난이도 버튼, 숫자, 지뢰 아이콘, 상태별 타일 색상이 보이도록 구성했다.

5편 준비 구현은 headless Edge로 desktop 1200x760, mobile portrait 390x720,
mobile landscape 760x390 캡처를 확인한다. desktop에서는 기존 상단 HUD 배치가 유지되고,
mobile portrait에서는 landscape 안내가 뜬다. mobile landscape에서는 낮은 height를
기준으로 HUD를 압축하고 보드 타일 크기를 다시 계산한다. 실제 터치 디바이스에서는
long press flag의 체감 시간과 pointer cancel 동작을 추가로 확인한다.
