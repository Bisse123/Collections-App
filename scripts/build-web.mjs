// Builds the website into dist/ ready for GitHub Pages: runs `expo export -p web`, then copies
// index.html to 404.html so that opening or refreshing a deep link (e.g. /collection/<id>) loads the
// app, and adds .nojekyll so GitHub Pages serves the _expo/ folder.
import { execSync } from 'node:child_process';
import { copyFileSync, writeFileSync } from 'node:fs';

execSync('npx expo export -p web', { stdio: 'inherit' });
copyFileSync('dist/index.html', 'dist/404.html');
writeFileSync('dist/.nojekyll', '');
