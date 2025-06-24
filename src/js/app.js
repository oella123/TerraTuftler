import { quizData, learningData, initializeData } from './data.js';
import { themeState, setTheme, loadSettings, toggleSound, playSound } from './theme.js';
import { quizState, cacheQuizDOMElements, resetQuizState, showQuizCategories, startQuiz, checkAnswer, nextQuestion, previousQuestion, finishQuiz, displayLeaderboard, clearLeaderboard } from './quiz.js';
import { initializeAdmin, cacheAdminDOMElements } from './admin.js';

// --- Core Application State ---
export const appState = {
    currentSection: 'home',
    playerName: 'Anonym',
    // themeState is imported from theme.js
};

// --- DOM Element References ---
// It's often better to query elements once and store them.
let navLinksContainer, burger, sections, navLinksAnchors, actionButtons;
let playerNameArea, playerNameInput, savePlayerNameBtn, currentPlayerNameDisplay;
let learnSection, learnOverviewContainer, learnCategorySelect, learnContentGrid;
let soundToggle, themeSelect;
let timeLimitSelect, timeLimitOptionsDiv; // Already referenced in quiz.js, but needed for listener here
let leaderboardModeSelect, leaderboardCategorySelect, leaderboardTimeSelect, timeLimitFilter; // Enhanced leaderboard controls
let currentPlayerDisplay, changePlayerBtn, playerNameModal, newPlayerNameInput, closePlayerModalBtn, cancelPlayerChangeBtn, confirmPlayerChangeBtn; // Player name change elements
let quizOptionButtons; // From quiz.js cache
let backToQuizSelectionBtn; // From quiz.js cache
let submitButton, nextButton, prevButton, quitButton, finishButton; // From quiz.js cache
let quizCategoryOptionsContainer; // For quiz category selection

/**
 * Caches frequently used DOM elements for the core application.
 */
function cacheAppDOMElements() {
    navLinksContainer = document.getElementById('nav-links');
    burger = document.getElementById('burger');
    sections = document.querySelectorAll('main > section');
    navLinksAnchors = document.querySelectorAll('.nav-links a[data-target]');
    actionButtons = document.querySelectorAll('.btn[data-target]');

    // Player Name Elements
    playerNameArea = document.getElementById('player-name-area');
    playerNameInput = document.getElementById('player-name');
    savePlayerNameBtn = document.getElementById('save-player-name');
    currentPlayerNameDisplay = document.getElementById('current-player-name');

    // Learn Section Elements
    learnSection = document.getElementById('learn');
    learnOverviewContainer = document.getElementById('learn-overview');
    learnCategorySelect = document.getElementById('learn-category-select');
    learnContentGrid = document.getElementById('learn-content-grid');

    // Settings Elements
    soundToggle = document.getElementById('sound-toggle');
    themeSelect = document.getElementById('theme-select');

    // Elements also used/cached in quiz.js but needed for listeners here
    timeLimitSelect = document.getElementById('time-limit-select');
    timeLimitOptionsDiv = document.getElementById('time-limit-options');
    leaderboardModeSelect = document.getElementById('leaderboard-mode-select');
    leaderboardCategorySelect = document.getElementById('leaderboard-category-select');
    leaderboardTimeSelect = document.getElementById('leaderboard-time-select');
    timeLimitFilter = document.getElementById('time-limit-filter');
    // Manual leaderboard control buttons removed

    // Player name change elements
    currentPlayerDisplay = document.getElementById('current-player-display');
    changePlayerBtn = document.getElementById('change-player-btn');
    playerNameModal = document.getElementById('player-name-modal');
    newPlayerNameInput = document.getElementById('new-player-name');
    closePlayerModalBtn = document.getElementById('close-player-modal');
    cancelPlayerChangeBtn = document.getElementById('cancel-player-change');
    confirmPlayerChangeBtn = document.getElementById('confirm-player-change');
    quizOptionButtons = document.querySelectorAll('#quiz .quiz-option[data-quiz-type]');
    quizCategoryOptionsContainer = document.getElementById('quiz-category-options');
    backToQuizSelectionBtn = document.getElementById('back-to-quiz-selection');
    submitButton = document.getElementById('submit-answer');
    nextButton = document.getElementById('next-question');
    prevButton = document.getElementById('prev-question');
    quitButton = document.getElementById('quit-quiz');
    finishButton = document.getElementById('finish-quiz');
}

