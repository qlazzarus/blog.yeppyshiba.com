---
title: 'AMD BC-250으로 로컬 AI 서버 만들기 — PS5 APU 재활용 프로젝트'
date: 2026-10-15
summary: '채굴용 AMD BC-250을 구매했다. PS5와 기술적 계보를 공유하는 APU와 16GB GDDR6 공유 메모리로 Fedora·Vulkan 기반 로컬 LLM 서버를 만들고, 이미지 생성과 Orange Pi 홈랩 연동까지 시도할 계획이다.'
category: coding
image: /images/posts/202610/bc250-project-main.jpg
tags:
    - BC-250
    - 홈서버
    - 홈랩
    - 로컬LLM
    - Ollama
    - Vulkan
    - 셀프호스팅
---

암호화폐 채굴에 사용되던 **AMD BC-250** 보드를 구매했다. 목표는 이 보드를 **Fedora Linux와 Vulkan 기반 로컬 AI 서버**로 재활용하는 것이다. 우선 부팅과 발열부터 확인하고, 이후 Ollama와 llama.cpp를 구동해 개인 개발 프로젝트와 홈랩에 연결할 계획이다.

BC-250을 선택한 이유는 독특한 하드웨어 구성이다. PlayStation 5(PS5)와 기술적 계보를 공유하는 AMD APU, 그리고 **16GB GDDR6 공유 메모리**를 활용할 수 있기 때문이다. 물론 게임 콘솔용 PS5 칩과 완전히 동일한 제품은 아니며, 일반 PC처럼 바로 사용할 수 있는 보드도 아니다.

## AMD BC-250은 어떤 하드웨어인가?

![PS5 APU와 AMD BC-250의 기술적 관계를 나타낸 개념 이미지](/images/posts/202610/bc250-apu-architecture.jpg)

BC-250은 채굴 장비에 사용된 컴퓨팅 보드로, **Cyan Skillfish**라는 이름의 AMD 세미커스텀 APU를 탑재한다. PS5 계열의 설계와 관련이 있지만 CPU 코어 수, GPU 구성, 펌웨어와 활용 목적이 다르다.

| 항목          | AMD BC-250 사양·특징                                |
| ------------- | --------------------------------------------------- |
| CPU           | AMD Zen 2, 6코어 12스레드                           |
| GPU           | AMD GFX1013, 기본 활성화 24 CU                      |
| 메모리        | 16GB GDDR6                                          |
| 메모리 구조   | CPU·GPU 공유 메모리                                 |
| 메모리 대역폭 | 약 448GB/s(이론치)                                  |
| 운영체제      | 커뮤니티에서 Fedora, Ubuntu 등 Linux 사용 사례 공개 |
| GPU 가속      | Mesa RADV 기반 Vulkan 사용 사례                     |

일반 데스크톱은 CPU용 시스템 메모리와 GPU용 VRAM이 분리된 경우가 많다. 반면 BC-250은 CPU와 GPU가 GDDR6 메모리를 공유한다. 이 구조가 GPU를 이용한 로컬 LLM 추론을 실험하기에 흥미로운 지점이다.

하지만 **16GB가 전부 모델 적재에 쓰이는 것은 아니다.** 운영체제 점유량, GPU의 메모리 접근 설정(GTT/TTM), 모델 크기, 컨텍스트 길이 등이 실제 사용 가능 범위를 좌우한다. 이론적인 메모리 대역폭도 그대로 LLM 처리 속도를 의미하지는 않는다.

또한 PS5와의 유사성을 곧바로 동일한 GPU 아키텍처·성능으로 해석해서는 안 된다. BC-250은 커뮤니티에서 `gfx1013`으로 식별되며, 일반적인 AMD 그래픽카드용 AI 설치 가이드가 그대로 동작하지 않을 수 있다.

