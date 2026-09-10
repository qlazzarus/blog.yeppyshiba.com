---
title: Apex Seoul 개발 기록 - 아날로그 HUD와 차량별 터보 응답
date: 2026-09-10T14:53:00+09:00
summary: 아날로그 RPM, 디지털 속도계, 차량별 부스트 계기를 구현했다. 트윈터보의 과급 상태를 두 단계로 분리하고, 계기판을 오른쪽 하단에 배치했다.
image: /images/posts/202609/apex-seoul-analog-hud/cover.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - game-dev
    - racing-game
    - pseudo-3d
---

![야간 산길의 파란 스포츠카와 아날로그 RPM·트윈 부스트 계기를 표현한 Apex Seoul 커버](/images/posts/202609/apex-seoul-analog-hud/cover.png)

## 이번 작업

[지난 글](/article/phaser4-apex-seoul-loading-scenes-and-garage-assets/)에서 정리한 로딩·차량 선택 흐름은 현재 코드에 연결되어 있다. 세 차량과 네 가지 색상을 선택하고, 주행과 결과 화면을 거쳐 재시도할 수 있다.

```text
LoadingScene → MainScene → VehicleSelectScene
  → TimeAttackScene → ResultScene → retry / main
```

이번에는 주행 HUD를 구현했다. 진단 텍스트에 섞여 있던 RPM·속도·기어를 별도 계기로 분리하고, 과급 방식에 따라 부스트 계기 수를 다르게 구성했다. 트윈터보는 두 계기가 각각 실제 상태를 표시하도록 엔진 계산도 수정했다.

![RPM 위에 두 부스트 계기를 배치한 Seorin GT의 실제 주행 화면](/images/posts/202609/apex-seoul-analog-hud/twin-turbo-hud.png)

## 공통 계기

| 정보      | 구현                                             |
| --------- | ------------------------------------------------ |
| RPM       | 바늘식 아날로그 계기, 차량별 최대 눈금과 redline |
| 속도      | 디지털 숫자와 km/h                               |
| 기어      | 속도 옆에 현재 기어 표시                         |
| 부스트    | 과급 차량에만 아날로그 계기 표시                 |
| 시간·진행 | 상단 타이머·checkpoint 수, 하단 progress 유지    |

RPM 눈금의 상한은 `VehicleEngineProfile.maxRpm`을 1,000 단위로 올림한 값이다. `redlineStartRpm`부터 붉은 영역을 표시하고, 실제 fuel cut 상태에서는 `REV LIMIT` 문구를 표시한다.

속도는 기존 `getDisplaySpeedKmh()`, 기어는 현재 엔진 프로파일의 label을 사용한다. 디버그 HUD는 일반 진입에서 껐다. `D`로 진단 텍스트를 켜고 꺼도 기본 계기와 타이머는 유지된다.

## 차량별 구성

| 차량        | 엔진 구성       | 부스트 계기 | 응답 특성                                       |
| ----------- | --------------- | ----------- | ----------------------------------------------- |
| Raven Coupe | NA, 자연흡기    | 없음        | 고회전 중심의 토크 곡선                         |
| Mirae GT    | 싱글터보        | 1개         | 낮은 회전수의 과급 지연, 중고회전에서 과급 증가 |
| Seorin GT   | 순차식 트윈터보 | 2개         | 낮은 회전수의 1차 과급, 높은 회전수의 2차 연결  |

기존 `engineProfile.ts`에 있던 Raven의 토크 곡선과 Mirae의 과급 응답은 유지했다. 이번 변경은 이 값을 HUD에 연결하고, Seorin의 단계별 상태를 분리하는 데 집중했다.

### Raven Coupe: NA

Raven은 RPM·속도·기어만 표시한다. 높은 회전수에서는 `NA · HIGH REV` 상태를 표시한다. 기존 토크 곡선의 최대 구간은 6,400~6,600 RPM이다.

![부스트 계기가 없는 Raven Coupe의 HUD](/images/posts/202609/apex-seoul-analog-hud/na-hud.png)

### Mirae GT: 싱글터보

Mirae는 3,000 RPM부터 목표 과급이 증가하고, 4,800 RPM에서 기본 과급 상승 구간이 끝난다. 실제 과급 값은 `spoolRate`에 따라 목표를 따라가며, 가속을 놓거나 제동하면 `decayRate`에 따라 감소한다. 바늘은 이 실제 값을 표시한다.

부분 스로틀도 목표 과급에 반영했다. 같은 RPM에서도 스로틀 값이 작으면 목표 부스트가 낮아진다.

![RPM 위에 단일 부스트 계기를 배치한 Mirae GT](/images/posts/202609/apex-seoul-analog-hud/single-turbo-hud.png)

### Seorin GT: 순차식 트윈터보

기존 Seorin은 2차 과급의 RPM 범위를 계산했지만, 동적 상태는 하나의 `boostRatio`로 관리했다. 이를 다음과 같이 분리했다.

```ts
export type EngineBoostState = {
    boostRatio: number;
    primaryBoostRatio: number;
    secondaryBoostRatio: number;
};
```

`getEngineBoostTargets()`가 회전수와 부하에 따른 단계별 목표를 계산하고, `advanceEngineBoost()`가 현재 값을 갱신한다. 1차는 낮은 회전수에서 먼저 반응하고, 2차는 3,900~4,700 RPM에서 연결된다.

1차의 `spoolRate`는 `5.4`, 2차의 `secondarySpoolRate`는 `3.2`로 설정했다. 각 단계의 값은 별도 계기로 표시하고, 다음 비율로 합성해 실제 토크 계산에 사용한다.

