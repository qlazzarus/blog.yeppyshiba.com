---
title: SWIM은 왜 쓰는 걸까? — 항공 시스템이 ‘연결’되는 진짜 이유
date: 2026-04-16T14:00:00+09:00
category: aviation
summary: SWIM(SYSTEM WIDE INFORMATION MANAGEMENT)이 왜 필요한지, EUROCONTROL과 ICAO 기준으로 실제 항공 시스템에서 어떻게 쓰이는지 쉽게 풀어봅니다.
image: /images/posts/202604/why-swim.png
tags:
    - swim
    - aviation
    - eurocontrol
    - icao
    - system-integration
    - api
    - middleware
    - air-traffic
---

## SWIM은 왜 쓰는 걸까?

이전 글에서 나는 항공 SI 프로젝트에 처음 들어오면서  
“SWIM이라는 걸 계속 듣는데 정확히 뭔지 모르겠다”는 상태였다.

👉 (이전 글 참고)
[항공 SI 온보딩 이야기 1편](/article/aviation-si-onboarding-01/)

---

## 문제는 ‘연결’이었다

항공 시스템은 생각보다 단순하지 않다.

- 관제 시스템 (ATC)
- 비행계획 시스템 (FDP)
- 공항 시스템 (AODB)
- 항공사 시스템
- 기상 시스템

👉 이 모든 시스템이 **각자 따로 존재한다**

문제는 여기서 발생한다.

> ❗ 서로 데이터 형식도 다르고  
> ❗ 통신 방식도 다르고  
> ❗ 연결 방식도 제각각이다

---

## SWIM 없이 연결하면 어떻게 될까?

![기존 인터페이스 구조 (N:N 연결)](/images/posts/202604/swim-chaos.png)

예전 방식은 단순했다.

- 시스템 A → 시스템 B 직접 연결
- 시스템 B → 시스템 C 또 직접 연결

결과는?

👉 **지옥의 인터페이스 구조**

- N:N 연결 구조
- 유지보수 난이도 폭발
- 장애 발생 시 원인 추적 어려움

---

## 그래서 등장한 게 SWIM이다

![SWIM 구조 개념도 (중앙 허브 구조)](/images/posts/202604/swim-interface.png)

SWIM(System Wide Information Management)은  
한마디로 정리하면 이거다.

> “항공 시스템 간 데이터를 표준 방식으로 공유하는 플랫폼”

조금 더 쉽게 말하면:

👉 **항공판 API + 메시지 플랫폼**

---

## SWIM의 핵심 개념 3가지

### 1. 표준화 (Standardization)

- 데이터 형식 통일 (XML / JSON)
- 인터페이스 정의 (Service)

👉 “이 데이터는 이렇게 생겼다”를 모두가 공유

---

### 2. 서비스화 (Service-Oriented)

기존:

- 시스템 간 직접 연결

SWIM:

- 서비스 등록 → 필요한 시스템이 호출

👉 REST API / MQ 기반 구조

---

### 3. 느슨한 결합 (Loose Coupling)

이게 핵심이다.

- 시스템 A는 B를 몰라도 된다
- 그냥 “서비스”만 알면 된다

👉 변경 영향 최소화

---

## EUROCONTROL 기준으로 보면

유럽 SWIM 구조는 더 명확하다.

- REG (Registry) → 서비스 등록/조회
- IE (Information Exchange) → 데이터 전달
- ESI → 외부 시스템 연결

👉 즉,

- REG = API 문서 + 서비스 카탈로그
- IE = 메시지 브로커 (RabbitMQ 느낌)

---

## 그럼 결국 뭐가 좋아지는가?

정리하면 이거다.

### ✔ 개발자 입장

- 인터페이스 명확
- 재사용 가능
- 유지보수 쉬움

### ✔ 운영 입장

- 장애 추적 가능
- 모니터링 용이
- 확장성 확보

### ✔ 조직 입장

- 표준 기반 협업 가능
- 외부 기관 연동 쉬움

---

## 그런데 여기서 중요한 포인트

SWIM은 단순 기술이 아니다.

👉 **“조직 간 데이터 공유 방식” 자체를 바꾸는 개념이다**

그래서 도입이 어려운 거다.
