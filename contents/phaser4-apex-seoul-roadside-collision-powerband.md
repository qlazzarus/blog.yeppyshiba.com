---
title: Phaser 4 Pseudo 3D 레이싱 게임 - 가드레일, 저속 조향, 0-100km/h를 다시 잡기
date: 2026-07-15T09:30:00+09:00
summary: Apex Seoul의 밤 다운힐 비주얼을 왼쪽 절벽·가드레일, 오른쪽 옹벽·수목 구조로 재정리하고, 가드레일 충돌, 저속 조향 pose, standing start 파워밴드까지 주행 로그와 자동 QA로 다시 맞췄습니다.
image: /images/posts/202607/apex-seoul-roadside-powerband-hero.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - pseudo-3d
    - telemetry
    - game-physics
    - racing-game
    - game-dev
---

## 비주얼이 바뀌면 게임 규칙도 같이 보인다

[지난 글](/article/phaser4-apex-seoul-downhill-grip-cost/)에서는 Apex Seoul의 내리막 고속 grip에 비용을 만들었다.

200km/h로도 아무 준비 없이 돌아나갈 수 있는 코너는 코너가 아니었다. 그래서 easy / medium / sharp 속도 예산을 나누고, 과속 grip에서는 understeer와 바깥 여유 비용이 생기도록 했다.

이번 작업은 그 다음 단계였다.

이제 차가 어느 정도 달린다. 코너도 이전보다 의미가 있다. 그런데 화면을 보면 아직 “밤의 서울 다운힐”이라는 장소감이 약했다. 도로 양옆 오브젝트도 반복되는 장식에 가까웠고, 가드레일은 보이지만 실제 게임 규칙과 충분히 연결되어 있지 않았다.

그래서 이번에는 비주얼과 조작 규칙을 같이 만졌다.

```text
왼쪽 : 가드레일 / 절벽 / 먼 서울 야경
오른쪽 : 가드레일 / 콘크리트 옹벽 / 벽 위 수목
차량 : 저속에서는 안 움직이고, 안 꺾여 보여야 한다
엔진 : 0-100km/h가 5초대면 너무 빠르다
```

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

![Apex Seoul 밤 다운힐 비주얼 방향을 설명하기 위한 컨셉 이미지](/images/posts/202607/apex-seoul-roadside-powerband-hero.png)

## 도로 양옆을 비대칭으로 만들었다

처음에는 도로 양옆에 비슷한 가드레일과 말뚝을 반복해서 배치했다. 하지만 pseudo 3D 도로에서 같은 형태의 `|--|` 가드레일을 가까운 곳에 여러 번 겹치면, 이어진 안전 구조물이 아니라 독립된 표지판들이 겹쳐 보였다.

특히 오른쪽은 옹벽이 있어야 하는 구도인데, 기존 가드레일만으로는 도로가 산속에 떠 있는 느낌이 강했다.

그래서 도로 양옆의 역할을 분리했다.

```text
left-cliff-guardrail  : 낮은 가드레일, 절벽 쪽 기둥, 열린 야경
right-retaining-wall  : 콘크리트 옹벽, blue reflector
right-wall-tree       : 옹벽 위로 올라오는 수목 실루엣
city parallax         : 멀리 흐르는 밤 도시 전경
```

왼쪽은 열린 공간이다. 도로 밖으로 떨어지는 절벽과 먼 도시 불빛을 보여준다. 오른쪽은 닫힌 공간이다. 콘크리트 벽과 가까운 수목이 빠르게 지나가며 속도감을 만든다.

이 방향은 단순히 예뻐 보이기 위한 장식이 아니다. 플레이어가 코너를 읽을 때도 좌우가 다르게 느껴져야 한다.

- 왼쪽은 “떨어질 수 있는 바깥”으로 읽힌다.
- 오른쪽은 “가까운 벽”으로 읽힌다.
- reflector와 chevron은 코너 진입 위험도를 알려준다.
- 먼 도시는 빠르게 움직이지 않고, 가까운 roadside가 속도감을 맡는다.

![왼쪽 절벽/가드레일과 오른쪽 옹벽/수목 구조를 설명하기 위한 컨셉 이미지](/images/posts/202607/apex-seoul-roadside-flow-guardrail-wall.png)

도시 전경도 한 번에 해결되지는 않았다.

처음에는 skyline 이미지를 배경으로 가져와 parallax scroll을 걸었다. 그런데 도시가 좌우로 반복되고, 지평선이 계속 바뀌는 느낌이 어색했다. road object처럼 도시를 빠르게 움직이면, 멀리 있는 도시가 도로 옆 표지판처럼 보인다.

