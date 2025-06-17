import { quizData, refreshQuizData } from './data.js';
import { showTemporaryFeedback } from './app.js';
import {
    clearAllLeaderboardData,
    getLeaderboardStatistics
} from './leaderboardData.js';
import { saveQuizDataToBackend, addCategoryToBackend, addQuestionToBackend, editQuestionFromBackend, deleteQuestionFromBackend, deleteCategoryFromBackend } from './api.js';

// Admin state
export const adminState = {
    isInitialized: false,
    dragDropInitialized: false,
    currentStats: {
        totalCategories: 0,
        totalQuestions: 0,
        totalModes: 2
    }
};

// DOM elements cache
let adminElements = {};

// Flag to prevent duplicate file processing
let isProcessingFileUpload = false;

/** Cache admin DOM elements */
export function cacheAdminDOMElements() {
    adminElements = {
        // Admin section
        adminSection: document.getElementById('admin'),
        
        // Buttons
        addCategoryBtn: document.getElementById('add-category-btn'),
        addQuestionBtn: document.getElementById('add-question-btn'),
        manageContentBtn: document.getElementById('manage-content-btn'),
        exportDataBtn: document.getElementById('export-data-btn'),
        importDataBtn: document.getElementById('import-data-btn'),
        
        // Stats
        totalCategoriesSpan: document.getElementById('total-categories'),
        totalQuestionsSpan: document.getElementById('total-questions'),
        totalModesSpan: document.getElementById('total-modes'),
        totalLeaderboardEntriesSpan: document.getElementById('total-leaderboard-entries'),
        totalPlayersSpan: document.getElementById('total-players'),

        // Leaderboard Management
        clearLeaderboardBtn: document.getElementById('clear-leaderboard-btn'),
        leaderboardStatsBtn: document.getElementById('leaderboard-stats-btn'),

        // Leaderboard Stats Modal
        leaderboardStatsModal: document.getElementById('leaderboard-stats-modal'),
        closeStatsModal: document.getElementById('close-stats-modal'),
        closeStatsBtn: document.getElementById('close-stats'),
        statsTotalEntries: document.getElementById('stats-total-entries'),
        statsTotalPlayers: document.getElementById('stats-total-players'),
        statsLastUpdated: document.getElementById('stats-last-updated'),
        topPerformersList: document.getElementById('top-performers-list'),
        categoryStats: document.getElementById('category-stats'),
        
        // Category Modal
        addCategoryModal: document.getElementById('add-category-modal'),
        closeCategoryModal: document.getElementById('close-category-modal'),
        categoryNameInput: document.getElementById('category-name'),
        modeImageBased: document.getElementById('mode-image-based'),
        modeTimeLimited: document.getElementById('mode-time-limited'),
        categoryDescriptionInput: document.getElementById('category-description'),
        cancelCategoryBtn: document.getElementById('cancel-category'),
        confirmCategoryBtn: document.getElementById('confirm-category'),
        
        // Question Modal
        addQuestionModal: document.getElementById('add-question-modal'),
        closeQuestionModal: document.getElementById('close-question-modal'),
        questionCategorySelect: document.getElementById('question-category'),
        questionTextInput: document.getElementById('admin-question-text'),
        questionImageInput: document.getElementById('question-image'),
        questionImageFileInput: document.getElementById('question-image-file'),
        imagePreview: document.getElementById('image-preview'),
        previewImg: document.getElementById('preview-img'),
        imageFilename: document.getElementById('image-filename'),
        imageSize: document.getElementById('image-size'),
        option1Input: document.getElementById('option-1'),
        option2Input: document.getElementById('option-2'),
        option3Input: document.getElementById('option-3'),
        option4Input: document.getElementById('option-4'),
        correctAnswerSelect: document.getElementById('correct-answer'),
        questionExplanationInput: document.getElementById('question-explanation'),
        questionStreetViewUrlInput: document.getElementById('question-streetview-url'),
        questionPreview: document.getElementById('question-preview'),
        previewQuestionBtn: document.getElementById('preview-question'),
        cancelQuestionBtn: document.getElementById('cancel-question'),
        confirmQuestionBtn: document.getElementById('confirm-question'),

        // Content Management Modal
        contentManagementModal: document.getElementById('content-management-modal'),
        closeContentModal: document.getElementById('close-content-modal'),
        categoriesTab: document.getElementById('categories-tab'),
        questionsTab: document.getElementById('questions-tab'),
        categoriesContent: document.getElementById('categories-content'),
        questionsContent: document.getElementById('questions-content'),
        categoriesList: document.getElementById('categories-list'),
        questionsList: document.getElementById('questions-list'),
        filterMode: document.getElementById('filter-mode'),
        filterCategory: document.getElementById('filter-category'),
        closeContentBtn: document.getElementById('close-content'),

        // Delete Confirmation Modal
        deleteConfirmationModal: document.getElementById('delete-confirmation-modal'),
        closeDeleteModal: document.getElementById('close-delete-modal'),
        deleteModalTitle: document.getElementById('delete-modal-title'),
        deleteModalMessage: document.getElementById('delete-modal-message'),
        deleteModalDetails: document.getElementById('delete-modal-details'),
        cancelDeleteBtn: document.getElementById('cancel-delete'),
        confirmDeleteBtn: document.getElementById('confirm-delete'),
        deleteBtnText: document.getElementById('delete-btn-text'),
        deleteLoading: document.getElementById('delete-loading')
    };
}

/** Initialize admin interface */
export function initializeAdmin() {
    if (adminState.isInitialized) return;

    console.log('🔧 Initializing admin interface...');

    cacheAdminDOMElements();

    // Debug: Check if admin elements are found
    console.log('=== ADMIN ELEMENTS DEBUG ===');
    Object.keys(adminElements).forEach(key => {
        console.log(`${key}:`, adminElements[key] ? '✅ Found' : '❌ Not found');
    });

    setupAdminEventListeners();
    setupCategoryModalEvents();
    setupQuestionModalEvents();
    setupLeaderboardStatsModalEvents();
    setupContentManagementModalEvents();
    setupDeleteConfirmationModalEvents();

    // Check if data migration is needed
    if (isMigrationNeeded()) {
        console.log('Data migration needed - migrating to unified structure...');
        migrateToUnifiedStructure().then(success => {
            if (success) {
                console.log('Data migration completed successfully');
                showTemporaryFeedback('Datenstruktur wurde automatisch aktualisiert und optimiert!', 'success');
            } else {
                console.error('Data migration failed');
                showTemporaryFeedback('Warnung: Datenstruktur-Update fehlgeschlagen', 'warning');
            }
            updateAdminStats();
        });
    }

    updateAdminStats();

    adminState.isInitialized = true;
    console.log('Admin interface initialized');
}

/** Setup admin event listeners */
function setupAdminEventListeners() {
    // Main action buttons
    if (adminElements.addCategoryBtn) {
        adminElements.addCategoryBtn.addEventListener('click', showAddCategoryModal);
    }
    
    if (adminElements.addQuestionBtn) {
        adminElements.addQuestionBtn.addEventListener('click', showAddQuestionModal);
    }

    if (adminElements.manageContentBtn) {
        adminElements.manageContentBtn.addEventListener('click', showContentManagementModal);
    }

    if (adminElements.exportDataBtn) {
        adminElements.exportDataBtn.addEventListener('click', exportQuizData);
    }
    
    if (adminElements.importDataBtn) {
        adminElements.importDataBtn.addEventListener('click', importQuizData);
    }

    // Leaderboard management buttons
    if (adminElements.clearLeaderboardBtn) {
        adminElements.clearLeaderboardBtn.addEventListener('click', clearLeaderboard);
    }

    if (adminElements.leaderboardStatsBtn) {
        adminElements.leaderboardStatsBtn.addEventListener('click', showLeaderboardStats);
    }

    // Leaderboard stats modal events
    setupLeaderboardStatsModalEvents();

    // Category modal events
    setupCategoryModalEvents();
    
    // Question modal events
    setupQuestionModalEvents();

    // Content management modal events
    setupContentManagementModalEvents();

    // Delete confirmation modal events
    setupDeleteConfirmationModalEvents();
}

