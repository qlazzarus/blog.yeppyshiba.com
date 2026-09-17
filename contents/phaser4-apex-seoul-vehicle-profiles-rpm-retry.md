---
title: Apex Seoul 개발 기록 - 세 대의 프로파일, RPM 컷, Retry시 리소스 오류
date: 2026-09-17T12:00:00+09:00
summary: 세 차량의 코너링 설정을 프로파일로 분리했다. 터보 차량의 변속과 RPM 컷을 수정하고, Retry 뒤 나무가 사라지던 Scene 수명주기 버그를 정리했다.
image: /images/posts/202609/apex-seoul-vehicle-profiles-retry/cover.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - game-dev
    - racing-game
---

[지난 글](/article/phaser4-apex-seoul-stuck-recovery/)에서는 코너에 갇힌 차를 도로로 돌려보냈다. 이번에는 차를 바꿔 타며 주행 쪽을 정리했다.

차량 선택에는 Raven Coupe, Mirae GT, Seorin GT가 들어가 있다. 외형과 엔진 구성을 나눈 데 이어 코너링 설정을 분리했다. 그 과정에서 마지막 기어로 올라가지 않는 변속 조건, 레드존에 닿지 않는 RPM, Retry 뒤 사라지는 나무도 수정했다.

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

## 세 차량, 두 프로파일

| 차량        | 엔진            | 코너링 설계 방향                   |
| ----------- | --------------- | ---------------------------------- |
| Raven Coupe | NA              | 빠른 진입 응답과 가속 해제 시 회전 |
| Mirae GT    | 싱글터보        | 과급이 올라온 뒤 탈출 자세 회복    |
| Seorin GT   | 순차식 트윈터보 | 넓은 엔진 응답과 고속 코너 안정성  |

엔진은 `VehicleEngineProfile`, 코너링은 `VehicleHandlingProfile`로 관리한다. 자연흡기라는 이유만으로 차가 잘 돌아야 하는 것은 아니다. 코너링 성격은 별도로 정한 게임 설정이다.

차량 asset이 두 프로파일을 갖고, `createPlayerVehicleRuntimeConfig()`에서 공통 주행 설정에 합성한다. 주행 controller에 차량 이름을 검사하는 조건을 늘리지 않았다.

```text
RuntimeVehicleAsset
  ├─ engineProfile
  └─ handlingProfile
         ↓
createPlayerVehicleRuntimeConfig()
         ↓
updatePlayerVehicle()
```

프로파일의 축은 조향 응답, 고속 안정성, lift 회전, 가속 중 출구 회복이다. 도로 폭과 충돌 규칙은 공통으로 둔다.

Raven의 조향 응답 배율은 `1.06`, lift 회전 배율은 `1.10`이다. Seorin은 각각 `0.97`, `0.88`, Mirae는 `0.94`, `0.94`에서 시작했다. 최종 밸런스 수치가 아니라 비교용 첫 설정이다.

현재 lift 회전 값은 drift 진입 kick, 형성 속도, 최소 코너 강도에 연결된다. 이 설정은 제동 진입에도 공유된다. 가속 해제만의 회전 특성을 독립적으로 조절하려면 진입 원인별 적용을 더 나눠야 한다.

![가속을 해제한 Raven Coupe가 첫 번째 측정 코너에서 drift 자세로 들어가는 브라우저 캡처](/images/posts/202609/apex-seoul-vehicle-profiles-retry/raven-lift-drift.png)

이 캡처는 차량 프로파일 적용 전, 공통 lift drift 상태 기계를 확인한 측정 결과다. 프로파일은 이 공통 상태 기계의 진입·회복 계수를 바꾼다.

고속 안정성도 아직 남았다. 프로파일 값을 고속 조향 감쇠 설정에 합성했지만, 현재 controller는 해당 필드를 실제 계산에서 읽지 않는다. 설정 생성 테스트가 통과해도 주행 효과까지 검증된 것은 아니다. 이 축은 실제 고속 조향 경로에 연결하고 다시 측정해야 한다.

## Mirae의 출구는 부스트가 올라온 다음

Mirae의 출구 회복 배율은 `1.16`이다. 가속 중이고 실제 `boostRatio`가 `0.70` 이상일 때 recovery 속도에 적용한다.

```ts
const powerExitTractionScale =
    input.accelPressed &&
    config.engineProfile.boost &&
    player.boostRatio >= config.powerExitBoostThreshold
        ? config.powerExitTractionScale
        : 1;

const recoveryRate = config.driftRecoveryRate * powerExitTractionScale;
```

이 값은 드리프트 비율을 줄이고 접지 상태를 회복하는 속도를 바꾼다. 별도의 엔진 힘을 더하지 않는다.

60Hz의 한 프레임 검사에서 과급이 충분하면 drift ratio가 약 `0.556`까지 줄었다. 같은 조건에서 배율을 끄면 약 `0.562`였다. 부스트가 낮을 때도 일반 회복을 유지했다.

조건부 회복이 작동한다는 확인이다. Mirae가 코너 탈출에서 가장 빠르다는 결론까지는 아니다.

![lift drift 뒤 Raven Coupe가 차체를 다시 정렬하며 코너를 빠져나오는 브라우저 캡처](/images/posts/202609/apex-seoul-vehicle-profiles-retry/raven-lift-exit.png)

