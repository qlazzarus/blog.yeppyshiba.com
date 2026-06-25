# Apex Seoul 구현 로드맵

이 문서는 Phaser 4 기반 Pseudo 3D 드리프트 게임 Apex Seoul을 블로그 연재와 함께 완성하기 위한 구현 순서와 글감 범위를 정리한다.

Apex Seoul은 단순 레이싱 게임이 아니라 드리프트를 중심으로 한 아케이드 레이싱 게임이다.

프로젝트의 목표는 다음 세 가지다.

- Phaser 4 기반 Pseudo 3D 엔진 구현
- Drift Physics 구현
- 블로그 장기 연재 콘텐츠 확보

전체 연재는 14편 내외를 목표로 하며, 최종적으로 모바일 브라우저에서도 플레이 가능한 완성 게임을 공개한다.

---

# 프로젝트 정보

게임명

Apex Seoul

장르

Pseudo 3D Arcade Drift Racing

기술 스택

- Phaser 4
- TypeScript
- ECS Architecture
- Astro Integration

예정 경로

```text
게임:
/games/apex-seoul/

플레이:
/play/apex-seoul/

소스:
games/apex-seoul/
```

# 현재 구현 상태

- `games/apex-seoul/` Vite + Phaser 4 프로젝트 세팅
- `/games/apex-seoul/` 소개 페이지 연결
- `/play/apex-seoul/` 플레이 경로 연결
- Pseudo 3D Camera Resource 구현
- Horizon, FOV, Camera Height 기반 원근 투영 구현
- 직선 도로 형태의 카메라 검증용 projected ground 렌더링
- WASD/QE 디버그 카메라 입력 구현, 현재는 차량 접지감 검증을 위해 비활성화
- `RoadSegment` 기반 테스트 트랙 데이터 분리
- segment별 `curve`, `laneCount`, `length` 기반 도로 렌더링
- 직선-좌커브-우커브가 이어지는 첫 커브 렌더링 구현
- smoothstep 기반 curve ease-in/ease-out 테스트 트랙 구성
- 카메라 height/offset/pitch 입력 velocity 보간 적용
- Kenney Car Kit `race-future.glb` 기반 임시 플레이어 차량 sprite 3종 생성
- 후면, 후면 좌측, 후면 우측 차량 sprite 자동 렌더링 스크립트 추가
- 좌우 입력에 따른 차량 sprite 방향 전환
- 차량 lateral offset과 도로 중앙 복귀 추적 구현
- 차량 조향은 Left/Right 화살표로 분리
- 카메라 이동은 WASD와 Q/E로 분리했으나, 현재는 하단 주행 기준점 검증을 위해 잠금 처리
- 차량 anchor를 화면 고정값이 아니라 도로 투영점 기준으로 보정
- 차량 speed 상태 추가
- Up 화살표 악셀, Down 화살표 브레이크 입력 추가
- 입력 없음 상태에서 기본 cruise speed로 복귀
- 차량 speed와 camera z 이동 연결
- speed에 따른 약한 FOV 확장 적용
- 악셀/FOV 반응을 rate 기반으로 완만하게 조정
- 브레이크 감속을 즉시 0으로 수렴하지 않도록 완만하게 조정
- `Bugak Ridge Downhill` 단일 맵 방향 확정
- `RoadSegment.elevation` 기반 고저차 트랙 데이터 추가
- 도로 body, shoulder, lane mark 투영에 elevation 반영
- 차량 road anchor에 현재 도로 elevation 반영
- Phaser Graphics 기반 레트로 스트라이프 차량 그림자 추가
- 차량 y 기준점을 화면 하단에 강하게 고정하고 도로 투영 y는 보조 보정만 하도록 조정
- OSM/SRTM reference JSON 추출 및 내부 참고 자료화

# 다음 구현 방향

현재는 임시 차량 sprite, 좌우 입력 반응, 도로 anchor 보정, 기본 악셀/브레이크 속도 제어까지 들어갔다. 다음 단계에서는 코너 물리 디테일보다 고저차/elevation 렌더링을 먼저 구현한다.

이유는 현재 차량 sprite가 `rear`, `rear-left`, `rear-right` 3장뿐이라 코너 원심력, slip angle, 드리프트 각도 같은 세부 물리를 시각적으로 충분히 표현하기 어렵기 때문이다. 반면 고저차는 현재 pseudo 3D 엔진의 두 번째 큰 축이다. 커브가 도로 중심선의 x 변화라면, 고저차는 도로 중심선의 y 변화다.

