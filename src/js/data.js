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
        // First try to load from backend API (only if we're in development or have a backend)
        const backendAvailable = await checkBackendAvailability();
        if (backendAvailable) {
            try {
                quizData = await loadQuizDataFromBackend();
                console.log('Quiz data loaded from backend API');
                return;
            } catch (apiError) {
                console.warn('Backend API failed, falling back to static files:', apiError);
            }
        }

        // Fallback to static file loading
        const response = await fetch('/data/quizData.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('Response is not JSON, content-type:', contentType);
            const text = await response.text();
            console.error('Response text:', text.substring(0, 200));
            throw new Error('Invalid JSON response');
        }

        quizData = await response.json();
        console.log('Quiz data loaded from static file');
    } catch (error) {
        console.error('Failed to load quiz data:', error);
        // Provide fallback empty data structure
        quizData = {
            "time-limited": {},
            "image-based": {},
            "all": []
        };
        console.warn('Using fallback empty quiz data structure');
    }
}

// Load learning data
async function loadLearningData() {
    try {
        const response = await fetch('/data/learningData.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('Learning data response is not JSON, content-type:', contentType);
            const text = await response.text();
            console.error('Response text:', text.substring(0, 200));
            throw new Error('Invalid JSON response for learning data');
        }

        learningData = await response.json();
        console.log('Learning data loaded successfully');
    } catch (error) {
        console.error('Failed to load learning data:', error);
        // Provide fallback empty data structure
        learningData = {};
        console.warn('Using fallback empty learning data structure');
    }
}

// Initialize data loading
export async function initializeData() {
    await Promise.all([loadQuizData(), loadLearningData(), initializeLeaderboardData()]);
    console.log('Data initialization completed. Quiz data keys:', Object.keys(quizData));
    console.log('Quiz data structure check:', {
        hasTimeLimit: !!quizData['time-limited'],
        hasImageBased: !!quizData['image-based'],
        hasAll: !!quizData['all'],
        totalKeys: Object.keys(quizData).length
    });
    return { quizData, learningData };
}

// Getter functions to ensure data is always accessible
export function getQuizData() {
    return quizData;
}

export function getLearningData() {
    return learningData;
}

// Check if quiz data is loaded and valid
export function isQuizDataLoaded() {
    return quizData && Object.keys(quizData).length > 0 &&
           (quizData['time-limited'] || quizData['image-based'] || quizData.questions);
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