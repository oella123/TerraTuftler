import { quizData } from './data.js';
import { playSound } from './theme.js';
import { showSection, showTemporaryFeedback, shuffleArray, appState } from './app.js'; // Assuming app.js exports these
import { getLeaderboard, saveLeaderboardEntry, clearLeaderboardCategory } from './leaderboardData.js';

// DEBUG: Confirm this file is being loaded with the latest changes
console.log('🔧 QUIZ.JS LOADED - Version with question text fix - 2024-fix');

// Quiz State
export const quizState = {
    currentQuizType: '',
    currentCategory: '',
    currentQuestions: [],
    currentQuestionIndex: 0,
    selectedAnswer: null,
    userAnswers: [],
    questionStates: [], // Track which questions have been answered/locked
    score: 0,
    currentStreak: 0,
    maxStreak: 0,
    quizEnded: false,
    selectedTimeLimit: 1, // Default to 1 second for image visibility
    timerId: null,
    isTimerRunning: false,
    // Simplified timing - only image phase
    imagePhaseActive: false,
};

// DOM Element References (These might need to be passed or re-queried if not globally available)
// It's generally better if app.js manages DOM elements and passes them to functions.
// For simplicity in refactoring, we might query them here, but be aware of the potential
// for elements not being ready if quiz.js loads/runs before the DOM is fully parsed.
let quizSection, quizOptionButtons, timeLimitOptionsDiv, timeLimitSelect;
let quizCategorySection, quizCategoryTitle, quizCategoryOptionsContainer, backToQuizSelectionBtn;
let quizGameSection, questionTextElement, questionImageElement, answerOptionsContainer, feedbackElement;
let timerElement, timerPhaseSpan, timeLeftSpan, prevButton, submitButton, nextButton, quitButton, finishButton;
let scoreboardElement, scoreDisplay, finalStreakDisplay, scoreMessageElement, streakDisplayElement, currentStreakSpan;
let leaderboardSection, leaderboardModeSelect, leaderboardList, clearLeaderboardBtn;

/**
 * Caches frequently used DOM elements related to the quiz.
 * Should be called after the DOM is fully loaded.
 */
export function cacheQuizDOMElements() {
    quizSection = document.getElementById('quiz');
    quizOptionButtons = quizSection ? quizSection.querySelectorAll('.quiz-option[data-quiz-type]') : [];
    timeLimitOptionsDiv = document.getElementById('time-limit-options');
    timeLimitSelect = document.getElementById('time-limit-select');

    quizCategorySection = document.getElementById('quiz-category');
    quizCategoryTitle = document.querySelector('#quiz-category h2'); // Use the actual h2 element
    quizCategoryOptionsContainer = document.getElementById('quiz-category-options');
    backToQuizSelectionBtn = document.getElementById('back-to-quiz-selection');

    quizGameSection = document.getElementById('quiz-game');
    questionTextElement = document.getElementById('question-text');
    questionImageElement = document.getElementById('question-image');
    answerOptionsContainer = document.getElementById('answer-options');
    feedbackElement = document.getElementById('feedback');
    timerElement = document.getElementById('timer');
    timerPhaseSpan = document.getElementById('timer-phase');
    timeLeftSpan = document.getElementById('time-left');
    prevButton = document.getElementById('prev-question');
    submitButton = document.getElementById('submit-answer');
    nextButton = document.getElementById('next-question');
    quitButton = document.getElementById('quit-quiz');
    finishButton = document.getElementById('finish-quiz');
    scoreboardElement = document.getElementById('scoreboard');
    scoreDisplay = document.getElementById('score');
    finalStreakDisplay = document.getElementById('final-streak');
    scoreMessageElement = document.getElementById('score-message');
    streakDisplayElement = document.getElementById('streak-display');
    currentStreakSpan = document.getElementById('current-streak');

    leaderboardSection = document.getElementById('leaderboard');
    leaderboardModeSelect = document.getElementById('leaderboard-mode-select');
    leaderboardList = document.getElementById('leaderboard-list');
    clearLeaderboardBtn = document.getElementById('clear-leaderboard');
}