```text
total boost = primary × 0.8 + secondary × 0.2
```

합성 값은 완전 과급 상태의 토크 곡선에 도달하는 비율이다. 두 단계의 토크를 중복 가산하지 않는다. 순차식 동작은 현재 Seorin에 적용한 게임 설정이다.

## 부스트 단위

현재 부스트 모델은 실제 압력이 아닌 0~1 범위의 정규화된 상태를 사용한다. 계기 눈금은 0~100, 단위는 `%`로 표시했다. `67%`는 모델 내부의 과급 상태이며 `0.67 bar`를 뜻하지 않는다.

## 오른쪽 하단 배치

초기에는 RPM·속도를 왼쪽 하단, 부스트를 오른쪽 하단에 배치했다.

![RPM·속도와 부스트를 좌우로 나누었던 초기 배치](/images/posts/202609/apex-seoul-analog-hud/split-layout-before.png)

이후 [세가의 Initial D Arcade Stage Zero 화면](https://initiald.sega.jp/inid0/about/speedrun.html)을 참고해 RPM·속도·기어를 오른쪽 하단으로 모았다. 부스트는 RPM 왼쪽에 배치했다가, 중앙 도로 쪽 점유 폭을 줄이기 위해 RPM 위로 옮겼다.

```text
NA                SINGLE             TWIN

                   BOOST          TURBO 1  TURBO 2
   RPM               RPM                      RPM
속도 / 기어        속도 / 기어               속도 / 기어
```

싱글은 RPM과 같은 세로축에 부스트 하나를 둔다. 트윈은 위에 두 개를 나란히 두고, 오른쪽의 2차 계기를 RPM과 정렬한다. 차종이 바뀌어도 RPM과 속도계 위치는 고정된다.

RPM 반경은 78px, 부스트 반경은 54px다. 트윈 계기의 중심 간격은 132px, 부스트와 RPM 중심의 세로 간격은 180px로 잡았다. 계기 크기는 유지하면서 숫자와 제목이 겹치지 않도록 배치했다.

## 코드 구성

| 코드                       | 역할                                        |
| -------------------------- | ------------------------------------------- |
| `engineProfile.ts`         | 엔진 프로파일, 단계별 목표 과급과 시간 응답 |
| `updatePlayerVehicle()`    | 과급 상태 갱신과 토크 계산                  |
| `createGameplayHudState()` | 차량·주행 상태에서 HUD 표시값 추출          |
| `GameplayHud`              | 계기 면·바늘·숫자와 배치                    |
| `TimeAttackScene`          | HUD 갱신과 Scene 종료 시 정리               |

`gameplayHud.ts`에 기본 계기를 구현하고, 기존 `hud.ts`는 진단용으로 유지했다. 계기 면과 눈금은 생성 시 한 번 그린다. 프레임마다 바늘과 숫자를 갱신하며 Text·Graphics 객체는 재사용한다.

동력계는 오른쪽 하단 기준점을 공유하는 `cluster`에 묶었다. 타이머는 별도 container로 관리한다. HUD depth는 progress 위, countdown·finish 메시지 아래다. finish summary에서는 계기를 숨긴다.

## 남은 작업

다음은 계기에 표시되는 엔진 상태를 소리와 효과로 연결하는 작업이다. 부스트가 차오르면 터보 회전음이 올라가고, 가속을 놓으면 짧은 배출음이 나오도록 구성할 예정이다. 싱글터보가 힘을 내기 시작하는 순간과 트윈터보의 두 번째 단계가 연결되는 순간도 구분하려고 한다. 계기를 계속 보지 않아도 소리로 가속 시점을 짚을 수 있는 것이 목표다.

차량별 핸들링도 같은 코너에서 비교할 계획이다. Raven은 회전수와 속도를 유지하며 연속 코너를 통과하는 쪽으로, Mirae는 과급 지연을 고려해 코너 탈출 가속을 준비하는 쪽으로 성격을 잡고 있다. Seorin은 넓은 회전 영역의 응답을 살리되, 방향을 빠르게 바꿔야 하는 구간에서는 준비가 필요하도록 조정하려고 한다. 이 차이가 실제로 유효한지는 코너 진입 속도, 탈출 속도, 구간 기록으로 확인할 예정이다.

기록도 차량별로 나눌 예정이다. 같은 북악 코스라도 차를 바꾸면 감속 지점과 가속을 시작하는 위치가 달라지고, 그 선택이 구간 기록에 남게 된다. 결과 화면에서는 이전 주행보다 어느 구간이 빨라졌는지 확인할 수 있도록 확장하려고 한다. 완주 시간을 확인한 뒤, 다음 시도에서 바꿀 코너 하나를 정할 수 있는 정도의 피드백을 먼저 붙일 계획이다.

모바일에서는 계기판과 터치 조작을 함께 다듬어야 한다. 화면을 줄여도 속도와 RPM이 읽혀야 하고, 조향·가속·제동 버튼을 누르는 손이 차량과 코너를 가리지 않아야 한다. 특히 가속과 조향을 동시에 유지하다가 제동으로 전환하는 상황을 기준으로 배치를 확인할 예정이다.

이번에는 세 차량의 엔진 상태를 화면에 드러냈다. 다음 단계에서는 같은 코스를 달려도 차마다 다른 가속 타이밍과 코너 공략이 나오도록 주행을 다듬는다. 차를 바꿔 다시 달릴 이유를 만드는 작업이다.
