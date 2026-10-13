import { readFileSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const root = fileURLToPath(new URL('../', import.meta.url));
const rootManifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
export const workspaces = rootManifest.workspaces.map((directory) => ({
  directory,
  path: resolve(root, directory),
  manifest: JSON.parse(readFileSync(resolve(root, directory, 'package.json'), 'utf8')),
}));

const prefix = '@variant-chess/';
const pureRuntimeDependencies = {
  'shared-types': ['zod'],
  'game-core': [],
  'game-variants': [],
  'game-testkit': [],
};
export const allowedDependencies = {
  'shared-types': [],
  'game-core': ['shared-types'],
  'game-variants': ['shared-types', 'game-core'],
  'game-testkit': ['shared-types', 'game-core', 'game-variants'],
  backend: ['shared-types', 'game-core', 'game-variants'],
  frontend: ['shared-types'],
};

function contains(parent, target) {
  const path = relative(parent, target);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !path.startsWith(sep));
}

function packageName(specifier) {
  return specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0];
}

export function importViolation(workspace, file, specifier, resolvedFile) {
  const shortName = workspace.manifest.name.slice(prefix.length);
  const testing = /(?:[/\\]tests[/\\]|\.test\.[cm]?[jt]sx?$)/.test(file);
  const source = contains(resolve(workspace.path, 'src'), file);
  const production = source && !testing;
  const normalized = specifier.replaceAll('\\', '/');
  if (
    normalized.includes('reference/') ||
    (resolvedFile && contains(resolve(root, 'reference'), resolvedFile))
  ) {
    return 'legacy source is read-only and cannot be imported';
  }
  if (resolvedFile && !contains(workspace.path, resolvedFile)) {
    const target = workspaces.find((item) => contains(item.path, resolvedFile));
    if (target && !specifier.startsWith(prefix))
      return 'cross-workspace imports must use public package exports';
  }
  if (specifier.startsWith('.')) {
    const target = resolve(dirname(file), specifier);
    return contains(workspace.path, target) ? undefined : 'relative import escapes its workspace';
  }
  if (specifier.startsWith('/') || /^[A-Za-z]:/.test(specifier))
    return 'absolute imports are forbidden';
  if (specifier.startsWith(prefix)) {
    const dependency = packageName(specifier);
    const targetName = dependency.slice(prefix.length);
    if (specifier !== dependency) return 'workspace internals are not public exports';
    const allowed = allowedDependencies[shortName] ?? [];
    if (
      targetName !== shortName &&
      !allowed.includes(targetName) &&
      !(testing && targetName === 'game-testkit')
    ) {
      return `${dependency} is outside the allowed dependency graph`;
    }
  }
  const builtin = specifier.startsWith('node:') || builtinModules.includes(specifier);
  if (builtin) {
    return source && ['shared-types', 'game-core', 'game-variants'].includes(shortName)
      ? 'pure runtime packages cannot import Node infrastructure'
      : undefined;
  }
  const dependency = packageName(specifier);
  if (
    production &&
    pureRuntimeDependencies[shortName] &&
    !specifier.startsWith(prefix) &&
    !pureRuntimeDependencies[shortName].includes(dependency)
  ) {
    return `${dependency} is forbidden in this pure runtime package`;
  }
  if (workspace.manifest.dependencies?.[dependency]) return undefined;
  if (
    !production &&
    (workspace.manifest.devDependencies?.[dependency] || rootManifest.devDependencies?.[dependency])
  )
    return undefined;
  return `undeclared runtime dependency: ${dependency}`;
}

export function inspectSource(workspace, file, text, compilerOptions = {}) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const violations = [];
  function check(node) {
    let literal;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      literal = node.moduleSpecifier;
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference))
      literal = node.moduleReference.expression;
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
      literal = node.argument.literal;
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      literal = node.arguments[0];
      if (!literal || !ts.isStringLiteralLike(literal))
        violations.push('non-literal module loading cannot be audited');
    }
    if (literal && ts.isStringLiteralLike(literal)) {
      const resolvedFile = ts.resolveModuleName(literal.text, file, compilerOptions, ts.sys)
        .resolvedModule?.resolvedFileName;
      const violation = importViolation(workspace, file, literal.text, resolvedFile);
      if (violation) violations.push(`${literal.text}: ${violation}`);
    }
    ts.forEachChild(node, check);
  }
  check(source);
  return violations;
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', '.next'].includes(entry.name)) return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.[cm]?[jt]sx?$/.test(entry.name)
        ? [path]
        : [];
  });
}

export function checkBoundaries() {
  const violations = [];
  const names = workspaces.map((workspace) => workspace.manifest.name.slice(prefix.length)).sort();
  if (JSON.stringify(names) !== JSON.stringify(Object.keys(allowedDependencies).sort())) {
    violations.push('expected exactly the six approved workspaces, without duplicates');
  }
  for (const workspace of workspaces) {
    const shortName = workspace.manifest.name.slice(prefix.length);
    for (const [kind, dependencies] of Object.entries({
      runtime: workspace.manifest.dependencies,
      development: workspace.manifest.devDependencies,
    })) {
      for (const [dependency, version] of Object.entries(dependencies ?? {})) {
        if (typeof version === 'string' && /(?:file:|link:).*reference[/\\]/.test(version)) {
          violations.push(`${workspace.directory}: legacy source cannot be a dependency`);
        }
        if (!dependency.startsWith(prefix)) {
          if (
            kind === 'runtime' &&
            pureRuntimeDependencies[shortName] &&
            !pureRuntimeDependencies[shortName].includes(dependency)
          ) {
            violations.push(
              `${workspace.directory}: forbidden pure runtime dependency ${dependency}`,
            );
          }
          continue;
        }
        const allowed = allowedDependencies[shortName] ?? [];
        if (
          !allowed.includes(dependency.slice(prefix.length)) &&
          !(
            kind === 'development' &&
            dependency === `${prefix}game-testkit` &&
            shortName === 'backend'
          )
        ) {
          violations.push(`${workspace.directory}: forbidden ${kind} dependency ${dependency}`);
        }
      }
    }
    const configPath = resolve(workspace.path, 'tsconfig.json');
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, workspace.path);
    for (const file of sourceFiles(workspace.path)) {
      if (!contains(resolve(workspace.path, 'src'), file) && !file.includes(`${sep}tests${sep}`))
        continue;
      violations.push(
        ...inspectSource(workspace, file, readFileSync(file, 'utf8'), parsed.options).map(
          (message) => `${relative(root, file)}: ${message}`,
        ),
      );
    }
  }
  return violations;
}
