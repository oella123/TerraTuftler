import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('src')); // Serve source files directly for development
app.use('/assets', express.static('src/assets')); // Serve assets from src directory

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Data file paths
const DATA_DIR = join(__dirname, 'src', 'data');
const QUIZ_DATA_FILE = join(DATA_DIR, 'quizData.json');
const LEADERBOARD_DATA_FILE = join(DATA_DIR, 'leaderboardData.json');
const IMAGES_DIR = join(__dirname, 'src', 'assets', 'images');

// Utility function to ensure data directory exists
async function ensureDataDirectory() {
    try {
        await fs.access(DATA_DIR);
    } catch (error) {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Utility function to read JSON file safely
async function readJSONFile(filePath, defaultData = {}) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log(`File ${filePath} not found or invalid, using default data`);
        return defaultData;
    }
}

// Utility function to write JSON file safely
async function writeJSONFile(filePath, data) {
    await ensureDataDirectory();
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf8');
}

// Utility function to ensure images directory exists
async function ensureImagesDirectory(categoryPath) {
    try {
        await fs.access(categoryPath);
    } catch (error) {
        await fs.mkdir(categoryPath, { recursive: true });
        console.log(`Created directory: ${categoryPath}`);
    }
}

// Utility function to generate category folder name
function getCategoryFolderName(categoryName) {
    // Convert category name to proper folder name
    // Examples: "bollards" -> "Bollards", "google_cars" -> "Google Cars"
    return categoryName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Utility function to generate unique filename
function generateImageFilename(category, originalName, countryCode = null) {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(4).toString('hex');
    const extension = originalName.split('.').pop().toLowerCase();

    if (countryCode) {
        // Format: categoryCountryCode.extension (e.g., bollardGER.jpg)
        return `${category.toLowerCase()}${countryCode.toUpperCase()}.${extension}`;
    } else {
        // Format: category_timestamp_randomId.extension
        return `${category.toLowerCase()}_${timestamp}_${randomId}.${extension}`;
    }
}

// Track processed request IDs to prevent duplicates
const processedRequests = new Set();

// Clean up old request IDs every hour
setInterval(() => {
    processedRequests.clear();
    console.log('Cleared processed request IDs cache');
}, 60 * 60 * 1000);

// Configure multer for image uploads
const storage = multer.memoryStorage(); // Store in memory for processing
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// API Routes

// Upload image endpoint
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const { category, countryCode } = req.body;

        if (!category) {
            return res.status(400).json({ error: 'Category is required' });
        }

        // Generate category folder name
        const categoryFolderName = getCategoryFolderName(category);
        const categoryPath = join(IMAGES_DIR, categoryFolderName);

        // Ensure category directory exists
        await ensureImagesDirectory(categoryPath);

        // Generate filename
        const filename = generateImageFilename(category, req.file.originalname, countryCode);
        const filePath = join(categoryPath, filename);

        // Save the file
        await fs.writeFile(filePath, req.file.buffer);

        // Generate the relative path for the quiz data
        const relativePath = `assets/images/${categoryFolderName}/${filename}`;

        console.log(`Image uploaded successfully: ${relativePath}`);

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            imagePath: relativePath,
            filename: filename
        });

    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Get quiz data
app.get('/api/quiz-data', async (req, res) => {
    try {
        const quizData = await readJSONFile(QUIZ_DATA_FILE, {});
        console.log('Quiz data loaded, keys:', Object.keys(quizData));
        res.json(quizData);
    } catch (error) {
        console.error('Error reading quiz data:', error);
        res.status(500).json({ error: 'Failed to read quiz data' });
    }
});

// Save quiz data
app.post('/api/quiz-data', async (req, res) => {
    try {
        const quizData = req.body;
        
        // Basic validation
        if (!quizData || typeof quizData !== 'object') {
            return res.status(400).json({ error: 'Invalid quiz data format' });
        }
        
        await writeJSONFile(QUIZ_DATA_FILE, quizData);
        console.log('Quiz data saved successfully');
        res.json({ success: true, message: 'Quiz data saved successfully' });
    } catch (error) {
        console.error('Error saving quiz data:', error);
        res.status(500).json({ error: 'Failed to save quiz data' });
    }
});