// --- Utility Functions (can be shared or moved to a utils.js) ---

/**
 * Shuffles array in place using Fisher-Yates algorithm.
 * @param {Array} array Array to shuffle.
 * @returns {Array} The shuffled array.
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

/**
 * Shows a temporary feedback message at the bottom of the screen.
 * @param {string} message The message to display.
 * @param {'info' | 'warning' | 'error'} type The type of message (affects background color).
 */
export function showTemporaryFeedback(message, type = 'info') {
    const tempFeedback = document.createElement('div');
    tempFeedback.textContent = message;
    tempFeedback.style.position = 'fixed';
    tempFeedback.style.bottom = '20px';
    tempFeedback.style.left = '50%';
    tempFeedback.style.transform = 'translateX(-50%)';
    tempFeedback.style.padding = '10px 20px';
    tempFeedback.style.borderRadius = 'var(--radius)';
    tempFeedback.style.color = '#fff'; // Assuming light text for feedback colors
    tempFeedback.style.zIndex = '2000';
    tempFeedback.style.boxShadow = 'var(--shadow-lg)';
    tempFeedback.style.textAlign = 'center';
    tempFeedback.style.opacity = '0';
    tempFeedback.style.transition = 'opacity 0.5s ease';

    switch (type) {
        case 'warning':
            tempFeedback.style.backgroundColor = 'var(--clr-feedback-incorrect)'; // Using incorrect color for warning
            break;
        case 'error':
             tempFeedback.style.backgroundColor = 'var(--clr-feedback-incorrect)'; // Same as warning
            break;
        case 'info':
        default:
            tempFeedback.style.backgroundColor = 'var(--clr-secondary)';
            break;
    }

    document.body.appendChild(tempFeedback);

    // Fade in
    requestAnimationFrame(() => {
        tempFeedback.style.opacity = '1';
    });

    // Fade out and remove
    setTimeout(() => {
        tempFeedback.style.opacity = '0';
        setTimeout(() => {
             if (tempFeedback.parentNode) { // Check if still attached
                tempFeedback.remove();
            }
        }, 500); // Wait for fade out transition
    }, 3000); // Display duration
}

// --- Navigation --- 

/**
 * Shows the specified section and hides others. Updates active nav link.
 * @param {string} sectionId The ID of the section to show.
 */
