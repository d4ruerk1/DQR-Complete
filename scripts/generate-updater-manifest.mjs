#!/usr/bin/env node
/**
 * generate-updater-manifest.mjs
 *
 * Builds the `latest.json` manifest for direct GitHub release updates
 * without requiring asymmetric signature keys or minisign `.sig` files.
 *
 * Usage:
 *   node scripts/generate-updater-manifest.mjs --version 1.0.0 --dir release \
 *       [--repo d4ruerk1/DQR-Complete] [--notes "See the release notes."]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const version = arg('version', process.env.RELEASE_VERSION)?.replace(/^v/, '');
const dir = arg('dir', 'release');
const repo = arg('repo', process.env.GITHUB_REPOSITORY ?? 'd4ruerk1/DQR-Complete');
const notes = arg('notes', 'See the release notes for details.');

if (!version) {
  console.error('error: --version <x.y.z> (or RELEASE_VERSION) is required');
  process.exit(1);
}

// Release artifact matchers per platform
const ARTIFACTS = [
  { match: /\.AppImage(\.tar\.gz)?$/i, os: 'linux' },
  { match: /\.pkg\.tar\.zst$/i, os: 'linux' },
  { match: /\.flatpak$/i, os: 'linux' },
  { match: /\.(dmg|app\.tar\.gz)$/i, os: 'darwin' },
  { match: /\.(exe|msi|msi\.zip|nsis\.zip)$/i, os: 'windows' },
];

function archOf(name) {
  if (/aarch64|arm64/i.test(name)) return 'aarch64';
  return 'x86_64';
}

if (!existsSync(dir)) {
  console.error(`error: directory ${dir} does not exist`);
  process.exit(1);
}

const files = readdirSync(dir);
const platforms = {};

for (const file of files) {
  if (file.endsWith('.sig') || file.includes('-source.')) continue;
  const kind = ARTIFACTS.find((a) => a.os && a.match.test(file));
  if (!kind) continue;

  const target = kind.os === 'linux' ? `linux-${archOf(file)}`
    : kind.os === 'darwin' ? `darwin-${archOf(file)}`
    : `windows-${archOf(file)}`;

  // Direct download URL on GitHub release
  const entry = {
    url: `https://github.com/${repo}/releases/download/v${version}/${basename(file)}`,
  };

  // If a .sig exists locally, include it optionally, but it is not required
  const sigFile = `${file}.sig`;
  if (files.includes(sigFile)) {
    try {
      entry.signature = readFileSync(join(dir, sigFile), 'utf8').trim();
    } catch {
      // ignore optional signature
    }
  }

  // Prefer standalone AppImage / dmg / exe for main platform entry if not yet set
  if (!platforms[target] || /\.AppImage$/i.test(file) || /\.exe$/i.test(file) || /\.dmg$/i.test(file)) {
    platforms[target] = entry;
  }
}

if (Object.keys(platforms).length === 0) {
  console.warn(`warning: no platform artifacts found in ${dir}; creating minimal manifest.`);
  platforms['linux-x86_64'] = {
    url: `https://github.com/${repo}/releases/download/v${version}/DRQ-Complete-${version}-x86_64.AppImage`
  };
  platforms['windows-x86_64'] = {
    url: `https://github.com/${repo}/releases/download/v${version}/DRQ-Complete-${version}-setup.exe`
  };
  platforms['darwin-x86_64'] = {
    url: `https://github.com/${repo}/releases/download/v${version}/DRQ-Complete-${version}.dmg`
  };
}

const manifest = {
  version: `v${version}`,
  notes,
  pub_date: new Date().toISOString(),
  platforms,
};

const out = join(dir, 'latest.json');
writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${out} (direct GitHub release manifest, no signing keys required):`);
console.log(JSON.stringify(manifest, null, 2));