/** Resets the quiz state. */
export function resetQuizState() {
    clearInterval(quizState.timerId);
    quizState.currentQuizType = '';
    quizState.currentCategory = '';
    quizState.currentQuestions = [];
    quizState.currentQuestionIndex = 0;
    quizState.selectedAnswer = null;
    quizState.userAnswers = [];
    quizState.questionStates = []; // Reset question states
    quizState.score = 0;
    quizState.currentStreak = 0;
    quizState.maxStreak = 0;
    quizState.quizEnded = false;
    quizState.timerId = null;
    quizState.isTimerRunning = false;
    quizState.imagePhaseActive = false;

    // Reset UI elements if they exist
    if (timerElement) timerElement.style.display = 'none';
    if (feedbackElement) feedbackElement.style.display = 'none';
    if (scoreboardElement) scoreboardElement.style.display = 'none';
    if (streakDisplayElement) streakDisplayElement.style.display = 'none';
    if (submitButton) submitButton.style.display = 'inline-block';
    if (nextButton) nextButton.style.display = 'none';
    if (prevButton) prevButton.style.display = 'none';
    if (finishButton) finishButton.style.display = 'none';
    if (quitButton) quitButton.style.display = 'none';
    if (questionTextElement) questionTextElement.textContent = 'Frage wird geladen...';
    if (questionImageElement) questionImageElement.style.display = 'none';
    if (answerOptionsContainer) answerOptionsContainer.innerHTML = '';

    const questionContainer = quizGameSection ? quizGameSection.querySelector('.question-container') : null;
    const quizControls = quizGameSection ? quizGameSection.querySelector('.quiz-controls') : null;
    if (questionContainer) questionContainer.style.display = 'block';
    if (quizControls) quizControls.style.display = 'flex';
}

/** Shows the quiz categories for the selected type. */
export function showQuizCategories(type) {
    if (!quizCategoryOptionsContainer) {
        console.error("Quiz category options container not found.");
        return;
    }
    // Ensure player name exists (handled in app.js listener)
    // if (!appState.playerName || appState.playerName === 'Anonym') {
    //     // This should ideally be triggered from the event listener in app.js
    //     console.warn("Player name not set before showing categories.");
    // }

    quizState.currentQuizType = type;
    quizCategoryOptionsContainer.innerHTML = '';

    let modeName = getModeDisplayName(type);
    if (type === 'time-limited') {
        modeName += ` (${quizState.selectedTimeLimit}s)`;
    }
    if (quizCategoryTitle) {
        quizCategoryTitle.textContent = `Wähle eine Kategorie (${modeName})`;
    }

    // Use the same data source logic as startQuiz
    // Use unified questions data structure if available, otherwise fall back to legacy structure
    let categories = [];

    if (quizData.questions) {
        // NEW UNIFIED APPROACH
        categories = Object.keys(quizData.questions);
    } else {
        // LEGACY APPROACH
        let dataSource = type;
        if (type === 'time-limited') {
            dataSource = 'image-based';
        }

        if (!quizData[dataSource]) {
            console.error(`Quiz data source "${dataSource}" not found in quizData.`);
            quizCategoryOptionsContainer.innerHTML = '<p>Fehler: Quiztyp nicht gefunden.</p>';
            showSection('quiz-category');
            return;
        }

        categories = Object.keys(quizData[dataSource]);
    }
    if (categories.length === 0) {
        quizCategoryOptionsContainer.innerHTML = '<p>Keine Kategorien für diesen Modus verfügbar.</p>';
    } else {
        categories.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.classList.add('quiz-option');
            const displayName = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
            categoryElement.textContent = displayName;
            categoryElement.dataset.category = category;
            // Event listener will be added in app.js
            quizCategoryOptionsContainer.appendChild(categoryElement);
        });
    }
    showSection('quiz-category');
}

/** Starts the quiz for the given type and category. */
export function startQuiz(type, category) {
    resetQuizState();
    quizState.currentQuizType = type;
    quizState.currentCategory = category;

    // For time-limited quiz, use image-based data for landscape recognition
    // Use unified questions data structure if available, otherwise fall back to legacy structure
    let questionsData = [];

    if (quizData.questions && quizData.questions[category]) {
        // NEW UNIFIED APPROACH
        questionsData = quizData.questions[category];
    } else {
        // LEGACY APPROACH
        let dataSource = type;
        if (type === 'time-limited') {
            dataSource = 'image-based';
        }

        if (!quizData[dataSource]?.[category] || quizData[dataSource][category].length === 0) {
            alert("Fehler: Quiz konnte nicht geladen werden. Kategorie oder Typ ungültig.");
            showSection('quiz-category');
            return;
        }

        questionsData = quizData[dataSource][category];
    }

    if (questionsData.length === 0) {
        alert("Fehler: Keine Fragen in dieser Kategorie verfügbar.");
        showSection('quiz-category');
        return;
    }

    quizState.currentQuestions = shuffleArray([...questionsData]);
    quizState.userAnswers = new Array(quizState.currentQuestions.length).fill(null);
    // Initialize question states - each question starts as unanswered and unlocked
    quizState.questionStates = quizState.currentQuestions.map(() => ({
        answered: false,
        locked: false
    }));

    // Ensure UI elements are cached and ready
    if (!quizGameSection) cacheQuizDOMElements(); // Cache if not already done

    // Ensure UI elements are ready before showing the section
    const questionContainer = quizGameSection?.querySelector('.question-container');
    const quizControls = quizGameSection?.querySelector('.quiz-controls');
    if (questionContainer) questionContainer.style.display = 'block';
    if (quizControls) quizControls.style.display = 'flex';
    if (questionTextElement) questionTextElement.style.display = 'block';
    if (answerOptionsContainer) answerOptionsContainer.style.display = 'grid';
    if (scoreboardElement) scoreboardElement.style.display = 'none';
    if (streakDisplayElement) streakDisplayElement.style.display = 'block';
    if (currentStreakSpan) currentStreakSpan.textContent = quizState.currentStreak;
    if (quitButton) quitButton.style.display = 'inline-block';

    showSection('quiz-game');
    loadQuestion();

    if (type === 'time-limited' && timerElement && timeLeftSpan && timerPhaseSpan) {
        startImagePhaseTimer();
    } else if (timerElement) {
        timerElement.style.display = 'none';
    }
}