export function showSection(sectionId) {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) {
        console.error(`Section with ID "${sectionId}" not found. Defaulting to home.`);
        sectionId = 'home'; // Fallback to home
    }

    appState.currentSection = sectionId;
    sections.forEach(section => {
        const isActive = section.id === sectionId;
        section.style.display = isActive ? 'block' : 'none';
        // section.classList.toggle('active', isActive); // Optional: if CSS uses .active for animations
    });

    // Update active link in navigation
    navLinksAnchors.forEach(link => {
        link.classList.toggle('active', link.dataset.target === sectionId);
    });

    // Close mobile nav if open and burger exists
    if (navLinksContainer && burger && navLinksContainer.classList.contains('show')) {
        navLinksContainer.classList.remove('show');
        burger.classList.remove('change');
        burger.setAttribute('aria-expanded', 'false');
    }

    // --- Section-Specific Actions ---

    // Reset quiz state if navigating away from quiz game or category selection
    if (sectionId !== 'quiz-game' && sectionId !== 'quiz-category') {
         resetQuizState();
    }

    // Hide time limit selection when navigating away from quiz section
    if (sectionId !== 'quiz' && timeLimitOptionsDiv) {
        timeLimitOptionsDiv.style.display = 'none';
        const startQuizBtn = document.getElementById('start-time-limited-quiz');
        const instructionText = document.getElementById('time-limit-instruction');
        if (startQuizBtn) {
            startQuizBtn.style.display = 'none';
        }
        if (instructionText) {
            instructionText.style.display = 'none';
        }
    }

    // Initialize learning content when showing learn section
    if (sectionId === 'learn') {
        // Initialize with all categories by default
        renderLearningContent('all');
        // Reset category selector to 'all'
        if (learnCategorySelect) {
            learnCategorySelect.value = 'all';
        }
    }

    // Load leaderboard data when showing the leaderboard section
    if (sectionId === 'leaderboard') {
        initializeLeaderboard();
    }

    // Initialize admin interface when showing admin section
    if (sectionId === 'admin') {
        initializeAdmin();
    }

    // Update player display when showing quiz section
    if (sectionId === 'quiz') {
        updateQuizPlayerDisplay();
    }

    window.scrollTo(0, 0); // Scroll to top on section change
}

// --- Enhanced Leaderboard Logic ---

/**
 * Initializes the enhanced leaderboard system.
 */
function initializeLeaderboard() {
    if (!leaderboardModeSelect || !leaderboardCategorySelect) return;

    // Populate categories based on selected mode
    updateLeaderboardCategories();

    // Show/hide time limit filter based on mode
    updateTimeLimitVisibility();

    // Load and display leaderboard
    updateLeaderboardDisplay();
}

/**
 * Updates the category dropdown based on the selected quiz mode.
 */
function updateLeaderboardCategories() {
    if (!leaderboardModeSelect || !leaderboardCategorySelect) return;

    const mode = leaderboardModeSelect.value;
    leaderboardCategorySelect.innerHTML = '';

    // Get categories for the selected mode (using same logic as quiz.js)
    let dataSource = mode;
    if (mode === 'time-limited') {
        dataSource = 'image-based';
    }

    if (!quizData[dataSource]) return;

    const allCategories = Object.keys(quizData[dataSource]);
    let categories;

    // Show ALL categories for both modes - no filtering needed for leaderboard
    // Users should be able to see leaderboard entries for all categories they've played
    categories = allCategories;

    // Populate category dropdown
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
        leaderboardCategorySelect.appendChild(option);
    });
}

/**
 * Shows/hides the time limit filter based on the selected mode.
 */
function updateTimeLimitVisibility() {
    if (!timeLimitFilter || !leaderboardModeSelect) return;

    const mode = leaderboardModeSelect.value;
    if (mode === 'time-limited') {
        timeLimitFilter.style.display = 'block';
    } else {
        timeLimitFilter.style.display = 'none';
    }
}

/**
 * Updates the leaderboard display with current filter settings.
 */
function updateLeaderboardDisplay() {
    if (!leaderboardModeSelect || !leaderboardCategorySelect) return;

    const mode = leaderboardModeSelect.value;
    const category = leaderboardCategorySelect.value;
    const timeLimit = (mode === 'time-limited' && leaderboardTimeSelect) ?
        parseFloat(leaderboardTimeSelect.value) : null;

    displayLeaderboard(mode, category, timeLimit);
}

// Make updateLeaderboardDisplay available globally for automatic updates
window.updateLeaderboardDisplay = updateLeaderboardDisplay;

// --- Player Name Logic ---

/**
 * Updates the player name display in the quiz selection screen.
 */
function updateQuizPlayerDisplay() {
    if (currentPlayerDisplay) {
        currentPlayerDisplay.textContent = `Aktueller Spieler: ${appState.playerName}`;
    }
}

/**
 * Shows the player name change modal.
 */
