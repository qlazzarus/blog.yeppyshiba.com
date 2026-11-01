# BC-250 로컬 AI 오케스트레이터 구축 로드맵

> 작성 기준: 2026-10-21  
> 목적: GPT-OSS 20B 채팅 → 이미지 프롬프트 큐 적재 → GPU 모델 전환 → 이미지 생성 → 채팅 복귀.  
> Orange Pi 클러스터 연동 목표: **2027년 2분기(Q2)**. 그 전에는 **BC-250 단일 노드**로 완결된 시스템 구축.

## 0. 확정된 방향과 아직 검증할 사항

### 확정 방향
- BC-250: Fedora 43, 16GB GDDR6, Vulkan 기반. 40 CU 언락 + 1.5GHz는 **검증 대상 설정**.
- 기존 Ollama 환경을 1차 활용하고, llama.cpp는 성능 비교 후 선택.
- GPT-OSS 20B의 **사용자가 선택한 파인튜닝 버전**으로 채팅 및 이미지 프롬프트 구조화.
- 이미지 생성 엔진: `stable-diffusion.cpp` 우선. FLUX.2 Klein 4B를 첫 검증 대상으로 사용.
- 이미지 1장 **추론 시간** 목표: 512×512 기준 30~60초. 모델 로딩/전환 및 채팅 유휴 대기시간은 별도 측정.
- FastAPI + SQLite 영속 큐 + 단일 GPU 스케줄러 + systemd.
- 모델은 동시 상주시키지 않고 순차 로드. ComfyUI는 후속 UI/워크플로 계층.
- Orange Pi는 **2027 Q2 이후** 외부 오케스트레이터/큐 이전 후보. 지금은 의존하지 않음.

### 검증 필요 — 확정 사실로 취급하지 않기
- GPT-OSS 20B 파인튜닝의 GGUF/Ollama/Vulkan 호환성, 실제 토큰 속도와 메모리 사용량.
- FLUX.2 Klein 4B 및 다른 모델의 **현재 stable-diffusion.cpp 커밋** 지원 여부와 BC-250 Vulkan 동작.
- MOSS-Image의 BC-250 호환성, 필요 인코더·메모리, 생성 속도. **실험 단계로 보류**.
- ComfyUI에서 외부 `stable-diffusion.cpp` 호출: 커스텀 노드/API 브리지 필요할 수 있음.
- `keep_alive=0` 요청 후 GPU 메모리 해제 시점, 모델 재로드 시간.
- 40 CU + 1.5GHz에서 전력·온도·안정성·속도 개선 여부.

## 1. 최종 구조(단일 노드 → 다중 노드 확장)

```text
[Web Chat / (추후 Signal) / ComfyUI]
                |
          [FastAPI Gateway]
                |
      [Session + Job Service]
                |
         [SQLite Job Store] ------ [Image Output Storage]
                |
        [GPU Scheduler / Lease]
                |
         [BC-250 GPU Worker]
          /             \
 [LLM Adapter]       [Image Adapter]
 Ollama / llama.cpp  stable-diffusion.cpp
 GPT-OSS 20B         FLUX.2 Klein 4B
                     Z-Image / MOSS(검증 후)

2027 Q2 이후:
 [Orange Pi Control Plane] --(HTTP API/Queue)--> [BC-250 GPU Worker]
    Gateway, Queue, Scheduler                    GPU 추론 전담
```

**설계 원칙**
1. FastAPI, DB, 스케줄러는 모델 프로세스와 독립 실행.
2. GPU 로드/언로드는 **단일 Scheduler**만 수행. 모든 UI는 직접 GPU 모델을 실행하지 않고 Job API를 사용.
3. `LLMBackend` / `ImageBackend` 인터페이스로 실행 엔진 교체 가능하게 구성.
4. SQLite는 저장소 구현체로 캡슐화하고 `JobRepository` 인터페이스 유지. 향후 PostgreSQL/메시지 브로커로 변경 가능.
5. 로컬 파일 경로 대신 `artifact_id`와 메타데이터를 API에 노출. 향후 NAS/S3 호환 저장소 이전에 대비.
6. 내부 API와 worker 간 통신은 HTTP/JSON부터 시작하되, 요청 ID/상태/재시도 의미를 명시.

