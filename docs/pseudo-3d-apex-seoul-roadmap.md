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

차량 sprite는 현재 구현에서는 그대로 둔다. 다만 장기적으로는 고저차가 강해질수록 후면 sprite 한 세트만으로는 차가 도로 경사에 붙어 있다는 느낌이 부족해질 수 있다.

추가 후보

- 평지/기본 후면
- 다운힐 후면
- 업힐 후면
- 다운힐 후면 좌측/우측
- 업힐 후면 좌측/우측

다운힐 sprite는 차량의 roofline과 rear bumper가 조금 더 위에서 보이고, 앞쪽으로 기울어 내려가는 느낌이 있어야 한다. 반대로 업힐 sprite는 rear bumper가 더 크게 보이고, 차체가 위쪽으로 들리는 느낌이 필요할 수 있다.

다만 이 작업은 지금 바로 전체 제작하지 않는다. 현재 차량 sprite는 고저차 렌더링과 주행 anchor 검증용으로 충분하다. 먼저 도로 고저차, 그림자, 카메라 감각을 안정화한 뒤, 아래의 `아웃런 스타일 차량 sprite 구성 검토` 기준에 맞춰 `base body sprite`, `flipX`, `effect overlay`를 분리해서 확장한다.

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
shadow.fillEllipse(
    anchorX,
    anchorY + spriteSize * 0.08,
    spriteSize * 0.45,
    spriteSize * 0.16,
);
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

WebGL / Phaser effect 후보

- 현재 `Apex Seoul`은 pseudo 3D 도로를 `Phaser.Graphics`로 직접 그리는 구조라, 풀스크린 motion blur보다 화면 주변부 effect가 더 안전하다.
- `Phaser.CANVAS`에서는 lane mark, rumble strip, speed line 같은 도형 기반 연출을 먼저 넣고, `WebGL` 전환 이후 postFX 성격의 효과를 검토한다.
- 1차 WebGL 후보는 화면 좌우 가장자리 `edge speed line` 또는 낮은 alpha의 streak overlay다. 도로 본체를 흐리지 않고 속도감을 추가하기 쉽다.
- 2차 WebGL 후보는 악셀 입력 순간에만 짧게 반응하는 `FOV impulse + peripheral distortion` 조합이다. 지속 blur보다 읽기성과 도로 라인을 덜 해친다.
- 3차 WebGL 후보는 차량 하단 또는 도로 근거리 영역에만 제한적으로 거는 `heat haze / refractive streak`다. 공기가 갈리는 느낌은 줄 수 있지만 과하면 pseudo 3D 도로 경계가 깨져 보일 수 있다.
- 외곽 `chromatic fringe`나 vignette pulse는 보조 효과로만 쓰고, HUD 텍스트와 중앙 도로 판독성을 해치지 않도록 적용 범위를 제한한다.

주의점

- 차량 자체 y 위치를 흔들어 속도감을 만들지 않는다.
- 카메라 shake는 마지막 단계에서만 아주 약하게 쓴다.
- 고저차와 속도감이 동시에 강하면 도로가 찢어져 보일 수 있으므로, 먼저 도로 표식과 주변 오브젝트 흐름부터 강화한다.
- 장시간 유지되는 풀스크린 blur는 문서상 후보에서 후순위로 둔다. 현재 도로 렌더는 lane mark와 shoulder 대비가 중요한데, blur가 들어가면 속도감보다 가독성 손실이 먼저 온다.

다음 구현 권장 순서

1. lane mark와 rumble strip의 속도감 튜닝
2. 도로변 반복 오브젝트 추가
3. FOV impulse와 horizon micro response 추가
4. 필요 시 `WebGL` 전환 후 화면 가장자리 speed line 검토
5. 코너 진입 시 카메라 follow 지연 검토
6. peripheral distortion 또는 heat haze 계열 보조 effect 검토

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

## 단방향 런 구조

`Bugak Ridge Downhill`은 순환 트랙보다 단방향 다운힐 런에 가깝게 설계한다. 따라서 코스 시작과 종료를 명확하게 보이는 표식으로 두고, 플레이어가 현재 어디쯤 내려왔는지 바로 읽을 수 있어야 한다.

구성 원칙

- 코스 시작부에 `start line`을 둔다.
- 코스 마지막 구간에 `finish line`을 둔다.
- 중간에는 2~4개의 `check line`을 둬서 구간 진행감을 만든다.
- 현재 단계의 체크라인은 `time check` 용도가 아니라, 단순 통과 기준점과 코스 리듬 표식으로만 사용한다.
- 한 런의 목표는 랩 반복이 아니라 정상에서 시작해 피니쉬까지 내려오는 완결된 주행이다.

라인 배치 방향

- `start line`은 출발 직후 짧은 직선에 둬서 첫 입력과 동시에 라인을 넘는 감각을 만든다.
- `check line`은 헤어핀 전후, 전망 구간 진입부, 긴 내리막 시작점처럼 섹션 전환이 분명한 위치에 둔다.
- `finish line`은 마지막 코너를 빠져나온 뒤 짧은 안정 구간에서 통과하게 둔다. 코너 안쪽에서 바로 종료되지 않게 한다.
- 각 라인은 도로 위 체커 밴드, overhead 간판, 작은 roadside marker 가운데 현재 렌더 구조에 맞는 가장 단순한 방식부터 적용한다.

체크라인 역할

- 플레이어에게 "지금 코스의 어느 지점을 통과했는가"를 알려준다.
- 미니맵과 함께 다음 섹션 기대감을 만든다.
- 나중에 타임어택, 섹터 기록, 리스타트 포인트를 붙일 수 있는 확장 지점으로 남긴다.
- 현재 단계에서는 시간 측정, 보너스 시간, 카운트다운 연장은 넣지 않는다.

HUD / 미니맵 방향

- 우측 상단에 작은 고정형 `mini map`을 둔다.
- 미니맵은 실제 지도처럼 자세히 그리기보다 코스 중심선의 축약 라인만 보여준다.
- `start`, `finish`, `check line` 위치를 미니맵 위에 작게 표시한다.
- 플레이어 위치는 점 또는 짧은 마커 하나로 표시한다.
- 첫 버전에서는 회전 미니맵보다 고정형 프로파일이 낫다. 본 화면 horizon과 도로 판독성을 해치지 않도록 크기를 작게 유지한다.

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
- `start line`, `finish line`, 중간 `check line` 배치
- 우측 상단 고정형 `mini map` 추가
- 미니맵에 플레이어 위치와 `check line` 마커 표시
- 체크라인은 현재 단계에서 시간 측정 없이 통과 상태만 관리
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

- 엔진 성격: `NA`
- 컨셉 기준: `FT86 inspired`
- 출력 ★★★
- 그립 ★★★★
- 드리프트 ★★★★★
- 응답성 ★★★★★
- 메모: 짧은 wheelbase와 자연흡기 응답을 살린, 가볍고 날렵한 FR 쿠페 감각.

---

## Vortex GT

고출력 GT

- 엔진 성격: `Twin Turbo`
- 컨셉 기준: `Stinger inspired`
- 출력 ★★★★★
- 그립 ★★★
- 드리프트 ★★★
- 부스트감 ★★★★★
- 메모: 긴 GT 비율과 트윈터보 고속 가속을 강조한, 묵직하지만 폭발력 있는 그랜드 투어러 감각.

---

## Apex S

밸런스형 스포츠 세단

- 엔진 성격: `Single Turbo`
- 컨셉 기준: `G70 inspired`
- 출력 ★★★★
- 그립 ★★★★
- 드리프트 ★★★★
- 안정감 ★★★★
- 메모: 짧은 스포츠 세단 비율과 싱글터보 중속 토크를 살린, 단단하고 정제된 응답.

---

## 차량 성격 차별화 방향

차량 3종은 최고속도만 다르게 두기보다, `NA`와 `Turbo`의 체감 차이를 주행 감각과 UI에서 함께 드러내는 편이 좋다. Apex Seoul은 시뮬레이터보다 아케이드 드리프트 게임이므로, 완전한 엔진 모델보다 "보는 순간 다른 차처럼 느껴지는 drivetrain 표현"이 더 중요하다.

핵심 원칙

- 차량 차이는 `절대 출력`보다 `스로틀 응답`, `RPM 상승감`, `변속 리듬`, `boost 연출`에서 먼저 느껴지게 한다.
- 현재 단계의 `RPM`, `gear`, `boost`는 정밀 물리보다 플레이 감각용 상태값으로 관리한다.
- `NA` 차량은 선형적이고 즉각적인 응답을, `Single Turbo`는 두터운 중속 토크를, `Twin Turbo`는 고속에서 크게 터지는 감각을 강조한다.
- 같은 코스를 달려도 차량마다 "언제 힘이 붙는가"가 다르게 읽혀야 한다.

차량별 감각 초안

- `Raven Coupe`: `FT86 inspired` 경량 `NA` 입문차. 변속 실패 페널티가 약하고, 리듬 게임처럼 다루기 쉽다.
- `Vortex GT`: `Stinger inspired` `Twin Turbo` GT. boost zone에 들어가면 속도감 연출과 함께 차가 크게 살아난다.
- `Apex S`: `G70 inspired` `Single Turbo` 스포츠 세단. 저회전부터 두터운 토크가 붙고, 안정적인 라인 유지가 장점이다.

## RPM / Shift / Boost UI 방향

현재 HUD는 디버그 정보 중심이지만, 장기적으로는 차량 성격을 보여주는 주행 UI로 전환한다.

권장 구성

