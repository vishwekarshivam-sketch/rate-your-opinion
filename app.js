const VALID_USERS = ['AJAY', 'SARVESH', 'SHIVAM', 'SARBJEET', 'OM', 'JATIN'];

let currentUser = localStorage.getItem('ryo_user');
let questionsData = [];

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const nameInput = document.getElementById('name-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const userDisplay = document.getElementById('user-display');
const logoutBtn = document.getElementById('logout-btn');
const questionsList = document.getElementById('questions-list');
const questionTemplate = document.getElementById('question-template');

// Add Question Elements
const newQuestionInput = document.getElementById('new-question-input');
const addQuestionBtn = document.getElementById('add-question-btn');
const addError = document.getElementById('add-error');

// Initialization
const fresherBtn = document.getElementById('fresher-btn');

function init() {
    if (currentUser && (VALID_USERS.includes(currentUser) || currentUser === 'FRESHER')) {
        showMainScreen();
    } else {
        showLoginScreen();
    }
}

// Navigation
function showLoginScreen() {
    loginScreen.classList.add('active');
    mainScreen.classList.remove('active');
}

function showMainScreen() {
    loginScreen.classList.remove('active');
    mainScreen.classList.add('active');
    userDisplay.textContent = currentUser;
    document.querySelector('.add-question-card').style.display = (currentUser === 'SHIVAM') ? 'block' : 'none';
    loadQuestions();
}

// Auth Logic
loginBtn.addEventListener('click', () => {
    const name = nameInput.value.trim().toUpperCase();
    if (VALID_USERS.includes(name)) {
        currentUser = name;
        localStorage.setItem('ryo_user', name);
        loginError.textContent = '';
        showMainScreen();
    } else {
        loginError.textContent = 'Invalid name. Please enter a recognized first name.';
    }
});

nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('ryo_user');
    nameInput.value = '';
    showLoginScreen();
});

fresherBtn.addEventListener('click', () => {
    currentUser = 'FRESHER';
    localStorage.setItem('ryo_user', 'FRESHER');
    loginError.textContent = '';
    showMainScreen();
});

// Data Loading
async function loadQuestions() {
    questionsList.innerHTML = '<div class="loader">Loading questions...</div>';
    try {
        const res = await fetch('/api/questions');
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to fetch: ${res.status} ${errText}`);
        }
        questionsData = await res.json();
        renderQuestions();
    } catch (err) {
        questionsList.innerHTML = `<div class="error">Error loading questions: ${err.message}</div>`;
        console.error(err);
    }
}

// Add Question Logic
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
        await loadQuestions(); // Reload to see the new question at the top
    } catch (err) {
        addError.textContent = 'Failed to add question. Please try again.';
        console.error(err);
    } finally {
        addQuestionBtn.disabled = false;
        addQuestionBtn.textContent = 'Add Question';
    }
});

// Render Questions
function renderQuestions() {
    questionsList.innerHTML = '';
    if (questionsData.length === 0) {
        questionsList.innerHTML = '<p>No assumptions added yet.</p>';
        return;
    }

    const isFresher = currentUser === 'FRESHER';

    questionsData.forEach(q => {
        const node = questionTemplate.content.cloneNode(true);
        const card = node.querySelector('.question-card');
        
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
                const val = parseInt(btn.dataset.val);
                if (userVote === val) {
                    btn.classList.add('selected');
                }
                
                btn.addEventListener('click', () => submitVote(q.id, val, rateBtns, statusMsg, card));
            });
        }

        const voteKeys = q.votes ? Object.keys(q.votes) : [];
        const avgSpan = node.querySelector('.avg-rating');
        const countSpan = node.querySelector('.votes');
        const votersList = node.querySelector('.voters-list');
        
        if (voteKeys.length > 0) {
            let sum = 0;
            voteKeys.forEach(k => sum += q.votes[k]);
            const avg = (sum / voteKeys.length).toFixed(1);
            
            avgSpan.textContent = avg;
            countSpan.textContent = voteKeys.length;
            votersList.textContent = `Voted by: ${voteKeys.join(', ')}`;
            
            if (voteKeys.length >= 6) {
                card.classList.add('completed');
            }
        } else {
            avgSpan.textContent = '0.0';
            countSpan.textContent = '0';
            votersList.textContent = 'No votes yet';
        }

        // Freshers always see results section, voters only see it if there are votes
        if (isFresher || voteKeys.length > 0) {
            resultsSection.classList.remove('hidden');
        }
        
        questionsList.appendChild(node);
    });
}

// Submit Vote
async function submitVote(questionId, rating, allBtns, statusMsg, cardElement) {
    // UI Feedback immediately
    allBtns.forEach(b => {
        b.disabled = true;
        b.classList.remove('selected');
        if (parseInt(b.dataset.val) === rating) {
            b.classList.add('selected');
        }
    });
    statusMsg.textContent = 'Saving...';
    
    try {
        const res = await fetch('/api/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questionId: questionId,
                user: currentUser,
                rating: rating
            })
        });
        
        if (!res.ok) {
            const errText = await res.json();
            throw new Error(errText.error || 'Failed to save vote');
        }
        
        const updatedData = await res.json();
        
        statusMsg.textContent = 'Saved!';
        statusMsg.style.color = 'var(--success)';
        
        setTimeout(() => {
            statusMsg.textContent = '';
            allBtns.forEach(b => b.disabled = false);
        }, 1500);

        // Update local data and re-render just the results part for this card
        const qIndex = questionsData.findIndex(q => q.id === questionId);
        if (qIndex !== -1) {
            questionsData[qIndex] = updatedData;
            updateCardResults(cardElement, updatedData);
        }
        
    } catch (err) {
        statusMsg.textContent = err.message || 'Error saving vote.';
        statusMsg.style.color = 'var(--error)';
        allBtns.forEach(b => b.disabled = false);
        console.error(err);
    }
}

function updateCardResults(cardElement, questionData) {
    const voteKeys = questionData.votes ? Object.keys(questionData.votes) : [];
    if (voteKeys.length > 0) {
        const resultsSection = cardElement.querySelector('.results-section');
        const avgSpan = cardElement.querySelector('.avg-rating');
        const countSpan = cardElement.querySelector('.votes');
        const votersList = cardElement.querySelector('.voters-list');
        
        let sum = 0;
        voteKeys.forEach(k => sum += questionData.votes[k]);
        const avg = (sum / voteKeys.length).toFixed(1);
        
        avgSpan.textContent = avg;
        countSpan.textContent = voteKeys.length;
        votersList.textContent = `Voted by: ${voteKeys.join(', ')}`;
        resultsSection.classList.remove('hidden');

        if (voteKeys.length >= 6) {
            cardElement.classList.add('completed');
        }
    }
}

// Start app
init();