결론은 이랬다.

```text
도시는 속도감을 담당하지 않는다.
속도감은 가까운 roadside가 담당한다.
도시는 방향과 깊이를 담당한다.
```

그래서 도시 전경은 멀리 고정된 기준선에 두고, curve 누적에 아주 작은 parallax만 주는 방향으로 정리했다. 더 가까운 능선 실루엣이 도시를 부분적으로 가리면 깊이도 더 잘 생긴다.

## 가드레일은 배경이 아니라 충돌 대상이다

가드레일 모양이 좋아지자 바로 다음 문제가 보였다.

차가 화면상 가드레일 밖으로 나가는데 충돌이 감지되지 않았다.

원인은 좌표 기준이었다. 게임 내부의 road width와 화면에 보이는 차량/가드레일 위치가 조금 달랐다. pseudo 3D에서 “월드 좌표상 도로 밖”과 “화면상 가드레일을 밟고 있음”은 항상 같은 순간에 발생하지 않는다.

그래서 충돌 기준을 화면에 보이는 rail contact limit과 더 가깝게 맞췄다.

이후에는 충돌 자체는 감지되기 시작했다. 하지만 차가 가드레일을 살짝 올라타는 느낌이 남았다. 오른쪽은 약 5%, 왼쪽은 약 10% 정도로 보였다.

이 부분은 여러 번 로그를 찍으며 조정했다.

```text
contactInsetLeft  : 56
contactInsetRight : 48
bounce impulse    : 충돌 방향 반대로 짧게 튕김
impact cue        : 속도 손실과 카메라/효과 연결용 신호
```

가드레일에 닿았을 때 단순히 clamp만 하면 벽에 붙어 미끄러지는 느낌이 난다. 반대로 너무 크게 튕기면 아케이드 레이싱이 아니라 핀볼이 된다. 그래서 현재는 충돌 방향 반대로 짧은 bounce velocity를 주고, 속도 손실과 impact cue를 남긴다.

아직 완벽하진 않다. 왼쪽 드리프트 pose에서는 아주 약간 가드레일을 타는 느낌이 남아 있다. 다만 주행에서는 합격점에 가까워졌고, 남은 문제는 낮은 우선순위 backlog로 남겼다.

## 속도감 실험: side streak보다 camera shake가 나았다

속도감을 더 만들기 위해 side streak도 시도했다.

아이디어는 간단했다. 도로 양옆에 사선 흐름이나 motion blur를 넣으면 고속감이 올라가지 않을까?

하지만 결과는 만족스럽지 않았다. 화면이 빨라 보이기보다는 흐릿한 효과가 얹힌 느낌이 강했다. 특히 Apex Seoul은 차량 anchor와 도로 원근을 읽는 게임이라, 양옆 blur가 너무 강하면 도로 폭과 가드레일 위치를 읽기 어려워진다.

그래서 side streak은 롤백하고 backlog에 남겼다.

대신 camera shake는 작게 넣었다.

```text
throttle burst : 아주 작은 x/y shake
drift exit     : 짧은 shake와 FOV impulse 후보
guardrail hit  : impact cue 기반 shake
```

다만 이것도 과하게 쓰면 안 된다. 이번 단계의 camera shake는 “효과가 보이는지”보다 “나중에 수치를 쉽게 바꿀 수 있는 구조”에 의미가 있었다. 그래서 config를 분리하고, camera effect 계산을 별도 모듈로 떼어냈다.

## main.ts가 커져서 설정을 분리했다

이쯤 되니 `main.ts`가 다시 비대해졌다.

처음에는 하나의 Phaser scene 안에서 도로, 차량, HUD, 조작, telemetry를 모두 만지는 편이 빨랐다. 하지만 지금은 아니다. 차량 조작 하나만 해도 다음 값들이 얽힌다.

```text
speed / acceleration
gear / rpm / torque
drift state
guardrail collision
low-speed steering
visual steering pose
camera shake
telemetry
```

그래서 완전한 ECS로 한 번에 옮기지는 않더라도, 최소한 설정값과 순수 계산은 파일 밖으로 빼는 쪽으로 정리했다.

- `playerVehicleController.ts`: 속도, 조향, drift, powerband
- `engineProfile.ts`: 차량별 RPM/gear/torque/boost profile
- `cameraEffects.js`: FOV, shake, impact cue
- `guardrailCollision.ts`: 가드레일 충돌과 bounce
- `runtimeConfig.ts`: query parameter 기반 튜닝값
- `runtimeTelemetry.ts`: 로그 기록