- 화면 하단 또는 하단 우측에 `tachometer`를 둔다.
- 현재 `gear`를 큰 숫자로 표시한다.
- `NA` 차량은 RPM band와 redline 근처 색 변화를 중심으로 보여준다.
- `Single Turbo`와 `Twin Turbo` 차량은 RPM과 함께 `boost gauge` 또는 `boost bar`를 추가한다.
- 변속 순간에는 짧은 RPM drop, 배기/부스트 연출, speed effect 반응을 같이 준다.

UI 감성 방향

- `Raven Coupe`: 단순한 아날로그 계기 느낌. 바늘이 빠르게 튀어 오르는 감각.
- `Vortex GT`: 트윈터보 압력이 차오르는 디지털/혼합형 계기. boost 진입 시 계기 색과 주변 속도 연출이 함께 반응.
- `Apex S`: 단정한 스포츠 세단 계기 위에 싱글터보 boost 정보가 얹히는 균형형 UI.

구현 원칙

- 1차는 `자동 변속 + RPM 시각화`부터 시작한다.
- 2차에서 `Single Turbo`, `Twin Turbo` 차량에 boost 상태와 boost UI를 붙인다.
- 수동 변속 입력은 후순위로 둔다. 먼저 차량 선택만으로 주행 감각 차이가 읽히는 것이 우선이다.
- boost는 실제 엔진 압력 재현보다, 특정 RPM/스로틀 조건에서 힘이 살아나는 아케이드 상태값으로 구현한다.

주의점

- drivetrain 시스템이 도로, 체크라인, 미니맵보다 먼저 무거워지면 구현축이 분산된다.
- 따라서 실제 구현은 `코스 구조와 HUD 뼈대`가 잡힌 뒤 시작하는 편이 안전하다.
- UI가 늘어나더라도 horizon과 road readability를 해치지 않도록 HUD 면적을 제한한다.

---

# 향후 자체 차량 이미지 생성 계획

임시 오픈소스 차량으로 플레이 감각을 먼저 검증한 뒤, Apex Seoul 전용 차량 이미지를 생성해서 교체한다.

## ChatGPT 앱 사용 검토

전용 차량 이미지는 한때 ChatGPT 앱의 image-to-image 생성도 검토했지만, 런타임 asset의 기본 제작 경로에서는 제외한다. 생성 방식이 pose order, 빈 cell, anchor, alpha, 차량 디테일을 안정적으로 유지하지 못했기 때문이다. ChatGPT 앱은 스타일 탐색, 블로그 설명용 이미지, 수동 paint-over reference 후보를 만들 때만 사용한다.

이유는 다음과 같다.

- 차량 디자인 탐색 초기에는 반복 피드백이 빠르다.
- ChatGPT Images는 대화 맥락을 유지하면서 후보 이미지를 다듬을 수 있다.
- 컨셉 이미지나 paint-over reference에는 충분히 유용하다.
- 하지만 최종 sprite sheet에서는 cell마다 차체 디테일이 바뀌거나, 12번째 빈 cell을 채우거나, alpha/noise가 흔들릴 수 있다.
- 같은 3D pose sheet를 기준 입력으로 두어도 steer/spin/uphill/downhill 차이를 안정적으로 보존하지 못할 수 있다.

따라서 최종 빌드 파이프라인은 이미지 생성 API가 아니라 deterministic Three.js render + pixel pass로 둔다. 블로그 연재와 소규모 게임 아트 탐색 단계에서만 ChatGPT 앱 후보 이미지와 프롬프트를 보조 자료로 남긴다.

참고 자료

- ChatGPT 이미지 생성 도움말: <https://help.openai.com/en/articles/8932459-creating-images-in-chatgpt>
- 4o 이미지 생성 소개: <https://openai.com/index/introducing-4o-image-generation/>
- OpenAI API 이미지 생성 문서: <https://platform.openai.com/docs/guides/image-generation>

## 생성 목표

- pseudo 3D 레이싱 게임 화면 하단에 배치할 플레이어 차량 sprite sheet
- 입력 3D pose sheet와 같은 grid, pose order, per-cell alignment 유지
- 실제 런타임 기준은 오른쪽 source pose와 `flipX`로 만든 왼쪽 steer/spin/downhill/uphill 상태
- 도로와 조명에 맞는 아웃런풍 아케이드 레이싱 스타일
- 배경 투명 PNG 또는 후처리로 투명화 가능한 단색 배경
- 게임 내 크롭과 스케일링을 고려한 넉넉한 셀 여백
- 실제 브랜드, 로고, 상표를 사용하지 않는 가상 차량

## 차량 정체성 문구

개별 sprite를 직접 생성하는 프롬프트는 더 이상 기본 경로로 쓰지 않는다. 아래 문구는 `3D pose sheet 기반 sprite sheet 변환 프롬프트` 뒤에 붙이는 차량 정체성 블록으로만 사용한다.

Raven Coupe

```text
Vehicle identity: Raven Coupe, an original fictional lightweight NA rear-wheel-drive compact FR coupe.
It is inspired by the proportions and spirit of an FT86-style compact driver car, but must remain clearly original and not a copy.
Keep it short, agile, beginner-friendly, and grounded: a low two-door compact driver coupe with a long-ish hood, short clean rear deck, compact cabin, simple rear lights, no rear wing or spoiler, graphite body, and restrained red accents.
It should feel like an affordable street drift coupe rather than a futuristic hypercar, concept car, exotic race car, or sci-fi vehicle.
Avoid wedge-shaped supercar proportions, exposed race-car wheels, jet-like bodywork, glowing future-tech panels, oversized aero, and cyberpunk concept-car details.
No real brand marks, readable text, numbers, or badges.
```

Vortex GT

```text
Vehicle identity: Vortex GT, an original fictional twin-turbo high-power fastback GT.
It is inspired by the stance and grand touring attitude of a Stinger-like twin-turbo liftback, but must remain clearly original and not a copy.
Keep it long, wide, powerful, slightly aggressive, with a strong rear diffuser, bright rear lights, deep blue-black body, and cool white accents.
No real brand marks, readable text, numbers, or badges.
```

Apex S

```text
Vehicle identity: Apex S, an original fictional single-turbo balanced sport sedan.
It is inspired by the character of a G70-style compact sport sedan, but must remain clearly original and not a copy.
Keep it precise, stable, modern, with short-deck sedan proportions, pearl white body, black roof, clean rear lights, and restrained red/cyan accents.
No real brand marks, readable text, numbers, or badges.
```

## image-to-image reference 프롬프트

개별 프레임을 따로 생성하면 차량 디테일이 흔들릴 가능성이 크다. image-to-image를 보조 reference로 쓸 때도 3D pose sheet를 먼저 만들고, 그 이미지를 입력으로 넣어 한 번에 retro sprite sheet로 변환한다. 단, 이 경로는 최종 런타임 asset 제작 경로가 아니다.

초기 pose sheet는 스프라이트 수를 아끼기 위해 오른쪽 방향 원본만 만든다. 런타임에서는 오른쪽 원본을 `flipX`해서 왼쪽 조향, 스핀, 고저차 상태로 재사용한다.

기본 source pose 구성

```text
cell 1: center rear view
cell 2: rear-right steering angle, moderate
cell 3: rear-right steering angle, strong
cell 4: spin-right, moderate
cell 5: spin-right, strong
cell 6: downhill center rear view
cell 7: downhill rear-right steering angle, moderate
cell 8: downhill rear-right steering angle, strong
cell 9: uphill center rear view
cell 10: uphill rear-right steering angle, moderate
cell 11: uphill rear-right steering angle, strong
```

권장 3D pose 차이

```text
center: 0 degrees
steer-right-1: about 22 to 25 degrees from rear
steer-right-2: about 42 to 45 degrees from rear
```

`steer-right-1`과 `steer-right-2`는 픽셀풍 변환 뒤에도 구분되어야 한다. 3D 입력 단계에서 차이를 충분히 벌리지 않으면 image-to-image 단계가 두 셀을 거의 같은 포즈로 해석한다. 이 문제가 반복되면 image-to-image를 더 시도하지 말고 Three.js source model과 직접 pixel pass를 개선한다.

보조 reference 변환 프롬프트

```text
Transform the attached 3D vehicle pose sheet into a retro arcade racing sprite sheet for a pseudo-3D drift racing game named "Apex Seoul".

Preserve the exact layout, pose order, silhouette, vehicle proportions, camera angle, and per-cell alignment from the input pose sheet.

The source pose cells are:
1. center rear view
2. rear-right steering angle, moderate
3. rear-right steering angle, strong
4. spin-right, moderate body yaw
5. spin-right, strong body yaw
6. downhill center rear view, nose pitched slightly downward
7. downhill rear-right steering angle, moderate
8. downhill rear-right steering angle, strong
9. uphill center rear view, nose pitched slightly upward
10. uphill rear-right steering angle, moderate
11. uphill rear-right steering angle, strong

Left-facing steer, spin, downhill, and uphill sprites will be created later with horizontal flipX in the game runtime.
Do not add left-facing frames.

Important pose distinction:
- The second cell and third cell must not look like duplicates.
- The third cell must show more side body, stronger wheel separation, and a more diagonal rear bumper than the second cell.
- The fourth and fifth cells must read as spin/recovery poses, not normal steering duplicates.
- Downhill and uphill rows must keep the same yaw order while changing only the body pitch and contact feel.
- Preserve the visible difference between the moderate rear-right angle and the strong rear-right angle.

Target style:
- Outrun inspired retro arcade racing sprite
- crisp pixel-art-like 2D game sprite
- limited color palette
- strong readable silhouette
- clean rear lights, rear window, roofline, bumper, and wheels
- subtle dithering and hard-edged highlights
- transparent background if possible

Do not:
- change the vehicle identity between frames
- change the pose order or grid layout
- add logos, badges, readable text, numbers, or brand marks
- add a scene background
- turn it into a photorealistic 3D render
- invent extra wheels, spoilers, or inconsistent body panels

Output:
- one sprite sheet image
- same grid as the input pose sheet
- each cell centered consistently
- enough padding around every vehicle frame for in-game rotation and scaling
```

