---
title: Apex Seoul의 loading scene 설계
date: 2026-09-03T21:00:00+09:00
summary: Apex Seoul이 loading scene을 어떻게 구성하는지 설계합니다.
image: /images/posts/202609/apex-seoul-loading-scenes/apex-seoul-loading-scenes-hero.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - game-dev
    - asset-pipeline
    - loading-screen
    - sprite
---

## sprite가 늘어났다, 이제 loading을 설계할 때가 왔다

[지난 글](/article/phaser4-apex-seoul-7way-vehicle-asset-compiler/)에서는 Raven Coupe, Seorin GT, Mirae GT의 7way 후보 atlas를 만들었다.

그 결과로 관리해야 할 출력물이 달라졌다.

```text
3 vehicles × 4 body colors × 192px sheet
+ 3 external shadow sheets
+ atlas metadata
= 로딩 해야할 runtime asset
```

이전처럼 게임 scene 하나에 자신에게 필요한 texture를 그때그때 불러와도 당장은 동작한다. 하지만 차량 선택, 색상 선택, record, 설정, 결과 화면을 붙이기 시작하면 관리해야할게 너무 늘어난다.

이번 글은 그 문제를 미리 정리하는 설계 기록이다. 아직 게임에 구현하거나 공개하지 않았다. 여기의 garage와 loading 화면은 **prototype**이며, 게임에 넣지 않았다.

![야간 garage에서 세 대의 차량과 asset 모듈, loading 진행 표시를 그린 Apex Seoul loading-scene hero](/images/posts/202609/apex-seoul-loading-scenes/apex-seoul-loading-scenes-hero.png)

---

## loading 은 첫 화면이 아니라 asset 적재의 입구

목표로 잡은 scene 흐름은 단순하다.

```text
LoadingScene
  → MainScene
  → VehicleSelectScene
  → GameScene
  → ResultScene
  → MainScene
```

여기서 `LoadingScene`은 전환 효과용 빈 화면이 아니다. 다음 scene들이 참조하는 **startup manifest를 전부 로드하고, 실패와 진행률을 한 곳에서 관리하는 입구**다.

최초 실행에서 크게 한 번 준비하는 구조라 다음 범위가 관리 대상이다.

| 묶음      | 처음부터 준비할 것                                                            | 제외할 것                                        |
| --------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| 공통 UI   | main, garage, result에서 공유하는 font·아이콘·panel                           | 편집용 debug asset                               |
| 주행 환경 | Bugak Ridge Downhill의 road/environment/effect                                | 아직 선택하지 않은 미래 코스                     |
| 차량      | 3종 × blue/red/silver/black 192px body atlas, 각 차의 shadow와 atlas metadata | 512px beauty source, role mask, QA contact sheet |
| audio     | 첫 주행에 필요한 효과음과 BGM data                                            | 재생 시점 전의 autoplay                          |

원본 GLB, role mask, 512px source는 compiler의 관리 대상이지 runtime의 관리 대상이 아니다. runtime 을 가볍게 해야한다. 😂

Phaser의 loader event도 asset manifest loading 결과를 보여 주는 데만 사용한다.

```text
loadstart      준비 시작
progress       전체 bytes / files 진행률
fileprogress   현재 asset의 짧은 이름
complete       MainScene으로 전환 가능
loaderror      재시도 또는 명확한 실패 화면
```

loading bar가 천천히 움직이는 연출을 만들지는 않고. 실제 progress를 우선한다, 다만 개발 중에는 화면이 깜박이듯이 느껴지진 않도록 최소 표시 시간을 둔다. 참고로 오디오는 browser autoplay 제약사항 때문에 플레이어가 시작을 선택한 뒤에만 시작한다.

## 차량 선택 화면은 새롭게 rendering 하진 않는다

차량 선택 용도로 별도 이미지를 써서 주행 화면의 sprite 를 활용할 수 없다. 그래서 선택 화면도 게임과 같은 192px body sheet를 읽자.

아래 GIF는 구현한 prototype이다.

- 17 pose sheet에서 normal/spin pose를 이어 15-frame 으로 만든다.
- 좌측 구간은 기존 cell을 `flipX`해 대칭을 유지한다.
- body sheet 는 미리 만들어둔 blue, red, silver, black으로 교체하도록 구현한다.

![Raven Coupe, Seorin GT, Mirae GT와 body palette가 차례로 바뀌는 7way sprite 기반 garage 선택 화면 prototype](/images/posts/202609/apex-seoul-loading-scenes/vehicle-selection-prototype.gif)

## 선택 결과는 작고 불변인 값으로 넘긴다

