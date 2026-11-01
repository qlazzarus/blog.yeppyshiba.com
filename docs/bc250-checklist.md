# BC-250 로컬 AI 서버 — 단계별 구축·검증 체크리스트

> 마지막 정리: 2026-10-21 | 상태: **원격 접속 환경 준비 중**  
> 목적: Fedora 기반 BC-250을 안전하게 원격 관리하면서 **40CU + 1.5GHz → llama.cpp Vulkan → GPT-OSS 20B Uncensored Balanced**까지 단계적으로 검증한다.  
> 운영 원칙: **한 번에 한 항목씩 변경 / 변경 전 수치 저장 / 통과 확인 후 다음 단계 / 원격 접속이 유일한 복구 경로일 때 커널 작업 금지**

## 0. 현재 장비와 확정된 사항

| 항목 | 현황 |
|---|---|
| 보드 | AMD BC-250, 16GB GDDR6 공유 메모리 |
| GPU | 기본 24CU, **40CU 언락 예정** |
| GPU 클럭 | 미설정 상태에서 테스트. 실제 2GHz 동작 여부는 **미확인** |
| CPU | 기본 6코어/12스레드; 8코어 언락은 **후순위 보류** |
| OS | Fedora 설치 완료 (정확한 버전은 점검) |
| 추론 | Ollama + Vulkan 동작 확인, GPU 활용 확인 |
| 전원 | COOLMAX FOCUS II 500W ATX |
| 저장장치 | SK hynix BC711 512GB SSD |
| 냉각 | Arctic P12 Pro PST LN 120mm ×2, PWM 데이지체인 연결 |
| 열관리 | 이전 측정 약 65°C; **40CU 장시간 부하 온도는 아직 모름** |
| 네트워크 | 유선 SSH 사용 이력 있음; Wi-Fi USB 동글 도입 예정 |
| Wi-Fi 후보 | 다이소 품번 **1045374**, 사용자 조사상 **RTL8192EU** (실물 USB ID로 확인) |
| 장기 목표 | SSH/Tailscale 원격 접속, 헤드리스, llama-server/API, 24시간 안정 운영 |

### 현재 Ollama 실측 기준선 (24CU)

| 모델 | 생성 속도 |
|---|---:|
| Qwen2.5 3B | **84.16 tok/s** |
| Qwen3 8B | **39.17 tok/s** |
| Qwen3 14B | **22.89 tok/s** |

> 이 수치는 **사용자 실측**. 양자화·컨텍스트·GPU 실제 클럭·벤치 명령을 별도 기록하지 않았으므로 GitHub의 1.5GHz 통제 벤치와 직접 동등 비교하면 안 된다.

## 1. 전체 작업 순서 / 진행판

- [x] A. Fedora 설치 및 Ollama/Vulkan에서 GPU 구동 확인
- [x] B. 24CU에서 Qwen 모델 3종 초기 벤치마크 기록
- [ ] **1. Wi-Fi 동글 인식·안정성 검증** ← 현재 시작점
- [ ] **2. Wi-Fi SSH + Tailscale 원격 접근 완성**
- [ ] **3. 현재 OS/커널/클럭/전력/TTM/모델 세팅 스냅샷 확보**
- [ ] **4. GUI 비활성화(Headless) + 복구 테스트**
- [ ] **5. 40CU 언락 전 복구 수단 확보 및 1.5GHz governor 적용**
- [ ] **6. 40CU 언락 후 GPU 수·온도·안정성 확인**
- [ ] **7. Qwen 기존 모델 동일 조건 재측정**
- [ ] **8. llama.cpp Vulkan 병행 설치 및 원본 GPT-OSS 20B MXFP4 벤치마크**
- [ ] **9. GPT-OSS 20B 무검열 Balanced GGUF 호환성·품질·속도 검증**
- [ ] **10. llama-server 서비스화, API 접근 제한, 장시간 운영 테스트**
- [ ] 선택: CPU 8코어 언락 전후 효과 실험 (주요 일정과 분리)