// Get leaderboard data
app.get('/api/leaderboard-data', async (req, res) => {
    try {
        const defaultLeaderboardData = {
            "image-based": {},
            "time-limited": {},
            "_metadata": {
                "version": "1.0",
                "lastUpdated": new Date().toISOString(),
                "totalEntries": 0,
                "description": "TerraTüftler Leaderboard Data - Individual session tracking"
            }
        };
        
        const leaderboardData = await readJSONFile(LEADERBOARD_DATA_FILE, defaultLeaderboardData);
        res.json(leaderboardData);
    } catch (error) {
        console.error('Error reading leaderboard data:', error);
        res.status(500).json({ error: 'Failed to read leaderboard data' });
    }
});

// Save leaderboard data
app.post('/api/leaderboard-data', async (req, res) => {
    try {
        const leaderboardData = req.body;
        
        // Basic validation
        if (!leaderboardData || typeof leaderboardData !== 'object') {
            return res.status(400).json({ error: 'Invalid leaderboard data format' });
        }
        
        // Update metadata
        if (!leaderboardData._metadata) {
            leaderboardData._metadata = {};
        }
        leaderboardData._metadata.lastUpdated = new Date().toISOString();
        
        await writeJSONFile(LEADERBOARD_DATA_FILE, leaderboardData);
        console.log('Leaderboard data saved successfully');
        res.json({ success: true, message: 'Leaderboard data saved successfully' });
    } catch (error) {
        console.error('Error saving leaderboard data:', error);
        res.status(500).json({ error: 'Failed to save leaderboard data' });
    }
});

// Add new category endpoint
app.post('/api/add-category', async (req, res) => {
    try {
        const { categoryName, modes } = req.body;
        
        if (!categoryName || !modes || !Array.isArray(modes)) {
            return res.status(400).json({ error: 'Invalid category data' });
        }
        
        const quizData = await readJSONFile(QUIZ_DATA_FILE, {});
        
        // Add category to specified modes
        modes.forEach(mode => {
            let dataSource = mode;
            if (mode === 'time-limited') dataSource = 'image-based';
            
            if (!quizData[dataSource]) {
                quizData[dataSource] = {};
            }
            
            if (!quizData[dataSource][categoryName]) {
                quizData[dataSource][categoryName] = [];
            }
        });
        
        await writeJSONFile(QUIZ_DATA_FILE, quizData);
        res.json({ success: true, message: 'Category added successfully' });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ error: 'Failed to add category' });
    }
});

// Helper function to update "All" category automatically
function updateAllCategory(quizData) {
    console.log('Updating "All" category automatically...');

    // Initialize "All" category in all structures
    const modes = ['image-based', 'time-limited'];

    modes.forEach(mode => {
        if (!quizData[mode]) quizData[mode] = {};
        quizData[mode]['all'] = [];
    });

    if (!quizData.questions) quizData.questions = {};
    quizData.questions['all'] = [];

    // Collect all questions from all categories (except "all" itself)
    const allQuestions = [];
    const seenQuestions = new Set(); // Prevent duplicates

    // Process unified structure first
    if (quizData.questions) {
        Object.keys(quizData.questions).forEach(category => {
            if (category !== 'all' && Array.isArray(quizData.questions[category])) {
                quizData.questions[category].forEach(question => {
                    const questionKey = `${question.image || 'no-image'}_${question.correctAnswer}`;
                    if (!seenQuestions.has(questionKey)) {
                        allQuestions.push(question);
                        seenQuestions.add(questionKey);
                    }
                });
            }
        });
    }

    // Update "All" category in all structures
    modes.forEach(mode => {
        quizData[mode]['all'] = [...allQuestions];
    });
    quizData.questions['all'] = [...allQuestions];

    console.log(`Updated "All" category with ${allQuestions.length} questions`);
}