pose sheet 입력 기준

- 1차 테스트는 `Raven Coupe`만 사용한다.
- 그리드는 `center`, `steer-right-1`, `steer-right-2`, `spin-right-1`, `spin-right-2`, `downhill-*`, `uphill-*` 11프레임을 기본으로 한다.
- 확장 테스트도 원칙적으로 오른쪽 원본을 먼저 만든다. 예: `drift-right`, `contact-right`.
- 왼쪽 상태는 가능하면 생성하지 않고, 런타임 `flipX`로 재사용한다.
- 브레이크와 부스트는 base sheet에 섞지 않고 별도 overlay로 만든다.

## 후처리 메모

- 결과 이미지에서 배경이 완전히 투명한지 확인한다.
- 차량이 화면 하단 anchor에 맞게 아래쪽이 너무 잘리지 않았는지 확인한다.
- sprite 회전 시 여백이 충분한지 확인한다.
- 후면 시점이 약하면 image-to-image를 반복하기보다 source render의 camera/pose를 먼저 조정한다.
- `steer-right-1`과 `steer-right-2`가 비슷하면 3D pose sheet부터 각도 차이를 더 벌린 뒤 다시 변환한다.
- 너무 사실적이면 deterministic pixel pass의 posterize/palette/outline 값을 먼저 조정한다.
- 로고나 문자 비슷한 요소가 나오면 제거 요청 후 재생성한다.
- pose sheet 변환 결과에서 cell 간 차량 비율, 후미등, 창문, 범퍼 형태가 유지되는지 확인한다.
- cell grid가 흐트러지면 런타임 asset으로 쓰지 않고 reference 후보로만 보관한다.

---

## 아웃런 스타일 차량 sprite 구성 검토

현재 구현은 `rear`, `rear-left`, `rear-right` 3장만 사용한다. 이 조합은 기본 조향 반응 확인에는 충분하지만, 아웃런 계열의 풍부한 차체 반응을 만들기에는 부족하다. 특히 코너 진입, 드리프트, 브레이크, 부스트 상태가 모두 같은 차처럼 보여서 속도감과 차량 성격 차별화가 약해진다.

전용 sprite 제작에서는 원본 방향을 오른쪽으로 통일한다. 즉 직접 렌더링하고 후처리하는 base body sprite는 `center`, `steer-right-*`, `spin-right-*`, `downhill-*`, `uphill-*`를 기준으로 두고, 왼쪽 상태는 런타임 `flipX`로 만든다. 좌우가 거의 대칭인 차량만 이 정책을 적용하며, 배기구, 데칼, 파손, 접촉 방향처럼 비대칭성이 강한 경우에는 별도 sprite 또는 overlay로 승격한다.

아웃런 스타일에 가까운 후보 프레임 종류

- `center`: 기본 직진 후면
- `steer-left-1`, `steer-right-1`: 약한 조향
- `steer-left-2`, `steer-right-2`: 강한 조향
- `drift-left`, `drift-right`: 차체가 더 크게 비틀린 슬립 상태
- `brake-center`: 브레이크 시 차체가 약간 눌리고 tail light가 강해진 상태
- `brake-left`, `brake-right`: 조향 + 브레이크 복합 상태
- `boost-center`: 가속/부스트 시 차체가 약간 들리고 배기/광원 연출이 붙는 상태
- `boost-left`, `boost-right`: 조향 + 부스트 복합 상태
- `crest`, `dip`, `uphill`, `downhill`: 고저차 변화로 차체 pitch가 달라 보이는 보조 상태
- `spin-left-1`, `spin-right-1`: 그립을 잃고 차가 한쪽으로 털리는 초기 스핀 상태
- `spin-left-2`, `spin-right-2`: 더 크게 돌아간 심화 스핀 상태
- `contact-left`, `contact-right`: 가드레일이나 차량 접촉 순간의 비틀림 상태
- `damage-light`: 벽이나 장애물 접촉 이후의 경미한 변형 상태
- `recover-left`, `recover-right`: 스핀이나 접촉 뒤 자세를 되찾는 복구 상태

구현 우선순위

- 1차 필수 원본: `center`, `steer-right-1`, `steer-right-2`, `spin-right-1`, `spin-right-2`, `downhill-center`, `downhill-right-1`, `downhill-right-2`, `uphill-center`, `uphill-right-1`, `uphill-right-2`
- 1차 런타임 상태: 왼쪽 steer/spin/downhill/uphill은 오른쪽 원본 `flipX`
- 2차 권장: `brake-center`, `boost-center`, `drift-right`
- 3차 확장: `drift-left`, `brake-left`, `brake-right`, `boost-left`, `boost-right`
- 4차 확장: `crest`, `dip`, `contact-left/right`, `recover-left/right`, `damage-light`

상태 묶음 기준

- `주행 상태`: `center`, `steer`, `drift`, `brake`, `boost`
- `고저차 상태`: `crest`, `dip`, `uphill`, `downhill`
- `사고 상태`: `spin`, `contact`, `damage`, `recover`

`flipX` 활용 검토

- `steer-left-1` = `flipX(steer-right-1)`
- `steer-left-2` = `flipX(steer-right-2)`
- `drift-left` = `flipX(drift-right)`
- `spin-left-1` = `flipX(spin-right-1)`
- `spin-left-2` = `flipX(spin-right-2)`
- `recover-left` = `flipX(recover-right)`

이 상태들은 프로토타입 단계에서 `right` 원본 1장과 런타임 `flipX`로 대응할 여지가 크다. 차체 데칼, 배기 위치, 라이트 비대칭이 강하지 않다면 제작량을 꽤 줄일 수 있다.

`flipX` 비권장 또는 주의 상태

- `crest`, `dip`, `uphill`, `downhill`
- `contact-left`, `contact-right`
- `damage-light`

이 상태들은 단순 좌우 대칭보다 `차체 pitch`, `충돌 방향`, `후미등/배기광`, `변형 위치`가 중요해서 별도 sprite나 overlay가 더 자연스럽다. 단, `contact-left`는 프로토타입에서만 `contact-right + flipX + spark overlay`로 먼저 검증하고, 어색하면 별도 sprite로 승격한다.

효과 overlay sprite 검토

별도 효과를 차체 sprite에 bake하지 않고, 위에 얹는 overlay sprite로 해결하는 방향은 긍정적이다. 특히 프로토타입에서는 차체 base sprite 수를 과도하게 늘리지 않고도 상태 피드백을 풍부하게 만들 수 있다.

overlay로 해결하기 좋은 후보

- `brake glow`: 후미등 발광 강화, 얇은 red bloom, brake dust 느낌
- `boost flame` 또는 `boost glow`: 배기 화염, 터보 발광, 하단 blue/orange glow
- `speed streak`: 차체 뒤나 양옆에 짧게 붙는 streak
- `skid smoke`: 드리프트/스핀 진입 시 타이어 연기
- `contact spark`: 가드레일 접촉 순간의 스파크
- `damage decal`: 큰 차체 변경 대신 범퍼 스크래치, 깨짐, 찌그러짐 오버레이
- `crest shadow` / `dip shadow`: 고저차에서 그림자 위치와 길이만 바꾸는 보조 레이어

overlay로 먼저 풀고, base body sprite는 최소화하는 방향이 좋은 상태

- `brake-left`, `brake-right`: `steer` base + `brake glow` overlay
- `boost-left`, `boost-right`: `steer` base + `boost flame/glow` overlay
- `brake-center`: `center` base + `brake glow` overlay
- `boost-center`: `center` base + `boost flame/glow` overlay
- `damage-light`: `center` 또는 현재 주행 base + `damage decal` overlay
- `contact-left/right`: 짧은 `contact spark` overlay와 순간 pose 조합
- `crest`, `dip`, `uphill`, `downhill`: 차체를 완전히 새로 그리기 전에 shadow/ride-height overlay로 먼저 검토

overlay 한계

- 큰 스핀이나 강한 contact는 overlay만으로 해결하기 어렵다. 차체 yaw 자체가 달라 보여야 하므로 base sprite pose가 필요하다.
- crest와 dip도 차체 pitch 변화가 크면 shadow만으로는 부족할 수 있다.
- overlay가 너무 많아지면 오히려 상태 조합 관리가 복잡해지므로, `효과 레이어`는 2~3개 범주로 제한하는 편이 낫다.

왜 더 필요한가

- crest를 넘을 때와 dip으로 눌릴 때는 같은 후면 스프라이트로는 차체 pitch 감각이 잘 안 난다.
- downhill에서 다시 uphill로 넘어가는 구간은 도로만 바뀌고 차는 같은 모양이면 접지감이 약해진다.
- 스핀은 단순 `drift-left/right`보다 더 과장된 yaw와 차체 비틀림이 필요하다.
- 접촉 사고는 속도 저하만으로는 체감이 약해서, 최소한 순간적인 `contact` 자세나 `damage-light` 인상이 있으면 반응이 훨씬 명확해진다.

프로토타입 권장 세트

프로토타입은 차량 1대로만 진행하고, sprite 세트만 먼저 늘리는 편이 맞다. 지금 단계에서 차량 3종을 모두 늘리면 렌더링, UI, 주행 피드백 작업축이 동시에 커진다.

프로토타입 1차 런타임 동작 상태는 다음 7개를 권장한다.

- `center`
- `steer-left-1`
- `steer-right-1`
- `steer-left-2`
- `steer-right-2`
- `brake-center`
- `boost-center`