장기 코스 방향은 북악 스카이웨이를 참고한 fictional downhill 맵으로 둔다. 코스명은 `Bugak Ridge Downhill`로 명명한다. 실제 도로를 1:1로 재현하기보다, 서울 산길 다운힐의 특징인 긴 내리막, 연속 코너, 짧은 직선, 도시 전망 구간을 게임용 segment로 재구성한다.

권장 구현 순서

1. `RoadSegment`에 elevation 추가
2. 언덕/내리막 테스트 트랙 렌더링
3. 차량 anchor를 경사 도로 투영에 맞게 조정
4. `Bugak Ridge Downhill` 코스 섹션 설계
5. 실제 차량 sprite 각도 확장
6. 코너 원심력, 바깥쪽 밀림, 도로 이탈 감속 구현
7. 드리프트 판정과 점수 시스템 구현

# 고저차 렌더링 플랜

## 목표

고저차 구현의 1차 목표는 "언덕처럼 보이는 도로"가 아니라 "다운힐 코스의 기본 감각"이다.

렌더링 결과는 다음 조건을 만족해야 한다.

- 도로 segment가 y elevation을 가진다.
- 오르막에서는 가까운 도로가 horizon을 더 가리고, 내리막에서는 먼 도로가 더 드러난다.
- 커브와 고저차가 동시에 적용된다.
- 차량 sprite anchor가 경사 변화에도 도로에 붙어 보인다.
- 고저차가 과해도 도로 polygon이 뒤집히거나 심하게 겹치지 않는다.

## 데이터 구조

`RoadSegment`에 `elevation` 또는 boundary elevation을 추가한다.

초기 구현에서는 segment 자체의 고도값 하나를 둔다.

```ts
export type RoadSegment = {
    curve: number;
    elevation: number;
    index: number;
    laneCount: number;
    length: number;
};
```

이후 필요하면 near/far boundary 고도 계산을 별도 배열로 분리한다.

```ts
type RoadBoundary = {
    centerX: number;
    elevation: number;
    worldZ: number;
};
```

렌더러는 segment body를 그릴 때 near boundary와 far boundary의 `centerX`, `elevation`, `worldZ`를 사용한다.

## 트랙 섹션 확장

현재 테스트 트랙 section은 curve만 보간한다.

```ts
type TrackSection = {
    endCurve: number;
    startCurve: number;
    segments: number;
};
```

고저차 구현 후에는 elevation도 같이 보간한다.

```ts
type TrackSection = {
    endCurve: number;
    endElevation: number;
    startCurve: number;
    startElevation: number;
    segments: number;
};
```

초기 테스트 트랙은 다음 흐름으로 구성한다.

- 짧은 평지
- 완만한 오르막
- 정상 직전 완만한 좌커브
- 긴 내리막
- 내리막 우커브
- S 커브 다운힐
- 짧은 평지 복귀

## Projection 변경

현재 `projectGroundPoint()`는 이미 `point.y`를 지원한다.

```ts
const worldY = point.y ?? 0;

return {
    x: viewport.width / 2 + (point.x - camera.lateralOffset) * scale,
    y: horizonY + (camera.height - worldY) * scale,
};
```

따라서 고저차 구현은 projection 함수보다 도로 렌더러 쪽 변경이 핵심이다.

현재는 도로 좌우점을 만들 때 y를 넘기지 않는다.

```ts
{ x: nearCenterX - ROAD_HALF_WIDTH, z: nearWorldZ }
```

고저차 적용 후에는 y를 함께 넘긴다.

```ts
{ x: nearCenterX - ROAD_HALF_WIDTH, y: nearElevation, z: nearWorldZ }
```

near/far elevation이 서로 다르면 segment 하나가 화면에서 경사를 가진 사다리꼴로 보인다.

## 렌더 순서와 clipping

고저차가 들어가면 segment y 좌표가 단조롭게 내려오지 않을 수 있다.

초기 구현에서는 다음 방어를 둔다.

- 기존처럼 먼 segment부터 가까운 segment 순서로 그린다.
- 투영된 far edge가 near edge보다 화면 아래로 내려오는 과한 segment는 스킵하거나 clamp한다.
- horizon 뒤쪽 또는 cameraSpaceZ가 너무 작은 점은 기존 visible 처리에 따른다.
- 내리막에서 먼 도로가 많이 보이더라도 draw segment 수를 갑자기 늘리지 않는다.

고저차가 자연스럽게 보이는지 판단하는 기준은 "물리 정확성"보다 "도로가 찢어져 보이지 않는가"다.

## 차량 anchor 보정

