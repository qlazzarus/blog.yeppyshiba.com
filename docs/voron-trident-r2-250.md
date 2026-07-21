# Voron Trident R2 250 Self Source Master Guide

> 장기간 유지보수가 가능한 ABS 전용 생산 머신을 위한 Self Source 설계·조립·운영 문서

작성일: 2026
상태: 부품 수집 및 설계 단계

---

## 1. 프로젝트 목표

이 프로젝트는 단순히 3D 프린터 한 대를 추가하는 일이 아니다. 목표는 **반복 가능한 품질로 ABS 계열 기능성 부품을 생산하고, 장기간 직접 유지보수할 수 있는 오픈 플랫폼을 구축하는 것**이다.

우선순위는 다음과 같다.

1. 신뢰성 있는 ABS/ASA 출력
2. 정비와 부품 교체가 쉬운 구조
3. 동일 조건에서 동일한 결과를 만드는 운용 절차
4. CoreXY, Klipper, CANBUS 구조의 이해와 운용 경험 축적

---

## 2. 운영 철학

- 최고 속도를 목표로 하지 않는다.
- 신뢰성을 목표로 한다.
- 유지보수가 쉬워야 한다.
- 동일한 출력 결과를 만드는 것이 목적이다.
- ABS 생산 장비로 운용한다.

따라서 검증되지 않은 변경을 한 번에 여러 개 적용하지 않는다. 기계 조립, 기본 Klipper 운용, CAN, Eddy, 챔버 제어 순으로 단계를 분리하고, 각 단계에서 기준 출력물을 남긴다. 고장 시에는 최근에 바꾼 부품·설정부터 되돌릴 수 있어야 한다.

---

## 3. Printer 역할 분리

Voron Trident는 Bambu X1C와 속도나 편의성으로 경쟁하지 않는다. 소재와 작업 성격을 분리해 두 장비의 강점을 유지한다.

| Printer | 주 역할 | 우선 가치 |
| --- | --- | --- |
| Bambu X1C | PLA, PETG, AMS, 생활용품 | 빠른 준비와 일상 출력 |
| Voron Trident | ABS, ASA, Nylon, 기능성 출력, 연구용 출력 | 고온 소재 안정성, 정비성, 설정 통제 |

X1C는 빠르게 필요한 물건을 출력하는 장비로 유지한다. Trident는 예열·챔버 안정화·메시 생성까지 포함한 표준 절차를 지키는 생산 장비로 운용한다.

---

## 4. Trident 선택 이유

Voron에는 V0, Trident, V2.4, Switchwire 등 여러 구조가 있다. 첫 Self Source Voron으로 Trident를 선택하는 이유는 다음과 같다.

- Z축이 리드스크루 기반이라 구조와 고장 지점을 이해하기 쉽다.
- V2.4의 Quad Gantry Leveling보다 초기 조립·정비 절차가 단순하다.
- CoreXY 운동계와 밀폐 챔버를 갖추어 ABS 출력에 적합하다.
- 출력 품질을 확보하는 데 필요한 기능을 갖추면서도 유지보수 접근성이 좋다.
- 표준화된 Voron 생태계와 MOD 자료가 충분하다.

---

## 5. 250 선택 이유

이 프로젝트의 목적은 대형 출력이 아니다. 주 대상은 Voron 부품, RC 부품, 자동차 브래킷, 전자 케이스, 연구용 기능성 출력이다.

250 규격은 다음 장점 때문에 선택한다.

- 작은 챔버 체적으로 예열과 Heat Soak 시간이 짧다.
- ABS 운용 온도에 챔버가 더 빠르게 도달한다.
- 프레임과 운동계의 강성이 유리하다.
- 벨트가 짧아 튜닝과 장력 관리가 쉽다.
- 첫 조립에서 정렬 오차와 배선 난이도를 줄일 수 있다.

대형 출력이 정말 필요해질 때만 별도 대형 장비를 검토한다. 현재 장비의 역할을 크기 확장으로 흐리지 않는다.

---

## 6. 기본 사양

