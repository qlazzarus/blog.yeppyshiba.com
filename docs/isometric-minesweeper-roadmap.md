# Isometric Minesweeper 구현 로드맵

이 문서는 Phaser 4 기반 Isometric Minesweeper를 블로그 연재와 함께 완성하기 위한
구현 순서와 글감 범위를 정리한다.

현재 구현은 ECS scaffold, isometric 보드 렌더링, pointer hover 판정, 첫 클릭 지뢰
배치, 주변 지뢰 수 계산, 기본 reveal/flag, 빈 칸 연쇄 오픈, 새 게임 버튼까지 들어간
상태다.

이후 작업은 게임 UX와 렌더링 품질, 모바일 대응, 기록 저장을 차례로 올리는 방향으로
진행한다.

## 연재 방향

전체 연재는 6~7편 안에서 완성한다.

- 1편: Phaser 4로 Isometric Minesweeper 만들기 - ECS 기본 구조와 hover 판정
- 2편: ECS로 지뢰찾기 데이터 모델링하고 첫 클릭에 지뢰 배치하기
- 3편: 빈 칸 연쇄 오픈과 새 게임 흐름 만들기
- 4편: isometric 렌더링 다듬기 - 숫자, 지뢰, 깃발, 상태별 타일
- 5편: 난이도 선택, 타이머, UI 정리
- 6편: 반응형/모바일 대응과 블로그 iframe 서비스 품질 정리
- 7편: localStorage 기록 저장과 플레이 polish
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

## 3편 글감 메모

주제:

```text
빈 칸 연쇄 오픈과 새 게임 흐름 만들기
```

글에서 다룰 포인트:

- isometric 화면이어도 reveal cascade는 grid 좌표로 처리한다.
- DFS 대신 BFS queue를 쓰면 reveal 범위를 단계적으로 확장하기 쉽다.
- 자동 reveal에서 flag를 존중해야 사용자의 의도를 망가뜨리지 않는다.
- 새 게임은 Phaser Scene 전체를 갈아엎기보다 `World`를 재생성하는 방식으로 처리했다.
- `mineCount - flags.size` 방식의 남은 지뢰 수 UI는 단순하지만, 잘못 꽂은 flag까지 포함한다.

## 다음 작업 후보

- 숫자, 깃발, 지뢰 렌더링을 text에서 sprite 또는 icon 기반으로 개선
- 상태별 타일 색상과 hover layer polish
- 새 게임 버튼 디자인 개선
- 난이도 선택
- 타이머 UI
- 모바일 long press flag 입력
- 반응형 board layout 재계산
- localStorage 최고 기록 저장

## 구현 메모

현재 `RenderComponent`는 `screenX`, `screenY`를 저장한다. 반응형 대응 단계에서는
`PositionComponent`의 grid 좌표를 기준으로 렌더 시점에 screen 좌표를 계산하는 구조를
다시 검토한다.

지뢰찾기 규칙 system은 Phaser에 의존하지 않게 유지한다. Phaser Scene은 입력 이벤트를
받아 system을 호출하고, 렌더 system을 다시 실행하는 adapter 역할에 가깝게 둔다.

처음에는 10x10 보드와 고정 지뢰 수로 진행한다. 핵심 게임 규칙은 어느 정도 안정됐으므로
다음부터는 시각적 polish와 난이도 선택을 검토할 수 있다.
