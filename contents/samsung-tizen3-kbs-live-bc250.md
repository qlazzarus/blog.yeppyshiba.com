---
title: '장모님께 드라마를 보여드리기 위해 삼성 TV 앱을 만들었다.'
date: 2026-11-26T00:00:00+09:00
summary: '2017년형 삼성 UN55MU8000에 KBS 1TV 실시간 앱을 직접 만들고 설치했다. macOS 인증서 생성부터 Fedora BC-250 배포, install failed[118]과 실행 오류 해결까지 기록한다.'
category: coding
image: /images/posts/202611/samsung-tizen3-kbs-live-cover.webp
imageAlt: 삼성 TV와 개발용 노트북, 홈랩 서버를 연결한 Tizen 앱 개발 개념도
tags:
    - Samsung TV
    - Tizen
    - BC-250
    - Fedora
    - 홈랩
---

아기가 태어나고 장모님께서 아기를 봐주시러 우리 집에 오시는 일이 생겼다.

장모님께서는 평소 즐겨 보시는 KBS 1TV 드라마가 있는데, 문제는 우리 집 TV에서 KBS 1TV 본방송을 볼 수 없다는 것이었다. 아기를 돌보시다가 잠깐 쉬는 시간에 좋아하시는 드라마라도 편하게 보셨으면 좋겠는데, 그게 안 되니 여간 불편한 일이 아니었다.

우리 집에서 사용하는 TV는 2017년형 삼성 UN55MU8000이다. 출시된 지 꽤 오래된 모델이지만 아직 사용하는 데 큰 문제가 없어서 굳이 교체할 생각은 없었다.

그러다 문득 이런 생각이 들었다.

> 인터넷으로 KBS 실시간 방송을 볼 수 있다면, TV에서 직접 재생하는 앱을 만들면 되지 않을까?

장모님께서 사용하실 앱이니 복잡한 기능도 필요 없었다. 리모컨으로 앱을 선택하면 바로 KBS 1TV가 나오기만 하면 됐다.

그렇게 시작한 일이 삼성 스마트 TV의 운영체제인 Tizen을 살펴보고, 개발자 모드를 활성화하고, 직접 앱을 만들어 설치하는 작업으로 이어졌다.

HTML과 JavaScript로 작은 Tizen 웹 앱을 만들고, 삼성 TV의 AVPlay를 이용해 KBS 1TV 실시간 방송을 재생하도록 했다.

결과적으로 실제 TV에서 방송이 나오는 것까지 확인했다. 정작 시간이 많이 걸린 부분은 플레이어 코드보다 개발자 모드 설정, 인증서 등록, 구형 TV에 맞는 설치·실행 명령을 찾는 과정이었다.

장모님께 드라마를 보여드리려다 시작한 일이 어쩌다 보니 2017년형 스마트 TV의 트러블슈팅 기록이 되어버렸다.

이번 글은 그 과정을 다시 따라갈 수 있도록 남기는 기록이다. 루팅이나 펌웨어 변경 없이 개발자 모드와 서명된 앱만을 사용했다.

## 작업 환경

| 구성 | 사용 환경 |
|---|---|
| TV | Samsung UN55MU8000, 2017년형 |
| TV 플랫폼 | Tizen 3.0 |
| 앱 | HTML·CSS·JavaScript 기반 웹 앱 |
| 영상 재생 | Samsung AVPlay |
| 빌드·인증서 생성 | macOS, Tizen Studio |
| TV 연결·배포 | Fedora가 설치된 BC-250 |
| 배포 파일 | 서명된 `.wgt` |

맥북에서 앱을 빌드하고 서명한 뒤, BC-250으로 파일을 옮겨 TV에 설치했다.

영상은 TV가 방송 서버에서 직접 받아 재생한다. BC-250은 이번 구성에서 개발·배포용 컴퓨터 역할을 한다. 영상을 중계하거나 인코딩하지 않는다.

아래 명령의 IP와 SSH 사용자 이름 `user`는 예시다. 자신의 환경에 맞게 바꿔야 한다.

```text
TV:      192.168.0.19
BC-250:  192.168.0.57
```

## 1. TV 개발자 모드와 Host PC IP 설정

TV 앱스 화면에서 숫자 `12345`를 입력하면 개발자 모드 설정 창을 열 수 있다.

여기서 Developer Mode를 켜고, Host PC IP에 **TV에 연결할 컴퓨터의 주소**를 입력한다. 이번에는 BC-250에서 배포하므로 BC-250의 IP를 넣었다. 설정을 저장한 뒤 TV를 재부팅했다.

