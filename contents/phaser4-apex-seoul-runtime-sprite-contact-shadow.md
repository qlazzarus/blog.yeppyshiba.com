---
title: Phaser 4 Pseudo 3D 레이싱 게임 - 차량 스프라이트를 도로에 붙이기
date: 2026-07-01T20:30:00+09:00
summary: Apex Seoul의 approved 128px 차량 스프라이트를 런타임에 연결하고, 조향 3way, 고저차 접지감, 주행 telemetry, silhouette shadow pass로 실제 게임 화면에서 검증했습니다.
image: /images/posts/202607/apex-seoul-approved-vehicle-sheets.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - pseudo-3d
    - game-art
    - telemetry
    - game-dev
---

## 들어가며

[지난 글](/article/phaser4-apex-seoul-real-car-source-model-poc/)에서는 **Apex Seoul**의 차량 스프라이트 기준선을 다시 잡았다.

GT86, Kia Stinger, Genesis G70 3D 모델을 같은 카메라와 같은 pose sheet 규격으로 렌더링했고, 실제 전장 기준으로 상대 크기를 맞췄다.

그때의 결론은 단순했다.

잘 나온 이미지 한 장에 기대면 안 된다.

차량 스프라이트는 pose render, pixel pass, QA, runtime 적용까지 이어져야 게임 자산이 된다.

이번에는 그 다음 단계다.

POC pose sheet를 만들었으니 이제 게임 안에 넣어본다.

그런데 막상 넣어보니 문제는 "스프라이트가 예쁜가"가 아니었다.

도로, 고저차, 조향, 그림자가 한 화면에서 같은 물리처럼 읽히는가.

그게 더 컸다.

![Apex Seoul approved vehicle sheets](/images/posts/202607/apex-seoul-approved-vehicle-sheets.png)

이번 글에서는 다음 내용을 정리한다.

- Genesis G70 128px approved sprite를 런타임 차량으로 연결한다.
- 기본 grip steering은 5way가 아니라 3way로 둔다.
- 고저차에서 차가 붕 떠 보이는 문제를 다시 본다.
- 주행 telemetry를 남겨 감각 문제를 로그로 확인한다.
- 둥근 Graphics 그림자를 silhouette shadow pass로 바꾼다.
- G70, Stinger, GT86 모두 같은 shadow metadata 규격으로 맞춘다.

현재 데모는 아래에서 볼 수 있다.

[Apex Seoul 데모 보기](/games/apex-seoul/)

<div style="position: relative; width: 100%; height: min(70vh, 560px); margin: 24px 0;">
    <iframe
        src="/play/apex-seoul/"
        title="Apex Seoul"
        loading="lazy"
        style="position: absolute; inset: 0; width: 100%; height: 100%; border: 1px solid #26343c; border-radius: 8px; background: #101316;"
    ></iframe>
</div>

## 먼저 G70을 게임 안에 넣었다

이번 런타임 검증의 첫 차량은 `Genesis G70` POC 128px sprite다.

G70을 최종 플레이어 차량으로 확정했다는 뜻은 아니다.

지금 프로젝트에서 GT86, Stinger, G70은 모두 reference이자 POC source다. 최종 공개 asset은 fictional vehicle로 다시 정리할 계획이다.

다만 G70은 후방 실루엣이 큼직하고, 세단형 차체라 runtime에서 문제가 잘 드러났다.

차량이 도로에 붙어 보이는지, 타이어가 읽히는지, 그림자가 얼마나 어색한지 보기에는 꽤 좋은 테스트 대상이었다.

사용한 파일은 이쪽이다.

```text
games/apex-seoul/assets/vehicles/approved/atlases/genesis-g70-poc-128.json
games/apex-seoul/assets/vehicles/approved/sprites/genesis-g70-poc-128.png
```

![Genesis G70 approved 128px sprite sheet](/images/posts/202607/apex-seoul-genesis-g70-approved-128.png)

기존 플레이어 차량은 후방, 후방 좌측, 후방 우측에 가까운 임시 스프라이트였다.

이번에는 atlas frame을 기반으로 `center`, `steer-right-1`, `downhill-*`, `uphill-*` 같은 pose를 직접 고르게 했다.

왼쪽 조향은 별도 이미지를 만들지 않고 오른쪽 frame을 `flipX`해서 사용한다.

작은 sprite에서는 좌우 pose를 모두 그리는 것보다, 먼저 기준 anchor와 baseline이 흔들리지 않는지가 더 중요했다.

## 5way보다 먼저 3way

처음 생각은 steering 값을 5분기 pose 선택으로 바꾸는 것이었다.

```text
steer-left-2 / steer-left-1 / center / steer-right-1 / steer-right-2
```