참고: [AMD BC250 커뮤니티 문서](https://elektricM.github.io/amd-bc250-docs/) · [문서 GitHub 저장소](https://github.com/elektricM/amd-bc250-docs)

## BC-250으로 로컬 LLM을 실행할 수 있을까?

![BC-250과 Ollama, llama.cpp, Vulkan을 이용한 로컬 AI 서버 활용 개념도](/images/posts/202610/bc250-local-llm-server.jpg)
_AI 생성 활용 이미지. 화면에 보이는 실행 결과는 필자의 실측 결과가 아니다._

결론부터 말하면 **커뮤니티에서 이미 실행 사례가 공개되어 있다.** 특히 [akandr/bc250](https://github.com/akandr/bc250)은 Fedora, Mesa RADV, Vulkan 기반으로 Ollama와 llama.cpp를 활용하는 과정을 상세히 설명한다. 모델 테스트뿐 아니라 GPU 메모리 접근 설정과 발열·전력 관리까지 다루는 점이 유용하다.

또 다른 참고 자료인 [wdonega/bc250-llm-setup](https://github.com/wdonega/bc250-llm-setup)은 Ubuntu 환경에서 llama.cpp와 Vulkan을 구성하는 절차를 제공한다. [thelamer/bc250-ollama-openwebui](https://github.com/thelamer/bc250-ollama-openwebui)에서는 Ollama와 웹 인터페이스 구성 사례를 확인할 수 있다.

내가 먼저 확인할 순서는 다음과 같다.

1. Fedora Linux 설치 및 정상 부팅 확인
2. GPU가 Mesa RADV/Vulkan 장치로 인식되는지 확인
3. Ollama 또는 llama.cpp로 소형 양자화 모델 구동
4. 메모리 사용량, 응답 속도(tokens/s), 온도와 소비전력 측정
5. LAN 내부에서 호출 가능한 AI API 구성
6. 안전한 원격 접근 방법 검토

**ROCm 지원 여부와 Vulkan 지원 여부는 구분해야 한다.** 현재 참고하는 BC-250 커뮤니티 가이드에서는 Vulkan을 주요 경로로 다루고 있으며, 일부 커널 패치 기반 ROCm 실험도 별도로 존재한다. 첫 구축에서는 검증 사례가 상대적으로 많은 Vulkan 경로를 우선할 생각이다.

> **검증 기준:** GPU 가속이 실제로 사용 중인지 로그로 확인하고, CPU 폴백 상태와 처리 속도를 비교할 예정이다. 단순히 모델이 실행된다는 사실만으로 GPU 가속에 성공했다고 판단하지 않겠다.

## 현재 준비한 하드웨어

![AMD BC-250과 전원공급장치, SSD, 쿨링팬의 준비 상태](/images/posts/202610/bc250-hardware-setup.jpg)

| 부품         | 구성                            |
| ------------ | ------------------------------- |
| 메인보드     | AMD BC-250                      |
| 전원공급장치 | COOLMAX FOCUS II 500W           |
| SSD          | SK hynix BC711 512GB NVMe       |
| 쿨링팬       | ARCTIC P12 Pro PST LN 2개       |
| 케이스       | 오픈형 테스트 후 별도 제작 검토 |

처음부터 완성형 케이스를 제작하지는 않으려고 한다. 먼저 **절연된 비전도성 받침대에서 안전하게 고정하고**, 전원과 쿨링을 점검한 뒤 부팅·온도·소음을 확인할 계획이다. 부품을 임시로 조립하더라도 전원 연결 상태와 팬 고정은 충분히 확인해야 한다.

BC-250은 채굴 장비의 강한 공기 흐름을 전제로 사용되던 보드이므로, 일반 PC처럼 조용한 환경에서 안정적으로 작동할지는 직접 검증이 필요하다. 온도와 소음이 허용 범위에 들어온 다음 3D 프린팅 케이스 제작을 결정하려고 한다.

케이스 후보로는 [Printables의 BC-250 Full-Size ATX PSU Case](https://www.printables.com/model/1782963-bc250-bc-250-full-size-atx-psu-case)를 참고하고 있다. 다만 실제 부품 간섭, 공기 유입·배출 방향, 소재의 내열성은 제작 전에 다시 확인할 예정이다.

## 앞으로 진행할 프로젝트

BC-250은 단순히 로컬 챗봇 하나를 실행하고 끝낼 장비가 아니다. 가능한 범위부터 검증하면서 다른 개인 프로젝트와 연결해 보려 한다.

### 1. 로컬 AI 서버 구축

[Ollama](https://github.com/ollama/ollama)와 [llama.cpp](https://github.com/ggml-org/llama.cpp)를 활용해 텍스트 생성 모델을 실행할 계획이다. 처음에는 가벼운 모델로 Vulkan 구성을 검증하고, 이후 더 큰 양자화 모델을 올려 실제 사용성을 비교한다.

최종적으로는 **내부 API를 통해 다른 애플리케이션이 호출하는 추론 서버**를 만들고 싶다. 외부 접근은 서비스 포트를 무작정 공개하기보다 인증과 접근 제어가 가능한 방식부터 검토할 생각이다.

### 2. AI 이미지 생성 실험

[stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp)를 이용한 Vulkan 이미지 생성도 실험 대상이다. 텍스트 모델과 이미지 모델은 요구 메모리와 실행 특성이 다르므로, 실제 구동 가능한 모델·해상도·생성 시간을 따로 확인해야 한다.

### 3. 개인 게임 프로젝트에 AI 연결

향후 제작할 웹게임에서는 특정 상황에 반응하는 **AI 플레이어·NPC 의사결정**에 로컬 모델을 적용해 보고 싶다. 모든 행동을 실시간 LLM에 맡기기보다 게임 규칙과 일반적인 상태 머신을 기본으로 두고, 필요한 판단에만 AI를 호출하는 방식이 현실적일 것으로 보고 있다.

### 4. Orange Pi 홈랩과 연결

![AMD BC-250 AI 서버와 Orange Pi k3s 클러스터의 미래 연결 구성도](/images/posts/202610/bc250-homelab-architecture.jpg)
_AI 생성 아키텍처 개념도. 실제 구축 완료 화면이 아닌 향후 설계안이다._

장기적으로는 Orange Pi 기반 [k3s](https://k3s.io/) 클러스터와 BC-250을 연결하려고 한다. 구상 중인 역할 분담은 다음과 같다.

| 장비                   | 예정 역할                                  |
| ---------------------- | ------------------------------------------ |
| BC-250                 | Fedora 기반 독립 AI 추론 서버, Vulkan 처리 |
| Orange Pi k3s 클러스터 | 웹 서비스, API, 게임 서버, 모니터링 등     |
| 가정용 라우터          | 내부망 연결 및 접근 관리                   |
| 원격 접속 계층         | 인증된 사용자만 접근할 수 있도록 구성      |

**BC-250 자체를 바로 k3s 노드로 편입하기보다는 독립 서버로 운영**하고, 클러스터의 애플리케이션에서 내부 API로 호출하는 구성을 우선 검토하고 있다. 모델 교체나 GPU 관련 문제를 웹 서비스 운영과 분리할 수 있기 때문이다.

## 참고할 GitHub 프로젝트와 공식 문서

이번 구축에서는 일반적인 AMD GPU 튜토리얼보다 **BC-250 실기기 기반으로 작성된 커뮤니티 자료**를 우선 참고할 생각이다.

| 자료                                                                                                         | 참고할 내용                                         |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| [akandr/bc250](https://github.com/akandr/bc250)                                                              | Fedora, Ollama, Vulkan, 메모리 설정과 LLM 실행 사례 |
| [AMD BC250 Documentation](https://elektricM.github.io/amd-bc250-docs/)                                       | 하드웨어 사양, BIOS, Linux 배포판, 쿨링·문제 해결   |
| [elektricM/amd-bc250-docs](https://github.com/elektricM/amd-bc250-docs)                                      | 커뮤니티 문서 원본 및 업데이트 확인                 |
| [wdonega/bc250-llm-setup](https://github.com/wdonega/bc250-llm-setup)                                        | Ubuntu + llama.cpp + Vulkan 구축 및 점검 스크립트   |
| [thelamer/bc250-ollama-openwebui](https://github.com/thelamer/bc250-ollama-openwebui)                        | Ollama와 Open WebUI 구성 사례                       |
| [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp)                                                  | LLM 추론 엔진 원본 프로젝트                         |
| [ollama/ollama](https://github.com/ollama/ollama)                                                            | 로컬 모델 실행과 API 제공                           |
| [leejet/stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp)                                | Vulkan을 이용한 이미지 생성 실험                    |
| [Printables BC-250 ATX 케이스](https://www.printables.com/model/1782963-bc250-bc-250-full-size-atx-psu-case) | 향후 3D 프린팅 케이스 검토                          |

개별 프로젝트의 README와 설정 방법은 계속 바뀔 수 있다. 특히 **커널 버전, Mesa 버전, 모델별 메모리 요구량과 성능 측정 조건**을 확인하고 내 환경에 맞춰 적용해야 한다.

## 마무리: 우선은 안정적으로 부팅하는 것부터

지금 단계에서 목표는 거창한 AI 시스템을 완성하는 것이 아니다. **채굴용으로 만들어진 특이한 하드웨어를 실제로 쓸 수 있는 개인 AI 서버로 바꾸는 것**이 첫 번째 목표다.

우선 전원 연결과 쿨링부터 안정화하고 Fedora 설치, GPU 인식, 모델 구동 순서로 진행할 예정이다. 예상대로 작동하지 않는 부분이 있다면 실패 원인과 해결 과정까지 기록하려고 한다.

이후에는 Ollama 추론 결과, 이미지 생성 실험, Orange Pi 홈랩 연동까지 차례대로 정리할 생각이다. **이번 글은 그 시작점이다.**