/** Loads the current question based on the quiz state. */
function loadQuestion() {
    if (!questionTextElement || !answerOptionsContainer || !feedbackElement || !submitButton || !nextButton || !currentStreakSpan || !quitButton) {
        console.error("Required quiz game elements not found for loading question.");
        return;
    }
    if (quizState.quizEnded || quizState.currentQuestionIndex >= quizState.currentQuestions.length) {
        finishQuiz();
            return;
        }

    const currentQuestion = quizState.currentQuestions[quizState.currentQuestionIndex];
    const currentQuestionState = quizState.questionStates[quizState.currentQuestionIndex];
    quizState.selectedAnswer = quizState.userAnswers[quizState.currentQuestionIndex]; // Restore previous selection if any

    // Handle question text display based on quiz type and question structure
    console.log('DEBUG: Current question:', currentQuestion);
    console.log('DEBUG: Question field exists:', !!currentQuestion.question);
    console.log('DEBUG: Quiz type:', quizState.currentQuizType);
    console.log('DEBUG: questionTextElement exists:', !!questionTextElement);

    if (!questionTextElement) {
        console.error('ERROR: questionTextElement is null! Re-caching DOM elements...');
        cacheQuizDOMElements();
        if (!questionTextElement) {
            console.error('ERROR: questionTextElement still null after re-caching!');
            return;
        }
    }

    if (quizState.currentQuizType === 'time-limited') {
        questionTextElement.style.display = 'none';
        console.log('DEBUG: Time-limited quiz - hiding question text');
    } else {
        questionTextElement.style.display = 'block';
        // Check if question has a question field, otherwise create a generic question
        if (currentQuestion.question) {
            const questionText = `Frage ${quizState.currentQuestionIndex + 1}: ${currentQuestion.question}`;
            questionTextElement.textContent = questionText;
            console.log('DEBUG: Using original question text:', questionText);
        } else {
            // For image-only questions, create a generic question text
            const fallbackText = `Frage ${quizState.currentQuestionIndex + 1}: In welchem Land befindet sich das?`;
            questionTextElement.textContent = fallbackText;
            console.log('DEBUG: Using fallback question text:', fallbackText);
        }
        console.log('DEBUG: Final question element text:', questionTextElement.textContent);
        console.log('DEBUG: Final question element innerHTML:', questionTextElement.innerHTML);
    }

    answerOptionsContainer.innerHTML = '';
    feedbackElement.style.display = 'none';
    feedbackElement.textContent = ''; // Clear previous feedback
    currentStreakSpan.textContent = quizState.currentStreak;

    // Check if this question is locked (already answered and moved past)
    const isQuestionLocked = currentQuestionState.locked;

    if (isQuestionLocked) {
        // Show question in read-only mode
        submitButton.style.display = 'none';
        nextButton.style.display = 'inline-block';
        quitButton.style.display = 'inline-block';
        answerOptionsContainer.style.pointerEvents = 'none'; // Disable interaction

        // Show feedback for locked questions
        if (currentQuestionState.answered) {
            feedbackElement.style.display = 'block';
            const userAnswer = quizState.userAnswers[quizState.currentQuestionIndex];
            const isCorrect = userAnswer === currentQuestion.correctAnswer;
            feedbackElement.textContent = isCorrect ?
                '✓ Richtig! Diese Antwort ist gesperrt.' :
                '✗ Falsch. Diese Antwort ist gesperrt.';
            feedbackElement.className = isCorrect ? 'feedback correct' : 'feedback incorrect';
        }
    } else {
        // Show question in normal interactive mode
        submitButton.style.display = 'inline-block';
        nextButton.style.display = 'none';
        quitButton.style.display = 'inline-block';
        answerOptionsContainer.style.pointerEvents = 'auto'; // Enable interaction
    }

    if (questionImageElement && currentQuestion.image) {
        questionImageElement.src = currentQuestion.image;
        questionImageElement.style.display = 'block';
        // Set appropriate alt text based on whether question text exists
        if (currentQuestion.question) {
            questionImageElement.alt = `Bild zur Frage: ${currentQuestion.question}`;
        } else {
            questionImageElement.alt = `Bild zur Frage ${quizState.currentQuestionIndex + 1}`;
        }

        // Initialize Street View functionality
        if (currentQuestion.streetViewUrl) {
            // Reset all Street View classes
            questionImageElement.classList.remove('streetview-locked', 'streetview-unlocked', 'streetview-unlocking');
            questionImageElement.classList.add('streetview-available');

            // Remove any existing click listeners
            questionImageElement.removeEventListener('click', handleImageClick);
            questionImageElement.removeEventListener('click', handleLockedImageClick);

            // Check if this question has already been answered
            const currentQuestionState = quizState.questionStates[quizState.currentQuestionIndex];
            const hasBeenAnswered = currentQuestionState && currentQuestionState.locked;

            if (hasBeenAnswered) {
                // Question already answered - unlock Street View immediately
                questionImageElement.classList.add('streetview-unlocked');
                questionImageElement.style.cursor = 'pointer';
                questionImageElement.title = 'Klicke hier, um die Street View-Location zu besuchen!';
                questionImageElement.addEventListener('click', handleImageClick);
            } else {
                // Question not answered yet - lock Street View access
                questionImageElement.classList.add('streetview-locked');
                questionImageElement.style.cursor = 'not-allowed';
                questionImageElement.title = 'Beantworte die Frage, um Street View zu entsperren';
                questionImageElement.addEventListener('click', handleLockedImageClick);
            }
        } else {
            // Remove all Street View classes for non-Street View images
            questionImageElement.classList.remove('streetview-available', 'streetview-locked', 'streetview-unlocked', 'streetview-unlocking');
            questionImageElement.style.cursor = 'default';
            questionImageElement.title = '';
            questionImageElement.removeEventListener('click', handleImageClick);
            questionImageElement.removeEventListener('click', handleLockedImageClick);
        }
    } else if (questionImageElement) {
        questionImageElement.style.display = 'none';
    }

    const shuffledOptions = shuffleArray([...currentQuestion.options]);
    shuffledOptions.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('answer-option');
        optionElement.textContent = option;
        optionElement.dataset.option = option;

        // Handle visual state based on whether question is locked
        if (isQuestionLocked) {
            // For locked questions, show the correct/incorrect state
            optionElement.classList.add('locked');
            if (option === currentQuestion.correctAnswer) {
                optionElement.classList.add('correct');
            } else if (option === quizState.selectedAnswer) {
                optionElement.classList.add('incorrect');
            }
            if (option === quizState.selectedAnswer) {
                optionElement.classList.add('selected');
            }
        } else {
            // For unlocked questions, show normal selection state
            if (option === quizState.selectedAnswer) {
                optionElement.classList.add('selected'); // Highlight restored selection
            }
            // Add event listener only for unlocked questions
            optionElement.addEventListener('click', handleAnswerSelection);
        }

        answerOptionsContainer.appendChild(optionElement);
    });

    updateQuizControls();
}

