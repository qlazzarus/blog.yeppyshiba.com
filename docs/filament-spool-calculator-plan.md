# 필라멘트 한 롤 출력 수량 계산기: 독립 도구 기획·설계

## 목적

`/tools/filament-spool-calculator/`는 STL 한 개의 빠른 출력 견적을 생산 수량
결정으로 확장하는 **별도 도구 페이지**다. 사용자는 STL, 출력 조건, 스풀 상태와
목표 수량을 입력해 아래 질문에 답한다.

- 새 필라멘트 한 롤 또는 현재 잔량으로 몇 개를 출력할 수 있는가.
- 현재 프린터 베드에 한 번에 몇 개를 배치할 수 있는가.
- 목표 수량을 위해 몇 롤을 준비하고 몇 번 출력해야 하는가.
- 전체 생산에 필요한 시간, 재료량, 재료비와 출력 후 잔량은 얼마인가.

기존 `/tools/3d-printing-calculator/`는 STL 한 개의 출력 시간·재료량·비용과
권장 설정을 빠르게 추정하는 도구다. 새 도구는 그 결과를 입력으로 삼을 수는 있어도
기존 화면의 결과 카드나 상태를 확장하지 않는다. 각 페이지는 독립적으로 파일 업로드,
UI 상태, Worker 실행, 계산 및 오류 처리를 완료해야 한다.

## 권장 결정 요약

| 항목 | 권장 결정 | 이유와 트레이드오프 |
| --- | --- | --- |
| 최종 기능명 | **필라멘트 한 롤 출력 수량 계산기** | 제목에서 사용자의 질문을 그대로 전달하면서도 검색·도구 목록에서 짧다. H1에는 `필라멘트 한 롤로 몇 개 출력할 수 있을까?`를 함께 사용한다. |
| URL | `/tools/filament-spool-calculator/` | 기존 도구 URL의 영문·기능 중심 규칙과 맞고, `filament`와 `spool` 두 핵심 의도를 명확히 담는다. `how-many-prints-per-spool`보다 한국어 페이지 관리와 향후 명칭 변경에 안정적이다. |
| 기본 입력 흐름 | STL → 출력 조건 → 스풀 방식/안전 여유 → 즉시 수량 결과 → 목표 수량 | 파일 분석 뒤 필요한 조건만 순서대로 보여 주어, 목표 수량을 입력하지 않아도 핵심 답을 바로 얻는다. |
| 안전 여유 | 기본 5%, 장시간 8%, 다색·퍼지 10%; 직접 입력 가능 | 일반 출력에 과도한 보수성을 피하면서 잔량 끝까지 쓰는 위험을 줄인다. 재료량 추정 자체의 오차를 없애지는 못한다. |
| 베드 배치 MVP | 포함, 바운딩 박스 직사각형 근사만 제공 | 생산 횟수 산정에 필수이고 구현·설명이 명료하다. 자동 네스팅처럼 보이지 않도록 한계와 슬라이서 확인을 항상 표시한다. |
| 복수 출력 시간 | 1개 추정 시간 × 수량에 배치 구간별 범위 보정 | 현재 시간 추정식과 일관되며 슬라이서 없이도 과도한 단정은 피한다. 실제 툴패스 시간은 제공하지 않는다. |
| 빈 스풀 프리셋 | 타입·확장 지점만 준비하고 MVP UI/DB는 제외 | 제조사·재질·규격 차이가 커 잘못된 기본값이 더 위험하다. 사용자는 측정 또는 제조사 수치를 직접 입력한다. |
| 모바일 | 단일 세로 흐름, 결과 요약은 상단 고정 요약 카드, 상세는 접기 | 입력과 핵심 결과를 한 화면 폭에서 읽을 수 있다. 3D 미리보기는 고정 높이와 전체 폭을 사용한다. |
| 계산기 간 링크 | 결과 하단의 일반 링크만 Phase 1에 제공 | 독립성을 지키며 구현 위험이 없다. 프린터·재료 URL 전달과 세션 전달은 후속 검토다. |
| 소개 글 | 계산기 출시 후 별도 설명 글 작성 | 검색 의도와 사용법을 보강한다. 도구 MVP 출시를 글 작성에 의존시키지는 않는다. |