function showPlayerNameModal() {
    if (playerNameModal && newPlayerNameInput) {
        newPlayerNameInput.value = appState.playerName === 'Anonym' ? '' : appState.playerName;
        playerNameModal.style.display = 'flex';
        newPlayerNameInput.focus();
    }
}

/**
 * Hides the player name change modal.
 */
function hidePlayerNameModal() {
    if (playerNameModal) {
        playerNameModal.style.display = 'none';
    }
}

/**
 * Handles the player name change confirmation.
 */
function confirmPlayerNameChange() {
    if (!newPlayerNameInput) return;

    const newName = newPlayerNameInput.value.trim();
    if (newName && newName.length <= 20) {
        appState.playerName = newName;
        localStorage.setItem('terraTueftlerPlayerName', newName);
        updatePlayerNameDisplay();
        updateQuizPlayerDisplay();
        hidePlayerNameModal();
        showTemporaryFeedback(`Spieler geändert zu: ${newName}`, 'info');
    } else if (newName.length > 20) {
        showTemporaryFeedback('Name darf maximal 20 Zeichen haben.', 'warning');
    } else {
        // Empty name, set to Anonym
        appState.playerName = 'Anonym';
        localStorage.setItem('terraTueftlerPlayerName', 'Anonym');
        updatePlayerNameDisplay();
        updateQuizPlayerDisplay();
        hidePlayerNameModal();
        showTemporaryFeedback('Spieler auf "Anonym" zurückgesetzt.', 'info');
    }
}

// --- Player Name Logic ---

/**
 * Updates the player name input field and display text.
 */
function updatePlayerNameDisplay() {
    if (playerNameInput) {
        playerNameInput.value = appState.playerName;
    }
    if (currentPlayerNameDisplay) {
        currentPlayerNameDisplay.textContent = `Aktueller Spieler: ${appState.playerName}`;
    }
}

/**
 * Saves the player name from the input field to state and localStorage.
 */
function savePlayerName() {
    if (!playerNameInput) return;
    const newName = playerNameInput.value.trim();
    if (newName && newName.length > 0 && newName.length <= 20) {
        appState.playerName = newName;
        localStorage.setItem('terraTueftlerPlayerName', appState.playerName);
        updatePlayerNameDisplay();
        showTemporaryFeedback("Name gespeichert!", "info");
    } else {
        showTemporaryFeedback("Bitte gib einen gültigen Namen ein (1-20 Zeichen).", "warning");
        playerNameInput.value = appState.playerName; // Reset input to current name
    }
}

/**
 * Prompts the user for a player name if not set or 'Anonym'.
 * This is a fallback, ideally triggered by user action.
 */
function ensurePlayerName() {
     if (!appState.playerName || appState.playerName === 'Anonym') {
        const name = prompt("Bitte gib deinen Spielernamen für die Rangliste ein (max. 20 Zeichen):", appState.playerName !== 'Anonym' ? appState.playerName : '');
        if (name && name.trim() !== '' && name.trim().length <= 20) {
            appState.playerName = name.trim();
            localStorage.setItem('terraTueftlerPlayerName', appState.playerName);
            updatePlayerNameDisplay();
            return true;
        } else if (name !== null) { // User entered something invalid or empty
            alert("Ungültiger Name. Bitte 1-20 Zeichen verwenden.");
            return ensurePlayerName(); // Ask again
        } else { // User cancelled prompt
             // Keep 'Anonym' if it was already set, otherwise set it
             if (!localStorage.getItem('terraTueftlerPlayerName')) {
                 appState.playerName = 'Anonym';
                 localStorage.setItem('terraTueftlerPlayerName', appState.playerName);
                 updatePlayerNameDisplay();
             }
            return false; // User cancelled or didn't provide a name
        }
    }
    return true; // Name already exists and is not 'Anonym'
}

// --- Quiz Time Limit Selection Logic ---

/**
 * Shows the time limit selection UI for time-limited quizzes.
 */