/** Setup category modal event listeners */
function setupCategoryModalEvents() {
    if (adminElements.closeCategoryModal) {
        adminElements.closeCategoryModal.addEventListener('click', hideAddCategoryModal);
    }
    
    if (adminElements.cancelCategoryBtn) {
        adminElements.cancelCategoryBtn.addEventListener('click', hideAddCategoryModal);
    }
    
    if (adminElements.confirmCategoryBtn) {
        adminElements.confirmCategoryBtn.addEventListener('click', handleAddCategory);
    }
    
    // Close modal when clicking outside
    if (adminElements.addCategoryModal) {
        adminElements.addCategoryModal.addEventListener('click', (e) => {
            if (e.target === adminElements.addCategoryModal) {
                hideAddCategoryModal();
            }
        });
    }
}

/** Setup question modal event listeners */
function setupQuestionModalEvents() {
    if (adminElements.closeQuestionModal) {
        adminElements.closeQuestionModal.addEventListener('click', hideAddQuestionModal);
    }
    
    if (adminElements.cancelQuestionBtn) {
        adminElements.cancelQuestionBtn.addEventListener('click', hideAddQuestionModal);
    }
    
    if (adminElements.confirmQuestionBtn) {
        adminElements.confirmQuestionBtn.addEventListener('click', handleAddQuestion);
    }
    
    if (adminElements.previewQuestionBtn) {
        adminElements.previewQuestionBtn.addEventListener('click', showQuestionPreview);
    }
    
    // Load categories when modal is shown (no mode selection needed)
    // Categories will be loaded in showAddQuestionModal()
    
    // Image URL change for preview
    if (adminElements.questionImageInput) {
        adminElements.questionImageInput.addEventListener('input', updateImagePreview);
    }

    // File input change for preview
    if (adminElements.questionImageFileInput) {
        adminElements.questionImageFileInput.addEventListener('change', handleFileSelection);
    }

    // Note: Drag and drop will be set up when modal is shown
    
    // Option inputs change for correct answer dropdown
    const optionInputs = [
        adminElements.option1Input,
        adminElements.option2Input,
        adminElements.option3Input,
        adminElements.option4Input
    ];
    
    optionInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', updateCorrectAnswerOptions);
        }
    });
    
    // Close modal when clicking outside
    if (adminElements.addQuestionModal) {
        adminElements.addQuestionModal.addEventListener('click', (e) => {
            if (e.target === adminElements.addQuestionModal) {
                hideAddQuestionModal();
            }
        });
    }
}

/** Update admin statistics */
function updateAdminStats() {
    let totalCategories = 0;
    let totalQuestions = 0;

    // Count categories and questions across all modes
    Object.keys(quizData).forEach(mode => {
        const categories = Object.keys(quizData[mode]);
        totalCategories += categories.length;

        categories.forEach(category => {
            totalQuestions += quizData[mode][category].length;
        });
    });

    // Remove duplicates for categories (same category might exist in multiple modes)
    const uniqueCategories = new Set();
    Object.keys(quizData).forEach(mode => {
        Object.keys(quizData[mode]).forEach(category => {
            uniqueCategories.add(category);
        });
    });

    adminState.currentStats.totalCategories = uniqueCategories.size;
    adminState.currentStats.totalQuestions = totalQuestions;

    // Get leaderboard statistics
    try {
        const leaderboardStats = getLeaderboardStatistics();
        adminState.currentStats.totalLeaderboardEntries = leaderboardStats.totalEntries;
        adminState.currentStats.totalPlayers = leaderboardStats.totalPlayers;
    } catch (error) {
        console.error('Error getting leaderboard stats:', error);
        adminState.currentStats.totalLeaderboardEntries = 0;
        adminState.currentStats.totalPlayers = 0;
    }

    // Update display
    if (adminElements.totalCategoriesSpan) {
        adminElements.totalCategoriesSpan.textContent = adminState.currentStats.totalCategories;
    }
    if (adminElements.totalQuestionsSpan) {
        adminElements.totalQuestionsSpan.textContent = adminState.currentStats.totalQuestions;
    }
    if (adminElements.totalModesSpan) {
        adminElements.totalModesSpan.textContent = adminState.currentStats.totalModes;
    }
    if (adminElements.totalLeaderboardEntriesSpan) {
        adminElements.totalLeaderboardEntriesSpan.textContent = adminState.currentStats.totalLeaderboardEntries;
    }
    if (adminElements.totalPlayersSpan) {
        adminElements.totalPlayersSpan.textContent = adminState.currentStats.totalPlayers;
    }
}

/** Show add category modal */
function showAddCategoryModal() {
    if (adminElements.addCategoryModal) {
        // Reset form
        resetCategoryForm();
        adminElements.addCategoryModal.style.display = 'flex';
        if (adminElements.categoryNameInput) {
            adminElements.categoryNameInput.focus();
        }
    }
}

/** Hide add category modal */
function hideAddCategoryModal() {
    if (adminElements.addCategoryModal) {
        adminElements.addCategoryModal.style.display = 'none';
        resetCategoryForm();
    }
}

/** Reset category form */
function resetCategoryForm() {
    if (adminElements.categoryNameInput) adminElements.categoryNameInput.value = '';
    if (adminElements.categoryDescriptionInput) adminElements.categoryDescriptionInput.value = '';
    if (adminElements.modeImageBased) adminElements.modeImageBased.checked = false;
    if (adminElements.modeTimeLimited) adminElements.modeTimeLimited.checked = false;
}

/** Show add question modal */
function showAddQuestionModal() {
    if (adminElements.addQuestionModal) {
        // Reset form
        resetQuestionForm();

        // Load all available categories automatically
        loadAllCategories();

        adminElements.addQuestionModal.style.display = 'flex';
        if (adminElements.questionCategorySelect) {
            adminElements.questionCategorySelect.focus();
        }

        // Setup drag and drop functionality only once
        if (!adminState.dragDropInitialized) {
            setTimeout(() => {
                setupDragAndDrop();
                adminState.dragDropInitialized = true;
            }, 200);
        }
    }
}

/** Hide add question modal */
function hideAddQuestionModal() {
    if (adminElements.addQuestionModal) {
        adminElements.addQuestionModal.style.display = 'none';
        resetQuestionForm();
    }
}

/** Reset question form */
function resetQuestionForm() {
    // Reset processing flags
    isProcessingFileUpload = false;

    // Reset edit state
    editState = {
        isEditing: false,
        mode: null,
        category: null,
        questionIndex: null,
        originalQuestion: null
    };

    // Reset modal title and button text
    const modalTitle = document.querySelector('#add-question-modal .modal-header h3');
    if (modalTitle) {
        modalTitle.textContent = 'Neue Frage hinzufügen';
    }

    const submitBtn = adminElements.confirmQuestionBtn;
    if (submitBtn) {
        submitBtn.textContent = 'Frage hinzufügen';
        submitBtn.disabled = false;
    }

    if (adminElements.questionCategorySelect) {
        adminElements.questionCategorySelect.innerHTML = '<option value="">Kategorie wählen...</option>';
        adminElements.questionCategorySelect.disabled = false;
    }
    if (adminElements.questionTextInput) adminElements.questionTextInput.value = '';
    if (adminElements.questionImageInput) adminElements.questionImageInput.value = '';
    if (adminElements.questionImageFileInput) adminElements.questionImageFileInput.value = '';
    hideImagePreview();
    if (adminElements.option1Input) adminElements.option1Input.value = '';
    if (adminElements.option2Input) adminElements.option2Input.value = '';
    if (adminElements.option3Input) adminElements.option3Input.value = '';
    if (adminElements.option4Input) adminElements.option4Input.value = '';
    if (adminElements.correctAnswerSelect) {
        adminElements.correctAnswerSelect.innerHTML = '<option value="">Richtige Antwort wählen...</option>';
    }
    if (adminElements.questionExplanationInput) adminElements.questionExplanationInput.value = '';
    if (adminElements.questionStreetViewUrlInput) adminElements.questionStreetViewUrlInput.value = '';
    if (adminElements.questionPreview) adminElements.questionPreview.style.display = 'none';
}

/** Load all available categories from unified structure */
function loadAllCategories() {
    if (!adminElements.questionCategorySelect) return;

    adminElements.questionCategorySelect.innerHTML = '';

    // Get categories from unified structure first, then fall back to legacy
    let categories = [];

    if (quizData.questions) {
        // Use unified structure
        categories = Object.keys(quizData.questions).filter(cat => cat !== 'all');
    } else {
        // Fall back to legacy structure - collect unique categories
        const uniqueCategories = new Set();
        ['image-based', 'time-limited'].forEach(mode => {
            if (quizData[mode]) {
                Object.keys(quizData[mode]).forEach(category => {
                    if (category !== 'all') {
                        uniqueCategories.add(category);
                    }
                });
            }
        });
        categories = Array.from(uniqueCategories);
    }

    console.log('=== CATEGORY LOADING DEBUG ===');
    console.log('Available categories:', categories);
    console.log('Using unified structure:', !!quizData.questions);

    if (categories.length === 0) {
        adminElements.questionCategorySelect.innerHTML = '<option value="">Keine Kategorien verfügbar</option>';
        adminElements.questionCategorySelect.disabled = true;
    } else {
        adminElements.questionCategorySelect.innerHTML = '<option value="">Kategorie wählen...</option>';

        // Sort categories alphabetically
        categories.sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
            adminElements.questionCategorySelect.appendChild(option);
        });
        adminElements.questionCategorySelect.disabled = false;
    }
}

