// Direct CRUD Test using Node.js built-in modules
// Run with: node direct_crud_test.js

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data,
                        json: () => JSON.parse(data)
                    };
                    resolve(result);
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data,
                        json: () => { throw error; }
                    });
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

function createFormData(fields) {
    const boundary = '----formdata-' + Math.random().toString(36);
    let body = '';
    
    for (const [key, value] of Object.entries(fields)) {
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
        body += `${value}\r\n`;
    }
    
    body += `--${boundary}--\r\n`;
    
    return {
        body,
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(body)
        }
    };
}

async function logResult(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function getCurrentQuestionCount() {
    try {
        const response = await makeRequest(`${API_BASE}/quiz-data`);
        
        if (response.statusCode !== 200) {
            throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
        }
        
        const data = response.json();
        const allQuestions = data.questions?.all || [];
        const imageBasedCount = Object.values(data['image-based'] || {}).reduce((sum, arr) => sum + arr.length, 0);
        const timeLimitedCount = Object.values(data['time-limited'] || {}).reduce((sum, arr) => sum + arr.length, 0);
        
        await logResult(`Current question counts - All: ${allQuestions.length}, Image-based: ${imageBasedCount}, Time-limited: ${timeLimitedCount}`, 'info');
        return allQuestions.length;
    } catch (error) {
        await logResult(`Error getting question count: ${error.message}`, 'error');
        return 0;
    }
}

async function testCreateQuestion() {
    await logResult('🧪 Starting Create Question Test...', 'info');
    
    try {
        // Create test question data
        const testQuestion = {
            options: ['Test Option 1', 'Test Option 2', 'Test Option 3', 'Test Option 4'],
            correctAnswer: 'Test Option 2',
            question: 'Direct Test Question - Which option is correct?',
            explanation: 'This is a test question created by the direct CRUD test suite.',
            streetViewUrl: 'https://www.google.com/maps/@52.5200,13.4050,3a,75y,90t/data=!3m6!1e1'
        };

        // Create form data
        const formData = createFormData({
            mode: 'both',
            category: 'bollards',
            questionData: JSON.stringify(testQuestion),
            requestId: `direct_test_${Date.now()}`
        });

        await logResult('Sending create question request...', 'info');
        
        const response = await makeRequest(`${API_BASE}/add-question`, {
            method: 'POST',
            headers: formData.headers,
            body: formData.body
        });

        if (response.statusCode !== 200) {
            throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
        }

        const result = response.json();
        await logResult(`✅ Question created successfully: ${JSON.stringify(result)}`, 'success');
        
        return true;
    } catch (error) {
        await logResult(`❌ Create question test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testEditQuestion() {
    await logResult('🧪 Starting Edit Question Test...', 'info');
    
    try {
        // First, get the current data to find a question to edit
        const response = await makeRequest(`${API_BASE}/quiz-data`);
        
        if (response.statusCode !== 200) {
            throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
        }
        
        const data = response.json();
        const bollardQuestions = data.questions?.bollards || [];
        
        if (bollardQuestions.length === 0) {
            await logResult('❌ No questions found in bollards category to edit', 'error');
            return false;
        }
        
        // Use the first question for editing
        const questionToEdit = bollardQuestions[0];
        const questionIndex = 0;
        
        await logResult(`Attempting to edit question at index ${questionIndex}: "${questionToEdit.question || 'No question text'}"`, 'info');
        
        // Create modified question data
        const editedQuestion = {
            ...questionToEdit,
            question: questionToEdit.question + ' [EDITED BY DIRECT TEST]',
            explanation: (questionToEdit.explanation || '') + ' [This question was edited by the direct CRUD test suite.]'
        };
        
        // Create form data for edit request
        const formData = createFormData({
            mode: 'image-based',
            category: 'bollards',
            questionIndex: questionIndex.toString(),
            questionData: JSON.stringify(editedQuestion),
            requestId: `direct_edit_${Date.now()}`
        });

        await logResult('Sending edit question request...', 'info');
        
        const editResponse = await makeRequest(`${API_BASE}/edit-question`, {
            method: 'PUT',
            headers: formData.headers,
            body: formData.body
        });

        if (editResponse.statusCode !== 200) {
            throw new Error(`HTTP ${editResponse.statusCode}: ${editResponse.body}`);
        }

        const editResult = editResponse.json();
        await logResult(`✅ Question edited successfully: ${JSON.stringify(editResult)}`, 'success');
        
        return true;
    } catch (error) {
        await logResult(`❌ Edit question test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testDeleteQuestion() {
    await logResult('🧪 Starting Delete Question Test...', 'info');
    
    try {
        // First, get the current data to find a question to delete
        const response = await makeRequest(`${API_BASE}/quiz-data`);
        
        if (response.statusCode !== 200) {
            throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
        }
        
        const data = response.json();
        const bollardQuestions = data.questions?.bollards || [];
        
        if (bollardQuestions.length === 0) {
            await logResult('❌ No questions found in bollards category to delete', 'error');
            return false;
        }
        
        // Find our test question or use the last one
        const questionToDelete = bollardQuestions.find(q => q.question?.includes('Direct Test Question')) || bollardQuestions[bollardQuestions.length - 1];
        const questionIndex = bollardQuestions.indexOf(questionToDelete);
        
        await logResult(`Attempting to delete question at index ${questionIndex}: "${questionToDelete.question || 'No question text'}"`, 'info');
        
        // Delete the question
        const deleteResponse = await makeRequest(`${API_BASE}/delete-question`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify({
                    mode: 'image-based',
                    category: 'bollards',
                    questionIndex: questionIndex
                }))
            },
            body: JSON.stringify({
                mode: 'image-based',
                category: 'bollards',
                questionIndex: questionIndex
            })
        });

        if (deleteResponse.statusCode !== 200) {
            throw new Error(`HTTP ${deleteResponse.statusCode}: ${deleteResponse.body}`);
        }

        const deleteResult = deleteResponse.json();
        await logResult(`✅ Question deleted successfully: ${JSON.stringify(deleteResult)}`, 'success');
        
        return true;
    } catch (error) {
        await logResult(`❌ Delete question test failed: ${error.message}`, 'error');
        return false;
    }
}

async function checkDataIntegrity() {
    await logResult('🧪 Starting Data Integrity Check...', 'info');
    
    try {
        const response = await makeRequest(`${API_BASE}/quiz-data`);
        
        if (response.statusCode !== 200) {
            throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
        }
        
        const data = response.json();
        
        // Check structure
        const hasImageBased = !!data['image-based'];
        const hasTimeLimited = !!data['time-limited'];
        const hasQuestions = !!data.questions;
        
        await logResult(`Image-based structure: ${hasImageBased ? '✅' : '❌'}`, hasImageBased ? 'success' : 'error');
        await logResult(`Time-limited structure: ${hasTimeLimited ? '✅' : '❌'}`, hasTimeLimited ? 'success' : 'error');
        await logResult(`Unified questions structure: ${hasQuestions ? '✅' : '❌'}`, hasQuestions ? 'success' : 'error');
        
        // Check category consistency
        if (hasImageBased && hasTimeLimited && hasQuestions) {
            const imageCategories = Object.keys(data['image-based']);
            const timeCategories = Object.keys(data['time-limited']);
            const questionCategories = Object.keys(data.questions);
            
            const categoriesMatch = JSON.stringify(imageCategories.sort()) === JSON.stringify(timeCategories.sort()) &&
                                  JSON.stringify(imageCategories.sort()) === JSON.stringify(questionCategories.sort());
            
            await logResult(`Category consistency: ${categoriesMatch ? '✅' : '❌'}`, categoriesMatch ? 'success' : 'error');
            
            if (!categoriesMatch) {
                await logResult(`Image-based categories: ${imageCategories.join(', ')}`, 'info');
                await logResult(`Time-limited categories: ${timeCategories.join(', ')}`, 'info');
                await logResult(`Questions categories: ${questionCategories.join(', ')}`, 'info');
            }
        }
        
        await logResult('✅ Data integrity check completed', 'success');
        return true;
        
    } catch (error) {
        await logResult(`❌ Data integrity check failed: ${error.message}`, 'error');
        return false;
    }
}

async function runAllTests() {
    await logResult('🚀 Starting comprehensive CRUD test suite...', 'info');
    
    const originalCount = await getCurrentQuestionCount();
    
    // Run tests in sequence
    const integrityResult = await checkDataIntegrity();
    const createResult = await testCreateQuestion();
    const editResult = await testEditQuestion();
    const deleteResult = await testDeleteQuestion();
    
    const finalCount = await getCurrentQuestionCount();
    
    await logResult('🏁 All tests completed!', 'info');
    await logResult(`Final question count: ${finalCount} (started with ${originalCount})`, 'info');
    
    const allPassed = integrityResult && createResult && editResult && deleteResult;
    await logResult(`Overall test result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`, allPassed ? 'success' : 'error');
    
    return allPassed;
}

// Run the tests
runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
