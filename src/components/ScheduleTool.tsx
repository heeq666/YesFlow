import React from 'react';
import { Clock3, Plus, Trash2 } from 'lucide-react';

import type { TaskData, ScheduleTimeItem } from '../types';
import {
  NodeToolDashedAction,
  NodeToolEmptyState,
  NodeToolFieldLabel,
  NodeToolPrimaryButton,
  NodeToolSecondaryButton,
  NodeToolSection,
  NodeToolWorkspaceHeader,
} from './NodeToolSurface';
import {
  SCHEDULE_TIME_TYPE_OPTIONS,
  getScheduleTimeTypeDefaultLabel,
  getScheduleTimeTypeIcon,
  getScheduleTimeTypeLabel,
} from '../utils/nodeTools';

interface ScheduleToolProps {
  language: 'zh' | 'en';
  nodeData: TaskData;
  updateNodeTools: (tools: TaskData['tools']) => void;
  onBackToOverview?: () => void;
}

export function ScheduleToolEmpty({ language, onActivate }: { language: 'zh' | 'en'; onActivate: () => void }) {
  return (
    <NodeToolEmptyState
      accent="amber"
      icon={<Clock3 className="w-5 h-5" />}
      title={language === 'zh' ? '创建节点时间' : 'Create Node Schedule'}
      description={language === 'zh' ? '设置时间后会同步到日历。' : 'Set a time to sync with the calendar.'}
      actionLabel={language === 'zh' ? '开始安排' : 'Start planning'}
      onActivate={onActivate}
    />
  );
}