/** Handle file selection */
function handleFileSelection(event) {
    // Prevent duplicate processing
    if (isProcessingFileUpload) {
        console.log('File upload already in progress, ignoring duplicate event');
        return;
    }

    isProcessingFileUpload = true;

    try {
        const file = event.target.files[0];
        if (!file) {
            hideImagePreview();
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showTemporaryFeedback('Bitte wähle eine gültige Bilddatei aus.', 'warning');
            event.target.value = '';
            hideImagePreview();
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            showTemporaryFeedback('Bilddatei ist zu groß. Maximum: 10MB', 'warning');
            event.target.value = '';
            hideImagePreview();
            return;
        }

        // Clear URL input when file is selected
        if (adminElements.questionImageInput) {
            adminElements.questionImageInput.value = '';
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            showImagePreview(e.target.result, file.name, file.size);
        };
        reader.readAsDataURL(file);
    } finally {
        // Reset the flag after a short delay to allow for any remaining events
        setTimeout(() => {
            isProcessingFileUpload = false;
        }, 100);
    }
}

/** Update image preview */
function updateImagePreview() {
    if (!adminElements.questionImageInput || !adminElements.imagePreview || !adminElements.previewImg) return;

    const imageUrl = adminElements.questionImageInput.value.trim();

    if (imageUrl && isValidUrl(imageUrl)) {
        // Clear file input when URL is entered
        if (adminElements.questionImageFileInput) {
            adminElements.questionImageFileInput.value = '';
        }

        adminElements.previewImg.src = imageUrl;
        adminElements.previewImg.onload = () => {
            showImagePreview(imageUrl, 'Externe URL', null);
        };
        adminElements.previewImg.onerror = () => {
            hideImagePreview();
            showTemporaryFeedback('Bild konnte nicht geladen werden. Überprüfe die URL.', 'warning');
        };
    } else {
        hideImagePreview();
    }
}

/** Show image preview */
function showImagePreview(src, filename, fileSize) {
    if (!adminElements.imagePreview || !adminElements.previewImg) return;

    adminElements.previewImg.src = src;
    adminElements.imagePreview.style.display = 'block';

    // Update filename and size info
    if (adminElements.imageFilename) {
        adminElements.imageFilename.textContent = filename;
    }
    if (adminElements.imageSize && fileSize) {
        adminElements.imageSize.textContent = formatFileSize(fileSize);
    } else if (adminElements.imageSize) {
        adminElements.imageSize.textContent = '';
    }
}

/** Hide image preview */
function hideImagePreview() {
    if (adminElements.imagePreview) {
        adminElements.imagePreview.style.display = 'none';
    }
}

/** Format file size for display */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/** Setup drag and drop functionality */
function setupDragAndDrop() {
    const fileUploadLabel = document.querySelector('.file-upload-label');
    const addQuestionModal = adminElements.addQuestionModal;

    console.log('🔧 Setting up drag and drop...');
    console.log('File upload label found:', !!fileUploadLabel);
    console.log('Add question modal found:', !!addQuestionModal);

    if (!fileUploadLabel || !addQuestionModal) {
        console.warn('❌ Drag and drop setup failed - missing elements');
        return;
    }

    console.log('✅ Drag and drop setup successful');

    // Prevent default drag behaviors globally to stop browser from opening images
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
        addQuestionModal.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadLabel.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadLabel.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files on both the label and the entire modal
    fileUploadLabel.addEventListener('drop', handleDrop, false);
    addQuestionModal.addEventListener('drop', handleModalDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        console.log('🎯 Drag enter/over detected');
        fileUploadLabel.classList.add('drag-over');
    }

    function unhighlight(e) {
        console.log('🎯 Drag leave/drop detected');
        fileUploadLabel.classList.remove('drag-over');
    }

    function handleDrop(e) {
        console.log('📁 Drop event triggered');

        // Prevent duplicate processing
        if (isProcessingFileUpload) {
            console.log('File upload already in progress, ignoring drop event');
            return;
        }

        const dt = e.dataTransfer;
        const files = dt.files;
        console.log('Files dropped:', files.length);

        if (files.length > 0) {
            const file = files[0];

            // Validate file type
            if (!file.type.startsWith('image/')) {
                showTemporaryFeedback('Bitte ziehe eine gültige Bilddatei hierher.', 'warning');
                return;
            }

            // Validate file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                showTemporaryFeedback('Bilddatei ist zu groß. Maximum: 10MB', 'warning');
                return;
            }

            // Set processing flag
            isProcessingFileUpload = true;

            // Set the file to the input element WITHOUT triggering change event
            if (adminElements.questionImageFileInput) {
                // Create a new FileList-like object
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                adminElements.questionImageFileInput.files = dataTransfer.files;

                // Clear URL input when file is selected
                if (adminElements.questionImageInput) {
                    adminElements.questionImageInput.value = '';
                }

                // Show preview directly without triggering change event
                const reader = new FileReader();
                reader.onload = (e) => {
                    showImagePreview(e.target.result, file.name, file.size);
                    // Reset processing flag after preview is shown
                    setTimeout(() => {
                        isProcessingFileUpload = false;
                    }, 100);
                };
                reader.readAsDataURL(file);
            }

            showTemporaryFeedback('Bild erfolgreich hochgeladen!', 'success');
        }
    }

    function handleModalDrop(e) {
        // Only handle drops that aren't on the file upload label
        if (!e.target.closest('.file-upload-label')) {
            console.log('📁 Modal drop event triggered');
            handleDrop(e);
        }
    }
}

/** Update correct answer options based on option inputs */
function updateCorrectAnswerOptions() {
    if (!adminElements.correctAnswerSelect) return;

    const options = [
        adminElements.option1Input?.value.trim(),
        adminElements.option2Input?.value.trim(),
        adminElements.option3Input?.value.trim(),
        adminElements.option4Input?.value.trim()
    ].filter(option => option && option.length > 0);

    const currentValue = adminElements.correctAnswerSelect.value;
    adminElements.correctAnswerSelect.innerHTML = '<option value="">Richtige Antwort wählen...</option>';

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        adminElements.correctAnswerSelect.appendChild(optionElement);
    });

    // Restore selection if still valid
    if (currentValue && options.includes(currentValue)) {
        adminElements.correctAnswerSelect.value = currentValue;
    }
}

/** Validate URL */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/** Handle add category */
async function handleAddCategory() {
    const categoryName = adminElements.categoryNameInput?.value.trim();
    const description = adminElements.categoryDescriptionInput?.value.trim();
    const selectedModes = [];

    if (adminElements.modeImageBased?.checked) selectedModes.push('image-based');
    if (adminElements.modeTimeLimited?.checked) selectedModes.push('time-limited');

    // Validation
    if (!categoryName) {
        showTemporaryFeedback('Bitte gib einen Kategorie-Namen ein.', 'warning');
        return;
    }

    if (!isValidCategoryName(categoryName)) {
        showTemporaryFeedback('Kategorie-Name darf nur Kleinbuchstaben, Zahlen und Unterstriche enthalten.', 'warning');
        return;
    }

    if (selectedModes.length === 0) {
        showTemporaryFeedback('Bitte wähle mindestens einen Quiz-Modus aus.', 'warning');
        return;
    }

    // Check if category already exists in any selected mode
    const existingModes = [];
    selectedModes.forEach(mode => {
        let dataSource = mode;
        if (mode === 'time-limited') dataSource = 'image-based';

        if (quizData[dataSource] && quizData[dataSource][categoryName]) {
            existingModes.push(mode);
        }
    });

    if (existingModes.length > 0) {
        const modeNames = existingModes.join(', ');
        showTemporaryFeedback(`Kategorie "${categoryName}" existiert bereits in: ${modeNames}`, 'warning');
        return;
    }

    // Add category to selected modes (local data)
    selectedModes.forEach(mode => {
        let dataSource = mode;
        if (mode === 'time-limited') dataSource = 'image-based';

        if (!quizData[dataSource]) {
            quizData[dataSource] = {};
        }

        quizData[dataSource][categoryName] = [];
    });

    // Save to backend and localStorage
    try {
        const backendSuccess = await addCategoryToBackend(categoryName, selectedModes);
        if (backendSuccess) {
            console.log('Category saved to backend successfully');
        } else {
            console.warn('Failed to save category to backend, using localStorage backup');
        }
    } catch (error) {
        console.error('Error saving category to backend:', error);
    }

    // Save to localStorage as backup
    saveQuizDataBackup();

    // Update stats and UI
    updateAdminStats();
    hideAddCategoryModal();

    const modeNames = selectedModes.join(', ');
    showTemporaryFeedback(`Kategorie "${categoryName}" erfolgreich zu ${modeNames} hinzugefügt!`, 'success');
}

