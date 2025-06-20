// API utility functions for communicating with the backend

// Get the base API URL (adjust for development vs production)
const API_BASE_URL = window.location.origin + '/api';

/**
 * Generic API request function
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - API response
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Save quiz data to the backend
 * @param {object} quizData - Complete quiz data object
 * @returns {Promise<boolean>} - Success status
 */
export async function saveQuizDataToBackend(quizData) {
    try {
        const response = await apiRequest('/quiz-data', {
            method: 'POST',
            body: JSON.stringify(quizData),
        });
        
        console.log('Quiz data saved to backend:', response.message);
        return true;
    } catch (error) {
        console.error('Failed to save quiz data to backend:', error);
        return false;
    }
}

/**
 * Save leaderboard data to the backend
 * @param {object} leaderboardData - Complete leaderboard data object
 * @returns {Promise<boolean>} - Success status
 */
export async function saveLeaderboardDataToBackend(leaderboardData) {
    try {
        const response = await apiRequest('/leaderboard-data', {
            method: 'POST',
            body: JSON.stringify(leaderboardData),
        });
        
        console.log('Leaderboard data saved to backend:', response.message);
        return true;
    } catch (error) {
        console.error('Failed to save leaderboard data to backend:', error);
        return false;
    }
}

/**
 * Add a new category via the backend API
 * @param {string} categoryName - Name of the category
 * @param {string[]} modes - Array of quiz modes for this category
 * @returns {Promise<boolean>} - Success status
 */
export async function addCategoryToBackend(categoryName, modes) {
    try {
        const response = await apiRequest('/add-category', {
            method: 'POST',
            body: JSON.stringify({ categoryName, modes }),
        });
        
        console.log('Category added to backend:', response.message);
        return true;
    } catch (error) {
        console.error('Failed to add category to backend:', error);
        return false;
    }
}

/**
 * Add a new question via the backend API
 * @param {string} mode - Quiz mode
 * @param {string} category - Category name
 * @param {object} questionData - Question data object
 * @returns {Promise<boolean>} - Success status
 */
export async function addQuestionToBackend(mode, category, questionData) {
    try {
        const response = await apiRequest('/add-question', {
            method: 'POST',
            body: JSON.stringify({ mode, category, questionData }),
        });
        
        console.log('Question added to backend:', response.message);
        return true;
    } catch (error) {
        console.error('Failed to add question to backend:', error);
        return false;
    }
}

/**
 * Load quiz data from the backend (fallback if direct file loading fails)
 * @returns {Promise<object>} - Quiz data object
 */
export async function loadQuizDataFromBackend() {
    try {
        const quizData = await apiRequest('/quiz-data');
        console.log('Quiz data loaded from backend');
        return quizData;
    } catch (error) {
        console.error('Failed to load quiz data from backend:', error);
        return {};
    }
}

/**
 * Load leaderboard data from the backend (fallback if direct file loading fails)
 * @returns {Promise<object>} - Leaderboard data object
 */
export async function loadLeaderboardDataFromBackend() {
    try {
        const leaderboardData = await apiRequest('/leaderboard-data');
        console.log('Leaderboard data loaded from backend');
        return leaderboardData;
    } catch (error) {
        console.error('Failed to load leaderboard data from backend:', error);
        return {
            "multiple-choice": {},
            "image-based": {},
            "time-limited": {},
            "_metadata": {
                "version": "1.0",
                "lastUpdated": new Date().toISOString(),
                "totalEntries": 0,
                "description": "TerraTüftler Leaderboard Data - Individual session tracking"
            }
        };
    }
}

/**
 * Edit/Update a question via the backend API
 * @param {string} mode - Quiz mode
 * @param {string} category - Category name
 * @param {number} questionIndex - Index of question to edit
 * @param {object} questionData - Updated question data object
 * @returns {Promise<object>} - Edit result
 */
export async function editQuestionFromBackend(mode, category, questionIndex, questionData) {
    try {
        const response = await apiRequest('/edit-question', {
            method: 'PUT',
            body: JSON.stringify({ mode, category, questionIndex, questionData }),
        });

        console.log('Question edited from backend:', response.message);
        return response;
    } catch (error) {
        console.error('Failed to edit question from backend:', error);
        throw error;
    }
}

/**
 * Delete a question via the backend API
 * @param {string} mode - Quiz mode
 * @param {string} category - Category name
 * @param {number} questionIndex - Index of question to delete
 * @returns {Promise<object>} - Deletion result
 */
export async function deleteQuestionFromBackend(mode, category, questionIndex) {
    try {
        const response = await apiRequest('/delete-question', {
            method: 'DELETE',
            body: JSON.stringify({ mode, category, questionIndex }),
        });

        console.log('Question deleted from backend:', response.message);
        return response;
    } catch (error) {
        console.error('Failed to delete question from backend:', error);
        throw error;
    }
}

/**
 * Delete a category via the backend API
 * @param {string} categoryName - Name of the category to delete
 * @returns {Promise<object>} - Deletion result
 */
export async function deleteCategoryFromBackend(categoryName) {
    try {
        const response = await apiRequest('/delete-category', {
            method: 'DELETE',
            body: JSON.stringify({ categoryName }),
        });

        console.log('Category deleted from backend:', response.message);
        return response;
    } catch (error) {
        console.error('Failed to delete category from backend:', error);
        throw error;
    }
}

/**
 * Check if the backend API is available
 * @returns {Promise<boolean>} - API availability status
 */
export async function checkBackendAvailability() {
    try {
        await apiRequest('/quiz-data');
        return true;
    } catch (error) {
        console.warn('Backend API not available, falling back to static file loading');
        return false;
    }
}
