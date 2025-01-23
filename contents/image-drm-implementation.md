---
title: 이미지 DRM 구현을 위한 커스텀 이미지 포맷
date: 2025-01-23T04:22:06.385Z
category: coding
summary: 최근에 이미지 DRM 에 대한 관심으로, 구현 방법을 PoC 진행한 내용입니다.
image: https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1
tags:
    - dev
    - coding
    - drm
    - javascript
---

# 이미지 DRM 구현을 위한 커스텀 컨테이너 접근

이 글에서는 **이미지 DRM**(Digital Rights Management)을 간단히 구현하기 위한 방법으로, **커스텀 컨테이너 포맷**을 사용하는 과정을 살펴봅니다. 일반적인 PNG/JPEG 파일을 그대로 제공하면 네트워크 트래픽을 훔쳐보거나(패킷 스니핑, HTTP 후킹 등) 직접 다운로드해 무단으로 사용하는 경우가 발생할 수 있습니다. 이러한 문제를 방지하기 위해, **이미지를 암호화하여 커스텀 포맷으로 제공**하고, 클라이언트(앱, 웹)에서만 복호화해 볼 수 있도록 하는 방식을 소개합니다.

## DRM 개념과 필요성

- **DRM(Digital Rights Management)**: 디지털 콘텐츠(이미지, 동영상, 문서 등)를 무단으로 복제·배포·수정하는 행위를 방지하는 기술입니다.
- **문제 상황**:
    1. 일반 JPEG/PNG로 이미지를 제공하면, 단순 URL 접근으로 다운로드가 가능합니다.
    2. 네트워크 트래픽을 후킹(스니핑)하여 이미지를 추출할 수 있습니다.
- **해결 방향**:
    - **커스텀 포맷** 및 **암호화**를 적용하여, 표준 뷰어나 일반적인 방법으로는 파일을 열 수 없게 만듭니다.
    - 클라이언트는 인증된 환경에서만 **복호화 키**를 얻어 이미지를 표시할 수 있게 합니다.

---

## 커스텀 컨테이너 포맷 설계

### 1. 기본 구조

**파일(컨테이너) 헤더**:

- **매직 넘버**: 파일 식별을 위한 고유 문자열, 예: \`"CIMG"\`.
- **버전**: 포맷 버전 관리용 (정수).
- **암호화 방식**: AES, 기타 등등.
- **예약 영역**: 차후 확장을 위해 남겨둔 영역.

**파일 바디**:

- **암호화된 이미지 데이터**: 복호화 전까진 원본 이미지를 열람할 수 없습니다.

### 2. 흐름 요약

1. **서버**

    1. 원본 이미지를 읽음
    2. AES 등으로 암호화
    3. 헤더 + 암호화된 이미지 → 커스텀 컨테이너 \`.cimg\` 또는 \`.enc\` 등의 확장자로 제공

2. **클라이언트**
    1. 컨테이너 파일 수신
    2. 헤더 파싱 후, 암호화 방식 확인
    3. **복호화** (비밀 키 필요)
    4. 복호화된 이미지 데이터를 표준 뷰어(UIImage, HTML \`\<img\>\` 등)로 디스플레이

---

## 서버 측 구현 (Node.js 예시)

### 컨테이너 포맷

**헤더 구조 (예시 총 20바이트)**

| 오프셋 | 길이 | 설명                 |
| :----: | :--: | -------------------- |
|   0    |  4   | 매직 넘버 \`"CIMG"\` |
|   4    |  4   | 버전 (정수)          |
|   8    |  4   | 암호화 방식 (정수)   |
|   12   |  8   | 예약 (0으로 채움)    |

### 암호화/복호화 로직

- **AES-256-CBC** 기준:
    - 비밀 키: 32바이트(256비트)
    - IV(초기화 벡터): 16바이트
    - 암호화 데이터: \`[IV] + [암호화된 실제 이미지 데이터]\`

### CLI 도구 예시

아래는 Node.js 환경에서 이미지 파일을 **암호화**→컨테이너 생성, **복호화**→이미지 파일 추출을 수행하는 간단한 예시 코드입니다.

> **image_container_cli.js** (발췌)

```js
#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');

// 암호화 방식 식별자
const EncryptionMethod = {
    NONE: 0,
    AES_CBC: 1,
};

// 이미지 → 컨테이너 (암호화)
function createContainer({ imagePath, containerPath, encryptionMethod, secretKey }) {
    const imageData = fs.readFileSync(imagePath);
    let encryptedData;

    if (encryptionMethod === EncryptionMethod.NONE) {
        // 암호화 없이 그대로
        encryptedData = imageData;
    } else if (encryptionMethod === EncryptionMethod.AES_CBC) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
        encryptedData = Buffer.concat([iv, cipher.update(imageData), cipher.final()]);
    } else {
        throw new Error('지원하지 않는 암호화 방식');
    }

    // 헤더 생성 (20바이트)
    const header = Buffer.alloc(20);
    header.write('CIMG', 0, 4, 'utf8'); // 매직 넘버
    header.writeInt32BE(1, 4); // 버전 1
    header.writeInt32BE(encryptionMethod, 8); // 암호화 방식
    // 나머지 8바이트는 0 채움

    // 파일 합치기
    const containerData = Buffer.concat([header, encryptedData]);
    fs.writeFileSync(containerPath, containerData);
}