## 2. 사용자 플로우

1. 사용자가 채팅으로 이미지 생성 요청.
2. LLM이 **구조화된 생성 요청(JSON)** 을 제안.
3. API에서 스키마·허용 범위·리소스 제한을 검증하고 SQLite 트랜잭션으로 작업 등록.
4. 채팅이 종료되거나 60초 유휴 상태가 되면, 스케줄러가 새 LLM 요청이 없는지 확인.
5. LLM 모델 언로드 → 실제 GPU 자원 해제 확인(타임아웃·실패 처리 포함).
6. 이미지 엔진 로드 → 대기 작업을 **최대 1~3개** 묶어 처리(초기에는 1개).
7. 결과 이미지·메타데이터 저장 → 완료/실패 기록 → 이미지 엔진 언로드.
8. 채팅 대기 요청이 있으면 LLM 우선 복귀. 없더라도 정책에 따라 LLM 사전 로드.
9. UI에 생성 결과와 실패 원인을 표시.

**중요:** 이미지 생성 도중 들어온 새 채팅은 API가 접수해 대기 상태를 알림. 이미지 생성 중 강제 중단은 초기 버전에서 하지 않음.

## 3. 상태 모델

### GPU 스케줄러
`LLM_READY → QUIESCING → LLM_UNLOADING → IMAGE_LOADING → IMAGE_RUNNING → IMAGE_UNLOADING → LLM_LOADING → LLM_READY`

예외 상태: `ERROR_RECOVERY`, `MAINTENANCE`. 각 전환은 타임아웃·로그·헬스체크 필수.

### 작업 상태
`QUEUED → WAITING_FOR_GPU → RUNNING → SUCCEEDED | FAILED | CANCELLED`

- 재시작 시 `RUNNING` 작업은 실행 프로세스와 결과 파일을 확인한 뒤 재시도/실패 처리.
- `job_id`는 UUID; 동일 요청 중복 등록 방지를 위해 `idempotency_key` 지원.
- 실패 재시도 횟수 제한(초기 2회), 재시도 가능한 오류와 영구 오류 구분.
- SQLite WAL 모드, 단일 writer 정책, 정기 백업 적용.

## 4. JSON 작업 계약 예시

```json
{
  "schema_version": 1,
  "job_id": "generated-by-server",
  "type": "image.generate",
  "requested_model": "flux2-klein-4b",
  "prompt": "Cinematic night street portrait of a clearly adult fictional character",
  "negative_prompt": "blurry, low quality",
  "width": 512,
  "height": 512,
  "steps": 4,
  "seed": 123456,
  "priority": 5,
  "session_id": "session-uuid",
  "idempotency_key": "client-request-uuid"
}
```

> 이 필드는 **내부 표준 요청 포맷**이다. 모델별로 `negative_prompt`, `steps` 등 미지원 항목을 변환하거나 거절해야 한다. `job_id`는 서버가 발급한다. 생성 콘텐츠는 성인으로 명확한 가상 인물 등 합법적·동의 기반 사용으로 제한한다.

## 5. 프로젝트 디렉터리 제안

```text
/opt/bc250-ai/
├── apps/
│   ├── api/                 # FastAPI, 채팅/작업/결과 API
│   └── scheduler/           # 단일 GPU 소유권, 모델 전환
├── packages/
│   ├── contracts/           # Pydantic 스키마, 상태 정의
│   ├── backends/
│   │   ├── llm_ollama.py
│   │   ├── llm_llamacpp.py
│   │   └── image_sdcpp.py
│   ├── repositories/        # SQLite 구현 / 추후 교체
│   └── storage/             # Local FS / 추후 NAS·S3
├── config/
│   ├── settings.example.yaml
│   └── models.yaml
├── data/
│   ├── jobs.sqlite3
│   └── outputs/
├── scripts/
│   ├── bench_llm.sh
│   ├── bench_image.sh
│   └── healthcheck.sh
├── deploy/systemd/
├── tests/
└── docs/
    ├── benchmark-log.md
    └── runbook.md
```

## 6. 단계별 실행 체크리스트

