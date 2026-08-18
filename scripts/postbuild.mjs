import { copyFileSync, writeFileSync, existsSync } from 'node:fs';

const buildDir = 'build';

if (!existsSync(`${buildDir}/index.html`)) {
  console.error('build/index.html tidak ditemukan. Jalankan `bun run build` dulu.');
  process.exit(1);
}

// 1) 404.html = salinan index.html agar host statis (GitHub Pages, Netlify,
//    static server tanpa SPA rewrite) menampilkan SPA untuk route yang tak dikenal.
copyFileSync(`${buildDir}/index.html`, `${buildDir}/404.html`);

// 2) _routes.json untuk Cloudflare Pages: arahkan semua route ke SPA,
//    kecuali aset hasher (_app/*) sehingga tidak bentrok dengan file statis.
const routes = {
  version: 1,
  include: ['/*'],
  exclude: ['/_app/*', '/favicon.png', '/robots.txt']
};
writeFileSync(`${buildDir}/_routes.json`, JSON.stringify(routes, null, 2));

console.log('✓ SPA fallback ditulis: build/404.html & build/_routes.json');