현재 차량은 카메라 앞쪽 일정 거리의 도로점을 투영해 anchor를 잡는다.

```ts
const roadAnchor = projectGroundPoint(
    {
        x: player.lateralOffset,
        z: this.cameraResource.z + PLAYER_ROAD_ANCHOR_DISTANCE,
    },
    this.cameraResource,
    viewport,
);
```

고저차가 들어가면 이 anchor point에도 현재 차량 위치의 elevation을 넣어야 한다.

1차 구현에서는 `getRoadElevationAt(track, camera.z + PLAYER_ROAD_ANCHOR_DISTANCE)` 헬퍼를 만든다.

```ts
const roadAnchor = projectGroundPoint(
    {
        x: player.lateralOffset,
        y: getRoadElevationAt(this.roadTrack, anchorZ),
        z: anchorZ,
    },
    this.cameraResource,
    viewport,
);
```

이렇게 해야 언덕에서 차량이 도로에 붙어 있는 느낌을 유지할 수 있다.

## 차량 화면 고정 원칙

현재 단계의 플레이어 차량은 월드 좌표를 그대로 따라 화면 위아래로 크게 움직이는 방식이 아니라, 화면 하단의 안정적인 주행 기준점에 붙어 있어야 한다.

이 방향은 긍정적이다. pseudo 3D 레이싱에서는 플레이어 차량이 화면 하단에서 안정적으로 보이고, 도로 polygon, horizon, FOV, 카메라 pitch가 움직이며 속도와 경사를 전달하는 편이 조작감이 좋다. 차량이 고저차를 그대로 따라 위아래로 크게 흔들리면 도로에 붙은 느낌보다 공중에 떠 있거나 카메라가 흔들리는 느낌이 먼저 온다.

구현 원칙

- 차량의 기본 y 위치는 화면 하단 anchor 범위 안에 둔다.
- 카메라 WASD/QE 디버그 이동이 있어도 차량은 플레이어 기준점에 붙어 있어야 한다.
- 도로 고저차는 차량 위치를 크게 흔드는 용도보다 도로 투영, horizon 관계, lane mark 압축/확장으로 표현한다.
- 차량 anchor는 현재 도로 elevation과 차량 앞 anchor elevation의 상대 차이를 사용한다.
- 최종 게임에서는 디버그 카메라 이동을 줄이고, 주행 카메라는 차량 기준으로 부드럽게 따라가게 한다.

즉 지금 구현 방향은 "차량 위치 고정 + 카메라와 도로 투영으로 경사 표현"을 기본으로 둔다.

## 경사별 차량 sprite 검토

차량 sprite는 지금 단계에서는 그대로 둔다. 다만 장기적으로는 고저차가 강해질수록 후면 sprite 한 세트만으로는 차가 도로 경사에 붙어 있다는 느낌이 부족해질 수 있다.

추가 후보

- 평지/기본 후면
- 다운힐 후면
- 업힐 후면
- 다운힐 후면 좌측/우측
- 업힐 후면 좌측/우측

다운힐 sprite는 차량의 roofline과 rear bumper가 조금 더 위에서 보이고, 앞쪽으로 기울어 내려가는 느낌이 있어야 한다. 반대로 업힐 sprite는 rear bumper가 더 크게 보이고, 차체가 위쪽으로 들리는 느낌이 필요할 수 있다.

다만 이 작업은 지금 하지 않는다. 현재 차량 sprite는 고저차 렌더링과 주행 anchor 검증용으로 충분하다. 먼저 도로 고저차, 그림자, 카메라 감각을 안정화한 뒤 전용 차량 sprite를 만든다.

## 차량 그림자 검토

차량 그림자는 Phaser 기능만으로도 1차 구현이 가능하다.

현재 게임은 `Phaser.CANVAS` 렌더러를 사용하므로 WebGL postFX나 shader 기반 그림자보다는, 차량 아래에 별도 `Graphics` 또는 타원 sprite를 두는 방식이 가장 단순하고 안정적이다. 단순 반투명 타원 하나만 두면 현대적인 placeholder처럼 보이기 쉬우므로, Apex Seoul에서는 납작한 타원 위에 가로 라인을 얹은 레트로 스트라이프 그림자를 기본 방향으로 둔다.

권장 방식

- 차량 image보다 낮은 depth에 `Graphics` 타원 그림자를 그린다.
- 기본 타원 위에 짧은 가로 stripe를 여러 줄 그려 레트로 scanline 느낌을 만든다.
- 그림자 위치는 차량 anchor와 같은 road anchor를 사용한다.
- 그림자 scale은 차량 sprite 크기와 roadAnchor scale을 기준으로 조정한다.
- 그림자 alpha는 속도, 경사, 화면 y 위치에 따라 약하게 보정한다.
- 강한 경사에서도 그림자는 차량에 붙은 느낌을 주되, 도로 polygon을 가리지 않도록 어둡고 낮은 alpha로 둔다.