/** Handles click on an answer option. */
function handleAnswerSelection(event) {
    // Check if the current question is locked
    const currentQuestionState = quizState.questionStates[quizState.currentQuestionIndex];

    // Only allow selection if the question is not locked and submit button is visible
    if (!currentQuestionState.locked && submitButton && submitButton.style.display !== 'none') {
        const selectedOption = event.target.dataset.option;
        quizState.selectedAnswer = selectedOption;
        quizState.userAnswers[quizState.currentQuestionIndex] = selectedOption;

        // Update visual selection
        document.querySelectorAll('#answer-options .answer-option').forEach(el => {
            el.classList.remove('selected');
        });
        event.target.classList.add('selected');
    }
}

/** Handles click on a question image with Street View URL (unlocked state). */
function handleImageClick(event) {
    event.preventDefault();
    const currentQuestion = quizState.currentQuestions[quizState.currentQuestionIndex];

    if (currentQuestion && currentQuestion.streetViewUrl) {
        // Open Street View URL in a new tab/window
        window.open(currentQuestion.streetViewUrl, '_blank', 'noopener,noreferrer');

        // Show temporary feedback to user
        showTemporaryFeedback("Street View-Location wird geöffnet...", "info", 2000);
    }
}

/** Handles click on a locked Street View image (before answering). */
function handleLockedImageClick(event) {
    event.preventDefault();

    // Show feedback that Street View is locked
    showTemporaryFeedback("Beantworte zuerst die Frage, um Street View zu entsperren!", "warning", 3000);
}

/** Unlocks Street View access for the current question after answer submission. */
function unlockStreetViewAccess() {
    if (!questionImageElement) return;

    const currentQuestion = quizState.currentQuestions[quizState.currentQuestionIndex];

    // Only unlock if the current question has Street View URL
    if (currentQuestion && currentQuestion.streetViewUrl && questionImageElement.classList.contains('streetview-locked')) {
        // Remove locked state and add unlocking animation
        questionImageElement.classList.remove('streetview-locked');
        questionImageElement.classList.add('streetview-unlocking');

        // Remove existing event listeners
        questionImageElement.removeEventListener('click', handleLockedImageClick);

        // Update cursor and title
        questionImageElement.style.cursor = 'pointer';
        questionImageElement.title = 'Klicke hier, um die Street View-Location zu besuchen!';

        // Add unlocked click handler
        questionImageElement.addEventListener('click', handleImageClick);

        // After animation completes, switch to unlocked state
        setTimeout(() => {
            questionImageElement.classList.remove('streetview-unlocking');
            questionImageElement.classList.add('streetview-unlocked');
        }, 600);
    }
}


