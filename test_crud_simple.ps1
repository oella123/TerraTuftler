# Simple CRUD Test Script for TerraTüftler Admin Interface
# Run this with: powershell -ExecutionPolicy Bypass -File test_crud_simple.ps1

$API_BASE = "http://localhost:3001/api"

function Write-TestResult {
    param(
        [string]$Message,
        [string]$Type = "info"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $prefix = switch ($Type) {
        "success" { "✅" }
        "error" { "❌" }
        "warning" { "⚠️" }
        default { "ℹ️" }
    }
    
    Write-Host "[$timestamp] $prefix $Message"
}

function Get-CurrentQuestionCount {
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/quiz-data" -Method Get
        
        $allQuestions = if ($response.questions.all) { $response.questions.all.Count } else { 0 }
        $imageBasedCount = 0
        $timeLimitedCount = 0
        
        if ($response.'image-based') {
            $imageBasedCount = ($response.'image-based'.PSObject.Properties | ForEach-Object { $_.Value.Count } | Measure-Object -Sum).Sum
        }
        
        if ($response.'time-limited') {
            $timeLimitedCount = ($response.'time-limited'.PSObject.Properties | ForEach-Object { $_.Value.Count } | Measure-Object -Sum).Sum
        }
        
        Write-TestResult "Current question counts - All: $allQuestions, Image-based: $imageBasedCount, Time-limited: $timeLimitedCount" "info"
        return $allQuestions
    }
    catch {
        Write-TestResult "Error getting question count: $($_.Exception.Message)" "error"
        return 0
    }
}

function Test-CreateQuestion {
    Write-TestResult "🧪 Starting Create Question Test..." "info"
    
    try {
        # Create test question data
        $testQuestion = @{
            options = @("Test Option 1", "Test Option 2", "Test Option 3", "Test Option 4")
            correctAnswer = "Test Option 2"
            question = "Test Question - Which option is correct?"
            explanation = "This is a test question created by the CRUD test suite."
            streetViewUrl = "https://www.google.com/maps/@52.5200,13.4050,3a,75y,90t/data=!3m6!1e1"
        } | ConvertTo-Json
        
        # Create form data
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"mode`"$LF",
            "both",
            "--$boundary",
            "Content-Disposition: form-data; name=`"category`"$LF", 
            "bollards",
            "--$boundary",
            "Content-Disposition: form-data; name=`"questionData`"$LF",
            $testQuestion,
            "--$boundary",
            "Content-Disposition: form-data; name=`"requestId`"$LF",
            "test_$(Get-Date -Format 'yyyyMMddHHmmss')",
            "--$boundary--$LF"
        )
        
        $body = $bodyLines -join $LF
        
        Write-TestResult "Sending create question request..." "info"
        
        $response = Invoke-RestMethod -Uri "$API_BASE/add-question" -Method Post -Body $body -ContentType "multipart/form-data; boundary=$boundary"
        
        Write-TestResult "✅ Question created successfully: $($response | ConvertTo-Json -Compress)" "success"
        
        return $true
    }
    catch {
        Write-TestResult "❌ Create question test failed: $($_.Exception.Message)" "error"
        return $false
    }
}

function Test-EditQuestion {
    Write-TestResult "🧪 Starting Edit Question Test..." "info"
    
    try {
        # First, get the current data to find a question to edit
        $response = Invoke-RestMethod -Uri "$API_BASE/quiz-data" -Method Get
        
        $bollardQuestions = $response.questions.bollards
        if (-not $bollardQuestions -or $bollardQuestions.Count -eq 0) {
            Write-TestResult "❌ No questions found in bollards category to edit" "error"
            return $false
        }
        
        # Use the first question for editing
        $questionToEdit = $bollardQuestions[0]
        $questionIndex = 0
        
        Write-TestResult "Attempting to edit question at index $questionIndex" "info"
        
        # Create modified question data
        $editedQuestion = $questionToEdit.PSObject.Copy()
        $editedQuestion.question = $questionToEdit.question + " [EDITED BY TEST]"
        $editedQuestion.explanation = ($questionToEdit.explanation + " [This question was edited by the CRUD test suite.]")
        
        $editedQuestionJson = $editedQuestion | ConvertTo-Json
        
        # Create form data for edit request
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"mode`"$LF",
            "image-based",
            "--$boundary",
            "Content-Disposition: form-data; name=`"category`"$LF",
            "bollards",
            "--$boundary",
            "Content-Disposition: form-data; name=`"questionIndex`"$LF",
            "0",
            "--$boundary",
            "Content-Disposition: form-data; name=`"questionData`"$LF",
            $editedQuestionJson,
            "--$boundary",
            "Content-Disposition: form-data; name=`"requestId`"$LF",
            "edit_test_$(Get-Date -Format 'yyyyMMddHHmmss')",
            "--$boundary--$LF"
        )
        
        $body = $bodyLines -join $LF
        
        Write-TestResult "Sending edit question request..." "info"
        
        $editResponse = Invoke-RestMethod -Uri "$API_BASE/edit-question" -Method Put -Body $body -ContentType "multipart/form-data; boundary=$boundary"
        
        Write-TestResult "✅ Question edited successfully: $($editResponse | ConvertTo-Json -Compress)" "success"
        
        return $true
    }
    catch {
        Write-TestResult "❌ Edit question test failed: $($_.Exception.Message)" "error"
        return $false
    }
}

