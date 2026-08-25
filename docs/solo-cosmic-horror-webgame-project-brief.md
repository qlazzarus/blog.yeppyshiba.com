# Solo Cosmic Horror Web Game — Project Brief

## 0. 문서 목적

이 문서는 이후 Codex 또는 다른 AI 코딩 도구에서 바로 이어서 개발할 수 있도록 현재까지 정리된 프로젝트 방향을 기록한 작업 기준 문서다.

이 프로젝트는 기존 **Call of Cthulhu(CoC)** 의 1인 조사 플레이 감각에서 영감을 받지만, CoC의 고유 IP·문구·시나리오·캐릭터 시트·고유 규칙 표현을 그대로 복제하지 않고 **독자적인 Cosmic Horror Investigation Web Game** 으로 설계하는 것을 목표로 한다.

현재는 상업화가 우선 목적이 아니며, 우선 **혼자서 웹에서 즐길 수 있는 완성도 있는 싱글플레이 조사 게임**을 만드는 것이 목표다.

---

# 1. 프로젝트 핵심 목표

## 목표

브라우저에서 혼자 플레이할 수 있는:

- Cosmic Horror
- Investigation
- Narrative RPG
- Solo Board Game 감각

을 가진 웹게임을 만든다.

핵심 플레이 루프는 다음과 같다.

```text
캐릭터 생성
↓
사건 의뢰
↓
장소 조사
↓
NPC 대화
↓
능력 판정
↓
단서 획득
↓
이상현상 / 정신적 압박
↓
추론 및 선택
↓
최종 사건 해결
↓
엔딩
```

플레이어는 GM 없이 혼자 플레이한다.

게임 엔진이 Keeper / GM 역할을 담당한다.

---

# 2. 프로젝트가 출발한 이유

이 게임을 만들려는 핵심 이유는 다음과 같다.

- 크툴루 계열 조사 게임의 분위기를 좋아함
- 보드게임 / TRPG 스타일 게임 중 혼자서 플레이할 수 있는 경험에 관심이 있음
- 웹 기반으로 접근성이 높은 싱글플레이 게임을 만들고 싶음
- LLM 없이도 완전히 동작해야 함
- 나중에 필요하면 멀티플레이어를 붙일 수 있으나 현재는 제외

즉 핵심은:

> "혼자서 웹에서 즐길 수 있는 CoC 계열 감각의 조사형 Cosmic Horror RPG"

다.

---

# 3. 레퍼런스 방향

## Call of Cthulhu

CoC의 다음 요소들은 **참고할 플레이 감각**이다.

- 조사 중심
- 능력 판정
- 위험한 지식
- 인간보다 거대한 존재
- 정신적 압박
- 전투보다 정보와 선택이 중요
- 사건 단위 시나리오
- 단서를 통해 진실에 접근
- 플레이어 캐릭터가 점점 위험에 노출됨

단, 다음 요소는 그대로 복제하지 않는다.

- Call of Cthulhu 명칭
- Chaosium 고유 문구
- 캐릭터 시트 디자인
- CoC 룰북 문장
- 공식 시나리오
- 공식 NPC
- 공식 아트
- 공식 표
- SAN 규칙의 구체적 구조
- CoC 고유 용어를 그대로 사용

---

## In the Mouth of Madness

이 작품은 시스템 레퍼런스가 아니다.

참고하는 지점은 다음과 같다.

> Lovecraft / Cthulhu 계열의 분위기와 Cosmic Horror를 직접적인 원작 복제가 아니라 독자적인 세계관과 존재로 변주한 사례

즉:

- 기존 크툴루 신화를 그대로 옮기지 않음
- 분위기와 철학적 공포만 계승
- 신, 괴물, 도시, 종교, 책, 조직은 독자적으로 디자인

메타 웹 ARG 게임으로 만들려는 것이 아니다.

---

# 4. 현재 프로젝트 정의

작업명:

```text
Solo Cosmic Horror Investigation Web Game
```

향후 별도 작품명이 필요하다.

장르 정의:

```text
Solo Narrative Investigation RPG
+
Cosmic Horror
+
Digital Board Game
```

---

# 5. 멀티플레이어

