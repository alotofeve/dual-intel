#!/usr/bin/env node
/*
 * Blog builder for dual-intel.com (no dependencies).
 *
 *   node build-blog.js
 *
 * Reads every posts/*.md (files starting with "_" are skipped) and writes:
 *   - insights/<slug>.html   one page per post
 *   - the card list in insights.html, between the POSTS:START / POSTS:END markers
 *
 * Post format: see posts/_template.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'posts');
const OUT_DIR = path.join(ROOT, 'insights');
const INDEX_FILE = path.join(ROOT, 'insights.html');
const START = '<!-- POSTS:START -->';
const END = '<!-- POSTS:END -->';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- front matter ----------

function parsePost(file) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter (--- block at top)`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 1) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  for (const k of ['title', 'date', 'summary']) {
    if (!meta[k]) throw new Error(`${file}: front matter is missing "${k}"`);
  }
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(meta.date);
  if (!d) throw new Error(`${file}: date must be YYYY-MM-DD`);
  meta.year = +d[1];
  meta.month = +d[2] - 1;
  meta.slug = file.replace(/\.md$/, '');
  meta.category = meta.category || 'Insights';
  meta.author = meta.author || 'Duo Xu';
  meta.body = m[2];
  return meta;
}

// ---------- minimal markdown ----------

function inline(text) {
  const stash = [];
  const hold = (html) => `\u0000${stash.push(html) - 1}\u0000`;
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, (_, c) => hold(`<code>${c}</code>`));
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => hold(`<img src="${imgSrc(src)}" alt="${alt}" loading="lazy">`));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => hold(`<a href="${href}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`));
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, raw) => {
    const url = raw.replace(/[.,;:!?]+$/, '');
    return pre + hold(`<a href="${url}" target="_blank" rel="noopener">${url}</a>`) + raw.slice(url.length);
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
}

// Post pages live in insights/, so site-relative image paths need "../".
function imgSrc(src) {
  return /^(https?:|\/|\.\.\/)/.test(src) ? src : '../' + src;
}

function markdown(src) {
  const blocks = src.replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
  const out = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    let h;
    if ((h = /^(#{2,3})\s+(.*)$/.exec(lines[0])) && lines.length === 1) {
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    } else if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      out.push(`<ul>\n${lines.map((l) => `  <li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('\n')}\n</ul>`);
    } else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      out.push(`<ol>\n${lines.map((l) => `  <li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('\n')}\n</ol>`);
    } else if (lines.every((l) => /^>\s?/.test(l))) {
      out.push(`<blockquote>${inline(lines.map((l) => l.replace(/^>\s?/, '')).join(' '))}</blockquote>`);
    } else if (/^---+$/.test(block.trim())) {
      out.push('<hr>');
    } else if (/^!\[[^\]]*\]\([^)\s]+\)$/.test(block.trim())) {
      out.push(`<p>${inline(block.trim())}</p>`);
    } else {
      out.push(`<p>${inline(lines.join(' '))}</p>`);
    }
  }
  return out.join('\n\n');
}

// ---------- templates ----------

const indent = (html, n) => html.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');

function renderPost(p) {
  const when = `${MONTHS[p.month]} ${p.year}`;
  const source = p.linkedin
    ? ` · <a href="${esc(p.linkedin)}" target="_blank" rel="noopener">Originally posted on LinkedIn</a>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(p.title)} — Dual Intel</title>
  <meta name="description" content="${esc(p.summary)}" />
  <meta name="theme-color" content="#0b1613">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <nav class="nav">
    <div class="container nav-inner">
      <a class="brand" href="../index.html">
        <img class="brand-logo" src="../images/logo7.webp" alt="Dual Intel">
      </a>
      <div class="nav-links">
        <a href="../index.html">Home</a>
        <a href="../vision.html">Vision</a>
        <a href="../applications.html">Applications</a>
        <a href="../about.html">About</a>
        <a class="active" href="../insights.html">Insights</a>
        <a href="../connect.html">Connect</a>
      </div>
      <a class="btn btn-primary btn-sm nav-cta" href="../connect.html">Get in touch</a>
    </div>
  </nav>

  <main>
    <section class="page-header">
      <div class="container">
        <div class="eyebrow"><span class="dot"></span>${esc(p.category)}</div>
        <h1>${esc(p.title)}</h1>
        <p class="article-meta">By ${esc(p.author)} · ${when}${source}</p>
      </div>
    </section>

    <section class="section">
      <div class="container prose">
${indent(markdown(p.body), 8)}
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container footer-cta">
      <div class="footer-cta-card">
        <h2>Let's build intelligence that stays human</h2>
        <p>Interested in our work, our vision, or a collaboration? We'd love to hear from you.</p>
        <a class="btn btn-primary btn-arrow" href="mailto:admin@dual-intel.com">
          <svg class="icon" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>
          admin@dual-intel.com
        </a>
      </div>
    </div>
    <div class="container footer-inner">
      <a class="brand brand-sm" href="../index.html">
        <span class="brand-mark">D</span>
        &copy; 2026 Dual Intelligence LLC
      </a>
      <div class="footer-links">
        <a href="mailto:admin@dual-intel.com">admin@dual-intel.com</a>
        <a href="https://vibrantintel.com">Vibrant Intel</a>
      </div>
    </div>
  </footer>
</body>
</html>
`;
}

function renderCard(p) {
  return `<a class="card article-card" href="insights/${p.slug}.html">
  <div class="article-meta">${esc(p.category)} · ${MONTHS[p.month].slice(0, 3)} ${p.year}</div>
  <h3>${esc(p.title)}</h3>
  <p>${esc(p.summary)}</p>
</a>`;
}

// ---------- main ----------

const files = fs.existsSync(POSTS_DIR)
  ? fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_'))
  : [];
const posts = files.map(parsePost).sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0));

for (const p of posts) {
  fs.writeFileSync(path.join(OUT_DIR, `${p.slug}.html`), renderPost(p));
}

let index = fs.readFileSync(INDEX_FILE, 'utf8');
const a = index.indexOf(START);
const b = index.indexOf(END);
if (a < 0 || b < a) throw new Error(`insights.html is missing the ${START} / ${END} markers`);
const cards = posts.map((p) => indent(renderCard(p), 8)).join('\n\n');
index = index.slice(0, a + START.length) + (cards ? `\n${cards}\n\n        ` : '\n        ') + index.slice(b);
fs.writeFileSync(INDEX_FILE, index);

console.log(`Built ${posts.length} post(s):`);
for (const p of posts) console.log(`  ${p.date}  insights/${p.slug}.html`);
