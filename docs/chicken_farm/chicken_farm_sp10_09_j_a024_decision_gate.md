# SP-10-09-j-2 — A024 데이터 복구 또는 웹 정책 결정 게이트

> 상태: **결정 게이트 완료 / 구현 계약 대기**
>
> 대상: 다크가드(`n00U`)의 `A024`. 이 문서는 효과를 구현하거나 기본값을 채택하지 않는다.

## 현재 확정 근거

| 구분 | 확인된 사실 | 아직 미확정인 값 |
| --- | --- | --- |
| 맵 오브젝트 | `war3map.w3a`의 A024 base는 `Aadm`이고, override는 `acdn=5`, `atar=air,ground,ward,invu,vuln,tree`다. | base 데이터가 나온 게임 버전/패치와 상속 결과 |
| base family | `Aadm`은 Abolish Magic family이며 적의 positive buff 및 아군의 negative buff dispel, summoned-unit damage field를 가진다. | A024의 Data 값, 관계/선택 규칙, range, mana, autocast, 실제 피해 |
| 웹 런타임 | n00U의 A024 cast, dispel, cooldown/state 변화는 아직 없다. | buff disposition, dispel adapter, complete summoned classification |
| 동시 능력 | n00U는 A02I도 가진다. | A02I 효과 및 A024와의 중첩/제거 관계 |

상세한 맵 hash·override·runtime gap은 [A024 evidence](./chicken_farm_w3x_artifacts/sp10_09_j_a024_effect_evidence.json)에 고정한다. `Aadm`의 공개 family 설명이나 공개 기본값은 이 맵의 상속값을 증명하지 않는다.

## S — 버전 고정 source data 복구 경로

다음 자료가 같은 Warcraft III 데이터 버전·locale·patch임을 확인할 수 있어야 한다. 라이선스가 있는 사용 제공 데이터 또는 재현 가능하게 보관 가능한 원본만 채택한다.

1. `Aadm` base row가 들어 있는 AbilityData와 관련 profile/string data.
2. 버전, locale, file hash 및 추출 방법.
3. A024 `war3map.w3a` override를 base row에 적용한 merge 결과.
4. level 1 기준 target relation/allowed targets, range, mana, cooldown, cast point/backswing, autocast/priority와 모든 Data field.
5. `Adm1`(mana-loss)·`Adm2`(summoned-unit damage)처럼 family field mapping이 필요한 경우 field ID와 값을 함께 보존.

복구 결과는 base row와 map override를 분리해 artifact에 기록한다. 누락 field를 공개 기본값이나 이름으로 보완하지 않으며, 값이 확정된 뒤에만 `j-3`에서 source 구현 계약으로 전환한다.

### 다음 세션용: 제공할 Warcraft III 데이터 폴더

Warsmash source checkout 자체에는 게임 데이터가 들어 있지 않다. **합법적으로 설치한 Warcraft III에서 추출한, 아래 내부 경로를 보존한 별도 읽기 전용 폴더**를 제공한다. 전체 게임 설치 폴더, MPQ/CASC archive, 실행 파일, 계정 정보, map 이외의 자산을 이 저장소에 복사하거나 commit하지 않는다.

```text
<A024_WAR3_DATA_ROOT>/
  manifest.json                         # 아래 형식의 사용자 작성 provenance
  Units/
    AbilityData.slk                     # 필수: Aadm base row 및 mechanics field
    AbilityBuffData.slk                 # 필수: Aadm row가 참조하는 buff ID를 해석할 때
    CampaignAbilityFunc.txt              # Warsmash profile merge 입력
    CampaignAbilityStrings.txt
    CommonAbilityFunc.txt
    CommonAbilityStrings.txt
    HumanAbilityFunc.txt
    HumanAbilityStrings.txt
    NeutralAbilityFunc.txt
    NeutralAbilityStrings.txt
    NightElfAbilityFunc.txt
    NightElfAbilityStrings.txt
    OrcAbilityFunc.txt
    OrcAbilityStrings.txt
    UndeadAbilityFunc.txt
    UndeadAbilityStrings.txt
    ItemAbilityFunc.txt
    ItemAbilityStrings.txt
    AbilitySkin.txt                      # 있으면 포함; 없으면 manifest에 absent로 기록
```

`AbilityData.slk`만으로 base mechanics의 상당 부분은 확인할 수 있지만, 이 카드에서는 profile override와 buff 연결을 누락으로 오판하지 않기 위해 위의 complete set을 요구한다. `AbilityBuffData.slk`는 Aadm row가 buff를 참조하지 않음을 row에서 확인한 경우에만 생략할 수 있다. 게임 설치 방식이 archive 기반이라 위 파일을 개별 폴더로 노출할 수 없다면, Warsmash가 읽을 수 있는 resource source에서 **동일한 내부 경로**를 read-only로 제공하고 manifest에 그 방법을 적는다.

