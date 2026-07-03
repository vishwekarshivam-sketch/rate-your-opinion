let validUsers = ['AJAY', 'SARVESH', 'SHIVAM', 'SARBJEET', 'OM', 'JATIN', 'AVIRAL'];

let currentUser = localStorage.getItem('ryo_user');
let questionsData = [];
let refreshTimer = null;
let voteInProgress = false;
let awaitingPassword = false;
let currentFilter = localStorage.getItem('ryo_filter') || 'unvoted';

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
const voterList = document.getElementById('voter-list');
const addVoterInput = document.getElementById('add-voter-input');
const addVoterBtn = document.getElementById('add-voter-btn');
const voterError = document.getElementById('voter-error');

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
  loadVoters();
  if (currentUser && (validUsers.includes(currentUser) || currentUser === 'FRESHER')) {
    enterMainScreen();
  }
}

async function loadVoters() {
  try {
    const res = await fetch('/api/users');
    if (res.ok) validUsers = await res.json();
  } catch {}
}

// ========== Navigation ==========

function showLoginScreen() {
  loginScreen.classList.add('active');
  mainScreen.classList.remove('active');
  stopAutoRefresh();
  resetLoginState();
}

function enterMainScreen() {
  loginScreen.classList.remove('active');
  mainScreen.classList.add('active');
  const initial = currentUser === 'FRESHER' ? 'F' : currentUser.charAt(0);
  userAvatar.textContent = initial;
  userDisplay.textContent = currentUser;
  const isAdmin = currentUser === 'SHIVAM';
  document.querySelector('.add-question-card').style.display = isAdmin ? 'block' : 'none';
  document.querySelector('.admin-voters-card').style.display = isAdmin ? 'block' : 'none';
  if (isAdmin) renderVoterList();
  loadQuestions();
  startAutoRefresh();
}

// ========== Auth ==========

const passwordInput = document.getElementById('password-input');

loginBtn.addEventListener('click', () => {
  const lockedUser = localStorage.getItem('ryo_locked_user');

  if (awaitingPassword) {
    const pw = passwordInput.value.trim();
    if (pw === 'originaltb') {
      awaitingPassword = false;
      currentUser = 'SHIVAM';
      localStorage.setItem('ryo_user', 'SHIVAM');
      if (!lockedUser) localStorage.setItem('ryo_locked_user', 'SHIVAM');
      resetLoginState();
      enterMainScreen();
    } else {
      loginError.textContent = 'Wrong password.';
      passwordInput.value = '';
      passwordInput.focus();
    }
    return;
  }

  const name = nameInput.value.trim().toUpperCase();

  if (validUsers.includes(name)) {
    if (lockedUser && lockedUser !== name) {
      loginError.textContent = `This device is locked to ${lockedUser}.`;
      showToast(`Device locked to ${lockedUser}`, 'error');
      return;
    }

    if (name === 'SHIVAM') {
      awaitingPassword = true;
      passwordInput.classList.remove('hidden');
      passwordInput.focus();
      nameInput.disabled = true;
      loginBtn.textContent = 'Verify';
      loginError.textContent = '';
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

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && awaitingPassword) loginBtn.click();
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

function resetLoginState() {
  awaitingPassword = false;
  nameInput.disabled = false;
  loginBtn.textContent = 'Continue';
  passwordInput.classList.add('hidden');
  passwordInput.value = '';
  nameInput.value = '';
  loginError.textContent = '';
}

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

  questionsList.innerHTML = '';

  const isFresher = currentUser === 'FRESHER';
  const fragment = document.createDocumentFragment();

  if (isFresher && currentFilter === 'unvoted') currentFilter = 'newest';

  const sorted = [...questionsData].sort(sortQuestions);

  sorted.forEach(q => {
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

    if (currentUser === 'SHIVAM') {
      card.querySelector('.admin-actions').style.display = 'flex';
    }

    updateCardResults(card, q);

    const voteKeys = q.votes ? Object.keys(q.votes) : [];
    if (isFresher || voteKeys.length > 0) {
      resultsSection.classList.remove('hidden');
    }

    fragment.appendChild(node);
  });

  questionsList.appendChild(fragment);
  renderFilterBar();
}

function getAvg(q) {
  const keys = q.votes ? Object.keys(q.votes) : [];
  if (keys.length === 0) return undefined;
  return keys.reduce((acc, k) => acc + q.votes[k], 0) / keys.length;
}

function sortQuestions(a, b) {
  const ta = new Date(a.created_at).getTime();
  const tb = new Date(b.created_at).getTime();

  switch (currentFilter) {
    case 'unvoted': {
      const aVoted = a.votes && a.votes[currentUser] !== undefined;
      const bVoted = b.votes && b.votes[currentUser] !== undefined;
      if (aVoted !== bVoted) return aVoted ? 1 : -1;
      return tb - ta;
    }
    case 'newest':
      return tb - ta;
    case 'votes': {
      const ac = a.votes ? Object.keys(a.votes).length : 0;
      const bc = b.votes ? Object.keys(b.votes).length : 0;
      if (ac !== bc) return bc - ac;
      return tb - ta;
    }
    case 'highest': {
      const aa = getAvg(a);
      const ba = getAvg(b);
      if (aa === undefined && ba === undefined) return tb - ta;
      if (aa === undefined) return 1;
      if (ba === undefined) return -1;
      if (aa !== ba) return ba - aa;
      return tb - ta;
    }
    case 'lowest': {
      const aa = getAvg(a);
      const ba = getAvg(b);
      if (aa === undefined && ba === undefined) return tb - ta;
      if (aa === undefined) return 1;
      if (ba === undefined) return -1;
      if (aa !== ba) return aa - ba;
      return tb - ta;
    }
    default:
      return tb - ta;
  }
}

// ========== Filter Bar ==========

const filterCard = document.querySelector('.filter-card');

filterCard.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  const sort = btn.dataset.sort;
  if (sort === currentFilter) return;
  currentFilter = sort;
  localStorage.setItem('ryo_filter', sort);
  renderQuestions();
});

