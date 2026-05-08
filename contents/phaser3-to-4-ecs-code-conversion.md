---
title: Phaser 3 -> 4 실전 코드 변환편 (이동/점프/공격 로직)
date: 2026-05-08T10:20:00+09:00
summary: Phaser 3의 Scene 중심 Player 코드를 Phaser 4 ECS 스타일로 옮기는 과정을 실전 예시로 정리했습니다. 이동, 점프, 공격 로직을 단계별로 변환해봅니다.
category: coding
image: /images/posts/202605/phaser4-ecs.png
tags:
    - phaser
    - phaser3
    - phaser4
    - ecs
    - migration
    - game-dev
    - javascript
    - coding
---

# Phaser 3 -> 4 실전 코드 변환편 (이동/점프/공격 로직)

이전 글에서 체크리스트를 정리했다면,
이번 글은 **진짜 코드**를 바꾸는 단계다.

목표는 간단하다.

- Phaser 3의 `Scene + Player 객체` 중심 코드
- Phaser 4의 `ECS(Entity/Component/System)` 중심 코드

로 변환하는 감각을 익히는 것.

---

## 오늘 변환할 대상

플레이어 핵심 루프 3가지만 다룬다.

1. 좌우 이동
2. 점프
3. 공격(쿨다운 포함)

이 3개만 옮겨도 전체 구조가 왜 ECS로 바뀌는지 체감된다.

---

## 1) Phaser 3 기준 코드 (Before)

아래는 흔히 쓰는 Phaser 3 스타일이다.

```ts
// Phaser 3 스타일 (개념 예시)
class PlayerScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private attackKey!: Phaser.Input.Keyboard.Key;
    private canAttack = true;

    create() {
        this.player = this.physics.add.sprite(100, 200, 'player');
        this.player.setCollideWorldBounds(true);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    }

    update() {
        // 이동
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-220);
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(220);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        // 점프
        if (this.cursors.up.isDown && this.player.body.blocked.down) {
            this.player.setVelocityY(-420);
        }

        // 공격 + 쿨다운
        if (Phaser.Input.Keyboard.JustDown(this.attackKey) && this.canAttack) {
            this.canAttack = false;
            this.playAttackAnimation();

            this.time.delayedCall(250, () => {
                this.canAttack = true;
            });
        }
    }

    private playAttackAnimation() {
        this.player.play('attack', true);
    }
}
```

문제는 코드가 커질수록 `update()`가 비대해진다는 점이다.

- 입력
- 이동
- 물리
- 공격 쿨다운
- 애니메이션

이 한 클래스에 계속 붙는다.

---

## 2) ECS로 바꾸기 위한 1차 분해

먼저 “무엇을 데이터로 분리할지” 정한다.

- `Position`
- `Velocity`
- `MoveSpeed`
- `JumpPower`
- `Grounded`
- `AttackState` (쿨다운/타이머)
- `InputState`
- `Facing`

즉, Player 객체에 있던 상태를 컴포넌트로 쪼개는 게 1단계다.

---

## 3) 컴포넌트 정의 (After - Components)

```ts
// 개념 예시: ECS 컴포넌트
export type Entity = number;

export interface Position {
    x: number;
    y: number;
}

export interface Velocity {
    x: number;
    y: number;
}

export interface MoveSpeed {
    value: number;
}

export interface JumpPower {
    value: number;
}

export interface Grounded {
    value: boolean;
}

export interface Facing {
    dir: -1 | 1; // -1: left, 1: right
}

export interface InputState {
    left: boolean;
    right: boolean;
    jumpPressed: boolean;
    attackPressed: boolean;
}

export interface AttackState {
    cooldownMs: number;
    remainMs: number;
}
```

핵심은 “로직 없이 데이터만” 두는 것이다.

---

## 4) 시스템으로 로직 이동 (After - Systems)

### 4-1. InputSystem

```ts
export function inputSystem(player: Entity, world: World, keyboard: KeyboardState) {
    const input = world.inputState.get(player);
    if (!input) return;

    input.left = keyboard.left;
    input.right = keyboard.right;
    input.jumpPressed = keyboard.jumpPressed;
    input.attackPressed = keyboard.attackPressed;
}
```