/** Updates the visibility of quiz control buttons based on the current state. */
function updateQuizControls() {
    if (!prevButton || !finishButton || !quitButton || !submitButton || !nextButton) return;

    prevButton.style.display = quizState.currentQuestionIndex > 0 ? 'inline-block' : 'none';
    // Always show quit button during the quiz
    if (quitButton) quitButton.style.display = 'inline-block';

    const isAnswerSubmitted = submitButton.style.display === 'none';

    if (isAnswerSubmitted) {
        // If answer submitted, show Next or Finish
        nextButton.style.display = quizState.currentQuestionIndex < quizState.currentQuestions.length - 1 ? 'inline-block' : 'none';
        finishButton.style.display = quizState.currentQuestionIndex >= quizState.currentQuestions.length - 1 ? 'inline-block' : 'none';
        // quitButton.style.display = 'none'; // Keep quit button visible
    } else {
        // If answer not submitted, show Submit
        nextButton.style.display = 'none';
        finishButton.style.display = 'none';
        // quitButton.style.display = 'inline-block'; // Already handled above
    }
}

/** Checks the selected answer, updates score/streak, and provides feedback. */
export function checkAnswer(isTimeout = false) {
    console.log("checkAnswer called with isTimeout:", isTimeout, "current score:", quizState.score, "current streak:", quizState.currentStreak);

    // Prevent multiple executions - check if answer has already been submitted for this question
    if (submitButton && submitButton.style.display === 'none' && !isTimeout) {
        console.log("Answer already submitted for this question, ignoring duplicate call");
        return;
    }

    if (!submitButton || !feedbackElement || !answerOptionsContainer || !nextButton || !finishButton || !currentStreakSpan || !quitButton) {
         console.error("Required quiz elements not found for checking answer.");
         return;
    }
    if (!isTimeout && !quizState.selectedAnswer) {
        showTemporaryFeedback("Bitte wähle zuerst eine Antwort aus.", "warning");
        return;
    }

    clearInterval(quizState.timerId);
    quizState.isTimerRunning = false;
    submitButton.style.display = 'none';
    // quitButton.style.display = 'none'; // Keep quit button visible
    answerOptionsContainer.style.pointerEvents = 'none'; // Disable options after submit

    const currentQuestion = quizState.currentQuestions[quizState.currentQuestionIndex];
    const isCorrect = !isTimeout && (quizState.selectedAnswer === currentQuestion.correctAnswer);

    // Unlock Street View access after answer submission
    unlockStreetViewAccess();

        if (isCorrect) {
        if (!quizState.quizEnded) {
            console.log("Score before increment:", quizState.score);
            quizState.score++;
            console.log("Score after increment:", quizState.score);
            console.log("Streak before increment:", quizState.currentStreak);
            quizState.currentStreak++;
            console.log("Streak after increment:", quizState.currentStreak);
            quizState.maxStreak = Math.max(quizState.maxStreak, quizState.currentStreak);
            console.log("Max streak updated to:", quizState.maxStreak);
        }
        feedbackElement.textContent = `Richtig! ${currentQuestion.explanation || ''}`;
        feedbackElement.style.backgroundColor = 'var(--clr-feedback-correct)';
        playSound('correct');
    } else {
        // Note: Streak continues throughout the session - no reset on incorrect answers
        if (isTimeout) {
            feedbackElement.textContent = `Zeit abgelaufen! Richtig wäre: ${currentQuestion.correctAnswer}. ${currentQuestion.explanation || ''}`;
        } else {
            feedbackElement.textContent = `Falsch. Richtig wäre: ${currentQuestion.correctAnswer}. ${currentQuestion.explanation || ''}`;
        }
        feedbackElement.style.backgroundColor = 'var(--clr-feedback-incorrect)';
        playSound('incorrect');
    }

    currentStreakSpan.textContent = quizState.currentStreak;

    // Highlight correct/incorrect answers
    document.querySelectorAll('#answer-options .answer-option').forEach(el => {
        el.classList.remove('selected'); // Remove selection highlight
        if (el.dataset.option === currentQuestion.correctAnswer) {
            el.classList.add('correct');
        } else if (el.dataset.option === quizState.selectedAnswer && !isCorrect) {
            // Highlight the user's wrong answer only if it wasn't a timeout
            el.classList.add('incorrect');
        }
    });

    feedbackElement.style.display = 'block';

    // Mark the current question as answered
    quizState.questionStates[quizState.currentQuestionIndex].answered = true;

    updateQuizControls(); // Update buttons (show Next/Finish)
}