/** Validate category name */
function isValidCategoryName(name) {
    // Allow lowercase letters, numbers, and underscores
    return /^[a-z0-9_]+$/.test(name);
}

/** Handle add question */
async function handleAddQuestion(event) {
    // Prevent any default form submission behavior
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // Prevent double submission by disabling the button
    if (adminElements.confirmQuestionBtn) {
        if (adminElements.confirmQuestionBtn.disabled) {
            console.log('Question submission already in progress, ignoring duplicate request');
            return;
        }
        adminElements.confirmQuestionBtn.disabled = true;
        adminElements.confirmQuestionBtn.textContent = editState.isEditing ? 'Wird gespeichert...' : 'Wird hinzugefügt...';
    }

    const category = adminElements.questionCategorySelect?.value;
    // Mode is now automatically set to 'both' since questions are added to both quiz modes
    const questionText = adminElements.questionTextInput?.value.trim();
    const imageUrl = adminElements.questionImageInput?.value.trim();
    const imageFile = adminElements.questionImageFileInput?.files[0];
    const explanation = adminElements.questionExplanationInput?.value.trim();
    const streetViewUrl = adminElements.questionStreetViewUrlInput?.value.trim();

    const options = [
        adminElements.option1Input?.value.trim(),
        adminElements.option2Input?.value.trim(),
        adminElements.option3Input?.value.trim(),
        adminElements.option4Input?.value.trim()
    ].filter(option => option && option.length > 0);

    const correctAnswer = adminElements.correctAnswerSelect?.value;

    // Helper function to reset button state
    const resetSubmitButton = () => {
        if (adminElements.confirmQuestionBtn) {
            adminElements.confirmQuestionBtn.disabled = false;
            adminElements.confirmQuestionBtn.textContent = editState.isEditing ? 'Änderungen speichern' : 'Frage hinzufügen';
        }
    };

    try {
        // Debug logging
        console.log('=== QUESTION SUBMISSION DEBUG ===');
        console.log('Category:', category);
        console.log('Question Text:', questionText);
        console.log('Image URL:', imageUrl);
        console.log('Image File:', imageFile);
        console.log('Options:', options);
        console.log('Correct Answer:', correctAnswer);
        console.log('Explanation:', explanation);
        console.log('Street View URL:', streetViewUrl);

        // Validation
        if (!category) {
            showTemporaryFeedback('Bitte wähle eine Kategorie aus.', 'warning');
            resetSubmitButton();
            return;
        }

        // Prevent direct addition to "All" category
        if (category.toLowerCase() === 'all') {
            showTemporaryFeedback('Die "All"-Kategorie wird automatisch verwaltet. Bitte wähle eine spezifische Kategorie.', 'warning');
            resetSubmitButton();
            return;
        }

        // Image is required for all questions (since we only have image-based and time-limited modes)
        if (!imageFile && (!imageUrl || !isValidUrl(imageUrl))) {
            showTemporaryFeedback('Ein Bild (Upload oder URL) ist für alle Fragen erforderlich.', 'warning');
            resetSubmitButton();
            return;
        }

        if (options.length < 2) {
            showTemporaryFeedback('Bitte gib mindestens 2 Antwortmöglichkeiten ein.', 'warning');
            resetSubmitButton();
            return;
        }

        if (!correctAnswer) {
            showTemporaryFeedback('Bitte wähle die richtige Antwort aus.', 'warning');
            resetSubmitButton();
            return;
        }

        if (!options.includes(correctAnswer)) {
            showTemporaryFeedback('Die richtige Antwort muss eine der Antwortmöglichkeiten sein.', 'warning');
            resetSubmitButton();
            return;
        }

        // Create question object
        const questionObj = {
            options: options,
            correctAnswer: correctAnswer
        };

        // Add optional fields
        if (questionText) questionObj.question = questionText;
        if (explanation) questionObj.explanation = explanation;
        if (streetViewUrl && isValidUrl(streetViewUrl)) questionObj.streetViewUrl = streetViewUrl;

        // Handle image (URL takes precedence over file if both are provided)
        if (imageUrl && isValidUrl(imageUrl)) {
            questionObj.image = imageUrl;
        }
        // Prepare form data for submission
        const formData = new FormData();
        formData.append('mode', 'both'); // Automatically add to both quiz modes
        formData.append('category', category);
        formData.append('questionData', JSON.stringify(questionObj));

        // Add unique request ID to prevent duplicate processing
        const requestId = Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        formData.append('requestId', requestId);

        // Add image file if provided and no URL
        if (imageFile && (!imageUrl || !isValidUrl(imageUrl))) {
            formData.append('image', imageFile);
            console.log('Adding image file to form data:', imageFile.name, 'size:', imageFile.size);
        }

        console.log('Submitting question with request ID:', requestId);
        console.log('Form data contents:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value);
        }

        // Send to backend with file upload support - use correct endpoint based on mode
        let endpoint = '/api/add-question';
        let method = 'POST';

        if (editState.isEditing) {
            endpoint = '/api/edit-question';
            method = 'PUT';
            // Add edit-specific data
            formData.append('mode', editState.mode);
            formData.set('category', editState.category); // Override category with edit state
            formData.append('questionIndex', editState.questionIndex.toString());
        }

        const response = await fetch(endpoint, {
            method: method,
            body: formData // Don't set Content-Type header, let browser set it for FormData
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);

            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText || 'Unknown server error' };
            }

            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Question added successfully:', result);

        // Update local data with the returned image path if applicable
        if (result.imagePath) {
            questionObj.image = result.imagePath;
        }

        // Update local quiz data - Handle both editing and adding
        if (editState.isEditing) {
            // EDITING MODE: Server has already updated the data, so refresh from server
            console.log('Edit completed, refreshing data from server...');

            // CRITICAL: Refresh quiz data from server to get the updated data
            await refreshQuizData();
            console.log('Quiz data refreshed from server after edit');

            // Reset edit state
            editState = {
                isEditing: false,
                mode: null,
                category: null,
                questionIndex: null,
                originalQuestion: null
            };

            const imageInfo = result.imagePath ? ' (Bild automatisch organisiert)' : '';
            showTemporaryFeedback(`Frage erfolgreich bearbeitet!${imageInfo}`, 'success');
        } else {
            // ADDING MODE: Add new question
            // Add to unified questions data structure
            if (!quizData.questions) {
                quizData.questions = {};
            }
            if (!quizData.questions[category]) {
                quizData.questions[category] = [];
            }

            // Add question to unified structure
            quizData.questions[category].push(questionObj);

            // Also maintain backward compatibility by adding to existing structures
            let dataSource = mode;
            if (mode === 'time-limited') dataSource = 'image-based';

            if (!quizData[dataSource]) {
                quizData[dataSource] = {};
            }
            if (!quizData[dataSource][category]) {
                quizData[dataSource][category] = [];
            }

            quizData[dataSource][category].push(questionObj);

            const imageInfo = result.imagePath ? ' (Bild automatisch organisiert)' : '';
            showTemporaryFeedback(`Frage erfolgreich zu "${category}" (beide Quiz-Modi) hinzugefügt!${imageInfo}`, 'success');
        }

        // Save to localStorage as backup
        saveQuizDataBackup();

        // Update stats and UI
        updateAdminStats();
        loadQuestionsList(); // Refresh the content management list
        hideAddQuestionModal();

    } catch (error) {
        console.error('Error adding question:', error);
        showTemporaryFeedback(`Fehler beim Hinzufügen der Frage: ${error.message}`, 'error');
    } finally {
        // Always reset the button state
        resetSubmitButton();
    }
}

