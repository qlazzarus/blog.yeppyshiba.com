---
title: 2.5D 구현하기 - 쿼터뷰
date: 2022-03-27T09:00:00.000Z
updated: 2026-07-28T00:00:00.000Z
category: coding
summary:
    여러번 2D 게임을 만들기도 하고 즐기기도 하면서 여러가지 게임 그래픽에 대한 테크닉에 대해서 공부를 해보았습니다.
    이번에는 그 중에서 쿼터뷰에 대해서 이야기를 해보고자 합니다.
image: https://imagescdn.gettyimagesbank.com/500/19/592/773/0/1147490682.jpg
tags:
    - phaser
    - game-dev
    - webgame
    - isometric
    - 2.5d
    - graphics
---

## 들어가며

여러번 2D 게임을 만들기도 하고 즐기기도 하면서 여러가지 게임 그래픽에 대한 테크닉에 대해서 공부를 해보았습니다. [참고 - 울펜슈타인3D 는 과연 어떻게 3d를 구현했을까요?](/article/raycasting-pseudo-3d/)

이번에는 그 중에서 쿼터뷰에 대해서 이야기를 해보고자 합니다.

![quarter view](https://imagescdn.gettyimagesbank.com/500/19/592/773/0/1147490682.jpg)

## 등축 투영법

먼저 기본되는 원리를 알려면 **등축 투영법** 을 알아야 합니다. [참조](https://ko.wikipedia.org/wiki/%EB%93%B1%EC%B6%95_%ED%88%AC%EC%98%81%EB%B2%95)

원래는 제도 분야에서 많이 쓰이는 투영법 중 하나이지만, 게임 분야에서 복잡한 3D 계산을 하지 않고, 2D 그래픽만으로도 쉽게 표현할 수 있는 장점 때문에 많이 쓰이고 있습니다.

![등축 투영법](https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Perspective_isometrique_cube_gris.svg/330px-Perspective_isometrique_cube_gris.svg.png)

## 타일 기반 2D 게임

보통 2D 게임을 만들때 2D 좌표 기반으로 미리 그려진 이미지를 타일처럼
배치하는 형식으로 맵을 디자인하곤 합니다.

![2D Top down Game](https://assetstorev1-prd-cdn.unity3d.com/key-image/30beaf60-994f-490b-92fc-6e646716b869.png)

![2D tiles](https://cdn5.vectorstock.com/i/1000x1000/40/14/2d-tiles-set-for-top-down-games-vector-27294014.jpg)

이번에 소개해드릴 쿼터뷰도 동일하게 타일처럼 맵을 디자인할 수 있습니다.

![Isometric tilemap](https://cdn1.epicgames.com/ue/product/Featured/2DIsometricTilesSet_featured-894x488-796ca84f8f5fba03b3419a34848860d2.png)

다만 쿼터뷰는 일반적인 2차원 좌표계랑 다른데 어떻게 구성해야 할까요?

## Cartesian 좌표계 / Isometric 좌표계

> 일반적인 x/y 2차원 좌표계는 Cartesian 이라고 부릅니다.

일반적인 2d 타일맵을 아까 이야기 했던 **등축 투영법** 방식으로 표현한 것을 아까 이야기했던 쿼터뷰 혹은 isometric 이라고 부릅니다.

아래 사진처럼 수직축으로 45도 회전시킨 다음, 이어서 수평 축으로 +/- 35.264° [= arcsin(tan(30°))] 회전시킨 것과 같습니다.

![Cartesian grid vs. isometric grid](https://cdn.tutsplus.com/cdn-cgi/image/width=400/gamedev/uploads/2013/05/the_isometric_grid.jpg)

## 그럼 어떻게 표현해야 할까요?

아래 이 이미지는 32x32 사이즈의 투명한 배경을 가진 이미지입니다.

![isometric block](/images/posts/202203/iso-block.png)

쿼터뷰는 아래 사진을 이런식으로 배치하는 형식으로 시작됩니다.

![isometric block couple](/images/posts/202203/iso-block-couple.png)

단순히 이렇게 쌓는 것으로 끝입니다.

정리하자면 일반적인 2D 맵과 달리 isometric 은 아래와 같이 겹치는 구조로 되는 것 입니다.

![cartesian to isometric](/images/posts/202203/cartesian2isometric.png)

그렇다면 어떤 규칙으로 배치될까요?

식으로 표현하면

```javascript
const isoX = cartX - cartY;
const isoY = (cartX + cartY) / 2;
```

isometric 의 x 좌표는 기존 좌표계에서 x - y 를 뺀 값이며
(게임내 구현은 첨부된 이미지의 너비만큼 곱해야 합니다.)
y 좌표는 기존 좌표의 x + y 를 더한 값을 나눠야 합니다.

## 타일 크기를 반영한 좌표 변환

위 식은 원리를 설명하기 위한 단순한 형태다. 실제 화면에서는 타일의 너비와 높이를
반영해야 한다. 예를 들어 다이아몬드 타일의 너비가 `tileWidth`, 높이가 `tileHeight`일
때, 타일 좌표 `(gridX, gridY)`를 화면에 놓는 계산은 다음처럼 작성할 수 있다.

```javascript
function gridToScreen(gridX, gridY, tileWidth, tileHeight) {
  return {
    x: (gridX - gridY) * (tileWidth / 2),
    y: (gridX + gridY) * (tileHeight / 2),
  };
}
```

맵의 왼쪽 위가 화면 중앙에서 시작하도록 하려면, 계산한 `x`, `y`에 맵의 원점
`originX`, `originY`를 더하면 된다. 높이가 있는 블록이라면 블록 높이만큼 `y`에서
빼서 위로 쌓이는 모양을 만들 수 있다.

```javascript
const point = gridToScreen(gridX, gridY, 64, 32);
sprite.x = originX + point.x;
sprite.y = originY + point.y - elevation * 16;
```

## 화면 좌표에서 타일 찾기

마우스 클릭이나 터치로 선택한 위치가 어느 타일인지 알아내려면 역변환도 필요하다.
화면 원점을 뺀 값을 `localX`, `localY`라고 할 때, 대략적인 타일 좌표는 아래처럼
구할 수 있다.

```javascript
function screenToGrid(localX, localY, tileWidth, tileHeight) {
  const halfWidth = tileWidth / 2;
  const halfHeight = tileHeight / 2;

  return {
    x: Math.floor((localX / halfWidth + localY / halfHeight) / 2),
    y: Math.floor((localY / halfHeight - localX / halfWidth) / 2),
  };
}
```

경계에 걸친 클릭은 반올림만으로 정확하지 않을 수 있다. 실제 게임에서는 후보 타일의
다이아몬드 영역 안에 클릭 지점이 있는지 한 번 더 검사하면 선택감을 더 자연스럽게
만들 수 있다.

## 겹침 순서가 핵심이다

쿼터뷰에서 오브젝트가 어색하게 겹치는 문제는 좌표보다 그리기 순서에서 자주 생긴다.
바닥 타일과 캐릭터를 단순히 생성 순서대로 그리면 뒤에 있어야 할 캐릭터가 앞에 보일 수
있다. 기본 규칙은 화면의 아래쪽에 있는 오브젝트를 더 나중에 그리는 것이다.

```javascript
sprite.depth = gridX + gridY;
```

캐릭터처럼 키가 큰 스프라이트는 발이 닿는 지점을 기준으로 depth를 계산한다. 건물이나
나무는 높이·폭이 커서 하나의 숫자로 해결되지 않을 수 있으므로, 타일 단위로 쪼개거나
별도의 정렬 규칙을 두는 편이 낫다.

## 구현할 때 확인할 체크리스트

1. 타일 원점이 화면의 어디인지 정한다.
2. 모든 스프라이트가 같은 타일 크기와 앵커 기준을 쓰는지 확인한다.
3. 클릭 좌표를 역변환한 뒤 실제 타일 영역까지 검사한다.
4. 캐릭터와 오브젝트의 depth가 발 위치를 기준으로 정렬되는지 확인한다.
5. 높이가 있는 블록은 화면 위치와 depth 규칙을 함께 테스트한다.

이 원리만 이해하면 쿼터뷰는 복잡한 3D 엔진 없이도 충분히 설득력 있는 공간감을 만들 수
있다. 이후에는 타일맵 편집기, 충돌 처리, 카메라 이동을 더해 작은 등축 투영 게임으로
확장할 수 있다. 레이캐스팅 방식의 의사 3D와 비교하고 싶다면
[울펜슈타인 3D의 레이캐스팅 기록](/article/raycasting-pseudo-3d/)도 함께 참고해볼 만하다.

## 결과!

<div style={{ position: 'relative', height: 0, paddingBottom: '56.25%', paddingTop: '25px' }}>
  <iframe
    src="//labs.phaser.io/view-iframe.html?src=src/depth sorting/isometric blocks.js&v=3.55.2"
    style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      border: 0 
    }}
  />
</div>

Ref.

- [2.5D](https://en.wikipedia.org/wiki/2.5D)
- [아이소메트릭(isometric) 게임에 대한 설명 및 견해](https://rgy0409.tistory.com/608)
- [등축 투영법](https://ko.wikipedia.org/wiki/%EB%93%B1%EC%B6%95_%ED%88%AC%EC%98%81%EB%B2%95)
- [Creating Isometric Worlds: A Primer for Game Developers](https://gamedevelopment.tutsplus.com/tutorials/creating-isometric-worlds-a-primer-for-game-developers--gamedev-6511)
- [Converting X,Y grid coordinates to Crafty.js Isometric Coordinates](https://stackoverflow.com/questions/13092038/converting-x-y-grid-coordinates-to-crafty-js-isometric-coordinates/13198583)