| 항목 | 기준 사양 | 선택 이유 / 비고 |
| --- | --- | --- |
| Model | Voron Trident R2 | 정비성과 CoreXY 구조의 균형 |
| Build volume | 250 × 250 × 250 mm | ABS 챔버 운용에 유리한 크기 |
| Motion | CoreXY + 3점 리드스크루 Z | 구조 이해와 유지보수 용이성 |
| Toolhead | Stealthburner | Voron 표준 생태계와 호환 |
| Extruder | Clockwork2 | Stealthburner 조합의 검증된 구성 |
| Hotend | Bambu Complete Hotend 기반 | 빠른 모듈 교체 및 X1C 예비품 공유 |
| Probe | Eddy | 열 안정화 후 빠른 메시 생성 |
| Controller | Klipper | 설정·매크로·측정 절차 제어 |
| Toolhead connection | Umbilical CANBUS | 반복 굴곡 배선 최소화와 정비성 |

### Hotend 운영 기준

Bambu **Complete Hotend**를 기본으로 사용한다. Heater, Thermistor, Nozzle이 일체형이므로 이상 발생 시 원인 분리보다 Complete Hotend 모듈 교체를 우선할 수 있다. 이는 다음 장점으로 이어진다.

- 예비 Complete Hotend로 교체 시간이 짧다.
- Heater, Thermistor, Nozzle 결선·조립 오류를 줄인다.
- X1C와 소모품 및 예비품을 공유할 수 있다.
- 생산 장비의 다운타임을 줄인다.

기본 규격은 X1C 계열을 기준으로 문서화한다. 향후 H2D 계열 Complete Hotend가 충분한 사용 사례와 부품 수급 안정성을 확보하면, 마운트와 전기 사양을 검토한 뒤 별도 변경 이력으로 전환할 수 있다. 검증 전 혼용하지 않는다.

---

## 7. 현재 보유 부품

보유 수량과 규격은 조립 전 실물 기준으로 다시 확인한다. `일부`로 표시된 항목은 BOM 확정 수량에 포함하지 않는다.

| 분류 | 보유 항목 | 상태 | 확인 사항 |
| --- | --- | --- | --- |
| Toolhead | Stealthburner | 보유 | 출력 파츠 상태 및 조립 부품 확인 |
| Toolhead | Clockwork2 | 보유 | 기어·베어링·모터 규격 확인 |
| Toolhead electronics | EBB36 | 보유 | CAN 트랜시버 및 커넥터 확인 |
| Probe | Eddy Probe | 보유 | Klipper 지원 방식 및 마운트 확인 |
| Electronics | TMC2209 | 보유 | 필요한 채널 수와 냉각 조건 확인 |
| Motion | GT2 Belt | 일부 보유 | 길이·폭·상태 확인 |
| Motion | Pulley | 일부 보유 | 톱니 수·보어·플랜지 확인 |
| Motion | Bearing | 일부 보유 | 규격·회전 상태 확인 |
| Hardware | Fastener Kit | 일부 보유 | Voron BOM 대비 수량 확인 |
| Reference printer | Bambu X1C | 보유 | ABS 출력용 Voron 파츠 및 예비품 공유 |

---

## 8. Self Source BOM

`Status`는 구매 체크리스트다. `보유`는 실물 수량과 규격을 다시 확인한 뒤에만 유지하고, 그 외 항목은 구매 전 `확정`으로 변경한다.

