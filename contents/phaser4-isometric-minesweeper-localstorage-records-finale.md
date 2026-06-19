---
title: Phaser 4 Isometric Minesweeper 6편 — localStorage 기록 저장으로 마무리하기
date: 2026-06-19T09:00:00+09:00
summary: Isometric Minesweeper에 난이도별 최고 기록 저장, Best 표시, New best 상태, 기록 초기화 버튼을 추가하고 이번 지뢰찾기 연재를 마무리했습니다.
image: /images/posts/202606/isometric-minesweeper-records.png
category: coding
tags:
    - phaser
    - phaser4
    - ecs
    - isometric
    - minesweeper
    - webgame
    - game-dev
    - typescript
---

## 들어가며

[지난 글](/article/phaser4-isometric-minesweeper-mobile-landscape-responsive/)에서는 Isometric Minesweeper를 모바일에서도 플레이할 수 있게 다듬었다.

그때 구현한 내용은 다음과 같았다.

- tap reveal
- long press flag
- 모바일 세로 화면에서 landscape 안내
- 모바일 landscape HUD 압축
- Phaser scale mode를 `RESIZE`로 변경
- resize 시 board layout과 render 좌표 재계산
- isometric diamond footprint 기준 보드 크기 계산

이제 데스크톱과 모바일 가로 화면에서 기본 플레이는 가능해졌다.

처음 목표였던 “블로그 안에서 실제로 실행되는 작은 Phaser 4 지뢰찾기”에는 거의 도착했다.

마지막으로 하나만 더 넣고 싶었다.

기록이다.

타이머가 있어도 기록이 남지 않으면 한 판이 끝나고 사라진다.

반대로 최고 기록이 남으면 게임이 아주 작아도 다시 한 번 줄여보고 싶은 이유가 생긴다.

그래서 이번 글에서는 localStorage로 난이도별 최고 기록을 저장하고, 이번 Isometric Minesweeper 연재를 마무리한다.

현재 데모는 아래에서 볼 수 있다.

[Isometric Minesweeper 데모 보기](/games/isometric-minesweeper/)

<div style="position: relative; width: 100%; height: min(70vh, 560px); margin: 24px 0;">
    <iframe
        src="/play/isometric-minesweeper/"
        title="Isometric Minesweeper"
        loading="lazy"
        allow="fullscreen; screen-orientation"
        style="position: absolute; inset: 0; width: 100%; height: 100%; border: 1px solid #26343c; border-radius: 8px; background: #10161a;"
    ></iframe>
</div>

이번 구현 후 화면에는 `Best`와 `Reset records`가 추가됐다.

![최고 기록 표시가 추가된 Isometric Minesweeper](/images/posts/202606/isometric-minesweeper-records.png)

## 이번 구현 범위

이번 구현 범위는 일부러 크게 잡지 않았다.

- 난이도별 최고 기록 저장
- status text에 `Best mm:ss` 표시
- 승리 시 기존 기록보다 빠르면 `New best` 표시
- 기록 초기화 버튼 추가
- localStorage가 실패해도 게임이 계속 동작하게 방어
- 저장된 JSON이 깨져 있어도 무시하고 복구

이번 글은 화려한 기능 추가라기보다, 작은 게임을 끝까지 닫는 작업에 가깝다.

처음 클릭해서 지뢰를 배치하고, 빈 칸이 연쇄로 열리고, 난이도와 타이머가 있고, 모바일에서도 누를 수 있고, 이제 기록도 남는다.

여기까지 오면 일단 하나의 작은 게임으로 완결됐다고 볼 수 있다.

## 기록은 World에 넣지 않았다

이 게임은 작은 ECS 형태로 만들었다.

`World`에는 타일, 지뢰, 깃발, 주변 지뢰 수, 게임 상태 같은 값이 들어간다.

그렇다면 최고 기록도 `World`에 넣어야 할까?

이번에는 넣지 않았다.

최고 기록은 한 판의 내부 상태가 아니다.

게임을 새로 시작해도 유지되어야 하고, 페이지를 다시 열어도 남아야 한다.

반대로 `World`는 새 게임을 누르면 다시 만들어도 되는 값이다.

그래서 기록은 별도 모듈로 뺐다.

```ts
const BEST_RECORDS_STORAGE_KEY = 'isometric-minesweeper:best-records:v1';

export type BestRecord = {
    completedAt: string;
    elapsedSeconds: number;
};

export type BestRecords = Partial<Record<DifficultyId, BestRecord>>;
```