function Test-DeleteQuestion {
    Write-TestResult "🧪 Starting Delete Question Test..." "info"
    
    try {
        # First, get the current data to find a question to delete
        $response = Invoke-RestMethod -Uri "$API_BASE/quiz-data" -Method Get
        
        $bollardQuestions = $response.questions.bollards
        if (-not $bollardQuestions -or $bollardQuestions.Count -eq 0) {
            Write-TestResult "❌ No questions found in bollards category to delete" "error"
            return $false
        }
        
        # Find our test question or use the last one
        $questionToDelete = $bollardQuestions | Where-Object { $_.question -like "*Test Question*" } | Select-Object -First 1
        if (-not $questionToDelete) {
            $questionToDelete = $bollardQuestions[-1]
        }
        
        $questionIndex = [array]::IndexOf($bollardQuestions, $questionToDelete)
        
        Write-TestResult "Attempting to delete question at index $questionIndex" "info"
        
        # Delete the question
        $deleteBody = @{
            mode = "image-based"
            category = "bollards"
            questionIndex = $questionIndex
        } | ConvertTo-Json
        
        $deleteResponse = Invoke-RestMethod -Uri "$API_BASE/delete-question" -Method Delete -Body $deleteBody -ContentType "application/json"
        
        Write-TestResult "✅ Question deleted successfully: $($deleteResponse | ConvertTo-Json -Compress)" "success"
        
        return $true
    }
    catch {
        Write-TestResult "❌ Delete question test failed: $($_.Exception.Message)" "error"
        return $false
    }
}

function Test-DataIntegrity {
    Write-TestResult "🧪 Starting Data Integrity Check..." "info"
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/quiz-data" -Method Get
        
        # Check structure
        $hasImageBased = $null -ne $response.'image-based'
        $hasTimeLimited = $null -ne $response.'time-limited'
        $hasQuestions = $null -ne $response.questions
        
        Write-TestResult "Image-based structure: $(if ($hasImageBased) { '✅' } else { '❌' })" $(if ($hasImageBased) { "success" } else { "error" })
        Write-TestResult "Time-limited structure: $(if ($hasTimeLimited) { '✅' } else { '❌' })" $(if ($hasTimeLimited) { "success" } else { "error" })
        Write-TestResult "Unified questions structure: $(if ($hasQuestions) { '✅' } else { '❌' })" $(if ($hasQuestions) { "success" } else { "error" })
        
        Write-TestResult "✅ Data integrity check completed" "success"
        return $true
    }
    catch {
        Write-TestResult "❌ Data integrity check failed: $($_.Exception.Message)" "error"
        return $false
    }
}

function Start-AllTests {
    Write-TestResult "🚀 Starting comprehensive CRUD test suite..." "info"
    
    $originalCount = Get-CurrentQuestionCount
    
    # Run tests in sequence
    $integrityResult = Test-DataIntegrity
    $createResult = Test-CreateQuestion
    $editResult = Test-EditQuestion
    $deleteResult = Test-DeleteQuestion
    
    $finalCount = Get-CurrentQuestionCount
    
    Write-TestResult "🏁 All tests completed!" "info"
    Write-TestResult "Final question count: $finalCount (started with $originalCount)" "info"
    
    $allPassed = $integrityResult -and $createResult -and $editResult -and $deleteResult
    Write-TestResult "Overall test result: $(if ($allPassed) { '✅ ALL TESTS PASSED' } else { '❌ SOME TESTS FAILED' })" $(if ($allPassed) { "success" } else { "error" })
    
    return $allPassed
}

# Run the tests
$success = Start-AllTests
if ($success) {
    exit 0
} else {
    exit 1
}