// Add new question endpoint with image upload support
app.post('/api/add-question', upload.single('image'), async (req, res) => {
    try {
        console.log('Add question request received:', req.body);
        const { mode, category, questionData: questionDataStr, requestId } = req.body;

        // Check for duplicate request
        if (requestId) {
            if (processedRequests.has(requestId)) {
                console.log(`Duplicate request detected: ${requestId}, ignoring`);
                return res.status(409).json({
                    error: 'Duplicate request',
                    message: 'This request has already been processed'
                });
            }
            // Mark request as being processed
            processedRequests.add(requestId);
            console.log(`Processing new request: ${requestId}`);
        }

        if (!mode || !category || !questionDataStr) {
            console.log('Invalid question data - missing fields');
            return res.status(400).json({ error: 'Invalid question data' });
        }

        // Prevent direct addition to "All" category
        if (category.toLowerCase() === 'all') {
            return res.status(400).json({
                error: 'Cannot add questions directly to "All" category. It is automatically maintained.'
            });
        }

        // Parse question data from string (since it comes from FormData)
        let questionData;
        try {
            questionData = JSON.parse(questionDataStr);
        } catch (error) {
            console.log('Invalid JSON in questionData');
            return res.status(400).json({ error: 'Invalid question data format' });
        }

        // Handle image upload if provided
        if (req.file) {
            console.log('Processing uploaded image...');

            // Generate category folder name
            const categoryFolderName = getCategoryFolderName(category);
            const categoryPath = join(IMAGES_DIR, categoryFolderName);

            // Ensure category directory exists
            await ensureImagesDirectory(categoryPath);

            // Extract country code from correct answer if available
            const countryCode = extractCountryCode(questionData.correctAnswer);

            // Generate filename
            const filename = generateImageFilename(category, req.file.originalname, countryCode);
            const filePath = join(categoryPath, filename);

            // Save the file
            await fs.writeFile(filePath, req.file.buffer);

            // Update question data with the correct image path
            questionData.image = `assets/images/${categoryFolderName}/${filename}`;

            console.log(`Image saved to: ${questionData.image}`);
        }

        const quizData = await readJSONFile(QUIZ_DATA_FILE, {});
        console.log('Current quiz data loaded');

        // UNIFIED APPROACH - Add to unified questions structure
        if (!quizData.questions) {
            quizData.questions = {};
        }
        if (!quizData.questions[category]) {
            quizData.questions[category] = [];
        }

        quizData.questions[category].push(questionData);
        console.log(`Question added to unified questions.${category}, now has ${quizData.questions[category].length} questions`);

        // STREAMLINED APPROACH: Add to both quiz modes automatically
        const modes = ['image-based', 'time-limited'];

        modes.forEach(dataSource => {
            // Initialize data structures if they don't exist
            if (!quizData[dataSource]) {
                quizData[dataSource] = {};
            }
            if (!quizData[dataSource][category]) {
                quizData[dataSource][category] = [];
            }

            // Add question to mode
            quizData[dataSource][category].push(questionData);
        });

        console.log(`Question added to both quiz modes (image-based and time-limited) in category: ${category}`);

        // CRITICAL: Update "All" category automatically
        updateAllCategory(quizData);

        await writeJSONFile(QUIZ_DATA_FILE, quizData);
        console.log('Quiz data file updated successfully');
        res.json({
            success: true,
            message: 'Question added successfully to both quiz modes',
            imagePath: questionData.image || null,
            category: category,
            mode: 'both' // Indicate it was added to both modes
        });
    } catch (error) {
        console.error('Error adding question:', error);

        // Remove request ID from processed set on error so it can be retried
        const { requestId } = req.body;
        if (requestId && processedRequests.has(requestId)) {
            processedRequests.delete(requestId);
            console.log(`Removed failed request ID: ${requestId}`);
        }

        res.status(500).json({ error: 'Failed to add question' });
    }
});