![삼성 UN55MU8000 앱스 화면 상단에 표시된 Developer Mode](/images/posts/202611/samsung-un55mu8000-developer-mode.webp)

*UN55MU8000 앱스 화면에 표시된 Developer Mode. Host PC IP도 별도로 설정해야 했다.*

이 과정에서 한 번 막혔다. 앱스 화면에는 `Developer Mode`가 표시되는데 SDB 연결은 계속 실패했다.

TV의 원격 API를 조회하니 다음 상태였다.

```json
{
  "developerMode": "1",
  "developerIP": "0.0.0.0"
}
```

개발자 모드만 켜졌고, 연결할 PC의 주소는 반영되지 않은 상태였다. Host PC IP를 다시 저장하고 재부팅한 뒤에는 아래처럼 확인됐다.

```json
{
  "developerMode": "1",
  "developerIP": "192.168.0.57"
}
```

조회에 사용한 명령은 다음과 같다.

```bash
curl -ksS --connect-timeout 3 --max-time 5 \
  https://192.168.0.19:8002/api/v2/ |
  python3 -m json.tool
```

이 명령의 `-k`는 로컬 TV의 HTTPS 인증서 검증을 생략한다.

BC-250에서 어떤 주소로 TV에 연결하는지 헷갈린다면 다음 명령의 `src` 값을 확인하면 된다.

```bash
ip route get 192.168.0.19
```

삼성의 [실제 TV 연결 안내](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)에서도 개발자 모드 설정, PC IP 입력, 재부팅을 안내한다.

## 2. Fedora에 SDB 설치

SDB는 Tizen 장치에 연결하는 개발 도구다.

이번에는 공식 Tizen 서버에서 SDB 4.2.36 Linux 배포 파일을 받아 사용했다. 파일명은 Ubuntu용이지만, 이번 BC-250의 Fedora 환경에서는 실행과 TV 연결에 성공했다.

```bash
sudo dnf install -y curl unzip

mkdir -p ~/samsung-tv/sdb-tools
cd ~/samsung-tv/sdb-tools

curl -fL --retry 3 \
  https://download.tizen.org/sdk/tizenstudio/official/binary/sdb_4.2.36_ubuntu-64.zip \
  -o sdb.zip

unzip -o sdb.zip
chmod +x data/tools/sdb

./data/tools/sdb version
```

이후 `sdb`를 PATH에 등록하고 TV에 연결했다.

```bash
mkdir -p ~/.local/bin

ln -sfn \
  ~/samsung-tv/sdb-tools/data/tools/sdb \
  ~/.local/bin/sdb

export PATH="$HOME/.local/bin:$PATH"

sdb connect 192.168.0.19:26101
sdb devices
```

연결 성공 시 다음과 같이 표시됐다.

```text
List of devices attached
192.168.0.19:26101   device   UN55MU8000
```

처음 실행할 때 나오는 `Server has started successfully`는 PC 쪽 SDB 서버가 시작됐다는 뜻이다. TV 연결 성공 여부는 `connected to ...`와 기기 목록의 `device` 상태로 확인했다.

## 3. KBS Live 앱 구성

앱은 실행할 때 KBS 공식 도메인의 API에서 1TV 방송 정보를 조회하고, 응답의 재생 주소를 AVPlay에 넘기도록 만들었다.


응답의 `channel_item` 중 다음 조건에 맞는 항목을 선택했다.

```text
channel_code = 11
media_type = tv
```

재생의 핵심 흐름은 다음과 같다.

```javascript
webapis.avplay.open(streamUrl);
webapis.avplay.setDisplayRect(0, 0, 1920, 1080);

webapis.avplay.prepareAsync(function () {
    webapis.avplay.play();
}, function (error) {
    // 오류 표시 및 재연결 처리
});
```

전체 앱에는 다음 동작을 넣었다.

- 실행 시 KBS 1TV 자동 재생
- 연결 실패 시 제한된 횟수의 재시도
- 리모컨 확인 버튼으로 재연결
- 리모컨 뒤로 버튼으로 종료
- 백그라운드로 이동할 때 플레이어 정리

