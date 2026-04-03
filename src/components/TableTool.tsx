import React from 'react';
import { Table2 } from 'lucide-react';
import type { TaskData } from '../types';
import { createEmptyRow } from './NodeToolConfig';
import CustomScrollArea from './CustomScrollArea';
import {
  NodeToolDashedAction,
  NodeToolEmptyState,
  NodeToolFieldLabel,
  NodeToolPrimaryButton,
  NodeToolSecondaryButton,
  NodeToolSection,
  NodeToolWorkspaceHeader,
} from './NodeToolSurface';

interface TableToolProps {
  language: 'zh' | 'en';
  nodeData: TaskData;
  updateNodeTools: (tools: TaskData['tools']) => void;
}

export function TableToolEmpty({ language, onActivate }: { language: 'zh' | 'en'; onActivate: () => void }) {
  return (
    <NodeToolEmptyState
      accent="sky"
      icon={<Table2 className="w-5 h-5" />}
      title={language === 'zh' ? '创建节点表格' : 'Create Node Table'}
      description={language === 'zh' ? '适合记录身体数据、预算、清单或实验结果。' : 'Useful for tracking metrics, lists, budgets, or results.'}
      actionLabel={language === 'zh' ? '创建表格' : 'Create table'}
      onActivate={onActivate}
    />
  );
}

export function TableToolContent({ language, nodeData, updateNodeTools }: TableToolProps) {
  const table = nodeData.tools?.table;
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  const nextColumnLabel = language === 'zh' ? `字段 ${columns.length + 1 || 1}` : `Field ${columns.length + 1 || 1}`;
  const rowCount = rows.length;
  const columnCount = columns.length;

  return (
    <div className="space-y-4">
      <NodeToolWorkspaceHeader
        accent="sky"
        eyebrow={language === 'zh' ? '节点表格' : 'Node table'}
        title={language === 'zh' ? '把结构化信息放进同一个表格视图。' : 'Keep structured information in a single table view.'}
        description={language === 'zh' ? '适合记录数据、预算、对照项和检查清单。' : 'Ideal for metrics, budgets, comparisons, and checklists.'}
        badge={language === 'zh' ? `${rowCount} 行 / ${columnCount} 列` : `${rowCount} rows / ${columnCount} cols`}
        actions={
          <>
            <NodeToolSecondaryButton
              accent="sky"
              onClick={() => updateNodeTools({
                ...(nodeData.tools || {}),
                activeTool: 'table',
                table: {
                  ...(table || { enabled: true, columns: [], rows: [] }),
                  columns: [...columns, nextColumnLabel],
                  rows: rows.map((row) => ({
                    ...row,
                    values: {
                      ...row.values,
                      [nextColumnLabel]: '',
                    },
                  })),
                },
              })}
            >
              {language === 'zh' ? '加列' : 'Column'}
            </NodeToolSecondaryButton>
            <NodeToolPrimaryButton
              accent="sky"
              onClick={() => updateNodeTools({
                ...(nodeData.tools || {}),
                activeTool: 'table',
                table: {
                  ...(table || { enabled: true, columns: [], rows: [] }),
                  rows: [...rows, createEmptyRow(columns)],
                },
              })}
            >
              {language === 'zh' ? '加行' : 'Row'}
            </NodeToolPrimaryButton>
          </>
        }
      />

      <NodeToolSection className="overflow-hidden p-0">
        <CustomScrollArea orientation="horizontal" viewportClassName="max-w-full overflow-x-auto overflow-y-hidden">
          <div className="min-w-[520px]">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
              <NodeToolFieldLabel>{language === 'zh' ? '数据字段' : 'Data fields'}</NodeToolFieldLabel>
            </div>
            <div className="grid bg-neutral-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400" style={{ gridTemplateColumns: `repeat(${table?.columns.length || 1}, minmax(120px, 1fr)) 40px` }}>
              {columns.map((column) => (
                <div key={column} className="px-2 py-1">{column}</div>
              ))}
              <div />
            </div>

            <div className="divide-y divide-neutral-100">
              {rows.map((row) => (
                <div key={row.id} className="grid px-3 py-2" style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(120px, 1fr)) 40px` }}>
                  {columns.map((column) => (
                    <input
                      key={`${row.id}-${column}`}
                      value={row.values[column] || ''}
                      onChange={(event) => updateNodeTools({
                        ...(nodeData.tools || {}),
                        activeTool: 'table',
                        table: {
                          ...(table || { enabled: true, columns: [], rows: [] }),
                          rows: rows.map((item) => item.id === row.id ? {
                            ...item,
                            values: {
                              ...item.values,
                              [column]: event.target.value,
                            },
                          } : item),
                        },
                      })}
                      className="mx-1 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 outline-none transition-all focus:border-sky-200 focus:bg-white"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => updateNodeTools({
                      ...(nodeData.tools || {}),
                      activeTool: 'table',
                      table: {
                        ...(table || { enabled: true, columns: [], rows: [] }),
                        rows: rows.filter((item) => item.id !== row.id),
                      },
                    })}
                    className="mx-1 flex h-9 w-9 items-center justify-center rounded-xl text-neutral-300 transition-all hover:bg-red-50 hover:text-red-500"
                  >
                    <span className="text-base leading-none">-</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CustomScrollArea>
      </NodeToolSection>

      <NodeToolDashedAction
        accent="sky"
        icon={<Table2 className="w-4 h-4 text-sky-600" />}
        label={language === 'zh' ? '继续添加结构化内容' : 'Keep adding structured data'}
        onClick={() => updateNodeTools({
          ...(nodeData.tools || {}),
          activeTool: 'table',
          table: {
            ...(table || { enabled: true, columns: [], rows: [] }),
            rows: [...rows, createEmptyRow(columns)],
          },
        })}
      />
    </div>
  );
}