// Edit/Update question endpoint
app.put('/api/edit-question', upload.single('image'), async (req, res) => {
    try {
        console.log('Edit question request received:', req.body);
        const { mode, category, questionIndex, questionData: questionDataStr, requestId } = req.body;

        // Check for duplicate request
        if (requestId) {
            if (processedRequests.has(requestId)) {
                console.log(`Duplicate request detected: ${requestId}, ignoring`);
                return res.status(409).json({
                    error: 'Duplicate request',
                    message: 'This request has already been processed'
                });
            }
            processedRequests.add(requestId);
            console.log(`Processing edit request: ${requestId}`);
        }

        if (!mode || !category || questionIndex === undefined || !questionDataStr) {
            console.log('Invalid edit question data - missing fields');
            return res.status(400).json({ error: 'Invalid question data' });
        }

        // Prevent direct editing of "All" category
        if (category.toLowerCase() === 'all') {
            return res.status(400).json({
                error: 'Cannot edit questions in "All" category directly. Edit in the original category.'
            });
        }

        // Parse question data from string
        let questionData;
        try {
            questionData = JSON.parse(questionDataStr);
        } catch (error) {
            console.log('Invalid JSON in questionData');
            return res.status(400).json({ error: 'Invalid question data format' });
        }

        const quizData = await readJSONFile(QUIZ_DATA_FILE, {});
        console.log('Current quiz data loaded for editing');

        // Find the question to edit in unified structure
        if (!quizData.questions || !quizData.questions[category]) {
            return res.status(404).json({ error: 'Category not found in unified structure' });
        }

        const unifiedQuestions = quizData.questions[category];
        if (questionIndex < 0 || questionIndex >= unifiedQuestions.length) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const originalQuestion = unifiedQuestions[questionIndex];
        let oldImagePath = originalQuestion.image;

        // Handle image upload if provided
        if (req.file) {
            console.log('Processing new uploaded image...');

            // Generate category folder name
            const categoryFolderName = getCategoryFolderName(category);
            const categoryPath = join(IMAGES_DIR, categoryFolderName);

            // Ensure category directory exists
            await ensureImagesDirectory(categoryPath);

            // Extract country code from correct answer if available
            const countryCode = extractCountryCode(questionData.correctAnswer);

            // Generate filename
            const filename = generateImageFilename(category, req.file.originalname, countryCode);
            const filePath = join(categoryPath, filename);

            // Save the new file
            await fs.writeFile(filePath, req.file.buffer);

            // Update question data with the new image path
            questionData.image = `assets/images/${categoryFolderName}/${filename}`;

            console.log(`New image saved to: ${questionData.image}`);

            // Delete old image file if it exists and is different from new one
            if (oldImagePath && oldImagePath.startsWith('assets/images/') && oldImagePath !== questionData.image) {
                const oldImageFullPath = join(__dirname, 'src', oldImagePath);
                try {
                    await fs.access(oldImageFullPath);
                    await fs.unlink(oldImageFullPath);
                    console.log(`Deleted old image file: ${oldImageFullPath}`);
                } catch (error) {
                    console.warn(`Could not delete old image file: ${oldImageFullPath}`, error.message);
                }
            }
        } else {
            // Keep existing image if no new image uploaded
            questionData.image = originalQuestion.image;
        }

        // Update question in unified structure
        unifiedQuestions[questionIndex] = questionData;
        console.log(`Question updated in unified questions.${category} at index ${questionIndex}`);

        // Update in both quiz modes automatically
        const modes = ['image-based', 'time-limited'];

        modes.forEach(dataSource => {
            if (quizData[dataSource] && quizData[dataSource][category]) {
                // Find and update the same question in each mode
                const modeQuestions = quizData[dataSource][category];
                const modeIndex = modeQuestions.findIndex(q =>
                    q.correctAnswer === originalQuestion.correctAnswer &&
                    q.image === oldImagePath &&
                    JSON.stringify(q.options) === JSON.stringify(originalQuestion.options)
                );

                if (modeIndex !== -1) {
                    modeQuestions[modeIndex] = { ...questionData };
                    console.log(`Question updated in ${dataSource}.${category} at index ${modeIndex}`);
                } else {
                    console.warn(`Question not found in ${dataSource}.${category} for update`);
                }
            }
        });

        // CRITICAL: Update "All" category automatically
        updateAllCategory(quizData);

        await writeJSONFile(QUIZ_DATA_FILE, quizData);
        console.log('Quiz data file updated successfully after edit');

        res.json({
            success: true,
            message: 'Question updated successfully in both quiz modes',
            imagePath: questionData.image || null,
            category: category,
            questionIndex: questionIndex,
            oldImagePath: oldImagePath
        });

    } catch (error) {
        console.error('Error editing question:', error);

        // Remove request ID from processed set on error so it can be retried
        const { requestId } = req.body;
        if (requestId && processedRequests.has(requestId)) {
            processedRequests.delete(requestId);
            console.log(`Removed failed edit request ID: ${requestId}`);
        }

        res.status(500).json({ error: 'Failed to edit question' });
    }
});

