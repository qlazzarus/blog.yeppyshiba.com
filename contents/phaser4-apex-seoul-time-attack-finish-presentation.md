---
title: 달리는 것만으로는 타임어택이 되지 않았다 - Apex Seoul에 결승선을 만드는 법
date: 2026-07-29T22:10:00+09:00
summary: Apex Seoul에 checkpoint split, best record, 가로등과 Π형 gate를 더하고, 고정 카메라에서도 차량이 도로 위를 계속 달려 사라지는 finish 연출을 만든 과정을 정리합니다.
image: /images/posts/202607/apex-seoul-time-attack-finish-hero.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - pseudo-3d
    - game-dev
    - racing-game
    - time-attack
---

## 코너를 통과해도 아직 한 판이 끝나지 않았다

[지난 글](/article/phaser4-apex-seoul-steering-required-corner-physics/)에서는 무입력 차량이 도로를 자동으로 따라가던 문제를 고쳤다.

이제 코너를 통과하려면 실제로 감속하고 turn-in 해야 한다. 같은 가드레일을 여러 번 튕기던 충돌도 한 번의 접촉 사건으로 묶었다.

그런데 그 다음에 게임을 다시 해 보니, 이상하게도 한 판을 다시 달릴 이유가 약했다.

도로 끝까지 가도 무엇이 기록됐는지, 어느 지점을 얼마나 빨리 지나갔는지, 끝난 뒤 차량이 어디로 갔는지가 분명하지 않았다. 핸들링은 규칙이 되었지만 아직 time attack의 한 판은 아니었다.

이번 작업은 새 차나 새 코스를 늘리는 대신, 이미 있는 Bugak Ridge Downhill에 최소한의 완주 구조를 붙이는 일이었다.

```text
countdown
  → timed run
  → checkpoint split
  → finish
  → fixed-camera coast
  → result / best record
  → restart
```

[Apex Seoul 데모 보기](/games/apex-seoul/)

<div style="position: relative; width: 100%; height: min(70vh, 560px); margin: 24px 0;">
    <iframe
        src="/play/apex-seoul/"
        title="Apex Seoul"
        loading="lazy"
        style="position: absolute; inset: 0; width: 100%; height: 100%; border: 1px solid #26343c; border-radius: 8px; background: #101316;"
    ></iframe>
</div>

![finish gate를 통과해 가로등이 이어진 야간 다운힐 도로로 멀어지는 차량을 그린 Apex Seoul hero 이미지](/images/posts/202607/apex-seoul-time-attack-finish-hero.png)

_이번 글의 hero 이미지는 finish gate를 지난 뒤에도 도로가 이어져야 한다는 최종 화면 방향을 담은 컨셉 이미지다. 이번 pass의 목표는 도로를 더 복잡하게 꾸미는 것이 아니라, 출발부터 완주까지 읽히는 한 번의 주행으로 만드는 것이었다._

---

## 기록은 화면 장식이 아니라 코스 좌표의 공통 기준이다

checkpoint를 표시하는 일은 처음에는 단순해 보였다. 진행률이 25%, 50%, 75%를 지났는지만 세면 된다.

하지만 그 방식만으로는 부족했다. gate, split UI, 하단 progress bar가 서로 다른 기준을 쓰면 한쪽에서는 통과했는데 다른 쪽에서는 아직 멀리 보이는 문제가 생긴다.

그래서 run state가 checkpoint의 최초 통과 시간을 직접 보관하도록 바꿨다.

```ts
for (const [index, checkpointRatio] of config.checkpointRatios.entries()) {
    if (
        state.progressRatio >= checkpointRatio &&
        state.checkpointTimesSec[index] === null
    ) {
        state.checkpointTimesSec[index] = state.elapsedSec;
    }
}
```

같은 state에서 다음 세 가지를 파생한다.

- checkpoint를 몇 개 지났는지
- 이번 split이 몇 초인지
- progress bar의 어느 tick을 밝힐지

기록도 코스 ID를 key로 한 `localStorage`에 작게 남긴다. 저장을 못 하는 private browsing 환경에서는 그냥 현재 주행만 끝나면 된다. 기록 기능 때문에 결승이 실패하면 안 되기 때문이다.