## 현재 코드 기준과 재사용 경계

현재 구현은 다음과 같다.

```text
src/pages/tools/3d-printing-calculator.astro
  └─ src/components/PrintCalculator.astro
       └─ src/features/print-calculator/index.ts
            ├─ src/workers/stlAnalyzer.worker.ts
            ├─ src/workers/stlPathEstimator.worker.ts
            └─ src/data/print-calculator/profiles.ts
```

`PrintCalculator.astro`와 `initPrintCalculator`는 단일 계산기 DOM id와 결과 렌더링에
직접 결합되어 있다. 새 도구가 이를 호출하거나 DOM id를 공유하면 상태 충돌과 유지보수
부담이 생기므로 재사용하지 않는다. 반면 프린터·재료·출력 목적 프로필은 이미 데이터
모듈로 분리되어 있어 읽기 전용으로 바로 재사용할 수 있다.

| 분류 | 대상 | 처리 방침 |
| --- | --- | --- |
| 그대로 재사용 | `PRINTER_PROFILES`, `MATERIAL_PROFILES`, `PRINT_INTENTS` | 새 전용 feature에서 id로 선택한다. H2D는 기존과 같이 활성 빌드 볼륨을 먼저 확정한다. |
| 그대로 재사용 | `formatNumber`, `formatDuration` | 공통 formatter 위치로 승격할 때까지 import해 사용한다. |
| 공통 모듈 추출 | Binary/ASCII STL 판별 및 vertex 파싱 | 두 Worker가 유사 파서를 이미 각각 갖고 있으므로 `src/lib/3d-printing/shared/stl.ts`로 분리한다. Worker에서 사용 가능한 순수 함수여야 한다. |
| 공통 모듈 추출 | `ModelAnalysis` 타입과 메시 분석 | `stlAnalyzer.worker.ts`의 순수 분석부를 shared로 옮기고 Worker는 메시지·진행률 어댑터만 담당한다. |
| 공통 모듈 추출 | 1개당 재료량·시간·비용 추정 | 현재 `index.ts`의 클릭 핸들러 안 계산식을 순수 함수로 추출한다. 두 계산기는 같은 `PrintEstimateResult`를 받아야 결과 기준이 갈리지 않는다. |
| 공통 모듈 추출 | 파일 크기, STL 확장자, Worker 오류 검증 | 현재 UI 안 검증 규칙(100MB, `.stl`)을 shared validation으로 옮겨 같은 오류 문구/한도를 유지한다. |
| 선택 재사용 | Three.js 미리보기 | 렌더러 생성·정리와 모델 배치 코드를 전용 `ModelPreview`로 컴포넌트화한 뒤 두 계산기에서 사용한다. Phase 1에는 새 컴포넌트에서 복제하지 말고 추출 후 사용한다. |
| 새 전용 | 스풀 입력, 수량·배치·생산 계획, 권장 배치 규칙 | 기존 도구의 목적에 없는 도메인 로직이므로 `filament-spool-calculator` feature에 둔다. |
| 새 전용 | 새 페이지 UI 상태와 SEO·FAQ 콘텐츠 | 기존 결과 화면이나 URL 상태에 의존하지 않는다. |

### 공통화 순서와 회귀 위험

공통화는 새 기능 구현 전에 작은 단위로 한다.

1. 프로필 데이터는 그대로 참조한다.
2. STL 파싱·분석 타입과 순수 함수를 추출하고, 기존 Worker의 입력·진행 메시지 형식은
   유지한다.
3. 1개 출력 견적을 `estimatePrint`로 추출하고 기존 계산기의 수치 스냅샷 테스트를
   통과시킨다.
4. 파일 검증과 미리보기 수명 주기를 공통화한다.
5. 그 뒤 새 페이지 전용 수량·배치·생산 계획을 추가한다.

주요 회귀 위험은 (a) Binary STL vertex offset 또는 ASCII 판별 변경, (b) 열린 메시의
체적 근사 처리 변경, (c) path Worker 완료 전/후 재료량이 달라지는 시점, (d) H2D 듀얼
노즐의 활성 베드 크기와 퍼지량, (e) 기존 DOM id·Worker 진행 표시의 변화다. 기존
페이지의 파일 업로드, Binary/ASCII 분석, 열린 메시, H2D 듀얼 모드 및 결과 수치에 대한
회귀 테스트를 공통화 변경의 병합 조건으로 둔다.

