// Leaderboard data management module
let leaderboardData = {};

// Import API functions
import { checkBackendAvailability, loadLeaderboardDataFromBackend, saveLeaderboardDataToBackend } from './api.js';

/** Load leaderboard data from JSON file */
async function loadLeaderboardData() {
    try {
        // First try to load from backend API
        const backendAvailable = await checkBackendAvailability();
        if (backendAvailable) {
            try {
                leaderboardData = await loadLeaderboardDataFromBackend();
                console.log('Leaderboard data loaded from backend API');
                return;
            } catch (apiError) {
                console.warn('Backend API failed for leaderboard, falling back to static files:', apiError);
            }
        }

        // Fallback to static file loading
        const response = await fetch('/data/leaderboardData.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('Leaderboard response is not JSON, content-type:', contentType);
            const text = await response.text();
            console.error('Response text:', text.substring(0, 200));
            throw new Error('Invalid JSON response for leaderboard data');
        }

        leaderboardData = await response.json();
        console.log('Leaderboard data loaded from static file');

        // Migrate localStorage data on first load
        await migrateLocalStorageData();

        return leaderboardData;
    } catch (error) {
        console.error('Failed to load leaderboard data:', error);
        // Initialize with empty structure if file doesn't exist
        leaderboardData = initializeEmptyLeaderboardData();
        return leaderboardData;
    }
}

/** Initialize empty leaderboard data structure */
function initializeEmptyLeaderboardData() {
    return {
        "image-based": {
            "all": [],
            "landschaft": [],
            "städte_erkennen": [],
            "wahrzeichen": [],
            "geographie_extrem": [],
            "architecture": [],
            "straßenschilder": []
        },
        "time-limited": {
            "all": { "0.1": [], "0.5": [], "1": [], "2": [], "3": [] },
            "landschaft": { "0.1": [], "0.5": [], "1": [], "2": [], "3": [] },
            "städte_erkennen": { "0.1": [], "0.5": [], "1": [], "2": [], "3": [] },
            "wahrzeichen": { "0.1": [], "0.5": [], "1": [], "2": [], "3": [] },
            "geographie_extrem": { "0.1": [], "0.5": [], "1": [], "2": [], "3": [] }
        },
        "_metadata": {
            "version": "1.0",
            "lastUpdated": new Date().toISOString(),
            "totalEntries": 0,
            "description": "TerraTüftler Leaderboard Data - Individual session tracking"
        }
    };
}

/** Get leaderboard storage key for localStorage */
function getLeaderboardStorageKey(mode, category, timeLimit = null) {
    let key = `terraTueftlerLeaderboard_${mode || 'default'}_${category || 'all'}`;
    if (mode === 'time-limited' && timeLimit) {
        key += `_${timeLimit}s`;
    }
    return key;
}

/** Migrate existing localStorage leaderboard data to persistent storage */
async function migrateLocalStorageData() {
    console.log('Checking for localStorage leaderboard data to migrate...');
    
    let migrationCount = 0;
    const modes = ['image-based', 'time-limited'];
    
    for (const mode of modes) {
        if (!leaderboardData[mode]) continue;
        
        for (const category in leaderboardData[mode]) {
            if (mode === 'time-limited') {
                // Handle time-limited structure with time limits
                for (const timeLimit in leaderboardData[mode][category]) {
                    const storageKey = getLeaderboardStorageKey(mode, category, parseFloat(timeLimit));
                    const localData = getLocalStorageLeaderboard(storageKey);
                    
                    if (localData && localData.length > 0) {
                        // Merge with existing data, avoiding duplicates
                        const existingData = leaderboardData[mode][category][timeLimit] || [];
                        const mergedData = mergeLeaderboardData(existingData, localData);
                        leaderboardData[mode][category][timeLimit] = mergedData;
                        migrationCount += localData.length;
                    }
                }
            } else {
                // Handle regular mode structure
                const storageKey = getLeaderboardStorageKey(mode, category);
                const localData = getLocalStorageLeaderboard(storageKey);
                
                if (localData && localData.length > 0) {
                    // Merge with existing data, avoiding duplicates
                    const existingData = leaderboardData[mode][category] || [];
                    const mergedData = mergeLeaderboardData(existingData, localData);
                    leaderboardData[mode][category] = mergedData;
                    migrationCount += localData.length;
                }
            }
        }
    }
    
    if (migrationCount > 0) {
        console.log(`Migrated ${migrationCount} leaderboard entries from localStorage`);
        await saveLeaderboardData();
    }
}

/** Get leaderboard data from localStorage */
function getLocalStorageLeaderboard(storageKey) {
    try {
        const data = localStorage.getItem(storageKey);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading localStorage leaderboard:', error);
        return [];
    }
}