/** Show question preview */
function showQuestionPreview() {
    if (!adminElements.questionPreview) return;

    const questionText = adminElements.questionTextInput?.value.trim();
    const imageUrl = adminElements.questionImageInput?.value.trim();
    const imageFile = adminElements.questionImageFileInput?.files[0];
    const streetViewUrl = adminElements.questionStreetViewUrlInput?.value.trim();

    const options = [
        adminElements.option1Input?.value.trim(),
        adminElements.option2Input?.value.trim(),
        adminElements.option3Input?.value.trim(),
        adminElements.option4Input?.value.trim()
    ].filter(option => option && option.length > 0);

    const correctAnswer = adminElements.correctAnswerSelect?.value;

    // Build preview
    let previewHTML = '';

    if (questionText) {
        previewHTML += `<div style="margin-bottom: 1rem; font-weight: 600;">${questionText}</div>`;
    }

    // Handle image preview (URL takes precedence over file)
    if (imageUrl && isValidUrl(imageUrl)) {
        previewHTML += `<img src="${imageUrl}" alt="Frage-Bild" class="preview-image">`;
    } else if (imageFile) {
        // For file uploads, use the preview image that's already shown
        const previewImg = adminElements.previewImg;
        if (previewImg && previewImg.src) {
            previewHTML += `<img src="${previewImg.src}" alt="Frage-Bild" class="preview-image">`;
        }
    }

    if (options.length > 0) {
        previewHTML += '<div class="preview-options">';
        options.forEach(option => {
            const isCorrect = option === correctAnswer;
            const className = isCorrect ? 'preview-option correct' : 'preview-option';
            previewHTML += `<div class="${className}">${option}</div>`;
        });
        previewHTML += '</div>';
    }

    // Add Street View URL info if provided
    if (streetViewUrl && isValidUrl(streetViewUrl)) {
        previewHTML += `<div style="margin-top: 1rem; padding: 0.5rem; background: #e8f4fd; border-radius: 4px; font-size: 0.9rem;">
            🌍 Street View verfügbar: Spieler können nach der Antwort die Location besuchen
        </div>`;
    }

    const previewContent = adminElements.questionPreview.querySelector('.preview-content');
    if (previewContent) {
        previewContent.innerHTML = previewHTML;
    }

    adminElements.questionPreview.style.display = 'block';
}