function renderFilterBar() {
  filterCard.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === currentFilter);
  });
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
      statusMsg.textContent = 'Tap another number to change your vote';
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

// ========== Voter Management ==========

addVoterBtn.addEventListener('click', async () => {
  const name = addVoterInput.value.trim().toUpperCase();
  if (!name) return;
  if (name === 'SHIVAM') { voterError.textContent = 'Admin already has access.'; return; }
  if (validUsers.includes(name)) { voterError.textContent = 'Voter already exists.'; return; }

  addVoterBtn.disabled = true;
  addVoterBtn.textContent = 'Adding...';
  voterError.textContent = '';

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add');
    }

    addVoterInput.value = '';
    validUsers.push(name);
    renderVoterList();
    showToast(`${name} added as voter`);
  } catch (err) {
    voterError.textContent = err.message;
    showToast(err.message, 'error');
  } finally {
    addVoterBtn.disabled = false;
    addVoterBtn.textContent = 'Add';
  }
});

addVoterInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addVoterBtn.click();
});

voterList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.voter-remove');
  if (!btn) return;
  const name = btn.dataset.name;

  try {
    const res = await fetch(`/api/users?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to remove');
    }
    validUsers = validUsers.filter(n => n !== name);
    renderVoterList();
    showToast(`${name} removed`);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function renderVoterList() {
  voterList.innerHTML = validUsers
    .filter(n => n !== 'SHIVAM')
    .map(n =>
      `<div class="voter-item">` +
        `<span>${n}</span>` +
        `<button class="voter-remove" data-name="${n}">✕</button>` +
      `</div>`
    ).join('');
}

// ========== Edit & Delete ==========

questionsList.addEventListener('click', (e) => {
  const card = e.target.closest('.question-card');
  if (!card) return;
  const id = card.dataset.questionId;

  if (e.target.classList.contains('admin-edit')) {
    enterEditMode(card, id);
    return;
  }
  if (e.target.classList.contains('admin-delete')) {
    deleteQuestion(id);
    return;
  }
  if (e.target.classList.contains('admin-save')) {
    saveEdit(card, id);
    return;
  }
  if (e.target.classList.contains('admin-cancel')) {
    cancelEdit(card);
    return;
  }
});

function enterEditMode(card) {
  const textEl = card.querySelector('.question-text');
  const actions = card.querySelector('.admin-actions');
  const original = textEl.textContent;

  const ta = document.createElement('textarea');
  ta.value = original;
  ta.className = 'edit-textarea';
  ta.rows = 2;
  textEl.replaceWith(ta);

  actions.innerHTML =
    '<button class="admin-btn admin-save">Save</button>' +
    '<button class="admin-btn admin-cancel">Cancel</button>';

  card.dataset.originalText = original;
  ta.focus();
}

function cancelEdit(card) {
  const ta = card.querySelector('.edit-textarea');
  const original = card.dataset.originalText;
  if (!ta || !original) return;
  const p = document.createElement('p');
  p.className = 'question-text';
  p.textContent = original;
  ta.replaceWith(p);

  const actions = card.querySelector('.admin-actions');
  actions.innerHTML =
    '<button class="admin-btn admin-edit">Edit</button>' +
    '<button class="admin-btn admin-delete">Delete</button>';
}

async function saveEdit(card, id) {
  const ta = card.querySelector('.edit-textarea');
  const text = ta.value.trim();
  if (!text) return;
  try {
    const res = await fetch('/api/questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, text })
    });
    if (!res.ok) throw new Error('Failed to save');
    showToast('Assumption updated');
    await loadQuestions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteQuestion(id) {
  if (!confirm('Delete this assumption permanently?')) return;
  try {
    const res = await fetch(`/api/questions?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    showToast('Assumption deleted');
    await loadQuestions();
  } catch (err) {
    showToast(err.message, 'error');
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