## 사용자 흐름과 UI

```text
STL 선택·브라우저 분석
  → 프린터/재료/출력 목적/노즐/서포트/브림
  → 1개당 재료량·시간 추정
  → 스풀 방식 선택 및 안전 여유 입력
  → 한 롤/현재 잔량 수량 결과
  → 베드 최대·권장 동시 배치 결과
  → 목표 수량 생산 계획
```

페이지는 아래 순서로 구성한다.

1. 도구 소개: 로컬 분석 안내와 핵심 질문을 표시한다.
2. STL 업로드: 드래그앤드롭, 파일 정보, 진행률, 오류, 모델 치수와 Three.js 미리보기를
   제공한다. 파일은 서버에 전송하지 않는다.
3. 출력 조건: 기존과 같은 프린터, 재료, 출력 목적, 노즐, 서포트, 브림을 사용한다.
4. 스풀 정보: `새 스풀`, `스풀 포함 무게 측정`, `순수 잔량 직접 입력` 중 하나를
   radio/tab으로 고른다. 선택한 방식의 필수 입력만 노출한다.
5. 기본 수량 결과: 1개당 총 사용량, 사용 가능 중량, 이론상 수량, 안전 권장 수량,
   해당 권장 수량을 출력한 뒤 잔량을 보여 준다.
6. 베드 배치 결과: 기본·90도 회전 수, 최대·권장 동시 배치, 계산 한계를 보여 준다.
7. 목표 생산 계획: 목표 수량 입력 후 필요한 재료, 스풀, 구매 수량, 출력 횟수, 시간 범위,
   재료비, 마지막 배치 뒤 추정 잔량을 보여 준다.
8. 경고·설명·FAQ와 기존 상세 견적 도구로 가는 링크를 제공한다.

데스크톱에서는 출력 조건과 스풀 정보를 2열 카드로, 결과 카드는 2~3열로 표시한다.
모바일에서는 모든 입력을 한 열로 쌓고, `핵심 결과` 카드(안전 수량·권장 배치·목표
출력 횟수)만 입력 직후에 먼저 둔다. 숫자 입력은 `inputmode="decimal"` 또는 `numeric`을
설정하고, 탭은 접근 가능한 radio group으로 구현한다. 3D 미리보기는 가로 스크롤 없이
전체 폭·약 280px 높이를 유지한다.

## 계산 규칙

### 1개당 추정값

`estimatePrint`가 모델 본체, 서포트, 브림, 듀얼 노즐 퍼지/프라임 및 기존 보정량을
포함한 `totalFilamentG`와 `estimatedTimeMinutes`를 반환한다. 새 도구는 이 값을 다시
독자적으로 계산하지 않는다. 1개당 사용량이 0 이하이거나 아직 추정되지 않았으면 아래
모든 수량 결과를 `null`로 유지하고 입력 오류를 표시한다.

### 스풀 수량

```text
남은 필라멘트 g
  새 스풀        = 정격 스풀 중량
  스풀 무게 측정 = 현재 스풀 포함 총무게 - 빈 스풀 무게
  직접 입력      = 입력한 순수 잔량

안전 사용 가능 g = max(0, 남은 필라멘트 g × (1 - 안전 여유율))
이론상 수량     = floor(남은 필라멘트 g / 1개당 총 사용량 g)
안전 권장 수량  = floor(안전 사용 가능 g / 1개당 총 사용량 g)
권장 수량 후 잔량 = 남은 필라멘트 g - 안전 권장 수량 × 1개당 총 사용량 g
```

측정 모드에서 빈 스풀 무게가 현재 총무게보다 크면 오류이며 계산하지 않는다. 남은
필라멘트가 1개당 사용량보다 작으면 수량 0을 정상 결과로 표시하고, 새 스풀 필요
경고를 함께 보여 준다. 무게는 계산 내부에서 소수점을 유지하고, 표시만 g 1자리와
원화 0자리로 반올림한다.

### 베드 동시 배치

바운딩 박스를 사용한 직사각형 그리드 근사다. 활성 프린터 빌드 볼륨에 H2D 듀얼 모드
같은 축소 베드 영역을 적용하고, Z가 높이를 넘으면 배치 수를 0으로 한다.

