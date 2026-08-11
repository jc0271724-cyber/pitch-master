'use strict';
const fs = require('fs');
const path = require('path');
const root = __dirname;

function readSrc(f) {
  const p = path.join(root, 'src', f);
  if (!fs.existsSync(p)) return '';
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(/^import\b.*?;\s*$/gm, '');
  code = code.replace(/^export\s+(?:default\s+)?(?=(?:class|function|const|let|var)\b)/gm, '');
  code = code.replace(/^export\s+default\s+/gm, '');
  code = code.replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '');
  // Remove service worker blocks
  code = code.replace(/\/\/[^\n]*(?:service.?worker|PWA)[^\n]*\n[\s\S]*?if\s*\(['"]serviceWorker['"]\s+in\s+navigator\s*\)\s*\{[\s\S]*?\n\s*\}\s*\n?/gi, '\n');
  code = code.replace(/if\s*\(['"]serviceWorker['"]\s+in\s+navigator\s*\)\s*\{[\s\S]*?\n\s*\}/g, '');
  code = code.replace(/navigator\.serviceWorker\.register\s*\([^)]*\)\s*\.then[\s\S]*?\}\s*\)\s*;?/g, '');
  code = code.replace(/navigator\.serviceWorker\.[^;]+;/g, '');
  return code;
}

const CSS   = fs.readFileSync(path.join(root, 'src', 'style.css'), 'utf8');
const SYNTH   = readSrc('synth.js');
const PITCH   = readSrc('pitch.js');
const STAFF   = readSrc('staff.js');
const TEACHER = readSrc('teacher.js');
const APP     = readSrc('app.js');

// Extract body content from src/index.html
let srcHTML = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const bodyMatch = srcHTML.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
let bodyContent = bodyMatch ? bodyMatch[1] : srcHTML;
// Remove module scripts, SW scripts, external stylesheet/manifest links
bodyContent = bodyContent
  .replace(/<script\s+type="module"[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script[^>]*>[\s\S]*?serviceWorker[\s\S]*?<\/script>/gi, '')
  .replace(/<link[^>]+manifest[^>]*>/gi, '')
  .replace(/<link[^>]+logo\.svg[^>]*>/gi, '')
  .trim();

const JS = `'use strict';
// ===== Shared Audio Context =====
function getSharedAudioContext(){if(!window._sharedAC){const AC=window.AudioContext||window.webkitAudioContext;window._sharedAC=new AC();}return window._sharedAC;}

${SYNTH}
${PITCH}
${STAFF}
${TEACHER}
${APP}
`;

const FINAL = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>PitchMaster &#x2013; Sing &amp; Learn Sheet Music</title>
<meta name="description" content="Learn to read sheet music, sing on pitch, master movable-Do solfege, and train rhythm with real-time feedback.">
<meta name="theme-color" content="#09090b">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;700;800&family=Plus+Jakarta+Sans:wght@700&display=swap" rel="stylesheet">
<style>
${CSS}
</style>
</head>
<body>
${bodyContent}
<script>
${JS}
</script>
</body>
</html>`;

const outPath = path.join(root, 'index.html');
fs.writeFileSync(outPath, FINAL, 'utf8');

const size = Math.round(FINAL.length / 1024);
const checks = {
  'Size KB'          : size,
  'getSharedAudio'   : FINAL.includes('getSharedAudioContext'),
  'class MusicSynth' : FINAL.includes('class MusicSynth'),
  'class AppController': FINAL.includes('class AppController'),
  'getNoteSpelling'  : FINAL.includes('getNoteSpelling'),
  'singSyllable'     : FINAL.includes('singSyllable'),
  'serviceWorker'    : FINAL.includes('serviceWorker.register'),
  'import {'         : FINAL.includes('import {'),
  'type=module'      : FINAL.includes('type="module"'),
};
Object.entries(checks).forEach(([k,v]) => console.log(k + ':', v));
