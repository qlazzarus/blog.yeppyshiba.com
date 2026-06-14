# Isometric Minesweeper 구현 로드맵

이 문서는 Phaser 4 기반 Isometric Minesweeper를 블로그 연재와 함께 완성하기
위한 구현 순서와 글감 범위를 정리한다.

현재 구현은 ECS scaffold, isometric 보드 렌더링, pointer hover 판정까지 완료된
상태다. 이후 작업은 실제 지뢰찾기 규칙을 얹고, 게임으로서 필요한 UI와 배포 품질을
차례로 올리는 방향으로 진행한다.

## 연재 방향

전체 연재는 너무 길게 늘리지 않고 7~8편 안에서 완성한다.

이미 작성한 첫 글은 1편으로 본다.

- 1편: Phaser 4로 Isometric Minesweeper 만들기 - ECS 기본 구조와 hover 판정
- 2편: ECS로 지뢰찾기 데이터 모델링하고 첫 클릭에 지뢰 배치하기
- 3편: 주변 지뢰 수 계산과 타일 reveal 구현하기
- 4편: 빈 칸 연쇄 오픈과 flag 입력 구현하기
- 5편: 승리/패배 상태와 게임 재시작 흐름 만들기
- 6편: isometric 렌더링 다듬기 - 숫자, 지뢰, 깃발, 상태별 타일
- 7편: 반응형/모바일 대응과 블로그 iframe 서비스 품질 정리
- 선택 외전: 작은 게임에서 ECS를 쓰며 느낀 장단점

## 다음 글 범위

다음 글은 기존 제안의 2번과 3번을 한 편으로 묶는다.

주제:

```text
ECS로 지뢰찾기 데이터 모델링하고 첫 클릭에 지뢰 배치하기
```

구현 목표:

- `MineComponent` 추가
- `FlagComponent` 또는 flagged 상태 추가 방향 결정
- `AdjacentMineCountComponent` 추가
- 보드 좌표에서 entity를 빠르게 찾는 helper 정리
- 첫 클릭 전에는 지뢰를 배치하지 않는 상태 추가
- 첫 클릭 타일과 주변 안전 영역을 제외하고 지뢰 배치
- 난수 배치 로직을 Phaser 의존성 없이 system으로 분리
- 배치 이후 주변 지뢰 수 계산 준비

글에서 다룰 포인트:

- 왜 지뢰를 보드 생성 시점이 아니라 첫 클릭 이후에 배치하는가
- ECS에서 mine, flag, count를 component로 나눌 때의 장단점
- `WorldResources`에 게임 진행 상태를 얼마나 둘 것인가
- 랜덤 로직을 테스트 가능하게 분리하는 방법
- isometric 렌더링과 게임 규칙을 분리하는 이유

이 글에서는 아직 완전한 reveal cascade까지 욕심내지 않는다. 클릭 한 번으로 지뢰가
배치되고, 각 타일이 mine/count 정보를 갖게 되는 지점까지를 마무리 기준으로 둔다.

## 기능 체크리스트

### 완료

- Phaser 4/Vite 게임 scaffold
- Astro 블로그 iframe embedding
- ECS 형태의 `World`, entity, component map 구성
- isometric 좌표 변환
- 보드 타일 렌더링
- pointer hover 판정
- hover 상태를 `WorldResources`로 이동

### 다음 작업

- 게임 상태 resource 추가
- 지뢰 component 추가
- 주변 지뢰 수 component 추가
- 첫 클릭 안전 지뢰 배치
- 좌표 기반 entity lookup 개선
- 지뢰 배치 결과를 임시 debug rendering으로 확인

### 이후 작업

- 좌클릭 reveal
- 우클릭 flag
- 주변 지뢰 수 표시
- 빈 칸 연쇄 오픈
- 패배 시 전체 지뢰 공개
- 승리 조건 계산
- 새 게임 버튼
- 난이도 선택
- 타이머와 남은 지뢰 수 UI
- 모바일 터치 입력
- 반응형 board layout 재계산
- localStorage 최고 기록 저장

## 구현 메모

현재 `RenderComponent`는 `screenX`, `screenY`를 저장한다. 다음 작업에서 바로 바꾸지는
않되, 반응형 대응 단계에서는 `PositionComponent`의 grid 좌표를 기준으로 렌더 시점에
screen 좌표를 계산하는 구조를 다시 검토한다.

지뢰찾기 규칙 system은 Phaser에 의존하지 않게 만든다. Phaser Scene은 입력 이벤트를
받아 system을 호출하고, 렌더 system을 다시 실행하는 adapter 역할에 가깝게 유지한다.

처음에는 10x10 보드와 고정 지뢰 수로 진행한다. 난이도 선택은 게임 규칙이 안정된 뒤에
추가한다.