선택 화면에서 만든 sprite나 image 객체를 다음 scene으로 넘길 필요는 없다. 선택 결과는 아래처럼 작은 값 세 개면 충분하다.

```ts
type RunSetup = {
    vehicleId: 'raven-coupe' | 'seorin-gt' | 'mirae-gt';
    colorId: 'blue' | 'red' | 'silver' | 'black';
    courseId: 'bugak-ridge-downhill';
};
```

`VehicleSelectScene`은 `RunSetup`을 만들고, `GameScene`은 그 값으로 이미 로드된 texture와 headlight profile을 고른다. `ResultScene`은 완주 결과와 선택한 차량을 보여 준다.

이렇게 해 두면 scene 사이에 render 상태가 남지 않는다. Phaser의 texture cache는 scene이 끝나도 자동으로 비워지지 않으므로, startup에서 읽은 asset은 한 게임 세션 안에서 공유하면 된다.

기록은 차종과 코스로 나눈다. color는 현재 외형만 바꾸므로 기록을 나누는 기준에는 넣지 않는다.

```text
best record key = vehicleId + courseId
colorId         = presentation metadata
```

같은 성능의 차를 색만 바꿔 골랐는데 leaderboard가 갈라지는 일을 막기 위해서다. 나중에 차종마다 물리 profile이 달라지면, 먼저 이 key 규칙부터 다시 정한 뒤 record UI를 늘리면 된다.

## loading 에서 한번에 preload 를 하자.

차량 body sheet 12장과 shadow sheet 3장이 생겼다고, 곧바로 streaming loader가 필요한 것은 아니다. 현재 atlas는 192px이고 코스도 하나다. 처음 실행할 때 필요한 공통 asset을 한 번에 읽어도 부담이 크지 않다.

지금은 이 편이 더 단순하고 안정적이다. loading bar는 실제 진행률을 보여 주고, main과 garage는 준비가 끝난 뒤에만 연다. 차량을 고르거나 색을 바꿨을 때 뒤늦게 asset을 받느라 기다릴 일도 없다.

나중에 아래 상황이 생기면, 미리 읽을 asset 목록을 둘로 나눈다.

- 코스가 여러 개로 늘어나 environment와 BGM이 크게 달라진다.
- 고용량 음악, replay, photo mode 같은 선택 기능이 생긴다.
- mobile network에서 내려받는 용량과 시간이 눈에 띄게 커진다.

그때도 `LoadingScene`을 없앨 필요는 없다. 게임을 열 때 읽는 `startup manifest`와 코스를 고른 뒤 읽는 `course manifest`로 나누면 된다. cache에서 asset을 언제 비울지도 실제로 필요해지는 시점에 정한다. 아직은 모든 scene이 따로 loader를 갖는 복잡한 구조보다, 한 번 준비하고 함께 쓰는 방식이 알맞다.

## 앞으로 남은 구현

여기까지는 asset을 준비하고, 선택 화면이 어떤 값을 다음 화면에 넘겨야 하는지 정리한 단계다. 아직 game에 scene 흐름을 연결하지는 않았다.

다음 구현은 아래 순서로 진행한다.

1. `LoadingScene`에서 startup asset 목록을 읽고, 실제 progress를 표시한다.
2. `MainScene`에서 시작·기록·설정으로 들어가는 입구를 만든다.
3. `VehicleSelectScene`에서 세 차량과 네 색상을 고르고, 선택값을 `RunSetup`으로 고정한다.
4. `GameScene`이 선택한 차량의 7way atlas, headlight, shadow를 사용하도록 연결한다.
5. `ResultScene`에서 완주 기록과 선택 차량을 보여 준 뒤 main으로 돌아온다.

각 단계는 기존 직접 QA 진입 경로를 유지한 채 붙인다. menu를 만든 뒤에도 코너링, 헤드라이트, 차량 표현을 빠르게 따로 확인할 수 있어야 하기 때문이다.

## 마무리

이번 글에서 만든 GIF는 완성된 차량 선택 기능이 아니다. 다만 새 7way sprite가 주행 화면 밖에서도 같은 차로 보이고, 색상과 그림자를 같은 규칙으로 바꿀 수 있다는 점은 확인했다.

이제 남은 일은 asset을 더 만드는 것이 아니라, 이 asset을 loading부터 결과 화면까지 끊기지 않게 연결하는 일이다. 다음 글에서는 이 설계를 실제 scene과 loader로 옮기면서, 선택한 차량이 게임 시작부터 기록 화면까지 어떻게 유지되는지 확인해 보려 한다.