// Delete question endpoint
app.delete('/api/delete-question', async (req, res) => {
    try {
        const { mode, category, questionIndex } = req.body;

        if (!mode || !category || questionIndex === undefined) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        console.log(`Delete question request: mode=${mode}, category=${category}, index=${questionIndex}`);

        const quizData = await readJSONFile(QUIZ_DATA_FILE, {});

        // IMPROVED: Delete from unified structure first (single source of truth)
        if (!quizData.questions || !quizData.questions[category]) {
            return res.status(404).json({ error: 'Category not found in unified structure' });
        }

        const unifiedQuestions = quizData.questions[category];
        if (questionIndex < 0 || questionIndex >= unifiedQuestions.length) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const questionToDelete = unifiedQuestions[questionIndex];
        let deletedImagePath = null;

        // Delete associated image file if it exists and is a local file
        if (questionToDelete.image && questionToDelete.image.startsWith('assets/images/')) {
            const imagePath = join(__dirname, 'src', questionToDelete.image);
            try {
                await fs.access(imagePath);
                await fs.unlink(imagePath);
                deletedImagePath = questionToDelete.image;
                console.log(`Deleted image file: ${imagePath}`);
            } catch (error) {
                console.warn(`Could not delete image file: ${imagePath}`, error.message);
            }
        }

        // Remove question from unified structure
        unifiedQuestions.splice(questionIndex, 1);
        console.log(`Question removed from unified structure at index ${questionIndex}`);

        // CRITICAL: Also remove from both quiz modes
        const modes = ['image-based', 'time-limited'];
        modes.forEach(dataSource => {
            if (quizData[dataSource] && quizData[dataSource][category]) {
                // Find and remove the same question from each mode
                const modeQuestions = quizData[dataSource][category];
                const modeIndex = modeQuestions.findIndex(q =>
                    q.correctAnswer === questionToDelete.correctAnswer &&
                    q.image === questionToDelete.image &&
                    JSON.stringify(q.options) === JSON.stringify(questionToDelete.options)
                );

                if (modeIndex !== -1) {
                    modeQuestions.splice(modeIndex, 1);
                    console.log(`Also removed question from ${dataSource}.${category} at index ${modeIndex}`);
                } else {
                    console.warn(`Question not found in ${dataSource}.${category} for deletion`);
                }
            }
        });

        // CRITICAL: Update "All" category automatically after deletion
        updateAllCategory(quizData);

        // Save updated quiz data
        await writeJSONFile(QUIZ_DATA_FILE, quizData);

        console.log(`Question deleted successfully from ${dataSource}.${category}`);
        res.json({
            success: true,
            message: 'Question deleted successfully',
            deletedImagePath: deletedImagePath
        });

    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

// Delete category endpoint
app.delete('/api/delete-category', async (req, res) => {
    try {
        const { categoryName } = req.body;

        if (!categoryName) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        console.log(`Delete category request: ${categoryName}`);

        const quizData = await readJSONFile(QUIZ_DATA_FILE, {});

        let deletedQuestions = 0;
        let deletedImages = [];
        const affectedModes = [];

        // Process all modes (excluding unified structure)
        for (const mode of Object.keys(quizData)) {
            // Skip the unified questions structure
            if (mode === 'questions') continue;

            if (quizData[mode][categoryName]) {
                const questions = quizData[mode][categoryName];
                deletedQuestions += questions.length;
                affectedModes.push(mode);

                // Delete associated image files
                for (const question of questions) {
                    if (question.image && question.image.startsWith('assets/images/')) {
                        const imagePath = join(__dirname, 'src', question.image);
                        try {
                            await fs.access(imagePath);
                            await fs.unlink(imagePath);
                            deletedImages.push(question.image);
                            console.log(`Deleted image file: ${imagePath}`);
                        } catch (error) {
                            console.warn(`Could not delete image file: ${imagePath}`, error.message);
                        }
                    }
                }

                // Remove category from mode
                delete quizData[mode][categoryName];
            }
        }

        // CRITICAL FIX: Also remove from unified structure
        if (quizData.questions && quizData.questions[categoryName]) {
            console.log(`Also removing category "${categoryName}" from unified structure`);
            delete quizData.questions[categoryName];
        }

        // CRITICAL: Update "All" category automatically after category deletion
        updateAllCategory(quizData);

        // Try to delete the category folder if it exists and is empty
        const categoryFolderName = getCategoryFolderName(categoryName);
        const categoryPath = join(IMAGES_DIR, categoryFolderName);
        try {
            const files = await fs.readdir(categoryPath);
            if (files.length === 0) {
                await fs.rmdir(categoryPath);
                console.log(`Deleted empty category folder: ${categoryPath}`);
            } else {
                console.log(`Category folder not empty, keeping: ${categoryPath}`);
            }
        } catch (error) {
            console.log(`Category folder does not exist or could not be deleted: ${categoryPath}`);
        }

        // Save updated quiz data
        await writeJSONFile(QUIZ_DATA_FILE, quizData);

        console.log(`Category "${categoryName}" deleted successfully`);
        res.json({
            success: true,
            message: 'Category deleted successfully',
            deletedQuestions: deletedQuestions,
            deletedImages: deletedImages,
            affectedModes: affectedModes
        });

    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// Utility function to extract country code from country name
function extractCountryCode(countryName) {
    const countryCodeMap = {
        'Deutschland': 'GER',
        'Germany': 'GER',
        'Frankreich': 'FR',
        'France': 'FR',
        'Italien': 'IT',
        'Italy': 'IT',
        'Spanien': 'ES',
        'Spain': 'ES',
        'Belgien': 'BE',
        'Belgium': 'BE',
        'Niederlande': 'NL',
        'Netherlands': 'NL',
        'Großbritannien': 'UK',
        'United Kingdom': 'UK',
        'Vereinigtes Königreich': 'UK',
        'Polen': 'PL',
        'Poland': 'PL',
        'Russland': 'RU',
        'Russia': 'RU',
        'Kasachstan': 'KZ',
        'Kazakhstan': 'KZ',
        'Luxemburg': 'LUX',
        'Luxembourg': 'LUX',
        'Slowakei': 'SK',
        'Slovakia': 'SK',
        'Türkei': 'TR',
        'Turkey': 'TR',
        'Kenia': 'KE',
        'Kenya': 'KE',
        'Mongolei': 'MN',
        'Mongolia': 'MN',
        'Argentinien': 'AR',
        'Argentina': 'AR',
        'Brasilien': 'BR',
        'Brazil': 'BR',
        'Indien': 'IN',
        'India': 'IN',
        'Japan': 'JP',
        'Sri Lanka': 'LK',
        'Portugal': 'PT',
        'Rumänien': 'RO',
        'Romania': 'RO',
        'Thailand': 'TH'
    };

    return countryCodeMap[countryName] || null;
}

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'src', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, async () => {
    console.log(`TerraTüftler server running on port ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
    console.log(`Data directory: ${DATA_DIR}`);

    // Initialize "All" category on server startup
    try {
        const quizData = await readJSONFile(QUIZ_DATA_FILE, {});
        updateAllCategory(quizData);
        await writeJSONFile(QUIZ_DATA_FILE, quizData);
        console.log('"All" category initialized on server startup');
    } catch (error) {
        console.error('Error initializing "All" category:', error);
    }
});
