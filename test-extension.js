#!/usr/bin/env node

// Simple test script to validate extension structure
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing MindWell Extension Structure...\n');

// Check required files
const requiredFiles = [
  'manifest.json',
  'popup.html',
  'popup/popup.js',
  'popup/popup.css',
  'background.js',
  'content/content-simple.js'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

// Check manifest.json structure
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  console.log('\n📋 Manifest validation:');
  console.log(`✅ Version: ${manifest.version}`);
  console.log(`✅ Name: ${manifest.name}`);
  console.log(`✅ Manifest version: ${manifest.manifest_version}`);
  
  if (manifest.action && manifest.action.default_popup) {
    console.log(`✅ Popup configured: ${manifest.action.default_popup}`);
  }
  
  if (manifest.background && manifest.background.service_worker) {
    console.log(`✅ Background script: ${manifest.background.service_worker}`);
  }
  
  if (manifest.content_scripts && manifest.content_scripts.length > 0) {
    console.log(`✅ Content scripts: ${manifest.content_scripts.length} configured`);
  }
  
} catch (error) {
  console.log(`❌ Manifest.json error: ${error.message}`);
  allFilesExist = false;
}

// Check for duplicate files
const duplicateFiles = [
  'popup.js' // This should not exist anymore
];

duplicateFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`⚠️  Duplicate file found: ${file} (should be removed)`);
  }
});

console.log('\n🎨 UI Theme Check:');
try {
  const css = fs.readFileSync('popup/popup.css', 'utf8');
  if (css.includes('rgba(0, 122, 255')) {
    console.log('✅ Blue theme colors detected');
  }
  if (css.includes('backdrop-filter: blur')) {
    console.log('✅ Glass morphism effects detected');
  }
  if (css.includes('--font-primary: -apple-system')) {
    console.log('✅ Apple system fonts configured');
  }
} catch (error) {
  console.log(`❌ CSS check failed: ${error.message}`);
}

console.log('\n🔧 JavaScript Logic Check:');
try {
  const popupJs = fs.readFileSync('popup/popup.js', 'utf8');
  if (popupJs.includes('calculateDailyScore')) {
    console.log('✅ Wellness score calculation found');
  }
  if (popupJs.includes('Chart.js') || popupJs.includes('new Chart')) {
    console.log('✅ Chart.js integration found');
  }
  if (popupJs.includes('chrome.runtime.sendMessage')) {
    console.log('✅ Chrome extension API usage found');
  }
} catch (error) {
  console.log(`❌ JavaScript check failed: ${error.message}`);
}

if (allFilesExist) {
  console.log('\n🎉 Extension structure looks good!');
  console.log('\n📝 Next steps:');
  console.log('1. Load the extension in Chrome Developer Mode');
  console.log('2. Test the popup interface');
  console.log('3. Check browser console for any errors');
  console.log('4. Verify tracking functionality on various websites');
} else {
  console.log('\n❌ Some issues found. Please fix them before testing.');
}
