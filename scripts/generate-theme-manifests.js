const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const manifestsDir = path.join(repoRoot, 'src/lib/theme/manifests');
const outputFile = path.join(repoRoot, 'src/lib/theme/generated-manifests.ts');

const MANIFEST_FILE_PATTERN = /^(?!.*(?:backup|\.backup|\.test|\.spec))(?!index\.)[A-Za-z0-9-_.]+\.(?:ts|tsx|js|mjs)$/;

function toImportPath(filename) {
  return `./manifests/${filename.replace(/\.(ts|tsx|js|mjs)$/, '')}`;
}

function getManifestFiles() {
  return fs
    .readdirSync(manifestsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && MANIFEST_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function buildOutput(manifestFiles) {
  const importLines = manifestFiles.map(
    (filename, index) => `import * as manifestModule${index} from '${toImportPath(filename)}';`
  );

  const extractLines = manifestFiles.map(
    (filename, index) =>
      `  extractTenantThemeManifest(manifestModule${index}, '${toImportPath(filename)}'),`
  );

  return `import type { TenantThemeManifest } from './types';
${importLines.join('\n')}

type ManifestModule = Record<string, unknown>;

function isThemeMode(value: unknown): value is 'light' | 'dark' {
  return value === 'light' || value === 'dark';
}

function isTenantThemeManifest(value: unknown): value is TenantThemeManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<TenantThemeManifest>;

  return (
    typeof candidate.tenantSlug === 'string' &&
    candidate.tenantSlug.length > 0 &&
    typeof candidate.themeName === 'string' &&
    candidate.themeName.length > 0 &&
    isThemeMode(candidate.defaultMode) &&
    Array.isArray(candidate.supports) &&
    candidate.supports.every(isThemeMode) &&
    !!candidate.identity &&
    typeof candidate.identity.siteName === 'string' &&
    !!candidate.modes &&
    typeof candidate.modes === 'object'
  );
}

function extractTenantThemeManifest(module: ManifestModule, modulePath: string): TenantThemeManifest {
  const manifest = Object.values(module).find(isTenantThemeManifest);

  if (!manifest) {
    throw new Error(\`Theme manifest module \${modulePath} does not export a valid manifest.\`);
  }

  return manifest;
}

export const generatedThemeManifests: TenantThemeManifest[] = [
${extractLines.join('\n')}
];
`;
}

function main() {
  const manifestFiles = getManifestFiles();
  const output = buildOutput(manifestFiles);
  fs.writeFileSync(outputFile, output, 'utf8');
}

main();