/** Merge leaderboard data arrays, avoiding duplicates */
function mergeLeaderboardData(existingData, newData) {
    const merged = [...existingData];
    
    newData.forEach(newEntry => {
        // Check for duplicates based on name, score, timestamp, and category
        const isDuplicate = merged.some(existing => 
            existing.name === newEntry.name &&
            existing.correctAnswers === newEntry.correctAnswers &&
            existing.totalQuestions === newEntry.totalQuestions &&
            Math.abs(new Date(existing.completedAt || existing.lastPlayed) - new Date(newEntry.completedAt || newEntry.lastPlayed)) < 1000
        );
        
        if (!isDuplicate) {
            // Normalize entry format
            const normalizedEntry = {
                name: newEntry.name,
                correctAnswers: newEntry.correctAnswers,
                totalQuestions: newEntry.totalQuestions,
                maxStreak: newEntry.maxStreak || 0,
                completedAt: newEntry.completedAt || newEntry.lastPlayed || new Date().toISOString(),
                mode: newEntry.mode,
                category: newEntry.category,
                timeLimit: newEntry.timeLimit
            };
            merged.push(normalizedEntry);
        }
    });
    
    // Sort by score (correct answers) descending, then by completion time
    merged.sort((a, b) => {
        if (b.correctAnswers !== a.correctAnswers) {
            return b.correctAnswers - a.correctAnswers;
        }
        
        const accuracyA = a.totalQuestions > 0 ? a.correctAnswers / a.totalQuestions : 0;
        const accuracyB = b.totalQuestions > 0 ? b.correctAnswers / b.totalQuestions : 0;
        if (accuracyB !== accuracyA) {
            return accuracyB - accuracyA;
        }
        
        return new Date(b.completedAt || b.lastPlayed) - new Date(a.completedAt || a.lastPlayed);
    });
    
    // Keep only top 50 entries
    return merged.slice(0, 50);
}

/** Get leaderboard entries for a specific mode, category, and time limit */
export function getLeaderboard(mode, category = 'all', timeLimit = null) {
    if (!leaderboardData[mode]) {
        return [];
    }
    
    if (mode === 'time-limited') {
        if (!leaderboardData[mode][category] || !leaderboardData[mode][category][timeLimit]) {
            return [];
        }
        return leaderboardData[mode][category][timeLimit] || [];
    } else {
        return leaderboardData[mode][category] || [];
    }
}

/** Save a new leaderboard entry */
export async function saveLeaderboardEntry(name, correctAnswers, mode, category, totalQuestions, maxStreak, timeLimit = null) {
    if (!name || !mode || !category || correctAnswers < 0) return false;
    
    const playerName = name || 'Anonym';
    
    // Create new session entry
    const sessionEntry = {
        name: playerName,
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions,
        maxStreak: maxStreak,
        completedAt: new Date().toISOString(),
        mode: mode,
        category: category,
        timeLimit: timeLimit
    };
    
    // Get current leaderboard
    const currentLeaderboard = getLeaderboard(mode, category, timeLimit);
    
    // Add new entry
    currentLeaderboard.push(sessionEntry);
    
    // Sort and limit entries
    const sortedLeaderboard = mergeLeaderboardData([], currentLeaderboard);
    
    // Update persistent data
    if (mode === 'time-limited') {
        if (!leaderboardData[mode][category]) {
            leaderboardData[mode][category] = {};
        }
        leaderboardData[mode][category][timeLimit] = sortedLeaderboard;
    } else {
        if (!leaderboardData[mode]) {
            leaderboardData[mode] = {};
        }
        leaderboardData[mode][category] = sortedLeaderboard;
    }
    
    // Update metadata
    updateMetadata();
    
    // Save to persistent storage
    await saveLeaderboardData();
    
    // Also save to localStorage as backup
    saveToLocalStorage(mode, category, timeLimit, sortedLeaderboard);
    
    return true;
}

/** Update metadata */
function updateMetadata() {
    let totalEntries = 0;
    
    // Count all entries
    Object.keys(leaderboardData).forEach(mode => {
        if (mode === '_metadata') return;
        
        if (mode === 'time-limited') {
            Object.keys(leaderboardData[mode]).forEach(category => {
                Object.keys(leaderboardData[mode][category]).forEach(timeLimit => {
                    totalEntries += leaderboardData[mode][category][timeLimit].length;
                });
            });
        } else {
            Object.keys(leaderboardData[mode]).forEach(category => {
                totalEntries += leaderboardData[mode][category].length;
            });
        }
    });
    
    leaderboardData._metadata = {
        ...leaderboardData._metadata,
        lastUpdated: new Date().toISOString(),
        totalEntries: totalEntries
    };
}

