import type { Edge, Node } from '@xyflow/react';

import type { TaskMode } from '../types';

export type ProjectExportFormat = 'json' | 'pos' | 'posf' | 'vdx' | 'mmd';

export const PROJECT_EXPORT_FORMATS: Array<{
  id: ProjectExportFormat;
  label: string;
  extension: string;
  mimeType: string;
}> = [
  { id: 'json', label: 'YesFlow JSON', extension: 'json', mimeType: 'application/json' },
  { id: 'pos', label: 'POS', extension: 'pos', mimeType: 'application/json' },
  { id: 'posf', label: 'POSF', extension: 'posf', mimeType: 'application/json' },
  { id: 'vdx', label: 'Visio VDX', extension: 'vdx', mimeType: 'application/xml' },
  { id: 'mmd', label: 'Mermaid', extension: 'mmd', mimeType: 'text/plain' },
];

export type ProjectExportPayload = {
  projectName: string;
  language: 'zh' | 'en';
  mode: TaskMode;
  nodes: Node[];
  edges: Edge[];
};

export function getProjectExportFormat(format: ProjectExportFormat) {
  return PROJECT_EXPORT_FORMATS.find((option) => option.id === format) || PROJECT_EXPORT_FORMATS[0];
}

export function stripProjectExportExtension(fileName: string) {
  return fileName.replace(/\.(json|pos|posf|vdx|vsdx|mmd|mermaid|txt|zip)$/i, '');
}

export function createProjectExportContent(payload: ProjectExportPayload, format: ProjectExportFormat) {
  switch (format) {
    case 'pos':
    case 'posf':
      return JSON.stringify(createPosPayload(payload, format), null, 2);
    case 'vdx':
      return createVisioVdx(payload);
    case 'mmd':
      return createMermaidText(payload);
    case 'json':
    default:
      return JSON.stringify(payload, null, 2);
  }
}

export function readYesFlowPayloadFromImport(data: any) {
  if (Array.isArray(data?.nodes) && Array.isArray(data?.edges)) return data;
  if (Array.isArray(data?.yesflow?.nodes) && Array.isArray(data?.yesflow?.edges)) return data.yesflow;
  if (Array.isArray(data?.payload?.nodes) && Array.isArray(data?.payload?.edges)) return data.payload;
  return data;
}

function createPosPayload(payload: ProjectExportPayload, format: 'pos' | 'posf') {
  return {
    type: format,
    source: 'YesFlow',
    version: 1,
    exportedAt: new Date().toISOString(),
    yesflow: payload,
  };
}

function getNodeLabel(node: Node) {
  const data = (node.data || {}) as Record<string, unknown>;
  const label = typeof data.label === 'string' ? data.label : '';
  return label.trim() || node.id;
}

function xmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function mermaidEscape(value: unknown) {
  return String(value ?? '')
    .replace(/"/g, '#quot;')
    .replace(/\r?\n/g, '<br/>');
}

function getNodeSize(node: Node) {
  const width = Number(node.width || (node as any).measured?.width || (node.style as any)?.width || 220);
  const height = Number(node.height || (node as any).measured?.height || (node.style as any)?.height || 96);
  return {
    width: Number.isFinite(width) && width > 0 ? width : 220,
    height: Number.isFinite(height) && height > 0 ? height : 96,
  };
}

function createMermaidText({ projectName, nodes, edges }: ProjectExportPayload) {
  const nodeIds = new Map(nodes.map((node, index) => [node.id, `n${index + 1}`]));
  const lines = [
    `%% ${projectName}`,
    'flowchart TD',
  ];

  nodes.forEach((node) => {
    lines.push(`  ${nodeIds.get(node.id)}["${mermaidEscape(getNodeLabel(node))}"]`);
  });

  edges.forEach((edge) => {
    const source = nodeIds.get(edge.source);
    const target = nodeIds.get(edge.target);
    if (!source || !target) return;
    const label = typeof edge.label === 'string' && edge.label.trim()
      ? `|${mermaidEscape(edge.label)}|`
      : '';
    lines.push(`  ${source} -->${label} ${target}`);
  });

  return `${lines.join('\n')}\n`;
}

function createVisioVdx({ projectName, nodes, edges }: ProjectExportPayload) {
  const shapeIds = new Map(nodes.map((node, index) => [node.id, String(index + 2)]));
  const shapeXml = nodes.map((node, index) => {
    const { width, height } = getNodeSize(node);
    const x = Number(node.position?.x || 0);
    const y = Number(node.position?.y || 0);

    return [
      `    <Shape ID="${shapeIds.get(node.id)}" NameU="YesFlow Node ${index + 1}" Type="Shape">`,
      `      <XForm>`,
      `        <PinX>${(x / 96).toFixed(3)}</PinX>`,
      `        <PinY>${(-y / 96).toFixed(3)}</PinY>`,
      `        <Width>${(width / 96).toFixed(3)}</Width>`,
      `        <Height>${(height / 96).toFixed(3)}</Height>`,
      `      </XForm>`,
      `      <Text>${xmlEscape(getNodeLabel(node))}</Text>`,
      `    </Shape>`,
    ].join('\n');
  });

  const edgeXml = edges.flatMap((edge, index) => {
    const source = shapeIds.get(edge.source);
    const target = shapeIds.get(edge.target);
    if (!source || !target) return [];
    return `    <Connect FromSheet="${source}" ToSheet="${target}" NameU="YesFlow Edge ${index + 1}" />`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<VisioDocument xmlns="http://schemas.microsoft.com/visio/2003/core">',
    `  <DocumentProperties><Title>${xmlEscape(projectName)}</Title></DocumentProperties>`,
    '  <Pages>',
    '    <Page ID="1" NameU="YesFlow">',
    '      <Shapes>',
    ...shapeXml,
    '      </Shapes>',
    '      <Connects>',
    ...edgeXml,
    '      </Connects>',
    '    </Page>',
    '  </Pages>',
    '</VisioDocument>',
    '',
  ].join('\n');
}
