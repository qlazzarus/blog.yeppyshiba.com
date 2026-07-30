# 3D 프린팅 계산기: 프린터 프로필 검증 및 확장 로드맵

## 목적

`/tools/3d-printing-calculator/`의 출력 시간·비용 추정이 제조사 마케팅 최대
수치를 그대로 사용해 과도하게 낙관적으로 나오는 일을 막는다. 프린터와 재료를
추가할 때는 UI 코드가 아니라 검증된 프로필 데이터만 추가하도록 구조를 개선한다.

## 현재 프로필 검증 결과

현재 구현의 `speed`와 `flow`는 공식 사양의 최대값이 아니라 보수적 견적을 위한
임의 추정값이다. 따라서 다음 개념을 분리해야 한다.

| 수치 | 용도 | 시간 계산 사용 여부 |
| --- | --- | --- |
| `maxPrintSpeedMmPerSec` | 제조사가 공개한 최대 출력 속도 | 아니오 |
| `typicalPrintSpeedMmPerSec` | 일반 품질 설정의 기준 출력 속도 | 예 |
| `maxTravelSpeedMmPerSec` | 비압출 이동 상한 | 예 |
| `maxAccelerationMmPerSec2` | 짧은 경로·작은 모델 시간 보정 | 예 |
| `ratedPowerWatts` | 제품의 정격 전력 | 아니오 |
| `averagePrintingPowerWatts` | 출력 중 평균 소비 전력의 추정값 | 예 |

정격 전력은 히트베드와 노즐을 가열하는 순간의 상한일 수 있으므로, 전기료 계산에
그대로 쓰면 과대 추정될 수 있다. 평균 전력은 재료, 베드/노즐 온도, 인클로저·챔버
히터, 주변 온도에 따라 달라지는 별도 추정값으로 관리한다.

### 제조사 공식 확인 기준

아래 최대값은 표시·검증 용도이며, `typical` 값과 혼동하지 않는다.