/** Export quiz data */
function exportQuizData() {
    try {
        const dataStr = JSON.stringify(quizData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `terraTueftler-quizData-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        showTemporaryFeedback('Quiz-Daten erfolgreich exportiert!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showTemporaryFeedback('Fehler beim Exportieren der Daten.', 'error');
    }
}

/** Import quiz data */
function importQuizData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // Validate imported data structure
                if (!isValidQuizDataStructure(importedData)) {
                    showTemporaryFeedback('Ungültige Datenstruktur. Bitte überprüfe die JSON-Datei.', 'error');
                    return;
                }

                // Confirm import
                if (confirm('Möchtest du die aktuellen Quiz-Daten durch die importierten Daten ersetzen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
                    // Backup current data
                    saveQuizDataBackup();

                    // Replace data
                    Object.keys(importedData).forEach(mode => {
                        quizData[mode] = importedData[mode];
                    });

                    updateAdminStats();
                    showTemporaryFeedback('Quiz-Daten erfolgreich importiert!', 'success');
                }
            } catch (error) {
                console.error('Import error:', error);
                showTemporaryFeedback('Fehler beim Importieren der Daten. Überprüfe das JSON-Format.', 'error');
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

/** Validate quiz data structure */
function isValidQuizDataStructure(data) {
    if (typeof data !== 'object' || data === null) return false;

    const validModes = ['image-based', 'time-limited'];

    for (const mode in data) {
        if (!validModes.includes(mode)) continue;

        if (typeof data[mode] !== 'object' || data[mode] === null) return false;

        for (const category in data[mode]) {
            if (!Array.isArray(data[mode][category])) return false;

            for (const question of data[mode][category]) {
                if (!question.options || !Array.isArray(question.options) || question.options.length < 2) return false;
                if (!question.correctAnswer || !question.options.includes(question.correctAnswer)) return false;
            }
        }
    }

    return true;
}

/** Save quiz data backup to localStorage */
function saveQuizDataBackup() {
    try {
        const timestamp = new Date().toISOString();
        const backup = {
            timestamp: timestamp,
            data: quizData
        };
        localStorage.setItem('terraTueftlerQuizDataBackup', JSON.stringify(backup));
        console.log('Quiz data backup saved to localStorage');
    } catch (error) {
        console.error('Error saving backup:', error);
    }
}

// ===========================
// Leaderboard Management Functions
// ===========================

/** Setup leaderboard stats modal event listeners */
function setupLeaderboardStatsModalEvents() {
    if (adminElements.closeStatsModal) {
        adminElements.closeStatsModal.addEventListener('click', hideLeaderboardStatsModal);
    }

    if (adminElements.closeStatsBtn) {
        adminElements.closeStatsBtn.addEventListener('click', hideLeaderboardStatsModal);
    }

    // Close modal when clicking outside
    if (adminElements.leaderboardStatsModal) {
        adminElements.leaderboardStatsModal.addEventListener('click', (e) => {
            if (e.target === adminElements.leaderboardStatsModal) {
                hideLeaderboardStatsModal();
            }
        });
    }
}



/** Clear all leaderboard data */
async function clearLeaderboard() {
    if (confirm('Möchtest du ALLE Ranglisten-Daten wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        try {
            await clearAllLeaderboardData();
            updateAdminStats();
            showTemporaryFeedback('Alle Ranglisten-Daten wurden erfolgreich gelöscht!', 'success');
        } catch (error) {
            console.error('Clear error:', error);
            showTemporaryFeedback('Fehler beim Löschen der Ranglisten-Daten.', 'error');
        }
    }
}

/** Show leaderboard statistics modal */
async function showLeaderboardStats() {
    if (!adminElements.leaderboardStatsModal) return;

    try {
        const stats = getLeaderboardStatistics();

        // Update overview stats
        if (adminElements.statsTotalEntries) {
            adminElements.statsTotalEntries.textContent = stats.totalEntries;
        }
        if (adminElements.statsTotalPlayers) {
            adminElements.statsTotalPlayers.textContent = stats.totalPlayers;
        }
        if (adminElements.statsLastUpdated) {
            const lastUpdated = stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString('de-DE') : 'Nie';
            adminElements.statsLastUpdated.textContent = lastUpdated;
        }

        // Update top performers
        if (adminElements.topPerformersList) {
            adminElements.topPerformersList.innerHTML = '';

            if (stats.topPerformers.length === 0) {
                adminElements.topPerformersList.innerHTML = '<p>Keine Leistungen vorhanden</p>';
            } else {
                stats.topPerformers.forEach((performer, index) => {
                    const div = document.createElement('div');
                    div.className = 'performer-item';
                    div.innerHTML = `
                        <span class="rank">${index + 1}.</span>
                        <span class="name">${performer.name}</span>
                        <span class="score">${performer.correctAnswers}/${performer.totalQuestions}</span>
                        <span class="accuracy">${performer.accuracy.toFixed(1)}%</span>
                        <span class="mode">${performer.mode}</span>
                        <span class="category">${performer.category}</span>
                    `;
                    adminElements.topPerformersList.appendChild(div);
                });
            }
        }

        // Update category breakdown
        if (adminElements.categoryStats) {
            adminElements.categoryStats.innerHTML = '';

            Object.keys(stats.categoryStats).forEach(mode => {
                const modeDiv = document.createElement('div');
                modeDiv.className = 'mode-stats';
                modeDiv.innerHTML = `<h5>${getModeDisplayName(mode)}</h5>`;

                Object.keys(stats.categoryStats[mode]).forEach(category => {
                    const count = stats.categoryStats[mode][category];
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'category-stat';
                    categoryDiv.innerHTML = `
                        <span class="category-name">${category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}</span>
                        <span class="category-count">${count} Einträge</span>
                    `;
                    modeDiv.appendChild(categoryDiv);
                });

                adminElements.categoryStats.appendChild(modeDiv);
            });
        }

        adminElements.leaderboardStatsModal.style.display = 'flex';
    } catch (error) {
        console.error('Error showing leaderboard stats:', error);
        showTemporaryFeedback('Fehler beim Laden der Statistiken.', 'error');
    }
}

/** Hide leaderboard statistics modal */
function hideLeaderboardStatsModal() {
    if (adminElements.leaderboardStatsModal) {
        adminElements.leaderboardStatsModal.style.display = 'none';
    }
}

/** Get mode display name */
function getModeDisplayName(modeKey) {
    switch(modeKey) {
        case 'time-limited': return 'Zeitbegrenzt';
        case 'image-based': return 'Bildbasiert';
        default: return modeKey;
    }
}

// ===== DATA MIGRATION FUNCTIONALITY =====

/** Migrate existing data to unified structure and remove duplicates */
async function migrateToUnifiedStructure() {
    console.log('Starting data migration to unified structure...');

    if (!quizData) {
        console.error('Quiz data not available for migration');
        return false;
    }

    // Initialize unified questions structure
    if (!quizData.questions) {
        quizData.questions = {};
    }

    const seenQuestions = new Map(); // Track questions by image+correctAnswer to detect duplicates
    let migratedCount = 0;
    let duplicatesRemoved = 0;

    // Process all existing data sources
    const dataSources = ['image-based', 'time-limited'];

    dataSources.forEach(dataSource => {
        if (quizData[dataSource]) {
            Object.keys(quizData[dataSource]).forEach(category => {
                if (category !== 'all' && Array.isArray(quizData[dataSource][category])) {
                    quizData[dataSource][category].forEach(question => {
                        // Create a unique key for duplicate detection
                        const questionKey = `${question.image || 'no-image'}_${question.correctAnswer}_${category}`;

                        if (!seenQuestions.has(questionKey)) {
                            // First time seeing this question - add to unified structure
                            if (!quizData.questions[category]) {
                                quizData.questions[category] = [];
                            }

                            quizData.questions[category].push(question);
                            seenQuestions.set(questionKey, true);
                            migratedCount++;
                        } else {
                            duplicatesRemoved++;
                        }
                    });
                }
            });
        }
    });

    console.log(`Migration completed: ${migratedCount} questions migrated, ${duplicatesRemoved} duplicates removed`);

    // Save migrated data
    try {
        await saveQuizDataToBackend(quizData);
        saveQuizDataBackup();
        return true;
    } catch (error) {
        console.error('Error saving migrated data:', error);
        return false;
    }
}

/** Check if migration is needed */
function isMigrationNeeded() {
    if (!quizData) return false;

    // If unified structure doesn't exist or is empty, migration is needed
    if (!quizData.questions || Object.keys(quizData.questions).length === 0) {
        // Check if there's data in legacy structures
        const dataSources = ['image-based', 'time-limited'];
        for (const dataSource of dataSources) {
            if (quizData[dataSource] && Object.keys(quizData[dataSource]).length > 0) {
                return true;
            }
        }
    }

    return false;
}

// ===== CONTENT MANAGEMENT FUNCTIONALITY =====

/** Show content management modal */
function showContentManagementModal() {
    if (adminElements.contentManagementModal) {
        adminElements.contentManagementModal.style.display = 'flex';

        // Show categories tab by default
        showCategoriesTab();
        loadCategoriesList();
        loadQuestionsList();

        // Ensure filters are populated
        updateQuestionFilters();
    }
}

/** Hide content management modal */
function hideContentManagementModal() {
    if (adminElements.contentManagementModal) {
        adminElements.contentManagementModal.style.display = 'none';
    }
}

/** Setup content management modal event listeners */
function setupContentManagementModalEvents() {
    if (adminElements.closeContentModal) {
        adminElements.closeContentModal.addEventListener('click', hideContentManagementModal);
    }

    if (adminElements.closeContentBtn) {
        adminElements.closeContentBtn.addEventListener('click', hideContentManagementModal);
    }

    if (adminElements.categoriesTab) {
        adminElements.categoriesTab.addEventListener('click', showCategoriesTab);
    }

    if (adminElements.questionsTab) {
        adminElements.questionsTab.addEventListener('click', showQuestionsTab);
    }

    if (adminElements.filterMode) {
        adminElements.filterMode.addEventListener('change', filterQuestions);
    }

    if (adminElements.filterCategory) {
        adminElements.filterCategory.addEventListener('change', filterQuestions);
    }

    // Close modal when clicking outside
    if (adminElements.contentManagementModal) {
        adminElements.contentManagementModal.addEventListener('click', (e) => {
            if (e.target === adminElements.contentManagementModal) {
                hideContentManagementModal();
            }
        });
    }
}

/** Show categories tab */
function showCategoriesTab() {
    if (adminElements.categoriesTab && adminElements.questionsTab &&
        adminElements.categoriesContent && adminElements.questionsContent) {

        adminElements.categoriesTab.classList.add('active');
        adminElements.questionsTab.classList.remove('active');
        adminElements.categoriesContent.classList.add('active');
        adminElements.questionsContent.classList.remove('active');
    }
}

/** Show questions tab */
function showQuestionsTab() {
    if (adminElements.categoriesTab && adminElements.questionsTab &&
        adminElements.categoriesContent && adminElements.questionsContent) {

        adminElements.questionsTab.classList.add('active');
        adminElements.categoriesTab.classList.remove('active');
        adminElements.questionsContent.classList.add('active');
        adminElements.categoriesContent.classList.remove('active');

        // Update filter options when switching to questions tab
        updateQuestionFilters();
    }
}

/** Load categories list */
function loadCategoriesList() {
    if (!adminElements.categoriesList) return;

    const uniqueCategories = new Set();
    const categoryInfo = {};

    // Collect all unique categories and their info
    Object.keys(quizData).forEach(mode => {
        Object.keys(quizData[mode]).forEach(category => {
            uniqueCategories.add(category);
            if (!categoryInfo[category]) {
                categoryInfo[category] = {
                    modes: [],
                    totalQuestions: 0
                };
            }
            categoryInfo[category].modes.push(mode);
            categoryInfo[category].totalQuestions += quizData[mode][category].length;
        });
    });

    adminElements.categoriesList.innerHTML = '';

    if (uniqueCategories.size === 0) {
        adminElements.categoriesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <p>Keine Kategorien vorhanden</p>
            </div>
        `;
        return;
    }

    Array.from(uniqueCategories).sort().forEach(category => {
        const info = categoryInfo[category];
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'content-item';

        const displayName = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
        const modesText = info.modes.map(mode => getModeDisplayName(mode)).join(', ');

        categoryDiv.innerHTML = `
            <div class="content-item-info">
                <div class="content-item-title">${displayName}</div>
                <div class="content-item-meta">
                    <span>Modi: ${modesText}</span>
                    <span>${info.totalQuestions} Fragen</span>
                </div>
            </div>
            <div class="content-item-actions">
                <button class="btn btn-danger btn-small" onclick="confirmDeleteCategory('${category}')">
                    🗑️ Löschen
                </button>
            </div>
        `;

        adminElements.categoriesList.appendChild(categoryDiv);
    });
}

/** Load questions list */
function loadQuestionsList() {
    if (!adminElements.questionsList) return;

    const allQuestions = [];

    // Collect all questions with metadata
    Object.keys(quizData).forEach(mode => {
        Object.keys(quizData[mode]).forEach(category => {
            quizData[mode][category].forEach((question, index) => {
                allQuestions.push({
                    mode,
                    category,
                    index,
                    question,
                    displayName: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')
                });
            });
        });
    });

    displayQuestions(allQuestions);
}

/** Display questions with current filters */
function displayQuestions(questions) {
    if (!adminElements.questionsList) return;

    adminElements.questionsList.innerHTML = '';

    if (questions.length === 0) {
        adminElements.questionsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❓</div>
                <p>Keine Fragen vorhanden</p>
            </div>
        `;
        return;
    }

    questions.forEach(item => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'content-item';

        const questionText = item.question.question || 'Bildbasierte Frage';
        const hasImage = !!item.question.image;
        const imagePreview = hasImage ?
            `<img src="${item.question.image}" class="question-preview-mini" alt="Vorschau">` : '';

        questionDiv.innerHTML = `
            <div class="content-item-info">
                <div class="content-item-title">
                    ${imagePreview}
                    <span class="question-text-preview">${questionText}</span>
                </div>
                <div class="content-item-meta">
                    <span>Kategorie: ${item.displayName}</span>
                    <span>Modus: ${getModeDisplayName(item.mode)}</span>
                    <span>Antwort: ${item.question.correctAnswer}</span>
                    ${hasImage ? '<span>📷 Mit Bild</span>' : ''}
                </div>
            </div>
            <div class="content-item-actions">
                <button class="btn btn-secondary btn-small" onclick="editQuestion('${item.mode}', '${item.category}', ${item.index})" style="margin-right: 0.5rem;">
                    ✏️ Bearbeiten
                </button>
                <button class="btn btn-danger btn-small" onclick="confirmDeleteQuestion('${item.mode}', '${item.category}', ${item.index})">
                    🗑️ Löschen
                </button>
            </div>
        `;

        adminElements.questionsList.appendChild(questionDiv);
    });
}

/** Update question filters */
function updateQuestionFilters() {
    if (!adminElements.filterMode || !adminElements.filterCategory) return;

    // Update mode filter
    const currentModeFilter = adminElements.filterMode.value;
    adminElements.filterMode.innerHTML = `
        <option value="">Alle Modi</option>
        <option value="image-based">Bildbasiert</option>
        <option value="time-limited">Zeitbegrenzt</option>
    `;
    adminElements.filterMode.value = currentModeFilter;

    // Update category filter
    const uniqueCategories = new Set();
    Object.keys(quizData).forEach(mode => {
        Object.keys(quizData[mode]).forEach(category => {
            uniqueCategories.add(category);
        });
    });

    const currentCategoryFilter = adminElements.filterCategory.value;
    adminElements.filterCategory.innerHTML = '<option value="">Alle Kategorien</option>';

    Array.from(uniqueCategories).sort().forEach(category => {
        const displayName = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
        const option = document.createElement('option');
        option.value = category;
        option.textContent = displayName;
        adminElements.filterCategory.appendChild(option);
    });

    adminElements.filterCategory.value = currentCategoryFilter;
}

/** Filter questions based on selected filters */
function filterQuestions() {
    if (!adminElements.filterMode || !adminElements.filterCategory) return;

    const modeFilter = adminElements.filterMode.value;
    const categoryFilter = adminElements.filterCategory.value;

    const allQuestions = [];

    // Collect all questions with metadata
    Object.keys(quizData).forEach(mode => {
        // Skip the unified questions structure to avoid duplicates
        if (mode === 'questions') return;

        // Apply mode filter
        if (modeFilter && mode !== modeFilter) return;

        if (quizData[mode] && typeof quizData[mode] === 'object') {
            Object.keys(quizData[mode]).forEach(category => {
                // Apply category filter
                if (categoryFilter && category !== categoryFilter) return;

                if (Array.isArray(quizData[mode][category])) {
                    quizData[mode][category].forEach((question, index) => {
                        allQuestions.push({
                            mode,
                            category,
                            index,
                            question,
                            displayName: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')
                        });
                    });
                }
            });
        }
    });

    displayQuestions(allQuestions);
}

// ===== EDIT FUNCTIONALITY =====

// Global variable for edit state
let editState = {
    isEditing: false,
    mode: null,
    category: null,
    questionIndex: null,
    originalQuestion: null
};

/** Edit question */
window.editQuestion = function(mode, category, questionIndex) {
    console.log('=== EDIT QUESTION DEBUG ===');
    console.log('Mode:', mode);
    console.log('Category:', category);
    console.log('Question Index:', questionIndex);
    console.log('Quiz Data Keys:', Object.keys(quizData));

    let question = null;
    let actualMode = mode;

    // Handle unified structure (mode === "questions")
    if (mode === 'questions') {
        if (quizData.questions && quizData.questions[category] && quizData.questions[category][questionIndex]) {
            question = quizData.questions[category][questionIndex];
            // Determine the actual mode based on question content
            if (question.image) {
                actualMode = 'image-based'; // Default for image-based questions
            }
        }
    } else {
        // Handle legacy structure
        if (quizData[mode] && quizData[mode][category] && quizData[mode][category][questionIndex]) {
            question = quizData[mode][category][questionIndex];
        }
    }

    console.log('Found question:', !!question);
    console.log('Actual mode:', actualMode);
    console.log('Question data:', question);

    if (!question) {
        showTemporaryFeedback('Frage nicht gefunden.', 'error');
        console.error('Question not found at path:', mode, category, questionIndex);
        return;
    }

    // Set edit state
    editState = {
        isEditing: true,
        mode: actualMode, // Use the determined actual mode
        category: category,
        questionIndex: questionIndex,
        originalQuestion: { ...question },
        sourceMode: mode // Keep track of where we found the question
    };

    console.log('Edit state set:', editState);

    // Show the modal first
    showAddQuestionModal();

    // Pre-populate the add question modal with existing data after a short delay
    // This ensures the modal is fully rendered before we try to populate it
    setTimeout(() => {
        populateEditForm(question, actualMode, category);
    }, 100);

    // Update modal title and button text
    const modalTitle = document.querySelector('#add-question-modal .modal-header h3');
    if (modalTitle) {
        modalTitle.textContent = 'Frage bearbeiten';
    }

    const submitBtn = adminElements.confirmQuestionBtn; // Fixed: was addQuestionBtn, should be confirmQuestionBtn
    if (submitBtn) {
        submitBtn.textContent = 'Änderungen speichern';
    }
};

/** Populate edit form with existing question data */
function populateEditForm(question, mode, category) {
    console.log('=== POPULATE EDIT FORM DEBUG ===');
    console.log('Question:', question);
    console.log('Mode:', mode);
    console.log('Category:', category);

    // Check if all required elements are available
    console.log('Admin elements check:');
    console.log('questionModeSelect:', !!adminElements.questionModeSelect);
    console.log('questionCategorySelect:', !!adminElements.questionCategorySelect);
    console.log('questionTextInput:', !!adminElements.questionTextInput);
    console.log('option1Input:', !!adminElements.option1Input);
    console.log('correctAnswerSelect:', !!adminElements.correctAnswerSelect);

    // Set mode and category
    if (adminElements.questionModeSelect) {
        adminElements.questionModeSelect.value = mode;
        console.log('Mode set to:', mode);
        updateCategoryDropdown(); // Update categories for selected mode

        // Wait a bit for the dropdown to update, then set the category
        setTimeout(() => {
            if (adminElements.questionCategorySelect) {
                adminElements.questionCategorySelect.value = category;
                console.log('Category set to:', category);
                console.log('Available category options:', Array.from(adminElements.questionCategorySelect.options).map(opt => opt.value));
            }
        }, 200);
    } else {
        console.error('questionModeSelect element not found!');
    }

    // Set question text
    if (adminElements.questionTextInput && question.question) {
        adminElements.questionTextInput.value = question.question;
        console.log('Question text set to:', question.question);
    }

    // Set image URL if exists
    if (adminElements.questionImageInput && question.image) {
        adminElements.questionImageInput.value = question.image;
        console.log('Image URL set to:', question.image);
        // Trigger image preview update
        updateImagePreview();
    }

    // Set options
    if (question.options && Array.isArray(question.options)) {
        const optionInputs = [
            adminElements.option1Input,
            adminElements.option2Input,
            adminElements.option3Input,
            adminElements.option4Input
        ];

        question.options.forEach((option, index) => {
            if (optionInputs[index]) {
                optionInputs[index].value = option;
                console.log(`Option ${index + 1} set to:`, option);
            }
        });

        // Update correct answer dropdown after a delay to ensure options are set
        setTimeout(() => {
            updateCorrectAnswerOptions();

            // Set correct answer after dropdown is updated
            if (adminElements.correctAnswerSelect && question.correctAnswer) {
                adminElements.correctAnswerSelect.value = question.correctAnswer;
                console.log('Correct answer set to:', question.correctAnswer);
            }
        }, 150);
    }

    // Set explanation
    if (adminElements.questionExplanationInput && question.explanation) {
        adminElements.questionExplanationInput.value = question.explanation;
        console.log('Explanation set to:', question.explanation);
    }

    // Set Street View URL
    if (adminElements.questionStreetViewUrlInput && question.streetViewUrl) {
        adminElements.questionStreetViewUrlInput.value = question.streetViewUrl;
        console.log('Street View URL set to:', question.streetViewUrl);
    }

    // Update preview after a delay to ensure all fields are populated
    setTimeout(() => {
        showQuestionPreview();
    }, 200);
}

// ===== DELETION FUNCTIONALITY =====

// Global variables for deletion state
let deletionState = {
    type: null, // 'category' or 'question'
    data: null
};

/** Setup delete confirmation modal event listeners */
function setupDeleteConfirmationModalEvents() {
    if (adminElements.closeDeleteModal) {
        adminElements.closeDeleteModal.addEventListener('click', hideDeleteConfirmationModal);
    }

    if (adminElements.cancelDeleteBtn) {
        adminElements.cancelDeleteBtn.addEventListener('click', hideDeleteConfirmationModal);
    }

    if (adminElements.confirmDeleteBtn) {
        adminElements.confirmDeleteBtn.addEventListener('click', executeDelete);
    }

    // Close modal when clicking outside
    if (adminElements.deleteConfirmationModal) {
        adminElements.deleteConfirmationModal.addEventListener('click', (e) => {
            if (e.target === adminElements.deleteConfirmationModal) {
                hideDeleteConfirmationModal();
            }
        });
    }
}

/** Hide delete confirmation modal */
function hideDeleteConfirmationModal() {
    if (adminElements.deleteConfirmationModal) {
        adminElements.deleteConfirmationModal.style.display = 'none';
        deletionState = { type: null, data: null };
    }
}

/** Confirm delete category */
window.confirmDeleteCategory = function(categoryName) {
    const categoryInfo = getCategoryInfo(categoryName);

    deletionState = {
        type: 'category',
        data: { categoryName }
    };

    if (adminElements.deleteModalTitle) {
        adminElements.deleteModalTitle.textContent = 'Kategorie löschen';
    }

    if (adminElements.deleteModalMessage) {
        adminElements.deleteModalMessage.textContent =
            `Möchtest du die Kategorie "${categoryName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`;
    }

    if (adminElements.deleteModalDetails) {
        const displayName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1).replace(/_/g, ' ');
        adminElements.deleteModalDetails.innerHTML = `
            <h5>Folgende Daten werden gelöscht:</h5>
            <ul>
                <li><strong>Kategorie:</strong> ${displayName}</li>
                <li><strong>Betroffene Modi:</strong> ${categoryInfo.modes.map(mode => getModeDisplayName(mode)).join(', ')}</li>
                <li><strong>Anzahl Fragen:</strong> ${categoryInfo.totalQuestions}</li>
                <li><strong>Bilder:</strong> ${categoryInfo.imageCount} Dateien werden gelöscht</li>
                <li><strong>Ordner:</strong> Kategorie-Ordner wird entfernt (falls leer)</li>
            </ul>
        `;
    }

    if (adminElements.deleteBtnText) {
        adminElements.deleteBtnText.textContent = 'Kategorie löschen';
    }

    if (adminElements.deleteConfirmationModal) {
        adminElements.deleteConfirmationModal.style.display = 'flex';
    }
};