현재 개발 범위에서는 제외한다.

## 현재

```text
Single Player Only
```

## 미래 확장 가능성

향후 구조가 안정화되면:

- 플레이어 여러 명
- Host
- WebSocket
- 공동 단서 보드
- 역할 분담
- Keeper 없는 Co-op

등을 고려할 수 있다.

현재 MVP에서는 절대 우선하지 않는다.

---

# 6. LLM 사용 원칙

## 핵심 원칙

게임 진행에 LLM이 필요하면 안 된다.

게임은 LLM 없이 100% 플레이 가능해야 한다.

```text
Player
↓
Choice
↓
Game Engine
↓
Rule
↓
Game State
↓
Event
```

## 초기 버전에서 LLM 제외

다음은 모두 deterministic / random game engine으로 처리한다.

- 캐릭터 능력치
- 주사위
- 판정
- NPC 선택지
- 아이템
- 단서
- 이동
- 사건 진행
- 정신 상태
- 엔딩 조건

## 향후 선택적 확장

나중에 LLM을 사용한다면:

- 자연어 플레이어 입력 → 게임 명령 변환
- NPC 자유 대화
- 부가적인 묘사 생성

정도로 제한한다.

LLM은 게임 규칙을 결정하는 주체가 되어서는 안 된다.

---

# 7. 룰 설계 접근법

## 잘못된 접근

다음 방식으로 진행하지 않는다.

```text
CoC 전체 룰 복사
↓
전체 JSON 변환
↓
이름 변경
↓
독자 게임화
```

문제:

- 작업량 과도
- 라이선스 리스크
- 불필요한 시스템까지 구현하게 됨
- CoC 구조에 지나치게 종속
- JSON이 게임 엔진 DSL처럼 비대해짐

---

# 8. 올바른 룰 설계 방식

CoC를 "복제 대상"이 아니라 "기능 목록 참고 자료"로 사용한다.

```text
CoC 플레이 경험 분석
↓
필요한 기능 추출
↓
우리 게임의 최소 룰 정의
↓
코드 프로토타입
↓
Case 0 제작
↓
실제 플레이
↓
필요한 룰 추가
↓
콘텐츠 JSON화
```

---

# 9. 초기 룰 기능 목록

## 반드시 필요

### Character

- 캐릭터 기본 정보
- 능력치
- HP 또는 Condition
- 정신 관련 상태
- 인벤토리
- 단서

### Skill Check

예:

```text
Perception 67

Roll: 42

42 <= 67

SUCCESS
```

백분율 판정을 사용할 수 있으나 CoC의 구체적인 성공 단계 구조를 그대로 복제하지 않는다.

---

# 10. 능력치 예시

초안:

```text
Vigor
Reflex
Learning
Perception
Influence
Resolve
Fortune
```

이름은 아직 확정이 아니다.

목표는 5~7개 정도로 제한한다.

---

# 11. 판정 시스템 초안

예시:

```text
Skill: Perception 67
Roll: 42
Result: Success
```

간단한 성공 단계 예:

```text
01~10      Exceptional
<= Skill   Success
> Skill    Failure
96~00      Complication
```

이 수치는 아직 확정이 아니다.

중요한 것은:

- 이해하기 쉬움
- 싱글플레이에 적합
- 빠른 판정
- 실패해도 게임이 막히지 않음

이다.

---

# 12. Fail Forward

매우 중요한 설계 원칙.

조사 게임에서는 중요한 단서를 단순 판정 실패로 영구적으로 잃게 만들지 않는다.

잘못된 예:

```text
Perception 실패
↓
단서 획득 실패
↓
진행 불가
```

권장:

```text
Perception 실패
↓
단서는 획득
+
Dread +1
또는
시간 경과
또는
NPC 의심 증가
또는
새로운 위험 발생
```

즉:

> 실패는 진행 차단이 아니라 새로운 비용 또는 위험이어야 한다.

---

# 13. 정신 시스템

CoC SAN 시스템을 그대로 사용하지 않는다.

초기 후보:

```text
Resolve
Dread
```

예:

```text
Resolve: 7
Dread: 2 / 10
```

## Dread 예시