function showTimeLimitSelection() {
    // Store that we're in time-limited mode
    quizState.currentQuizType = 'time-limited';

    // Show the time limit options
    if (timeLimitOptionsDiv) {
        timeLimitOptionsDiv.style.display = 'block';

        // Add helpful instruction text if it doesn't exist
        let instructionText = document.getElementById('time-limit-instruction');
        if (!instructionText) {
            instructionText = document.createElement('p');
            instructionText.id = 'time-limit-instruction';
            instructionText.textContent = 'Wähle dein gewünschtes Zeitlimit pro Frage:';
            instructionText.style.marginBottom = '0.5rem';
            instructionText.style.fontWeight = '600';

            // Insert before the select element
            const selectElement = timeLimitOptionsDiv.querySelector('select');
            if (selectElement) {
                timeLimitOptionsDiv.insertBefore(instructionText, selectElement);
            } else {
                timeLimitOptionsDiv.appendChild(instructionText);
            }
        } else {
            instructionText.style.display = 'block';
        }

        // Create or show the start quiz button
        let startQuizBtn = document.getElementById('start-time-limited-quiz');
        if (!startQuizBtn) {
            startQuizBtn = document.createElement('button');
            startQuizBtn.id = 'start-time-limited-quiz';
            startQuizBtn.className = 'btn';
            startQuizBtn.textContent = 'Quiz starten';
            startQuizBtn.style.marginTop = '1rem';
            startQuizBtn.style.display = 'block';
            startQuizBtn.style.width = '100%';

            // Add event listener
            startQuizBtn.addEventListener('click', () => {
                // Update the selected time limit
                if (timeLimitSelect) {
                    quizState.selectedTimeLimit = parseFloat(timeLimitSelect.value) || 1;
                }
                // Hide the time selection UI
                timeLimitOptionsDiv.style.display = 'none';
                // Proceed to category selection
                showQuizCategories('time-limited');
            });

            timeLimitOptionsDiv.appendChild(startQuizBtn);
        } else {
            startQuizBtn.style.display = 'block';
        }
    } else {
        console.error('Time limit options div not found');
        // Fallback: proceed directly to categories
        showQuizCategories('time-limited');
    }
}

// --- Learn Section Logic ---

/**
 * Renders learning content in reference format based on quiz data
 * @param {string} category The category to display ('all' for all categories)
 */