key에는 버전을 붙였다.

```ts
isometric-minesweeper:best-records:v1
```

나중에 저장 구조를 바꾸고 싶을 때 `v2`로 올리면 된다.

작은 게임이어도 localStorage에 저장하는 데이터는 브라우저에 오래 남는다. 그래서 처음부터 key 이름을 조금 길고 명확하게 잡는 편이 낫다.

## localStorage는 실패할 수 있다

localStorage는 간단하다.

```ts
localStorage.setItem(key, value);
localStorage.getItem(key);
```

하지만 항상 성공한다고 보면 안 된다.

브라우저 설정, private mode, iframe 환경, 저장 공간 제한 등에 따라 읽기나 쓰기가 실패할 수 있다.

그래서 `getLocalStorage`부터 방어적으로 만들었다.

```ts
function getLocalStorage(): StorageLike | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}
```

그리고 읽을 때도 try/catch로 감싼다.

```ts
export function loadBestRecords(storage = getLocalStorage()): BestRecords {
    if (!storage) return {};

    try {
        const rawRecords = storage.getItem(BEST_RECORDS_STORAGE_KEY);
        if (!rawRecords) return {};

        return normalizeRecords(JSON.parse(rawRecords));
    } catch {
        return {};
    }
}
```

읽기에 실패하면 빈 기록으로 시작한다.

기록 저장이 실패했다고 게임이 멈추면 안 된다.

기록은 있으면 좋은 persistence state이지, 지뢰찾기 규칙 자체는 아니기 때문이다.

## 저장된 JSON도 믿지 않는다

localStorage에서 읽은 JSON은 내 코드가 저장한 값처럼 보인다.

하지만 반드시 그렇지는 않다.

개발 중에 직접 수정했을 수도 있고, 예전 버전 데이터가 남아 있을 수도 있고, 사용자가 devtools에서 건드렸을 수도 있다.

그래서 parse한 값을 바로 쓰지 않고 normalize한다.

```ts
function normalizeRecords(value: unknown): BestRecords {
    if (!value || typeof value !== 'object') return {};

    const records: BestRecords = {};

    for (const difficultyId of ['beginner', 'standard', 'expert'] as const) {
        const candidate = (value as Record<string, unknown>)[difficultyId];

        if (!candidate || typeof candidate !== 'object') continue;

        const record = candidate as Record<string, unknown>;
        const elapsedSeconds = record.elapsedSeconds;
        const completedAt = record.completedAt;

        if (
            typeof elapsedSeconds !== 'number' ||
            !Number.isFinite(elapsedSeconds) ||
            elapsedSeconds <= 0 ||
            typeof completedAt !== 'string'
        ) {
            continue;
        }

        records[difficultyId] = {
            completedAt,
            elapsedSeconds: Math.floor(elapsedSeconds),
        };
    }

    return records;
}
```

여기서는 세 가지만 확인한다.

- 난이도 id가 기대한 값인가?
- `elapsedSeconds`가 정상적인 양수인가?
- `completedAt`이 문자열인가?

검사를 통과하지 못한 값은 버린다.

작은 게임에서 과한 검증처럼 보일 수 있지만, 이런 습관은 꽤 유용하다.

저장소에 있는 데이터는 이미 외부 입력에 가깝다.

## 더 빠른 기록일 때만 저장한다

기록 저장 흐름은 단순하다.

현재 난이도의 기존 기록이 없거나, 새 시간이 더 빠르면 저장한다.

```ts
export function saveBestRecord(
    difficultyId: DifficultyId,
    elapsedSeconds: number,
    storage = getLocalStorage(),
    completedAt = new Date(),
) {
    const records = loadBestRecords(storage);
    if (!storage) {
        return {
            records,
            updated: false,
        };
    }

    const previousRecord = records[difficultyId];

    if (
        elapsedSeconds <= 0 ||
        (previousRecord && previousRecord.elapsedSeconds <= elapsedSeconds)
    ) {
        return {
            records,
            updated: false,
        };
    }

    const nextRecords = {
        ...records,
        [difficultyId]: {
            completedAt: completedAt.toISOString(),
            elapsedSeconds,
        },
    };

    try {
        storage.setItem(BEST_RECORDS_STORAGE_KEY, JSON.stringify(nextRecords));
    } catch {
        return {
            records,
            updated: false,
        };
    }

    return {
        records: nextRecords,
        updated: true,
    };
}
```