#### `manifest.json` 최소 형식

```json
{
  "purpose": "SP-10-09-j-3 A024/Aadm source-data recovery only",
  "gameEdition": "classic or reforged (actual value)",
  "gameVersion": "exact patch/build",
  "locale": "for example koKR or enUS",
  "sourceMethod": "licensed local installation; extraction/resource-provider method",
  "extractedAt": "YYYY-MM-DD",
  "files": {
    "Units/AbilityData.slk": "sha256:<64 lowercase hex>",
    "Units/AbilityBuffData.slk": "sha256:<64 lowercase hex> or absent-with-reason",
    "Units/CommonAbilityFunc.txt": "sha256:<64 lowercase hex>",
    "Units/CommonAbilityStrings.txt": "sha256:<64 lowercase hex>"
  },
  "notes": "known data-mods, locale fallback, or archive layering"
}
```

모든 listed file의 SHA-256을 `files`에 기록한다. 예시는 짧게 표시했지만 실제 manifest에는 제공한 모든 파일을 넣는다. map은 이미 repository evidence의 SHA-256 `254a8a461e515f562b4c631ccb457abff382dec7eb05811981cf24ed9749eb86`로 고정돼 있으므로, 다시 제공할 필요가 없다.

#### 제공 뒤의 재개 절차 (다음 에이전트용)

1. 데이터 폴더 경로와 `manifest.json`을 읽기 전용으로 확인하고, 각 file hash·version·locale을 manifest와 대조한다. hash/경로가 맞지 않으면 구현하지 않는다.
2. `AbilityData.slk`의 `Aadm` row에서 `code`, levels, `targs`, range, mana, cooldown, cast/timing, autocast/priority, buff ID와 모든 Data field를 원문 그대로 추출한다. `Adm1`/`Adm2`의 의미는 field metadata와 함께 확인한다.
3. profile TXT와 `AbilityBuffData.slk`를 merge해 Aadm의 참조·표시/보조 field를 확인한다. display string은 mechanics 값의 대체 근거가 아니다.
4. 기존 map evidence의 A024 override (`acdn=5`, `atar=air,ground,ward,invu,vuln,tree`)만 base row 위에 적용한다. 없는 map override를 만들지 않는다.
5. source row, profile/buff 참조, map override, final effective value를 새 A024 artifact에 **분리 기록**한다. map 제작 patch와 데이터 version이 다르면 `Warsmash selected dataset`, 원본 재현 아님으로 표시한다.
6. 위 값으로도 buff disposition, A02I interaction 또는 current web adapter가 정의되지 않으면 그 항목은 source 값과 별개로 웹 계약 결정 게이트에 남긴다. 이 단계에서 자동 구현하지 않는다.

Warsmash commit `f9e0aeed4be372d6016519d0e97b384aa873f374`는 `Units/AbilityData.slk`와 위의 ability profile TXT들을 로드한다. 이 데이터 bundle과 map override가 검증되면 `SP-10-09-j-3`에서 effect contract·pure resolver를 시작할 수 있다.

## W — 원본과 구별되는 웹 대체 정책 경로

아래 항목 전부가 명시적으로 승인되기 전까지 이 경로는 구현 권한이 아니다. `TBD`는 기본값을 의미하지 않는다.

| 정책 항목 | 승인할 값 |
| --- | --- |
| actor/enablement | n00U만인지, auto/manual 여부, difficulty gate |
| 대상 선택 | owner relation, 허용 unit type, invulnerable/ward 처리, range, 우선순위, 동시 대상 수 |
| buff/dispel | positive/negative 정의, buff inventory/model, dispel 순서와 제거 불가 상태 |
| summoned scope | summoned 판정의 canonical tag/registry, hero/ordinary/linked summon 포함 여부 |
| damage/resource | summoned damage, mana loss/회복 여부, damage attribution·면역·overkill 규칙 |
| timing | cooldown, cast/windup, 성공·실패·대상 소실 시 cooldown/mana 소비와 재시도 |
| lifecycle | 시전자/대상 사망, run reset, duplicate cast, A02I와의 중첩·제거·우선순위 |
| 관찰 | policy type, cast ID, 선택/제외 사유, 상태 전후를 snapshot/browser artifact로 노출할 범위 |

선택된 웹 정책은 source와 별도 `implemented_web_policy`로 표기하고, source 복원이 아님을 유지한다.

## j-2 결론과 재개 조건

현재 공개 근거는 family와 일부 field 의미까지만 뒷받침하며, A024의 실행 계약을 완성하지 못한다. 따라서 런타임 변경은 하지 않았다.

다음 **SP-10-09-j-3**은 (S) 검증 가능한 versioned source data, 또는 (W) 위의 완전한 웹 정책 승인 중 하나가 제공된 경우에만 진행한다. 상위 `SP-10-09-j`는 그 구현·순수/browser 검증이 끝날 때까지 완료가 아니다.
