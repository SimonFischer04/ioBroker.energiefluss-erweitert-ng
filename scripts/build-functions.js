'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { minify } = require('terser');

/**
 * @param {string} source JavaScript input.
 * @param {import('terser').MinifyOptions} options Terser settings.
 * @returns {Promise<string>} Generated JavaScript.
 */
async function compile(source, options = {}) {
    const { code } = await minify(source, options);
    if (!code) {
        throw new Error('Terser produced no JavaScript');
    }
    return code;
}

async function build() {
    const root = path.resolve(__dirname, '..');
    // A path to the original NG release bundle can also be supplied when building
    // from the public checkout, which omits private/functions.js.
    const upstream = process.argv[2]
        ? await fs.readFile(process.argv[2], 'utf8')
        : await compile(await fs.readFile(path.join(root, 'private/functions.js'), 'utf8'));
    const formattingOnly = { compress: false, mangle: false };
    const formatted = await compile(upstream, { ...formattingOnly, format: { beautify: true } });
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'energiefluss-ng-'));
    try {
        const filename = path.join(temp, 'functions.js');
        await fs.writeFile(filename, formatted.replace(/[ \t]+$/gm, ''));
        execFileSync('git', ['apply', path.join(root, 'patches/multiple-views.patch')], { cwd: temp });
        const integrated = await fs.readFile(filename, 'utf8');
        const bundle = await compile(integrated, formattingOnly);
        await fs.writeFile(path.join(root, 'www/js/functions.min.js'), bundle);
    } finally {
        await fs.rm(temp, { recursive: true, force: true });
    }
}

build().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
