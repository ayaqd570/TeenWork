#!/usr/bin/env node
/* TeenWork build step: fewer, smaller files for the browser, with the code itself left exactly as written.

     node tools/build.cjs            make assets/build/* and refresh index.html
     node tools/build.cjs --check    change nothing; exit 1 when the built files are out of date
     node tools/build.cjs --stats    also print sizes

   What to edit: the files in assets/js and assets/css, as always. tools/bundles.json says which built
   file each of them goes into, and in which order. After any edit, run this and commit the result.
   The site loads only the built files, so an edit that is not followed by a build does not reach the site.

   What the build does, and how it stays safe:
   - JavaScript is copied token for token. Only comments, indentation and spaces the language does not
     need are removed; every line break stays. Each result is parsed again and its syntax tree must equal
     the original's exactly, or the build stops.
   - Files that are joined into one file must be "self-contained": nothing but expression statements at
     the top level (in practice one wrapped function each), so joining cannot change which names exist
     when. Each one runs inside its own try block, so an error in one still leaves the others running,
     as it did when they were separate files. Files that declare top-level names (app-04.js, app-05.js)
     are never joined; they stay one file each.
   - Nothing may need newer JavaScript than the base app already needs (ES2020), and no regex lookbehind
     (iPhones before iOS 16.4 cannot read it). In a joined file one unreadable line would stop every
     script in that file, not just its own.
   - Style sheets are joined in order. Only comments, indentation and blank lines are removed.
   No packages to install: the parser (acorn, MIT licence) is in tools/vendor. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const acorn = require('./vendor/acorn.js');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = 'tools/bundles.json';
const OUT = 'assets/build';
const ECMA = 2020;
const tt = acorn.tokTypes;

class BuildError extends Error {}
const fail = msg => { throw new BuildError(msg); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = f => fs.existsSync(path.join(ROOT, f));
const hashOf = text => crypto.createHash('sha256').update(text).digest('hex').slice(0, 10);
const lineOf = (code, pos) => code.slice(0, pos).split('\n').length;

/* ───────────────────────── JavaScript ───────────────────────── */

function parseJs(code, file, extra) {
  try { return acorn.parse(code, Object.assign({ ecmaVersion: ECMA, sourceType: 'script' }, extra)); }
  catch (e) {
    let newer = false;
    try { acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' }); newer = true; } catch (e2) { /* a real syntax error */ }
    fail(file + ': ' + e.message + (newer
      ? '\n  This is JavaScript newer than ES' + ECMA + ', which the rest of the app does not need. Older phones that cannot read it would lose every script in the same built file. Write it the older way.'
      : '\n  The file has a syntax error.'));
  }
}

// Exact comparison of two syntax trees (positions aside).
function sameAst(a, b, where) {
  if (a === b) return null;
  if (a instanceof RegExp || b instanceof RegExp) return String(a) === String(b) ? null : where;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return (a !== a && b !== b) ? null : where;
  if (Array.isArray(a) !== Array.isArray(b)) return where;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return where + ' (length)';
    for (let i = 0; i < a.length; i++) { const d = sameAst(a[i], b[i], where + '[' + i + ']'); if (d) return d; }
    return null;
  }
  const ka = Object.keys(a).filter(k => k !== 'start' && k !== 'end');
  const kb = Object.keys(b).filter(k => k !== 'start' && k !== 'end');
  if (ka.length !== kb.length) return where + ' (shape)';
  for (const k of ka) { const d = sameAst(a[k], b[k], where + '.' + k); if (d) return d; }
  return null;
}

const WORD = /[A-Za-z0-9_$\\]|[^\x00-\x7f]/;
const OPER = /[+\-*/%<>=!&|^~?:.]/;
function needsSpace(prev, a, b) {
  const x = a[a.length - 1], y = b[0];
  if (WORD.test(x) && WORD.test(y)) return true;            // two words would run together
  if (OPER.test(x) && OPER.test(y)) return true;            // "+ +" must not become "++", "/ /" not "//", …
  if (prev.type === tt.num && y === '.') return true;       // "1 .toFixed()"
  if (prev.type === tt.regexp && WORD.test(y)) return true; // "/x/ in y": the word would read as regex flags
  return false;
}

