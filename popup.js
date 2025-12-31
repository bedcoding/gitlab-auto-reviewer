// GitLab Auto Reviewer - Popup Script

document.addEventListener('DOMContentLoaded', function() {
  const reviewerInput = document.getElementById('reviewerInput');
  const addButton = document.getElementById('addButton');
  const reviewerList = document.getElementById('reviewerList');
  const reviewerCount = document.getElementById('reviewerCount');

  // 리뷰어 목록 로드
  function loadReviewers() {
    chrome.storage.sync.get(['reviewers'], function(result) {
      const reviewers = result.reviewers || [];
      renderReviewers(reviewers);
      updateCount(reviewers.length);
    });
  }

  // 리뷰어 목록 렌더링
  function renderReviewers(reviewers) {
    reviewerList.innerHTML = '';

    if (reviewers.length === 0) {
      reviewerList.innerHTML = '<li class="empty-state">아직 등록된 리뷰어가 없습니다</li>';
      return;
    }

    reviewers.forEach((reviewer, index) => {
      const li = document.createElement('li');
      li.className = 'reviewer-item';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'reviewer-name';
      nameSpan.textContent = reviewer;

      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'button-group';

      const addToGitlabButton = document.createElement('button');
      addToGitlabButton.className = 'btn-add-gitlab';
      addToGitlabButton.textContent = 'GitLab에 추가';
      addToGitlabButton.onclick = () => addSingleReviewerToGitlab(reviewer);

      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn-delete';
      deleteButton.textContent = '삭제';
      deleteButton.onclick = () => deleteReviewer(index);

      buttonGroup.appendChild(addToGitlabButton);
      buttonGroup.appendChild(deleteButton);

      li.appendChild(nameSpan);
      li.appendChild(buttonGroup);
      reviewerList.appendChild(li);
    });
  }

  // 리뷰어 추가
  function addReviewer() {
    const reviewer = reviewerInput.value.trim();

    if (!reviewer) {
      showError('리뷰어 이름을 입력해주세요');
      return;
    }

    chrome.storage.sync.get(['reviewers'], function(result) {
      const reviewers = result.reviewers || [];

      if (reviewers.includes(reviewer)) {
        showError('이미 등록된 리뷰어입니다');
        return;
      }

      reviewers.push(reviewer);

      chrome.storage.sync.set({ reviewers }, function() {
        renderReviewers(reviewers);
        updateCount(reviewers.length);
        reviewerInput.value = '';
        reviewerInput.focus();
        // showSuccess('리뷰어가 추가되었습니다');
      });
    });
  }

  // 리뷰어 삭제
  function deleteReviewer(index) {
    chrome.storage.sync.get(['reviewers'], function(result) {
      const reviewers = result.reviewers || [];
      const deletedName = reviewers[index];
      reviewers.splice(index, 1);

      chrome.storage.sync.set({ reviewers }, function() {
        renderReviewers(reviewers);
        updateCount(reviewers.length);
        showSuccess(`"${deletedName}"이(가) 삭제되었습니다`);
      });
    });
  }

  // 카운트 업데이트
  function updateCount(count) {
    reviewerCount.textContent = `${count}명`;
  }

  // 성공 메시지 표시
  function showSuccess(message) {
    showMessage(message, 'success');
  }

  // 에러 메시지 표시
  function showError(message) {
    showMessage(message, 'error');
  }

  // 메시지 표시
  function showMessage(message, type) {
    // 기존 메시지 제거
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.classList.add('show');
    }, 10);

    setTimeout(() => {
      messageDiv.classList.remove('show');
      setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
  }

  // 개별 리뷰어를 GitLab에 추가
  function addSingleReviewerToGitlab(reviewer) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];

      console.log('현재 탭 URL:', currentTab.url);

      // GitLab MR 페이지인지 확인
      if (!currentTab.url || !currentTab.url.includes('/merge_request')) {
        showError(`GitLab MR 페이지에서 사용해주세요`);
        return;
      }

      // content.js로 메시지 전송 (1명만)
      console.log('메시지 전송 중:', reviewer);
      chrome.tabs.sendMessage(currentTab.id, {
        action: 'addReviewers',
        reviewers: [reviewer] // 1명만 배열로 전송
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('에러 상세:', chrome.runtime.lastError);
          showError('확장 프로그램과 GitLab 페이지를 모두 새로고침 후 다시 시도해주세요');
        } else if (response && response.success) {
          console.log('성공:', response);
          showSuccess(`"${reviewer}" 추가됨`);
        } else {
          console.log('응답:', response);
          showError(`"${reviewer}" 추가 실패`);
        }
      });
    });
  }

  // 이벤트 리스너
  addButton.addEventListener('click', addReviewer);

  reviewerInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addReviewer();
    }
  });

  // 초기 로드
  loadReviewers();
  reviewerInput.focus();
});