/** Confirm delete question */
window.confirmDeleteQuestion = function(mode, category, questionIndex) {
    const question = quizData[mode] && quizData[mode][category] && quizData[mode][category][questionIndex];

    if (!question) {
        showTemporaryFeedback('Frage nicht gefunden.', 'error');
        return;
    }

    deletionState = {
        type: 'question',
        data: { mode, category, questionIndex }
    };

    if (adminElements.deleteModalTitle) {
        adminElements.deleteModalTitle.textContent = 'Frage löschen';
    }

    const questionText = question.question || 'Bildbasierte Frage';
    if (adminElements.deleteModalMessage) {
        adminElements.deleteModalMessage.textContent =
            `Möchtest du diese Frage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`;
    }

    if (adminElements.deleteModalDetails) {
        const displayCategory = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
        const hasImage = !!question.image;

        adminElements.deleteModalDetails.innerHTML = `
            <h5>Folgende Daten werden gelöscht:</h5>
            <ul>
                <li><strong>Frage:</strong> ${questionText}</li>
                <li><strong>Kategorie:</strong> ${displayCategory}</li>
                <li><strong>Modus:</strong> ${getModeDisplayName(mode)}</li>
                <li><strong>Richtige Antwort:</strong> ${question.correctAnswer}</li>
                ${hasImage ? `<li><strong>Bild:</strong> ${question.image} wird gelöscht</li>` : ''}
            </ul>
        `;
    }

    if (adminElements.deleteBtnText) {
        adminElements.deleteBtnText.textContent = 'Frage löschen';
    }

    if (adminElements.deleteConfirmationModal) {
        adminElements.deleteConfirmationModal.style.display = 'flex';
    }
};

