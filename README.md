# 얼마지 생활계산기

정적 사이트 배포본입니다.

## RSS 갱신

가이드나 계산기 페이지를 추가·수정한 뒤 저장소 최상위에서 아래 명령을 실행하세요.

```sh
node scripts/build-rss.mjs
```

이 스크립트는 `sitemap.xml`과 각 HTML의 canonical, title, meta description을 읽어 `rss.xml`을 다시 생성합니다.