이렇게 해두면 브라우저 화면을 띄우지 않고도 controller만 돌리는 QA가 가능하다. 이번 글의 후반부 문제들은 대부분 이 자동 측정 덕분에 빨리 잡을 수 있었다.

## 정지 상태에서 차가 옆으로 움직이면 안 된다

파워밴드를 보려고 0 출발을 넣고 나니 더 큰 결함이 보였다.

속도 0인데 좌우 입력을 주면 차가 너무 빠르게 코너링했다.

물리적으로는 명백히 이상하다. 정지 상태에서 핸들을 돌릴 수는 있지만, 차가 도로 위에서 좌우로 이동하면 안 된다.

그래서 longitudinal speed와 lateral authority를 분리했다.

```text
0~5km/h    : 실제 lateral movement 0
5~60km/h   : smoothstep으로 점진 회복
60km/h+    : 기존 조향권 회복
45km/h 미만: drift 진입/유지 금지
```

이후 `qa:low-speed-steering`을 추가했다.

```text
0km/h 좌우 입력 2초      -> lateralOffset = 0
출발 직후 350ms 조향     -> lateralOffset 거의 0
10km/h 조향              -> crawl 수준의 작은 이동
60km/h 조향              -> 정상 조향권 회복
```

최신 결과는 이렇다.

| case | result |
| --- | ---: |
| stationary lateral offset | `0` |
| launch 350ms lateral offset | `0` |
| 10km/h lateral offset | `0.1637u` |
| 60km/h lateral offset | `233.0486u` |

정지 상태의 횡이동은 막혔다.

그런데 바로 다음 문제가 보였다.

차는 실제로 옆으로 움직이지 않지만, sprite는 풀 조향처럼 꺾여 보였다.

로그는 아주 명확했다.

```text
0~5km/h:
lowSpeedLateralAuthority = 0
lateralOffset            = 0
visualSteering max       = 0.994
frame                    = steer-right-2
rotation                 = 약 3.48도
```

즉 물리는 맞는데 화면이 거짓말을 하고 있었다.

그래서 `lowSpeedVisualSteeringAuthority`를 별도로 추가했다.

```text
0~5km/h    : visual steering pose도 center에 가깝게 고정
5~60km/h   : 점진 회복
60km/h+    : 기존 visual steering 회복
```

최신 QA에서는 10km/h에서 `visualSteering=0.0213`, frame은 `center`, rotation은 `0.074도`다. 60km/h에서는 `visualSteering=0.7655`, frame `steer-right-2`까지 회복된다.

여기서 중요한 점은 입력을 무시한 것이 아니라는 점이다. steering 값 자체는 살아 있다. 다만 저속에서는 실제 위치와 차체 pose가 그 입력을 과장해서 보여주지 않는다.

![파워밴드와 저속 조향 계측 방향을 설명하기 위한 컨셉 이미지](/images/posts/202607/apex-seoul-powerband-telemetry-dashboard.png)

## 0-100km/h가 5초대면 너무 빠르다

저속 조향을 잡고 나니 파워밴드 문제가 다시 보였다.

0 출발 로그를 보면 Raven Coupe가 `0-100km/h`를 약 `5.8초`에 통과했다.

```text
0-60km/h   : 4.70초
0-100km/h  : 5.80초
0-150km/h  : 7.81초
0-180km/h  : 10.40초
```

이건 너무 빠르다.

물론 Apex Seoul은 시뮬레이터가 아니다. 하지만 지금의 Raven Coupe는 고회전 자연흡기 스포츠카 느낌을 목표로 한다. 0-100km/h가 5초대면, 파워밴드와 변속을 느끼기도 전에 3~4단을 지나가 버린다.

목표를 다시 잡았다.

```text
Raven Coupe 기준
0-100km/h : 약 13초
0-150km/h : 20초 이상
```

처음에는 launch throttle을 아주 낮추면 될 것 같았다. 하지만 너무 낮추면 이상한 결과가 나왔다.

```text
0-60은 비정상적으로 길어진다.
그런데 60-100은 여전히 너무 짧다.
```

즉 초반만 죽이는 방식은 좋지 않았다.

최종적으로는 engine force와 launch curve를 같이 낮췄다.