그런데 실제 게임 화면에 올려보니 기본 주행에서 5way를 모두 열 필요가 없었다.

특히 `steer-right-2`처럼 yaw가 큰 frame은 grip 주행에서 쓰면 차가 코너를 도는 게 아니라 이미 미끄러지는 것처럼 보였다.

그래서 현재 runtime 방향은 이렇게 잡았다.

```text
grip: steer-left-1 / center / steer-right-1
drift/slip future: steer-left-2 / steer-right-2
```

이 선택은 꽤 중요했다.

차량 sprite가 작을수록 "조향 중"과 "드리프트 중"의 시각 차이를 아껴 써야 한다.

평상시 grip 주행에서는 차체가 안정적으로 보이고, drift나 slip 상태에 들어갔을 때만 강한 yaw pose를 열어야 한다.

OutRun식 감각을 참고하더라도 마찬가지였다.

플레이어 차량은 화면 하단 기준점에서 안정적으로 읽히고, 도로와 배경이 큰 속도감을 만든다. 차량이 평상시부터 과하게 돌아가면 조작감보다 미끄러짐이 먼저 보인다.

## 도로는 내려가는데 차는 떠 있었다

이번 작업에서 가장 오래 잡고 있던 문제는 고저차였다.

기본 코스에서는 그럭저럭 괜찮아 보였는데, 고저차 테스트 코스를 켜면 이상한 장면이 나왔다.

내리막길에 들어가면 도로가 아래로 떨어진다.

그런데 차는 화면 하단의 같은 위치에 남아 있다.

결과적으로 차가 도로 위에 있는 것이 아니라 하늘에 떠서 가는 것처럼 느껴졌다.

처음에는 단순히 차량 y를 도로 projection에 맞춰 내리면 될 것 같았다.

하지만 그렇게 하면 다른 문제가 생긴다.

차량 기준점이 앞쪽 도로 높이에 직접 끌려다니면서 조작 기준점이 흔들린다. 특히 pseudo-3D 레이싱에서는 플레이어 차량이 화면 하단의 안정적인 기준점에 있어야 한다.

차가 실제 3D 좌표를 따라 위아래로 크게 움직이면, 도로에 붙는 느낌보다 카메라가 흔들리거나 차가 튀는 느낌이 먼저 온다.

그래서 방향을 바꿨다.

플레이어 차량 y는 screen contact plane에 둔다.

고저차는 차량을 크게 흔드는 대신 도로 projection, horizon, 차량 pose, 그림자, 아주 작은 screen-space offset으로 읽히게 한다.

현재 개념은 이렇다.

```text
vehicle Y = fixed screen contact plane + small continuous slope offset
anchorZ = terrain pose/lookahead
contactZ = near road contact/curve/lateral sampling
```

여기서 핵심은 `anchorZ`와 `contactZ`를 분리한 것이다.

먼 도로를 보고 차량 pose를 고르는 일과, 가까운 노면에 붙어 보이게 하는 일은 같은 문제가 아니었다.

`anchorZ`는 차량이 앞으로 어떤 경사에 들어갈지 보는 lookahead다. `downhill-*`, `uphill-*` 같은 pose 선택에 더 가깝다.

반대로 `contactZ`는 현재 차량이 화면상 어떤 노면에 붙어 있어야 하는지를 보는 가까운 샘플이다. 그림자와 작은 y 보정은 이쪽을 봐야 한다.

## 로그를 남기니 감각 문제가 보였다

고저차 문제는 눈으로만 보면 꽤 헷갈렸다.

"뭔가 떠 보인다"는 말은 맞지만, 어느 값이 늦게 반응하는지 알기 어렵다.

그래서 주행 상태를 브라우저에서 직접 JSONL로 남기게 했다.

테스트 URL은 이렇게 생겼다.

```text
/game-assets/apex-seoul/?telemetry=1&telemetryDuration=60&telemetryHz=10
```

60초 동안 10Hz로 주행 상태를 샘플링하고, 시간이 끝나면 `apex-seoul-drive-*.jsonl` 파일을 다운로드한다.

자동 다운로드를 끄고 싶으면 `telemetryAutoExport=0`을 붙인 뒤 `L` 키로 수동 export할 수 있다.

분석은 별도 script에서 한다.

```bash
npm run analyze:drive-telemetry --workspace @games/apex-seoul -- --input <apex-seoul-drive.jsonl>
```

처음부터 깔끔했던 것은 아니다.

초기 구현에서는 telemetry recorder가 scene 초기화보다 먼저 viewport를 읽으려 했다.

그래서 이런 오류가 났다.

```text
Cannot read properties of undefined (reading 'height')
```