```text
usableX = bedX - 2 × edgeMargin
usableY = bedY - 2 × edgeMargin
footprintX = modelX + spacing + 2 × brimWidth
footprintY = modelY + spacing + 2 × brimWidth

default = floor(usableX / footprintX) × floor(usableY / footprintY)
rotated = floor(usableX / footprintY) × floor(usableY / footprintX)
maximum = max(default, rotated)
```

`spacing`의 기본값은 5mm, `edgeMargin`은 5mm다. 브림을 켜지 않으면 `brimWidth`는
0이다. ABS/ASA 계열 또는 큰 베드 점유율은 8~10mm 여백을 권장하되, 첫 버전은 기존
재료 프로필의 PLA/PETG/ABS만 사용한다.

권장 배치 수는 `maximum`을 초과하지 않는 규칙 기반 결과다. 우선 다음 기준을 적용한다.

- 배치 최대 시간(아래 시간 보정의 상한)이 18시간 초과: `ceil(maximum / 2)` 이하.
- 24시간 초과, ABS 또는 높은 워핑 위험, 큰 베드 점유율(80% 이상), 높은 세장비,
  서포트 예상량이 큼: `ceil(maximum / 2)` 이하를 권장하고 이유를 표시한다.
- 그 외: 최대 배치를 권장한다.

권장값은 품질 보증이나 자동 배치 결과가 아니다. 비정형·원형·L자 모델의 빈 공간,
브림 겹침, 순차 출력 헤드 간섭, 실제 슬라이서의 배치 규칙은 계산하지 않는다는 문구를
결과 바로 아래에 고정한다.

### 목표 생산 계획과 시간

```text
필요 재료 g          = 목표 수량 × 1개당 총 사용량 g
안전 포함 필요 재료 g = 필요 재료 g × (1 + 안전 여유율)
필요 스풀 수          = ceil(안전 포함 필요 재료 g / 새 스풀 정격중량 g)
추가 구매 스풀 수     = max(0, ceil((안전 포함 필요 재료 g - 현재 잔량 g) / 정격중량 g))
권장 배치 출력 횟수   = ceil(목표 수량 / 권장 배치 수)
최대 배치 출력 횟수   = ceil(목표 수량 / 최대 배치 수)
```

새 스풀 모드에서 현재 잔량은 정격 중량과 같으므로 `추가 구매`는 기본적으로 필요한
스풀 수와 같은 개념이다. 측정/직접입력 모드에서는 현재 잔량을 먼저 차감한다. 안전
포함 필요 재료가 현재 잔량보다 작더라도 마지막 출력 뒤 안전 여유보다 적으면 경고한다.

복수 출력 시간은 실제 슬라이서 경로가 아니므로 범위로만 제시한다. 초기 계수는 배치당
개수 `n`에 대해 1개 시간의 합산에 적용한다.

| 동시 출력 n | 보정 범위 | 적용 근거 |
| --- | --- | --- |
| 1 | 1.00 | 단일 추정값을 그대로 사용 |
| 2~4 | 1.02~1.06 | 모델 간 이동·리트랙션 증가 |
| 5~8 | 1.05~1.12 | 이동, 첫 레이어, 레이어 순회 증가 |
| 9 이상 | 1.08~1.18 + 경고 | 근사 오차와 실패 손실이 커짐 |

각 출력 run은 마지막 run의 실제 수량을 사용해 계산하고 합산한다. 즉 목표 10개, 권장
배치 4개라면 `4개 + 4개 + 2개`의 시간을 각각 산정한다. 총 시간 범위는 각 run의
하한·상한 합이며, 사용자가 시작 시각을 명시적으로 입력한 경우에만 완료 예상 시각을
표시한다. MVP의 기본 화면에는 현재 시각 기반 완료시각을 표시하지 않아 시간대·중단
시간을 실제 약속처럼 보이게 하지 않는다.

총 재료비는 `목표 수량 × 1개당 총 사용량 g / 1000 × 1kg 가격`으로 계산한다. 구매
스풀 비용과 사용한 재료비를 혼동하지 않도록, MVP는 **사용 예상 재료비**를 기본값으로
표시하고 `구매해야 할 스풀 비용`은 추가 구매가 있을 때 보조 값으로 표시한다. 전기료는
기존 견적과 일관성을 위해 후속 범위로 둔다.