function renderLearningContent(category = 'all') {
    if (!learnContentGrid) {
        console.warn('Learning content grid not found');
        return;
    }

    if (!quizData) {
        console.error('Quiz data not available for learning content');
        learnContentGrid.innerHTML = '<p class="no-content">Lerndaten konnten nicht geladen werden.</p>';
        return;
    }

    let contentToShow = [];

    try {
        // Use unified questions data structure if available, otherwise fall back to legacy structure
        if (quizData.questions) {
            // NEW UNIFIED APPROACH - eliminates duplicates
            if (category === 'all') {
                // Show content from all categories
                Object.keys(quizData.questions).forEach(cat => {
                    if (cat !== 'all' && quizData.questions[cat]) {
                        const categoryData = quizData.questions[cat];
                        if (Array.isArray(categoryData)) {
                            categoryData.forEach(item => {
                                // Only include items with images for learning reference
                                if (item.image) {
                                    contentToShow.push({
                                        ...item,
                                        category: cat,
                                        sourceType: 'unified'
                                    });
                                }
                            });
                        }
                    }
                });
            } else {
                // Show content from specific category
                if (quizData.questions[category] && Array.isArray(quizData.questions[category])) {
                    quizData.questions[category].forEach(item => {
                        // Only include items with images for learning reference
                        if (item.image) {
                            contentToShow.push({
                                ...item,
                                category,
                                sourceType: 'unified'
                            });
                        }
                    });
                }
            }
        } else {
            // LEGACY APPROACH - for backward compatibility
            const dataSources = ['image-based'];  // Only use image-based to avoid duplicates
            const seenImages = new Set(); // Track seen images to prevent duplicates

            if (category === 'all') {
                // Show content from all categories across selected data sources
                dataSources.forEach(dataSource => {
                    if (quizData[dataSource]) {
                        Object.keys(quizData[dataSource]).forEach(cat => {
                            if (cat !== 'all' && quizData[dataSource][cat]) {
                                const categoryData = quizData[dataSource][cat];
                                if (Array.isArray(categoryData)) {
                                    categoryData.forEach(item => {
                                        // Only include items with images and avoid duplicates
                                        if (item.image && !seenImages.has(item.image)) {
                                            seenImages.add(item.image);
                                            contentToShow.push({
                                                ...item,
                                                category: cat,
                                                sourceType: dataSource
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            } else {
                // Show content from specific category
                dataSources.forEach(dataSource => {
                    if (quizData[dataSource] && quizData[dataSource][category] && Array.isArray(quizData[dataSource][category])) {
                        quizData[dataSource][category].forEach(item => {
                            // Only include items with images and avoid duplicates
                            if (item.image && !seenImages.has(item.image)) {
                                seenImages.add(item.image);
                                contentToShow.push({
                                    ...item,
                                    category,
                                    sourceType: dataSource
                                });
                            }
                        });
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error processing learning content:', error);
        learnContentGrid.innerHTML = '<p class="no-content">Fehler beim Laden der Lerninhalte.</p>';
        return;
    }

    // Render the content
    learnContentGrid.innerHTML = '';

    if (contentToShow.length === 0) {
        learnContentGrid.innerHTML = '<p class="no-content">Keine Lerninhalte für diese Kategorie verfügbar.</p>';
        return;
    }

    // Log content summary for debugging
    console.log(`Learning content loaded: ${contentToShow.length} items from category "${category}"`);
    const sourceCounts = contentToShow.reduce((acc, item) => {
        acc[item.sourceType] = (acc[item.sourceType] || 0) + 1;
        return acc;
    }, {});
    console.log('Content by source:', sourceCounts);

    // Sort content for better organization (optional)
    contentToShow.sort((a, b) => {
        // Sort by category first, then by correct answer
        if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
        }
        return a.correctAnswer.localeCompare(b.correctAnswer);
    });

    contentToShow.forEach(item => {
        const referenceItem = createLearningReferenceItem(item);
        learnContentGrid.appendChild(referenceItem);
    });
}

/**
 * Creates a learning reference item element
 * @param {Object} item Quiz item with image, correctAnswer, explanation, etc.
 * @returns {HTMLElement} The reference item element
 */
function createLearningReferenceItem(item) {
    const itemElement = document.createElement('div');
    itemElement.className = 'learn-reference-item';

    // Handle missing images gracefully
    const imageUrl = item.image || 'https://placehold.co/400x200/bdc3c7/2c3e50?text=Kein+Bild';

    // Format category name for display
    const categoryDisplayName = item.category.charAt(0).toUpperCase() + item.category.slice(1).replace(/_/g, ' ');

    // Create source type indicator if available
    const sourceTypeIndicator = item.sourceType ?
        `<span class="learn-reference-source" title="Quelle: ${item.sourceType}">${getSourceTypeDisplayName(item.sourceType)}</span>` : '';

    itemElement.innerHTML = `
        <img src="${imageUrl}" alt="Lerninhalt" class="learn-reference-image" loading="lazy">
        <div class="learn-reference-content">
            <div class="learn-reference-answer">${item.correctAnswer}</div>
            <div class="learn-reference-explanation">${item.explanation || 'Keine zusätzlichen Informationen verfügbar.'}</div>
            <div class="learn-reference-meta">
                <div class="learn-reference-category">${categoryDisplayName}</div>
                ${sourceTypeIndicator}
            </div>
        </div>
    `;

    return itemElement;
}

/**
 * Gets a user-friendly display name for the quiz source type
 * @param {string} sourceType The source type (image-based, time-limited)
 * @returns {string} Display name
 */
function getSourceTypeDisplayName(sourceType) {
    switch (sourceType) {
        case 'image-based':
            return 'Bildrätsel';
        case 'time-limited':
            return 'Zeitlimit';
        default:
            return sourceType;
    }
}

// --- Event Listener Setup ---

let eventListenersSetup = false; // Flag to prevent duplicate setup

function setupEventListeners() {
    if (eventListenersSetup) {
        console.log("Event listeners already set up, skipping duplicate setup");
        return;
    }

    console.log("Setting up event listeners");
    eventListenersSetup = true;

    // Burger Menu Toggle
    if (burger && navLinksContainer) {
        burger.addEventListener('click', () => {
            const isExpanded = burger.getAttribute('aria-expanded') === 'true';
            burger.setAttribute('aria-expanded', String(!isExpanded));
            navLinksContainer.classList.toggle('show');
            burger.classList.toggle('change');
        });
    }

    // Section Navigation (Nav Links and Buttons with data-target)
    document.querySelectorAll('.nav-links a[data-target], .btn[data-target]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = el.dataset.target;
            if (targetId) {
                showSection(targetId);
            }
        });
    });

    // Player Name Save
    if (savePlayerNameBtn && playerNameInput) {
        savePlayerNameBtn.addEventListener('click', savePlayerName);
        playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                savePlayerName();
            }
        });
    }

    // Quiz Mode Selection
    if (quizOptionButtons) {
        quizOptionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const quizType = button.dataset.quizType;
                if (quizType) {
                    // Check if quiz data is loaded
                    if (!quizData || Object.keys(quizData).length === 0) {
                        showTemporaryFeedback('Quiz-Daten werden noch geladen. Bitte warten Sie einen Moment.', 'warning');
                        return;
                    }

                    if (ensurePlayerName()) { // Check for player name before proceeding
                        if (quizType === 'time-limited') {
                            // For time-limited quiz, show time selection UI
                            showTimeLimitSelection();
                        } else {
                            // For other quiz types, hide time selection and proceed directly to categories
                            if (timeLimitOptionsDiv) {
                                timeLimitOptionsDiv.style.display = 'none';
                                const startQuizBtn = document.getElementById('start-time-limited-quiz');
                                const instructionText = document.getElementById('time-limit-instruction');
                                if (startQuizBtn) {
                                    startQuizBtn.style.display = 'none';
                                }
                                if (instructionText) {
                                    instructionText.style.display = 'none';
                                }
                            }
                            showQuizCategories(quizType);
                        }
                    }
                }
            });
        });
    }
    if (timeLimitSelect) {
        timeLimitSelect.addEventListener('change', (e) => {
            quizState.selectedTimeLimit = parseFloat(e.target.value) || 1;
        });
    }

    // Quiz Category Selection (Event delegation on the container)
    if (quizCategoryOptionsContainer) {
         quizCategoryOptionsContainer.addEventListener('click', (e) => {
             const target = e.target.closest('.quiz-option[data-category]');
             if (target) {
                 const category = target.dataset.category;
                 if (quizState.currentQuizType && category) {
                     startQuiz(quizState.currentQuizType, category);
                 }
             }
         });
    }

    // Back to Quiz Mode Selection
    if (backToQuizSelectionBtn) {
        backToQuizSelectionBtn.addEventListener('click', () => {
            resetQuizState();
            // Hide time limit selection when going back
            if (timeLimitOptionsDiv) {
                timeLimitOptionsDiv.style.display = 'none';
                const startQuizBtn = document.getElementById('start-time-limited-quiz');
                const instructionText = document.getElementById('time-limit-instruction');
                if (startQuizBtn) {
                    startQuizBtn.style.display = 'none';
                }
                if (instructionText) {
                    instructionText.style.display = 'none';
                }
            }
            showSection('quiz');
        });
    }

    // Quiz Game Controls
    if (submitButton) {
        console.log("Adding event listener to submit button");
        submitButton.addEventListener('click', () => {
            console.log("Submit button clicked, calling checkAnswer");
            checkAnswer(false);
        });
    }
    if (nextButton) nextButton.addEventListener('click', nextQuestion);
    if (prevButton) prevButton.addEventListener('click', previousQuestion);
    if (finishButton) finishButton.addEventListener('click', finishQuiz);
    if (quitButton) quitButton.addEventListener('click', finishQuiz); // Quit also finishes the quiz

    // Learn Section Category Selector
    if (learnCategorySelect) {
        learnCategorySelect.addEventListener('change', (event) => {
            const selectedCategory = event.target.value;
            renderLearningContent(selectedCategory);
        });
    }

    // Enhanced Leaderboard Controls
    if (leaderboardModeSelect) {
        leaderboardModeSelect.addEventListener('change', () => {
            updateLeaderboardCategories();
            updateTimeLimitVisibility();
            updateLeaderboardDisplay();
        });
    }

    if (leaderboardCategorySelect) {
        leaderboardCategorySelect.addEventListener('change', () => {
            updateLeaderboardDisplay();
        });
    }

    if (leaderboardTimeSelect) {
        leaderboardTimeSelect.addEventListener('change', () => {
            updateLeaderboardDisplay();
        });
    }

    // Manual leaderboard controls removed - leaderboard updates automatically

    // Player Name Change Controls
    if (changePlayerBtn) {
        changePlayerBtn.addEventListener('click', showPlayerNameModal);
    }

    if (closePlayerModalBtn) {
        closePlayerModalBtn.addEventListener('click', hidePlayerNameModal);
    }

    if (cancelPlayerChangeBtn) {
        cancelPlayerChangeBtn.addEventListener('click', hidePlayerNameModal);
    }

    if (confirmPlayerChangeBtn) {
        confirmPlayerChangeBtn.addEventListener('click', confirmPlayerNameChange);
    }

    // Allow Enter key to confirm player name change
    if (newPlayerNameInput) {
        newPlayerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmPlayerNameChange();
            }
        });
    }

    // Close modal when clicking outside of it
    if (playerNameModal) {
        playerNameModal.addEventListener('click', (e) => {
            if (e.target === playerNameModal) {
                hidePlayerNameModal();
            }
        });
    }

    // Settings Listeners
    if (soundToggle) {
        soundToggle.addEventListener('change', (event) => {
            toggleSound(event.target.checked);
        });
    }
    if (themeSelect) {
        themeSelect.addEventListener('change', (event) => {
            setTheme(event.target.value, themeSelect);
        });
    }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed.");

    // Initialize data first
    await initializeData();
    console.log("Data initialized successfully");

    // Cache DOM elements first
    cacheAppDOMElements();
    cacheQuizDOMElements(); // Call caching from quiz module as well
    cacheAdminDOMElements(); // Call caching from admin module as well

    // Load player name
    appState.playerName = localStorage.getItem('terraTueftlerPlayerName') || 'Anonym';
    updatePlayerNameDisplay();

    // Load saved settings (theme, sound) AND setup listeners via callback
    loadSettings(themeSelect, soundToggle, setupEventListeners);

    // Setup all event listeners - MOVED into loadSettings callback
    // setupEventListeners();

    // Show initial section (default is home)
    // Determine initial section (e.g., from URL hash or default to home)
    const initialSectionId = window.location.hash.substring(1) || 'home';
    const validSectionIds = Array.from(sections).map(s => s.id);
    showSection(validSectionIds.includes(initialSectionId) ? initialSectionId : 'home');

     // Pre-select default time limit in dropdown if it exists
     if(timeLimitSelect) timeLimitSelect.value = String(quizState.selectedTimeLimit);

    console.log("TerraTüftler App Initialized.");

    // Quiz data loaded and application ready
});