이 7개 상태로 다음을 확인할 수 있다.

- 직진과 약/강 조향의 시각 차이
- 브레이크 시 후미등과 감속 피드백
- 부스트 시 배기광과 속도감 반응
- RPM / boost UI와 sprite 반응의 연결

프로토타입 2차 동작 상태는 다음 추가 상태를 권장한다.

- `drift-right`
- `drift-left`
- `crest`
- `dip`
- `spin-right-1`
- `spin-left-1`
- `contact-right`
- `contact-left`

이 추가 세트로 다음을 확인할 수 있다.

- 미끄러짐과 스핀 시작 상태의 시각 차이
- crest / dip에서 차체 pitch 인상 변화
- 벽이나 가드레일 접촉 순간의 피드백 강화
- 단순 속도 감소가 아닌 "실패 상태가 보이는가" 검증

프로토타입 1차 최소 base body sprite 원본

- `center`
- `steer-right-1`
- `steer-right-2`

프로토타입 1차 effect overlay 원본

- `brake-glow`
- `boost-glow` 또는 `boost-flame`

프로토타입 2차 최소 base body sprite 원본

- `drift-right`
- `crest`
- `dip`
- `spin-right-1`
- `contact-right`

프로토타입 런타임 재사용 규칙

- `steer-left-1`, `steer-left-2`는 오른쪽 원본 `flipX`
- `drift-left`는 `flipX`
- `spin-left-1`은 `flipX`
- `contact-left`는 가능하면 `flipX + spark overlay`로 시작하고, 어색하면 별도 sprite로 승격
- `brake-left/right`, `boost-left/right`는 base steer sprite 위에 overlay를 얹어 해결
- `brake-center`, `boost-center`는 별도 body sprite가 아니라 `center` 위의 overlay 조합으로 시작

프로토타입 차량 운영 원칙

- 1차 프로토타입에서는 대표 차량 1대만 사용한다.
- 차량 선택 UI는 보류하고, 단일 차량 주행 감각과 sprite 상태 전환을 먼저 검증한다.
- 단일 차량이 충분히 읽히면 이후 같은 프레임 규격을 `Raven Coupe`, `Vortex GT`, `Apex S`에 확장한다.
- 프로토타입 대표 차량은 현재 기획상 `Raven Coupe`가 가장 무난하다. `NA` 응답형 입문차라 조향, 브레이크, RPM 변화를 읽기 쉽다.

렌더링 자동화 확장 메모

- 현재 스크립트는 `rear`, `rear-left`, `rear-right` 3개 view만 렌더한다.
- 다음 확장에서는 `rear`, `rear-right-1`, `rear-right-2`를 표준 원본 view로 삼고, `rear-left-*`는 런타임 `flipX`로 만든다.
- 카메라 각도만 늘리는 방식과, 동일 각도에서 차체 pose/광원만 바꾸는 방식을 분리해서 관리한다.
- `steer-right-1`과 `steer-right-2`는 2D 변환 후에도 구분되도록 3D 기준 각도 차이를 충분히 벌린다.
- `steer-right-2`는 단순 카메라 회전보다 실제 wheel angle 또는 차체 yaw를 약간 더 준 pose가 필요할 수 있다.
- `brake`와 `boost`는 후면등 밝기, 배기광, 차체 pitch 차이까지 포함해야 효과가 난다.
- `crest`, `dip`, `uphill`, `downhill`은 카메라 각도보다 차체 pitch와 그림자 위치 차이 관리가 더 중요하다.
- `spin`과 `contact`는 최종 품질에서는 단순 좌우 반전만으로 끝내지 말고, rear bumper, body yaw, tire angle이 더 크게 무너진 pose가 필요하다.
- 렌더 파이프라인은 `base body sprite`, `flipX eligibility`, `effect overlay sprite`를 분리해 관리하는 편이 장기적으로 낫다.

3D source model 개선 + deterministic sprite 처리

`3D pose sheet -> image-to-image -> 도트/레트로 sprite sheet 정리` 파이프라인은 컨셉 탐색에는 유용했지만, 게임 런타임 asset의 기본 경로로 삼기에는 불안정하다. pose order, 빈 cell, anchor, alpha, 차량 디테일 일관성이 매번 흔들리기 때문이다.

따라서 기본 제작 경로는 `Three.js procedural source model 개선 -> 직접 pose render -> 픽셀화/팔레트/outline/color-key 후처리 -> Phaser 투입`으로 전환한다. image-to-image는 최종 asset 생성 단계가 아니라 스타일 탐색, 블로그 소재, 수동 paint-over reference 후보로만 둔다.

자동화 가능한 단계

- `procedural model build`: Raven Coupe의 차체, 캐빈, 휠 아치, 후미등, 유리, 범퍼를 Three.js geometry와 decal plane으로 구성한다.
- `3D pose batch render`: 차량별 `center`, `steer`, `spin`, `uphill`, `downhill`, `contact` 기준 이미지를 일괄 캡처한다.
- `pose sheet build`: 여러 pose render를 하나의 grid 이미지로 묶어 deterministic 후처리 입력으로 사용한다.
- `pose manifest`: 각 cell에 `vehicleId`, `state`, `view`, `flipX 가능 여부`, `overlay anchor`를 기록한다.
- `pixel pass`: 직접 렌더한 pose sheet를 저해상도 downscale, posterize, palette quantization, nearest upscale로 처리한다.
- `outline pass`: 차체 외곽선과 후면 주요 실루엣을 hard edge로 정리한다.
- `palette pass`: 후보 이미지를 제한 팔레트나 차량별 paint preset에 맞춰 후처리한다.
- `color-key pass`: 투명 PNG와 함께 Phaser용 magenta color-key preview를 만든다.
- `sprite QA`: 투명 배경, silhouette bbox, anchor 위치, 좌우 flip 일관성, 프레임 크기를 자동 검사한다.
- `atlas build`: 통과한 sprite와 overlay를 atlas PNG + JSON metadata로 묶는다.

자동화가 어려운 단계

- procedural geometry만으로 FT86풍 compact FR coupe 느낌을 충분히 내는 작업
- 검은 차체와 검은 배경을 자동 alpha 처리에서 안전하게 분리하는 작업
- 접촉/스핀처럼 차체가 크게 무너지는 pose의 의도 확인
- 픽셀화 후에도 후미등, 창문, 범퍼, 휠 아치가 작은 표시 크기에서 읽히게 만드는 작업

권장 검증 순서

1. `Raven Coupe` procedural source model을 먼저 개선한다.
2. 차체 비율, 캐빈 위치, short rear deck, rear wing 없음, 후미등, 휠 아치가 3D render 단계에서 읽히는지 확인한다.
3. 오른쪽 기준 11개 source pose를 직접 렌더링한다.
4. 픽셀화/팔레트/outline/color-key 후처리를 적용하고, 작은 표시 크기에서 방향과 상태가 읽히는지 확인한다.
5. `brake-glow`, `boost-glow`, `skid-smoke`는 base body에 bake하지 않고 overlay sprite로 분리한다.
6. 결과가 안정적이면 `drift-right`, `contact-right`, `damage-*` 같은 이벤트성 pose를 추가한다.
7. 그 다음에 색상 팔레트 변경과 차량 3종 확장을 검토한다.

판단 기준

- 11프레임 source pose sheet 테스트에서 차체 실루엣과 주요 디테일이 흔들리지 않으면 자동화 후보로 유지한다.
- 픽셀화 후 `steer-right-1`과 `steer-right-2`, `spin-right-1`과 `spin-right-2`가 구분되면 deterministic pipeline을 유지한다.
- 모델이 너무 박스형이면 image-to-image를 다시 반복하지 말고 procedural model의 geometry/decal부터 개선한다.
- 팔레트 변경은 material preset 캡처 또는 `palette pass` 중 더 안정적인 쪽을 선택한다.
- 최종 런타임에는 3D를 직접 쓰지 않고, 검수된 2D sprite, magenta color-key sheet, overlay만 사용한다.

구현안

자동화 라인은 `source`, `generated`, `approved`를 분리한다. `source`는 사람이 관리하는 원본과 manifest이고, `generated`는 언제든 지워도 다시 만들 수 있는 중간 산출물이며, `approved`는 게임에 들어갈 검수 완료 asset이다.

## Blender 없는 Raven Coupe source model 방향

Raven Coupe 전용 3D source model은 Blender 없이 Three.js procedural geometry로 먼저 만든다.

이 모델은 최종 게임 런타임에 쓰는 3D 모델이 아니라, deterministic 2D sprite를 만들기 위한 `render source`다. 따라서 곡면 완성도보다 다음 요소를 안정적으로 고정하는 것이 우선이다.

- 낮은 2도어 compact FR coupe 비율
- long-ish hood, short rear deck
- 뒤쪽으로 살짝 밀린 compact cabin
- 단순한 직사각형 후미등
- rear wing 없음
- 4개 휠의 위치와 크기
- graphite body, dark glass, restrained red accent
- sci-fi panel, hypercar wedge, exposed race wheel 금지

Three.js procedural source model은 `render:vehicle-pose-sheet`의 `--model raven-coupe-procedural` 모드로 렌더링한다. 이후 필요하면 같은 geometry를 GLB로 export하거나, Blender/수동 모델링으로 승격한다.

다음 개선은 primitive 박스 조합을 유지하되, 차량 정체성이 더 잘 읽히도록 geometry와 decal을 보강한다.

