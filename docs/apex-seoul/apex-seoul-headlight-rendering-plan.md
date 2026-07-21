# Apex Seoul 헤드라이트 렌더링 설계

갱신일: 2026-07-19

## 목표

야간 다운힐에서 차량 **전방의 좌·우 헤드램프 각각**에 짧고 찌그러진 타원 light pool을 보인다. 두 pool의 중첩부는 밝기 합산으로 더 밝아져야 한다. 동심원이나 링은 사용하지 않는다. 빛은 차량 뒤 바닥, 숲, 옹벽, 하늘 또는 crest 뒤 도로에 나타나면 안 된다.

## 실패한 첫 구현과 롤백 이유

첫 시도는 `roadRenderer`가 camera near-plane부터 road polygon을 다시 밝히는 Graphics pass였다. 차량 sprite는 화면상 `camera.z + 260z`의 접지점을 기준으로 고정돼 있는데, 조명은 `camera.z + 18z`부터 시작했다. 결과적으로 cone의 가장 밝은 부분이 차량 아래/뒤 화면에 생겼다.

또한 일반 alpha 합성은 어두운 road color 위에 미세한 색을 한 번 덧칠하는 수준이라, 헤드라이트의 광원감이 약했다. 이 구현은 롤백한다.

## 채택 구조

```text
차량 front anchor
  → full-screen additive headlight shader
  → 차량 전방 좌·우의 원근 fan과 다층 타원 light pool을 합산 계산
  → player sprite
```

### 책임 분리

| 요소 | 책임 |
| --- | --- |
| `headlightShader.ts` | 각 램프에서 전방으로 갈수록 넓어지는 원근 fan과 외곽 spill·주광부·hot spot을 계산하고, 중첩부를 밝기 합산한다. |
| `main.ts` | 현재 차량의 화면 anchor·sprite size·좌우 램프 간격·속도를 shader uniform으로 전달하고, shader에 camera shake를 적용한다. |
| `RenderDepth.Headlight` | world/roadside보다 위, player shadow·player보다 아래에 헤드라이트를 둔다. |

## 왜 shader인가

shader는 cone의 중심 밝기, 좌우 soft edge, 거리 감쇠를 픽셀 단위로 처리할 수 있다. Graphics polygon만으로는 흰색 중심과 주변 spill의 부드러운 차이를 만들기 어렵다.

초기 RenderTexture mask는 shader 출력을 전부 막아 실제 주행에서 빛이 보이지 않았다. 현재 단계에서는 차량 앞의 짧고 좁은 cone만 shader로 렌더해 출력 신뢰성을 먼저 확보한다. 급커브까지 정확하게 asphalt 내부로 제한하는 road texture mask는 Phaser의 offscreen Graphics capture를 별도 검증한 뒤 재도입한다.

## shader uniform

| uniform | 의미 |
| --- | --- |
| `uCarFront` | 렌더된 차량의 화면 anchor에서 atlas 투명 여백을 보정한 visible front 좌표. 두 light pool의 기준점이다. |
| `uLampHalfSpacing` | 차량 sprite 폭에 비례하는 화면상 좌·우 헤드램프 중심 간격의 절반. |
| `uIntensity` | 속도에 따라 약하게 보정되는 전체 광량. 정지 상태에서도 0이 아니다. |
| `uResolution` | 화면 비율 보정에 사용한다. |

## visual 규칙

- light pool은 `uCarFront`보다 조금 화면 위쪽에 존재한다.
- 각 램프의 투사광은 bumper 부근의 좁은 폭에서 시작해 전방으로 갈수록 넓어지는 역 사다리꼴 silhouette을 만든다. 끝단은 부드럽게 감쇠해 hard polygon처럼 보이지 않아야 한다.
- 각 pool은 넓고 약한 spill, 주광부, 작은 청백색 hot spot을 별도 경계선 없이 연속 합성한다. 야간 asphalt에서 인지될 수 있도록 타원 반경과 중심 광량은 충분히 확보하되, 넓은 외곽광은 절제해 두 타원이 하나의 구름처럼 뭉개지지 않게 한다. 램프 간격은 차체 중앙에 가깝게 유지하되, 두 중심이 분명히 읽히도록 분리한다.
- Phaser `ADD` blend에는 shader RGB를 그대로 전달한다. RGB에 alpha를 다시 곱하면 감쇠가 제곱되어 pool이 얇고 어두운 띠로 축소된다.
- 좌·우 pool은 독립적으로 계산하고 밝기를 합산하므로, 가운데 겹침부가 자연스럽게 더 밝다. 동심원·링·표식 같은 별도 밴드는 만들지 않는다.
- 반경은 화면 높이의 약 16% 이내로 제한한다.
- 타원 pool은 차량 전방 중심의 좁은 범위만 쓰므로, 일반 도로 폭 안에 남아야 한다.
- crest와 급커브에서 도로 밖 번짐이 보이면 shader-only 단계를 중단하고 road mask를 재검토한다.
- shader와 도로는 같은 shake offset을 써서 따로 미끄러지지 않게 한다.

## 검증 기준

1. 차량 뒤/하단에 밝은 trapezoid가 생기지 않는다.
2. 직선과 좌우 커브에서 cone이 asphalt 내부에만 남는다.
3. guardrail·옹벽·숲에 광원이 번지지 않는다.
4. crest 접근 시 cone이 숨겨진 road를 드러내지 않는다.
5. 저속·고속 모두 cone이 보이되, 고속에서만 과도하게 밝아지지 않는다.
6. player sprite, HUD, foreground matte의 depth 관계가 변하지 않는다.

## 구현 상태

- [x] 잘못된 camera-near-plane Graphics cone 롤백
- [ ] road geometry mask — RenderTexture capture가 출력을 막아 보류
- [x] additive headlight shader
- [x] 직선·다운힐 커브·crest 고정 장면 시각 QA