---

## 단계 1 — 다이소 RTL8192EU Wi-Fi 연결

**목표:** Fedora에서 동글을 인식하고 재부팅 이후에도 안정적으로 연결한다.

**구매/확인:** 다이소 품번 1045374. 판매명보다 `lsusb`에 나타나는 **VID:PID(USB ID)**가 우선이다. 리비전 변경 가능성 있음.

유선 또는 로컬 콘솔을 유지한 채 실행:

```bash
uname -r
cat /etc/fedora-release
lsusb
lsmod | grep -E 'rtl8xxxu|8192eu' || true
nmcli device status
sudo dmesg | grep -iE 'rtl8xxxu|8192eu|firmware|usb' | tail -n 80
nmcli -f IN-USE,SSID,SIGNAL,SECURITY device wifi list
```

Wi-Fi 장치가 나타나면 **비밀번호를 명령줄에 직접 남기지 않고** 연결:

```bash
sudo nmcli device wifi connect '내SSID' --ask
nmcli device status
ip -4 addr
nmcli -f GENERAL.STATE,GENERAL.CONNECTION device show
```

- [ ] `lsusb`에서 어댑터 VID:PID 확인
- [ ] 무선 인터페이스 생성 / `rtl8xxxu` 등 적용 드라이버 확인
- [ ] 2.4GHz SSID 검색 및 정상 인증
- [ ] 재부팅 후 Wi-Fi 자동 재연결
- [ ] 30~60분 연속 ping/SSH 연결 확인
- [ ] Wi-Fi 연결 실패 시 **유선을 유지**하고 로그 저장

**주의:** RTL8192EU는 커널 기본 `rtl8xxxu`에 지원 항목이 있지만 Fedora에서 연결 장애 사례가 있었다. 외부 DKMS 드라이버는 기본 드라이버로 실패했을 때만 검토. 커널 업데이트와 40CU 패치의 유지관리 복잡성을 증가시킨다.

**통과 조건:** Wi-Fi IP 확보, 재부팅 후 자동 연결, SSH 재접속 가능.

## 단계 2 — 원격 SSH / Tailscale

**목표:** 집 밖에서도 **공유기 22번 포트 공개 없이** 접속한다.

```bash
sudo systemctl status sshd --no-pager
sudo systemctl enable --now sshd
sudo firewall-cmd --state
hostname -I
```

