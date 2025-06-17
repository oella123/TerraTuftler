// Comprehensive CRUD Test Script for TerraTüftler Admin Interface
// Run this with: node run_crud_tests.js

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const API_BASE = 'http://localhost:3001/api';

async function logResult(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function getCurrentQuestionCount() {
    try {
        const response = await fetch(`${API_BASE}/quiz-data`);
        const data = await response.json();
        
        const allQuestions = data.questions?.all || [];
        const imageBasedCount = Object.values(data['image-based'] || {}).flat().length;
        const timeLimitedCount = Object.values(data['time-limited'] || {}).flat().length;
        
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
            question: 'Test Question - Which option is correct?',
            explanation: 'This is a test question created by the CRUD test suite.',
            streetViewUrl: 'https://www.google.com/maps/@52.5200,13.4050,3a,75y,90t/data=!3m6!1e1'
        };

        // Create FormData
        const formData = new FormData();
        formData.append('mode', 'both');
        formData.append('category', 'bollards'); // Use existing category
        formData.append('questionData', JSON.stringify(testQuestion));
        formData.append('requestId', `test_${Date.now()}`);

        await logResult('Sending create question request...', 'info');
        
        const response = await fetch(`${API_BASE}/add-question`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        await logResult(`✅ Question created successfully: ${JSON.stringify(result)}`, 'success');
        
        // Verify question was added to both modes
        await verifyQuestionInBothModes(testQuestion);
        
        return true;
    } catch (error) {
        await logResult(`❌ Create question test failed: ${error.message}`, 'error');
        return false;
    }
}

async function verifyQuestionInBothModes(testQuestion) {
    try {
        const response = await fetch(`${API_BASE}/quiz-data`);
        const data = await response.json();
        
        // Check image-based mode
        const imageBasedQuestions = data['image-based']?.bollards || [];
        const foundInImageBased = imageBasedQuestions.some(q => 
            q.question === testQuestion.question && q.correctAnswer === testQuestion.correctAnswer
        );
        
        // Check time-limited mode
        const timeLimitedQuestions = data['time-limited']?.bollards || [];
        const foundInTimeLimited = timeLimitedQuestions.some(q => 
            q.question === testQuestion.question && q.correctAnswer === testQuestion.correctAnswer
        );
        
        // Check unified questions structure
        const unifiedQuestions = data.questions?.bollards || [];
        const foundInUnified = unifiedQuestions.some(q => 
            q.question === testQuestion.question && q.correctAnswer === testQuestion.correctAnswer
        );
        
        if (foundInImageBased && foundInTimeLimited && foundInUnified) {
            await logResult('✅ Question found in both quiz modes and unified structure', 'success');
        } else {
            await logResult(`❌ Question not found in all required locations: Image-based: ${foundInImageBased}, Time-limited: ${foundInTimeLimited}, Unified: ${foundInUnified}`, 'error');
        }
        
    } catch (error) {
        await logResult(`❌ Error verifying question in both modes: ${error.message}`, 'error');
    }
}

async function testEditQuestion() {
    await logResult('🧪 Starting Edit Question Test...', 'info');
    
    try {
        // First, get the current data to find a question to edit
        const response = await fetch(`${API_BASE}/quiz-data`);
        const data = await response.json();
        
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
            question: questionToEdit.question + ' [EDITED BY TEST]',
            explanation: (questionToEdit.explanation || '') + ' [This question was edited by the CRUD test suite.]'
        };
        
        // Create FormData for edit request
        const formData = new FormData();
        formData.append('mode', 'image-based'); // This should edit in both modes
        formData.append('category', 'bollards');
        formData.append('questionIndex', questionIndex.toString());
        formData.append('questionData', JSON.stringify(editedQuestion));
        formData.append('requestId', `edit_test_${Date.now()}`);

        await logResult('Sending edit question request...', 'info');
        
        const editResponse = await fetch(`${API_BASE}/edit-question`, {
            method: 'PUT',
            body: formData
        });

        if (!editResponse.ok) {
            throw new Error(`HTTP ${editResponse.status}: ${editResponse.statusText}`);
        }

        const editResult = await editResponse.json();
        await logResult(`✅ Question edited successfully: ${JSON.stringify(editResult)}`, 'success');
        
        // Verify question was edited in both modes
        await verifyQuestionEdited(editedQuestion, questionIndex);
        
        return true;
    } catch (error) {
        await logResult(`❌ Edit question test failed: ${error.message}`, 'error');
        return false;
    }
}