### Phase 0 — 현재 BC-250 안정화 (선행)
- [ ] Fedora 43/커널/드라이버/Vulkan 장치 확인 및 버전 기록.
- [ ] 24 CU 현재 상태에서 GPT-OSS 20B 또는 기준 LLM 토큰 속도 측정.
- [ ] 40 CU + 1.5GHz 적용 전/후 온도·전력·성능 비교, 롤백 방법 기록.
- [ ] 팬 PWM, 냉각, 장시간 안정성 점검(24시간 운영 목표).
- [ ] SSH 접근, 방화벽, 비밀번호 대신 SSH 키, 자동 재시작 확인.
- [ ] SSD 남은 용량과 모델별 예상 저장 공간 확인.

### Phase 1 — 이미지 생성 엔진 단독 검증
- [ ] stable-diffusion.cpp의 **현재 소스 버전**에서 Vulkan 빌드.
- [ ] FLUX.2 Klein 4B 모델 형식·인코더·VAE·라이선스 확인.
- [ ] 512×512 고정 프롬프트/시드로 3회 이상 생성, 중앙값 기록.
- [ ] 24 CU 및 40 CU(가능하면)에서 비교.
- [ ] 메모리 점유, 온도, 실패율, 모델 로드 시간 기록.
- [ ] Z-Image-Turbo는 후순위 비교, MOSS-Image는 호환성 검증 후 도입.

### Phase 2 — 최소 기능 MVP (ComfyUI 없이)
- [ ] FastAPI `POST /v1/chat`, `POST /v1/jobs/images`, `GET /v1/jobs/{id}`, `GET /v1/artifacts/{id}`.
- [ ] Pydantic 작업 스키마, 요청 크기 제한, JSON 검증.
- [ ] SQLite 큐 + 중복 방지 + 재시도 + 재부팅 복구.
- [ ] Ollama Adapter: 모델 로드/언로드/헬스체크.
- [ ] stable-diffusion.cpp Adapter: CLI 또는 실제 지원 API로 생성 실행.
- [ ] GPU Scheduler: 단일 lock, 상태 머신, 타임아웃, 오류 복구.
- [ ] 60초 유휴 감지, 명시적 '지금 생성' 버튼/명령.
- [ ] 이미지 1개 완료 후 LLM 복귀; 실제 전환 시간 기록.

### Phase 3 — 사용성·성능 개선
- [ ] GPT-OSS 20B 파인튜닝 모델로 프롬프트 JSON 생성 및 검증.
- [ ] 이미지 1~3개 배치 처리 + 채팅 우선순위 정책.
- [ ] llama.cpp와 Ollama 동일 조건 비교(토큰/s, RAM/VRAM, 로드 시간).
- [ ] UI에 작업 진행 상태·예상 대기·완료 알림 표시.
- [ ] ComfyUI 커스텀 노드/API 브리지로 결과 연동(외부 실행 엔진 방식).
- [ ] 모델 선택 및 파라미터별 프리셋 제공.
- [ ] 로그 로테이션, 이미지 보존/삭제 정책, 인증, 백업 자동화.

### Phase 4 — 2027년 2분기 Orange Pi 연동
- [ ] Orange Pi 5 Pro 클러스터 및 네트워크 안정화.
- [ ] API·Queue·Scheduler의 제어 평면 이전 여부 결정.
- [ ] SQLite → PostgreSQL/브로커 이전 필요성 평가(필요 없으면 유지).
- [ ] BC-250 GPU Worker를 독립 HTTP 서비스로 분리.
- [ ] Worker 인증, 작업 lease/heartbeat, 연결 끊김 복구.
- [ ] 이미지 저장소를 NFS 또는 S3 호환 스토리지로 이전 검토.
- [ ] BC-250 단독 모드로 복귀 가능한 장애 대응 계획 수립.

## 7. 운영 정책 초안