```text
PLAYER_ENGINE_ACCELERATION             : 150 -> 82
PLAYER_LAUNCH_THROTTLE_MIN_RATIO       : 0.30 -> 0.50
PLAYER_LAUNCH_THROTTLE_FULL_SPEED_RATIO: 0.38 -> 0.70
```

이 값의 의도는 초반 launch를 완전히 죽이지 않되, 중속 이후 가속이 폭발적으로 이어지지 않게 하는 것이다.

새 `qa:standing-start` 결과는 이렇다.

| speed | Raven Coupe time | gear / rpm |
| ---: | ---: | --- |
| 30km/h | `7.30s` | 2단 / 6774rpm |
| 60km/h | `10.17s` | 3단 / 6258rpm |
| 100km/h | `13.62s` | 4단 / 5873rpm |
| 150km/h | `21.48s` | 5단 / 5958rpm |

flat simulation 기준으로 `0-100=13.62초`다. 실제 코스 시작부에는 약한 내리막 slope가 있으므로, 실제 주행 로그에서는 13초 근처로 조금 내려올 가능성이 있다.

## QA도 목표별로 다시 나눠야 한다

이번 변경 후 `qa:standing-start`, `qa:low-speed-steering`, `build`는 통과했다.

하지만 `qa:handling-sim`의 baseline 점수는 `93.9`에서 `71.6`으로 내려갔다.

처음 보면 회귀처럼 보인다.

하지만 이건 핸들링이 망가졌다는 뜻은 아니다. 기존 handling sim은 고속 코너 진입을 평가하기 위해, 일정 시간 full throttle로 가속한 뒤 코너에 진입하는 시나리오를 많이 사용했다.

엔진 가속을 크게 낮추면 같은 시간 뒤의 속도가 달라진다. 그러면 understeer나 corner budget 평가도 이전과 같은 조건이 아니다.

그래서 다음 작업은 handling sim을 분리하는 것이다.

```text
standing-start QA : 엔진/파워밴드/변속 목표
low-speed QA      : 정지/저속 조향과 visual pose
handling QA       : 목표 속도를 직접 주입한 corner behavior
drive telemetry   : 실제 코스에서 전체 체감 확인
```

고속 코너 테스트는 앞으로 “몇 초 동안 가속했는가”가 아니라 “몇 km/h로 진입했는가”를 기준으로 돌리는 편이 맞다.

## 이번 작업에서 남은 것

이번 반복으로 Apex Seoul은 꽤 많이 달라졌다.

비주얼적으로는 도로 양옆의 성격이 생겼다. 왼쪽은 열린 절벽과 도시, 오른쪽은 닫힌 옹벽과 수목이다. 가드레일은 단순 장식에서 충돌과 피드백의 일부가 됐다.

게임적으로는 정지/저속/중속/고속의 조작 단계가 더 분명해졌다.

```text
0km/h      : 차는 움직이지 않고, 꺾여 보이지도 않는다.
저속       : 입력 의도는 있지만 횡이동과 pose가 작다.
60km/h+    : 정상 조향권과 visual pose가 회복된다.
고속 코너  : 속도 예산과 understeer가 중요해진다.
충돌       : 가드레일에 닿으면 속도 손실과 bounce가 있다.
출발       : 0-100km/h가 13초 근처로 늦어졌다.
```

남은 작업도 분명하다.

- handling sim을 목표 속도 주입형으로 재정리
- 차량별 acceleration scale과 powerband 차별화
- Vortex GT / Apex S를 실제 차량 선택 흐름에 연결
- camera shake 수치 조정 UI 또는 query parameter 개선
- 왼쪽 drift pose에서 가드레일을 살짝 타는 현상 backlog 처리
- Graphics mockup을 bitmap asset으로 천천히 전환

## 마치며

이번 작업은 “그래픽을 예쁘게 했다”와 “핸들링을 조정했다”가 따로 떨어진 일이 아니었다.

오른쪽에 옹벽이 생기면, 그 옹벽은 충돌과 속도감으로 이어져야 한다. 왼쪽에 절벽과 도시가 보이면, 그 도시는 빠르게 반복되는 배경이 아니라 멀리 있는 기준점이어야 한다. 0 출발을 넣으면, 차는 정지 상태에서 움직이지도, 과하게 꺾여 보이지도 않아야 한다.

게임은 이런 작은 약속들이 쌓여서 믿을 수 있는 화면이 된다.

Apex Seoul은 아직 완성된 레이싱 게임은 아니다. 하지만 이번 반복을 지나면서, 적어도 “밤의 서울 산길을 내려가는 차”라는 감각은 조금 더 분명해졌다.