| Item | 필요 여부 | Status | Recommended | Note |
| --- | --- | --- | --- | --- |
| Frame | 필수 | [ ] 구매 | Misumi, Blurolls, Fysetc 2020 Frame Kit (250) | 절단 정밀도와 탭 상태 확인 |
| Motion | 필수 | [ ] 확인 | GT2 belt, idler, pulley | 기존 재고를 규격별로 대조 |
| Linear Rail | 필수 | [ ] 구매 | HIWIN 또는 LDO, MGN9H/MGN12H | 축별 공식 BOM 규격으로 확정 |
| Lead Screw | 필수 | [ ] 구매 | Z integrated stepper ×3 | 리드와 너트 규격 통일 |
| Stepper | 필수 | [ ] 확인 | XY ×2, Z ×3, Extruder ×1 | 토크·축 길이·커넥터 확인 |
| Mainboard | 필수 | [ ] 구매 | BTT Manta M8P | CB2/CM4 사용 가능, 별도 Pi 최소화 |
| Driver | 필수 | [x] 보유 | TMC2209 | 수량·정품 여부·방열 확인 |
| Power Supply | 필수 | [ ] 구매 | Mean Well 24 V, 350 W 이상 | 여유 용량 및 접지 확인 |
| Bed | 필수 | [ ] 구매 | 250 mm cast aluminum, 8 mm, MIC6 권장 | 평탄도와 장착 규격 확인 |
| Bed Heater | 필수 | [ ] 구매 | Keenovo silicone heater | 24 V 또는 AC를 설계 단계에서 확정 |
| PEI | 필수 | [ ] 구매 | spring-steel PEI sheet | ABS용 표면 관리 기준 기록 |
| Magnetic Sheet | 필수 | [ ] 구매 | 고온 대응 자석 시트 | 베드 온도 등급 확인 |
| Panels | 필수 | [ ] 구매 | Polycarbonate 또는 ACM | 챔버 밀폐성과 정비 접근성 고려 |
| Hotend | 필수 | [ ] 구매 | Bambu X1C Complete Hotend | Hardened nozzle 중심으로 예비품 공유 |
| Extruder | 필수 | [x] 보유 | Clockwork2 | 조립·기어 상태 확인 |
| Probe | 필수 | [x] 보유 | Eddy Probe | Heat Soak 뒤 메시 생성 |
| CAN | 필수 | [x] 일부 보유 | EBB36 + CAN interface | 종단 저항·전원·커넥터 확인 |
| Fans | 필수 | [ ] 구매 | hotend, part cooling, electronics, exhaust | 고온 챔버 적합 규격 선택 |
| Wiring | 필수 | [ ] 구매 | silicone wire, JST-XH/PH, ferrule, heat shrink | 전류별 AWG·라벨링 적용 |
| Fastener | 필수 | [ ] 확인 | Voron-compatible kit | 기존 키트 수량 대조 |
| Electronics | 필수 | [ ] 구매 | DIN rail, terminals, ferrules, covers | 정비성과 안전을 위한 배치 |
| Cable Chain | 선택 | [ ] 보류 | 필요한 축에만 적용 | Umbilical과 동시 적용하지 않음 |
| IEC | 필수 | [ ] 구매 | fused IEC inlet + switch | 정격·접지 단자 확인 |
| Fuse | 필수 | [ ] 구매 | 입력 정격에 맞는 fuse | 원인 확인 전 반복 교체 금지 |
| Ground | 필수 | [ ] 구매 | green/yellow ground wire | 프레임·베드·패널 접지 계획 |
| SSR | 조건부 필수 | [ ] 구매 | AC bed 사용 시 정격 SSR | 방열판 및 배선 규격 포함 |
| Thermal Fuse | 필수 | [ ] 구매 | bed heater 안전 차단용 | 히터와 열적으로 밀착 배치 |
| Nevermore | 필수 | [ ] 구매 | Nevermore filter + carbon | ABS 냄새/VOC 관리 및 챔버 순환 |
| Camera | 선택 | [ ] 보류 | Obico-compatible camera | 원격 모니터링·타임랩스 |
| LED | 추천 | [ ] 구매 | chamber LED, status LED | 작업 조명과 상태 표시 분리 |
| Chamber Sensor | 필수 | [ ] 구매 | Klipper-compatible thermistor | 출력 시작 온도 조건에 사용 |
| Umbilical | 필수 | [ ] 구매 | CAN umbilical cable + strain relief | 반복 굴곡 구간 보호 |
| Nozzle Brush | 추천 | [ ] 구매 | heat-resistant nozzle brush | 퍼지 전 노즐 외부 청소 |
| Purge Bucket | 필수 | [ ] 제작 | removable purge bucket | 퍼지물 회수와 정비 편의 |