```text
평범한 시체       +1
기이한 현상       +2
초자연적 존재     +3
진실 일부 이해    +4
```

단계 예:

```text
Dread 3 → 불안
Dread 5 → 공포 반응
Dread 7 → 일시적 이상
Dread 10 → 붕괴
```

아직 수치 및 용어는 확정하지 않는다.

---

# 14. 전투

초기 버전에서는 최소화한다.

이 게임의 중심은 전투가 아니다.

우선순위:

```text
Investigation > Decision > Horror > Combat
```

전투는 필요할 때만 간단한 규칙으로 추가한다.

---

# 15. 주요 게임 시스템

초기 엔진이 지원해야 할 기능:

```text
Character
SkillCheck
Dice
Condition / HP
Dread
Inventory
Evidence
Location
NPC
Dialogue
Choice
Flag
Event
Ending
SaveGame
```

---

# 16. 게임 상태

예시:

```ts
type GameState = {
  caseId: string;
  sceneId: string;
  locationId: string;

  turn: number;

  player: {
    hp: number;
    dread: number;

    stats: Record<string, number>;
  };

  inventory: string[];
  evidence: string[];

  flags: Record<string, boolean | number | string>;
};
```

---

# 17. 룰과 콘텐츠를 분리한다

가장 중요한 기술적 원칙.

## 룰

TypeScript 코드.

```text
/core
```

예:

```text
dice.ts
skillCheck.ts
dread.ts
inventory.ts
evidence.ts
character.ts
gameState.ts
```

## 콘텐츠

JSON 또는 TypeScript data.

```text
/content
```

예:

```text
/content
  /case00
  /case01
```

---

# 18. 절대 모든 것을 JSON으로 만들지 않는다

룰 자체까지 JSON DSL로 만들지 않는다.

예를 들어 이런 방향은 피한다.

```json
{
  "rule": "skill_check",
  "operator": "<=",
  "formula": "...",
  "critical": "...",
  "failure": "..."
}
```

이렇게 만들기 시작하면:

> 게임을 만드는 것이 아니라 게임 엔진용 프로그래밍 언어를 만드는 상황

이 된다.

---

# 19. JSON이 담당할 역할

JSON은 **콘텐츠 정의**에 사용한다.

예:

```json
{
  "id": "harbor_keeper",
  "text": "항구 관리인은 신경질적으로 담배를 피우고 있다.",
  "choices": [
    {
      "text": "실종자에 대해 묻는다",
      "check": {
        "type": "skill",
        "skill": "influence",
        "difficulty": "normal"
      },
      "success": "harbor_clue_02",
      "failure": "harbor_suspicion"
    }
  ]
}
```

---

# 20. 콘텐츠 구조 초안

예:

```text
/content
  /case00
    case.json
    locations.json
    npcs.json
    scenes.json
    evidence.json
    items.json
    endings.json
```

초기에는 파일을 너무 많이 나누지 않아도 된다.

Case 0에서는 하나 또는 두 개 JSON 파일로 시작해도 된다.

---

# 21. 사건 구조

하나의 사건은 다음 요소를 가진다.

```text
Case
├─ Locations
├─ NPCs
├─ Scenes
├─ Evidence
├─ Events
├─ Items
├─ Flags
└─ Endings
```

---

# 22. Evidence 시스템

이 게임의 핵심 시스템.

플레이어는 사건을 조사하면서 Evidence를 모은다.

예:

```text
Evidence

- 낡은 사진
- 선박 기록
- 의사의 메모
- 실종자 편지
```

특정 Evidence 조합이 새로운 선택지를 열 수 있다.

예:

```text
ship_manifest
+
old_photo

→ ask_about_1891_accident
```

---

# 23. Choice 시스템

게임은 기본적으로 자유 텍스트 입력이 아니라 선택지 기반이다.

예:

```text
관리인에게 무엇을 묻겠습니까?

[실종된 선원]
[밤의 소리]
[오래된 교회]
[대화를 끝낸다]
```

Evidence에 따라 선택지가 해금될 수 있다.

---

# 24. Event / Flag

시나리오 진행은 flag 기반으로 관리한다.

예:

```text
visited_harbor
found_ship_manifest
talked_to_doctor
church_unlocked
saw_entity
```

