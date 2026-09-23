# Apex Seoul 오디오·음악 계획

갱신일: 2026-09-23

상태: 엔진·SFX 합성 청음 페이지와 외부 BGM 후보 조사 완료. 실제 런타임 오디오·외부 음원 다운로드·승인은 아직 하지 않았다.

이 문서는 Apex Seoul의 음악 역할, 외부 음악 후보, 자체 제작 방향과 승인 조건을 소유한다. 엔진·타이어·충돌 등 주행 SFX의 사건 계약은 [다음 구현 우선순위의 P1-3](./apex-seoul-next-priority-plan.md#p1-3-sfx라이선스-제안-승인-전)을 따른다.

## 역할 분리

엔진음은 차량의 성격과 조작 결과를 전달하고, 음악은 야간 다운힐의 속도감과 긴장을 유지한다. 음악을 차종별로 바꾸지 않는다. Raven의 고회전, Seorin의 순차 트윈터보, Mirae의 대형 싱글터보 차이는 엔진·터빈·배출음이 맡는다.

| 상태 | 음악 역할 | 권장 구성 |
| --- | --- | --- |
| Main / garage | 야간 서울의 정지된 공기 | 80 BPM, pad + 느린 pulse + 짧은 멜로디 |
| Race base | 주행 중 계속되는 추진감 | 160 BPM 또는 half-time 80 BPM, kick/bass + 얇은 arpeggio |
| Race intensity | 고속·부스트·연속 코너의 긴장 | base와 같은 BPM·key의 percussion + arpeggio + high synth stem |
| Result | 기록 확인 뒤의 해소 | 짧은 2–4초 sting. BGM을 새 곡으로 즉시 교체하지 않음 |

`Race base`와 `Race intensity`는 같은 길이, BPM, key, loop point를 공유한다. 속도·RPM·boost 자체로 BPM이나 playback rate를 바꾸지 않는다. 그 값으로 intensity stem의 gain만 300–500ms 동안 crossfade한다. 엔진 고회전이나 BOV가 묻히지 않도록 변속·lift·충돌 때 music bus를 2–4dB 낮추고 250–400ms 안에 되돌린다.

## 자체 제작을 최종 경로로 둔다

최종 BGM은 다음처럼 동시에 재생 가능한 stem을 직접 제작하는 편이 적합하다.

```text
race-base.ogg       16 bars / 160 BPM / A minor
race-intensity.ogg  same loop point, BPM and key
race-accent.ogg     optional sparse lead, same loop contract
```

- `base`는 mono-compatible low bass와 절제된 drum만 둔다.
- `intensity`는 속도감이 필요한 hi-hat, arpeggio, percussion을 맡는다.
- `accent`는 checkpoint·long straight처럼 게임이 이미 긴장 상태일 때만 낮은 볼륨으로 올린다.
- 멜로디가 엔진의 2–5kHz 존재감과 겹치지 않게, lead는 짧고 드물게 사용한다.
- 직접 만든 MIDI, synth patch, recording만 사용하거나 CC0 sample만 사용한다. sample pack·preset·DAW 확장 기능의 별도 배포 조건도 source metadata에 기록한다.

이 방식은 게임의 audio mixer에서 music volume, master volume, ducking을 일관되게 처리할 수 있고, 나중에 코스를 늘려도 같은 상태 전환 계약을 재사용할 수 있다.

## CC0 음악 후보 — 청음용, 승인 전

아래는 2026-09-23에 라이선스와 파일 형식을 확인한 후보다. 다운로드나 런타임 import 승인을 뜻하지 않는다. 각 페이지에서 파일·작성자·라이선스가 다시 일치하는지 확인한 뒤에만 source에 보관한다.

| 용도 | 후보 | 판단 |
| --- | --- | --- |
| Garage / menu | [PYNCHON — cinameng](https://opengameart.org/content/pynchon) | CC0의 짧은 cyberpunk synth loop. 느린 메뉴 무드 비교용으로 적합하나 race stem으로는 부족하다. |
| Race base / intensity 비교 | [Hot Roadway — MintoDog](https://opengameart.org/content/hot-roadway) | CC0, 160 BPM loop와 175 BPM climax 버전을 제공한다. 레이스 에너지의 기준 청음에는 좋지만 BPM이 달라 stem crossfade용 최종 자산으로는 쓰지 않는다. |
| Race alternate | [Bouncer — Of Far Different Nature](https://opengameart.org/content/bouncer-0) | CC0 electro beat이며 loopable 버전이 있다고 명시돼 있다. 현재의 차분한 야간 레이스보다 공격적으로 들릴 가능성을 먼저 확인한다. |
| Retro racing alternate | [StarShooter — Centurion_of_war](https://opengameart.org/content/starshooter) | CC0 OGG의 upbeat/retrowave 계열이다. 메뉴 또는 arcade-forward 방향을 비교하는 후보로만 둔다. |
| Synth reference | [Vision — Sudocolon](https://opengameart.org/content/vision) | CC0 electronic/trance, racing collection 분류다. 반복 경계와 장시간 피로도를 별도로 확인한다. |

CC0 후보를 선택하더라도 작가·원본 URL·라이선스 URL·취득일·가공 내용을 `assets/audio/source/<asset-id>/README.md`에 남긴다. 실제 번들에 들어간 파일만 `assetAttributions.ts`와 CREDITS에 추가한다.

## 외부 음원 채택 기준

첫 pass는 CC0만 허용한다. CC-BY는 작품명·작가·원본 URL·라이선스 전문·표시 문구를 확정하는 별도 승인 뒤에만 후보가 될 수 있다. CC-BY-NC, 라이선스 불명, 플랫폼 이용 약관만 있는 무료 음원은 사용하지 않는다.

외부 곡 하나를 stem처럼 잘라 서로 다른 곡과 섞지 않는다. 원곡의 loop 허용 여부와 전환 시 클릭·박자 어긋남을 확인하고, 필요하면 한 곡을 menu 또는 race의 단일 stereo loop로만 사용한다. 이 경우에도 엔진 사건이 들리도록 ducking은 적용한다.

## 저장·변환·검증

```text
assets/audio/
├── source/<asset-id>/       # 원본 파일과 URL·license README, 수정 금지
└── generated/<asset-id>/    # trim, loop-point, loudness 후보

public/audio/music/           # 승인된 runtime OGG, public URL로 복사
```

1. source 원본을 수정하지 않고 metadata를 기록한다.
2. generated에서 정확한 loop point, 20ms 이하 fade, stereo/mono 검토, loudness 후보를 만든다.
3. `public/audio/music/`에는 브라우저용 OGG만 둔다. WAV/FLAC 원본은 source에 남긴다. 파일명은 `musicAssetManifest.ts`와 같아야 한다.
4. Chrome Android와 iPhone Safari에서 사용자 Start 뒤 audio unlock, pause/hidden, retry, scene shutdown을 확인한다.
5. engine high RPM, BOV, tire scrub, guardrail impact, result sting과 동시에 재생해 clipping·masking이 없는지 확인한다.

완료 기준은 base/intensity 전환에 click·tempo drift가 없고, `MUSIC VOLUME`과 `MASTER VOLUME`이 모두 적용되며, 모든 외부 runtime 파일의 license metadata와 Credits 고지가 일치하는 것이다.