초기 구현은 다음 정도면 충분하다.

```ts
shadow.fillStyle(0x000000, 0.28);
shadow.fillEllipse(anchorX, anchorY + spriteSize * 0.08, spriteSize * 0.45, spriteSize * 0.16);
```

차량 sprite 자체에 그림자를 bake하는 방식은 보류한다. 경사, 스케일, 회전에 따라 그림자 위치가 달라져야 하므로, 런타임 그림자가 더 다루기 쉽다. 나중에 전용 sprite를 만들 때도 차량 아래 고정 그림자는 약하게만 두고, 실제 접지감은 Phaser 런타임 그림자로 보강한다.

## 속도감 강화 후보

차량 기준점과 카메라가 안정화된 뒤에는 속도감을 별도 레이어로 쌓는다. 현재 우선순위는 차체를 흔드는 것보다 화면 주변, 도로 표식, 카메라 반응을 빠르게 만드는 쪽이다.

1차 후보

- lane mark 간격을 속도에 따라 더 빠르게 지나가게 보이도록 dash 길이와 draw cadence 조정
- 도로 가장자리 rumble strip 대비를 높여 주변부 흐름 강화
- 속도가 높을 때 FOV를 아주 천천히 넓히되, 악셀 입력 순간에는 짧은 impulse만 추가
- 차량 그림자를 속도에 따라 약간 길고 납작하게 변형
- HUD speed 숫자보다 도로 패턴과 카메라 반응으로 속도 전달

2차 후보

- 화면 가장자리 speed line 또는 낮은 alpha의 horizontal streak
- 멀리 있는 도로변 가드레일/가로등 반복 오브젝트
- 고속에서 horizon pitch를 아주 작게 낮춰 앞쪽으로 빨려 들어가는 느낌 추가
- 코너 진입 시 카메라 lateral follow를 아주 약하게 지연
- 브레이크 시 FOV 회복과 그림자/차체 반응을 조금 빠르게 처리

주의점

- 차량 자체 y 위치를 흔들어 속도감을 만들지 않는다.
- 카메라 shake는 마지막 단계에서만 아주 약하게 쓴다.
- 고저차와 속도감이 동시에 강하면 도로가 찢어져 보일 수 있으므로, 먼저 도로 표식과 주변 오브젝트 흐름부터 강화한다.

다음 구현 권장 순서

1. lane mark와 rumble strip의 속도감 튜닝
2. 도로변 반복 오브젝트 추가
3. FOV impulse와 horizon micro response 추가
4. 화면 가장자리 speed line 검토
5. 코너 진입 시 카메라 follow 지연 검토

## Bugak Ridge Downhill 방향

`Bugak Ridge Downhill`은 북악 스카이웨이에서 영감을 받은 가상 다운힐 코스다. 실제 GPS 데이터를 그대로 가져오기보다, OSM/DEM 추출 결과를 참고 자료로 보고 게임용 섹션을 직접 설계한다.

명명 원칙

- 실제 지명은 참고 맥락으로만 사용한다.
- 게임 내 코스명은 `Bugak Ridge Downhill`을 사용한다.
- 블로그와 문서에서는 "Bukak Skyway-inspired" 또는 "북악 스카이웨이 inspired"라고 설명한다.
- 실제 도로 좌표를 런타임 트랙으로 직접 배포하지 않는다.

핵심 감각

- 서울 산길 다운힐
- 연속 코너
- 짧은 직선 뒤 급한 코너
- 중간중간 도시 전망이 열리는 구간
- 고속보다 리듬과 라인 선택이 중요한 코스

초기 코스 섹션 예시

```text
start plateau
gentle downhill right
short straight
left hairpin downhill
viewpoint straight
right-left S curve
steeper downhill
recovery straight
finish curve
```

## OSM/DEM 참고 데이터 추출

실제 북악 스카이웨이는 게임 코스의 레퍼런스일 뿐, 최종 트랙 데이터의 원본이 아니다. 추출 스크립트는 곡률 리듬과 큰 고도 흐름을 확인하기 위한 내부 자료를 만든다.

자동화 명령

```bash
cd games/apex-seoul
npm run extract:bugak-reference
```

Overpass 서버가 느리거나 막혀 있으면 엔드포인트를 직접 지정한다.

