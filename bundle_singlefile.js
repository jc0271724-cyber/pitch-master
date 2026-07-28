import fs from 'fs';
import path from 'path';

const distDir = 'dist';
const assetsDir = path.join(distDir, 'assets');
const htmlPath = path.join(distDir, 'index.html');

let html = fs.readFileSync(htmlPath, 'utf8');

const files = fs.readdirSync(assetsDir);
const cssFile = files.find(f => f.endsWith('.css'));
const jsFile = files.find(f => f.endsWith('.js'));

if (cssFile) {
  const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
  html = html.replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, `<style>${css}</style>`);
}

if (jsFile) {
  const js = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
  html = html.replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, `<script type="module">${js}</script>`);
}

const outputPath = 'pitchmaster-standalone-offline.html';
fs.writeFileSync(outputPath, html, 'utf8');

console.log('Single-file offline HTML app updated successfully at:', outputPath);