export function ScheduleToolContent({ language, nodeData, updateNodeTools, onBackToOverview }: ScheduleToolProps) {
  const schedule = nodeData.tools?.schedule;
  const items = Array.isArray(schedule?.items) ? schedule.items : [];

  const updateSchedule = (updates: Partial<typeof schedule>) => {
    updateNodeTools({
      ...(nodeData.tools || {}),
      activeTool: 'schedule',
      schedule: {
        ...(nodeData.tools?.schedule || { enabled: true, items: [] }),
        ...updates,
      },
    });
  };

  const updateItem = (itemId: string, updates: Partial<ScheduleTimeItem>) => {
    const newItems = items.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
    updateSchedule({ items: newItems });
  };

  const addItem = () => {
    const newItem: ScheduleTimeItem = {
      id: `time-${Date.now()}`,
      timeType: 'custom',
      label: getScheduleTimeTypeDefaultLabel('custom', language),
      dateTime: '',
      allDay: false,
    };
    updateSchedule({ items: [...items, newItem] });
  };

  const deleteItem = (itemId: string) => {
    const newItems = items.filter((item) => item.id !== itemId);
    if (newItems.length === 0) {
      updateSchedule({ items: [], enabled: false });
    } else {
      updateSchedule({ items: newItems });
    }
  };

  const handleClearAll = () => {
    updateSchedule({ items: [], enabled: false });
  };

  return (
    <div className="space-y-4">
      <NodeToolWorkspaceHeader
        accent="amber"
        eyebrow={language === 'zh' ? '节点时间' : 'Node schedule'}
        title={language === 'zh' ? '把节点关键时间点挂到日历上。' : 'Attach key milestones to the calendar.'}
        description={language === 'zh' ? '适合开始时间、截止时间、提醒点和自定义里程碑。' : 'Ideal for start dates, deadlines, reminders, and custom milestones.'}
        badge={language === 'zh' ? `${items.length} 项` : `${items.length} items`}
        actions={
          <>
            {onBackToOverview && (
              <NodeToolSecondaryButton accent="amber" onClick={onBackToOverview}>
                {language === 'zh' ? '返回资源' : 'Resources'}
              </NodeToolSecondaryButton>
            )}
            {items.length > 0 && (
              <NodeToolSecondaryButton accent="amber" onClick={handleClearAll} className="text-red-500 hover:bg-red-50">
                {language === 'zh' ? '清除' : 'Clear'}
              </NodeToolSecondaryButton>
            )}
            <NodeToolPrimaryButton accent="amber" onClick={addItem}>
              <span className="inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                {language === 'zh' ? '添加' : 'Add'}
              </span>
            </NodeToolPrimaryButton>
          </>
        }
      />

      <div className="space-y-3">
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
          <NodeToolSection className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-sm font-black text-amber-600">
                  {index + 1}
                </div>
                <div className="text-xs font-black text-neutral-700">
                  {getScheduleTimeTypeIcon(item.timeType)} {getScheduleTimeTypeLabel(item.timeType, language)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteItem(item.id)}
                className="rounded-lg p-1.5 text-neutral-400 transition-all hover:bg-red-50 hover:text-red-500"
                title={language === 'zh' ? '删除' : 'Delete'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {SCHEDULE_TIME_TYPE_OPTIONS.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    updateItem(item.id, {
                      timeType: type.id,
                      label: getScheduleTimeTypeDefaultLabel(type.id, language),
                    });
                  }}
                  className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold transition-all ${
                    item.timeType === type.id
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-500 hover:bg-amber-100'
                  }`}
                >
                  <span className="text-sm">{type.icon}</span>
                  <span>{language === 'zh' ? type.labelZh : type.labelEn}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <NodeToolFieldLabel>{language === 'zh' ? '日期' : 'Date'}</NodeToolFieldLabel>
                <input
                  type="date"
                  value={item.dateTime ? item.dateTime.split('T')[0] : ''}
                  onChange={(event) => {
                    const time = item.dateTime ? item.dateTime.split('T')[1] : '09:00';
                    updateItem(item.id, {
                      dateTime: event.target.value ? `${event.target.value}T${time}` : '',
                    });
                  }}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 outline-none transition-all focus:border-amber-200 focus:bg-white"
                />
              </div>
              <div>
                <NodeToolFieldLabel>{language === 'zh' ? '时间' : 'Time'}</NodeToolFieldLabel>
                <input
                  type="time"
                  value={item.dateTime ? item.dateTime.split('T')[1] : '09:00'}
                  disabled={Boolean(item.allDay)}
                  onChange={(event) => {
                    const date = item.dateTime ? item.dateTime.split('T')[0] : new Date().toISOString().split('T')[0];
                    updateItem(item.id, {
                      dateTime: `${date}T${event.target.value}`,
                    });
                  }}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 outline-none transition-all focus:border-amber-200 focus:bg-white disabled:opacity-40"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => updateItem(item.id, { allDay: !item.allDay })}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-2.5 text-left transition-all ${
                item.allDay ? 'border-amber-200 bg-amber-50' : 'border-neutral-200 bg-neutral-50 hover:bg-white'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-neutral-800">{language === 'zh' ? '全天' : 'All-day'}</div>
                <div className="mt-0.5 text-[10px] text-neutral-400">
                  {language === 'zh' ? '开启后仅记录日期' : 'Only date when enabled'}
                </div>
              </div>
              <div className={`relative h-6 w-10 rounded-full transition-all ${item.allDay ? 'bg-amber-500' : 'bg-neutral-200'}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${item.allDay ? 'left-5' : 'left-1'}`} />
              </div>
            </button>

            {item.dateTime && (
              <div className="rounded-xl bg-neutral-50 px-4 py-3 text-xs">
                <NodeToolFieldLabel>{language === 'zh' ? '预览' : 'Preview'}</NodeToolFieldLabel>
                <div className="mt-1 font-bold text-neutral-700">
                  {new Date(item.dateTime).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                    hour: item.allDay ? undefined : '2-digit',
                    minute: item.allDay ? undefined : '2-digit',
                  })}
                </div>
              </div>
            )}
          </NodeToolSection>
          </React.Fragment>
        ))}

        <NodeToolDashedAction
          accent="amber"
          icon={<Plus className="w-4 h-4 text-amber-600" />}
          label={language === 'zh' ? '添加时间' : 'Add Time'}
          onClick={addItem}
        />
      </div>
    </div>
  );
}