/** Get category information */
function getCategoryInfo(categoryName) {
    const info = {
        modes: [],
        totalQuestions: 0,
        imageCount: 0
    };

    Object.keys(quizData).forEach(mode => {
        if (quizData[mode][categoryName]) {
            info.modes.push(mode);
            const questions = quizData[mode][categoryName];
            info.totalQuestions += questions.length;

            // Count images
            questions.forEach(question => {
                if (question.image && question.image.startsWith('assets/images/')) {
                    info.imageCount++;
                }
            });
        }
    });

    return info;
}

/** Execute deletion */
async function executeDelete() {
    if (!deletionState.type || !deletionState.data) return;

    // Show loading state
    if (adminElements.deleteBtnText) {
        adminElements.deleteBtnText.style.display = 'none';
    }
    if (adminElements.deleteLoading) {
        adminElements.deleteLoading.style.display = 'inline-block';
    }
    if (adminElements.confirmDeleteBtn) {
        adminElements.confirmDeleteBtn.disabled = true;
    }

    try {
        if (deletionState.type === 'category') {
            await handleDeleteCategory(deletionState.data.categoryName);
        } else if (deletionState.type === 'question') {
            await handleDeleteQuestion(
                deletionState.data.mode,
                deletionState.data.category,
                deletionState.data.questionIndex
            );
        }
    } catch (error) {
        console.error('Deletion error:', error);
        showTemporaryFeedback(`Fehler beim Löschen: ${error.message}`, 'error');
    } finally {
        // Reset loading state
        if (adminElements.deleteBtnText) {
            adminElements.deleteBtnText.style.display = 'inline';
        }
        if (adminElements.deleteLoading) {
            adminElements.deleteLoading.style.display = 'none';
        }
        if (adminElements.confirmDeleteBtn) {
            adminElements.confirmDeleteBtn.disabled = false;
        }

        hideDeleteConfirmationModal();
    }
}

/** Handle delete category */
async function handleDeleteCategory(categoryName) {
    try {
        // Call backend API
        const result = await deleteCategoryFromBackend(categoryName);

        // Update local data - BOTH legacy and unified structures
        Object.keys(quizData).forEach(mode => {
            if (quizData[mode][categoryName]) {
                delete quizData[mode][categoryName];
            }
        });

        // CRITICAL FIX: Also delete from unified structure
        if (quizData.questions && quizData.questions[categoryName]) {
            delete quizData.questions[categoryName];
            console.log(`Removed category "${categoryName}" from unified structure`);
        }

        // Save backup
        saveQuizDataBackup();

        // CRITICAL FIX: Refresh quiz data to ensure synchronization
        await refreshQuizData();

        // Update UI
        updateAdminStats();
        loadCategoriesList();
        loadQuestionsList();
        updateQuestionFilters();

        const deletedInfo = result.deletedQuestions > 0 ?
            ` (${result.deletedQuestions} Fragen, ${result.deletedImages.length} Bilder gelöscht)` : '';

        showTemporaryFeedback(
            `Kategorie "${categoryName}" erfolgreich gelöscht!${deletedInfo}`,
            'success'
        );

    } catch (error) {
        console.error('Error deleting category:', error);
        throw new Error(`Kategorie konnte nicht gelöscht werden: ${error.message}`);
    }
}

/** Handle delete question */
async function handleDeleteQuestion(mode, category, questionIndex) {
    try {
        console.log('=== DELETE QUESTION DEBUG ===');
        console.log('Mode:', mode);
        console.log('Category:', category);
        console.log('Question Index:', questionIndex);

        // Get the question data before deletion for verification
        let dataSource = mode;
        if (mode === 'time-limited') dataSource = 'image-based';

        const questionToDelete = quizData[dataSource] && quizData[dataSource][category] && quizData[dataSource][category][questionIndex];
        console.log('Question to delete:', questionToDelete);

        if (!questionToDelete) {
            throw new Error('Frage nicht gefunden');
        }

        // Call backend API
        const result = await deleteQuestionFromBackend(mode, category, questionIndex);
        console.log('Backend deletion result:', result);

        // CRITICAL FIX: Refresh quiz data from server to get the updated data
        // This ensures we have the latest data after server-side deletion
        await refreshQuizData();
        console.log('Quiz data refreshed from server');

        // Update UI
        updateAdminStats();
        loadQuestionsList();

        const imageInfo = result.deletedImagePath ? ' (Bild gelöscht)' : '';
        showTemporaryFeedback(
            `Frage erfolgreich gelöscht!${imageInfo}`,
            'success'
        );

    } catch (error) {
        console.error('Error deleting question:', error);
        throw new Error(`Frage konnte nicht gelöscht werden: ${error.message}`);
    }
}