```text
bodyBase: 낮고 긴 메인 차체
hood: 낮게 뻗은 앞쪽 볼륨
cabin: 뒤쪽으로 밀린 낮은 캐빈
rearDeck: 짧은 뒤쪽 데크
bumper: 두꺼운 후면 범퍼
rearLights: 단순 직사각형 후미등
wheelArches: 차체에서 잘 읽히는 둥근 휠 아치
wheels: 4개 실린더 + 밝은 rim
glass: rear/side window dark material
decalPlanes: rear light, license plate, glass highlight, belt line
outlineHints: 픽셀화 후 남을 얇은 dark trim
accent: 절제된 red stripe
```

이 접근의 장점은 다음과 같다.

- Blender 설치 없이 repo 안에서 재현 가능하다.
- 차량 비율을 코드 상수로 조정할 수 있다.
- Raven Coupe, Vortex GT, Apex S를 같은 방식으로 확장할 수 있다.
- pose sheet 각도와 source model 변경 이력이 git diff로 남는다.

단점도 있다.

- 곡면 차체 표현은 약하다.
- 실루엣이 너무 박스형으로 보일 수 있다.
- 최종 sprite 품질은 source model, 조명, 픽셀화/outline pass 품질에 직접 의존한다.

그래도 현재 단계에서는 "한 번 잘 나온 AI 이미지"보다 "같은 차로 반복 렌더링되는 통제 가능한 source"가 더 중요하므로, procedural model 개선이 우선이다.

디렉터리 초안

```text
games/apex-seoul/assets/vehicles/source/
games/apex-seoul/assets/vehicles/source/models/
games/apex-seoul/assets/vehicles/source/manifests/
games/apex-seoul/assets/vehicles/generated/pose-renders/
games/apex-seoul/assets/vehicles/generated/img2img-candidates/
games/apex-seoul/assets/vehicles/generated/pixel-candidates/
games/apex-seoul/assets/vehicles/generated/layers/
games/apex-seoul/assets/vehicles/generated/qa/
games/apex-seoul/assets/vehicles/approved/sprites/
games/apex-seoul/assets/vehicles/approved/overlays/
games/apex-seoul/assets/vehicles/approved/atlases/
```

manifest 구조 초안

```json
{
    "cellSize": 256,
    "columns": 3,
    "paintPresets": [
        {
            "id": "graphite-red",
            "body": "#1f2528",
            "highlight": "#687176",
            "shadow": "#0b0e10",
            "accent": "#cf3131"
        },
        {
            "id": "pearl-white",
            "body": "#d8d7cf",
            "highlight": "#fff6e1",
            "shadow": "#6f7472",
            "accent": "#36bfd0"
        }
    ],
    "sourceModel": "source/models/raven-coupe.glb",
    "sourcePoses": [
        {
            "id": "center",
            "view": "rear",
            "rearAngleDeg": 0,
            "modelYawDeg": 0,
            "modelPitchDeg": 0,
            "flipXSource": null,
            "layers": ["base-body", "paint-mask", "shade-highlight"],
            "overlayAnchors": {
                "brakeGlow": [128, 178],
                "boostGlow": [128, 205]
            }
        },
        {
            "id": "steer-right-1",
            "view": "rear-right",
            "rearAngleDeg": 24,
            "modelYawDeg": 0,
            "modelPitchDeg": 0,
            "flipXSource": null
        },
        {
            "id": "steer-right-2",
            "view": "rear-right-strong",
            "rearAngleDeg": 44,
            "modelYawDeg": 0,
            "modelPitchDeg": 0,
            "flipXSource": null
        },
        {
            "id": "spin-right-1",
            "view": "spin-right",
            "rearAngleDeg": 62,
            "modelYawDeg": 12,
            "modelPitchDeg": 0,
            "flipXSource": null
        },
        {
            "id": "spin-right-2",
            "view": "spin-right-strong",
            "rearAngleDeg": 78,
            "modelYawDeg": 24,
            "modelPitchDeg": 0,
            "flipXSource": null
        },
        {
            "id": "downhill-center",
            "view": "rear-downhill",
            "rearAngleDeg": 0,
            "modelYawDeg": 0,
            "modelPitchDeg": -8,
            "flipXSource": null
        },
        {
            "id": "downhill-right-1",
            "view": "rear-right-downhill",
            "rearAngleDeg": 24,
            "modelYawDeg": 0,
            "modelPitchDeg": -8,
            "flipXSource": null
        },
        {
            "id": "downhill-right-2",
            "view": "rear-right-strong-downhill",
            "rearAngleDeg": 44,
            "modelYawDeg": 0,
            "modelPitchDeg": -8,
            "flipXSource": null
        },
        {
            "id": "uphill-center",
            "view": "rear-uphill",
            "rearAngleDeg": 0,
            "modelYawDeg": 0,
            "modelPitchDeg": 8,
            "flipXSource": null
        },
        {
            "id": "uphill-right-1",
            "view": "rear-right-uphill",
            "rearAngleDeg": 24,
            "modelYawDeg": 0,
            "modelPitchDeg": 8,
            "flipXSource": null
        },
        {
            "id": "uphill-right-2",
            "view": "rear-right-strong-uphill",
            "rearAngleDeg": 44,
            "modelYawDeg": 0,
            "modelPitchDeg": 8,
            "flipXSource": null
        }
    ],
    "runtimeStates": [
        {
            "id": "steer-left-2",
            "flipXSource": "steer-right-2"
        },
        {
            "id": "steer-left-1",
            "flipXSource": "steer-right-1"
        },
        {
            "id": "center",
            "flipXSource": null
        },
        {
            "id": "steer-right-1",
            "flipXSource": null
        },
        {
            "id": "steer-right-2",
            "flipXSource": null
        }
    ],
    "style": "neo-drift-out-inspired-retro-pixel",
    "vehicleId": "raven-coupe"
}
```

자동화 단계

1. `improve source model`
   Raven Coupe procedural geometry를 개선한다. 차체 base, hood, cabin, rear deck, bumper, wheel arch, rear light decal, glass highlight, belt line이 렌더 단계에서 읽혀야 한다.

2. `render poses`
   3D model과 manifest를 읽고 오른쪽 기준 source pose를 투명 배경 PNG로 캡처한다. 기본 주행은 `center`, `steer-right-1`, `steer-right-2`, 스핀은 `spin-right-1`, `spin-right-2`, 고저차는 `downhill-*`, `uphill-*`를 사용한다. `rearAngleDeg`, `modelYawDeg`, `modelPitchDeg`를 기준으로 pose 차이를 수치로 관리한다.

3. `build pose sheet`
   pose render들을 manifest 순서대로 grid에 배치해 하나의 pose sheet를 만든다.

4. `pixel candidates`
   pose sheet를 직접 후처리해 sprite 후보를 만든다. 권장 순서는 `low-res downscale`, `posterize`, `palette quantization`, `nearest upscale`, `hard-edge cleanup`이다.

5. `outline pass`
   차체 외곽, 후면 범퍼, roofline, rear window, wheel arch가 작은 표시 크기에서도 읽히도록 dark outline과 hard highlight를 정리한다.

6. `alpha/color-key prepare`
   런타임 base body sprite는 픽셀풍 선명도가 중요하므로 낮은 alpha 픽셀을 제거하고, 남길 픽셀은 불투명에 가깝게 정리한다. 투명 PNG와 Phaser용 magenta color-key sheet를 함께 만든다. alpha가 0인 픽셀의 숨은 RGB도 `0,0,0,0`으로 초기화한다.

7. `shadow cleanup`
   차량 아래 그림자는 base sprite에 bake하지 않는 것을 기본으로 둔다. 1차 후처리에서는 그림자를 완전히 자동 제거하기보다, alpha harden 후 그림자 영역을 QA에서 표시하고 런타임 Phaser Graphics 그림자로 대체할지 판단한다. 그림자가 차체/타이어와 붙어 있어 자동 제거가 위험하면 base sprite에는 약하게 남기고, 최종 approved 단계에서 수동 보정한다.

8. `anchor metadata`
   bbox center는 회전 각도에 따라 좌우로 이동하므로 런타임 anchor로 직접 쓰지 않는다. 각 셀의 bottom center와 공통 baseline을 계산해 `center`, `steer-right-1`, `steer-right-2`가 같은 도로 접지선 위에 놓이도록 metadata를 만든다.

9. `layer extraction`
   후보 sprite 또는 source render에서 `base-body`, `paint-mask`, `shade-highlight`, `glass`, `lights`, `tires` 레이어를 분리한다. 초기에는 자동 분리보다 material id나 decal id를 이용한 반자동 단계로 둔다.

10. `palette pass`
   `paint-mask`에 paint preset을 적용해 여러 색상 차량을 만든다. 하이라이트와 그림자는 별도 레이어로 유지해 색만 바꿔도 차체 볼륨이 무너지지 않게 한다.

11. `overlay compose`
   `brake-glow`, `boost-glow`, `skid-smoke`, `contact-spark`, `damage-decal`을 anchor 기준으로 합성한다.

12. `qa`
   bbox, anchor, alpha 분포, 투명 배경, 팔레트 색 수, `flipX` 결과, `steer-right-1`/`steer-right-2`의 각도 차이, 프레임 크기, 주요 레이어 누락 여부를 검사한다.

13. `atlas build`
   통과한 `approved` sprite와 overlay를 atlas로 묶고, 게임 런타임이 읽을 JSON metadata를 만든다.

image-to-image의 역할

- image-to-image는 기본 런타임 asset 경로가 아니다.
- 스타일 탐색, 블로그 설명용 이미지, 수동 paint-over reference 후보로만 사용한다.
- 3D pose sheet의 실루엣과 grid를 유지해야 하므로 denoise strength는 낮게 시작한다.
- 프레임별 seed를 완전히 랜덤으로 두지 말고 차량별 seed group을 둔다.
- cell order, 빈 cell, anchor, alpha가 흔들리면 더 반복하지 않고 deterministic source model/pixel pass 개선으로 돌아간다.
- ControlNet, lineart, depth, canny 같은 입력을 사용할 수 있으면 reference 안정화 실험에만 사용한다.

