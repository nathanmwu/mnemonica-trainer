// Mnemonica Stack
const mnemonica = [
    {pos: 1, card: '4♣'}, {pos: 2, card: '2♥'}, {pos: 3, card: '7♦'}, {pos: 4, card: '3♣'},
    {pos: 5, card: '4♥'}, {pos: 6, card: '6♦'}, {pos: 7, card: 'A♠'}, {pos: 8, card: '5♥'},
    {pos: 9, card: '9♠'}, {pos: 10, card: '2♠'}, {pos: 11, card: 'Q♥'}, {pos: 12, card: '3♦'},
    {pos: 13, card: 'Q♣'}, {pos: 14, card: '8♥'}, {pos: 15, card: '6♠'}, {pos: 16, card: '5♠'},
    {pos: 17, card: '9♥'}, {pos: 18, card: 'K♣'}, {pos: 19, card: '2♦'}, {pos: 20, card: 'J♥'},
    {pos: 21, card: '3♠'}, {pos: 22, card: '8♠'}, {pos: 23, card: '6♥'}, {pos: 24, card: '10♣'},
    {pos: 25, card: '5♦'}, {pos: 26, card: 'K♦'}, {pos: 27, card: '2♣'}, {pos: 28, card: '3♥'},
    {pos: 29, card: '8♦'}, {pos: 30, card: '5♣'}, {pos: 31, card: 'K♠'}, {pos: 32, card: 'J♦'},
    {pos: 33, card: '8♣'}, {pos: 34, card: '10♠'}, {pos: 35, card: 'K♥'}, {pos: 36, card: 'J♣'},
    {pos: 37, card: '7♠'}, {pos: 38, card: '10♥'}, {pos: 39, card: 'A♦'}, {pos: 40, card: '4♠'},
    {pos: 41, card: '7♥'}, {pos: 42, card: '4♦'}, {pos: 43, card: 'A♣'}, {pos: 44, card: '9♣'},
    {pos: 45, card: 'J♠'}, {pos: 46, card: 'Q♦'}, {pos: 47, card: '7♣'}, {pos: 48, card: 'Q♠'},
    {pos: 49, card: '10♦'}, {pos: 50, card: '6♣'}, {pos: 51, card: 'A♥'}, {pos: 52, card: '9♦'}
];

// Global variables
let currentMode = 'learn';
let learnIndex = 0;
let learnOrder = [...Array(52).keys()];
let showingFront = true;
let practiceIndex = 0;
let practiceOrder = [];
let startTime = null;
let timerInterval = null;
let selectedRank = '';
let selectedSuit = '';
let practiceStarted = false;
let currentPracticeType = 'hybrid';
let awaitingAnswer = false;
let sessionResults = [];
let sessionCorrect = 0;
let sessionTotal = 0;
let questionStartTime = null;
let stats = {sessions: 0, bestTime: null, totalTime: 0, correct: 0, attempts: 0};

// Card selection variables
let selectedCards = new Set([...Array(52).keys()]); // All cards selected by default
let availableCards = []; // Filtered list of selected card indices

// Load stats from memory
try {
    const saved = JSON.parse(localStorage.getItem('mnemonicaStats') || '{}');
    if (saved.sessions !== undefined) stats = saved;
} catch (e) {
    console.log('Could not load stats');
}

// Utility Functions
function formatCard(card) {
    const suit = card.slice(-1);
    const rank = card.slice(0, -1);
    const isRed = suit === '♥' || suit === '♦';
    return `<span class="card-name ${isRed ? 'red' : 'black'}">${card}</span>`;
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function saveStats() {
    localStorage.setItem('mnemonicaStats', JSON.stringify(stats));
}

// Mode switching
function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.mode-content').forEach(content => content.classList.remove('active'));
    
    document.getElementById(mode + 'Btn').classList.add('active');
    document.getElementById(mode).classList.add('active');
    
    if (mode === 'practice') {
        // Reset practice mode to start screen
        practiceStarted = false;
        awaitingAnswer = false;
        if (timerInterval) clearInterval(timerInterval);
        document.getElementById('practiceStart').classList.remove('hidden');
        document.getElementById('practiceSession').classList.add('hidden');
        document.getElementById('timer').textContent = '00:00';
    } else if (mode === 'stats') {
        updateStats();
    } else if (mode === 'selection') {
        initializeSelection();
    }
}