```text
apex-seoul:best-run:<track-id>
```

결과 화면은 현재 기록, best, 그리고 이전 best가 있을 때의 차이를 보여 준다. 새 기록 여부는 “현재 시간이 best와 같은가”가 아니라 **이전 best보다 실제로 짧았는가**로 판정한다.

---

## checkpoint gate는 도로 중앙에 있어야 한다

checkpoint 위에는 차가 지나갈 수 있는 아주 단순한 `Π`형 구조물을 두었다.

```text
+-----+
|     |
```

기둥 두 개와 상단 빔만 있는 비충돌 오브젝트다. 가드레일 판정이나 차체 충돌에 관여하지 않는다. 역할은 “이 지점이 sector를 나누는 곳”이라고 알려 주는 것뿐이다.

여기서 작은 좌표 버그가 하나 나왔다.

기존 roadside object 변환은 `0` offset도 기본적으로 한쪽 도로 가장자리의 기준으로 처리했다. 표지판에는 편리했지만, 중앙 gate에는 치명적이었다. `lateralOffset = 0`인 gate가 코너에서 도로 한쪽으로 밀렸다.

해결은 별도의 gate 좌표계를 만드는 것이 아니라, `0`은 항상 도로 중심이라는 규칙을 복구하는 것이었다.

```ts
if (baseOffset === 0) return 0;
```

이렇게 하면 gate, split, finish가 같은 `finishZ`와 checkpoint ratio를 공유하면서도 폭이 바뀌거나 코너를 지나는 도로의 중앙에 남는다.

![첫 checkpoint를 앞에 두고 고정한 실제 런타임 QA 화면](/images/posts/202607/apex-seoul-checkpoint-gate-runtime.png)

_첫 checkpoint 직전에서 멈춘 실제 런타임 캡처다. 상단 QA 값은 일반 플레이 HUD가 아니라 gate의 도로 좌표와 투시 상태를 확인하기 위한 개발용 정보다. gate는 화면 중앙의 차선 위에 놓이고, 차량과 충돌하지 않는다._

---

## 가로등은 야간 도로의 간격을 만든다

도로변은 모든 빈 공간을 오브젝트로 채우는 대신, 왼쪽 가드레일을 따라 일정한 간격의 가로등을 두는 쪽을 택했다. 차가 보는 시야의 가장자리에 반복되는 수직선이 생기면, 조명 자체가 밝지 않아도 도로가 앞으로 흘러가는 리듬을 읽을 수 있다.

기존 `>> / <<` 표지판도 함께 정리했다. 모든 곡선에 반복하는 대신 commitment corner 진입 전에 세 장씩 묶어, 다음에 처리해야 할 방향만 미리 읽히게 했다.

가로등은 헤드라이트를 대체하지 않는다. 약한 lamp glow와 road pool만 남겨 야간 도로의 리듬을 만든다.

---

## finish 뒤의 도로가 벽처럼 보인 이유

결승 연출은 예상보다 많은 문제를 드러냈다.

처음에는 finish에서 카메라를 멈추고 차를 숨기면 될 것 같았다. 하지만 도로 renderer가 먼 segment를 찾을 때 트랙의 처음으로 wrap하고 있었다. 결승 뒤에서 높은 출발 구간을 다시 읽으면서, 하늘로 솟는 콘크리트 벽처럼 보이는 도로가 생겼다.

그래서 timed course와 finish 뒤 연출용 도로를 분리했다.

```text
timed finishZ
  + 48개의 평탄한 post-finish segment
  = 화면 연출을 위한 coast 구간
```

그리고 끝난 코스의 segment 조회는 wrap하지 않고 마지막 평탄 segment에서 clamp한다. 카메라는 finish 위치에서 고정되지만, renderer가 다시 출발 고도로 돌아가지 않는다.

finish gate도 checkpoint와 같은 열린 `Π`형 프레임을 재사용해 timed line 바로 뒤에 둔다. 결승을 지나도 가드레일과 도로가 이어져 보이는 편이, 거대한 gantry 하나보다 이 코스의 낮은 밤 풍경에 더 잘 맞았다.

