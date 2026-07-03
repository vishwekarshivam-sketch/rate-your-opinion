const VALID_USERS = ['AJAY', 'SARVESH', 'SHIVAM', 'SARBJEET', 'OM', 'JATIN'];

let currentUser = localStorage.getItem('ryo_user');
let questionsData = [];
let refreshTimer = null;
let voteInProgress = false;

// DOM
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const nameInput = document.getElementById('name-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const userDisplay = document.getElementById('user-display');
const userAvatar = document.getElementById('user-avatar');
const logoutBtn = document.getElementById('logout-btn');
const questionsList = document.getElementById('questions-list');
const questionTemplate = document.getElementById('question-template');
const newQuestionInput = document.getElementById('new-question-input');
const addQuestionBtn = document.getElementById('add-question-btn');
const addError = document.getElementById('add-error');
const fresherBtn = document.getElementById('fresher-btn');
const toastContainer = document.getElementById('toast-container');

// ========== Toast ==========

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('visible')));
  setTimeout(() => {
    toast.classList.add('exiting');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
  }, 2500);
}

// ========== Init ==========

function init() {
  if (currentUser && (VALID_USERS.includes(currentUser) || currentUser === 'FRESHER')) {
    enterMainScreen();
  }
}

// ========== Navigation ==========

function showLoginScreen() {
  loginScreen.classList.add('active');
  mainScreen.classList.remove('active');
  stopAutoRefresh();
}

function enterMainScreen() {
  loginScreen.classList.remove('active');
  mainScreen.classList.add('active');
  const initial = currentUser === 'FRESHER' ? 'F' : currentUser.charAt(0);
  userAvatar.textContent = initial;
  userDisplay.textContent = currentUser;
  document.querySelector('.add-question-card').style.display = (currentUser === 'SHIVAM') ? 'block' : 'none';
  loadQuestions();
  startAutoRefresh();
}

// ========== Auth ==========

loginBtn.addEventListener('click', () => {
  const name = nameInput.value.trim().toUpperCase();
  const lockedUser = localStorage.getItem('ryo_locked_user');

  if (VALID_USERS.includes(name)) {
    if (lockedUser && lockedUser !== name) {
      loginError.textContent = `This device is locked to ${lockedUser}.`;
      showToast(`Device locked to ${lockedUser}`, 'error');
      return;
    }

    currentUser = name;
    localStorage.setItem('ryo_user', name);
    if (!lockedUser) localStorage.setItem('ryo_locked_user', name);
    loginError.textContent = '';
    enterMainScreen();
  } else {
    loginError.textContent = 'Name not recognized.';
  }
});

nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', () => {
  currentUser = null;
  localStorage.removeItem('ryo_user');
  nameInput.value = '';
  loginError.textContent = '';
  showLoginScreen();
});

fresherBtn.addEventListener('click', () => {
  currentUser = 'FRESHER';
  localStorage.setItem('ryo_user', 'FRESHER');
  loginError.textContent = '';
  enterMainScreen();
});

// ========== Auto Refresh ==========

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(() => refreshInBackground(), 45000);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

async function refreshInBackground() {
  try {
    const res = await fetch('/api/questions');
    if (!res.ok) return;
    const fresh = await res.json();
    mergeQuestions(fresh);
  } catch {
    // silent
  }
}

function mergeQuestions(fresh) {
  const oldMap = new Map(questionsData.map(q => [q.id, q]));
  fresh.forEach(fq => {
    const existing = oldMap.get(fq.id);
    if (existing && JSON.stringify(existing.votes) !== JSON.stringify(fq.votes)) {
      const idx = questionsData.findIndex(q => q.id === fq.id);
      if (idx !== -1) questionsData[idx] = fq;
      const card = document.querySelector(`[data-question-id="${fq.id}"]`);
      if (card) updateCardResults(card, fq);
    }
    oldMap.set(fq.id, fq);
  });
  questionsData = fresh;
}

// ========== Data Loading ==========

