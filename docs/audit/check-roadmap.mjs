#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const TASK_ID = /^G\d+\.\d+[a-z]?$/;
const TASK_ID_IN_TEXT = /G\d+\.\d+[a-z]?/g;
const MERMAID_NODE_ID = /^G\d+_\d+[a-z]?$/;

function parseTableRow(line) {
  if (!line.trim().startsWith('|')) return null;
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function normalizeTaskId(taskId) {
  return taskId.replace('.', '_');
}

function denormalizeTaskId(nodeId) {
  return nodeId.replace('_', '.');
}

function addDuplicateErrors(values, label, errors) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(`duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function expectedFindingIds() {
  const ranges = {
    A: 16,
    B: 5,
    C: 1,
    D: 9,
    E: 2,
    F: 4,
    G: 4,
    H: 3,
  };
  return Object.entries(ranges).flatMap(([prefix, count]) =>
    Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(2, '0')}`),
  );
}

function findMermaidBlock(markdown) {
  const dependencySection = markdown.match(/## 6\. Sơ đồ phụ thuộc[\s\S]*?```mermaid\s*([\s\S]*?)```/);
  if (!dependencySection) throw new Error('missing Mermaid dependency block under section 6');
  return dependencySection[1];
}

function assertDag(taskIds, edges, errors) {
  const incoming = new Map(taskIds.map((taskId) => [taskId, 0]));
  const outgoing = new Map(taskIds.map((taskId) => [taskId, []]));

  for (const edge of edges) {
    const [from, to] = edge.split('->');
    if (!incoming.has(from) || !incoming.has(to)) continue;
    incoming.set(to, incoming.get(to) + 1);
    outgoing.get(from).push(to);
  }

  const queue = [...incoming.entries()]
    .filter(([, count]) => count === 0)
    .map(([taskId]) => taskId);
  let visited = 0;

  while (queue.length > 0) {
    const taskId = queue.shift();
    visited += 1;
    for (const dependent of outgoing.get(taskId)) {
      const nextCount = incoming.get(dependent) - 1;
      incoming.set(dependent, nextCount);
      if (nextCount === 0) queue.push(dependent);
    }
  }

  if (visited !== taskIds.length) {
    const cyclicIds = [...incoming.entries()]
      .filter(([, count]) => count > 0)
      .map(([taskId]) => taskId)
      .sort();
    errors.push(`dependency graph contains a cycle involving: ${cyclicIds.join(', ')}`);
  }
}

export function lintRoadmap(markdown) {
  const errors = [];
  const rows = markdown.split(/\r?\n/).map(parseTableRow).filter(Boolean);
  const mappingSection = markdown.match(/## 4\. Mapping Q-01\.\.Q-35([\s\S]*?)\n## 5\./);
  if (!mappingSection) errors.push('missing decision/finding mapping section 4');
  const mappingRows = (mappingSection?.[1] ?? '')
    .split(/\r?\n/)
    .map(parseTableRow)
    .filter(Boolean);

  const taskRows = rows.filter((row) => TASK_ID.test(row[0] ?? ''));
  const taskIds = taskRows.map((row) => row[0]);
  addDuplicateErrors(taskIds, 'task ID', errors);
  const taskSet = new Set(taskIds);

  const dependencyEdges = [];
  for (const row of taskRows) {
    if (row.length < 4) {
      errors.push(`task row ${row[0]} has no dependency column`);
      continue;
    }
    const dependencies = row[3].match(TASK_ID_IN_TEXT) ?? [];
    addDuplicateErrors(dependencies, `dependency in ${row[0]}`, errors);
    for (const dependency of dependencies) {
      if (!taskSet.has(dependency)) {
        errors.push(`orphan dependency ID: ${dependency} required by ${row[0]}`);
      }
      dependencyEdges.push(`${dependency}->${row[0]}`);
    }
  }
  addDuplicateErrors(dependencyEdges, 'dependency edge', errors);
  const dependencyEdgeSet = new Set(dependencyEdges);

  let mermaid = '';
  try {
    mermaid = findMermaidBlock(markdown);
  } catch (error) {
    errors.push(error.message);
  }

  const nodeDeclarations = [...mermaid.matchAll(/^\s*(G\d+_\d+[a-z]?)\["(G\d+\.\d+[a-z]?)"\]\s*$/gm)];
  const nodeIds = nodeDeclarations.map((match) => match[1]);
  addDuplicateErrors(nodeIds, 'Mermaid node', errors);
  const nodeSet = new Set(nodeIds);

  for (const match of nodeDeclarations) {
    const [, nodeId, label] = match;
    if (!MERMAID_NODE_ID.test(nodeId) || normalizeTaskId(label) !== nodeId) {
      errors.push(`Mermaid node label mismatch: ${nodeId} labels ${label}`);
    }
    if (!taskSet.has(label)) errors.push(`orphan Mermaid node: ${nodeId}`);
  }

  for (const taskId of taskIds) {
    const nodeId = normalizeTaskId(taskId);
    if (!nodeSet.has(nodeId)) errors.push(`missing Mermaid node for task: ${taskId}`);
  }

  const mermaidEdgeMatches = [...mermaid.matchAll(/^\s*(G\d+_\d+[a-z]?)\s*-->\s*(G\d+_\d+[a-z]?)\s*$/gm)];
  const mermaidEdges = mermaidEdgeMatches.map((match) => {
    const from = denormalizeTaskId(match[1]);
    const to = denormalizeTaskId(match[2]);
    if (!nodeSet.has(match[1])) errors.push(`Mermaid edge references undeclared node: ${match[1]}`);
    if (!nodeSet.has(match[2])) errors.push(`Mermaid edge references undeclared node: ${match[2]}`);
    return `${from}->${to}`;
  });
  addDuplicateErrors(mermaidEdges, 'Mermaid edge', errors);
  const mermaidEdgeSet = new Set(mermaidEdges);

  for (const edge of dependencyEdgeSet) {
    if (!mermaidEdgeSet.has(edge)) errors.push(`missing Mermaid edge: ${edge}`);
  }
  for (const edge of mermaidEdgeSet) {
    if (!dependencyEdgeSet.has(edge)) errors.push(`extra Mermaid edge: ${edge}`);
  }

  const decisionIds = mappingRows
    .map((row) => row[0])
    .filter((value) => /^Q-\d{2}$/.test(value ?? ''));
  addDuplicateErrors(decisionIds, 'decision mapping', errors);
  const expectedDecisions = Array.from({ length: 35 }, (_, index) => `Q-${String(index + 1).padStart(2, '0')}`);
  for (const decisionId of expectedDecisions) {
    if (!decisionIds.includes(decisionId)) errors.push(`missing decision mapping: ${decisionId}`);
  }
  for (const decisionId of decisionIds) {
    if (!expectedDecisions.includes(decisionId)) errors.push(`unexpected decision mapping: ${decisionId}`);
  }

  const findingIds = mappingRows
    .map((row) => row[0])
    .filter((value) => /^[A-H]-\d{2}$/.test(value ?? ''));
  addDuplicateErrors(findingIds, 'finding mapping', errors);
  const expectedFindings = expectedFindingIds();
  for (const findingId of expectedFindings) {
    if (!findingIds.includes(findingId)) errors.push(`missing finding mapping: ${findingId}`);
  }
  for (const findingId of findingIds) {
    if (!expectedFindings.includes(findingId)) errors.push(`unexpected finding mapping: ${findingId}`);
  }

  assertDag(taskIds, dependencyEdges, errors);

  return {
    errors,
    counts: {
      tasks: taskSet.size,
      edges: dependencyEdgeSet.size,
      decisions: new Set(decisionIds).size,
      findings: new Set(findingIds).size,
    },
  };
}

function main() {
  const roadmapPath = process.argv[2];
  if (!roadmapPath) {
    console.error('Usage: node docs/audit/check-roadmap.mjs <roadmap.md>');
    process.exitCode = 2;
    return;
  }

  let markdown;
  try {
    markdown = readFileSync(roadmapPath, 'utf8');
  } catch (error) {
    console.error(`Cannot read roadmap: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  const result = lintRoadmap(markdown);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    console.error(
      `Roadmap lint failed: ${result.counts.tasks} tasks, ${result.counts.edges} dependency edges, ` +
        `${result.counts.decisions} decisions, ${result.counts.findings} findings.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Roadmap lint passed: ${result.counts.tasks} tasks, ${result.counts.edges} dependency edges, ` +
      `${result.counts.decisions} decisions, ${result.counts.findings} findings; DAG is acyclic.`,
  );
}

main();