반환값에는 두 가지를 담았다.

- `records`: 저장 후 화면에 반영할 기록 목록
- `updated`: 이번 clear가 새 최고 기록인지 여부

이 `updated` 값은 UI에서 `New best`를 표시하는 데 쓴다.

## 타이머 구현을 회수한다

4편에서 타이머를 만들 때 `elapsedSeconds`와 `timerStartedAt`을 분리했다.

```ts
private elapsedSeconds = 0;
private timerStartedAt: number | null = null;
```

당시에는 타이머를 멈추기 위해 나눈 구조였다.

플레이 중이면 `timerStartedAt`을 기준으로 현재 시간을 계산한다.

게임이 끝나면 `elapsedSeconds`에 값을 고정하고 `timerStartedAt`을 비운다.

```ts
private stopTimer() {
    this.elapsedSeconds = this.getElapsedSeconds();
    this.timerStartedAt = null;
}
```

이번 기록 저장에서는 이 구조가 그대로 도움이 됐다.

승리 시점에 `stopTimer()`를 호출하면 `elapsedSeconds`가 확정된다.

그 값을 저장하면 된다.

```ts
private syncTimerAfterAction(previousStatus: string) {
    if (
        previousStatus === 'ready' &&
        this.world.resources.minefieldReady &&
        this.timerStartedAt === null
    ) {
        this.startTimer();
    }

    if (
        this.world.resources.gameStatus === 'won' ||
        this.world.resources.gameStatus === 'lost'
    ) {
        this.stopTimer();

        if (this.world.resources.gameStatus === 'won') {
            this.saveCurrentBestRecord();
        }
    }
}
```

패배했을 때는 저장하지 않는다.

승리했을 때만 현재 난이도의 최고 기록 후보가 된다.

## status text에 Best를 넣는다

기록을 별도 패널로 만들 수도 있었다.

하지만 현재 게임 UI는 상단 status text 하나에 주요 정보를 모으고 있다.

그래서 일단 같은 줄에 `Best`를 넣었다.

```ts
private getStatusText() {
    const flagCount = this.world.flags.size;
    const minesLeft = getMinesLeft(this.world, this.boardLayout);
    const elapsedTime = this.formatElapsedTime();
    const prefix = `${this.difficulty.label} | ${elapsedTime} | Best ${this.getBestTimeText()}`;

    if (this.world.resources.gameStatus === 'ready') {
        return `${prefix} | Ready | Mines left ${minesLeft} | Flags ${flagCount}`;
    }

    if (this.world.resources.gameStatus === 'lost') {
        return `${prefix} | Game over | Mines left ${minesLeft} | Flags ${flagCount}`;
    }

    if (this.world.resources.gameStatus === 'won') {
        const clearLabel = this.roundClearedWithNewBest ? 'New best' : 'Clear';

        return `${prefix} | ${clearLabel} | Mines left ${minesLeft} | Flags ${flagCount}`;
    }

    return `${prefix} | Playing | Mines left ${minesLeft} | Flags ${flagCount}`;
}
```

기록이 없으면 `--:--`로 보여준다.

```ts
private getBestTimeText() {
    const bestRecord = this.bestRecords[this.difficulty.id];

    return bestRecord ? formatRecordTime(bestRecord.elapsedSeconds) : '--:--';
}
```

시간 formatting은 현재 타이머와 최고 기록이 같이 쓰도록 모듈로 뺐다.

```ts
export function formatRecordTime(seconds: number) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0');

    return `${minutes}:${remainingSeconds}`;
}
```

작은 중복이지만, 이런 값은 서로 다르게 보이면 더 어색하다.

현재 시간과 최고 기록은 같은 형식으로 표시하는 편이 좋다.

## 기록 초기화 버튼

기록을 저장하면 초기화도 필요하다.

개발 중 테스트할 때도 필요하고, 실제 플레이에서도 기록을 지우고 싶을 수 있다.

그래서 `Reset records` 버튼을 추가했다.