async function verifyQuestionEdited(editedQuestion, questionIndex) {
    try {
        const response = await fetch(`${API_BASE}/quiz-data`);
        const data = await response.json();
        
        // Check unified structure
        const unifiedQuestions = data.questions?.bollards || [];
        const foundInUnified = unifiedQuestions[questionIndex] && 
            unifiedQuestions[questionIndex].question === editedQuestion.question &&
            unifiedQuestions[questionIndex].explanation === editedQuestion.explanation;
        
        // Check image-based mode
        const imageBasedQuestions = data['image-based']?.bollards || [];
        const foundInImageBased = imageBasedQuestions[questionIndex] && 
            imageBasedQuestions[questionIndex].question === editedQuestion.question &&
            imageBasedQuestions[questionIndex].explanation === editedQuestion.explanation;
        
        // Check time-limited mode
        const timeLimitedQuestions = data['time-limited']?.bollards || [];
        const foundInTimeLimited = timeLimitedQuestions[questionIndex] && 
            timeLimitedQuestions[questionIndex].question === editedQuestion.question &&
            timeLimitedQuestions[questionIndex].explanation === editedQuestion.explanation;
        
        if (foundInUnified && foundInImageBased && foundInTimeLimited) {
            await logResult('✅ Question edits found in unified structure and both quiz modes', 'success');
        } else {
            await logResult(`❌ Question edits not found in all required locations: Unified: ${foundInUnified}, Image-based: ${foundInImageBased}, Time-limited: ${foundInTimeLimited}`, 'error');
        }
        
    } catch (error) {
        await logResult(`❌ Error verifying question edit: ${error.message}`, 'error');
    }
}

async function testDeleteQuestion() {
    await logResult('🧪 Starting Delete Question Test...', 'info');
    
    try {
        // First, get the current data to find a question to delete
        const response = await fetch(`${API_BASE}/quiz-data`);
        const data = await response.json();
        
        const bollardQuestions = data.questions?.bollards || [];
        if (bollardQuestions.length === 0) {
            await logResult('❌ No questions found in bollards category to delete', 'error');
            return false;
        }
        
        // Find our test question or use the last one
        const questionToDelete = bollardQuestions.find(q => q.question?.includes('Test Question')) || bollardQuestions[bollardQuestions.length - 1];
        const questionIndex = bollardQuestions.indexOf(questionToDelete);
        
        await logResult(`Attempting to delete question at index ${questionIndex}: "${questionToDelete.question || 'No question text'}"`, 'info');
        
        // Delete the question
        const deleteResponse = await fetch(`${API_BASE}/delete-question`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode: 'image-based', // This should delete from both modes
                category: 'bollards',
                questionIndex: questionIndex
            })
        });

        if (!deleteResponse.ok) {
            throw new Error(`HTTP ${deleteResponse.status}: ${deleteResponse.statusText}`);
        }

        const deleteResult = await deleteResponse.json();
        await logResult(`✅ Question deleted successfully: ${JSON.stringify(deleteResult)}`, 'success');
        
        // Verify question was removed from both modes
        await verifyQuestionDeleted(questionToDelete, questionIndex);
        
        return true;
    } catch (error) {
        await logResult(`❌ Delete question test failed: ${error.message}`, 'error');
        return false;
    }
}

async function verifyQuestionDeleted(deletedQuestion, originalIndex) {
    try {
        const response = await fetch(`${API_BASE}/quiz-data`);
        const data = await response.json();
        
        // Check if question was removed from all locations
        const imageBasedQuestions = data['image-based']?.bollards || [];
        const timeLimitedQuestions = data['time-limited']?.bollards || [];
        const unifiedQuestions = data.questions?.bollards || [];
        
        const stillInImageBased = imageBasedQuestions.some(q => 
            q.question === deletedQuestion.question && q.correctAnswer === deletedQuestion.correctAnswer
        );
        const stillInTimeLimited = timeLimitedQuestions.some(q => 
            q.question === deletedQuestion.question && q.correctAnswer === deletedQuestion.correctAnswer
        );
        const stillInUnified = unifiedQuestions.some(q => 
            q.question === deletedQuestion.question && q.correctAnswer === deletedQuestion.correctAnswer
        );
        
        if (!stillInImageBased && !stillInTimeLimited && !stillInUnified) {
            await logResult('✅ Question successfully removed from all locations', 'success');
        } else {
            await logResult(`❌ Question still found in some locations: Image-based: ${stillInImageBased}, Time-limited: ${stillInTimeLimited}, Unified: ${stillInUnified}`, 'error');
        }
        
    } catch (error) {
        await logResult(`❌ Error verifying question deletion: ${error.message}`, 'error');
    }
}

async function checkDataIntegrity() {
    await logResult('🧪 Starting Data Integrity Check...', 'info');
    
    try {
        const response = await fetch(`${API_BASE}/quiz-data`);
        const data = await response.json();
        
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