1. 먼저 **같은 집 LAN의 다른 장치**에서 `ssh 사용자명@Wi-Fi_IP` 성공 확인.
2. Tailscale은 [공식 Fedora/Linux 설치 가이드](https://tailscale.com/kb/1031/install-linux)를 **실행 시점에 검토한 뒤** 설치한다. 미검증 설치 스크립트 복붙 금지.
3. `tailscale up`으로 본인 계정에 연결하고 `tailscale ip -4` 주소 확인.
4. 휴대폰 테더링 등 **다른 네트워크**에서 Tailscale IP로 SSH 접근 확인.
5. SSH 키 등록 후 비밀번호 로그인 제한 여부 검토. Tailscale 접근 정책도 확인.

- [ ] LAN SSH 성공
- [ ] Tailscale 설치 / 승인
- [ ] 외부망 SSH 성공
- [ ] 재부팅 후 자동 복구
- [ ] 유선 케이블 제거 상태에서도 테스트
- [ ] 실패 시 화면·키보드로 복구 가능함을 확인

**보안:** 공유기에서 22/tcp 포트포워딩 금지. llama-server도 인증/네트워크 제한 없이 인터넷에 공개하지 않는다.

## 단계 3 — 변경 전 상태 스냅샷

**목표:** 작업 전후의 차이를 재현 가능하게 만든다.

```bash
mkdir -p ~/bc250-lab/logs
{
  date -Is
  cat /etc/fedora-release
  uname -a
  lscpu
  free -h
  lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINTS
  lsusb
  nmcli device status
  ollama --version
  ollama list
  cat /proc/cmdline
  cat /sys/module/ttm/parameters/pages_limit 2>/dev/null || true
  cat /sys/module/ttm/parameters/page_pool_size 2>/dev/null || true
  for x in /sys/class/drm/card*/device/pp_dpm_sclk; do test -f "$x" && cat "$x"; done
  systemctl get-default
} | tee ~/bc250-lab/logs/baseline-$(date +%F-%H%M).txt
```

- [ ] 모델 이름·양자화·컨텍스트·추론 엔진 기록
- [ ] GPU CU 실제 개수 및 **실부하 평균 클럭** 확인
- [ ] 온도(에지/핫스팟이 별도로 나오면 각각) 기록
- [ ] 전력 센서 기록: 센서 값은 실측 콘센트 전력과 다를 수 있음
- [ ] `ttm.pages_limit` 확인: 참고 설정은 `4194304`; **값이 다르다고 바로 변경하지 말 것**
- [ ] `ollama ps`의 GPU/CPU 오프로딩 상태 기록

## 단계 4 — Headless 운영

**선행:** 단계 2 통과 필수. 네트워크가 끊겼을 때 되돌릴 물리적 접근 수단 확보.

```bash
sudo systemctl set-default multi-user.target
sudo reboot
```

재접속 후:

```bash
systemctl get-default
free -h
systemctl is-active sshd
nmcli device status
```

GUI 복구:

```bash
sudo systemctl set-default graphical.target
sudo reboot
```

- [ ] SSH 재접속
- [ ] 메모리 여유 변화 기록
- [ ] 재부팅 후 자동 복구

> `akandr/bc250`는 GUI 비활성화로 약 1GB 절약을 보고함. 이는 **메모리 여유 최적화**이지 토큰 속도 1GB만큼의 선형 개선이 아니다.

## 단계 5 — GPU 1.5GHz + 40CU 언락 사전 준비

**목표:** 복구 가능한 상태에서 클럭 상한 적용과 CU 변경을 분리해 검증한다.

- [ ] 정확한 커널 버전·GPU 현재 CU 확인
- [ ] GitHub 프로젝트의 **현재 커널 호환성/설치 방법/이슈** 다시 확인
- [ ] 언락 전/후 커널 부팅 항목과 모듈 백업
- [ ] 재부팅 실패 시 사용할 로컬 화면·키보드·부팅 USB 준비
- [ ] **기존 커널 부팅 경로 유지**
- [ ] 먼저 `oberon` governor의 1.5GHz 제한이 **실제 적용**되는지 부하 중 확인
- [ ] 제한 적용 상태에서 기존 Qwen 8B 테스트 (24CU 기준선 추가)

**40CU 언락은 커널에 영향이 있을 수 있으므로 이 문서에서 임의의 한 줄 실행 명령을 확정하지 않는다.** 정확한 설치 명령은 현재 Fedora 커널·GitHub 스크립트의 실제 동작을 확인한 후 확정한다. `curl | bash` 형태를 검토 없이 실행하지 말 것.

참조: https://github.com/akandr/bc250 · https://github.com/GabriWar/bc250-core-cu-unlock

## 단계 6 — 40CU 검증

- [ ] 재부팅 성공 / Wi-Fi와 SSH 정상
- [ ] 도구로 40CU 확인 (출력값과 사용 명령 기록)
- [ ] `oberon` 최대 1.5GHz 제한 적용 확인
- [ ] 모델 로딩/단시간 추론 정상
- [ ] 10~15분 부하에서 오류·프리징·클럭 급락 없는지 확인
- [ ] 이후 1시간 이상 반복 부하 / 네트워크 안정 확인
- [ ] 가능하면 벽전력계로 전력 확인

**중단 신호:** 시스템 다운, GPU reset, 반복적 OOM, 팬 정지, 비정상적인 온도 상승·강한 스로틀링. 온도 목표는 우선 **75°C 이하를 지향**하되 이는 임의 안전 보증 기준이 아님. 공개 벤치에서는 40CU에서 더 높은 피크 온도도 보고돼 있으므로 장시간 안정성으로 판단.

## 단계 7 — Qwen A/B 재측정

24CU 초기 수치를 남겨두고 **같은 양자화/컨텍스트/출력 토큰 수/프롬프트/추론 엔진**으로 비교한다. 테스트는 최소 3회, 평균과 편차도 기록.

| 모델 | 기존 24CU (tok/s) | 40CU 1.5GHz 1회 | 2회 | 3회 | 평균 |
|---|---:|---:|---:|---:|---:|
| Qwen2.5 3B | 84.16 | | | | |
| Qwen3 8B | 39.17 | | | | |
| Qwen3 14B | 22.89 | | | | |

**중요:** 기존 24CU가 2GHz로 동작했는지는 확인되지 않았으므로 위 수치와의 차이만으로 CU 언락 효과를 순수하게 계산할 수 없다. 가능하면 **24CU 1.5GHz 기준선**을 단계 5에서 추가 측정.

## 단계 8 — llama.cpp Vulkan + 원본 GPT-OSS 20B

**목표:** Ollama는 유지하면서 **llama.cpp를 병행**하고 엔진별 속도 차이를 분리 측정한다.

- [ ] 배포판 패키지 또는 공식 llama.cpp 소스의 버전/빌드 절차 검토
- [ ] Vulkan SDK/드라이버 동작 확인
- [ ] llama.cpp Vulkan 빌드 및 `llama-cli`, `llama-bench`, `llama-server` 버전 기록
- [ ] **원본** GPT-OSS 20B MXFP4 GGUF 확보: 파일 출처·SHA256·라이선스 기록
- [ ] 8K 컨텍스트부터 메모리 할당/전체 GPU offload 확인
- [ ] Flash Attention, Q4_0 KV 옵션은 지원 여부 확인 후 한 개씩 적용
- [ ] 프롬프트 처리 속도(`pp`)와 생성 속도(`tg`) 따로 측정
- [ ] Ollama vs llama.cpp 동일 조건 비교

공개 프로젝트의 **참고값(해당 환경에서의 실측, 우리 장비 보장 아님)**:

| GPT-OSS 20B | 24CU/1.5GHz | 40CU/1.5GHz |
|---|---:|---:|
| Ollama 경로 | 45.9 tok/s | 51.4 tok/s |
| llama.cpp MXFP4 경로 | 66.1 tok/s | 87.5 tok/s |

> 서로 다른 경로는 엔진 버전, 양자화 처리 및 테스트 조건의 영향이 있어 'llama.cpp 자체가 언제나 빠르다'는 의미가 아니다.

## 단계 9 — GPT-OSS 20B Uncensored Balanced

**목표:** 원본 성능 검증 후 무검열 파생 모델의 품질·호환성·속도를 별도로 확인한다.

후보: `HauhauCS/GPT-OSS-20B-Uncensored-HauhauCS-Balanced` 등. **실제 파일명·저장소 존속·GGUF 양자화 형식을 다운로드 당일 다시 확인**한다. 이전 대화에 등장한 타 제공처 이름과 혼동하지 말 것.

- [ ] 모델 출처 / 체크포인트 / SHA256 기록
- [ ] GGUF가 **실제로 MXFP4인지** 메타데이터 확인 (원본과 동일 양자화라고 추정 금지)
- [ ] 모델 실행과 GPU 전체 오프로딩 확인
- [ ] 8K 컨텍스트 3회, 16K 3회 벤치
- [ ] 응답 품질: 한국어, 코딩, 도구 호출(JSON), 거부 응답/안전성, 반복 출력 테스트
- [ ] 내부 추론 토큰과 최종 답변 시간(TTFT 포함) 구분 기록
- [ ] 목표 **50 tok/s 이상 실사용 가능**, **60~80 tok/s 목표치(추정)**

| 항목 | 원본 GPT-OSS 20B | Balanced 파생 모델 |
|---|---|---|
| GGUF 크기/양자화 | | |
| 8K 생성 tok/s | | |
| 16K 생성 tok/s | | |
| 첫 토큰 지연 | | |
| 모델+KV 메모리 사용 | | |
| 한국어 답변/코딩 품질 | | |
| 오류/불안정 이슈 | | |

## 단계 10 — 서비스화 및 24시간 운영

- [ ] `llama-server`는 우선 **127.0.0.1 바인딩**으로 서비스화
- [ ] 네트워크 제공 필요 시 Tailscale ACL 또는 인증 프록시 적용 후 노출
- [ ] systemd 서비스에 restart 정책·로그·리소스 제한 적용
- [ ] 부팅 후 Wi-Fi/Tailscale/서버 자동 복구
- [ ] 1시간 → 6시간 → 24시간 부하/유휴 검증
- [ ] 평균/최고 온도, 재시작 횟수, GPU reset, OOM, 응답 지연 기록
- [ ] 커널 업데이트 이후 CU 언락 상태 재확인
- [ ] Orange Pi k3s 연동은 API 안정화 **이후** 진행

## 보류 작업 — CPU 6→8코어 언락

**우선순위 낮음.** GPU에 모델 전체를 올리는 추론에서 생성 속도 개선은 제한적일 수 있다. CPU 멀티스레드 작업용 추가 코어가 필요해질 때 별도 A/B 실험.

- [ ] CPU 코어 언락 프로젝트와 현재 커널 호환성 확인
- [ ] 전력·온도·ACPI·절전 및 부팅 복구 수단 점검
- [ ] GPU 40CU와 1.5GHz를 고정하고 6코어/8코어 비교
- [ ] 성능 이득이 전력·발열·관리 복잡성보다 큰지 판단

참조: https://github.com/GabriWar/bc250-core-cu-unlock

---

## 반복 사용: 작업일지 템플릿

매 단계 완료 시 아래 블록 복사해서 채우기.

```md
### YYYY-MM-DD — 단계 N: 제목
- 상태: 준비 / 진행 중 / 통과 / 보류 / 실패
- 변경한 항목:
- 작업 전 커널/버전:
- 수행한 명령(비밀값 제거):
- 실측(CU, GPU MHz, edge/hotspot ℃, 전력, 메모리):
- 벤치(model, GGUF/quant, context, pp/tg tok/s):
- 오류 및 로그 파일:
- 재부팅 후 확인:
- 롤백 방법:
- 다음 단계 진행 여부:
```

## 참고 링크 / 근거

- BC-250 핵심 설치/메모리/GUI/40CU·LLM 벤치: https://github.com/akandr/bc250
- CPU 코어·CU 언락 사례(실행 전 호환성 검토): https://github.com/GabriWar/bc250-core-cu-unlock
- RTL8192EU 드라이버 관련 Fedora 보고: https://discussion.fedoraproject.org/t/default-support-for-rtl8192eu-is-it-possible/168161
- Linux rtl8xxxu 드라이버 참고: https://github.com/lwfinger/rtl8xxxu
- Tailscale Linux 설치 가이드: https://tailscale.com/kb/1031/install-linux
- llama.cpp 공식 프로젝트: https://github.com/ggml-org/llama.cpp

> 이 문서는 **진행 상황을 추적하기 위한 실행 계획**이다. 명령을 그대로 일괄 실행하는 스크립트가 아니다. 특히 무선 드라이버 교체, GUI 종료, CU 언락, 커널·부팅 변경은 각각 접속 및 복구 가능 여부를 확인하고 개별 실행한다.