### 전기 안전 기준

AC 베드 히터를 선택할 경우 SSR, Thermal Fuse, 접지, 적정 규격의 퓨즈와 배선을 하나의 안전 설계로 취급한다. 전원 인가 전에는 배선도·압착 상태·접지 연속성·히터 제어를 각각 점검한다. 전기 부품의 정격이나 설치 방법은 제조사 자료와 해당 지역 전기 안전 기준을 우선한다.

---

## 9. 추천 MOD

MOD는 성능 경쟁용이 아니라 ABS 생산성과 정비성을 높이는 범위에서만 적용한다.

### 필수

- **Nevermore**: 챔버 내부 공기 순환과 활성탄 여과. ABS 운용의 기본 MOD로 적용한다.
- **Chamber Thermistor**: 챔버 온도를 측정하고 Klipper Macro의 출력 시작 조건으로 사용한다.
- **Bambu Complete Hotend Mount**: X1C 규격 Complete Hotend를 반복 가능하게 장착한다.
- **Umbilical CAN**: Toolhead 배선을 단순화하고 반복 굴곡 구간의 고장 가능성을 줄인다.
- **Purge Bucket**: 노즐 예열·퍼지 과정의 폐기물을 일정 위치에 수거한다.

### 추천

- **DIN Rail Electronics**: 전원·제어 부품을 분리하고 점검·교체를 쉽게 한다.
- **Magnetic Panel**: 전자부 접근 시간을 줄인다.
- **Chamber LED**: 노즐·첫 레이어·챔버 상태를 확인한다.
- **Status LED**: 예열, 출력, 오류 상태를 멀리서 구분한다.
- **Cable Management**: 전원·신호·CAN 경로를 분리하고 라벨링한다.
- **Wire Strain Relief**: 패널, Toolhead, 히터 배선의 당김을 방지한다.

### 선택

- **Obico**: 원격 모니터링과 실패 감지 보조.
- **Nozzle Camera**: 첫 레이어 또는 노즐 상태 확인용.
- **Filament Sensor**: 긴 출력의 재료 소진 감지용.
- **Chamber Heater**: 베드 예열만으로 목표 챔버 온도에 안정적으로 도달하지 못할 때만 검토.

---

## 10. ABS 운영 방식

ABS는 재료·기계·열 환경을 함께 관리해야 한다. Cold Start 상태에서 바로 출력하지 않으며, 준비 절차를 고정한다.

1. 필라멘트 건조 상태, 빌드 플레이트, 노즐 외부를 확인한다.
2. 베드를 재료 프로파일 온도로 가열한다.
3. 챔버 온도가 기준에 도달할 때까지 대기하고 Heat Soak을 수행한다.
4. Gantry Calibration 후 Eddy Mesh를 생성한다.
5. 퍼지와 첫 레이어를 확인한 뒤 출력한다.
6. 출력 완료 후 챔버를 급격히 열지 않고, 큰 ABS 부품은 천천히 냉각한다.

온도·필라멘트·시트 표면·슬라이서 프로파일·실제 챔버 온도를 출력 기록에 남긴다. 재현성 문제는 설정 변경보다 이 기록 비교로 먼저 진단한다.

---

## 11. Heat Soak

ABS는 Cold Start로 출력하지 않는다. 베드가 설정 온도에 도달한 직후에도 프레임, 레일, 베드, 챔버 공기는 아직 열평형 상태가 아니다. 충분한 Heat Soak은 뒤틀림과 첫 레이어 변동을 줄이고, 메시 기준을 실제 출력 환경에 맞춘다.

권장 순서:

```text
Bed Heating
    ↓
Chamber 55–60 °C
    ↓
Heat Soak 20–30분
    ↓
Gantry Calibration
    ↓
Mesh
    ↓
Print
```

55–60 °C와 20–30분은 이 장비의 시작 기준이다. 실제 도달 온도와 안정화 시간은 계절, 패널 밀폐성, 베드 히터, 부품 내열 한계를 확인해 조정한다. 이 절차는 최종적으로 Klipper Macro로 자동화한다.