/** Moves to the next question or finishes the quiz. */
export function nextQuestion() {
    if (!nextButton || !submitButton || !feedbackElement || !quitButton) return;

    // Lock the current question when moving forward (prevents cheating)
    if (quizState.questionStates[quizState.currentQuestionIndex]) {
        quizState.questionStates[quizState.currentQuestionIndex].locked = true;
    }

    if (quizState.currentQuestionIndex < quizState.currentQuestions.length - 1) {
        quizState.currentQuestionIndex++;
        quizState.selectedAnswer = null; // Clear selection for the new question
        feedbackElement.style.display = 'none';
        submitButton.style.display = 'inline-block';
        nextButton.style.display = 'none';
        quitButton.style.display = 'inline-block';
        if (answerOptionsContainer) answerOptionsContainer.style.pointerEvents = 'auto';
        loadQuestion(); // This will reset Street View to locked state for new question
        if (quizState.currentQuizType === 'time-limited') {
            startImagePhaseTimer();
        }
    } else {
        finishQuiz();
    }
}

/** Moves to the previous question. */
export function previousQuestion() {
    clearInterval(quizState.timerId);
    quizState.isTimerRunning = false;
    quizState.imagePhaseActive = false;
    if (!prevButton || !submitButton || !nextButton || !finishButton || !feedbackElement || !quitButton) return;

    if (quizState.currentQuestionIndex > 0) {
        quizState.currentQuestionIndex--;
        // Restore previous answer for this question
        quizState.selectedAnswer = quizState.userAnswers[quizState.currentQuestionIndex];
        feedbackElement.style.display = 'none';
        submitButton.style.display = 'inline-block';
        nextButton.style.display = 'none';
        finishButton.style.display = 'none';
        quitButton.style.display = 'inline-block';
        if (answerOptionsContainer) answerOptionsContainer.style.pointerEvents = 'auto';
        loadQuestion();
        if (quizState.currentQuizType === 'time-limited') {
            startImagePhaseTimer();
        }
    }
}

/** Finishes the current quiz, saves the score, and shows the scoreboard. */
export async function finishQuiz() {
    console.log("finishQuiz called. Current quiz state:", JSON.stringify(quizState));
    clearInterval(quizState.timerId);
    quizState.isTimerRunning = false;
    quizState.imagePhaseActive = false;
    quizState.quizEnded = true;

    if (appState.playerName && appState.playerName !== 'Anonym') {
        // Determine time limit for time-limited quizzes
        const timeLimit = quizState.currentQuizType === 'time-limited' ? quizState.selectedTimeLimit : null;

        await saveLeaderboardEntry(
            appState.playerName,
            quizState.score, // correct answers
            quizState.currentQuizType,
            quizState.currentCategory,
            quizState.currentQuestions.length, // total questions
            quizState.maxStreak, // max streak achieved in this session
            timeLimit
        );
    }

    const wasMidQuiz = quizState.currentQuestionIndex < quizState.currentQuestions.length;

    // Store quiz type and category before potential reset
    const currentType = quizState.currentQuizType;
    const currentCategory = quizState.currentCategory;

    if (wasMidQuiz && (!scoreboardElement || scoreboardElement.style.display === 'none')) {
        // If quit mid-quiz and not already showing score (e.g. by natural end)
        // just go back to category selection.
        console.log("Finishing mid-quiz, going to category selection.");
        resetQuizState(); // Full reset before leaving
        showQuizCategories(currentType || 'image-based'); // Use stored type
        // Or, go to the main quiz menu:
        // showSection('quiz');
    } else {
        // If quiz finished naturally or quit button on score screen (if we add one there)
        console.log("Quiz ended naturally or from score screen, showing score.");
        // Don't reset state yet - showScore needs the quiz type and category for "Play Again" buttons
        showScore();
    }

    // Ensure quit button is hidden if we are not in the quiz game section anymore
    // This will be handled by showSection or specific UI updates in showScore/showQuizCategories
}