drift의 진입과 탈출은 서로 다른 문제다. 진입을 쉽게 만든다고 탈출까지 빠르다고 볼 수 없다. Mirae의 설정은 이 두 번째 구간을 실제 boost 상태와 연결한 첫 시도다.

## 마지막 기어에 못 올라가던 조건

Seorin의 7→8단, Mirae의 5→6단 조건부터 손봤다. 두 차량은 속도 구간으로 기어를 정하는 arcade 모델이다. 여기에 도달하기 어려운 RPM 조건까지 걸려 마지막 변속이 막혔다.

Raven은 기어비에서 계산한 기계적 RPM으로 변속한다. 터보 두 차량은 각 기어의 속도 경계로 올라간다. 변속 기준을 구동 모델에 맞췄다.

변속 중 힘이 끊기는 시간과 과급 부하도 프로파일로 분리했다.

| 차량   | 상승 변속 시간 | 변속 중 과급 부하 유지 비율 |
| ------ | -------------: | --------------------------: |
| Raven  |         0.22초 |                   해당 없음 |
| Mirae  |         0.26초 |                        0.12 |
| Seorin |         0.14초 |                        0.65 |

과급 부하 유지 비율은 남아 있는 압력 자체가 아니다. 변속 중 터빈을 구동하는 부하에 곱하는 값이다. 압력은 별도의 시간 응답으로 변한다. Mirae는 다시 압력을 쌓는 시간이 길고, Seorin은 짧은 변속 뒤 응답을 이어간다.

엔진 상태를 한 프레임에 두 번 진행하던 경로도 정리했다. 시간 계산부터 맞춰야 차이를 비교할 수 있다.

## 레드존과 연료 컷은 다른 경계다

처음에는 Raven만 RPM 컷으로 바늘이 흔들리고, 터보 두 대는 고정되는 것처럼 보였다. 수치를 따라가 보니 Raven도 기존 6단으로는 225km/h에서 약 6,000RPM이었다. 도로 주행의 limiter에 닿지 않았다. 보였던 흔들림은 출발 제어였을 가능성이 있었다.

터보 차량도 최종 기어의 RPM 상한이 연료 컷 기준보다 낮았다. Raven의 6단 기어비를 `0.97`로 바꾸고, Seorin 8단과 Mirae 6단의 RPM 상한을 컷 기준에 맞췄다.

| 차량   | 레드존 시작 | 연료 컷 진입 |
| ------ | ----------: | -----------: |
| Raven  |    7,200RPM |     7,750RPM |
| Seorin |    6,500RPM |     7,000RPM |
| Mirae  |    6,700RPM |     7,200RPM |

경계값을 맞춘 뒤에도 문제가 하나 남았다. RPM smoothing이 목표에 가까워지기만 하고 정확히 닿지 않았다. 컷 기준과 목표 RPM이 같으면 임계값 바로 아래에서 계속 머무를 수 있었다.

진입 판정에 1RPM의 허용 범위를 넣었다.

```ts
const shouldEnterFuelCut = player.rpm >= profile.fuelCutStartRpm - 1 && throttle > 0;
```

이제 지속 가속하면 컷에 들어갔다가 RPM이 내려오고 다시 회복한다. 바늘과 숫자는 이 실제 RPM 변화를 그대로 따라가므로, 컷 구간에서는 위아래로 요동한다. 터보는 컷 중 과급도 빠진다. 좀 더 심하게 화면을 별도로 흔드는 연출등은 넣지 않았다.

RPM 게이지의 붉은 영역은 차량별 `redlineStartRpm`을 따른다. 실제 rpm 컷 상태가 들어가면 `REV LIMIT`를 표시하도록 구현하였다.

## Retry를 누르면 나무가 사라졌다

retry 를 구현 후 다시 시작하면 숲이 사라졌다. 처음에는 asset cache가 지워지는 문제로 의심했다.

원인은 `wallForestSprites` Map이었다.

```text
첫 주행에서 나무 Image 생성 → Map에 보관
Scene shutdown → Phaser가 Image 파괴
Retry → 같은 Scene 인스턴스 재사용
Map에는 이전 참조가 남음 → 같은 ID의 Image 생성 생략
```

Map에 키가 있다는 사실과 화면에 살아 있는 객체가 있다는 사실이 달랐다. 텍스처는 남아 있었다.

Scene 종료 때 Map을 비웠다.

```ts
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    this.gameplayHud?.destroy();
    this.wallForestSprites.clear();
});
```

다음 주행에서는 나무 Image를 다시 만든다. 공유 asset cache를 지우거나 다시 다운로드할 필요는 없다.

## 확인한 범위

코너 비교는 같은 제어 정책을 사용했지만, 차량마다 엔진이 달라 실제 속도와 입력 시점이 달라진다. 횡편차가 크다고 회전 성능이 좋은 것도 아니다. 이번 결과만으로 차량 순위를 정하지 않는다.

다음은 같은 진입 속도와 고정 입력으로 조향 응답을 분리해서 보는 작업이다. 고속 안정성 축을 실제 계산에 연결하고, brake와 lift 진입도 나눠 확인해야 한다. Mirae의 빠른 자세 회복이 탈출 속도와 구간 기록에 이득을 주는지도 그때 판단한다.

차는 세 대다. 설정도 갈라졌다. 이제 코너에서 차이를 증명할 차례다.