이 flag를 사용하여:

- 장소 해금
- 대화 해금
- 사건 발생
- 엔딩 결정

을 처리한다.

---

# 25. UI 방향

## 목표

최신 AAA 스타일 웹게임이 아니다.

다음 감성을 참고한다.

```text
1998~2003년 CGI / 초기 웹게임
```

단, 이것은 기능 제약이 아니라 **비주얼 디자인 방향**이다.

---

# 26. CGI 시대 스타일

예:

```text
+-----------------------------------+
| CASE 01 — THE DROWNED CHAPEL      |
+-------------+---------------------+
| MAP         | 사건 기록            |
|             |                     |
| [여관]      | 관리인은 당신을      |
|   |         | 바라보다 말을        |
| [항구]      | 멈춘다.             |
|   |         |                     |
| [교회]      | [대화한다]          |
|             | [주변 조사]         |
+-------------+---------------------+
| HP 8 | DREAD 2 | EVIDENCE 4       |
+-----------------------------------+
```

디자인 요소:

- 고정폭 레이아웃
- HTML table 스타일
- 낮은 해상도 이미지
- 작은 아이콘
- 텍스트 중심
- 과도한 animation 없음
- 페이지 단위 진행 느낌
- old web / CGI game 분위기

실제 구현은 현대 기술을 사용한다.

---

# 27. 기술 스택 방향

초기 권장:

```text
Next.js
TypeScript
React
```

첫 버전에서는:

```text
Backend 없음
DB 없음
WebSocket 없음
RabbitMQ 없음
LLM 없음
```

가능하면 정적 웹게임으로 시작한다.

---

# 28. SaveGame

초기:

```text
localStorage
```

또는

```text
IndexedDB
```

사용.

클라우드 저장은 나중에 필요할 경우 Backend를 추가한다.

---

# 29. 향후 Backend

필요해지면:

```text
Laravel
MySQL
```

을 고려한다.

사용 가능 기능:

- 로그인
- 클라우드 세이브
- 플레이 기록
- 시나리오 다운로드
- 멀티플레이
- 통계

초기에는 필요 없다.

---

# 30. MVP 이전 단계 — Case 0

가장 먼저 만들어야 하는 것은 완전한 Case 1이 아니다.

**Case 0**

개발 및 룰 검증을 위한 아주 작은 사건.

규모:

```text
장소 3개
NPC 2명
Evidence 5개
Skill Check 4개
Ending 2개
```

예상 플레이:

```text
10~20분
```

목표:

- 게임 루프 검증
- SkillCheck 검증
- Dread 검증
- Evidence 검증
- Flag 구조 검증
- Scenario 데이터 구조 검증

---

# 31. Case 0에서는 JSON부터 만들지 않아도 된다

중요.

첫 프로토타입은 콘텐츠를 코드에 하드코딩해도 된다.

예:

```ts
const scene = {
  id: "harbor-01",
  text: "...",
  choices: [...]
}
```

그 다음 Case 0이 정상적으로 동작하면:

```text
실제 구조 확인
↓
JSON Schema 설계
↓
Case 1부터 JSON 사용
```

한다.

---

# 32. 첫 정식 Case 규모

Case 1 목표:

```text
플레이 시간: 45~90분

Locations: 5~7
NPC: 4~5
Evidence: 약 10
Endings: 2~4
```

예:

```text
CASE 01

여관
항구
경찰서
교회
절벽
폐창고
```

---

# 33. 세계관 방향

Lovecraft / Cthulhu Mythos의 분위기는 유지하되 독자 세계관을 만든다.

피해야 할 방식:

```text
Cthulhu
→ 이름만 바꿔서 Sleepthulu

Nyarlathotep
→ 이름만 바꿔서 Dark Messenger
```

이런 단순 치환 방식은 사용하지 않는다.

---

# 34. 독자 Cosmic Horror

새로운 세계관의 기본 철학부터 만든다.

예시 아이디어:

```text
괴이한 존재는 우주에서 온 신이 아니라
인간이 특정한 진실을 관측하면 현실에 나타나는 존재다.
```

또는:

```text
인간은 세계를 관찰한다고 생각하지만
실제로는 세계가 인간을 통해 자신을 관찰한다.
```

아직 확정하지 않는다.

---

# 35. 라이선스 / IP 원칙

프로젝트는 CoC 호환 게임을 목표로 하지 않는다.

또한 Chaosium 공식 게임처럼 보이지 않게 한다.

사용하지 않을 것:

- Call of Cthulhu 로고
- Chaosium 로고
- CoC 공식 캐릭터 시트
- 공식 시나리오
- 공식 일러스트
- 공식 NPC
- 룰북 문구
- 공식 표
- 고유 상표
- 공식 상품 디자인

Lovecraft 원작 중 public domain 요소를 사용할 경우에도 작품별 권리 상태를 별도로 확인한다.

가능하면 핵심 신화와 존재는 전부 독자적으로 디자인한다.

---

# 36. 중요 디자인 원칙 요약

## 원칙 1

싱글플레이 우선.

## 원칙 2

LLM 없이 완전 동작.

## 원칙 3

조사가 핵심.

## 원칙 4

전투는 부가 요소.

## 원칙 5

Fail Forward.

## 원칙 6

룰은 코드.

## 원칙 7

콘텐츠는 데이터.

## 원칙 8

처음부터 모든 것을 JSON화하지 않는다.

## 원칙 9

Case 0부터 만든다.

## 원칙 10

CoC를 그대로 복제하지 않는다.

---

# 37. 권장 초기 프로젝트 구조

```text
src/
├─ app/
│  └─ game/
│
├─ components/
│  ├─ GameLayout.tsx
│  ├─ StoryPanel.tsx
│  ├─ ChoiceList.tsx
│  ├─ CharacterPanel.tsx
│  ├─ EvidencePanel.tsx
│  └─ MapPanel.tsx
│
├─ game/
│  ├─ core/
│  │  ├─ dice.ts
│  │  ├─ skillCheck.ts
│  │  ├─ dread.ts
│  │  ├─ evidence.ts
│  │  ├─ inventory.ts
│  │  ├─ flags.ts
│  │  └─ gameState.ts
│  │
│  ├─ cases/
│  │  └─ case00.ts
│  │
│  └─ types/
│     ├─ game.ts
│     ├─ case.ts
│     └─ character.ts
│
└─ styles/
```

---

# 38. 초기 Type 정의 초안

```ts
export type Character = {
  name: string;

  stats: {
    vigor: number;
    reflex: number;
    learning: number;
    perception: number;
    influence: number;
    resolve: number;
  };

  hp: number;
  dread: number;

  inventory: string[];
  evidence: string[];
};

export type SkillCheck = {
  skill: keyof Character["stats"];
  difficulty?: "normal" | "hard";
};

export type Choice = {
  id: string;
  text: string;

  check?: SkillCheck;

  successScene?: string;
  failureScene?: string;

  nextScene?: string;

  requiredEvidence?: string[];
  requiredFlags?: string[];
};

export type Scene = {
  id: string;
  locationId: string;

  title?: string;
  text: string;

  choices: Choice[];
};
```

이 정의도 아직 확정이 아니다.

Case 0 구현 과정에서 수정한다.

---

# 39. 개발 우선순위

## Phase 1 — Core

```text
GameState
Dice
SkillCheck
Choice
Scene
Flag
```

## Phase 2 — Investigation

```text
Evidence
Location
NPC
Dialogue
```

## Phase 3 — Horror

```text
Resolve
Dread
Condition
Horror Event
```

## Phase 4 — Case 0

```text
3 Locations
2 NPC
5 Evidence
2 Endings
```

## Phase 5 — Data Driven

Case 0을 기반으로 JSON 구조를 만든다.

## Phase 6 — UI Polish

CGI / old web game style 적용.

## Phase 7 — Case 1

45~90분짜리 정식 시나리오 제작.

---

# 40. Codex에게 다음에 요청할 작업

다음 세션에서 Codex에게 아래 순서대로 요청한다.

## Task 1

현재 프로젝트 구조를 확인하고 위 문서를 기반으로 게임 코어 아키텍처를 제안한다.

중요:

- 과도한 추상화 금지
- Redux 등 대형 상태관리 라이브러리는 당장 사용하지 않아도 됨
- JSON DSL을 만들지 말 것
- 멀티플레이 고려하지 말 것
- LLM 기능 추가하지 말 것
- Backend 추가하지 말 것

---

## Task 2

다음 최소 타입을 구현한다.

```text
GameState
Character
Scene
Choice
SkillCheck
Evidence
```

---

## Task 3

다음 Core 기능을 구현한다.

```text
rollPercentile()
resolveSkillCheck()
addEvidence()
setFlag()
applyDread()
moveToScene()
```

---

## Task 4

Case 0을 코드 기반으로 만든다.

Case 0 규모:

```text
3 locations
2 NPC
5 evidence
4 skill checks
2 endings
```

---

## Task 5

실제로 플레이 가능한 최소 UI를 만든다.

화면:

```text
GameLayout

├─ StoryPanel
├─ ChoiceList
├─ CharacterPanel
└─ EvidencePanel
```

Map은 초기에는 단순 버튼 또는 location list여도 된다.

---

# 41. Codex 개발 규칙

Codex는 다음 규칙을 지켜야 한다.

### 하지 말 것

- 처음부터 완성형 게임 엔진 만들기
- Generic RPG Engine 만들기
- ECS 도입
- Rule DSL 만들기
- 지나친 dependency 추가
- Backend 추가
- DB 추가
- WebSocket 추가
- LLM 추가
- 멀티플레이 구현
- 복잡한 JSON Schema부터 설계
- CoC 룰을 그대로 복제

### 할 것

- 작은 코드
- 명확한 TypeScript
- 테스트 가능한 pure function
- 데이터와 룰 분리
- Case 0이 실제로 플레이되는 것을 최우선
- 필요할 때만 추상화

---

# 42. 첫 번째 성공 기준

다음 상태가 되면 첫 프로토타입 성공으로 본다.

브라우저를 열었을 때:

```text
New Game
↓
캐릭터 생성
↓
사건 시작
↓
NPC 조사
↓
Skill Check
↓
Evidence 획득
↓
Dread 변화
↓
새 장소 해금
↓
사건 결말
↓
Ending
```

이 흐름이 10~20분 안에 실제로 플레이 가능해야 한다.

---

# 43. 프로젝트 핵심 문장

개발 중 방향을 잃었을 때 아래 문장으로 돌아온다.

> "CoC를 웹에서 복제하는 게임이 아니라,
> 혼자 플레이할 수 있는 독자적인 Cosmic Horror Investigation RPG를 만든다."

그리고:

> "룰북을 구현하는 것이 아니라 사건을 플레이할 수 있는 게임을 만든다."

그리고:

> "첫 목표는 범용 엔진이 아니라 Case 0의 완성이다."

---

# 44. 다음 대화 시작용 프롬프트

다음에 Codex에서 작업을 이어갈 때 이 MD 파일과 함께 아래 문장으로 시작한다.

```text
이 문서는 우리가 이전에 논의한 Solo Cosmic Horror Web Game의 기획 및 개발 기준 문서다.

문서의 방향을 유지한 채 개발을 이어가자.

우선 현재 코드베이스를 분석하고,
Case 0을 실제로 플레이할 수 있게 만들기 위해 필요한 최소 GameState / Scene / Choice / SkillCheck 구조부터 구현해줘.

중요:
- CoC 룰을 그대로 복제하지 않는다.
- Backend, DB, WebSocket, LLM, Multiplayer는 추가하지 않는다.
- 처음부터 범용 RPG 엔진을 만들지 않는다.
- JSON DSL을 만들지 않는다.
- 우선 코드 기반 Case 0을 완성한다.
```

---

# 45. 현재 상태

현재는 **기획 / 시스템 설계 단계**다.

아직 확정되지 않은 항목:

- 게임 정식 이름
- 능력치 이름
- Skill Check 공식
- Dread 상세 규칙
- Combat 상세 규칙
- 세계관
- Case 0 스토리
- Case 1 스토리
- UI 세부 디자인
- JSON Schema

이 항목들은 실제 Case 0 구현 과정에서 결정한다.

---

# END