```bash
npm run extract:bugak-reference -- --overpass-url https://overpass.kumi.systems/api/interpreter
```

출력 위치

```text
games/apex-seoul/assets/tracks/reference/bugak-ridge-downhill-reference.json
```

스크립트 역할

- OpenStreetMap Overpass API에서 `북악산로`, `북악스카이웨이`, `북악 팔각정` 관련 reference geometry를 가져온다.
- OpenTopodata SRTM 30m API에서 도로 주변 elevation sample을 가져온다.
- 결과 JSON에 OSM way, landmark, elevation sample, license note, game translation hint를 함께 기록한다.
- 이 JSON을 바로 게임 트랙으로 쓰지 않고, 사람이 보고 `TrackSection[]`을 작성한다.

라이선스/운영 원칙

- OSM 데이터는 ODbL 기반이므로 출처 표기와 파생 데이터 의무를 확인해야 한다.
- OSM reference를 블로그나 내부 산출물에 표시할 때는 `© OpenStreetMap contributors`와 ODbL 링크를 함께 둔다.
- SRTM/OpenTopodata elevation sample도 재배포 전 데이터셋 조건을 확인한다.
- 초기 구현에서는 추출 JSON을 참고 자료로만 사용하고, 게임 런타임에는 수동 작성한 fictional `TrackSection[]`만 포함한다.
- 블로그에는 "실제 도로를 참고했지만 게임용으로 재구성했다"고 명확히 쓴다.

게임 트랙 변환 규칙

- 실제 거리와 좌표를 보존하지 않는다.
- 곡률은 5~8개의 기억 가능한 구간으로 압축한다.
- 고도는 실제보다 1.3~1.8배 정도 과장할 수 있다.
- 팔각정 inspired 지점을 정상/전망 체크포인트로 두고, 이후 긴 내리막을 시작한다.
- 코너 난이도는 실제 도로의 법정/안전 속도가 아니라 게임의 리듬과 드리프트 판정 기준에 맞춘다.

이 코스는 나중에 도로변 오브젝트 구현과도 잘 맞는다.

- 가드레일
- 산길 가로등
- 도로 표지판
- 전망대 실루엣
- 멀리 보이는 서울 도심 스카이라인

## 구현 체크리스트

- `RoadSegment.elevation` 추가
- `TrackSection`에 start/end elevation 추가
- boundary elevation 누적/보간 함수 추가
- `projectRoadSlice()`가 near/far elevation을 받도록 변경
- shoulder/lane mark도 같은 elevation으로 투영
- 차량 anchor에 road elevation 적용
- 차량은 화면 하단 주행 기준점에 고정하고 카메라/도로 투영으로 경사 표현
- 차량 아래 Phaser Graphics 기반 레트로 스트라이프 그림자 추가
- HUD에 current elevation 또는 grade 표시
- 테스트 트랙을 hill/downhill 중심으로 교체
- 데스크톱/모바일 캡처로 도로 polygon 겹침 확인

## 구현 후 블로그 글감

제목 후보

```text
Phaser 4 Pseudo 3D 레이싱 게임 — RoadSegment에 고저차 넣고 다운힐 만들기
```

구현 범위

- `RoadSegment.elevation`
- elevation 보간 section
- 오르막/내리막 projection
- 차량 road anchor 보정
- 차량 화면 고정 원칙
- 런타임 차량 그림자
- `Bugak Ridge Downhill` 코스 설계 시작

## 완료된 1차 차량 렌더링 기준

- 플레이어 차량 sprite 표시
- 화면 하단 고정값이 아니라 도로 투영 anchor 기준으로 차량 위치 보정
- 좌우 입력에 따라 차량 x offset 변경
- 좌우 조향 입력에 따라 후면/후면 좌측/후면 우측 sprite 전환
- 차량 speed와 camera z 이동 연결
- camera lateral offset 조작과 player vehicle offset 조작 분리

## 임시 오픈소스 차량 에셋

Kenney `Racing Pack`은 2D top-down 차량 에셋이라 Apex Seoul의 pseudo 3D 후면 차량 표현과 맞지 않는다. 현재 구현에서는 뒤에서 보이는 느낌을 만들기 위해 Kenney `Car Kit`의 CC0 3D 차량 모델을 사용하고, Three.js 캡처 스크립트로 후면/후면 3/4 sprite를 렌더한다.

### 채택 에셋: Kenney Car Kit

- 출처: <https://kenney.nl/assets/car-kit>
- 제작자: Kenney
- 라이선스: Creative Commons CC0
- 분류: 3D, car, vehicle, transportation
- 사용 목적: 후면/후면 3/4 각도 플레이어 차량 sprite 렌더링