레이어 분리 기준

- `base-body`: 차체 형태와 주요 실루엣
- `paint-mask`: 바디 컬러가 바뀌는 영역
- `shade-highlight`: 색상 변경 뒤에도 유지할 명암과 광택
- `glass`: 유리와 실내 어두운 영역
- `lights`: 기본 후미등과 램프
- `tires`: 타이어와 휠
- `effect-overlay`: 브레이크, 부스트, 연기, 스파크, 데미지

QA 체크

- 모든 sprite는 같은 canvas size와 같은 anchor 정책을 가진다.
- `center`, `steer-right-1`, `steer-right-2`의 차체가 같은 차량으로 보여야 한다.
- `steer-right-1`과 `steer-right-2`는 작은 표시 크기에서도 서로 다른 조향 단계로 읽혀야 한다.
- sprite sheet의 cell grid가 크게 흐트러지지 않아야 한다.
- alpha 0 픽셀은 숨은 RGB까지 `0,0,0,0`이어야 한다.
- base body sprite의 반투명 alpha는 제한한다. 부드러운 glow나 그림자는 overlay 또는 런타임 그림자로 분리한다.
- magenta color-key sheet에서는 배경이 정확히 `#ff00ff`이어야 하고, 차량 픽셀에는 `#ff00ff`가 섞이지 않아야 한다.
- 차량 접지 baseline은 세 원본 pose가 공유해야 하며, bbox center만으로 anchor를 결정하지 않는다.
- `flipX`로 만든 왼쪽 상태가 수동 제작 sprite처럼 자연스러운지 확인한다.
- paint preset을 바꿔도 후미등, 유리, 타이어 색이 같이 오염되지 않아야 한다.
- overlay가 차체보다 앞/뒤 depth를 잘못 타지 않아야 한다.
- 작은 표시 크기에서도 차체 방향과 브레이크/부스트 상태가 읽혀야 한다.

1차 PoC 범위

- 차량: `Raven Coupe`
- source pose: `center`, `steer-right-1`, `steer-right-2`, `spin-right-1`, `spin-right-2`, `downhill-center`, `downhill-right-1`, `downhill-right-2`, `uphill-center`, `uphill-right-1`, `uphill-right-2`
- runtime state: 오른쪽 source pose와 `flipX`로 만든 왼쪽 steer/spin/downhill/uphill 상태
- overlay: `brake-glow`, `boost-glow`
- paint preset: `graphite-red`, `pearl-white`
- 목표: 개선된 Three.js source model에서 직접 sprite sheet를 만들고, 픽셀화/팔레트/color-key 후처리가 안정적으로 적용되는지 확인한다.

예상 스크립트

```bash
npm run render:vehicle-pose-sheet
npm run apex:vehicles:render-poses
npm run apex:vehicles:build-pose-sheet
npm run apex:vehicles:pixel-pass
npm run clean:vehicle-sprite-sheet
npm run finalize:vehicle-sprite-sheet
npm run prepare:vehicle-sprite-sheet
npm run apex:vehicles:crop-cells
npm run apex:vehicles:extract-layers
npm run apex:vehicles:palette
npm run apex:vehicles:qa
npm run apex:vehicles:atlas
```

현재 PoC 산출물

```text
games/apex-seoul/assets/vehicles/generated/pose-sheets/raven-coupe-prototype.png
games/apex-seoul/assets/vehicles/generated/pose-sheets/raven-coupe-prototype.json
```

현재 `render:vehicle-pose-sheet`는 Three.js procedural geometry 기반 `raven-coupe-procedural`을 source model로 사용해 오른쪽 기준 11프레임 pose sheet를 만든다. 포함 pose는 `center`, `steer-right-1`, `steer-right-2`, `spin-right-1`, `spin-right-2`, `downhill-center`, `downhill-right-1`, `downhill-right-2`, `uphill-center`, `uphill-right-1`, `uphill-right-2`다. 왼쪽 steer/spin/downhill/uphill 상태는 런타임에서 `flipX`로 만든다. `race-future.glb`는 너무 미래형 실루엣이라 Raven Coupe의 FT86풍 compact FR coupe 의도와 충돌하고, `sedan-sports.glb`는 임시 개선안으로는 쓸 수 있지만 Raven Coupe 전용 source로는 부족하므로 기본값에서 제외한다. 이후 필요하면 procedural geometry를 GLB로 export하거나, 별도 수동 모델링 source로 승격한다.

다음 작업은 image-to-image 반복이 아니라 `raven-coupe-procedural` source model 품질 개선이다. 모델 개선 후 직접 render 결과에 픽셀화, 팔레트 제한, outline, magenta color-key pass를 적용한다. `img2img`와 `extract-layers`는 후보 생성과 수동 보정 reference를 받아 다음 단계로 넘기는 보조/반자동 파이프라인으로만 유지한다.

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
- 3D Pose Sheet to 2D Sprite Sheet Pipeline
- Right Source Poses and Runtime flipX
- Additional Steering Frames
- Spin and Elevation Frames
- Drift Angle Frames
- Brake/Boost Pose

결과

- 임시 Kenney 차량에서 Apex Seoul 전용 차량으로 교체 준비
- 오른쪽 기준 11프레임 source pose sheet 확정
- 왼쪽 조향/스핀/고저차 상태는 런타임 `flipX`로 재사용
- 아웃런 스타일 기준의 1차 sprite 세트 정의
- 조향/스핀/고저차 표현 가능한 sprite 각도 확장
- 차량별 시각 정체성 정리

---

## 7편

차량 성격과 주행 UI 차별화

주제

- NA vs Turbo Character
- RPM and Gear HUD
- Turbo Boost UI
- Arcade Drivetrain Feel

결과

- 차량 3종의 가속 응답과 회전 상승감 차이 정리
- `RPM`, `gear`, `boost` 기반 HUD 초안 확정
- `Turbo` 차량 전용 boost 연출 방향 정리
- 차량 선택이 단순 스킨이 아니라 주행 감각 차이로 읽히는 기준 마련

---

## 8편

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

## 9편

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

---

# 실제 차량 모델 기반 POC 기록

작성일: 2026-06-28

배경

현재 Apex Seoul의 차량 asset 완성도가 낮아 보이므로, image-to-image 반복이나 절차형 모델 개선만 계속하기 전에 실제 차량 3D 모델을 source로 넣어 비교한다. 목적은 실제 차명 자산을 최종 게임에 쓰는 것이 아니라, pseudo 3D 후방 시점에서 잘 읽히는 실루엣과 포즈 기준선을 확보하는 것이다.

검토 대상

- Toyota FT86 / GT86 / 86 / Subaru BRZ 계열
- Kia Stinger
- Genesis G70

우선순위

1. FT86 / GT86 계열
   - Raven Coupe의 compact FR coupe 의도와 가장 가깝다.
   - 후방, 짧은 데크, 낮은 캐빈, 넓은 스탠스가 256px 스프라이트에서 읽힐 가능성이 높다.
2. Kia Stinger
   - fastback 실루엣은 좋지만 차체가 길어 플레이어 쿠페보다 라이벌/보스 차량 후보에 가깝다.
3. Genesis G70
   - 실제 차량 매력과 별개로 작은 후방 스프라이트에서는 일반 세단으로 뭉개질 위험이 있다.

2026-06-28 조사 결과

- Sketchfab API에서 세 차종 모두 다운로드 가능 후보를 확인했다.
- GT86 후보 중 `Toyota GT86` 모델은 GLB 약 2.1MB, CC Attribution으로 확인했다.
- Kia Stinger 후보는 GLB 약 17MB에서 73MB 사이, CC Attribution 후보가 있다.
- Genesis G70 후보는 GLB 약 35MB 이상, CC Attribution 후보가 있다.
- Sketchfab 실제 download URL 발급은 인증 토큰이 필요하다. 토큰 없이 공개 검색 metadata 확인은 가능하지만, API 다운로드 endpoint는 `Authentication credentials were not provided.`로 막힌다.

POC 정책

- 실제 차명/상표/엠블럼은 최종 공개 게임 asset으로 직접 쓰지 않는다.
- POC 산출물은 source quality 비교와 Raven Coupe 재모델링 reference로만 사용한다.
- 공개 가능한 최종 차량명은 `Raven Coupe`처럼 가상화한다.
- CC Attribution 모델을 쓰더라도 attribution 문서와 출처 metadata를 함께 남긴다.
- NonCommercial 모델은 공개 게임 후보에서 제외하고, 내부 reference 여부도 별도로 판단한다.

렌더링 파이프라인 변경

`render-vehicle-pose-sheet.mjs`에 `--model-path` 옵션을 추가한다. 기존 Kenney 모델명 기반 사용법은 유지하고, 외부 GLB는 프로젝트 내부 경로로 직접 지정한다.

```bash
npm run render:vehicle-pose-sheet --workspace @games/apex-seoul -- \
  --model gt86-poc \
  --model-path assets/vehicles/source/models/gt86-poc.glb \
  --vehicle-id gt86-poc \
  --output assets/vehicles/generated/pose-sheets/gt86-poc.png
```

임시 로컬 검증

외부 모델 다운로드 전, 기존 CC0 Kenney GLB로 같은 렌더러가 11포즈 sheet를 안정적으로 생성하는지 확인했다.

```text
games/apex-seoul/assets/vehicles/generated/pose-sheets/poc-sedan-sports.png
games/apex-seoul/assets/vehicles/generated/pose-sheets/poc-hatchback-sports.png
```

