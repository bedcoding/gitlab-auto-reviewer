# GitLab Auto Reviewer
GitLab Merge Request 생성 시 리뷰어를 자동으로 선택하는 크롬 확장 프로그램입니다.
GitLab은 리뷰어가 리스트에 없는 경우가 많아서 매번 리뷰어를 일일이 검색해서 선택해야 했는데, 그런 번거로움을 해결하기 위해 만들었습니다.

## 설치 전 설정 (선택사항)
특정 GitLab 도메인으로 제한하고 싶다면 `manifest.json` 파일을 수정하세요:
- 12번째 줄: `"https://*/*"` → `"https://your-gitlab.com/*"`
- 21-22번째 줄: `"https://*/*/merge_requests/..."` → `"https://your-gitlab.com/*/merge_requests/..."`

## 크롬에서 확장 프로그램 로드하는 방법
1. 크롬 브라우저를 열고 주소창에 `chrome://extensions/` 입력
2. 우측 상단의 **"개발자 모드"** 활성화
3. **"압축해제된 확장 프로그램을 로드합니다"** 클릭
4. 이 프로젝트의 `gitlab-auto-reviewer` 폴더 선택

## 사용 방법
1. GitLab MR 페이지에서 크롬 확장 프로그램 아이콘 클릭
2. 리뷰어 이름 또는 GitLab 사용자 이름 입력
3. "GitLab에 추가" 버튼 클릭

## 수정 후 반영
1. 코드 수정 후 `chrome://extensions/` 페이지에서 확장 프로그램 옆 새로고침 버튼 클릭
2. GitLab 페이지도 새로고침