Kenney `Car Kit`은 3D GLB 모델을 포함하고 있어 pseudo 3D 차량 sprite 생성에 적합하다. 우선 `race-future.glb`를 기본 모델로 사용하고, `player-car-rear.png`, `player-car-rear-left.png`, `player-car-rear-right.png`를 자동 렌더링한다.

### 보류 후보: Kenney Racing Kit

- 출처: <https://kenney.nl/assets/racing-kit>
- 제작자: Kenney
- 라이선스: Creative Commons CC0
- 분류: 3D, racing, tile, track, vehicle, car
- 판단: 차량보다 트랙/레이싱 키트 성격이 강하므로, 플레이어 차량보다는 도로변 오브젝트나 트랙 구성 참고용으로 검토한다.

저장 위치

```text
games/apex-seoul/assets/vehicles/kenney-car-kit/
games/apex-seoul/assets/vehicles/kenney-car-kit/License.txt
games/apex-seoul/assets/vehicles/kenney-car-kit/README.md
games/apex-seoul/assets/vehicles/rendered/
```

자동화 명령

```bash
cd games/apex-seoul
npm run download:vehicles
npm run render:vehicles
```

렌더 산출물

```text
games/apex-seoul/assets/vehicles/rendered/player-car-rear.png
games/apex-seoul/assets/vehicles/rendered/player-car-rear-left.png
games/apex-seoul/assets/vehicles/rendered/player-car-rear-right.png
```

에셋 반입 체크리스트

- 원본 다운로드 URL 기록
- 다운로드 날짜 기록
- 원본 라이선스 파일 또는 라이선스 문구 보관
- 사용한 파일명과 게임 내 용도 기록
- 후면 렌더 각도, 카메라 FOV, 조명 설정 기록
- 블로그 글 하단에 에셋 출처 표기

# 완료된 연재

## 1편

[Phaser 4로 Pseudo 3D 레이싱 게임 만들기 — Apex Seoul 카메라 구현](/article/phaser4-apex-seoul-pseudo-3d-camera/)

구현 범위

- `games/apex-seoul/` 프로젝트 세팅
- Astro `/games/apex-seoul/`, `/play/apex-seoul/` 연결
- Pseudo 3D Camera Resource
- Horizon, FOV, Camera Height 기반 원근 투영
- 직선 도로 형태의 카메라 검증용 projected ground
- 카메라 z 스크롤

---

## 2편

[Phaser 4 Pseudo 3D 레이싱 게임 — RoadSegment로 커브 도로 만들기](/article/phaser4-apex-seoul-roadsegment-curve-rendering/)

구현 범위

- `RoadSegment`, `RoadTrack`, 테스트 트랙 데이터 구조
- segment별 `curve`, `laneCount`, `length` 기반 도로 렌더링
- 직선-좌커브-우커브 테스트 트랙
- smoothstep 기반 curve ease-in/ease-out
- boundary center 누적 방식의 커브 렌더링
- 카메라 height/offset/pitch 입력 velocity 보간

---

## 3편

[Phaser 4 Pseudo 3D 레이싱 게임 — 차량 스프라이트와 속도 조작 넣기](/article/phaser4-apex-seoul-player-car-speed-control/)

구현 범위

- Kenney Car Kit 기반 임시 차량 sprite 생성
- 차량 sprite 렌더링 자동화
- 후면/후면 좌측/후면 우측 차량 이미지 적용
- 차량 road anchor 보정
- Left/Right 조향 입력
- Up 악셀, Down 브레이크
- 입력 없음 상태의 cruise speed 복귀
- 속도 기반 camera z 이동과 약한 FOV 보정

---

## 4편

[Phaser 4 Pseudo 3D 레이싱 게임 — 북악 스카이웨이 inspired 다운힐 만들기](/article/phaser4-apex-seoul-downhill-elevation-rendering/)

구현 범위

- `Bugak Ridge Downhill` 단일 맵 방향 확정
- OSM/SRTM reference 추출
- `RoadSegment.elevation` 추가
- 고저차 기반 도로 projection
- 차량 화면 하단 기준점 고정
- 디버그 카메라 입력 잠금
- Phaser Graphics 기반 레트로 스트라이프 차량 그림자

---

# 시리즈 공통 태그

```yaml
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - ecs
    - pseudo-3d
    - game-physics
    - racing-game
```

---

# 차량 구성

## Raven Coupe

입문용 후륜구동 쿠페