// 컨테이너 → 이미지 (복호화)
function extractImage({ containerPath, outputImagePath, secretKey }) {
    const containerData = fs.readFileSync(containerPath);

    // 헤더 읽기
    const magic = containerData.slice(0, 4).toString('utf8');
    if (magic !== 'CIMG') throw new Error('유효하지 않은 컨테이너');
    const encryptionMethod = containerData.readInt32BE(8);

    // 암호화된 데이터
    let encryptedData = containerData.slice(20);
    let imageData;

    if (encryptionMethod === EncryptionMethod.NONE) {
        imageData = encryptedData;
    } else if (encryptionMethod === EncryptionMethod.AES_CBC) {
        const iv = encryptedData.slice(0, 16);
        const actualEncrypted = encryptedData.slice(16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv);
        imageData = Buffer.concat([decipher.update(actualEncrypted), decipher.final()]);
    } else {
        throw new Error('지원하지 않는 암호화 방식');
    }

    fs.writeFileSync(outputImagePath, imageData);
}

// CLI 로직 (encrypt, decrypt 명령)
// ... (생략) ...
```

- **NONE**: 암호화 없이 컨테이너에 담을 수 있음
- **AES_CBC**: AES-256-CBC 적용

> **주의**: 실제 사용 시 **비밀 키**(32바이트)를 안전하게 관리해야 합니다.

---

## 클라이언트 측 구현

### iOS(Swift) 또는 Android

- **iOS(Swift)**:

    1. 서버에서 받은 컨테이너 파일(\`Data\`) 파싱
    2. 매직 넘버, 버전, 암호화 방식을 확인
    3. **CryptoKit** 등을 사용하여 복호화(AES-CBC 경우)
    4. 복호화된 \`Data\`를 \`UIImage\`로 변환해 표시

- **Android**:
    1. \`InputStream\`을 열어 바이너리 데이터를 읽고
    2. 헤더를 파싱
    3. \`Cipher.getInstance("AES/CBC/PKCS5PADDING")\` 사용
    4. 복호화된 바이트 배열을 \`BitmapFactory.decodeByteArray\`로 디코딩

### 웹 환경(HTML + JavaScript)

- **FileReader + Web Crypto API**를 사용
- **AES-CBC** 복호화를 위한 키(32바이트) 준비
- 초기화 벡터(IV)는 암호화된 데이터의 앞 16바이트
- 복호화 후 \`Blob\` → \`URL.createObjectURL\`로 \`\<img\>\`에 표시

> **HTML 예시 (요약)**

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
    </head>
    <body>
        <input type="file" id="fileInput" />
        <img id="preview" />

        <script>
            const KEY_HEX = 'f1e2...'; // 32바이트 Hex
            // 1) FileReader로 ArrayBuffer 읽기
            // 2) 헤더 파싱
            // 3) Web Crypto API로 복호화 (AES-CBC)
            // 4) Blob -> ObjectURL -> <img>에 표시
        </script>
    </body>
</html>
```

---

## 보안 고려사항

1. **키 관리**:

    - 클라이언트에 키가 노출되지 않도록 주의해야 합니다.
    - 앱 내부에 하드코딩된 키도 역공학에 취약할 수 있으므로, **서버와 안전한 통신**으로 키를 교환하거나 **토큰**을 사용하는 전략이 필요합니다.

2. **역공학 방지**:

    - 모바일 앱이나 웹 브라우저 환경에서, 결국 복호화 로직이 공개되어 있습니다.
    - 난독화(Obfuscation) 또는 각종 안티 디버깅, 루팅/탈옥 탐지 기법을 활용해 **공격 난이도**를 높일 수 있습니다.

3. **추가적인 DRM**:

    - 화면 캡쳐 방지, 워터마크 삽입, 법적 공지 등의 **복합적인 DRM 전략**이 필요할 수 있습니다.

4. **전달 방식 보안**:
    - 반드시 **HTTPS** 통신을 사용하여 네트워크 중간에서 스니핑되지 않도록 방지해야 합니다.
    - 서버 인증(토큰, OAuth 등)을 통해 인증된 사용자만 파일을 가져갈 수 있게 해야 합니다.

---

## 마무리

**이미지 DRM**을 완벽히 구현하기 위해서는 다양한 레이어의 보안 기법이 필요합니다. 여기서는 **커스텀 컨테이너 + 암호화** 방식을 통해 가장 기초적인 DRM 아이디어를 소개했습니다.

- **장점**:

    - 일반적인 뷰어로는 파일을 열 수 없어 무단 다운로드/복제 난이도 상승
    - 이미지 URL 노출 시에도 쉽게 원본을 볼 수 없음

- **한계**:
    - 복호화 로직이 결국 클라이언트에 있으므로 역공학에 대한 근본적 방어가 어렵습니다.
    - 스크린 캡처 등 다른 방식으로 유출될 수 있음

따라서 DRM을 강력히 구현하려면, **애플리케이션 레이어 보안**, **서버-클라이언트 인증 흐름**, **Tee(Trusted Execution Environment) 연동**, **FairPlay(Apple) / Widevine(Google)** 와 같은 상용 DRM 솔루션 등을 종합적으로 고려해야 합니다.

> 이 문서가 도움이 되셨다면, 댓글이나 피드백을 남겨주세요!  
> 더 궁금한 사항이 있으면 언제든지 문의 바랍니다.