| 모델 | 빌드 볼륨 (mm) | 공식 최대 속도 | 공식 최대 가속도 | 공식 최대 유량 | 출처 |
| --- | --- | ---: | ---: | ---: | --- |
| Bambu Lab X1 Carbon | 256 × 256 × 256 | 500 mm/s | 20,000 mm/s² | 32 mm³/s (ABS 조건) | [공식 사양](https://public-cdn.bambulab.com/store/bambulab-X1-carbon-tech-specs.pdf) |
| Bambu Lab P1S / P1P | 256 × 256 × 256 | 500 mm/s | 20,000 mm/s² | 별도 재확인 필요 | [공식 비교표](https://us.store.bambulab.com/products/p1s) |
| Bambu Lab A1 | 256 × 256 × 256 | 500 mm/s | 10,000 mm/s² | 별도 재확인 필요 | [공식 사양](https://us.store.bambulab.com/products/A1/) |
| Bambu Lab A1 mini | 180 × 180 × 180 | 500 mm/s | 10,000 mm/s² | 별도 재확인 필요 | [공식 사양](https://us.store.bambulab.com/products/a1-mini?id=543566369394393101) |
| Bambu Lab H2D | 단일 325 × 320 × 325 / 듀얼 300 × 320 × 325 | 1,000 mm/s | 20,000 mm/s² | 40 mm³/s | [공식 사양](https://eu.store.bambulab.com/products/h2d?from=home_page_3dprinter) |
| Creality K1 / K1C / K1 Max | 220³ / 220³ / 300³ | 600 mm/s | 20,000 mm/s² | K1 32 mm³/s | [K1](https://www.creality.com/products/creality-k1-3d-printer), [K1 계열 비교](https://www.creality.com/compare/compare-k1-flagship-series) |
| Creality Ender-3 V3 SE | 220 × 220 × 250 | 250 mm/s | 2,500 mm/s² | 별도 재확인 필요 | [공식 비교](https://forum.creality.com/t/ender-3-v3-vs-ender-3-v3-se-vs-ender-3-v3-ke/23425) |
| Creality Ender-3 V3 KE | 220 × 220 × 240 | 500 mm/s | 8,000 mm/s² | 별도 재확인 필요 | [공식 매뉴얼](https://cdn.creality.com/ow/official/8b3ce46c-754d-4a8c-b5c2-8003b9f5e374.pdf) |
| Creality Ender-3 V3 | 220 × 220 × 250 | 600 mm/s | 20,000 mm/s² | 별도 재확인 필요 | [공식 사양](https://www.creality.com/products/creality-ender-3-v3) |

Ender-3 S1과 Ender-5 S1은 선택지 연속성을 위해 `community-preset`으로 유지한다.
두 기종의 수치는 제품별 공식 기술 문서로 재검증하기 전까지 추천·견적에 보수적
시간 보정값을 적용하며, 새 기종과 동일하게 출처 확인 대상으로 관리한다.

Voron Trident와 Voron 2.4는 구성 가능한 DIY 플랫폼이다. 빌드 볼륨, 핫엔드,
가속도, 유량, 전력의 고정 공식값은 없으므로 제품군 기본값은 보수적으로 두되
`communityPreset`로 명시하고, 출처와 적용 구성(예: 250 mm, StealthBurner)을
기록해야 한다.

### 멀티 툴 구성 원칙

H2D의 듀얼 노즐과 Voron Toolchanger를 같은 단순 옵션으로 취급하지 않는다.

- `Bambu Lab H2D`: 해당 기종을 선택했을 때만 단일/듀얼 노즐 모드를 표시한다.
  현재는 모드별 빌드 볼륨 판정에 사용하며, 차후 듀얼 재료·서포트와 퍼지 계산을
  추가한다.
- `Voron 2.4`: 일반 싱글 툴헤드 프로필이다.
- `Voron 2.4 StealthChanger`: Toolchanger 구성 전용의 별도 커뮤니티 프로필이다.
  `baseProfileId`로 Voron 2.4를 참조하되, 멀티 툴 계산에 필요한 기본값을 가진다.

Toolchanger는 사용자 구성에 따라 툴 수, 노즐, 전환 시간, 퍼지 방식과 실제 가용
영역이 달라진다. 초기 기본값은 4개 툴, 툴 전환 8초, 퍼지 타워 사용으로 두고,
반드시 추정값으로 표시한다. Phase 2에서는 Toolchanger 프로필에서만 툴 수,
재료·서포트 툴 배정, 퍼지 타워와 전환 조건을 노출한다.

#### 멀티 툴 확장 구현 상태

H2D 듀얼 노즐에서는 서포트 재료 선택, 퍼지 타워 사용 여부, 예상 툴 전환 횟수와
전환 시간(기본 8초), 퍼지 재료량을 근사 계산에 반영했다. 이 입력은 H2D의 듀얼
노즐 모드에서만 표시된다. Toolchanger용 UI와 계산은 Voron 프로필 재검증 후 별도
단계로 진행한다.

### 공통 분석·시간 근사 Phase 2

구현 완료 범위:

- 모든 STL에서 표면적, 폐쇄 메시 체적, 베드 접촉 예상 면적, 하향 오버행 비율을
  계산하고 결과 카드에 표시한다.
- 모델·인필·서포트·퍼지의 압출 시간을 각각 재료별 체적 유량과 설정별 선속도 상한으로
  추정한다.
- 비압출 이동 거리, 레이어 전환, 첫 레이어 감속, 프린터 가속도 보정 및 프린터별 시간
  보정 계수를 시간 범위 산정에 반영한다.
- 오버행, 세장비, 접촉 면적, ABS와 인클로저 조건을 조합해 서포트·브림·밀폐형 관련
  추천을 생성한다.

이는 실제 슬라이싱 경로가 아닌 형상 기반 근사치다. 벽/인필의 실제 경로와 툴패스별
가감속을 정확히 계산하려면 차후 로컬 슬라이서 또는 WASM 툴패스 분석 단계가 필요하다.

## 빠른 견적 고도화 후보

도구의 목적은 슬라이서 전 빠른 견적과 출력 실패 위험 안내다. 완전한 서포트 생성이나
G-code 생성으로 범위를 넓히기보다, 결과에 큰 영향을 주는 형상·재료·첫 레이어 위험을
우선 분석한다.

우선순위는 다음과 같다.

1. **모델 방향 추천**: 현재 방향과 X/Y/Z 축을 기준으로 한 가상 회전 후보를 비교해
   접지 면적, 모델 높이, 오버행 비율이 더 좋은 방향을 추천한다.
2. **얇은 벽·메시 품질 경고**: 선택 노즐 직경 대비 얇은 벽, 좁은 틈, 열린 메시,
   비매니폴드 엣지, 0 면적 삼각형을 감지한다.
3. **첫 레이어·워핑 위험 점수**: 접지 면적, 높이 대비 폭, 큰 평면, 재료 수축성,
   인클로저·베드 온도 조건을 조합해 안정/주의/위험으로 표시한다.
4. **브림 경로 기반 계산**: 레이어 교차 분석의 외곽 길이를 사용해 브림 폭과 레이어
   높이에 따른 재료량을 추정한다.
5. **브리지·냉각 대기 보정**: 레이어 단면에서 빈 공간 폭을 추정해 짧은 브리지와 긴
   브리지를 구분하고, 작은 레이어의 최소 냉각 시간을 시간 추정에 반영한다.

### 모델 방향 옵션 설계

초기에는 사용자가 모델을 자유롭게 회전·배치하는 편집기를 제공하지 않는다. 대신
`현재 방향`, `자동 추천 방향 확인` 옵션을 제공한다. 자동 비교는 90도 축 회전 후보를
가상 평가하며, 실제 모델·미리보기·견적을 변경하지 않고 추천 카드만 표시한다.

- 점수: 베드 접촉 면적 증가, 높이 감소, 오버행/서포트 예상량 감소를 가중 합산한다.
- 안전: 기능은 추천만 하며 사용자의 STL 방향을 자동 변경하지 않는다.
- 적용: 사용자가 추천 방향을 명시적으로 적용할 때만 미리보기와 견적의 방향을
  변경한다.
- 제외: 임의 각도 탐색, 최적 배치, 트리 서포트 최적화는 완전 슬라이서에 가까워지므로
이 도구의 초기 범위에서 제외한다.

## 레이어 폴리곤 분석 로드맵

현재 경로 Worker는 레이어 평면과 STL 삼각형이 교차하는 선분 길이를 합산한다.
빠른 견적 정확도를 높이기 위해 이 선분을 닫힌 2D 폴리곤으로 확정하는 단계를 추가한다.

### 처리 순서

1. **교차 선분 생성**: 각 레이어 높이에서 STL 삼각형과 교차하는 2D 선분을 만든다.
2. **끝점 스냅·연결**: 0.01 mm 정수 격자로 끝점을 정규화하고, 같은 끝점을 공유하는
   선분을 연결해 닫힌 루프를 생성한다.
3. **루프 분류**: signed area와 포함 관계로 외곽선·구멍·열린 루프를 구분한다.
4. **외벽·브림 보정**: 확정된 외곽 길이로 외벽 재료량과 브림 재료량을 보정한다.
5. **레이어 차집합 분석**: 인접 레이어 폴리곤의 차이로 오버행·브리지·서포트 후보를
   계산한다.
6. **일반 기둥형 서포트 근사**: 빌드 플레이트 전용 옵션부터 도입한다. 트리 서포트는
   초기 범위에서 제외한다.

### 구현 원칙

- 모든 연산은 Web Worker에서 실행하고, UI에는 레이어·루프·길이 요약만 전달한다.
- 대형 STL은 레이어 샘플링 상한을 유지하되 결과에 샘플링 여부를 표시한다.
- 열린 루프·중복 선분·0 길이 선분은 메시 품질 경고로 집계한다.
- 차집합·오프셋이 필요한 5단계부터는 정수 좌표 기반 폴리곤 클리핑 라이브러리를
  Worker 의존성으로 검토한다. 1~3단계는 외부 라이브러리 없이 구현한다.

## 목표 데이터 모델

프로필은 `src/data/print-calculator/printers.ts`로 분리하고 UI에서는 식별자로만
선택한다. 모델 추가는 데이터 파일과 검증 문서의 한 행을 추가하는 작업이어야 한다.

```ts
interface PrinterProfile {
  id: string;
  manufacturer: string;
  name: string;
  buildVolume: { x: number; y: number; z: number };
  alternateBuildVolumes?: Array<{
    id: string;
    label: string;
    buildVolume: { x: number; y: number; z: number };
  }>;
  toolSystem: "single" | "dual-independent" | "toolchanger";
  baseProfileId?: string;
  maxToolCount?: number;
  toolChangeSeconds?: number;
  purgeTowerDefault?: boolean;
  enclosed: boolean;
  chamberHeating?: { supported: boolean; maxTemperatureC?: number };
  defaultNozzleDiameter: number;
  supportedNozzleDiameters: number[];
  nozzleMaterial?: "brass" | "stainless-steel" | "hardened-steel";
  maxNozzleTemperatureC: number;
  maxBedTemperatureC: number;
  maxPrintSpeedMmPerSec: number;
  typicalPrintSpeedMmPerSec: number;
  maxTravelSpeedMmPerSec?: number;
  maxAccelerationMmPerSec2: number;
  maxVolumetricFlowMm3PerSec?: number;
  averagePrintingPowerWatts: number;
  ratedPowerWatts?: number;
  defaultTimeCorrectionFactor: number;
  materialSupport: Record<"pla" | "petg" | "abs", "recommended" | "supported" | "not-recommended">;
  sourceUrl: string;
  sourceCheckedAt: string;
  sourceType: "manufacturer" | "community-preset";
}
```

### 재료·노즐별 유량 제한

프린터 단일 최대 유량은 참고값으로 남기되, 견적 계산은 아래 우선순위를 사용한다.

1. 재료 프로필의 `maxVolumetricFlowMm3PerSec`
2. 선택 노즐 직경의 유량 제한
3. 프린터의 최대 유량

향후 `MaterialProfile`에는 노즐별 유량 제한 테이블과 온도별 유량 보정을 추가한다.
공식 유량은 특정 재료·온도·단일 벽 조건에서 측정된 경우가 많으므로 출처의 측정
조건도 함께 보관한다.

## 구현 순서

1. `src/data/print-calculator/`에 프린터·재료·출력 목적 프로필을 분리한다.
2. 현재 `speed`를 `typicalPrintSpeedMmPerSec`로 이름 변경하고, 공식 최대 속도와
   가속도 필드를 추가한다.
3. 시간 산정식에 가속도 기반의 짧은 경로 보정과 비압출 이동 시간을 반영한다.
4. 평균 전력과 정격 전력을 분리해 전기료는 평균 전력만 사용한다.
5. H2D의 단일/듀얼 노즐 모드를 선택할 수 있게 하고 모드별 빌드 볼륨을 적용한다.
6. ABS 선택 시 `materialSupport`, 인클로저, 챔버 가열, 베드 최고 온도를 함께 평가해
   경고·권장을 생성한다.
7. 신규 프린터를 추가할 때는 공식 사양 URL·확인일·공식/커뮤니티 구분을 반드시
   기록하고, 프로필 단위 테스트로 필수 필드와 합리적인 범위를 검증한다.

## 검증 기준

- 빌드 볼륨, 기본/지원 노즐, 밀폐형 여부, 최대 온도, 최대 속도·가속도는 공식 출처를
  우선한다.
- 공식 최대 속도는 견적의 기본 속도로 사용하지 않는다.
- 전력은 실측 근거가 없으면 `averagePrintingPowerWatts`가 추정값임을 UI에 표시한다.
- STL 미리보기의 베드 적합성은 선택한 출력 모드의 빌드 볼륨으로 판정한다.
- 프로필의 출처 확인일이 12개월을 넘으면 갱신 검토 대상으로 표시한다.