/** Displays the final score and message. */
function showScore() {
    if (!scoreboardElement || !scoreDisplay || !finalStreakDisplay || !scoreMessageElement) {
        console.error("Scoreboard elements not found.");
        return;
    }

    const questionContainer = quizGameSection?.querySelector('.question-container');
    const quizControls = quizGameSection?.querySelector('.quiz-controls');

    if (questionContainer) questionContainer.style.display = 'none';
    if (timerElement) timerElement.style.display = 'none';
    if (feedbackElement) feedbackElement.style.display = 'none';
    if (quizControls) quizControls.style.display = 'none'; // HIDE QUIZ CONTROLS
    if (streakDisplayElement) streakDisplayElement.style.display = 'none';

    scoreDisplay.textContent = `${quizState.score} / ${quizState.currentQuestions.length}`;
    finalStreakDisplay.textContent = quizState.maxStreak;

    let message = '';
    const percentage = quizState.currentQuestions.length > 0 ? (quizState.score / quizState.currentQuestions.length) : 0;
    if (quizState.maxStreak >= 10) {
        message = `Wow, ${quizState.maxStreak} in Folge! Spitzenleistung!`;
    } else if (quizState.maxStreak >= 5) {
        message = `Starke Serie von ${quizState.maxStreak}! Gut gemacht!`;
    } else if (percentage >= 0.7) {
        message = "Sehr gutes Ergebnis!";
    } else if (percentage >= 0.5) {
        message = "Gut gemacht!";
    } else {
        message = "Übung macht den Meister! Schau doch mal im Lernbereich vorbei.";
    }
    scoreMessageElement.textContent = message;

    scoreboardElement.style.display = 'block';
    playSound('quizEnd');

    // Add Play Again (Random), Fortfahren, and Quiz Beenden buttons
    if (scoreboardElement) {
        let actionsContainer = scoreboardElement.querySelector('.scoreboard-actions');
        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.className = 'scoreboard-actions';
            scoreboardElement.appendChild(actionsContainer);
        }
        actionsContainer.innerHTML = ''; // Clear previous buttons

        const playAgainRandomBtn = document.createElement('button');
        playAgainRandomBtn.textContent = 'Erneut spielen (Zufall)';
        playAgainRandomBtn.className = 'btn';
        playAgainRandomBtn.id = 'play-again-random-btn';
        playAgainRandomBtn.addEventListener('click', () => {
            startQuiz(quizState.currentQuizType, quizState.currentCategory);
        });
        actionsContainer.appendChild(playAgainRandomBtn);

        const fortfahrenBtn = document.createElement('button');
        fortfahrenBtn.textContent = 'Fortfahren';
        fortfahrenBtn.className = 'btn';
        fortfahrenBtn.id = 'fortfahren-btn';
        fortfahrenBtn.addEventListener('click', () => {
            startQuiz(quizState.currentQuizType, quizState.currentCategory);
        });
        actionsContainer.appendChild(fortfahrenBtn);

        const mainMenuBtn = document.createElement('button');
        mainMenuBtn.textContent = 'Quiz beenden';
        mainMenuBtn.className = 'btn';
        mainMenuBtn.id = 'scoreboard-main-menu-btn';
        mainMenuBtn.addEventListener('click', () => {
            resetQuizState(); // Reset state when going to main menu
            showSection('home');
        });
        actionsContainer.appendChild(mainMenuBtn);
    }
}

/** Starts the image visibility timer for time-limited quizzes. */
function startImagePhaseTimer() {
    if (!timerElement || !timeLeftSpan || !timerPhaseSpan) return;

    quizState.imagePhaseActive = true;

    // Show timer with image phase styling
    timerElement.style.display = 'block';
    timerElement.style.background = 'var(--clr-primary)';
    timerPhaseSpan.textContent = 'Bild sichtbar:';

    let currentTimeLeft = quizState.selectedTimeLimit;
    timeLeftSpan.textContent = currentTimeLeft.toFixed(1);
    clearInterval(quizState.timerId); // Clear any existing timer
    quizState.isTimerRunning = true;

    // Show the image
    if (questionImageElement) {
        questionImageElement.style.display = 'block';
    }

    // Use smaller intervals for sub-second precision
    const interval = currentTimeLeft < 1 ? 100 : 1000; // 100ms for sub-second, 1000ms for seconds
    const decrement = currentTimeLeft < 1 ? 0.1 : 1;

    quizState.timerId = setInterval(() => {
        currentTimeLeft -= decrement;
        if (currentTimeLeft <= 0) {
            currentTimeLeft = 0;
            clearInterval(quizState.timerId);
            quizState.isTimerRunning = false;
            quizState.imagePhaseActive = false;

            // Hide the image and timer, start unlimited answer phase
            if (questionImageElement) {
                questionImageElement.style.display = 'none';
                // Add a brief visual feedback that image is hidden
                showTemporaryFeedback("Bild ausgeblendet - Wähle das Land!", "info", 2000);
            }

            // Hide timer completely for unlimited answer time
            if (timerElement) {
                timerElement.style.display = 'none';
            }
        } else {
            timeLeftSpan.textContent = currentTimeLeft < 1 ? currentTimeLeft.toFixed(1) : Math.ceil(currentTimeLeft);
        }
    }, interval);
}

// --- Leaderboard Logic --- (Moved here as it's closely tied to quiz results)

/** Gets the total number of questions available in a specific category and mode. */
function getTotalQuestionsInCategory(mode, category) {
    // Use unified questions data structure if available, otherwise fall back to legacy structure
    if (quizData.questions && quizData.questions[category]) {
        // NEW UNIFIED APPROACH
        return quizData.questions[category].length;
    } else {
        // LEGACY APPROACH
        let dataSource = mode;
        if (mode === 'time-limited') {
            dataSource = 'image-based';
        }

        if (!quizData[dataSource] || !quizData[dataSource][category]) {
            return 0;
        }

        return quizData[dataSource][category].length;
    }
}

