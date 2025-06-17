// Import data from JSON files using fetch (more compatible)
let quizData = {};
let learningData = {};

// Import leaderboard data management
import { initializeLeaderboardData } from './leaderboardData.js';

// Import API functions
import { checkBackendAvailability, loadQuizDataFromBackend } from './api.js';

// Load quiz data
async function loadQuizData() {
    try {
        // First try to load from backend API
        const backendAvailable = await checkBackendAvailability();
        if (backendAvailable) {
            quizData = await loadQuizDataFromBackend();
            console.log('Quiz data loaded from backend API');
            return;
        }

        // Fallback to static file loading
        const response = await fetch('./data/quizData.json');
        quizData = await response.json();
        console.log('Quiz data loaded from static file');
    } catch (error) {
        console.error('Failed to load quiz data:', error);
    }
}

// Load learning data
async function loadLearningData() {
    try {
        const response = await fetch('./data/learningData.json');
        learningData = await response.json();
        console.log('Learning data loaded successfully');
    } catch (error) {
        console.error('Failed to load learning data:', error);
    }
}

// Initialize data loading
export async function initializeData() {
    await Promise.all([loadQuizData(), loadLearningData(), initializeLeaderboardData()]);
    return { quizData, learningData };
}

// Refresh quiz data (for admin changes)
export async function refreshQuizData() {
    console.log('🔄 Refreshing quiz data after admin changes...');
    await loadQuizData();
    console.log('✅ Quiz data refreshed successfully');
    return quizData;
}

// Export the data objects
export { quizData, learningData };

// // NOTE: You need to create the referenced image files in assets/images/learn/ etc. // This comment is no longer relevant here 