| 항목 | 초깃값 | 비고 |
|---|---|---|
| 채팅 유휴 전환 | 60초 | 활성 응답/다른 세션 존재 시 전환 금지 |
| 이미지 배치 크기 | 1장 | 안정화 후 최대 3장 검토 |
| 이미지 기본 크기 | 512×512 | 이후 768×768 비교 |
| 목표 이미지 추론 | 30~60초 | 로딩 시간 제외, 실제 측정 필요 |
| 실패 재시도 | 최대 2회 | 오류 유형별 제한 |
| GPU 소유권 | Scheduler 단독 | 동시 모델 로드 방지 |
| 시작 시 모드 | LLM 우선 | 큐 복구 후 정책 적용 |
| 로그 | JSON 구조화 | request_id, job_id, session_id |
| 외부 노출 | 기본 localhost | 인증/프록시 없이 인터넷 직접 노출 금지 |

## 8. 측정할 지표

- LLM: 첫 토큰 지연(TTFT), 출력 tokens/s, 컨텍스트 길이, GPU 메모리.
- 이미지: 모델 로드 시간, 순수 생성 시간, 저장 시간, 해상도, 스텝, 시드.
- 전환: LLM 언로드 시간, GPU 해제 확인 시간, 이미지 로드 시간, LLM 재로드 시간.
- 안정성: 최고/평균 온도, 소비 전력(측정 가능 시), 실패/재시도 횟수, 24시간 가동.
- UX: 요청부터 이미지 표시까지 총 시간, 이미지 작업 중 채팅 대기시간.

**벤치마크 기록 표**

| 날짜 | CU/클럭 | 모델/형식 | 해상도/스텝 | 로드(s) | 생성(s) | 피크 메모리 | 온도 | 결과 |
|---|---|---|---|---:|---:|---|---|---|
| TBD | 24 CU/기본 | FLUX.2 Klein 4B | 512/4 | - | - | - | - | 대기 |
| TBD | 40 CU/1.5GHz | FLUX.2 Klein 4B | 512/4 | - | - | - | - | 대기 |

## 9. 구현 시 놓치기 쉬운 위험

- **동시성:** LLM 스트리밍 응답 중 언로드 금지; 여러 채팅 세션을 고려한 active-request 카운터 필요.
- **GPU 해제:** Ollama의 언로드 응답만 믿지 말고 실제 장치 점유/프로세스 상태와 타임아웃 검증.
- **모델 전환 비용:** 생성 60초 목표와 사용자 체감 전체 지연은 다름.
- **드라이버 호환:** BC-250 Vulkan 지원과 특정 이미지 모델의 정상 실행은 별개.
- **저장 공간:** LLM·이미지 모델·출력 파일·로그가 512GB SSD를 빠르게 점유할 수 있음.
- **복구:** 전원 차단 후 중복 생성, 완료 파일 유실, `RUNNING` 상태 고착 방지.
- **보안:** SSH 키·API 인증·네트워크 제한·입력 검증·로그 내 민감 프롬프트 노출 방지.
- **라이선스:** 각 기본 모델과 파인튜닝 모델의 사용 조건을 개별 확인.
- **콘텐츠:** 실존 인물의 동의 없는 성적 합성 및 미성년자로 보이는 인물의 성적 콘텐츠를 생성하지 않도록 운영 규칙 적용.

## 10. 다음에 바로 시작할 작업

1. BC-250 현재 환경의 `vulkaninfo`, Ollama 모델 목록, GPU 설정, 온도·메모리 상태 기록.
2. stable-diffusion.cpp Vulkan 빌드 및 FLUX.2 Klein 4B 512×512 단독 생성 성공.
3. 모델 로드/생성/언로드 시간을 측정해 `docs/benchmark-log.md` 작성.
4. FastAPI + SQLite + Scheduler 최소 구현.
5. GPT-OSS 20B 프롬프트 생성 → 큐 등록 → 이미지 생성 → LLM 복귀의 end-to-end 테스트.

---

### 결정 로그
- **2026-10-21:** Orange Pi 구축 일정은 **2027년 Q2**로 설정. BC-250 단독 구축 우선, 확장 가능한 API/Adapter/Repository 경계를 유지.
- **2026-10-21:** 이미지 생성은 대화 종료 후 비동기 큐 처리, LLM과 이미지 엔진의 GPU 메모리 독점 전환 방식 채택.
- **2026-10-21:** ComfyUI는 MVP 필수 요소에서 제외하고 후속 연동.
