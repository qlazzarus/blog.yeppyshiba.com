---
title: phaser3 에 패럴랙스 스크롤링 (parallax scrolling) 구현하기
date: 2022-05-25T11:29:27.092Z
summary: 아키타견은 일본의 대표적인 견종 중 하나로써, 일본 아키타현 지방의 개의 품종입니다. 의외로 역사는 짧은편에 속하는 견종으로 16세기 아키타 마타기라고 불리는 사냥을 위해 길러진 토착견이 기원입니다.
category: coding
image: https://www.encora.com/hubfs/how-to-take-advantage-of-parallax-in-programming-and-video-games-top-1.png
tags:
  - dev
  - coding
  - phaser
  - web game
  - parallax scroll
---

## 패럴랙스 스크롤링 (parallax scrolling) 이란?

패럴랙스 스크롤링(parallax scrolling)은 원거리에 있는 배경 이미지는 느리게 움직이게 하고, 근거리에 있는 사물 이미지는 빠르게 움직이도록 함으로써 2D 기반에서 입체감을 느낄 수 있게 만든 기법입니다. 하나의 이미지를 여러 개의 레이어(layer)로 분리한 후 스크롤에 반응하는 속도를 다르게 조정하는 방식으로 구현하게 됩니다. 1930년대부터 애니메이션 분야에 사용되던 기법이었으나, 최근에는 웹 디자인에서도 손쉽게 볼 수 있습니다.

![](https://upload.wikimedia.org/wikipedia/commons/d/d7/Parallax_scroll.gif)

## phaser3 코드를 작성해보자!

데모를 위해서 백그라운드 이미지가 필요합니다. 여기에서 저희는 이 [스프라이트](https://opengameart.org/content/cyberpunk-street-environment)들을 쓰겠습니다.

![정면](./../static/images/posts/202205/foreground.png)

![뒷 배경](./../static/images/posts/202205/back-buildings.png)

![멀리 있는 배경](./../static/images/posts/202205/far-buildings.png)

```typescript
import Phaser from "phaser";
import Back from "./assets/back-buildings.png";
import Far from "./assets/far-buildings.png";
import Foreground from "./assets/foreground.png";

class MyGame extends Phaser.Scene {
  back = null;

  preload() {
    this.load.image("Back", Back);
    this.load.image("Far", Far);
    this.load.image("Foreground", Foreground);
  }

  create() {
    this.back = addScaledBackground(this, "Back", 256, 192, 1);
  }

  update() {
    const speed = 4;
    if (this.back) {
      console.log(this.back);
      this.back.tilePositionX += speed;
    }
  }
}

const addScaledBackground = (
  scene,
  asset,
  textureWidth,
  textureHeight,
  scrollFactor
) => {
  const { width, height } = scene.scale;
  const scaledWidth = width / textureWidth;
  const scaledHeight = height / textureHeight;
  const scaled = Math.min(scaledWidth, scaledHeight);

  return scene.add
    .tileSprite(0, 0, width, height, asset)
    .setScale(scaled)
    .setOrigin(0.0, 0.0)
    .setScrollFactor(scrollFactor);
};

new Phaser.Game({
  type: Phaser.CANVAS,
  backgroundColor: "#000000",
  pixelArt: true,
  anitalias: false,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: "Phaser-Example",
    width: 800,
    height: 600
  },
  scene: MyGame
});

```

## 출처 및 참고

- https://ko.wikipedia.org/wiki/%ED%8C%A8%EB%9F%B4%EB%9E%99%EC%8A%A4_%EC%8A%A4%ED%81%AC%EB%A1%A4%EB%A7%81
- https://opengameart.org/content/cyberpunk-street-environment
