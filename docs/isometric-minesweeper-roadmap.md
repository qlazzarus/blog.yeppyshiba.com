# Isometric Minesweeper 구현 로드맵

이 문서는 Phaser 4 기반 Isometric Minesweeper를 블로그 연재와 함께 완성하기 위한
구현 순서와 글감 범위를 정리한다.

현재 구현은 ECS scaffold, isometric 보드 렌더링, pointer hover 판정, 첫 클릭 지뢰
배치, 주변 지뢰 수 계산, 기본 reveal/flag, 빈 칸 연쇄 오픈, 새 게임 버튼, 난이도
선택, 타이머, 1차 렌더링 polish까지 들어간 상태다.

4편 글 초안과 대표 스크린샷까지 작성/생성했다. 이후 작업은 모바일 대응, 반응형 layout,
기록 저장, 고급 입력을 차례로 올리는 방향으로 진행한다.

## 현재 상태

- 게임 데모: `/games/isometric-minesweeper/`
- 플레이 iframe: `/play/isometric-minesweeper/`
- 게임 소스: `games/isometric-minesweeper/`
- 4편 대표 이미지:
  `/images/posts/202606/isometric-minesweeper-difficulty-timer-polish.png`
- 4편 글:
  `contents/phaser4-isometric-minesweeper-difficulty-timer-render-polish.md`
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
- 다음: 5편: 반응형/모바일 대응과 블로그 iframe 서비스 품질 정리
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

## 완료한 글과 이미지

- 1편 글: `contents/phaser4-isometric-minesweeper-ecs-scaffold.md`
- 1편 이미지: `/images/posts/202606/isometric-minesweeper.png`
- 2편 글: `contents/phaser4-isometric-minesweeper-minefield-first-click.md`
- 2편 이미지: `/images/posts/202606/isometric-minesweeper-click.jpg`
- 3편 글: `contents/phaser4-isometric-minesweeper-reveal-cascade-reset.md`
- 3편 이미지: `/images/posts/202606/isometric-minesweeper-combo.jpg`
- 4편 글: `contents/phaser4-isometric-minesweeper-difficulty-timer-render-polish.md`
- 4편 이미지: `/images/posts/202606/isometric-minesweeper-difficulty-timer-polish.png`

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

## 다음 구현: 5편 범위

주제:

```text
반응형/모바일 대응과 블로그 iframe 서비스 품질 정리
```

목표:

- 모바일에서 기본 플레이가 가능해야 한다.
- 작은 iframe에서도 HUD와 보드가 겹치지 않아야 한다.
- 게임 asset 서빙 경로가 dev/build 모두에서 안정적으로 동작해야 한다.

구현 후보:

- mobile tap reveal
- long press flag
- long press 중 실수 reveal 방지
- pointer/touch 입력 분기 정리
- `resize` 이벤트 대응
- 난이도별 board layout 재계산
- HUD 고정 좌표 개선
- 작은 화면에서는 버튼/상태 문구를 2줄로 재배치
- iframe wrapper 높이와 game canvas 비율 재검토
- `/play/:slug/assets/:file` endpoint 유지 여부 검토
- favicon 404 정리

글에서 다룰 포인트:

- 데스크톱 우클릭 입력은 모바일에서 그대로 쓸 수 없다.
- long press는 UX가 단순하지만 타이밍과 취소 조건을 신경 써야 한다.
- `RenderComponent`에 screen 좌표를 저장하는 구조는 resize 대응에서 다시 고민할 지점이다.
- 블로그 iframe에서 게임을 서비스하면 game build asset 경로와 Astro dev server 동작까지 같이 봐야 한다.

## 다음 작업 후보

- 모바일 long press flag 입력
- 반응형 board layout 재계산
- localStorage 최고 기록 저장
- 난이도별 최고 기록 저장
- chord reveal
- sprite atlas 기반 icon 교체
- 클릭 애니메이션

## 구현 메모

현재 `RenderComponent`는 `screenX`, `screenY`를 저장한다. 반응형 대응 단계에서는
`PositionComponent`의 grid 좌표를 기준으로 렌더 시점에 screen 좌표를 계산하는 구조를
다시 검토한다.

지뢰찾기 규칙 system은 Phaser에 의존하지 않게 유지한다. Phaser Scene은 입력 이벤트를
받아 system을 호출하고, 렌더 system을 다시 실행하는 adapter 역할에 가깝게 둔다.

현재 `/play/:slug/assets/:file` endpoint를 추가해 게임 빌드 asset을 `/play` 경로에서도
서빙한다. Astro dev server가 새로 생성된 `public/game-assets`를 즉시 잡지 못해 404가
나는 상황을 줄이기 위한 보완이다.

4편 대표 스크린샷은 headless Edge로 실제 Phaser canvas를 캡처했다. 게임오버 상태의
타이머, 난이도 버튼, 숫자, 지뢰 아이콘, 상태별 타일 색상이 보이도록 구성했다.
