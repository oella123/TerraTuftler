#!/usr/bin/env node

/**
 * Deployment Verification Script for TerraTüftler
 * Verifies that all necessary files are in place for successful Vercel deployment
 */

import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

const REQUIRED_FILES = [
    // Build output
    'dist/index.html',
    'dist/assets/index-D9BG9kXT.js', // This will change with each build
    'dist/assets/index-0HE2dSOY.css',
    
    // Data files in dist
    'dist/data/quizData.json',
    'dist/data/learningData.json',
    'dist/data/leaderboardData.json',
    
    // Data files in public (fallback)
    'public/data/quizData.json',
    'public/data/learningData.json',
    'public/data/leaderboardData.json',
    
    // Configuration files
    'vercel.json',
    'package.json',
    'vite.config.js',
    
    // Key source files
    'src/js/data.js',
    'src/js/app.js',
    'src/js/quiz.js'
];

const REQUIRED_DIRECTORIES = [
    'dist',
    'dist/data',
    'dist/assets',
    'dist/assets/images',
    'public',
    'public/data',
    'src',
    'src/js',
    'src/css',
    'src/assets',
    'src/assets/images'
];

function checkFile(filePath) {
    if (!existsSync(filePath)) {
        return { exists: false, error: 'File does not exist' };
    }
    
    try {
        const stats = statSync(filePath);
        return {
            exists: true,
            size: stats.size,
            modified: stats.mtime
        };
    } catch (error) {
        return { exists: false, error: error.message };
    }
}

function checkDirectory(dirPath) {
    if (!existsSync(dirPath)) {
        return { exists: false, error: 'Directory does not exist' };
    }
    
    try {
        const stats = statSync(dirPath);
        return {
            exists: true,
            isDirectory: stats.isDirectory()
        };
    } catch (error) {
        return { exists: false, error: error.message };
    }
}

function validateJsonFile(filePath) {
    try {
        const content = readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        return {
            valid: true,
            size: content.length,
            keys: Object.keys(parsed).length,
            hasData: Object.keys(parsed).length > 0
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

function main() {
    console.log('🚀 TerraTüftler Deployment Verification');
    console.log('=====================================\n');
    
    let allGood = true;
    
    // Check directories
    console.log('📁 Checking required directories...');
    for (const dir of REQUIRED_DIRECTORIES) {
        const result = checkDirectory(dir);
        if (result.exists) {
            console.log(`✅ ${dir}`);
        } else {
            console.log(`❌ ${dir} - ${result.error}`);
            allGood = false;
        }
    }
    
    console.log('\n📄 Checking required files...');
    
    // Check files (with flexible JS bundle name)
    for (const file of REQUIRED_FILES) {
        if (file.includes('index-D9BG9kXT.js')) {
            // Find any JS bundle in dist/assets/
            const distAssetsDir = 'dist/assets';
            if (existsSync(distAssetsDir)) {
                const files = readdirSync(distAssetsDir);
                const jsBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
                if (jsBundle) {
                    console.log(`✅ ${distAssetsDir}/${jsBundle} (JS bundle found)`);
                    continue;
                } else {
                    console.log(`❌ No JS bundle found in ${distAssetsDir}`);
                    allGood = false;
                    continue;
                }
            }
        }
        
        const result = checkFile(file);
        if (result.exists) {
            console.log(`✅ ${file} (${result.size} bytes)`);
        } else {
            console.log(`❌ ${file} - ${result.error}`);
            allGood = false;
        }
    }
    
    console.log('\n🔍 Validating JSON data files...');
    
    const jsonFiles = [
        'dist/data/quizData.json',
        'dist/data/learningData.json',
        'dist/data/leaderboardData.json',
        'public/data/quizData.json',
        'public/data/learningData.json',
        'public/data/leaderboardData.json'
    ];
    
    for (const jsonFile of jsonFiles) {
        if (existsSync(jsonFile)) {
            const validation = validateJsonFile(jsonFile);
            if (validation.valid) {
                console.log(`✅ ${jsonFile} - Valid JSON (${validation.keys} keys, ${validation.size} bytes)`);
                if (!validation.hasData) {
                    console.log(`⚠️  ${jsonFile} - Warning: File appears to be empty`);
                }
            } else {
                console.log(`❌ ${jsonFile} - Invalid JSON: ${validation.error}`);
                allGood = false;
            }
        } else {
            console.log(`❌ ${jsonFile} - File missing`);
            allGood = false;
        }
    }
    
    console.log('\n⚙️  Checking configuration files...');
    
    // Check vercel.json
    if (existsSync('vercel.json')) {
        const vercelConfig = validateJsonFile('vercel.json');
        if (vercelConfig.valid) {
            console.log('✅ vercel.json - Valid configuration');
        } else {
            console.log(`❌ vercel.json - Invalid: ${vercelConfig.error}`);
            allGood = false;
        }
    }
    
    // Check package.json
    if (existsSync('package.json')) {
        const packageConfig = validateJsonFile('package.json');
        if (packageConfig.valid) {
            const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
            console.log(`✅ package.json - Valid (${pkg.name} v${pkg.version})`);
            
            // Check build script
            if (pkg.scripts && pkg.scripts.build) {
                console.log(`✅ Build script: ${pkg.scripts.build}`);
            } else {
                console.log('❌ No build script found in package.json');
                allGood = false;
            }
        } else {
            console.log(`❌ package.json - Invalid: ${packageConfig.error}`);
            allGood = false;
        }
    }
    
    console.log('\n🖼️  Checking image assets...');
    
    const imageCategories = ['Bollards', 'Chevrons', 'Google Cars', 'Other Signs', 'Poles', 'design'];
    let totalImages = 0;
    
    for (const category of imageCategories) {
        const distPath = `dist/assets/images/${category}`;
        if (existsSync(distPath)) {
            const files = readdirSync(distPath);
            const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(f));
            totalImages += imageFiles.length;
            console.log(`✅ ${category}: ${imageFiles.length} images`);
        } else {
            console.log(`❌ ${category}: Directory missing`);
            allGood = false;
        }
    }
    
    console.log(`📊 Total images: ${totalImages}`);
    
    console.log('\n' + '='.repeat(50));
    
    if (allGood) {
        console.log('🎉 DEPLOYMENT READY!');
        console.log('✅ All required files and directories are present');
        console.log('✅ JSON data files are valid');
        console.log('✅ Configuration files are correct');
        console.log('✅ Image assets are in place');
        console.log('\n🚀 Ready to deploy to Vercel!');
        process.exit(0);
    } else {
        console.log('❌ DEPLOYMENT NOT READY');
        console.log('🔧 Please fix the issues above before deploying');
        process.exit(1);
    }
}

main();
