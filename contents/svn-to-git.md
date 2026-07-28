---
title: svn 사용자를 위한 git 안내서
date: 2022-01-23T15:00:00.000Z
updated: 2026-07-28T00:00:00.000Z
category: coding
summary: 여태까지 많은 git 안내서가 있지만, 이번에는 subversion 사용자를 위한 타겟으로 글을 작성해보겠습니다.
image: https://media.vlpt.us/images/_seeul/post/a13ec304-4219-49f9-b294-145e79459532/img.jpeg
tags:
    - svn
    - git
    - 버전관리
    - migration
---

## 들어가며
여태까지 많은 git 안내서가 있지만, 이번에는 subversion (aka: svn) 사용자를 위한 타겟으로 글을 작성해보겠습니다.

![subversion](https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Apache_Subversion_logo.svg/1200px-Apache_Subversion_logo.svg.png)
![git](https://media.vlpt.us/images/_seeul/post/a13ec304-4219-49f9-b294-145e79459532/img.jpeg)

## git 의 주요한 특징
먼저 git 은 subversion 과 달리 로컬에서도 원격에서도 저장이 됩니다. (원격 저장소를 여러개 두는 것도 가능하지만 여기서 다루지는 않겠습니다.)
그러다보니 commit 만 하고 끝이지 않냐? 라는 관성 때문에 많이들 고생하시고 계십니다..
이번은 주요한 소스 올리기와 공유 에 중점으로 다뤄보겠습니다.

## 먼저 바뀌는 개념

SVN에서 Git으로 넘어올 때 가장 헷갈리는 지점은 `commit`의 의미다. SVN의 commit은
보통 중앙 저장소에 변경을 보내는 행동이지만, Git의 commit은 내 컴퓨터의 로컬 저장소에
기록을 남기는 행동이다. 팀과 공유하려면 그 뒤에 push가 한 번 더 필요하다.

| SVN에서 하던 일 | Git에서 대응하는 흐름 | 기억할 점 |
| --- | --- | --- |
| `svn checkout` | `git clone` | 원격 저장소와 전체 이력을 로컬에 복제 |
| `svn update` | `git pull` | 원격 변경을 가져와 현재 브랜치에 반영 |
| `svn status` | `git status` | 수정·스테이징·추적 상태를 함께 확인 |
| `svn add` | `git add` | 커밋할 변경을 스테이징 영역에 선택 |
| `svn commit` | `git commit` 후 `git push` | 로컬 기록과 원격 공유가 분리됨 |

작업을 시작하거나 끝낼 때 `git status`를 보는 습관을 들이면 실수가 크게 줄어든다.
무엇이 수정됐는지, 아직 커밋하지 않은 파일이 있는지, 현재 브랜치가 어디인지 한 번에
확인할 수 있기 때문이다.

## 데이터 받아오기
svn 의 checkout 명령어 처럼 git 의 저장소를 가져오는 명령어는 clone 입니다.

로컬 저장소를 복제(clone)하려면 아래 명령을 실행하세요.

```bash
$ git clone /로컬/저장소/경로
```

원격 서버의 저장소를 복제하려면 아래 명령을 실행하세요.

```bash
$ git clone 사용자명@호스트:/원격/저장소/경로
```

## 데이터 가져오기
svn 의 update 명령어 처럼 git 의 저장소에서 데이터를 가져오는 명령어는 pull 입니다.

```bash
$ git pull
```

공동 작업 중이라면 pull 전에 로컬 변경이 남아 있는지 먼저 확인하는 편이 안전하다.
작업 중인 변경을 바로 섞고 싶지 않다면 먼저 커밋하거나, 임시 저장(`git stash`)한 뒤
원격 변경을 가져온다.

## 데이터 저장하기
svn 의 add / commit 명령어 처럼 git 의 저장소로 데이터를 저장하는 명령어는 git 도 동일합니다.

> 하지만 svn 과 다르게 한가지 동작이 더 필요합니다

기존 svn 에서는 다음의 명령어이면 서버로 업로드하는것이 끝나지만

```bash
$ svn add * --force
$ svn commit -m "add files"
```

git 에서는 다음의 명령어이면 **로컬 저장소** 로 저장이 됩니다.

```bash
$ git add *
$ git commit -m "add files"
```

이후로 서버에 업로드 하기 위해서는 다음의 명령어가 더 필요합니다!

```bash
$ git push origin master
```

최근 저장소의 기본 브랜치는 `master` 대신 `main`인 경우가 많다. 아래처럼 현재 브랜치
이름을 확인한 뒤 push 대상을 맞춘다.

```bash
$ git branch --show-current
$ git push origin main
```

## SVN 사용자에게 권하는 최소 작업 순서

새 기능이나 수정 하나를 끝냈을 때는 다음 순서가 무난하다.

```bash
$ git status
$ git diff
$ git add 파일경로
$ git commit -m "수정한 내용을 설명하는 메시지"
$ git push origin 현재브랜치
```

처음에는 `git add .`보다 파일 경로를 명시하는 편이 좋다. 의도하지 않은 설정 파일이나
생성 파일이 커밋에 들어가는 일을 줄일 수 있다. commit 메시지는 “수정”보다 무엇을 왜
바꿨는지 남겨두면, 나중에 이력을 찾을 때 도움이 된다.

## 브랜치와 충돌을 만났을 때

Git의 브랜치는 가볍게 만들 수 있지만, 여러 사람이 같은 줄을 수정하면 충돌이 생길 수
있다. 충돌 자체는 실패가 아니라 두 변경 중 어떤 내용을 남길지 사람이 결정해야 한다는
신호다. 충돌 표시를 확인해 코드를 정리한 뒤 `git add`, `git commit` 순서로 해결을
마무리한다. 이해하지 못한 충돌을 기계적으로 지우기보다, 원래 의도를 팀원과 확인하는
편이 안전하다.

SVN 저장소를 Git으로 실제 이전하는 작업은 이 글의 범위를 넘는다. 저장소 이력, 대용량
파일, 권한, CI 설정까지 함께 점검해야 하므로 별도의 백업과 테스트 저장소에서 먼저
연습하는 것을 권한다.

## 그리고 나머지들

git 은 svn 과 달리 merge / branch 생성이 비교적 쉽습니다. 하지만 이 단계에서 이야기할 것은 아닌 것 같습니다.

Ref.
* [git 이해하기](https://bravenamme.github.io/2021/09/01/Git/)
* [git tutorial](https://bravenamme.github.io/2019/06/11/git-tutorial/)
* [git - 간편 안내서](https://rogerdudler.github.io/git-guide/index.ko.html)
* [svn 사용자의 git 사용 후기](https://www.abel9999.com/2020/05/svn-git.html)