/** Save to localStorage as backup */
function saveToLocalStorage(mode, category, timeLimit, data) {
    try {
        const storageKey = getLeaderboardStorageKey(mode, category, timeLimit);
        localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

/** Save leaderboard data to persistent storage */
async function saveLeaderboardData() {
    try {
        // First try to save to backend API
        const backendAvailable = await checkBackendAvailability();
        if (backendAvailable) {
            const success = await saveLeaderboardDataToBackend(leaderboardData);
            if (success) {
                console.log('Leaderboard data saved to backend');
                return true;
            }
        }

        // Fallback to localStorage for persistence simulation
        const dataStr = JSON.stringify(leaderboardData, null, 2);
        localStorage.setItem('terraTueftlerLeaderboardPersistent', dataStr);
        console.log('Leaderboard data saved to localStorage (fallback)');
        return true;
    } catch (error) {
        console.error('Error saving leaderboard data:', error);
        return false;
    }
}

/** Initialize leaderboard data system */
export async function initializeLeaderboardData() {
    // Try to load from persistent storage first
    try {
        const persistentData = localStorage.getItem('terraTueftlerLeaderboardPersistent');
        if (persistentData) {
            leaderboardData = JSON.parse(persistentData);
            console.log('Loaded leaderboard data from persistent storage');
        } else {
            await loadLeaderboardData();
        }
    } catch (error) {
        console.error('Error loading persistent leaderboard data:', error);
        await loadLeaderboardData();
    }
    
    return leaderboardData;
}





/** Clear all leaderboard data */
export async function clearAllLeaderboardData() {
    // Backup current data
    const backup = JSON.parse(JSON.stringify(leaderboardData));
    localStorage.setItem('terraTueftlerLeaderboardBackup', JSON.stringify({
        timestamp: new Date().toISOString(),
        data: backup
    }));
    
    // Initialize empty data
    leaderboardData = initializeEmptyLeaderboardData();
    
    // Clear localStorage entries
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('terraTueftlerLeaderboard_')) {
            localStorage.removeItem(key);
        }
    });
    
    await saveLeaderboardData();
    return true;
}

/** Get leaderboard statistics */
export function getLeaderboardStatistics() {
    let totalEntries = 0;
    let totalPlayers = new Set();
    let topPerformers = [];
    let categoryStats = {};
    
    Object.keys(leaderboardData).forEach(mode => {
        if (mode === '_metadata') return;
        
        categoryStats[mode] = {};
        
        if (mode === 'time-limited') {
            Object.keys(leaderboardData[mode]).forEach(category => {
                categoryStats[mode][category] = 0;
                Object.keys(leaderboardData[mode][category]).forEach(timeLimit => {
                    const entries = leaderboardData[mode][category][timeLimit];
                    totalEntries += entries.length;
                    categoryStats[mode][category] += entries.length;
                    
                    entries.forEach(entry => {
                        totalPlayers.add(entry.name);
                        topPerformers.push({
                            ...entry,
                            accuracy: entry.totalQuestions > 0 ? (entry.correctAnswers / entry.totalQuestions) * 100 : 0
                        });
                    });
                });
            });
        } else {
            Object.keys(leaderboardData[mode]).forEach(category => {
                const entries = leaderboardData[mode][category];
                totalEntries += entries.length;
                categoryStats[mode][category] = entries.length;
                
                entries.forEach(entry => {
                    totalPlayers.add(entry.name);
                    topPerformers.push({
                        ...entry,
                        accuracy: entry.totalQuestions > 0 ? (entry.correctAnswers / entry.totalQuestions) * 100 : 0
                    });
                });
            });
        }
    });
    
    // Sort top performers
    topPerformers.sort((a, b) => {
        if (b.correctAnswers !== a.correctAnswers) {
            return b.correctAnswers - a.correctAnswers;
        }
        return b.accuracy - a.accuracy;
    });
    
    return {
        totalEntries,
        totalPlayers: totalPlayers.size,
        topPerformers: topPerformers.slice(0, 10),
        categoryStats,
        lastUpdated: leaderboardData._metadata?.lastUpdated
    };
}

/** Clear specific leaderboard category */
export async function clearLeaderboardCategory(mode, category = 'all', timeLimit = null) {
    if (!leaderboardData[mode]) return;

    if (mode === 'time-limited' && timeLimit !== null) {
        const timeLimitStr = String(timeLimit);
        if (leaderboardData[mode][category] && leaderboardData[mode][category][timeLimitStr]) {
            leaderboardData[mode][category][timeLimitStr] = [];
        }
    } else {
        if (leaderboardData[mode][category]) {
            leaderboardData[mode][category] = [];
        }
    }

    // Update metadata and save
    updateMetadata();
    await saveLeaderboardData();
}

// Export the leaderboard data object for external access
export { leaderboardData };
