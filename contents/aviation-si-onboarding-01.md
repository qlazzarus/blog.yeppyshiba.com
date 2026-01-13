---
title: 항공 SI 신입 온보딩 가이드 ① – 항공 시스템을 처음 만났을 때 무엇부터 봐야 할까
date: 2026-01-13T09:30:00+09:00
summary: 항공·UATM·SWIM 프로젝트에 처음 투입된 SI 개발자를 위한 입문 가이드.
category: aviation
tags:
    - flight
    - aviation
image: https://support.boeing.com/servlet/rtaImage?eid=ka20z000000LDzO&feoid=00N60000002h5I1&refid=0EM0z000000NLnn
---

# ✈️ 항공 SI 신입 온보딩 가이드 ①

## 항공 시스템을 처음 만났을 때 무엇부터 봐야 할까

> 이 글은 항공·UATM·SWIM 프로젝트에 처음 투입된
> **SI 개발자 / 설계자 / 시스템 엔지니어**를 위한 입문 가이드다.
>
> “왜 이렇게 복잡한가?”에 대한 답을
> **개념 → 구조 → 시스템 역할** 순서로 정리한다.

---

## 1. 항공 시스템은 왜 이렇게 복잡할까?

항공을 처음 접하면 가장 먼저 드는 생각은 보통 이거다.

> “비행 정보 하나 관리하는데
> 왜 시스템도 많고 규칙도 이렇게 많지?”

이유는 단순하다.

### ✦ 항공은 단일 조직의 문제가 아니다

항공은 다음 주체들이 **동시에 같은 하늘을 사용**한다.

- 항공사 (AOC)
- 관제기관 (ATC)
- 공항
- 국가별 항공청
- 군
- 드론/도심항공(UTM/UATM)

각 주체는 **책임 범위도, 시스템도, 목적도 다르다.**

![Image](https://www.researchgate.net/publication/331801933/figure/fig1/AS%3A736963883716608%401552717290642/stakeholders-in-the-air-transport-system.png)

![Image](https://www.cutter.com/sites/default/files/Amplify/2023/amp2305_NREL_F02.png)

👉 항공 시스템의 본질은
**“하나의 정답을 공유해야 하는 분산 시스템”**이다.

---

## 2. 항공 시스템의 큰 틀 (ATM / UTM)

### 2.1 ATM (Air Traffic Management)

- 유인 항공기(여객기, 화물기) 중심
- 국가 관제기관이 주도
- 국제 표준 기반 운영

### 2.2 UTM / UATM

- 무인기·드론·도심항공
- 기존 ATM과 **공역·정보를 공유**
- 미래 항공의 확장 영역

👉 **UAVTM, UATM 프로젝트도 결국 ATM 구조를 확장한 것**이다.

---

## 3. 비행계획(Flight Plan)은 왜 필요한가?

### 3.1 비행은 “자유 이동”이 아니다

- 하늘은 **공유 자원**
- 충돌 방지 필요
- 공역 제한 존재
- 국가 간 비행은 사전 협의 필수

그래서 등장한 것이 **비행계획(Flight Plan, FPL)** 이다.

---

## 4. 전통적인 FPL 방식 (과거의 항공 IT)

기존 항공 시스템은 **메시지 중심**이었다.

### 대표적인 메시지들

- FPL : 비행계획 제출
- CHG : 변경
- DLA : 지연
- CNL : 취소

![Image](https://wiki.flightgear.org/w/images/thumb/1/18/ICAO_2012_flight_plan_form.gif/200px-ICAO_2012_flight_plan_form.gif)

![Image](https://support.boeing.com/servlet/rtaImage?eid=ka20z000000LDzO&feoid=00N60000002h5I1&refid=0EM0z000000NLnn)

### 이 방식의 한계

- 최신 상태가 무엇인지 알기 어려움
- 메시지 순서가 꼬이면 복구 어려움
- 시스템마다 서로 다른 상태 보유

👉 이 한계가 **FF-ICE의 출발점**이다.

---

## 5. FF-ICE란 무엇인가?

ICAO가 정의한
**미래 항공 정보 관리 개념**이다.

### 핵심 질문 하나로 요약하면

> “비행을 메시지가 아니라
> **하나의 디지털 객체로 관리할 수 없을까?**”

### FF-ICE의 핵심 개념

| 개념                 | 설명                        |
| -------------------- | --------------------------- |
| Single Flight Object | 하나의 비행 = 하나의 데이터 |
| Lifecycle 관리       | 생성 → 변경 → 종료          |
| Revision             | 변경 이력 관리              |
| Trajectory           | 4차원 비행 경로             |

![Image](https://media.umbraco.io/egis/bnvhxuzk/blog-pillar-graphic-aviation.png?height=535&mode=max&width=749)

![Image](https://ifatca.wiki/wp-content/uploads/2020/05/4-300x164.jpg)

---

## 6. SFPL, eFPL, FPL2012 — 헷갈리는 용어 정리

항공 SI 신입이 가장 많이 헷갈리는 부분이다.

| 용어        | 한 줄 설명                                 |
| ----------- | ------------------------------------------ |
| **eFPL**    | 항공사가 전자적으로 제출한 비행계획        |
| **FPL2012** | ICAO가 정의한 메시지 포맷                  |
| **SFPL**    | 시스템이 내부적으로 관리하는 비행계획 객체 |

👉 **메시지는 수단**,
👉 **SFPL이 실체(State)**

---

## 7. SWIM은 “시스템”이 아니다

여기서 두 번째 큰 오해를 바로잡자.

### SWIM의 정체

- 서버 ❌
- 단일 플랫폼 ❌
- 특정 제품 ❌

👉 **항공 정보 공유를 위한 아키텍처·표준·원칙**

EUROCONTROL이 실제 구현 규격을 주도

![Image](https://www.faa.gov/sites/faa.gov/files/air_traffic/technology/swim/sfdps/sfdps-architecture.jpg)

![Image](https://reference.swim.aero/technical-infrastructure/ee0fad78-b7d9-4f34-bf14-a0f559164c82.png)

### SWIM이 제공하는 것

- 서비스 발견(Discovery)
- Publish / Subscribe
- Request / Reply
- 표준 정보 모델(AIXM, FIXM, WXXM)
- 보안·감사 체계

---

## 8. 항공 SI 회사는 무엇을 만드는가

이제 **SI 관점**에서 역할이 보인다.

### 우리가 설계하는 핵심 시스템

| 모듈           | 역할                |
| -------------- | ------------------- |
| FDP            | SFPL 생성·관리      |
| ESI / CIS      | 내부 ↔ SWIM 연계    |
| Validation     | 문법·업무 규칙 검증 |
| Transformation | 메시지 ↔ 내부 모델  |
| Monitoring     | 연계 상태 감시      |

👉 그래서 요구사항에 항상 등장하는 키워드가
**“유효성, Revision, FF-ICE 규칙, SWIM 준수”**다.
