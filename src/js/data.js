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

        // Fallback to static file loading with multiple URL attempts
        const fallbackUrls = [
            '/data/quizData.json',
            './data/quizData.json',
            '../data/quizData.json'
        ];

        let lastError = null;
        for (const url of fallbackUrls) {
            try {
                console.log(`🔄 Attempting to load quiz data from: ${url}`);
                const response = await fetch(url);

                if (!response.ok) {
                    lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                    console.warn(`⚠️ Failed to load from ${url}: ${lastError.message}`);
                    continue;
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    lastError = new Error(`Invalid content type: ${contentType}`);
                    console.warn(`⚠️ Invalid content type from ${url}: ${contentType}`);
                    continue;
                }

                quizData = await response.json();
                console.log(`✅ Quiz data loaded successfully from: ${url}`);
                return; // Exit function on success

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Error loading from ${url}:`, error.message);
            }
        }

        // If all fallbacks failed, throw the last error
        throw lastError || new Error('All fallback URLs failed');
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
        // Try multiple fallback locations for learning data
        const fallbackUrls = [
            '/data/learningData.json',
            './data/learningData.json',
            '../data/learningData.json'
        ];

        let lastError = null;
        for (const url of fallbackUrls) {
            try {
                console.log(`🔄 Attempting to load learning data from: ${url}`);
                const response = await fetch(url);

                if (!response.ok) {
                    lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                    console.warn(`⚠️ Failed to load learning data from ${url}: ${lastError.message}`);
                    continue;
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    lastError = new Error(`Invalid content type: ${contentType}`);
                    console.warn(`⚠️ Invalid content type for learning data from ${url}: ${contentType}`);
                    continue;
                }

                learningData = await response.json();
                console.log(`✅ Learning data loaded successfully from: ${url}`);
                return; // Exit function on success

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Error loading learning data from ${url}:`, error.message);
            }
        }

        // If all fallbacks failed, throw the last error
        throw lastError || new Error('All learning data fallback URLs failed');
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