```ts
this.resetRecordsButton = this.add
    .text(650, 64, 'Reset records', {
        backgroundColor: '#26343c',
        color: '#aeb8b4',
        fixedWidth: 126,
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: '700',
        padding: {
            bottom: 7,
            left: 10,
            right: 10,
            top: 7,
        },
    })
    .setDepth(10)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
        clearBestRecords();
        this.bestRecords = {};
        this.roundClearedWithNewBest = false;
        this.renderGame();
    });
```

기록 삭제도 실패할 수 있으므로 모듈 쪽에서는 조용히 방어한다.

```ts
export function clearBestRecords(storage = getLocalStorage()) {
    try {
        storage?.removeItem(BEST_RECORDS_STORAGE_KEY);
    } catch {
        // localStorage can be unavailable in private or restricted browser contexts.
    }
}
```

모바일 landscape에서는 이 버튼을 숨겼다.

지난 글에서 정리했듯이 모바일 가로 화면은 높이가 낮다.

그 좁은 HUD 영역에 버튼을 더 넣으면 status text와 겹칠 가능성이 컸다.

```ts
this.resetRecordsButton.setVisible(!landscapeShort);
```

모바일에서는 기록 초기화가 핵심 플레이 동작은 아니다. 그래서 작은 화면에서는 과감히 덜어냈다.

## 이번 구현에서 남긴 기준

이번 기능은 작지만 몇 가지 기준을 다시 확인했다.

첫째, 한 판의 상태와 브라우저에 남는 상태를 분리한다.

`World`는 새 게임마다 다시 만들 수 있다.

하지만 최고 기록은 새 게임을 눌러도 남아야 한다.

둘째, localStorage는 편하지만 신뢰할 수 있는 저장소는 아니다.

읽기, 쓰기, parse, schema 모두 실패할 수 있다고 보고 처리했다.

셋째, UI는 화면 크기에 따라 빼는 것도 구현이다.

모바일 landscape에서 `Reset records` 버튼을 숨긴 것은 기능을 포기한 게 아니라, 플레이 화면을 지키기 위한 선택이다.

작은 게임일수록 화면에 올리는 모든 글자와 버튼이 크게 느껴진다.

## 확인한 것

이번 구현은 다음 명령으로 확인했다.

```bash
npx tsc --project games/isometric-minesweeper/tsconfig.json
npm --workspace @games/isometric-minesweeper run build
npm run build:games
npm run build:site
```

그리고 headless Edge로 두 가지 화면을 확인했다.

- desktop: `1200x760`
- mobile landscape: `760x390`

desktop에서는 `Best --:--`와 `Reset records`가 보드와 겹치지 않았다.

mobile landscape에서는 `Best --:--`만 status text에 들어가고, `Reset records` 버튼은 숨겨진다.

## 연재를 마무리하며

이번 Isometric Minesweeper는 처음부터 거창한 게임을 만들려던 프로젝트는 아니었다.

목표는 작았다.

Phaser 4에서 isometric 보드를 그리고, ECS 비슷한 구조로 지뢰찾기 규칙을 쌓고, 블로그 안에서 iframe으로 실행되는 게임을 만들어보는 것.

6편 동안 구현한 흐름을 돌아보면 이렇다.

- 1편: Phaser 4 scaffold, ECS 기본 구조, isometric hover 판정
- 2편: Mine, Flag, AdjacentMineCount, 첫 클릭 지뢰 배치
- 3편: 빈 칸 연쇄 오픈과 새 게임 흐름
- 4편: 난이도, 타이머, 렌더링 polish
- 5편: 모바일 입력, landscape 대응, 반응형 layout
- 6편: localStorage 최고 기록 저장

이 정도면 작은 웹게임 하나를 끝까지 한 바퀴 돈 셈이다.

규칙, 입력, 렌더링, 반응형, 배포 경로, 기록 저장까지 모두 한 번씩 만졌다.

물론 더 넣을 수 있는 것은 많다.

- chord reveal
- sprite atlas
- 클릭 애니메이션
- 난이도 커스텀
- 더 섬세한 모바일 UX

하지만 여기서 멈추는 것도 중요하다.

작은 게임은 너무 오래 붙잡으면 끝이 흐려진다.

이번 지뢰찾기는 여기서 마무리하고, 다음에는 이 연재에서 얻은 구조와 시행착오를 다른 게임이나 도구에 가져가보려고 한다.

작은 Phaser 4 게임을 블로그에 올리는 길은 이제 어느 정도 보였다.

그게 이번 연재의 가장 큰 수확이다.