다음 단계

1. Sketchfab 토큰 또는 수동 다운로드로 GT86 계열 GLB를 `assets/vehicles/source/models/`에 둔다.
2. `--model-path`로 GT86 POC sheet를 생성한다.
3. Stinger와 G70은 GT86 결과가 유의미할 때 같은 기준으로 추가 비교한다.
4. 결과 비교 기준은 `center`, `steer-right-1`, `steer-right-2`, `spin-right-*`에서 후방 실루엣, 휠 위치, 캐빈/트렁크 비율, 픽셀화 후 식별성을 우선한다.

2026-06-28 POC 진행 결과

사용자가 Sketchfab에서 직접 받은 세 GLB로 실제 렌더를 진행했다.

```text
games/apex-seoul/assets/vehicles/toyota_gt86.glb
games/apex-seoul/assets/vehicles/kia_stinger.glb
games/apex-seoul/assets/vehicles/genesis_g70.glb
```

원본 모델 문제

- 기존 normalize는 모델 bbox center를 뺀 뒤 scale을 적용했기 때문에, 원점에서 멀리 떨어진 GLB는 화면 밖으로 밀릴 수 있었다.
- GT86과 Stinger는 길이축이 Z, 높이축이 Y다.
- G70은 길이축이 Y, 높이축이 Z라서 축 회전이 필요하다.
- G70은 단순 Euler 회전만으로는 후방/상하가 동시에 맞지 않아 mirror scale 보정이 필요하다.
- 대형 GLB를 병렬로 여러 개 렌더하면 local static server fetch가 끊길 수 있으므로 real vehicle POC는 순차 렌더한다.

적용한 파이프라인 보정

- `--scale-mode vehicle-length`
- `--vehicle-length-m`
- `--reference-length-m`
- `--reference-length-units`
- `--frame-size-units`
- `--model-pitch-offset`
- `--model-yaw-offset`
- `--model-scale-x/y/z`

기준값

- 기준 차량: GT86
- 기준 전장: 4.24m
- 기준 렌더 길이: 2.2 units
- 고정 카메라 frame: 2.95 units
- padding: 1.08

차량별 POC 설정

```text
toyota-gt86-poc
- lengthM: 4.24
- yaw offset: 180

kia-stinger-poc
- lengthM: 4.83
- yaw offset: 0

genesis-g70-poc
- lengthM: 4.69
- pitch offset: 90
- scaleX: -1
- scaleZ: -1
```

반복 실행용 manifest

```text
games/apex-seoul/assets/vehicles/source/manifests/real-vehicle-poc.json
```

반복 실행 명령

```bash
npm run optimize:real-vehicle-models --workspace @games/apex-seoul
npm run render:real-vehicle-pocs --workspace @games/apex-seoul
```

GLB 최적화

원본 Sketchfab GLB는 source archive로 유지하고, 렌더 입력은 `assets/vehicles/optimized/*-optimized.glb`를 사용한다. 최적화는 `@gltf-transform/cli`의 `optimize`를 통해 `meshopt` geometry 압축, WebP texture 압축, 1024px texture cap을 적용한다. Three.js `GLTFLoader`는 `MeshoptDecoder`를 연결해야 압축 GLB를 바로 읽을 수 있다.

2026-06-28 기준 압축 결과:

```text
toyota_gt86.glb      3.1M -> 332K
kia_stinger.glb       29M -> 7.1M
genesis_g70.glb       41M -> 2.5M
```

현재 POC manifest는 최적화본을 기본 입력으로 사용한다.

최종 POC 산출물

```text
games/apex-seoul/assets/vehicles/generated/pose-sheets/poc-toyota-gt86-scaled.png
games/apex-seoul/assets/vehicles/generated/pose-sheets/poc-kia-stinger-scaled-rear.png
games/apex-seoul/assets/vehicles/generated/pose-sheets/poc-genesis-g70-scaled-final.png
```

판단

- GT86은 Raven Coupe 플레이어 차량의 실루엣 기준선으로 가장 적합하다.
- Stinger는 전장 차이가 고정 frame에서 잘 드러나며, 플레이어보다는 큰 라이벌 차량 후보로 적합하다.
- G70은 후방 실루엣은 읽히지만 모델 자체가 세단 느낌이 강해서 Raven Coupe 기준선으로는 GT86보다 약하다.
- 다음 단계는 GT86 POC를 기준으로 pixel pass/outline을 태워보고, 실제 사진풍 디테일이 256px sprite에서 얼마나 남는지 확인하는 것이다.

---

# 실제 차량 렌더 이미지 후처리 추천안

작성일: 2026-06-28

목표

실제 차량 GLB에서 얻은 사진풍 pose sheet를 Apex Seoul용 pseudo 3D sprite로 가공한다. 목표는 "실차 렌더를 그대로 축소"가 아니라, 작은 표시 크기에서도 차종별 실루엣, 후미등, 유리, 휠 위치, 조향 각도가 읽히는 2D game sprite를 만드는 것이다.

추천 결론

기본 경로는 `deterministic local pixel pass`로 둔다. GPT image-to-image는 최종 asset 생성기가 아니라 style exploration, paint-over reference, 수동 보정 지시서 생성에만 쓴다.

추천 파이프라인

```text
1. real vehicle GLB render
2. alpha cleanup / crop QA
3. low-res downscale
4. tone flatten / posterize
5. limited palette quantization
6. silhouette outline
7. key detail restore
8. magenta color-key / transparent output
9. GPT style reference review
10. manual touch-up
11. runtime QA
```

1단계: deterministic local pixel pass

우선 `sharp` 기반 스크립트로 직접 구현한다. 이미 프로젝트가 `sharp`를 쓰고 있고, cell grid, alpha, bbox, anchor metadata를 같은 Node 파이프라인에서 관리할 수 있기 때문이다.

권장 처리 순서

- source: `poc-toyota-gt86-scaled.png`
- cell 단위 crop
- low-res target으로 downscale
  - 1차 후보: 96px cell
  - 2차 후보: 128px cell
  - 최종 게임 표시가 작으면 96px 쪽이 더 낫다.
- tone flatten
  - 너무 사진처럼 부드러운 그라데이션을 줄인다.
  - shadow/highlight 단계 수를 줄인다.
- palette quantization
  - body white/gray 4-5색
  - glass 2-3색
  - tire/dark trim 3-4색
  - rear light red/amber 2-3색
- nearest upscale
  - working preview는 2x 또는 3x로 확인한다.
  - runtime source는 원래 cell size로 둘지, low-res sheet를 그대로 쓸지 별도 결정한다.
- alpha harden
  - base body에는 반투명 픽셀을 거의 남기지 않는다.
  - glow/shadow는 overlay 또는 runtime graphics로 분리한다.

`sharp` 선택 이유

- 현재 스크립트와 같은 JS/Node 환경에서 처리할 수 있다.
- resize, extract, extend, raw pixel buffer 처리가 가능하다.
- `nearest` resize를 명시할 수 있어 pixel pass가 재현 가능하다.
- cell별 QA JSON을 같은 코드에서 만들 수 있다.

2단계: outline pass

outline은 자동화하되, 과하게 두껍게 넣지 않는다. 실제 차량 렌더는 이미 형태 정보가 많기 때문에 전면적인 검은 외곽선보다 "읽힘이 약한 곳만 보강"하는 편이 낫다.

권장 규칙

- alpha mask의 외곽 1px에 dark outline 후보를 만든다.
- 차량 하단, rear bumper, roofline, rear glass, wheel arch에 우선 적용한다.
- 차체 흰색 highlight 안쪽까지 outline이 침범하면 실패로 본다.
- rear light 주변은 검은 outline보다 dark red / dark gray trim을 우선한다.

3단계: palette pass

전체 이미지에 단순 posterize를 걸면 GT86의 흰 차체가 죽거나, Stinger/G70의 유리와 차체가 섞인다. 따라서 palette pass는 전역 1회보다 material-like color buckets로 나누는 편이 좋다.

권장 palette bucket

```text
body-light: white / light gray / mid gray / shadow gray
glass: near black / blue gray / highlight gray
trim: black / charcoal / dark gray
tire: black / tire gray / rim light
rear-light: dark red / red / amber / small white
```

4단계: pngquant / ImageMagick 비교 실험

`pngquant`와 `ImageMagick`은 최종 기본 파이프라인보다 비교 실험용으로 둔다.

- `pngquant`
  - 장점: PNG palette reduction 결과를 빠르게 볼 수 있다.
  - 단점: sprite 의미를 모른다. rear light나 wheel detail이 사라질 수 있다.
  - 사용처: "몇 색까지 줄여도 읽히는가"를 빠르게 확인한다.
- `ImageMagick`
  - 장점: posterize, ordered dither, colors 제한 같은 실험을 CLI로 빠르게 반복할 수 있다.
  - 단점: cell별 anchor/QA/레이어 분리와는 따로 논다.
  - 사용처: dither와 posterize 감도 탐색에만 사용한다.

5단계: GPT 사용 위치

GPT image-to-image를 최종 sheet 생성기로 쓰지 않는다. 이유는 이미 이전 실험에서 pose order, 빈 cell, alpha, anchor, 차량 디테일이 흔들렸기 때문이다.

GPT 권장 사용처

- GT86 렌더 sheet를 넣고 retro arcade sprite style 후보를 2-3개 얻는다.
- 후보 이미지를 최종 asset으로 쓰지 않고, palette/outline/디테일 유지 방향의 reference로만 쓴다.
- "어떤 디테일을 남기고 어떤 디테일을 버릴지" 보정 지시서를 생성한다.
- 수동 touch-up 전 checklist를 만든다.

GPT에 맡기면 안 되는 것