원인은 `getViewport()`가 `scale.height`를 읽는 시점이었다.

telemetry recorder를 scene field initializer에서 만들면 Phaser scale이 아직 준비되지 않을 수 있다. 그래서 recorder 생성 위치를 `create()` 이후로 옮겼다.

그 다음에는 로그에서 더 중요한 문제가 보였다.

`terrainCue`는 `downhill`인데, `contactTerrainCue`는 계속 `level`로 남는 구간이 있었다.

즉 차량 pose는 내리막을 보고 있는데, 접지와 그림자는 아직 평지라고 판단하고 있었다.

이러면 차체와 그림자가 서로 다른 도로를 보고 있는 것처럼 느껴진다.

처음에는 threshold를 낮춰 해결하려고 했다.

하지만 threshold 기반으로 `level -> downhill`을 바로 전환하면, 특정 순간 차량 y와 shadow가 툭 튄다.

그래서 접지 보정은 on/off 판정이 아니라 연속값으로 바꿨다.

```text
contactElevationDelta
-> contactTerrainRatio
-> smoothstep
-> small vehicle y / shadow scale offset
```

분석 summary에는 이런 값을 남겼다.

```text
terrainContactMismatchCount
terrainContactMismatchRatio
contactTerrainCue counts
maxVehicleYDeltaSameViewport
```

`maxVehicleYDeltaSameViewport`를 따로 둔 것도 이유가 있다.

브라우저 viewport가 바뀌면 차량 anchor y가 크게 바뀔 수 있다. 그 값과 실제 주행 중 y 튐을 섞어 보면 분석이 흐려진다.

그래서 같은 viewport 안에서 발생한 y 변화만 따로 보게 했다.

## 그림자는 도형으로는 부족했다

고저차를 다듬고 나니 다음 문제가 더 잘 보였다.

그림자였다.

처음 구현은 Phaser `Graphics`로 그린 타원이었다.

차량 아래에 어두운 ellipse를 놓으면 일단 그림자처럼 보일 줄 알았다.

하지만 실제 화면에서는 차 밑에 둥근 얼룩이 생긴 느낌이 더 강했다.

그래서 한 번 더 쪼갰다.

```text
큰 chassis soft shadow
작은 tire contact patch
```

타이어 위치에는 얇은 rounded patch를 그리고, 차체 아래에는 더 약한 soft shadow를 깔았다.

이 방식은 단일 타원보다 나았지만 여전히 한계가 있었다.

차량 하단 실루엣과 그림자 모양이 맞지 않으면, 그림자는 계속 "차량이 만든 그림자"가 아니라 "차 밑에 놓인 도형"처럼 보인다.

그래서 방향을 바꿨다.

현재 선택된 차량 frame을 한 번 더 그린다.

그 duplicate를 검게 만들고, y축으로 납작하게 누르고, x축으로 조금 늘린 뒤, 차량 아래와 앞쪽으로 밀어 그림자로 쓴다.

개념은 이렇다.

```text
approved sprite alpha
-> RGB black shadow sheet
-> preload as second spritesheet
-> playerShadowCar
-> same frame / same flipX / squashed display
```

처음에는 Phaser tint로 처리하려고 했다.

하지만 현재 게임은 `Phaser.CANVAS` 렌더러를 쓰고 있고, tint가 안정적인 검정 마스크처럼 보이지 않았다. 원본 G70의 밝은 차체 색이 회색으로 비쳐 보여 그림자가 아니라 납작한 회색 차처럼 보였다.

그래서 shadow 전용 sheet를 만들었다.

원본 sprite sheet의 alpha는 유지하고, RGB만 검정으로 바꾼 파일이다.

![G70 black alpha shadow sheet](/images/posts/202607/apex-seoul-shadow-sheet-black-alpha.png)

파일은 이렇게 정리했다.

```text
games/apex-seoul/assets/vehicles/approved/sprites/genesis-g70-poc-128-shadow.png
games/apex-seoul/assets/vehicles/approved/sprites/kia-stinger-poc-128-shadow.png
games/apex-seoul/assets/vehicles/approved/sprites/toyota-gt86-poc-128-shadow.png
```

각 atlas에도 `meta.shadowImage`를 넣었다.

```text
genesis-g70-poc-128-shadow.png
kia-stinger-poc-128-shadow.png
toyota-gt86-poc-128-shadow.png
```

이제 런타임 그림자는 차량과 같은 frame을 본다.

조향이 바뀌면 그림자도 같은 frame으로 바뀐다. 왼쪽 조향에서 `flipX`를 쓰면 shadow도 같이 뒤집힌다.