### 4-2. MovementSystem

```ts
export function movementSystem(player: Entity, world: World) {
    const input = world.inputState.get(player);
    const vel = world.velocity.get(player);
    const speed = world.moveSpeed.get(player);
    const facing = world.facing.get(player);

    if (!input || !vel || !speed || !facing) return;

    if (input.left === input.right) {
        vel.x = 0;
        return;
    }

    if (input.left) {
        vel.x = -speed.value;
        facing.dir = -1;
    } else {
        vel.x = speed.value;
        facing.dir = 1;
    }
}
```

### 4-3. JumpSystem

```ts
export function jumpSystem(player: Entity, world: World) {
    const input = world.inputState.get(player);
    const vel = world.velocity.get(player);
    const grounded = world.grounded.get(player);
    const jumpPower = world.jumpPower.get(player);

    if (!input || !vel || !grounded || !jumpPower) return;

    if (input.jumpPressed && grounded.value) {
        vel.y = -jumpPower.value;
        grounded.value = false;
    }
}
```

![점프 로직 동작 예시](/images/posts/202605/phaser4-jump.png)

### 4-4. AttackSystem (쿨다운)

```ts
export function attackSystem(player: Entity, world: World, dtMs: number) {
    const input = world.inputState.get(player);
    const attack = world.attackState.get(player);

    if (!input || !attack) return;

    // 쿨다운 감소
    attack.remainMs = Math.max(0, attack.remainMs - dtMs);

    // 공격 입력 처리
    if (input.attackPressed && attack.remainMs === 0) {
        attack.remainMs = attack.cooldownMs;
        world.events.emit({ type: 'PLAYER_ATTACK', entity: player });
    }
}
```

`delayedCall` 대신 상태(`remainMs`)를 시스템에서 직접 관리하는 게 포인트다.

![공격 쿨다운 동작 예시](/images/posts/202605/phaser4-attack.png)

---

## 5) 렌더/물리 동기화는 별도 시스템으로

Phaser 3에서는 Sprite 객체를 직접 조작했지만,
ECS에서는 다음처럼 분리한다.

- 게임 규칙: ECS 시스템
- 엔진 반영: Sync 시스템

```ts
export function spriteSyncSystem(
    player: Entity,
    world: World,
    spriteMap: Map<Entity, Phaser.GameObjects.Sprite>,
) {
    const pos = world.position.get(player);
    const facing = world.facing.get(player);
    const sprite = spriteMap.get(player);

    if (!pos || !facing || !sprite) return;

    sprite.setPosition(pos.x, pos.y);
    sprite.setFlipX(facing.dir < 0);
}
```

이 구조의 장점은 테스트 가능성이다.

- ECS 로직은 Phaser 없이 단위 테스트 가능
- 렌더링 버그와 게임 규칙 버그를 분리 가능

---

## 6) 변환 순서 추천 (실무용)

한 번에 전부 갈아엎지 말고,
아래 순서로 안전하게 옮기는 게 좋다.

1. 입력 -> 이동 시스템부터 분리
2. 점프/중력 분리
3. 공격/쿨다운 분리
4. 애니메이션 트리거 이벤트화
5. 마지막에 렌더/물리 동기화 정리

---

## 7) 가장 자주 터지는 실수

- `dt`(delta time) 단위를 초/밀리초 혼용
- 입력을 시스템 여러 곳에서 중복 소비
- `Grounded` 갱신 타이밍이 충돌 처리보다 빠름
- 공격 쿨다운을 타이머 API와 상태값으로 이중 관리

특히 `InputState`는 프레임마다 갱신/초기화 규칙을 고정해두는 게 중요하다.

---

## 마무리

Phaser 3 -> 4 전환의 핵심은 문법이 아니라 **책임 분리**다.

- Player 클래스에 모아두던 로직을
- Component(상태)와 System(규칙)으로 나누면

기능 추가와 디버깅이 훨씬 쉬워진다.

다음 편에서는 이 구조에

- 적 AI 추적
- 피격/무적 프레임
- 스킬 콤보 입력

을 붙여서 확장하는 방법까지 이어서 다뤄보겠다.
