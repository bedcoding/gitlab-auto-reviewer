// GitLab Auto Reviewer - Content Script

(function() {
  'use strict';

  // 설정에서 리뷰어 목록 가져오기
  async function getReviewers() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['reviewers'], (result) => {
        resolve(result.reviewers || []);
      });
    });
  }

  // 리뷰어 자동 추가 함수
  async function addReviewersAutomatically(reviewersList = null) {
    const reviewers = reviewersList || await getReviewers();

    if (reviewers.length === 0) {
      alert('리뷰어를 먼저 설정해주세요!\n확장 프로그램 아이콘을 클릭하여 설정할 수 있습니다.');
      return;
    }

    // 드롭다운 버튼 찾기 (여러 선택자 시도)
    const dropdownToggle = document.querySelector('.js-reviewer-search.dropdown-menu-toggle') ||
                          document.querySelector('.dropdown-menu-toggle.js-reviewer-search') ||
                          document.querySelector('[data-dropdown-header="Reviewer(s)"]') ||
                          document.querySelector('.js-issuable-form-dropdown.js-reviewer-search .dropdown-toggle');

    if (!dropdownToggle) {
      console.error('리뷰어 드롭다운 버튼을 찾을 수 없습니다.');
      alert('리뷰어 선택 영역을 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
      return;
    }

    // 드롭다운 열기
    dropdownToggle.click();
    await new Promise(resolve => setTimeout(resolve, 300));

    // 드롭다운이 실제로 열렸는지 확인
    const dropdownMenu = document.querySelector('.dropdown-menu.dropdown-menu-reviewer');
    if (!dropdownMenu || !dropdownMenu.classList.contains('show')) {
      console.log('GitLab Auto Reviewer: 드롭다운이 열리지 않음, 재시도');
      dropdownToggle.click();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('GitLab Auto Reviewer: 드롭다운 열림');

    // 검색 input 찾기
    const searchInput = document.querySelector('input[placeholder*="Search users"]') ||
                       document.querySelector('.js-reviewer-search input');

    if (!searchInput) {
      console.error('GitLab Auto Reviewer: 검색 input을 찾을 수 없음');
      alert('검색 input을 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
      return;
    }

    // 모든 리뷰어에 대해 검색 방식으로 추가
    for (const reviewer of reviewers) {
      console.log(`GitLab Auto Reviewer: "${reviewer}" 검색 시작`);

      // 이미 선택된 리뷰어인지 실제로 확인 (Reviewers 섹션 체크)
      const selectedReviewers = document.querySelectorAll('[data-testid="reviewers-select"] .gl-avatar-labeled-sublabel, .js-reviewer-search .value .author');
      let alreadySelected = false;
      for (const selected of selectedReviewers) {
        if (selected.textContent.includes(reviewer) || selected.textContent.includes(`@${reviewer}`)) {
          console.log(`GitLab Auto Reviewer: "${reviewer}" 이미 선택되어 있음, 스킵`);
          alreadySelected = true;
          addedCount++;
          break;
        }
      }

      if (alreadySelected) {
        continue;
      }

      // 검색 필드에 포커스
      searchInput.focus();
      await new Promise(resolve => setTimeout(resolve, 30));

      // 기존 텍스트 길이만큼 delete 반복하여 전부 삭제
      const currentLength = searchInput.value.length;
      if (currentLength > 0) {
        console.log(`GitLab Auto Reviewer: 기존 텍스트 삭제 (${currentLength}글자)`);
        for (let i = 0; i < currentLength; i++) {
          document.execCommand('delete', false, null);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 검색어 입력 (실제 사용자 타이핑처럼)
      document.execCommand('insertText', false, reviewer);

      // execCommand가 제대로 작동하지 않으면 fallback
      if (searchInput.value !== reviewer) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(searchInput, reviewer);

        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: reviewer
        });
        searchInput.dispatchEvent(inputEvent);
      }

      console.log(`GitLab Auto Reviewer: 검색어 입력 완료: "${searchInput.value}"`);

      // UI 변화 감지하여 검색 결과 대기
      const dropdownContent = document.querySelector('.dropdown-menu-reviewer .dropdown-content');

      const firstResult = await new Promise((resolve) => {
        let timeoutId;
        let observer;

        const checkAndResolve = () => {
          // .is-focused 클래스를 가진 항목 찾기
          const focusedItem = dropdownContent.querySelector('.is-focused');
          if (focusedItem && !focusedItem.textContent.includes('No matching results')) {
            if (observer) observer.disconnect();
            if (timeoutId) clearTimeout(timeoutId);
            resolve(focusedItem);
            return true;
          }
          return false;
        };

        // MutationObserver로 UI 변화 감지
        observer = new MutationObserver((mutations) => {
          // childList 변화 또는 is-focused 클래스 추가를 감지
          for (const mutation of mutations) {
            if (mutation.type === 'childList' ||
                (mutation.type === 'attributes' && mutation.attributeName === 'class')) {
              if (checkAndResolve()) {
                return;
              }
            }
          }
        });

        observer.observe(dropdownContent, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class']
        });

        // 즉시 한 번 체크
        setTimeout(() => {
          if (!checkAndResolve()) {
            // 100ms 후 한 번 더 체크
            setTimeout(checkAndResolve, 100);
          }
        }, 50);

        // 최대 2초 타임아웃
        timeoutId = setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, 2000);
      });

      if (firstResult) {
        console.log(`GitLab Auto Reviewer: "${reviewer}" 검색 결과 발견`);
        firstResult.click();
        await new Promise(resolve => setTimeout(resolve, 300));

        console.log(`GitLab Auto Reviewer: "${reviewer}" 추가 성공`);
      } else {
        console.error(`GitLab Auto Reviewer: "${reviewer}" 검색 결과 없음`);
        throw new Error(`검색 실패: "${reviewer}"`);
      }
    }

    // 드롭다운 닫기
    if (dropdownToggle) {
      document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('.dropdown-menu')) {
          document.removeEventListener('click', closeDropdown);
        }
      });
    }
  }

  // 팝업으로부터 메시지 수신
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'addReviewers') {
      console.log('GitLab Auto Reviewer: 팝업으로부터 메시지 수신', request.reviewers);

      // 비동기 함수 실행
      addReviewersAutomatically(request.reviewers)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('GitLab Auto Reviewer: 에러 발생', error);
          sendResponse({ success: false, error: error.message });
        });

      // 비동기 응답을 위해 true 반환
      return true;
    }
  });
})();