async function loadQuestions() {
  if (questionsData.length > 0) {
    renderQuestions();
  } else {
    questionsList.innerHTML = '<div class="loader-container"><div class="loader-spinner"></div><div class="loader-text">Loading questions...</div></div>';
  }

  try {
    const res = await fetch('/api/questions');
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Server error (${res.status})`);
    }
    questionsData = await res.json();
    renderQuestions();
  } catch (err) {
    if (questionsData.length === 0) {
      questionsList.innerHTML = `<div class="error-block">Could not load questions. <br><small>${err.message}</small></div>`;
    }
    showToast(err.message, 'error');
  }
}

// ========== Add Question ==========

addQuestionBtn.addEventListener('click', async () => {
  const text = newQuestionInput.value.trim();
  if (!text) return;

  addQuestionBtn.disabled = true;
  addQuestionBtn.textContent = 'Adding...';
  addError.textContent = '';

  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, user: currentUser })
    });

    if (!res.ok) throw new Error('Failed to add');

    newQuestionInput.value = '';
    showToast('Assumption added!');
    await loadQuestions();
  } catch (err) {
    addError.textContent = 'Failed to add. Please try again.';
    showToast('Failed to add question', 'error');
  } finally {
    addQuestionBtn.disabled = false;
    addQuestionBtn.textContent = 'Add Question';
  }
});

// ========== Render ==========

function renderQuestions() {
  if (questionsData.length === 0) {
    questionsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">◆</div>No assumptions yet.</div>';
    return;
  }

  const existingIds = new Set();
  questionsList.querySelectorAll('.question-card').forEach(c => existingIds.add(c.dataset.questionId));

  const isFresher = currentUser === 'FRESHER';
  const fragment = document.createDocumentFragment();

  questionsData.forEach(q => {
    if (existingIds.has(q.id)) return;

    const node = questionTemplate.content.cloneNode(true);
    const card = node.querySelector('.question-card');
    card.dataset.questionId = q.id;

    node.querySelector('.question-text').textContent = q.text;

    const ratingSection = node.querySelector('.rating-section');
    const resultsSection = node.querySelector('.results-section');
    const rateBtns = node.querySelectorAll('.rate-btn');
    const statusMsg = node.querySelector('.status-msg');

    if (isFresher) {
      ratingSection.style.display = 'none';
    } else {
      const userVote = q.votes ? q.votes[currentUser] : null;
      rateBtns.forEach(btn => {
        const val = parseInt(btn.dataset.val, 10);
        if (userVote === val) btn.classList.add('selected');

        btn.addEventListener('click', () => {
          if (voteInProgress) return;
          submitVote(q.id, val, card);
        });
      });
    }

    updateCardResults(card, q);

    const voteKeys = q.votes ? Object.keys(q.votes) : [];
    if (isFresher || voteKeys.length > 0) {
      resultsSection.classList.remove('hidden');
    }

    fragment.appendChild(node);
  });

  questionsList.appendChild(fragment);

  // Re-render all to ensure correct ordering if data changed
  // Only reorder if we have all cards already
  const allCards = [...questionsList.querySelectorAll('.question-card')];
  if (allCards.length === questionsData.length) {
    const idOrder = new Map(questionsData.map((q, i) => [q.id, i]));
    allCards.sort((a, b) => idOrder.get(a.dataset.questionId) - idOrder.get(b.dataset.questionId));
    allCards.forEach(c => questionsList.appendChild(c));
  }
}

// ========== Vote ==========

async function submitVote(questionId, rating, cardElement) {
  voteInProgress = true;
  const allBtns = cardElement.querySelectorAll('.rate-btn');
  const statusMsg = cardElement.querySelector('.status-msg');

  allBtns.forEach(b => {
    b.disabled = true;
    b.classList.remove('selected');
    if (parseInt(b.dataset.val, 10) === rating) b.classList.add('selected');
  });
  statusMsg.textContent = 'Saving';

  try {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, user: currentUser, rating })
    });

    if (!res.ok) {
      let msg = 'Failed to save vote';
      try { const e = await res.json(); msg = e.error || msg; } catch {}
      throw new Error(msg);
    }

    const updatedData = await res.json();
    statusMsg.textContent = 'Saved';
    statusMsg.style.color = 'var(--success)';

    const idx = questionsData.findIndex(q => q.id === questionId);
    if (idx !== -1) questionsData[idx] = updatedData;
    updateCardResults(cardElement, updatedData);

    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.style.color = '';
      allBtns.forEach(b => b.disabled = false);
      voteInProgress = false;
    }, 2000);
  } catch (err) {
    statusMsg.textContent = 'Error';
    statusMsg.style.color = 'var(--error)';
    showToast(err.message, 'error');
    allBtns.forEach(b => {
      b.disabled = false;
      if (parseInt(b.dataset.val, 10) === rating) b.classList.remove('selected');
    });
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.style.color = '';
      voteInProgress = false;
    }, 2000);
  }
}

// ========== Update Results ==========

function updateCardResults(cardElement, questionData) {
  const votes = questionData.votes || {};
  const keys = Object.keys(votes);
  const resultsSection = cardElement.querySelector('.results-section');
  const avgSpan = cardElement.querySelector('.avg-rating');
  const countSpan = cardElement.querySelector('.votes');
  const votersList = cardElement.querySelector('.voters-list');
  const fillBar = cardElement.querySelector('.rating-bar-fill');

  if (keys.length > 0) {
    const sum = keys.reduce((acc, k) => acc + votes[k], 0);
    const avg = sum / keys.length;

    avgSpan.textContent = avg.toFixed(1);
    countSpan.textContent = keys.length;
    votersList.textContent = `Voted by: ${keys.join(', ')}`;
    votersList.style.display = (currentUser === 'SHIVAM') ? 'block' : 'none';

    if (fillBar) {
      fillBar.style.width = `${(avg / 10) * 100}%`;
    }

    resultsSection.classList.remove('hidden');

    if (keys.length >= 6) {
      cardElement.classList.add('completed');
    }
  } else {
    avgSpan.textContent = '0.0';
    countSpan.textContent = '0';
    votersList.textContent = '';
  }
}

init();