- 최종 alpha sheet 생성
- pose cell order 유지
- exact anchor 유지
- 좌우 flip 호환성 판단
- 최종 atlas metadata 생성

GPT reference prompt 초안

```text
Transform this 3D vehicle pose sheet into a reference-only retro arcade racing sprite style.

Keep the exact 3 columns x 4 rows layout, exact pose order, and transparent background.
Do not invent new poses.
Do not add brake glow, boost glow, shadow, smoke, text, road, or UI.

Style target:
- late 80s / early 90s pseudo-3D arcade racing sprite
- crisp hard-edged highlights
- limited palette
- readable rear lights, rear glass, roofline, bumper, wheel arches
- preserve GT86 compact coupe proportions

This image is only for style reference.
Do not optimize for photorealism.
Do not change vehicle identity between cells.
```

GPT review prompt 초안

```text
Review this vehicle sprite sheet candidate for a pseudo-3D racing game.

Return a concise correction checklist, not a new image.
Check:
- pose order consistency
- center / steer-right-1 / steer-right-2 readability
- rear silhouette
- wheel arch readability
- rear light readability
- excess photorealistic noise
- alpha or shadow contamination risk
- whether left states can be made with flipX

Prioritize corrections that can be implemented with deterministic pixel processing.
```

6단계: 수동 보정 도구

오픈소스 수동 보정 후보

- Pixelorama
  - 가장 먼저 추천한다.
  - 현대적인 pixel art editor이고 Windows/macOS/Linux/Web을 지원한다.
  - GT86 후보 sheet를 열어 rear light, wheel arch, roofline을 수동으로 정리하기 좋다.
- LibreSprite
  - Aseprite의 마지막 GPL 계열 fork다.
  - sprite sheet와 frame 단위 편집 감각이 좋다.
  - UI/안정성은 직접 확인이 필요하다.
- GrafX2
  - 제한 palette와 고전 pixel art 작업에 강하다.
  - modern sprite sheet workflow는 Pixelorama보다 불편할 수 있지만 palette 감각을 잡기 좋다.

Aseprite는 도구로는 훌륭하지만 현재 완전한 오픈소스가 아니므로, 이 문서의 "오픈소스 추천"에는 넣지 않는다. 개인 작업 도구로 별도 선택할 수는 있다.

7단계: Apex Seoul 추천 실행 순서

1. GT86만 먼저 진행한다.
2. `poc-toyota-gt86-scaled.png`를 source로 `pixel-pass` 스크립트를 만든다.
3. 96px cell / 128px cell 두 후보를 만든다.
4. 각 후보에 outline pass를 적용한다.
5. GPT에는 두 후보를 넣고 "이미지 생성"이 아니라 "수정 checklist"를 받는다.
6. Pixelorama에서 11개 pose 중 `center`, `steer-right-1`, `steer-right-2`만 먼저 수동 보정한다.
7. Phaser 런타임에 임시 연결해서 실제 도로 위 스케일에서 읽히는지 확인한다.
8. 통과하면 나머지 uphill/downhill/spin pose로 확장한다.
9. Stinger/G70은 GT86 pixel pass가 안정화된 뒤 같은 파이프라인으로 비교한다.

8단계: 성공 기준

- 1x 표시에서 GT86이 compact coupe로 읽힌다.
- `steer-right-1`과 `steer-right-2`가 구분된다.
- 후미등과 rear glass가 최소한의 픽셀로 읽힌다.
- 차체 아래 그림자가 base sprite에 과하게 붙어 있지 않다.
- 좌측 상태를 `flipX`로 만들었을 때 어색한 비대칭이 크지 않다.
- cell별 bbox와 baseline이 QA JSON에서 크게 흔들리지 않는다.
- 3D 렌더를 다시 돌려도 같은 결과를 재생성할 수 있다.

9단계: PerfectPixel 참고 자동화

PerfectPixel Studio는 캐릭터 애니메이션 sprite 생성 도구지만, Apex Seoul의 차량 후처리 자동화에 참고할 만한 구조가 많다. 특히 "AI output은 불안정하므로 deterministic post-processing으로 품질을 수렴시킨다"는 방향이 현재 Apex Seoul 원칙과 맞다.

검토 대상

```text
https://github.com/qlazzarus/perfectpixel-studio
upstream: https://github.com/gykim80/perfectpixel-studio
license: MIT
```

도입 판단

- 앱 전체 도입은 하지 않는다.
- Go/Wails GUI, 8-direction character workflow, motion preset catalog는 Apex Seoul 차량 파이프라인과 범위가 다르다.
- 대신 `internal/sprite`의 알고리즘 구조를 JS/Sharp 파이프라인으로 부분 포팅하거나 재구현한다.
- PerfectPixel은 "오픈소스 자동화 참고 구현"으로 문서화한다.

참고할 모듈 방향

```text
internal/sprite/chroma.go
- YCbCr chroma matting
- magenta/key background 제거, despill, flood fill 참고

internal/sprite/segment.go
- projection profile + DP optimal cut
- GPT/img2img가 만든 불균등 filmstrip split에 참고
- 단, Three.js 직접 렌더 결과는 이미 fixed grid이므로 우선순위 낮음

internal/sprite/extract.go
- alpha-weighted centroid
- bbox center가 아니라 차체 mass 중심/foot pivot 개념 참고

internal/sprite/pixelize.go
- shared palette quantization
- grid snap
- fake pixel-art를 실제 blocky sprite로 정리하는 단계 참고

internal/sprite/quantize.go
- median-cut/shared palette 설계 참고

internal/sprite/inspect.go
- frame count, identity drift, motion presence 검사 구조 참고
- 차량에서는 pose order, silhouette drift, anchor jitter 검사로 바꾼다.

internal/sprite/score.go
- quality score를 수치화하는 방식 참고
```

Apex Seoul에 맞춘 자동화 항목

```text
apex vehicle pixel pass
1. read pose sheet + metadata
2. split fixed 3x4 cells
3. alpha cleanup
4. low-res downscale
5. shared palette extraction across all used cells
6. palette quantization
7. grid snap
8. silhouette outline
9. alpha harden
10. anchor / baseline / bbox QA
11. magenta color-key preview
12. score report
```

PerfectPixel에서 그대로 가져오지 않을 것

- text-to-character generation
- 100+ motion preset
- 8-direction generation loop
- provider abstraction
- corrective regenerate loop
- GUI/session/gallery/export UI

PerfectPixel에서 우선 참고할 것

1. `shared-palette quantization`
   - pose별 색 흔들림을 막기 위해 GT86 11개 pose 전체에서 공통 palette를 만든다.
   - per-cell quantization은 금지한다.
2. `alpha-weighted centroid`
   - 차량 anchor는 bbox center보다 alpha centroid + rear baseline 조합이 낫다.
   - Apex Seoul에서는 차체 하단 중앙 또는 rear axle 근처를 anchor 후보로 둔다.
3. `score report`
   - 사람이 보기 전에 후보를 탈락시킬 수 있어야 한다.
   - score는 "게임에서 읽히는가" 기준으로 재정의한다.
4. `grid snap`
   - 사진풍 렌더를 단순 posterize하면 픽셀풍이 아니라 축소 사진처럼 보인다.
   - low-res grid에서 dominant color를 고정해 crisp한 블록감을 만든다.

Apex Seoul vehicle score 초안

```text
score starts at 100
-20 if any required cell is empty
-15 if bbox width/height varies too much between center/downhill/uphill variants
-15 if anchor x jitter exceeds threshold
-15 if center, steer-right-1, steer-right-2 silhouette difference is too small
-10 if semi-transparent base pixels exceed threshold
-10 if palette color count exceeds target
-10 if bottom shadow contamination exceeds threshold
-10 if rear light pixels are lost in center pose
```

권장 구현 순서

1. `scripts/pixel-pass-vehicle-sheet.mjs`를 만든다.
2. 입력은 `poc-toyota-gt86-scaled.png`와 해당 JSON metadata로 제한한다.
3. 96px cell과 128px cell 후보를 둘 다 만든다.
4. shared palette extraction을 먼저 구현한다.
5. alpha centroid / bbox / baseline QA JSON을 만든다.
6. score report를 만든다.
7. outline은 score report 이후에 붙인다.
8. GPT review prompt에는 score report와 preview PNG를 함께 넣는다.
9. Pixelorama 수동 보정은 score가 일정 기준 이상인 후보에만 한다.

파일 구조 제안

```text
games/apex-seoul/assets/vehicles/generated/pixel-candidates/
  gt86-96/
    sheet.png
    preview-magenta.png
    qa.json
    score.json
  gt86-128/
    sheet.png
    preview-magenta.png
    qa.json
    score.json

games/apex-seoul/scripts/
  pixel-pass-vehicle-sheet.mjs
  score-vehicle-sprite-sheet.mjs
```

자동화 기준

- deterministic script가 만든 결과만 `generated/pixel-candidates`에 둔다.
- 수동 보정 결과는 `approved/sprites`로 승격한다.
- GPT 생성 이미지는 `img2img-candidates`에만 둔다.
- GPT가 만든 이미지를 바로 `approved`로 올리지 않는다.
- score report와 사람이 보는 preview가 모두 있어야 다음 단계로 넘긴다.

참고 후보

- sharp: https://sharp.pixelplumbing.com/api-resize
- pngquant: https://pngquant.org/
- ImageMagick: https://imagemagick.org/
- PerfectPixel Studio: https://github.com/qlazzarus/perfectpixel-studio
- Pixelorama: https://github.com/Orama-Interactive/Pixelorama
- LibreSprite: https://github.com/LibreSprite/LibreSprite
- GrafX2: https://gitlab.com/GrafX2/grafX2