/** Gets the leaderboard storage key based on the quiz mode, category, and time limit. */
function getLeaderboardStorageKey(mode, category, timeLimit = null) {
    let key = `terraTueftlerLeaderboard_${mode || 'default'}_${category || 'all'}`;
    if (mode === 'time-limited' && timeLimit) {
        key += `_${timeLimit}s`;
    }
    return key;
}

// getLeaderboard function now imported from leaderboardData.js

// Leaderboard functions moved to leaderboardData.js for persistent storage

/** Displays the enhanced leaderboard for the selected mode, category, and time limit. */
export function displayLeaderboard(mode, category = 'all', timeLimit = null) {
    if (!leaderboardList || !mode) {
        if (!leaderboardList) console.error("Leaderboard list element not found.");
        return;
    }

    const leaderboard = getLeaderboard(mode, category, timeLimit);
    const totalQuestionsAvailable = getTotalQuestionsInCategory(mode, category);
    leaderboardList.innerHTML = ''; // Clear previous list

    if (leaderboard.length === 0) {
        const modeName = getModeDisplayName(mode);
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
        const timeLimitText = timeLimit ? ` (${timeLimit}s)` : '';
        leaderboardList.innerHTML = `<li style="text-align: center; color: var(--clr-text-light);">Noch keine Einträge für "${modeName} - ${categoryName}${timeLimitText}" vorhanden. Spiel ein Quiz!</li>`;
        return;
    }

    leaderboard.forEach((entry, index) => {
        const li = document.createElement('li');
        li.classList.add('leaderboard-item');

        // Check if this is a perfect score
        const isPerfectScore = totalQuestionsAvailable > 0 && entry.correctAnswers >= totalQuestionsAvailable;
        if (isPerfectScore) {
            li.classList.add('perfect-score');
        }

        const rankSpan = document.createElement('span');
        rankSpan.classList.add('leaderboard-rank');
        rankSpan.textContent = `${index + 1}.`;

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('leaderboard-name');
        // Add star for perfect scores
        const starIcon = isPerfectScore ? '⭐ ' : '';
        nameSpan.textContent = starIcon + entry.name;

        const scoreSpan = document.createElement('span');
        scoreSpan.classList.add('leaderboard-score');
        const accuracy = entry.totalQuestions > 0 ? Math.round((entry.correctAnswers / entry.totalQuestions) * 100) : 0;
        scoreSpan.textContent = `${entry.correctAnswers}/${entry.totalQuestions} (${accuracy}%)`;

        // Add streak information if available
        const streakSpan = document.createElement('span');
        streakSpan.classList.add('leaderboard-streak');
        if (entry.maxStreak !== undefined) {
            streakSpan.textContent = `Serie: ${entry.maxStreak}`;
        }

        // Add timestamp information
        const timeSpan = document.createElement('span');
        timeSpan.classList.add('leaderboard-time');
        if (entry.completedAt) {
            const date = new Date(entry.completedAt);
            const timeString = date.toLocaleDateString('de-DE') + ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            timeSpan.textContent = timeString;
        } else if (entry.lastPlayed) {
            // Fallback for old format entries
            const date = new Date(entry.lastPlayed);
            const timeString = date.toLocaleDateString('de-DE') + ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            timeSpan.textContent = timeString;
        }

        li.appendChild(rankSpan);
        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);
        if (entry.maxStreak !== undefined) {
            li.appendChild(streakSpan);
        }
        if (timeSpan.textContent) {
            li.appendChild(timeSpan);
        }
        leaderboardList.appendChild(li);
    });
}

/** Clears the leaderboard for the selected mode, category, and time limit after confirmation. */
export async function clearLeaderboard(mode, category = 'all', timeLimit = null) {
    if (!mode) return;
    const modeName = getModeDisplayName(mode);
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
    const timeLimitText = timeLimit ? ` (${timeLimit}s)` : '';
    const fullName = `${modeName} - ${categoryName}${timeLimitText}`;

    if (confirm(`Möchtest du die Rangliste für "${fullName}" wirklich löschen?`)) {
        // Clear from persistent storage
        await clearLeaderboardCategory(mode, category, timeLimit);

        // Also clear from localStorage for backward compatibility
        const storageKey = getLeaderboardStorageKey(mode, category, timeLimit);
        localStorage.removeItem(storageKey);

        // Refresh the displayed list
        displayLeaderboard(mode, category, timeLimit);
    }
}

/** Helper function to get a display-friendly name for a quiz mode key. */
export function getModeDisplayName(modeKey) {
    switch(modeKey) {
        case 'time-limited': return 'Zeitbegrenzt';
        case 'image-based': return 'Bildbasiert';
        default: return modeKey; // Return key itself if no match
    }
}