---

## 12. Chamber 관리

### Chamber Sensor

챔버 센서는 단순 표시용이 아니다. Klipper Macro와 연동하여 챔버 온도가 기준에 도달한 뒤에만 출력 준비 단계를 진행하도록 한다. 센서 위치는 베드 복사열이나 Nevermore 토출풍을 직접 받지 않으면서 실제 챔버 공기를 대표하는 곳으로 정한다.

### Eddy Mesh

Eddy는 ABS 출력 시 Heat Soak 이후에 Mesh를 다시 생성한다. 베드, 프레임, 레일, Toolhead가 가열되며 열팽창하고, Cold 상태에서 만든 메시와 실제 출력 온도에서의 Z 기준이 달라질 수 있기 때문이다. 따라서 ABS용 Macro는 `Gantry Calibration → Eddy Mesh → Print` 순서를 고정한다.

### Nevermore

Nevermore는 필수 MOD다. 활성탄 여과와 챔버 공기 순환을 통해 ABS 출력 환경을 관리한다. 필터 성능은 영구적이지 않으므로 카본 교체일과 사용 시간을 기록한다. 여과 장치는 환기를 대체하지 않으며, 실내 공기 관리도 함께 고려한다.

---

## 13. Klipper 운영

Klipper 설정은 장비의 운영 매뉴얼이다. 변경 전에는 동작하는 `printer.cfg`와 매크로 설정을 버전 관리하고, 한 번에 하나의 변수만 바꾼다.

- **Input Shaper**: 기계 조립 완료 후 공진을 측정하고 설정한다.
- **Pressure Advance**: 사용하는 필라멘트와 노즐 기준으로 보정한다.
- **Gantry Calibration**: Heat Soak 뒤, 메시 생성 전에 실행한다.
- **Eddy Mesh**: ABS 출력 온도에서 매 출력 또는 검증된 주기로 생성한다.
- **Start Macro**: 베드 예열, 챔버 기준 온도 대기, Heat Soak, 보정, 메시, 퍼지를 순서대로 실행하도록 발전시킨다.
- **Safety Macro**: 히터 이상, 센서 이상, CAN 통신 오류 시 출력 중단과 상태 표시를 정의한다.

---

## 14. 조립 순서

각 단계가 끝날 때 사진, 측정값, 남은 이슈를 기록한다. 배선은 조립 말미에 몰아서 처리하지 않고, 각 부품 설치 시 경로와 정비성을 함께 확인한다.

1. ABS 출력 파츠 준비 — Primary 약 1.4 kg, Accent 약 0.3 kg, 여유를 포함해 ABS 2 kg 준비
2. Frame 조립 및 대각·수직 정렬
3. Linear Rail 세척·장착 및 이동 저항 확인
4. CoreXY Motion 조립, 벨트 경로·장력 확인
5. Bed와 히터 장착, 접지·온도 안전 부품 설치
6. Z Axis와 리드스크루 정렬
7. Electronics와 DIN Rail 배치, 전원·신호 경로 분리
8. Wiring, 퓨즈, 접지, 스트레인 릴리프 점검
9. Toolhead, Bambu Complete Hotend Mount, Umbilical CAN 설치
10. Klipper 기본 설정 및 축별 단독 동작 점검
11. 안전 점검 후 온도·모션·CAN·팬 기능 검증
12. Calibration, ABS Heat Soak 절차, 테스트 출력

---

## 15. Stage Upgrade

각 Stage는 전 단계가 안정적으로 동작하고 기준 출력물이 확보된 뒤 진행한다.

```text
Stage 1  Stock
    ↓
Stage 2  Klipper
    ↓
Stage 3  CAN
    ↓
Stage 4  Eddy
    ↓
Stage 5  Nevermore
    ↓
Stage 6  Heat Soak
    ↓
Stage 7  Chamber Sensor
    ↓
Stage 8  Camera
    ↓
Stage 9  Status LED
    ↓
Stage 10 Optional MOD
```