## 타입과 모듈 설계

실제 폴더 규칙은 현재 `src/features`, `src/data`, `src/workers`를 우선한다. 요청의
`src/lib` 구조를 그대로 새로 도입하기보다, 다음처럼 feature 중심으로 시작한다.

```text
src/
  components/
    PrintCalculator.astro                         # 기존, 점진적으로 shared UI 사용
    FilamentSpoolCalculator.astro                  # 새 독립 UI
  data/print-calculator/
    profiles.ts                                    # 기존 프로필, 공통 사용
  features/
    print-calculator/
      estimate-print.ts                            # index.ts에서 추출할 순수 1개 견적
      types.ts
      formatters.ts
      index.ts                                     # 기존 DOM adapter
    filament-spool-calculator/
      index.ts                                     # 새 DOM/state adapter
      types.ts
      estimate-quantity.ts
      estimate-placement.ts
      recommend-batch-size.ts
      estimate-production-plan.ts
  lib/3d-printing/shared/
    stl.ts                                         # parser, validation
    geometry-analysis.ts                           # ModelAnalysis 순수 계산
    model-preview.ts                               # Three.js lifecycle adapter, 추출 후
  workers/
    stlAnalyzer.worker.ts                          # shared 함수 호출
    stlPathEstimator.worker.ts                     # shared parser 호출
  pages/tools/
    3d-printing-calculator.astro
    filament-spool-calculator.astro
```

`estimate-print.ts`, `estimate-quantity.ts`, `estimate-placement.ts`,
`recommend-batch-size.ts`, `estimate-production-plan.ts`는 DOM·`File`·`Worker`·현재
시간에 의존하지 않는 순수 함수로 둔다. 이 원칙이 단위 테스트와 두 계산기의 결과
일관성을 보장한다.

```ts
type FilamentInputMode = 'new-spool' | 'weighed-spool' | 'remaining-weight';

interface FilamentQuantityInput {
  mode: FilamentInputMode;
  ratedSpoolWeightG: number;
  currentTotalWeightG?: number;
  emptySpoolWeightG?: number;
  remainingFilamentWeightG?: number;
  spoolPriceKRW?: number;
  safetyMarginPercent: number;
}

interface BedPlacementEstimate {
  defaultOrientationCount: number;
  rotatedOrientationCount: number;
  maximumCount: number;
  recommendedCount: number;
  spacingMm: number;
  edgeMarginMm: number;
  brimWidthMm: number;
  selectedOrientation: 'default' | 'rotated';
  limitations: string[];
}

interface FilamentQuantityEstimate {
  filamentPerItemG: number;
  availableFilamentG: number;
  safeAvailableFilamentG: number;
  theoreticalItemCount: number;
  recommendedItemCount: number;
  remainingAfterProductionG: number;
}

interface ProductionPlanEstimate {
  targetQuantity: number;
  requiredFilamentG: number;
  requiredFilamentWithMarginG: number;
  requiredSpoolCount: number;
  additionalSpoolCount: number;
  maximumItemsPerPlate: number;
  recommendedItemsPerPlate: number;
  estimatedPrintRuns: number;
  estimatedTotalTimeMinutes: number;
  estimatedTotalTimeRangeMinutes: [number, number];
  estimatedMaterialCostKRW: number;
  estimatedPurchaseCostKRW: number;
  remainingAfterTargetG: number | null;
}

interface FilamentSpoolCalculatorState {
  file: File | null;
  modelAnalysis: ModelAnalysis | null;
  printEstimate: PrintEstimateResult | null;
  selectedPrinterId: string;
  selectedMaterialId: MaterialId;
  selectedIntentId: PrintIntentId;
  nozzleDiameterMm: number;
  supportEnabled: boolean;
  brimEnabled: boolean;
  filamentInput: FilamentQuantityInput;
  targetQuantity: number | null;
  placementEstimate: BedPlacementEstimate | null;
  quantityEstimate: FilamentQuantityEstimate | null;
  productionPlan: ProductionPlanEstimate | null;
  status: 'idle' | 'loading' | 'analyzing' | 'calculating' | 'complete' | 'error';
  error: string | null;
}
```