// Selection Mode Functions
function initializeSelection() {
    populateSelectionGrid();
    updateSelectionInfo();
}

function populateSelectionGrid() {
    const grid = document.getElementById('selectionGrid');
    grid.innerHTML = '';
    
    mnemonica.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = `selection-card ${selectedCards.has(index) ? 'selected' : ''}`;
        cardElement.dataset.index = index;
        
        const suit = card.card.slice(-1);
        const isRed = suit === '♥' || suit === '♦';
        
        cardElement.innerHTML = `
            <div class="card-pos">${card.pos}</div>
            <div class="card-value ${isRed ? 'red' : 'black'}">${card.card}</div>
        `;
        
        cardElement.addEventListener('click', () => toggleCardSelection(index));
        grid.appendChild(cardElement);
    });
}

function toggleCardSelection(index) {
    if (selectedCards.has(index)) {
        selectedCards.delete(index);
    } else {
        selectedCards.add(index);
    }
    
    populateSelectionGrid();
    updateSelectionInfo();
    updateAvailableCards();
}

function updateSelectionInfo() {
    const count = selectedCards.size;
    document.getElementById('selectionCount').textContent = `${count} of 52 cards selected`;
}

function updateAvailableCards() {
    availableCards = Array.from(selectedCards);
}

// Learn Mode Functions
function updateLearnDisplay() {
    const current = mnemonica[learnOrder[learnIndex]];
    const display = document.getElementById('learnDisplay');
    const showNumberFirst = document.getElementById('showNumberFirst').checked;
    
    if (showingFront) {
        if (showNumberFirst) {
            display.innerHTML = `<div class="position-number">${current.pos}</div>`;
        } else {
            display.innerHTML = formatCard(current.card);
        }
    } else {
        if (showNumberFirst) {
            display.innerHTML = formatCard(current.card);
        } else {
            display.innerHTML = `<div class="position-number">${current.pos}</div>`;
        }
    }
    
    updateLearnProgress();
}

function updateLearnProgress() {
    const progress = ((learnIndex + 1) / availableCards.length) * 100;
    document.getElementById('learnProgress').style.width = progress + '%';
}

function nextCard() {
    if (learnIndex < availableCards.length - 1) {
        learnIndex++;
        showingFront = true;
        updateLearnDisplay();
    }
}

function prevCard() {
    if (learnIndex > 0) {
        learnIndex--;
        showingFront = true;
        updateLearnDisplay();
    }
}

function flipCard() {
    showingFront = !showingFront;
    updateLearnDisplay();
}

// Practice Mode Functions
function startPractice() {
    if (availableCards.length === 0) {
        alert('Please select at least one card to practice with.');
        return;
    }
    
    practiceStarted = true;
    practiceIndex = 0;
    sessionResults = [];
    sessionCorrect = 0;
    sessionTotal = 0;
    
    // Get practice type
    currentPracticeType = document.getElementById('practiceType').value;
    
    // Create practice order from available cards
    practiceOrder = shuffleArray(availableCards);
    
    // Hide start screen, show practice session
    document.getElementById('practiceStart').classList.add('hidden');
    document.getElementById('practiceSession').classList.remove('hidden');
    
    // Start timer
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    
    // Show first question
    showPracticeQuestion();
}