| Stage | 완료 기준 |
| --- | --- |
| 1. Stock | 기계 조립, 전기 안전 점검, 기본 모션 완료 |
| 2. Klipper | Input Shaper와 Pressure Advance 기준값 기록 |
| 3. CAN | 안정적인 Toolhead 통신과 스트레인 릴리프 검증 |
| 4. Eddy | 열 안정화 후 반복 가능한 메시 생성 |
| 5. Nevermore | 순환·여과 동작과 카본 교체 기준 기록 |
| 6. Heat Soak | ABS 예열 시간과 챔버 온도 기준 확정 |
| 7. Chamber Sensor | 온도 조건을 사용하는 Start Macro 동작 |
| 8. Camera | Obico 원격 모니터링 및 Timelapse 확인 |
| 9. Status LED | 운전 상태를 외부에서 식별 가능 |
| 10. Optional MOD | 필요성과 되돌리기 절차가 문서화된 MOD만 적용 |

---

## 16. 유지보수 계획

| 주기 | 작업 | 기록할 내용 |
| --- | --- | --- |
| 매 출력 전 | 노즐, 빌드 플레이트, 필라멘트, 팬 이상음 확인 | 이상 유무와 조치 |
| 매월 | Belt Check, Rail Cleaning, Fan Cleaning | 벨트 상태·레일 오염·팬 소음 |
| 6개월 | Rail Grease, Belt Inspection | 윤활 상태·벨트 마모·풀리 고정 |
| 1년 | Fan 상태, Hotend, Chamber Seal 점검 | 팬 교체 필요성·Hotend 상태·패널/가스켓 밀폐 |
| 필요 시 | Eddy 기준점 및 Z offset 재검증 | 변경 원인과 재보정 값 |

정비 후에는 최소한 축 이동, 히터, 팬, CAN 통신, 첫 레이어를 확인한다. 부품을 교체했다면 변경 날짜·부품 모델·증상을 함께 기록한다.

---

## 17. 예비부품

장기 운영에서는 고장 후 구매하지 않고, 다운타임을 줄일 수 있는 소모품을 미리 확보한다.

| 품목 | 권장 재고 | 비고 |
| --- | --- | --- |
| Complete Hotend / Hotend | 1개 이상 | X1C 규격 기준, 즉시 교체용 |
| 0.4 Hardened Nozzle | 2개 | 표준 ABS 출력용 |
| 0.6 Hardened Nozzle | 2개 | 강도·생산성 우선 출력용 |
| Sock | 2개 이상 | 오염 또는 열화 시 교체 |
| Heater | 1개 | Complete Hotend 전환 전/개별 구성 시 대비 |
| Thermistor | 1개 | 센서 이상 진단 및 교체용 |
| Fans | 각 규격 1개 | hotend, part cooling, electronics 우선 |
| Belt | 필요한 길이 이상 | 마모·손상 시 동일 규격 교체 |
| Bearing | 주요 규격 소량 | idler 또는 extruder 정비용 |
| Idler | 1세트 | 소음·회전 저항 발생 시 교체 |
| Pulley | 1개 이상 | 고정 나사 손상 또는 축 변경 대비 |
| Nozzle Wiper | 1세트 | 오염 시 즉시 교체 |
| PTFE | 여유 길이 | 필라멘트 경로 정비용 |
| Fuse | 정격별 소량 | 동일 정격만 사용, 원인 해결 후 교체 |

---

## 18. 프로젝트 목표

장기적으로 이 장비를 통해 다음 기반을 확보한다.

- ABS 기능성 부품 생산
- 유지보수가 쉬운 오픈 플랫폼 구축
- CoreXY 구조 완전 이해
- Klipper 운용 경험 확보
- CANBUS 운용 경험 확보
- 향후 자체 장비 개발 기반 확보

이 문서는 조립 완료 후에도 유지한다. 부품 변경, Klipper 설정 변경, ABS 프로파일, 고장과 조치 이력을 누적하여 미래의 내가 선택 이유와 장비 상태를 다시 파악할 수 있게 한다.