`PrintEstimateResult`는 기존 결과 행의 재료량·시간·비용을 구조화한 새 공통 타입이다.
최소 필드는 `modelFilamentG`, `supportFilamentG`, `brimFilamentG`, `purgeFilamentG`,
`totalFilamentG`, `estimatedTimeMinutes`, `estimatedTimeRangeMinutes`,
`materialCostKRW`와 `warnings`다. 새 계산기의 입력 상태는 브라우저 메모리에만 두며
STL 바이트, 스풀 무게, 목표 수량을 URL이나 서버로 보내지 않는다.

향후 빈 스풀 프리셋은 다음 형태만 예약한다. MVP는 `EMPTY_SPOOL_PRESETS`를 비워 두고
자동 선택 UI를 제공하지 않는다.

```ts
interface EmptySpoolPreset {
  id: string;
  manufacturer: string;
  material?: MaterialId;
  ratedFilamentWeightG: number;
  emptySpoolWeightG: number;
  sourceUrl: string;
  sourceCheckedAt: string;
}
```

## 경고와 결과 문구

- 현재 잔량이 목표 생산의 안전 포함 필요량보다 적으면 추가 구매 필요 수량을 표시한다.
- 이론상 수량은 가능하지만 권장 수량 뒤 잔량이 10g 이하 또는 안전 여유보다 작으면
  새 스풀 전환을 권장한다.
- 권장 배치의 상한 시간이 18시간을 넘으면 실패 시 손실과 분할 출력을 안내한다.
- 최대 배치가 베드 가장자리 여백을 모두 사용하거나 ABS에서 큰 면적을 차지하면 워핑
  경고를 표시한다.
- 스풀 총무게가 빈 스풀보다 작거나 유효하지 않으면 결과 대신 입력 오류를 표시한다.
- 모든 결과에는 실제 슬라이서의 서포트, 브림, 퍼지, 배치와 차이가 날 수 있다는
  공통 한계 문구를 포함한다.

기존 도구 결과 하단에는 `이 STL을 한 롤로 몇 개 출력할 수 있는지 계산하기` 링크를,
새 도구 결과 하단에는 `이 STL의 상세 출력 시간과 추천 설정 확인하기` 링크를 둔다.
Phase 1 링크는 파일이나 상태를 전달하지 않는다. URL query/sessionStorage 재사용은
프라이버시, 새로고침 동작, 버전 호환성 기준을 정한 뒤 별도 단계에서 검토한다.

## SEO와 콘텐츠

새 페이지의 title은 `필라멘트 한 롤 출력 수량 계산기 | STL 반복 출력 계획`으로 하고,
H1은 `필라멘트 한 롤로 몇 개 출력할 수 있을까?`를 사용한다. 메타 설명은 STL을 로컬
분석해 한 롤 수량, 잔량, 베드 배치, 목표 생산 계획을 계산한다는 내용을 포함한다.

도구 아래에는 다음 고정 설명과 FAQ를 둔다.

- 1kg 필라멘트의 출력 수량이 모델 중량에 따라 달라지는 원리
- 빈 스풀 무게를 빼야 하는 이유
- 이론 수량과 안전 권장 수량의 차이
- 여러 개 동시 출력의 장단점과 실패 리스크
- STL 근사와 실제 슬라이서 결과의 차이
- PLA, PETG, ABS의 밀도·사용량 차이
- 업로드 파일이 서버에 저장되지 않는다는 안내
- `1kg 필라멘트는 정확히 1,000g인가요?`, `빈 스풀 무게를 모르면 어떻게 하나요?`,
  `한 번에 많이 배치하면 시간이 줄어드나요?` 등 FAQ

출시 뒤에는 위 검색 의도를 확장하는 별도 소개 글을 `contents/`에 작성하고, 글과
계산기를 상호 링크한다. 계산기 본문은 사용 완료에 필요한 짧은 설명을 유지하고,
긴 비교·사용 예시는 글로 분리한다.

## 단계별 구현 범위

### Phase 0: 공통 견적 경계 정리

- STL parser/validation/analysis와 1개 출력 견적을 순수 모듈로 추출한다.
- 기존 계산기 수치와 UI 동작의 회귀 테스트를 추가한다.
- 새 도구는 아직 노출하지 않는다.

