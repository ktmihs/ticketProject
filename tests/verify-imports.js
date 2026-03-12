#!/usr/bin/env node

/**
 * Import 체인 검증 스크립트
 * 실제로 모든 파일이 제대로 import 되는지 확인
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('🔍 Import 체인 검증 시작');
console.log('='.repeat(60));
console.log('');

let errors = [];
let warnings = [];

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function extractImports(content, filePath) {
  const imports = [];
  
  // import ... from '...' 형식
  const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

function resolveImportPath(importPath, currentFile) {
  const baseDir = '/home/claude/ticket-service-v3/frontend/src';
  
  // @/ alias
  if (importPath.startsWith('@/')) {
    return path.join(baseDir, importPath.replace('@/', ''));
  }
  
  // 상대 경로
  if (importPath.startsWith('.')) {
    const currentDir = path.dirname(currentFile);
    return path.join(currentDir, importPath);
  }
  
  // node_modules (검증 안 함)
  return null;
}

function checkFile(filePath, checked = new Set()) {
  if (checked.has(filePath)) return;
  checked.add(filePath);
  
  const relativePath = filePath.replace('/home/claude/ticket-service-v3/frontend/src/', '');
  
  // 파일 존재 확인
  let actualPath = filePath;
  if (!checkFileExists(actualPath)) {
    // .tsx, .ts 확장자 시도
    const extensions = ['.tsx', '.ts', '.js', '.jsx'];
    let found = false;
    
    for (const ext of extensions) {
      if (checkFileExists(actualPath + ext)) {
        actualPath = actualPath + ext;
        found = true;
        break;
      }
    }
    
    // index 파일 시도
    if (!found) {
      for (const ext of extensions) {
        if (checkFileExists(path.join(actualPath, 'index' + ext))) {
          actualPath = path.join(actualPath, 'index' + ext);
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      errors.push(`❌ 파일 없음: ${relativePath}`);
      return;
    }
  }
  
  // 파일 읽기
  const content = fs.readFileSync(actualPath, 'utf8');
  
  // Import 추출
  const imports = extractImports(content, actualPath);
  
  if (imports.length > 0) {
    console.log(`📄 ${relativePath}`);
    
    imports.forEach(imp => {
      const resolvedPath = resolveImportPath(imp, actualPath);
      
      if (resolvedPath === null) {
        console.log(`  ✅ ${imp} (node_modules)`);
        return;
      }
      
      if (checkFileExists(resolvedPath) || 
          checkFileExists(resolvedPath + '.ts') ||
          checkFileExists(resolvedPath + '.tsx') ||
          checkFileExists(path.join(resolvedPath, 'index.ts')) ||
          checkFileExists(path.join(resolvedPath, 'index.tsx'))) {
        console.log(`  ✅ ${imp}`);
        
        // 재귀적으로 검사
        checkFile(resolvedPath, checked);
      } else {
        console.log(`  ❌ ${imp} → 파일 없음!`);
        errors.push(`❌ Import 오류: ${relativePath} → ${imp}`);
      }
    });
    
    console.log('');
  }
}

// 핵심 파일부터 시작
const entryPoints = [
  '/home/claude/ticket-service-v3/frontend/src/app/page.tsx',
  '/home/claude/ticket-service-v3/frontend/src/app/queue/[showId]/page.tsx',
  '/home/claude/ticket-service-v3/frontend/src/app/purchase/[showId]/page.tsx',
  '/home/claude/ticket-service-v3/frontend/src/app/layout.tsx',
];

console.log('📍 Entry Points 검증');
console.log('-'.repeat(60));
console.log('');

entryPoints.forEach(entry => {
  if (checkFileExists(entry)) {
    console.log(`✅ ${entry.replace('/home/claude/ticket-service-v3/frontend/src/', '')}`);
  } else {
    console.log(`❌ ${entry.replace('/home/claude/ticket-service-v3/frontend/src/', '')}`);
    errors.push(`❌ Entry point 없음: ${entry}`);
  }
});

console.log('');
console.log('🔗 Import 체인 검증');
console.log('-'.repeat(60));
console.log('');

entryPoints.forEach(entry => {
  if (checkFileExists(entry)) {
    checkFile(entry);
  }
});

// package.json 검증
console.log('📦 package.json 검증');
console.log('-'.repeat(60));

const pkgPath = '/home/claude/ticket-service-v3/frontend/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const requiredDeps = [
  'next',
  'react',
  'react-dom',
  '@reduxjs/toolkit',
  'react-redux',
  'redux-persist',
  '@tanstack/react-query',
  'axios', // ← 중요!
];

requiredDeps.forEach(dep => {
  if (pkg.dependencies[dep]) {
    console.log(`✅ ${dep}: ${pkg.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep}: 없음!`);
    errors.push(`❌ package.json에 ${dep} 없음`);
  }
});

console.log('');

// 결과 출력
console.log('='.repeat(60));
console.log('📊 검증 결과');
console.log('='.repeat(60));

if (errors.length === 0) {
  console.log('');
  console.log('🎉 모든 검증 통과!');
  console.log('');
  console.log('✅ 모든 파일 존재');
  console.log('✅ 모든 import 정상');
  console.log('✅ 모든 의존성 설치됨');
  console.log('');
  process.exit(0);
} else {
  console.log('');
  console.log(`❌ ${errors.length}개 오류 발견:`);
  console.log('');
  errors.forEach(err => console.log(err));
  console.log('');
  process.exit(1);
}