결과적으로 그림자는 동그란 도형보다 차체 하단에 더 붙어 보인다.

아직 최종 그림자 시스템이라고 부르기에는 이르다.

WebGL로 넘어가면 blur, mask, shader deformation을 더 자연스럽게 줄 수 있다. 하지만 Canvas 단계에서도 "둥근 얼룩"을 "차량 실루엣 기반 그림자"로 바꾸는 것만으로 접지감은 훨씬 좋아졌다.

## shadow metadata는 세 차량에 맞췄다

이번 글에서는 G70을 중심으로 설명했지만, asset 규격은 G70 전용으로 끝내지 않았다.

GT86, Stinger, G70 모두 approved 128px sprite와 atlas를 같은 방향으로 맞췄다.

```text
games/apex-seoul/assets/vehicles/approved/atlases/genesis-g70-poc-128.json
games/apex-seoul/assets/vehicles/approved/atlases/kia-stinger-poc-128.json
games/apex-seoul/assets/vehicles/approved/atlases/toyota-gt86-poc-128.json
```

각 atlas에는 `apex.shadowProfiles`가 들어간다.

`shadowProfiles`는 frame별 normalized 좌표로 chassis shadow와 tire contact 위치를 설명한다.

지금은 silhouette shadow pass가 중심이라 tire contact patch는 약하게만 남겨두거나 끌 수 있다. 그래도 metadata를 남겨둔 이유가 있다.

나중에 WebGL shadow나 per-frame mask deformation으로 넘어가더라도 같은 정보를 재사용할 수 있기 때문이다.

즉 이번 shadow 작업은 단순히 "그림자를 어둡게 했다"가 아니다.

차량 frame과 그림자 frame이 같은 기준을 보도록 asset 규격을 정리한 작업에 가깝다.

## runtime QA는 사람이 덜 보게 만들기 위한 것

이번 작업을 하면서 확실해진 것이 있다.

게임 안에서 스프라이트를 검증하는 일은 사람 눈이 필요하다.

하지만 사람이 매번 직접 달려보면서 같은 구간을 찾는 것은 너무 비싸다.

그래서 runtime QA 루프도 정리했다.

```text
approved atlas/sprite
-> runtime tuning preset
-> frozen scenario URLs
-> headless screenshots
-> contact sheet + manifest
-> visual review / metric score
-> tuning preset update
-> repeat
```

이미 런타임은 query parameter로 몇 가지 상태를 고정할 수 있다.

```text
qaFreeze
qaSteer
qaSpeed
qaZ
qaOffset
```

예를 들어 기본 3way steering은 이런 식으로 반복 촬영할 수 있다.

```text
/game-assets/apex-seoul/?qaFreeze=1&qaSteer=-1&qaSpeed=520
/game-assets/apex-seoul/?qaFreeze=1&qaSteer=0&qaSpeed=520
/game-assets/apex-seoul/?qaFreeze=1&qaSteer=1&qaSpeed=520
```

고저차는 별도 테스트 트랙을 쓴다.

```text
/game-assets/apex-seoul/?track=elevation-test&terrainScale=0.06&contactZ=220
```

이 단계의 목적은 자동 승인까지 바로 가는 것이 아니다.

목표는 review 비용을 줄이는 것이다.

같은 도로 위치, 같은 속도, 같은 조향 상태를 반복 캡처해두면 "감으로 달려보고 이상한 것 같음"보다 훨씬 빠르게 비교할 수 있다.

## 마치며

이번 작업을 하면서 차량 스프라이트 품질은 PNG 파일 안에서 끝나지 않는다는 것을 다시 확인했다.

파일로 볼 때는 괜찮은 sprite도 게임 안에 넣으면 다르게 보인다.

도로 projection, 고저차 cue, camera pitch, 차량 pose, 그림자가 서로 다른 타이밍으로 움직이면 차는 바로 떠 보인다.

그래서 Apex Seoul의 다음 파이프라인은 "잘 만든 sprite"가 아니라 "게임 안에서 반복 검증되는 sprite" 쪽으로 가야 한다.

이번에는 그 첫 단계로 G70 128px approved sprite를 런타임에 연결했고, grip 3way steering, 고저차 contact cue, telemetry 분석, silhouette shadow pass까지 묶었다.

아직 할 일은 남아 있다.

WebGL 기반 shadow blur와 mask deformation도 보고 싶고, drift/slip 상태에서는 5way pose를 다시 열어야 한다. GT86과 Stinger도 같은 runtime switching 경로로 바꿔볼 필요가 있다.

하지만 이제 방향은 훨씬 분명하다.

차량은 이미지 파일로 완성되는 것이 아니라, 도로 위에서 붙어 보일 때 완성된다.