구형 TV의 웹 엔진을 고려해 JavaScript는 ES5 문법으로 작성했다. 재생 API는 [삼성 AVPlay 안내](https://developer.samsung.com/smarttv/develop/guides/multimedia/media-playback/using-avplay.html)를 참고했다.

## 4. macOS에서 TV용 인증서 생성

Tizen Studio의 Package Manager에서 다음 확장을 설치했다.

- Samsung TV Extensions
- Samsung Certificate Extension

인증서는 Certificate Manager에서 **Samsung → TV**로 생성했다. Author 인증서와 Public 권한의 Distributor 인증서를 준비하고, Distributor 인증서에 대상 TV의 DUID를 등록했다.

여기서 주의할 점이 하나 있다. 앞에서 호출한 원격 API에도 `duid`라는 필드가 나오지만, 거기에 표시된 `uuid:...` 값을 인증서에 그대로 사용하지 않았다.

이 TV의 인증서용 DUID는 BC-250에서 다음 명령으로 조회했다.

```bash
sdb -s 192.168.0.19:26101 shell 0 getduid
```

출력된 값을 맥북 Certificate Manager의 DUID 목록에 수동으로 추가했다.

`capability` 명령으로는 플랫폼 정보를 확인할 수 있었지만, 이 모델에서는 DUID가 나오지 않았다.

```bash
sdb -s 192.168.0.19:26101 capability
```

확인된 주요 정보는 다음과 같다.

```text
platform_version:3.0
cpu_arch:armv7
sdk_toolpath:/home/owner/share/tmp/sdk_tools
intershell_support:disabled
```

마지막 항목처럼 일반 대화형 셸은 지원하지 않는다. SDB에 연결됐다고 해서 TV를 일반 Linux 서버처럼 사용할 수 있는 것은 아니다.

인증서 생성 절차는 [삼성 공식 문서](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)를 참고했다. 인증서 개인키와 비밀번호는 공개하지 않고 별도로 보관한다.

## 5. 빌드와 서명

이번 앱의 패키지 ID와 앱 ID는 다음과 같이 정했다.

```text
패키지 ID: KbsLive001
앱 ID:     KbsLive001.KBSLive
```

프로젝트 루트에서 실행하는 빌드·서명 명령은 다음과 같다. `app` 디렉터리에 `config.xml`과 웹 소스가 들어 있는 구성이다.

```bash
TIZEN="$HOME/tizen-studio/tools/ide/bin/tizen"

"$TIZEN" build-web -- app

mkdir -p dist

"$TIZEN" package \
  -t wgt \
  -s UN55MU8000 \
  -o "$PWD/dist" \
  -- "$PWD/app/.buildResult"
```

`UN55MU8000`은 내가 만든 인증서 프로필 이름이다. 다른 이름으로 만들었다면 해당 이름을 사용해야 한다.

빌드 결과는 다음 위치에 생성됐다.

```text
dist/KBS Live.wgt
```

배포할 때는 반드시 이 **서명된 파일**을 사용해야 한다. 중간에 만들어둔 unsigned WGT와 혼동하기 쉬웠다.

패키지 내부에 다음 파일이 있는지도 확인했다.

```text
author-signature.xml
signature1.xml
```

다만 이 파일들이 있다는 것만으로 해당 TV가 서명을 받아들인다는 의미는 아니다. 실제 설치 결과까지 확인해야 한다.

## 6. 첫 번째 실패: 전송은 됐는데 설치가 안 된다

처음에는 다음처럼 일반 SDB 설치 명령을 사용했다.

```bash
sdb -s 192.168.0.19:26101 install \
  ~/samsung-tv/KBSLive-signed.wgt
```

파일은 100% 전송됐지만 마지막에는 다음 메시지만 나왔다.

```text
closed
closed
```

설치 목록을 조회해도 KBS Live는 없었다.

```bash
sdb -s 192.168.0.19:26101 shell 0 applist
```

이때 알게 된 점은 **파일 전송 성공과 앱 설치 성공은 별개**라는 것이다.

이번 TV에서는 파일을 직접 전송한 뒤, TV용 설치 명령인 `vd_appinstall`을 사용했다.

```bash
sdb -s 192.168.0.19:26101 push \
  ~/samsung-tv/KBSLive-signed.wgt \
  /home/owner/share/tmp/sdk_tools/KBSLive-signed.wgt
```

```bash
sdb -s 192.168.0.19:26101 shell 0 vd_appinstall \
  KbsLive001 \
  /home/owner/share/tmp/sdk_tools/KBSLive-signed.wgt
```

원격 경로는 앞서 `capability`에서 확인한 `sdk_toolpath`를 사용했다. 다른 모델에서는 경로가 다를 수 있다.

## 7. 두 번째 실패: `install failed[118]`

TV용 설치 명령으로 바꾸자 설치 진행률이 나오기 시작했다. 하지만 22% 부근에서 실패했다.

```text
app_id[KbsLive001] installing[22]
app_id[KbsLive001] install failed[118]
cmd_ret:0
```

여기서 마지막 `cmd_ret:0`을 성공으로 해석하면 안 된다. 바로 위에 앱 설치 실패가 명시돼 있다.

이번에는 인증서와 함께 생성된 **`device-profile.xml`을 TV에 전달한 뒤** 설치가 성공했다.

맥북의 인증서 폴더에 있는 파일을 BC-250으로 옮겼다.

```bash
scp "$HOME/SamsungCertificate/UN55MU8000/device-profile.xml" \
  user@192.168.0.57:~/samsung-tv/device-profile.xml
```

BC-250에서 TV로 전달했다.

```bash
sdb -s 192.168.0.19:26101 push \
  ~/samsung-tv/device-profile.xml \
  /home/owner/share/tmp/sdk_tools/device-profile.xml
```

그다음 동일한 `vd_appinstall` 명령을 다시 실행했다.

이번에는 진행률이 100%까지 올라갔다.

```text
app_id[KbsLive001] installing[100]
app_id[KbsLive001] install completed
cmd_ret:0
```

삼성은 Device Manager의 **Permit to install applications** 절차를 안내한다. 이번 환경에서는 생성된 기기 프로필을 위 경로로 전달한 뒤 설치를 완료했다. [삼성 설치 문제 해결 안내](https://developer.samsung.com/smarttv/develop/faq/tizen-studio.html)

다만 모든 `118` 오류의 원인이 같다는 뜻은 아니다. 다른 환경이라면 인증서 체인, 대상 DUID, 유효기간, TV 시간 등도 확인해야 한다.

## 8. 세 번째 실패: 설치는 됐는데 실행이 안 된다

설치가 끝난 뒤 다음 명령을 실행했다.

```bash
sdb -s 192.168.0.19:26101 shell 0 execute \
  KbsLive001.KBSLive
```

이번에도 결과는 `closed`였고, 앱은 열리지 않았다.

해결 방법은 실행 명령을 **`was_execute`로 바꾸는 것**이었다.

```bash
sdb -s 192.168.0.19:26101 shell 0 was_execute \
  KbsLive001.KBSLive
```

이 명령으로 앱이 실행됐고 KBS 1TV 방송 재생까지 확인했다.

2017년형 Tizen 3.0 TV에서 `execute`가 실패하고 `was_execute`로 실행되는 동일한 문제가 [삼성 이슈 저장소](https://github.com/Samsung/Tizen.Issues/issues/120)에도 기록돼 있다.

## 이번에 막혔던 지점 정리

| 증상 | 이번 환경에서 확인한 내용·조치 |
|---|---|
| 개발자 모드는 켰는데 SDB 연결 실패 | Host PC IP가 `0.0.0.0`이었다. 배포 PC 주소를 저장하고 재부팅 |
| 원격 API의 `duid`가 `uuid:...`로 표시됨 | `sdb shell 0 getduid`로 인증서용 DUID 조회 |
| `sdb install`에서 전송 후 `closed` | `push`와 `vd_appinstall`로 설치 단계 분리 |
| `install failed[118]` | `device-profile.xml` 전달 후 재시도하여 성공 |
| 설치 후 `execute`가 `closed` 반환 | `was_execute`로 실행 성공 |

이번 작업에서 자주 만난 `closed`는 앱 자체의 오류를 설명해 주는 메시지가 아니었다. 연결된 TV가 해당 명령을 처리하는 방식부터 확인해야 했다.

## 실제 TV에서 재생 성공

최종적으로 UN55MU8000에서 직접 만든 KBS Live 앱이 실행됐고, KBS 1TV 방송 영상이 나오는 것을 확인했다.

![KBS 1TV 영상이 재생되고 하단에 스마트 허브 메뉴가 표시된 삼성 TV](/images/posts/202611/samsung-un55mu8000-kbs-live-running.webp)

*KBS Live 앱 실행 후 실제 TV에서 방송 재생을 확인했다. 사진은 스마트 허브 메뉴를 띄운 상태다.*

개발 중에는 맥북과 BC-250을 함께 사용했지만, 방송 재생 자체는 TV에서 처리한다. 별도의 영상 변환 서버를 추가할 필요는 없었다.

현재 확인한 범위는 앱 설치, 실행, 실제 방송 재생까지다. 장시간 시청 안정성, TV 재부팅 후 동작, 네트워크가 끊겼을 때의 복구는 더 사용해 보면서 확인할 예정이다.

2017년형 TV에 작은 앱 하나를 올리는 작업이었지만, 구형 플랫폼에서는 문서에 나온 명령 하나도 실제 기기와 맞춰봐야 한다는 걸 배웠다. 이번에는 `device-profile.xml`, `vd_appinstall`, `was_execute` 세 가지가 마지막 문을 열어줬다.
