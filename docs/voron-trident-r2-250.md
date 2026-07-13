# Voron Trident R2 250 Self Source 계획

작성일 : 2026

---

# 목표

첫 Voron 제작.

목표는 가장 저렴한 것이 아니라

- 구조를 이해한다.
- Klipper를 이해한다.
- CoreXY를 이해한다.
- CAN Toolhead를 이해한다.
- 유지보수가 쉬운 ABS 전용 머신을 만든다.

Bambu X1C와 역할을 분리한다.

| Printer       | 역할                            |
| ------------- | ------------------------------- |
| Bambu X1C     | PLA / PETG / AMS / 생활용품     |
| Voron Trident | ABS / ASA / Nylon / 연구 / 실험 |

---

# 왜 Trident인가

Voron에는

- V0
- Trident
- V2.4
- Switchwire

등이 존재한다.

첫 Voron이라면 Trident를 추천하는 의견이 많다.

이유

- 구조가 단순하다.
- 유지보수가 쉽다.
- 출력 품질은 V2.4와 거의 동일하다.
- Quad Gantry Leveling이 필요 없다.
- Z축이 Leadscrew라 구조를 이해하기 쉽다.

---

# 왜 250mm 인가

이번 프로젝트의 목적은

대형 출력이 아니다.

목표는

- ABS 출력
- Voron 부품 출력
- RC 부품
- 자동차 브라켓
- 전자 케이스
- 연구용 출력

250mm 장점

- 예열이 빠르다.
- ABS 챔버가 빨리 올라간다.
- 프레임 강성이 가장 높다.
- 벨트가 짧다.
- 튜닝이 쉽다.
- 첫 조립 난이도가 가장 낮다.

향후 정말 큰 출력이 필요하면

Bambu X1C 또는 차후 대형 Voron을 제작한다.

---

# 기본 사양

Model

Voron Trident R2

Build Volume

250

Hotend

Stealthburner

Extruder

Clockwork2

Probe

Eddy

Controller

Klipper

Toolhead

CANBUS

---

# 현재 보유 부품

## Toolhead

- [x] Stealthburner
- [x] Clockwork2
- [x] EBB36
- [x] Eddy Probe

## Electronics

- [x] TMC2209

## Motion

- [x] GT2 Belt 일부
- [x] Pulley 일부
- [x] Bearing 일부
- [x] Fastener Kit 일부

## 기타

- [x] Bambu X1C (ABS 출력 가능)

---

# 구매 예정 BOM

## Frame

- [ ] 2020 Aluminum Frame Kit (250)

권장

- Misumi
- Blurolls
- Fysetc

---

## Linear Rail

추천

MGN9H

MGN12H

가능하면

- HIWIN
- LDO

---

## Bed

250x250

Cast Aluminum

8mm

MIC6 권장

---

## Heater

Silicone Heater

24V 또는 AC

권장

Keenovo

추가

- SSR
- Thermal Fuse

---

## Build Plate

- Magnetic Sheet
- PEI Sheet

---

## Motion

확인 필요

- GT2 Belt
- Idler
- Pulley

기존 재고 최대 활용

---

## Leadscrew

Z축

3EA

Integrated Stepper

---

## Stepper Motor

필요

XY

2EA

Z

3EA

Extruder

1EA

보유 수량 확인

---

## Mainboard

후보

- BIGTREETECH Manta M8P
- Octopus Pro

추천

Manta M8P

이유

- CB2 가능
- CM4 가능
- Raspberry Pi 불필요

---

## Driver

TMC2209

이미 보유

---

## PSU

Meanwell

24V

350W 이상

---

## Fans

필요

- Hotend
- Part Cooling
- Electronics
- Exhaust

선택

Nevermore Filter

---

## Panels

- Polycarbonate
- ACM

---

## Wiring

- Silicone Wire
- JST-XH
- JST-PH
- Ferrule
- Heat Shrink
- Cable Sleeve

---

## Misc

- IEC Socket
- Fuse
- Power Switch
- Ground Cable
- Cable Chain

---

# 추후 업그레이드 예정

조립 완료 후

순차적으로 진행

## Stage 1

Stock R2

100%

순정 상태 완성

---

## Stage 2

Klipper Tune

- Input Shaper
- Pressure Advance

---

## Stage 3

CANBUS

EBB36

---

## Stage 4

Eddy Probe

Mesh

Auto Calibration

---

## Stage 5

Nevermore

ABS 전용

---

## Stage 6

Chamber Sensor

---

## Stage 7

LED

Status

---

## Stage 8

Camera

Obico

Timelapse

---

## Stage 9

Custom Mod

- Nozzle Camera
- Toolhead 개선
- CAN 실험

---

# 출력 예정 파츠

ABS

Primary

약 1.4kg

Accent

약 0.3kg

여유 포함

ABS 2kg 준비

---

# 조립 순서

1. ABS 파츠 출력

2. Frame

3. Linear Rail

4. Motion

5. Bed

6. Z Axis

7. Electronics

8. Wiring

9. Toolhead

10. Klipper

11. Calibration

12. Test Print

---

# 프로젝트 목표

이 프로젝트는

3D 프린터를 하나 더 만드는 것이 목적이 아니다.

목표는

- CoreXY 구조 이해
- Klipper 이해
- CANBUS 이해
- Voron 생태계 이해
- 향후 Toolhead 개발 기반 마련

장기적으로

Voron을 기반으로

- Toolhead 연구
- Automatic Tool Changer
- 고온 소재 출력
- 자체 프린터 개발

까지 연결하는 것을 목표로 한다.