function showPracticeQuestion() {
    if (practiceIndex >= practiceOrder.length) {
        endPractice();
        return;
    }
    
    const current = mnemonica[practiceOrder[practiceIndex]];
    const question = document.getElementById('practiceQuestion');
    awaitingAnswer = true;
    
    // Start timing for this question
    questionStartTime = Date.now();
    
    // Clear previous inputs and selections
    document.getElementById('numberTextInput').value = '';
    document.getElementById('cardDisplay').textContent = '';
    document.getElementById('cardDisplay').innerHTML = '';
    clearCardSelections();
    selectedRank = '';
    selectedSuit = '';
    
    // Force clear any lingering button states
    document.querySelectorAll('.rank-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelectorAll('.suit-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.getElementById('feedback').style.display = 'none';
    
    // Determine question type based on practice mode
    let askForNumber;
    if (currentPracticeType === 'numberFromCard') {
        askForNumber = true;
    } else if (currentPracticeType === 'cardFromNumber') {
        askForNumber = false;
    } else { // hybrid
        askForNumber = Math.random() < 0.5;
    }
    
    if (askForNumber) {
        question.innerHTML = formatCard(current.card);
        document.getElementById('numberInput').classList.remove('hidden');
        document.getElementById('cardInput').classList.add('hidden');
        document.getElementById('numberTextInput').focus();
    } else {
        question.innerHTML = `<div class="position-number">${current.pos}</div>`;
        document.getElementById('numberInput').classList.add('hidden');
        document.getElementById('cardInput').classList.remove('hidden');
    }
}

function clearCardSelections() {
    document.querySelectorAll('.rank-btn, .suit-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

function submitAnswer() {
    if (!awaitingAnswer) return;
    
    const current = mnemonica[practiceOrder[practiceIndex]];
    let correct = false;
    let userAnswer = '';
    let questionType = '';
    let questionText = '';
    let correctAnswer = '';
    
    if (!document.getElementById('numberInput').classList.contains('hidden')) {
        // Number guessing mode
        questionType = 'numberFromCard';
        questionText = `What position is ${current.card}?`;
        const inputValue = parseInt(document.getElementById('numberTextInput').value);
        userAnswer = inputValue ? `${inputValue}` : 'No answer';
        correctAnswer = `${current.pos}`;
        correct = inputValue === current.pos;
    } else {
        // Card guessing mode
        questionType = 'cardFromNumber';
        questionText = `What card is ${current.pos}?`;
        userAnswer = (selectedRank && selectedSuit) ? selectedRank + selectedSuit : 'No answer';
        correctAnswer = current.card;
        correct = userAnswer === current.card && selectedRank && selectedSuit;
    }
    
    // Calculate response time
    const responseTime = questionStartTime ? Date.now() - questionStartTime : 0;
    
    // Track session results
    sessionTotal++;
    const result = {
        questionType,
        questionText,
        userAnswer,
        correctAnswer,
        correct,
        card: current.card,
        position: current.pos,
        responseTime
    };
    sessionResults.push(result);
    
    if (correct) {
        sessionCorrect++;
    }
    
    awaitingAnswer = false;
    stats.attempts++;
    
    if (correct) {
        stats.correct++;
    }
    
    // Advance immediately to next question
    practiceIndex++;
    updatePracticeProgress();
    showPracticeQuestion();
}

function showAnswerAndAdvance() {
    if (!awaitingAnswer) return;
    
    const current = mnemonica[practiceOrder[practiceIndex]];
    let questionType = '';
    let questionText = '';
    let correctAnswer = '';
    let displayAnswer = '';
    
    // If number input is visible, user is guessing the position number
    if (!document.getElementById('numberInput').classList.contains('hidden')) {
        questionType = 'numberFromCard';
        questionText = `What position is ${current.card}?`;
        correctAnswer = `${current.pos}`;
        displayAnswer = `${current.pos}`;
    } else {
        // If card input is visible, user is guessing the card
        questionType = 'cardFromNumber';
        questionText = `What card is at position ${current.pos}?`;
        correctAnswer = current.card;
        displayAnswer = `${current.card}`;
    }
    
    // Calculate response time
    const responseTime = questionStartTime ? Date.now() - questionStartTime : 0;
    
    // Track session results (user skipped/showed answer)
    sessionTotal++;
    const result = {
        questionType,
        questionText,
        userAnswer: 'Skipped (showed answer)',
        correctAnswer,
        correct: false,
        card: current.card,
        position: current.pos,
        responseTime
    };
    sessionResults.push(result);
    
    awaitingAnswer = false;
    stats.attempts++;
    
    // Show the answer with neutral styling
    const feedback = document.getElementById('feedback');
    feedback.textContent = displayAnswer;
    feedback.className = 'feedback';
    feedback.style.display = 'block';
    feedback.style.background = '#e3f2fd';
    feedback.style.color = '#1565c0';
    
    setTimeout(() => {
        practiceIndex++;
        updatePracticeProgress();
        showPracticeQuestion();
    }, 2500);
}

function updatePracticeProgress() {
    const progress = (practiceIndex / practiceOrder.length) * 100;
    document.getElementById('practiceProgress').style.width = progress + '%';
}

function endPractice() {
    clearInterval(timerInterval);
    const elapsed = Date.now() - startTime;
    
    stats.sessions++;
    stats.totalTime += elapsed;
    if (!stats.bestTime || elapsed < stats.bestTime) {
        stats.bestTime = elapsed;
    }
    
    saveStats();
    showScoreSummary(elapsed);
}

function showScoreSummary(elapsed) {
    // Update score display
    const percentage = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;
    document.getElementById('scoreText').textContent = `${sessionCorrect}/${sessionTotal}`;
    document.getElementById('scorePercent').textContent = `(${percentage}%)`;
    document.getElementById('sessionTime').textContent = formatTime(elapsed);
    
    // Update score color based on performance
    const scoreMain = document.querySelector('.score-main');
    if (percentage === 100) {
        scoreMain.classList.add('perfect-score');
    } else {
        scoreMain.classList.remove('perfect-score');
    }
    
    // Populate incorrect answers
    const incorrectList = document.getElementById('incorrectList');
    const incorrectSection = document.getElementById('incorrectAnswers');
    const incorrectAnswers = sessionResults.filter(result => !result.correct);
    
    if (incorrectAnswers.length === 0) {
        incorrectSection.style.display = 'none';
    } else {
        incorrectSection.style.display = 'block';
        incorrectList.innerHTML = '';
        
        incorrectAnswers.forEach(result => {
            const item = document.createElement('div');
            item.className = 'incorrect-item';
            
            item.innerHTML = `
                <div class="incorrect-question">${result.questionText}</div>
                <div class="incorrect-details">
                    <span class="user-answer">Your answer: ${result.userAnswer}</span>
                    <span class="correct-answer">Correct: ${result.correctAnswer}</span>
                </div>
            `;
            
            incorrectList.appendChild(item);
        });
    }
    
    // Calculate and display timing analysis
    const responseTimes = sessionResults.filter(result => result.responseTime > 0).map(result => result.responseTime);
    
    if (responseTimes.length > 0) {
        const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        document.getElementById('avgResponseTime').textContent = `${(avgTime / 1000).toFixed(1)}s`;
        
        // Show slowest answers for targeted practice (top 5 or all if less than 5)
        const slowestAnswers = sessionResults
            .filter(result => result.responseTime > 0)
            .sort((a, b) => b.responseTime - a.responseTime)
            .slice(0, Math.min(5, sessionResults.length));
        
        const slowestList = document.getElementById('slowestList');
        const slowestSection = document.getElementById('slowestAnswers');
        
        if (slowestAnswers.length > 1) { // Only show if there are multiple answers to compare
            slowestSection.style.display = 'block';
            slowestList.innerHTML = '';
            
            slowestAnswers.forEach((result, index) => {
                const item = document.createElement('div');
                item.className = 'slowest-item';
                
                const cardInfo = result.questionType === 'numberFromCard' 
                    ? `${result.card} → Position ${result.position}`
                    : `Position ${result.position} → ${result.card}`;
                
                const statusIcon = result.correct ? '✓' : (result.userAnswer.includes('Skipped') ? '⏭' : '✗');
                const statusColor = result.correct ? '#38a169' : (result.userAnswer.includes('Skipped') ? '#667eea' : '#e53e3e');
                
                item.innerHTML = `
                    <div class="slowest-card">
                        <span style="color: ${statusColor}; margin-right: 8px;">${statusIcon}</span>
                        ${cardInfo}
                    </div>
                    <div class="slowest-time">${(result.responseTime / 1000).toFixed(1)}s</div>
                `;
                
                slowestList.appendChild(item);
            });
        } else {
            slowestSection.style.display = 'none';
        }
    } else {
        // No timing data available
        document.getElementById('avgResponseTime').textContent = 'N/A';
        document.getElementById('slowestAnswers').style.display = 'none';
    }
    
    // Show the modal
    document.getElementById('scoreSummary').classList.remove('hidden');
}

function hideScoreSummary() {
    document.getElementById('scoreSummary').classList.add('hidden');
}

function updateTimer() {
    if (!startTime) return;
    const elapsed = Date.now() - startTime;
    document.getElementById('timer').textContent = formatTime(elapsed);
}

function showFeedback(correct, message) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = `feedback ${correct ? 'correct' : 'incorrect'}`;
    feedback.style.display = 'block';
}

// Statistics Functions
function updateStats() {
    document.getElementById('sessionsCompleted').textContent = stats.sessions;
    document.getElementById('bestTime').textContent = stats.bestTime ? formatTime(stats.bestTime) : 'N/A';
    document.getElementById('totalTime').textContent = formatTime(stats.totalTime);
    document.getElementById('accuracy').textContent = stats.attempts > 0 ? 
        Math.round((stats.correct / stats.attempts) * 100) + '%' : '0%';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Mode switching
    document.getElementById('learnBtn').addEventListener('click', () => switchMode('learn'));
    document.getElementById('practiceBtn').addEventListener('click', () => switchMode('practice'));
    document.getElementById('selectionBtn').addEventListener('click', () => switchMode('selection'));
    document.getElementById('statsBtn').addEventListener('click', () => switchMode('stats'));

    // Learn mode controls
    document.getElementById('prevBtn').addEventListener('click', prevCard);
    document.getElementById('nextBtn').addEventListener('click', nextCard);
    document.getElementById('learnCard').addEventListener('click', flipCard);

    // Learn mode settings
    document.getElementById('showNumberFirst').addEventListener('change', updateLearnDisplay);
    document.getElementById('randomOrder').addEventListener('change', () => {
        if (document.getElementById('randomOrder').checked) {
            learnOrder = shuffleArray(availableCards);
        } else {
            learnOrder = [...availableCards];
        }
        learnIndex = 0;
        updateLearnDisplay();
    });

    // Practice mode controls
    document.getElementById('startPracticeBtn').addEventListener('click', startPractice);
    document.getElementById('showAnswerBtn').addEventListener('click', showAnswerAndAdvance);
    document.getElementById('submitCardBtn').addEventListener('click', submitAnswer);

    // Number input for practice
    document.getElementById('numberTextInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitAnswer();
        }
    });

    // Enter key support for card input mode
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !document.getElementById('cardInput').classList.contains('hidden')) {
            submitAnswer();
        }
    });

    // Card input buttons
    document.querySelectorAll('.rank-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedRank = btn.dataset.rank;
            updateCardDisplay();
        });
    });

    document.querySelectorAll('.suit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.suit-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedSuit = btn.dataset.suit;
            updateCardDisplay();
        });
    });

    // Selection mode controls
    document.getElementById('selectAllBtn').addEventListener('click', () => {
        selectedCards = new Set([...Array(52).keys()]);
        populateSelectionGrid();
        updateSelectionInfo();
        updateAvailableCards();
    });

    document.getElementById('selectNoneBtn').addEventListener('click', () => {
        selectedCards = new Set();
        populateSelectionGrid();
        updateSelectionInfo();
        updateAvailableCards();
    });

    // Restart button
    document.getElementById('restartBtn').addEventListener('click', () => {
        // Reset practice state
        practiceStarted = false;
        awaitingAnswer = false;
        if (timerInterval) clearInterval(timerInterval);
        
        // Show start screen, hide practice session
        document.getElementById('practiceStart').classList.remove('hidden');
        document.getElementById('practiceSession').classList.add('hidden');
        
        // Reset timer display
        document.getElementById('timer').textContent = '00:00';
    });

    // Score summary modal event listeners
    document.getElementById('practiceAgainBtn').addEventListener('click', () => {
        hideScoreSummary();
        startPractice();
    });

    document.getElementById('closeScoreBtn').addEventListener('click', () => {
        hideScoreSummary();
        // Reset practice state and show start screen
        practiceStarted = false;
        awaitingAnswer = false;
        if (timerInterval) clearInterval(timerInterval);
        document.getElementById('practiceStart').classList.remove('hidden');
        document.getElementById('practiceSession').classList.add('hidden');
        document.getElementById('timer').textContent = '00:00';
    });

    // Statistics reset
    document.getElementById('resetStats').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all statistics?')) {
            stats = {sessions: 0, bestTime: null, totalTime: 0, correct: 0, attempts: 0};
            saveStats();
        }
    });

    // Initialize
    updateAvailableCards(); // Initialize availableCards with all selected cards
    updateLearnDisplay();
});

function updateCardDisplay() {
    const display = document.getElementById('cardDisplay');
    if (selectedRank && selectedSuit) {
        const isRed = selectedSuit === '♥' || selectedSuit === '♦';
        display.innerHTML = `<span class="${isRed ? 'red' : 'black'}">${selectedRank}${selectedSuit}</span>`;
    } else {
        display.textContent = '';
    }
}