/* Copies the code token by token. Between two tokens it writes a line break if there was one (inside a
   comment counts), otherwise a single space if the two tokens need one, otherwise nothing. */
function stripJs(code, file) {
  const tokens = [];
  const ast = parseJs(code, file, { onToken: tokens });
  let out = '', prev = null, prevText = '';
  for (const t of tokens) {
    if (t.type === tt.eof) break;
    if (t.type === tt.regexp && /\(\?<[=!]/.test(t.value.pattern)) {
      fail(file + ' line ' + lineOf(code, t.start) + ': this regex uses lookbehind, (?<= or (?<!. iPhones before iOS 16.4 cannot read it, and in a built file that would stop every script in the file. Write it another way.');
    }
    const text = code.slice(t.start, t.end);
    if (prev) {
      const gap = code.slice(prev.end, t.start);
      if (gap) out += /[\n\r\u2028\u2029]/.test(gap) ? '\n' : (needsSpace(prev, prevText, text) ? ' ' : '');
    }
    out += text; prev = t; prevText = text;
  }
  out += '\n';
  const diff = sameAst(ast, parseJs(out, file + ' (after removing comments and spaces)'), 'program');
  if (diff) fail(file + ': the smaller copy does not read the same as the original at ' + diff + '. This is a fault in tools/build.cjs, not in the file.');
  return { code: out, ast };
}

// What a file puts at the top level of the page: names it declares, and whether it could be joined with others.
function topLevel(ast) {
  const declares = { functions: [], vars: [], lexical: [] };
  let joinable = true, why = '';
  for (const n of ast.body) {
    if (n.type === 'ExpressionStatement' && !n.directive) continue;
    if (n.type === 'EmptyStatement') continue;
    joinable = false;
    if (n.directive) { why = why || 'a top-level "' + n.directive + '"'; continue; }
    if (n.type === 'FunctionDeclaration') { declares.functions.push(n.id.name); why = why || 'top-level function ' + n.id.name; }
    else if (n.type === 'ClassDeclaration') { declares.lexical.push(n.id.name); why = why || 'top-level class ' + n.id.name; }
    else if (n.type === 'VariableDeclaration') {
      const names = [];
      const collect = p => { if (!p) return; if (p.type === 'Identifier') names.push(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach(q => collect(q.value || q.argument)); else if (p.type === 'ArrayPattern') p.elements.forEach(collect); else if (p.type === 'AssignmentPattern') collect(p.left); else if (p.type === 'RestElement') collect(p.argument); };
      n.declarations.forEach(d => collect(d.id));
      (n.kind === 'var' ? declares.vars : declares.lexical).push(...names);
      why = why || 'top-level ' + n.kind + ' ' + names[0];
    } else why = why || 'a top-level ' + n.type;
  }
  return { declares, joinable, why };
}

/* ───────────────────────── style sheets ───────────────────────── */

function stripCss(css, file) {
  if (/@import|@charset|@namespace/i.test(css)) fail(file + ': @import, @charset and @namespace only work at the very top of a style sheet, so they cannot be joined. Take them out.');
  let out = '', i = 0, depth = 0, str = null;
  const n = css.length, isSpace = ch => ch === undefined || /\s/.test(ch);
  while (i < n) {
    const c = css[i];
    if (str) {
      if (c === '\\') { if (css[i + 1] === '\n' || css[i + 1] === '\r') fail(file + ': a text value continues on the next line with a backslash; put it on one line.'); out += c + (css[i + 1] || ''); i += 2; continue; }
      if (c === '\n') fail(file + ' line ' + lineOf(css, i) + ': a quoted text is never closed.');
      if (c === str) str = null;
      out += c; i++; continue;
    }
    if (c === '"' || c === "'") { str = c; out += c; i++; continue; }
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) fail(file + ' line ' + lineOf(css, i) + ': a comment is never closed.');
      // A comment with something on both sides separates two pieces of text, so it stays. Any other comment goes.
      if (!isSpace(out[out.length - 1]) && !isSpace(css[end + 2])) out += css.slice(i, end + 2);
      i = end + 2; continue;
    }
    if ((c === 'u' || c === 'U') && /^url\(/i.test(css.slice(i, i + 4))) {
      const m = /^url\(\s*/i.exec(css.slice(i, i + 200));
      const start = i + m[0].length;
      if (css[start] !== '"' && css[start] !== "'") {
        const end = css.indexOf(')', start);
        if (end < 0) fail(file + ' line ' + lineOf(css, i) + ': url( is never closed.');
        checkUrl(css.slice(start, end).trim(), file);
        out += css.slice(i, end + 1); i = end + 1; continue;
      }
      const close = css.indexOf(css[start], start + 1);
      checkUrl(css.slice(start + 1, close < 0 ? n : close), file);
    }
    if (c === '{') depth++;
    else if (c === '}' && --depth < 0) fail(file + ' line ' + lineOf(css, i) + ': a } without a {.');
    out += c; i++;
  }
  if (str) fail(file + ': a quoted text is never closed.');
  if (depth !== 0) fail(file + ': ' + depth + ' { never closed. In a joined file that would swallow the style sheets after it.');
  out = out.split('\n').map(l => l.replace(/^[ \t\r]+|[ \t\r]+$/g, '')).filter(Boolean).join('\n');
  if (out && !/[};]$/.test(out)) fail(file + ': the file ends in the middle of a rule. In a joined file that would break the first rule of the next style sheet.');
  return out + '\n';
}
function checkUrl(u, file) {
  if (!u || /^(data:|https?:|\/|\.\.\/|#)/i.test(u)) return;
  fail(file + ': url(' + u + ') is relative to assets/css, but the built file is in ' + OUT + '. Start it with ../ or /.');
}

/* ───────────────────────── the build ───────────────────────── */

const BANNER = name => '/* TeenWork ' + name + ' — a built file, do not edit. Edit the files named below (assets/js, assets/css), then run: node tools/build.cjs */\n';
const CATCH = '}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}\n';

function loadManifest() {
  const m = JSON.parse(read(MANIFEST));
  if (!Array.isArray(m.scripts) || !Array.isArray(m.styles)) fail(MANIFEST + ' needs "scripts" and "styles" lists.');
  return m;
}

/* opts.probe (tests only): calls window.__twProbe(file, 0) before and (file, 1) after each source file. */
function build(opts) {
  opts = opts || {};
  const manifest = loadManifest();
  const files = {};          // built path -> content
  const units = [];          // in page order
  const seen = new Set();
  const lexicalNames = [];   // top-level let/const/class names (not on window; tests read them by name)
  const probe = (f, k) => opts.probe ? '__twProbe(' + JSON.stringify(f) + ',' + k + ');\n' : '';
  const take = f => { if (seen.has(f)) fail(MANIFEST + ': ' + f + ' is listed twice.'); if (!exists(f)) fail(MANIFEST + ': ' + f + ' does not exist.'); seen.add(f); return read(f); };

  for (const u of manifest.scripts) {
    if (u.inline) {
      const s = stripJs(take(u.inline), u.inline);
      const body = probe(u.inline, 0) + s.code + probe(u.inline, 1);
      if (/<\/script|<!--/i.test(body)) fail(u.inline + ': contains "</script" or "<!--", so it cannot sit inside the page. List it under "file" in ' + MANIFEST + ' instead.');
      lexicalNames.push(...topLevel(s.ast).declares.lexical);
      units.push({ kind: 'inline', src: u.inline, code: body.replace(/\n$/, '') });
      continue;
    }
    if (!u.file || !Array.isArray(u.from) || !u.from.length) fail(MANIFEST + ': every script entry needs "inline", or "file" with a "from" list.');
    const name = OUT + '/' + u.file + '.js';
    let text = BANNER(u.file + '.js');
    for (const f of u.from) {
      const s = stripJs(take(f), f), top = topLevel(s.ast);
      lexicalNames.push(...top.declares.lexical);
      if (u.from.length === 1) { text += '/* ' + f + ' */\n' + probe(f, 0) + s.code + probe(f, 1); continue; }
      if (!top.joinable) fail(f + ' has ' + top.why + ', so it cannot be joined with other files (the names it declares would exist earlier than they do now). Give it its own "file" entry in ' + MANIFEST + ', or wrap its code in a function.');
      text += '/* ' + f + ' */\ntry{\n' + probe(f, 0) + s.code + probe(f, 1) + CATCH;
    }
    files[name] = text;
    units.push({ kind: 'script', file: name, from: u.from });
  }
  for (const u of manifest.styles) {
    if (!u.file || !Array.isArray(u.from) || !u.from.length) fail(MANIFEST + ': every style entry needs "file" and a "from" list.');
    const name = OUT + '/' + u.file + '.css';
    files[name] = BANNER(u.file + '.css') + u.from.map(f => '/* ' + f + ' */\n' + stripCss(take(f), f)).join('');
    units.push({ kind: 'style', file: name, from: u.from });
  }

  // index.html: fill the inline scripts, stamp each built file's address with a fingerprint of its content
  let html = read('index.html'), cursor = -1;
  const inOrder = (pos, what) => { if (pos < cursor) fail('index.html: ' + what + ' comes earlier in the page than ' + MANIFEST + ' says. The order there must be the order in the page.'); cursor = pos; };
  for (const u of units) {
    if (u.kind === 'inline') {
      const re = new RegExp('(<script\\b[^>]*\\bdata-tw-inline="' + u.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>)([\\s\\S]*?)(</script>)', 'g');
      const hits = [...html.matchAll(re)];
      if (hits.length !== 1) fail('index.html: expected one <script data-tw-inline="' + u.src + '">, found ' + hits.length + '.');
      inOrder(hits[0].index, u.src);
      html = html.slice(0, hits[0].index) + hits[0][1] + '\n' + u.code + '\n' + hits[0][3] + html.slice(hits[0].index + hits[0][0].length);
      continue;
    }
    const re = new RegExp('(<(?:script|link)\\b[^>]*\\b(?:src|href)=")' + u.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\?v=[0-9a-f]*)?(")', 'g');
    const hits = [...html.matchAll(re)];
    if (hits.length !== 1) fail('index.html: expected one tag that loads ' + u.file + ', found ' + hits.length + '.');
    if (u.kind === 'script') inOrder(hits[0].index, u.file);
    u.url = u.file + '?v=' + hashOf(files[u.file]);
    html = html.slice(0, hits[0].index) + hits[0][1] + u.url + hits[0][2] + html.slice(hits[0].index + hits[0][0].length);
  }

  // Every source file is loaded exactly once: through the list, or (not yet built) by its own tag in index.html.
  const direct = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(assets\/(?:js|css)\/[^"?]+)/g)].map(m => m[1]);
  const notes = [];
  for (const f of direct) {
    if (seen.has(f)) fail('index.html still loads ' + f + ' with its own tag, and ' + MANIFEST + ' puts it in a built file too. It would run twice. Remove the tag.');
    if (!exists(f)) fail('index.html loads ' + f + ', which does not exist.');
    notes.push(f + ' is loaded by its own tag in index.html. That works. To make it part of a built file, list it in ' + MANIFEST + ' and remove the tag.');
  }
  for (const dir of ['assets/js', 'assets/css']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) {
      const rel = dir + '/' + f;
      if (!/\.(js|css)$/.test(f) || seen.has(rel) || direct.includes(rel)) continue;
      fail(rel + ' is not loaded by anything: add it to ' + MANIFEST + ' (in the place where it should run).');
    }
  }
  const strays = [...html.matchAll(/\b(?:src|href)="(assets\/build\/[^"?]+)/g)].map(m => m[1]).filter(f => !files[f]);
  if (strays.length) fail('index.html loads ' + strays.join(', ') + ', which ' + MANIFEST + ' does not make.');
  files['index.html'] = html;
  return { files, units, notes, lexicalNames, manifest };
}

/* For tests: the same page with every source file loaded by its own tag again, at the place of its built file. */
function expand(html, manifest) {
  manifest = manifest || loadManifest();
  for (const u of manifest.scripts) {
    if (u.inline) { html = html.replace(new RegExp('<script\\b[^>]*\\bdata-tw-inline="' + u.inline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>[\\s\\S]*?</script>'), () => '<script src="' + u.inline + '"></script>'); continue; }
    html = html.replace(new RegExp('<script\\b[^>]*\\bsrc="' + OUT + '/' + u.file + '\\.js[^"]*"[^>]*></script>'), () => u.from.map(f => '<script src="' + f + '"></script>').join('\n'));
  }
  for (const u of manifest.styles) html = html.replace(new RegExp('<link\\b[^>]*\\bhref="' + OUT + '/' + u.file + '\\.css[^"]*"[^>]*>'), () => u.from.map(f => '<link rel="stylesheet" href="' + f + '">').join('\n'));
  return html;
}

function stale(result) {
  const out = [];
  for (const [f, text] of Object.entries(result.files)) if (!exists(f) || read(f) !== text) out.push(f);
  const dir = path.join(ROOT, OUT);
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (!result.files[OUT + '/' + f]) out.push(OUT + '/' + f + ' (no longer made)');
  return out;
}

function stats(result) {
  const kb = n => (n / 1024).toFixed(0).padStart(6) + ' KB';
  const gz = t => zlib.gzipSync(Buffer.from(t), { level: 6 }).length;
  let lines = [];
  for (const u of result.units) {
    if (u.kind === 'inline') continue;
    const before = u.from.map(read), after = result.files[u.file];
    lines.push(u.file.padEnd(26) + String(u.from.length).padStart(3) + ' files ' + kb(before.reduce((a, t) => a + Buffer.byteLength(t), 0)) + ' →' + kb(Buffer.byteLength(after))
      + '   compressed' + kb(before.reduce((a, t) => a + gz(t), 0)) + ' →' + kb(gz(after)));
  }
  return lines.join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  let result;
  try { result = build(); }
  catch (e) { if (!(e instanceof BuildError)) throw e; console.error('Build stopped.\n' + e.message); process.exit(2); }
  const old = stale(result);
  if (check) {
    if (old.length) { console.error('Out of date: ' + old.join(', ') + '\nA file in assets/js, assets/css, index.html or ' + MANIFEST + ' changed after the last build. Run: node tools/build.cjs — and commit the result.'); process.exit(1); }
    console.log('Built files are up to date (' + (Object.keys(result.files).length - 1) + ' files in ' + OUT + ').');
  } else {
    fs.mkdirSync(path.join(ROOT, OUT), { recursive: true });
    for (const [f, text] of Object.entries(result.files)) if (!exists(f) || read(f) !== text) fs.writeFileSync(path.join(ROOT, f), text);
    for (const f of fs.readdirSync(path.join(ROOT, OUT))) if (!result.files[OUT + '/' + f]) fs.unlinkSync(path.join(ROOT, OUT, f));
    console.log(old.length ? 'Built: ' + old.join(', ') : 'Nothing to do: the built files were already up to date.');
  }
  result.notes.forEach(n => console.log('Note: ' + n));
  if (process.argv.includes('--stats')) console.log(stats(result));
}

module.exports = { build, expand, stale, stripJs, stripCss, topLevel, sameAst, loadManifest, BuildError, ROOT, OUT };
if (require.main === module) main();