### Phase 1: 독립 계산기 MVP

- 새 Astro 페이지와 `FilamentSpoolCalculator.astro`, 독립 상태 초기화 함수를 만든다.
- STL 업로드·로컬 Worker 분석·프린터/재료/출력 조건·1개 견적을 제공한다.
- 새 스풀(1000g, 750g, 500g, 250g, 직접 입력), 안전 여유, 이론/권장 수량, 잔량을
  계산한다.
- 목표 수량, 필요 스풀, 예상 사용 재료비, 단일 수량 기준 시간 추정을 제공한다.
- 두 계산기 사이의 상태 없는 링크와 SEO/FAQ 기본 콘텐츠를 추가한다.

### Phase 2: 현재 스풀 잔량

- 스풀 포함 총무게/빈 스풀 무게 및 순수 잔량 직접 입력을 추가한다.
- 유효성 검사, 현재 잔량 우선 사용, 추가 구매 스풀과 잔량 경고를 추가한다.

### Phase 3: 베드 배치와 권장 배치

- 바운딩 박스 0도/90도 배치, 브림·간격·가장자리 여백을 반영한다.
- 최대/권장 배치, 배치 한계, 장시간·워핑·안정성 경고를 추가한다.

### Phase 4: 생산 계획

- 권장/최대 배치별 출력 횟수와 복수 출력 보정 시간 범위를 제공한다.
- 마지막 출력 후 잔량, 추가 구매 비용, 선택적 시작 시각 기준 완료 시각을 제공한다.

### 후속 검토

- 실제 복수 모델 슬라이싱, 불규칙 형상 자동 네스팅, AMS/MMU 퍼지, 제조사별 빈 스풀
  데이터, 복수 잔여 스풀 조합, 복수 프린터 분배, 실패율, 판매가/대행 견적 연동.

## 테스트와 검증 기준

단위 테스트는 순수 함수에 다음을 포함한다.

- 1kg, 750g, 500g, 250g, 직접 입력 중량 및 정확히 나누어떨어지는 경우
- 안전 여유로 수량이 감소하는 경우, 1개도 만들 수 없는 경우, 1개당 0g 오류
- 총무게가 빈 스풀보다 작은 오류와 소수점 무게·원화 반올림
- 기본보다 90도 회전이 유리한 배치, 모델/높이가 베드보다 큰 경우, 브림·간격·여백 변화
- 목표 수량, 현재 잔량 우선 차감, 추가 구매 스풀, 마지막 배치가 불완전한 경우
- 1/2~4/5~8/9+ 동시 출력 시간 보정과 총 run 합산

통합·수동 검증은 Binary/ASCII STL, 매우 작거나 1kg보다 큰 부품, 모바일 320px 폭,
키보드 접근 가능한 스풀 방식 전환, 파일이 네트워크로 전송되지 않는지, 기존 계산기와
동시에 다른 탭에서 독립 동작하는지를 포함한다. 공통 모듈 변경 때는 기존 계산기의
업로드, 미리보기, 경로 분석, H2D 듀얼 모드, 열린 메시 결과를 다시 확인한다.

## 결정 보류와 주요 한계

아직 결정하지 않은 사항은 브림 폭의 실제 기본값(기존 UI는 브림 on/off만 제공),
ASA 등 재료 프로필 추가 시점, 시간 범위 계수의 실측 보정 데이터, 완료 시각 입력 UX,
빈 스풀 프리셋 데이터의 출처 검증 정책, 소개 글의 발행 시점이다. 이 항목들은 MVP
진행을 막지 않으며, 기본값·한계 문구·사용자 직접 입력으로 안전하게 처리한다.

이 계산기는 웹 슬라이서나 생산 확정 도구가 아니다. STL은 단위 정보를 가지지 않을 수
있고, 열린 메시 체적은 근사값이다. 서포트·브림·퍼지·모델 방향·실제 툴패스·재료 상태·
프린터 보정·실패율은 결과를 바꿀 수 있다. 특히 베드 수량은 직사각형 바운딩 박스
근사이므로 실제 슬라이서에서 최종 배치와 재료·시간을 반드시 확인해야 한다.