- 출력 ★★★
- 그립 ★★★★
- 드리프트 ★★★★★

---

## Vortex GT

고출력 GT

- 출력 ★★★★★
- 그립 ★★★
- 드리프트 ★★★

---

## Apex S

밸런스형 스포츠 세단

- 출력 ★★★★
- 그립 ★★★★
- 드리프트 ★★★★

---

# 향후 자체 차량 이미지 생성 계획

임시 오픈소스 차량으로 플레이 감각을 먼저 검증한 뒤, Apex Seoul 전용 차량 이미지를 생성해서 교체한다.

## ChatGPT 앱 사용 검토

전용 차량 이미지는 우선 ChatGPT 앱에서 생성하는 방식을 권장한다.

이유는 다음과 같다.

- 차량 디자인은 초기에는 반복 피드백이 중요하다.
- ChatGPT Images는 대화 맥락을 유지하면서 이미지를 다듬을 수 있다.
- 배경 투명 이미지 생성과 기존 이미지 편집을 지원한다.
- 프롬프트를 한 번에 고정하기보다, 생성 결과를 보고 차체 비율과 색상, 각도, 그림자 강도를 조정하기 좋다.

다만 최종 빌드 파이프라인까지 자동화해야 할 때는 API 기반 이미지 생성으로 옮기는 편이 낫다. 블로그 연재와 소규모 게임 아트 탐색 단계에서는 ChatGPT 앱으로 후보 이미지를 만들고, 선택된 결과와 최종 프롬프트를 문서에 남기는 방식이 더 빠르다.

참고 자료

- ChatGPT 이미지 생성 도움말: <https://help.openai.com/en/articles/8932459-creating-images-in-chatgpt>
- 4o 이미지 생성 소개: <https://openai.com/index/introducing-4o-image-generation/>
- OpenAI API 이미지 생성 문서: <https://platform.openai.com/docs/guides/image-generation>

## 생성 목표

- pseudo 3D 레이싱 게임 화면 하단에 배치할 플레이어 차량 sprite
- 후면 3/4 시점 또는 거의 후면 시점
- 도로와 조명에 맞는 아케이드 레이싱 스타일
- 배경 투명 PNG
- 게임 내 크롭을 고려한 넉넉한 여백
- 실제 브랜드, 로고, 상표를 사용하지 않는 가상 차량

## 기본 프롬프트

```text
Create a transparent-background 2D game sprite of an original fictional sports coupe for a pseudo-3D arcade drift racing game named "Apex Seoul".

Camera/view:
- rear three-quarter view, slightly top-down
- the car is facing away from the viewer, aligned toward the road horizon
- centered composition

Design:
- compact Korean urban night-racing sports coupe
- no real-world brand logos, no readable trademarks
- wide body kit, clean aerodynamic silhouette
- subtle cyber Seoul street-racing mood
- glossy deep graphite body with restrained red and cool white accents
- visible rear lights, rear bumper, rear window, roofline, and rear wheels

Rendering style:
- polished game sprite
- semi-realistic arcade style
- crisp silhouette
- readable at small size
- soft under-car shadow separated as transparent pixels if possible
- no background, transparent PNG

Output:
- square canvas
- high resolution
- leave padding around the car for rotation and scaling
```

## Raven Coupe 변형 프롬프트

```text
Create a transparent-background 2D game sprite of the "Raven Coupe", an original fictional entry-level rear-wheel-drive drift car for Apex Seoul.

Use a rear three-quarter, slightly top-down camera view. The car should face away from the viewer as if driving into a pseudo-3D racing road.

The Raven Coupe should feel lightweight, agile, and beginner-friendly:
- short coupe body
- clean drift tuner silhouette
- graphite black paint
- small red accent stripe
- bright but simple rear lights
- modest wing
- no real brand marks or readable text

Style: polished arcade racing game sprite, crisp edges, transparent background, readable at small on-screen size, centered on a square canvas with padding.
```

## Vortex GT 변형 프롬프트

```text
Create a transparent-background 2D game sprite of the "Vortex GT", an original fictional high-power GT drift car for Apex Seoul.

Rear three-quarter, slightly top-down view. The car faces away from the viewer toward the road horizon.

The Vortex GT should feel powerful and slightly aggressive:
- long GT body
- wide rear stance
- larger rear wing
- deep metallic blue-black paint
- cool white racing accents
- strong rear diffuser
- bright rear lights
- no real-world logos or readable trademarks

Style: semi-realistic arcade racing sprite, clean silhouette, transparent PNG, centered square canvas, enough padding for in-game rotation.
```

