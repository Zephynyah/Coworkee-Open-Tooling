/**
 * Compiles the application + theme-package SASS into a single stylesheet.
 *
 * Ext JS themes are normally produced by `sencha theme build`, which needs the
 * @sencha/ext-theme-* sources from npm.sencha.com (a Sencha account required).
 * This project builds against the pre-compiled framework in ext/build instead,
 * so build-theme.js assembles the same SASS with plain dart-sass on top of
 * sass/_shims.scss.
 *
 * Sources are concatenated in the order Sencha Cmd uses, so the existing SASS is
 * consumed unmodified:
 *
 *   sass/_shims.scss        - stand-ins for the missing Ext theme mixins
 *   coworkee sass/etc/all   - Sass functions (contrasted()) -- must precede var
 *   coworkee sass/var/all   - project + theme variable overrides
 *   coworkee sass/src/**    - theme package visual themes (ui)
 *   app/**                  - application views
 *
 * Output is written to dist/coworkee.css and referenced from index.html after
 * the stock theme stylesheet, so application rules win the cascade.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const sass = require('sass');

const ROOT = __dirname;
const PKG = path.join(ROOT, 'packages', 'local', 'coworkee', 'sass');
const OUTPUT = path.join(ROOT, 'dist', 'coworkee.css');

/** Recursively collects .scss files under dir, sorted for a stable output. */
function collect(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .reduce((files, entry) => {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return files.concat(collect(full));
      }

      if (entry.isFile() && entry.name.endsWith('.scss')) {
        files.push(full);
      }

      return files;
    }, []);
}

// SASS files declare design tokens at the top of the file and other files consume
// them (e.g. app/view/main/Menu.scss reads $sidebar-icon-size, declared in
// app/view/widgets/Sidebar.scss). Sass evaluates imports in order and has no
// cross-file ordering guarantee, so the app sources are topologically sorted by
// variable dependency rather than imported alphabetically.
function dependencies(file) {
  const src = fs.readFileSync(file, 'utf8');
  const defines = new Set();
  const uses = new Set();

  for (const line of src.split('\n')) {
    // Top-level (unindented) declarations introduce a token; indented lines are
    // inside a rule and only consume one.
    const declaration = /^\$([\w-]+)\s*:/.exec(line);
    if (declaration) {
      defines.add(declaration[1]);
    }

    for (const [, name] of line.matchAll(/\$([\w-]+)/g)) {
      uses.add(name);
    }
  }

  return { defines, uses };
}

/** Orders files so that a token's declaring file is imported before its consumers. */
function orderByVariables(files) {
  const info = files.map(file => ({ file, ...dependencies(file) }));
  const ordered = [];
  const placed = new Set();
  const remaining = new Map(info.map(item => [item.file, item]));

  while (remaining.size) {
    // Prefer the alphabetically first file whose tokens are all resolvable by this
    // point; fall back to the first remaining file so a dependency cycle cannot
    // deadlock the build (the cycle is then simply reported by Sass).
    const ready = info.filter(item =>
      remaining.has(item.file) &&
      [...item.uses].every(name => {
        if (![...remaining.values()].some(other => other.defines.has(name))) {
          return true;
        }
        // Usable only if its definer has already been emitted.
        const definer = info.find(other => other.defines.has(name) && !item.defines.has(name));
        return !definer || placed.has(definer.file);
      })
    );

    const pick = (ready.length ? ready : [...remaining.values()].sort((a, b) =>
      a.file.localeCompare(b.file)
    ))[0];

    ordered.push(pick.file);
    placed.add(pick.file);
    remaining.delete(pick.file);
  }

  return ordered;
}

const appSources = orderByVariables(collect(path.join(ROOT, 'app')));

const sources = [path.join(ROOT, 'sass', '_shims.scss')]
  .concat(collect(path.join(PKG, 'etc')))
  .concat(collect(path.join(PKG, 'var')))
  .concat(collect(path.join(PKG, 'src')))
  .concat(appSources);

const missing = sources.filter(file => !fs.existsSync(file));
if (missing.length) {
  console.error('build-theme: missing SASS source(s):\n  ' + missing.join('\n  '));
  process.exit(1);
}

// These SASS files deliberately share global state: sass/var/all.scss declares
// variables that sass/src/** and app/** dereference, so they must all load into
// one scope. dart-sass' module system (@use) would isolate them, therefore the
// entry file below stitches them together with legacy @import, in dependency
// order. Absolute paths keep each file unambiguous regardless of load path.
const entryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coworkee-theme-'));
const entry = path.join(entryDir, 'entry.scss');

fs.writeFileSync(
  entry,
  sources
    .map(file => '@import "' + file.split(path.sep).join('/') + '";')
    .join('\n') + '\n',
  'utf8'
);

let result;
try {
  result = sass.compile(entry, {
    loadPaths: [ROOT],
    style: 'expanded',
    charset: false,
    quietDeps: true,
    // The application SASS predates dart-sass and uses @import, global colour
    // functions, slash division and the legacy JS API; those are expected here.
    silenceDeprecations: [
      'import',
      'if-function',
      'global-builtin',
      'color-functions',
      'slash-div',
      'abs-percent',
      'function-units',
      'legacy-js-api'
    ]
  });
} finally {
  fs.rmSync(entryDir, { recursive: true, force: true });
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, result.css, 'utf8');

const kb = (Buffer.byteLength(result.css, 'utf8') / 1024).toFixed(1);
console.log(
  'build-theme: compiled ' + sources.length + ' SASS files -> dist/coworkee.css (' + kb + ' kB)'
);