---

## 고정 카메라에서 차를 계속 달리게 하려면

가장 까다로웠던 것은 finish 뒤 차량이었다.

카메라를 고정하면 일반 주행 차량은 화면 하단 anchor에 계속 붙어 있다. 반대로 월드 투시 좌표를 바로 쓰면, 출발 깊이가 맞지 않아 차가 화면 아래로 튀거나 갑자기 아주 작아졌다.

처음에는 두 화면 좌표를 lerp했다. 결과는 좋지 않았다. 차가 제자리에 멈춘 채 작아지고 fade되는 것처럼 보였다. 플레이어가 원한 것은 다른 작은 차가 나타나는 효과가 아니라, **방금 운전하던 차가 finish 너머 도로를 따라 멀어지는 것**이었다.

최종 흐름은 세 단계다.

```text
capture
  → 중앙 후면 sprite로 전환
  → 현재 transform 캡처

coast
  → 캡처된 화면 Y에 맞는 도로 깊이를 역산
  → 카메라는 고정, 차량의 world Z만 전진
  → 투시 scale에 비례해 축소

results
  → 차량과 헤드라이트를 모두 종료
```

핵심은 시작점을 화면 보정으로 끌고 가는 대신, 캡처된 transform과 같은 위치에 놓이는 월드 깊이를 역으로 구하는 것이다.

```ts
startDepth = (focalLength * camera.height) / (capturedY - horizonY);
```

그 깊이에서 시작하면 첫 coast 프레임은 캡처된 차량과 같은 위치·크기다. 그 다음부터 차량 Z만 늘리면, 화면에서는 도로 중심을 따라 소실점 쪽으로 올라가며 자연스럽게 작아진다.

카메라가 움직이지 않아도 “차가 앞으로 갔다”는 사실은 투시가 맡는다.

---

## 차량을 숨겼는데 헤드라이트가 남았다

finish 결과 화면에서 차량 sprite alpha를 `0`으로 만들자, 이번에는 화면 하단에 헤드라이트만 남는 버그가 보였다.

원인은 헤드라이트가 차량 sprite의 일부가 아니라 별도 shader pass였기 때문이다. 차량은 숨겼지만 shader uniform의 intensity는 정지 상태에서도 기본값을 가지고 있었고, 결과 단계에서는 일반 주행용 anchor를 다시 참조했다.

그래서 헤드라이트에도 같은 finish lifecycle을 적용했다.

```text
capture : 기존 밝기 유지
coast   : 차량보다 조금 먼저 감쇠
results : intensity = 0
```

이 수정은 단순히 빛을 끄는 일이 아니다. 하나의 차량을 여러 render pass가 표현할 때, 종료 상태도 각 pass가 공유해야 한다는 확인이었다.

---

## 이번 pass의 범위와 다음 판단

이번에 완성한 것은 거대한 레이스 모드가 아니다.

- countdown 뒤에 시작되는 한 번의 timed run
- 세 개의 checkpoint split과 중앙 gate
- 현재 기록과 best record
- 가로등과 재배치한 corner chevron
- fixed-camera finish coast와 결과 화면

코너링 물리는 이전 기준선을 유지했다. 새 환경 요소도 충돌 규칙이나 track physics를 바꾸지 않는다. 이 분리는 중요하다. time attack loop가 불안정해질 때마다 핸들링 숫자를 다시 만지기 시작하면, 무엇이 기록 감각을 망쳤는지 알 수 없어진다.

이번 변경 후에는 production build와 finish lifecycle을 다시 확인했다. 다음 작업은 코스를 길게 늘리는 일이 아니라, 이 기록 구조 위에서 어떤 checkpoint 구간이 실제로 재미있는 선택을 만드는지 읽는 일이다. 짧은 rock-cut 또는 overhang 같은 landmark는 그 판단이 필요한 구간에만 추가할 예정이다.

한 판의 끝이 생기니, 이제야 그 전의 코너들이 기록으로 연결되기 시작했다.
