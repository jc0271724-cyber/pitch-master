const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Remove the service worker registration block — sw.js doesn't exist at root,
// the failed registration throws errors on mobile Safari that can stall audio
html = html.replace(
  /\/\/ PWA Service Worker Registration[\s\S]*?if \('serviceWorker' in navigator\)[\s\S]*?\}\s*\}/,
  '// Service worker disabled (no sw.js present)\n'
);

// Also strip any <link rel="manifest"> since manifest.json doesn't exist either
html = html.replace(/<link rel="manifest"[^>]*>/g, '');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Patched. Size:', Math.round(html.length/1024), 'KB');
console.log('Has serviceWorker register:', html.includes("serviceWorker.register"));
console.log('Has manifest link:', html.includes('rel="manifest"'));