## Apex S 변형 프롬프트

```text
Create a transparent-background 2D game sprite of the "Apex S", an original fictional balanced sports sedan for Apex Seoul.

Rear three-quarter, slightly top-down view. The car faces away from the viewer, centered for a pseudo-3D arcade racing game.

The Apex S should feel balanced, precise, and modern:
- sporty sedan body
- stable stance
- subtle aero kit
- pearl white body with black roof
- restrained red and cyan accent details
- clean rear lights
- no real-world logos, badges, or readable text

Style: polished arcade game sprite, crisp outline, transparent background, readable at small size, square canvas with padding.
```

## 후처리 메모

- 결과 이미지에서 배경이 완전히 투명한지 확인한다.
- 차량이 화면 하단 anchor에 맞게 아래쪽이 너무 잘리지 않았는지 확인한다.
- sprite 회전 시 여백이 충분한지 확인한다.
- 후면 시점이 약하면 "more rear-facing, less side view"로 재생성한다.
- 너무 사실적이면 "cleaner arcade game sprite, stronger silhouette"를 추가한다.
- 로고나 문자 비슷한 요소가 나오면 제거 요청 후 재생성한다.

---

# 남은 연재 계획

## 5편

북악산 스카이웨이 다운힐 코스 프로토타입

주제

- Downhill Course Design
- Bugak Ridge Downhill Sections
- Hairpin
- Viewpoint Straight
- S Curve

결과

- 실제 도로 1:1 재현이 아닌 게임용 다운힐 섹션 구성
- 긴 내리막, 연속 코너, 짧은 직선 조합
- 코스 identity 확정
- 도로변 오브젝트 후보 정리

---

## 6편

차량 sprite 개선

주제

- Custom Vehicle Sprite
- Additional Steering Frames
- Drift Angle Frames
- Brake/Boost Pose

결과

- 임시 Kenney 차량에서 Apex Seoul 전용 차량으로 교체 준비
- 조향/드리프트 표현 가능한 sprite 각도 확장
- 차량별 시각 정체성 정리

---

## 7편

코너 원심력과 도로 이탈

주제

- Steering
- Cornering
- Track Boundary
- Curve Pull
- Off-road Slowdown

결과

- 속도와 커브에 따른 바깥쪽 밀림
- 도로 밖 감속
- 속도에 따른 조향 반응 변화
- downhill 코스에서 코너링 감각 검증

---

## 8편

Drift Physics

주제

- Velocity Direction
- Heading
- Slip Angle

결과

- 드리프트 판정

시리즈 핵심 콘텐츠

---

## 9편

Drift Score

주제

- Combo
- Angle Bonus
- Speed Bonus

결과

- 점수 시스템

---

## 10편

Tire Mark와 Smoke

주제

- Particle
- Skid Mark
- Camera Shake

결과

- 시각 효과 강화

---

## 11편

차량 선택

주제

- Raven Coupe
- Vortex GT
- Apex S

결과

- 차량 선택 화면

---

## 12편

AI 차량과 장애물

주제

- Traffic
- Near Miss
- Collision

결과

- 플레이 요소 추가

---

## 13편

모바일 대응

주제

- Landscape
- Touch Input
- Responsive HUD

결과

- 모바일 플레이 가능

---

## 14편

기록 저장과 최종 Polish

주제

- localStorage
- Best Score
- Best Combo
- UI 정리

결과

- 공개 가능한 완성 버전

---

# 외전 후보

## Pseudo 3D 원리 분석

검색 키워드

- phaser pseudo 3d
- outrun renderer
- javascript pseudo 3d

---

## ECS로 레이싱 게임 만들기

검색 키워드

- phaser ecs
- entity component system

---

## Drift Physics 이해하기

검색 키워드

- slip angle
- drift physics
- racing game physics

---

# MVP 기준

최초 공개 버전

- 직선 도로
- 커브
- 고저차/다운힐
- 차량 이동
- 드리프트 판정
- 드리프트 점수
- 차량 3종
- localStorage 기록

---

# 핵심 설계 원칙

- 게임 규칙은 Phaser에 의존하지 않는다.
- ECS World는 순수 TypeScript로 유지한다.
- Scene은 입력과 렌더링 Adapter 역할만 담당한다.
- Pseudo 3D 렌더링은 Render System으로 분리한다.
- 차량 데이터는 Config 기반으로 관리한다.
- Drift Physics를 프로젝트의 핵심 시스템으로 둔다.

최종 목표는 단순 기술 데모가 아니라 블로그 연재와 함께 성장하는 완성형 웹 게임이다.
