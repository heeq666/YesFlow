import React from 'react';
import type { Edge, Node } from '@xyflow/react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Target, ArrowLeft, FileText, Table2 } from 'lucide-react';

import CustomScrollArea from './CustomScrollArea';
import { composeScheduleDateTime } from './NodeToolConfig';
import type { Settings, TaskData } from '../types';
import {
  addDays,
  addMonths,
  extractScheduledNodeEvents,
  extractScheduledNodeRanges,
  getMonthGridStart,
  getScheduleTimeTypeDefaultLabel,
  startOfMonth,
  toDateKey,
  type ScheduledNodeEvent,
  type ScheduledNodeRange,
  ensureToolState,
} from '../utils/nodeTools';

type TabId = 'calendar' | 'detail';

type SidebarCalendarViewProps = {
  language: 'zh' | 'en';
  settings: Settings;
  nodes: Node[];
  edges: Edge[];
  selectedNode?: Node | null;
  onUpdateNodeData?: (id: string, updates: Partial<TaskData>) => void;
  onJumpToNode: (nodeId: string) => void;
  variant?: 'full' | 'embedded';
};

function formatEventTime(value: string, allDay: boolean, language: 'zh' | 'en') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  if (allDay) {
    return language === 'zh' ? '全天' : 'All day';
  }

  return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFullDate(dateStr: string, language: 'zh' | 'en') {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

function getCurrentDateSeed() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  const hours = `${now.getHours()}`.padStart(2, '0');
  const minutes = `${now.getMinutes()}`.padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

function getInputTimeValue(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getHours()}`.padStart(2, '0') + ':' + `${date.getMinutes()}`.padStart(2, '0');
}

function withAlpha(color: string, alphaHex: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alphaHex}` : color;
}

function getRangeCoveringDate(range: ScheduledNodeRange, dateKey: string) {
  const startKey = toDateKey(range.startAt);
  const endKey = toDateKey(range.endAt);
  return Boolean(startKey && endKey && startKey <= dateKey && dateKey <= endKey);
}

export default function SidebarCalendarView({
  language,
  settings,
  nodes,
  edges,
  selectedNode,
  onUpdateNodeData,
  onJumpToNode,
  variant = 'full',
}: SidebarCalendarViewProps) {
  const isDarkTheme = settings.themeMode === 'dark';
  const [currentMonth, setCurrentMonth] = React.useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = React.useState(() => toDateKey(new Date()));
  const [activeTab, setActiveTab] = React.useState<TabId>('calendar');
  const [selectedEvent, setSelectedEvent] = React.useState<ScheduledNodeEvent | null>(null);

  const events = React.useMemo(
    () => extractScheduledNodeEvents(nodes, edges),
    [nodes, edges],
  );
  const ranges = React.useMemo(
    () => extractScheduledNodeRanges(nodes, edges),
    [nodes, edges],
  );
  const selectedNodeData = selectedNode?.data as TaskData | undefined;

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach((event) => {
      const key = toDateKey(event.startAt);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(event);
    });
    return map;
  }, [events]);

  const monthDays = React.useMemo(() => {
    const start = getMonthGridStart(currentMonth);
    return Array.from({ length: 35 }, (_, index) => addDays(start, index));
  }, [currentMonth]);

  const selectedDateEvents = eventsByDate.get(selectedDateKey) || [];
  const todayKey = toDateKey(new Date());
  const todayEvents = eventsByDate.get(todayKey) || [];
  const upcomingEvents = events.filter((event) => new Date(event.startAt).getTime() >= Date.now()).slice(0, 8);
  const remainingUpcomingEvents = upcomingEvents.filter((event) => toDateKey(event.startAt) !== selectedDateKey);
  const weekdayLabels = language === 'zh'
    ? ['一', '二', '三', '四', '五', '六', '日']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleEventClick = (event: ScheduledNodeEvent) => {
    setSelectedEvent(event);
    setActiveTab('detail');
  };

  const handleBackToCalendar = () => {
    setActiveTab('calendar');
    setSelectedEvent(null);
  };

  const getNodeData = (nodeId: string): TaskData | undefined => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.data as TaskData | undefined;
  };

  const updatePinnedScheduleItem = React.useCallback((
    timeType: 'start' | 'end',
    updates: Partial<{ date: string; time: string; allDay: boolean }>,
  ) => {
    if (!selectedNode || !selectedNodeData || selectedNodeData.isGroup || !onUpdateNodeData) return;

    const tools = ensureToolState(selectedNodeData, 'schedule', language);
    const scheduleItems = Array.isArray(tools.schedule?.items) ? tools.schedule.items : [];
    const currentSeed = getCurrentDateSeed();
    const existingItem = scheduleItems.find((item) => item.timeType === timeType);
    const currentDate = existingItem?.dateTime ? toDateKey(existingItem.dateTime) : '';
    const currentTime = getInputTimeValue(existingItem?.dateTime);
    const nextDate = updates.date ?? currentDate;
    const nextTime = (updates.time ?? currentTime) || currentSeed.time;
    const nextAllDay = updates.allDay ?? Boolean(existingItem?.allDay);

    const nextDateTime = nextDate
      ? composeScheduleDateTime(nextDate, nextTime, nextAllDay) || existingItem?.dateTime || ''
      : '';

    const nextItem = {
      id: existingItem?.id || `time-${Date.now()}-${timeType}`,
      timeType,
      label: getScheduleTimeTypeDefaultLabel(timeType, language),
      dateTime: nextDateTime,
      allDay: nextAllDay,
    };

    const nextItems = existingItem
      ? scheduleItems.map((item) => (item.id === existingItem.id ? { ...item, ...nextItem } : item))
      : [...scheduleItems, nextItem];

    onUpdateNodeData(selectedNode.id, {
      tools: {
        ...tools,
        activeTool: 'schedule',
        schedule: {
          enabled: true,
          items: nextItems,
        },
      },
    });
  }, [language, onUpdateNodeData, selectedNode, selectedNodeData]);

  const renderPinnedEditors = (layout: 'embedded' | 'full') => {
    if (!selectedNode || !selectedNodeData || selectedNodeData.isGroup) return null;

    const scheduleItems = Array.isArray(selectedNodeData.tools?.schedule?.items) ? selectedNodeData.tools?.schedule?.items : [];
    const pinnedTypes: Array<'start' | 'end'> = ['start', 'end'];

    return (
      <div className={`grid gap-2 ${layout === 'embedded' ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {pinnedTypes.map((timeType) => {
          const item = scheduleItems.find((entry) => entry.timeType === timeType);
          const dateValue = item?.dateTime ? toDateKey(item.dateTime) : '';
          const timeValue = getInputTimeValue(item?.dateTime);

          return (
            <div key={timeType} className="rounded-[1rem] border border-neutral-200 bg-white px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
                    {language === 'zh' ? '固定时间' : 'Pinned time'}
                  </div>
                  <div className="mt-1 text-sm font-black text-neutral-900">
                    {getScheduleTimeTypeDefaultLabel(timeType, language)}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
                  item?.dateTime ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-400'
                }`}>
                  {item?.dateTime
                    ? (language === 'zh' ? '已安排' : 'Scheduled')
                    : (language === 'zh' ? '未设置' : 'Unset')}
                </span>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)] gap-2">
                <input
                  type="date"
                  value={dateValue}
                  onChange={(event) => updatePinnedScheduleItem(timeType, { date: event.target.value })}
                  className="rounded-[14px] border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-700 outline-none transition-all focus:border-amber-200 focus:bg-white"
                />
                <input
                  type="time"
                  value={timeValue}
                  disabled={Boolean(item?.allDay)}
                  onChange={(event) => updatePinnedScheduleItem(timeType, { time: event.target.value })}
                  className="rounded-[14px] border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-700 outline-none transition-all focus:border-amber-200 focus:bg-white disabled:opacity-40"
                />
              </div>

              <button
                type="button"
                onClick={() => updatePinnedScheduleItem(timeType, { allDay: !item?.allDay })}
                className={`mt-2 w-full rounded-[14px] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                  item?.allDay
                    ? 'bg-amber-500 text-white'
                    : 'bg-neutral-100 text-neutral-500 hover:bg-amber-50 hover:text-amber-700'
                }`}
              >
                {language === 'zh' ? '全天' : 'All-day'}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRangeSegments = (dateKey: string, compact = false) => {
    const dayRanges = ranges.filter((range) => getRangeCoveringDate(range, dateKey)).slice(0, compact ? 1 : 2);
    if (dayRanges.length === 0) return null;

    return (
      <div className="space-y-1">
        {dayRanges.map((range) => {
          const startKey = toDateKey(range.startAt);
          const endKey = toDateKey(range.endAt);
          const isStart = startKey === dateKey;
          const isEnd = endKey === dateKey;

          return (
            <div key={range.id} className={`relative ${compact ? 'h-2.5' : 'h-3'}`}>
              <div
                className={`absolute ${compact ? 'top-[5px] bottom-[3px]' : 'top-[6px] bottom-[4px]'} ${
                  isStart ? 'left-[6px]' : '-left-2'
                } ${isEnd ? 'right-[6px]' : '-right-2'} rounded-full`}
                style={{ backgroundColor: withAlpha(range.color, compact ? '2a' : '22') }}
              />
              {isStart && (
                <span
                  className="absolute left-[3px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: range.color }}
                  title={range.title}
                />
              )}
              {isEnd && (
                <span
                  className="absolute right-[3px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: range.color }}
                  title={range.title}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (variant === 'embedded') {
    const allEvents = events.slice(0, 20);

    return (
      <div className="flex h-full flex-col gap-1">
        {renderPinnedEditors('embedded')}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-0.5">
            <button
              type="button"
              onClick={() => { setActiveTab('calendar'); setSelectedEvent(null); }}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all ${
                activeTab === 'calendar' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <CalendarDays className="w-3 h-3" />
              {language === 'zh' ? '日历' : 'Calendar'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('detail')}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all ${
                activeTab === 'detail' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <Clock3 className="w-3 h-3" />
              {language === 'zh' ? '日程' : 'Schedule'}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <p className="text-[9px] text-neutral-400">
              {currentMonth.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                year: 'numeric',
                month: 'short',
              })}
            </p>
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
              className="flex h-6 w-6 items-center justify-center rounded-xl text-neutral-400 transition-all hover:bg-neutral-200 hover:text-neutral-700"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
              className="flex h-6 w-6 items-center justify-center rounded-xl text-neutral-400 transition-all hover:bg-neutral-200 hover:text-neutral-700"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {activeTab === 'calendar' ? (
          <div className="flex flex-col flex-1 min-h-0 gap-1">
            <div className="grid grid-cols-7 gap-1">
              {weekdayLabels.map((label) => (
                <div key={label} className="text-center text-[9px] font-black uppercase tracking-[0.14em] text-neutral-300">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 flex-1">
              {monthDays.map((day) => {
                const key = toDateKey(day);
                const dayEvents = eventsByDate.get(key) || [];
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = key === todayKey;
                const isSelected = key === selectedDateKey;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDateKey(key);
                      if (dayEvents[0]) {
                        handleEventClick(dayEvents[0]);
                      }
                    }}
                    className={`relative flex h-full min-h-[44px] flex-col items-start justify-between rounded-xl border px-1.5 py-1.5 text-left text-[10px] font-black transition-all ${
                      isSelected
                        ? 'border-primary/20 bg-primary/6 text-neutral-800 shadow-sm'
                        : isCurrentMonth
                          ? 'border-transparent bg-neutral-50 text-neutral-700 hover:border-neutral-200 hover:bg-white'
                          : 'border-transparent bg-neutral-50/40 text-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                          <div className="flex w-full items-center justify-between gap-1">
                            <span className={`${isCurrentMonth ? 'text-neutral-800' : 'text-neutral-300'}`}>{day.getDate()}</span>
                            {isToday && (
                              <span className="rounded-full bg-primary px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-white">
                                {language === 'zh' ? '今' : 'Now'}
                              </span>
                            )}
                          </div>
                          <div className="w-full">
                            {renderRangeSegments(key, true)}
                          </div>
                          <div className="flex min-h-[8px] items-center gap-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <span
                                key={event.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[8px] font-black text-neutral-400">+{dayEvents.length - 2}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <CustomScrollArea className="min-h-0 flex-1" viewportClassName="h-full">
            <div className="flex min-h-full flex-col">
                {selectedEvent ? (
                  <>
                    <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(null)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-all"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: selectedEvent.color }} />
                      <span className="text-xs font-bold text-neutral-800 truncate">{selectedEvent.title}</span>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="rounded-xl bg-neutral-50 px-3 py-2">
                        <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-neutral-400">
                          {language === 'zh' ? '时间' : 'Time'}
                        </div>
                        <div className="text-xs font-bold text-neutral-800">
                          {formatFullDate(selectedEvent.startAt, language)}
                        </div>
                        {!selectedEvent.allDay && (
                          <div className="mt-0.5 text-[10px] font-bold text-primary">
                            {formatEventTime(selectedEvent.startAt, false, language)}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onJumpToNode(selectedEvent.nodeId)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-primary/90"
                      >
                        <Target className="w-3.5 h-3.5" />
                        {language === 'zh' ? '定位节点' : 'Go to Node'}
                      </button>

                      {(() => {
                        const nodeData = getNodeData(selectedEvent.nodeId);
                        if (!nodeData) return null;
                        return (
                          <>
                            {nodeData.description && (
                              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                                <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-neutral-400">
                                  {language === 'zh' ? '描述' : 'Description'}
                                </div>
                                <div className="line-clamp-4 text-[11px] leading-relaxed text-neutral-600">
                                  {nodeData.description}
                                </div>
                              </div>
                            )}
                            {nodeData.category && (
                              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                                <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-neutral-400">
                                  {language === 'zh' ? '模块' : 'Module'}
                                </div>
                                <div className="text-[11px] font-bold text-neutral-800">{nodeData.category}</div>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              {nodeData.tools?.table?.enabled && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">
                                  <Table2 className="w-2.5 h-2.5" />{language === 'zh' ? '表格' : 'Table'}
                                </span>
                              )}
                              {nodeData.tools?.document?.enabled && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-purple-600">
                                  <FileText className="w-2.5 h-2.5" />{language === 'zh' ? '文档' : 'Doc'}
                                </span>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 shrink-0">
                      <Clock3 className="w-4 h-4 text-primary" />
                      <span className="text-xs font-black text-neutral-900">
                        {language === 'zh' ? `全部日程 (${allEvents.length})` : `All Events (${allEvents.length})`}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      {allEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Clock3 className="mb-2 w-8 h-8 text-neutral-200" />
                          <div className="text-xs font-bold text-neutral-400">{language === 'zh' ? '暂无日程安排' : 'No scheduled events'}</div>
                        </div>
                      ) : allEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                          className="flex w-full items-center justify-between rounded-xl bg-white px-2.5 py-2 text-left ring-1 ring-black/5 transition-all hover:translate-x-0.5 hover:shadow-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
                            <span className="truncate text-[11px] font-bold text-neutral-800">{event.title}</span>
                          </div>
                          <div className="ml-2 shrink-0 text-right">
                            <div className="text-[9px] font-bold text-neutral-500">
                              {new Date(event.startAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric' })}
                            </div>
                            <div className="text-[9px] font-bold text-neutral-400">
                              {formatEventTime(event.startAt, event.allDay, language)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
            </div>
          </CustomScrollArea>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="pr-24">
        <div>
          <h3 className="text-sm font-black text-neutral-900">{language === 'zh' ? '日历联动' : 'Calendar Sync'}</h3>
          <p className="text-[11px] text-neutral-400 mt-1">
            {language === 'zh' ? '所有带时间的节点会自动汇总到这里。' : 'All scheduled nodes appear here automatically.'}
          </p>
        </div>
      </div>

      {activeTab === 'calendar' && renderPinnedEditors('full')}

      {settings.nodeTools.calendar.showTodayPanel && activeTab === 'calendar' && (
        <div className={`rounded-[1.1rem] border p-4 ${
          isDarkTheme
            ? 'border-primary/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(15,23,42,0.94)_45%,rgba(11,21,38,0.98))] shadow-[0_22px_56px_-38px_rgba(37,99,235,0.5)]'
            : 'border-primary/10 bg-gradient-to-br from-primary/8 via-white to-white'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-neutral-900">{language === 'zh' ? '今日聚焦' : 'Today Focus'}</div>
                <div className="text-[11px] text-neutral-400">{todayEvents.length === 0 ? (language === 'zh' ? '今天没有带时间的节点。' : 'No scheduled nodes for today.') : (language === 'zh' ? `今天有 ${todayEvents.length} 个节点安排。` : `${todayEvents.length} nodes scheduled today.`)}</div>
              </div>
            </div>
          </div>
          {todayEvents.length > 0 && (
            <div className="mt-3 space-y-2">
              {todayEvents.slice(0, 3).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleEventClick(event)}
                  className="flex w-full items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-left shadow-sm ring-1 ring-black/5 transition-all hover:translate-x-0.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
                    <span className="truncate text-xs font-bold text-neutral-800">{event.title}</span>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-400">{formatEventTime(event.startAt, event.allDay, language)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.1rem] border border-neutral-200 bg-white">
        <AnimatePresence mode="wait">
          {activeTab === 'calendar' && (
            <motion.div
              key="full-calendar"
              initial={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '-20%' }}
              transition={{ duration: 0.2 }}
              className="flex min-h-0 flex-1 flex-col gap-4 p-4"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-all hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-sm font-black text-neutral-900">
                    {currentMonth.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-all hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {weekdayLabels.map((label) => (
                    <div key={label} className="px-1 pb-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-neutral-300">
                      {label}
                    </div>
                  ))}

                  {monthDays.map((day) => {
                    const key = toDateKey(day);
                    const dayEvents = eventsByDate.get(key) || [];
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isToday = key === todayKey;
                    const isSelected = key === selectedDateKey;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDateKey(key)}
                        className={`min-h-[82px] rounded-[1rem] border p-2 text-left transition-all ${
                          isSelected
                            ? 'border-primary/20 bg-primary/6 shadow-sm'
                            : 'border-transparent bg-neutral-50 hover:border-neutral-200 hover:bg-white'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`text-[11px] font-black ${isCurrentMonth ? 'text-neutral-800' : 'text-neutral-300'}`}>{day.getDate()}</span>
                          {isToday && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">{language === 'zh' ? '今' : 'Now'}</span>}
                        </div>
                        <div className="space-y-1">
                          {renderRangeSegments(key)}
                          {dayEvents.slice(0, 2).map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                              className="truncate w-full rounded-full px-2 py-1 text-[9px] font-bold text-white text-left hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: event.color }}
                            >
                              {event.title}
                            </button>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[9px] font-bold text-neutral-400">+{dayEvents.length - 2}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col border-t border-neutral-100 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                    <Clock3 className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? '日程列表' : 'Schedule List'}</span>
                  </div>
                  <span className="rounded-full bg-neutral-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                    {selectedDateKey}
                  </span>
                </div>

                <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4">
                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                      {language === 'zh' ? '所选日期' : 'Selected Date'}
                    </div>
                    {selectedDateEvents.length === 0 ? (
                      <div className="rounded-xl bg-neutral-50 px-4 py-5 text-center text-xs text-neutral-400">
                        {language === 'zh' ? '这一天还没有带时间的节点。' : 'No scheduled nodes for this date yet.'}
                      </div>
                    ) : selectedDateEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleEventClick(event)}
                        className="flex w-full items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-3 text-left transition-all hover:border-neutral-200 hover:bg-white"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-neutral-800">{event.title}</div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                              {formatEventTime(event.startAt, event.allDay, language)}
                            </div>
                          </div>
                        </div>
                        <Target className="w-3.5 h-3.5 text-neutral-300" />
                      </button>
                    ))}
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col space-y-2 border-t border-neutral-100 pt-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                      {language === 'zh' ? '后续安排' : 'Upcoming'}
                    </div>
                    {remainingUpcomingEvents.length === 0 ? (
                      <div className="rounded-xl bg-neutral-50 px-4 py-5 text-center text-xs text-neutral-400">
                        {language === 'zh' ? '还没有更多安排。' : 'No more upcoming items.'}
                      </div>
                    ) : remainingUpcomingEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleEventClick(event)}
                        className="flex w-full items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-3 text-left transition-all hover:border-neutral-200 hover:bg-white"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-neutral-800">{event.title}</div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                              {new Date(event.startAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: event.allDay ? undefined : '2-digit',
                                minute: event.allDay ? undefined : '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                        <Target className="w-3.5 h-3.5 text-neutral-300" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'detail' && selectedEvent && (
            <motion.div
              key="full-detail"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="p-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={handleBackToCalendar}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black text-neutral-900 truncate pr-2">{selectedEvent.title}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    {language === 'zh' ? '日程详情' : 'Schedule Detail'}
                  </div>
                </div>
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: selectedEvent.color }} />
              </div>

              <div className="space-y-4">
                <div className={`rounded-xl border p-4 ${
                  isDarkTheme
                    ? 'border-slate-700/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(11,21,38,0.98))] shadow-[0_20px_48px_-36px_rgba(2,6,23,0.95)]'
                    : 'border-neutral-100 bg-gradient-to-br from-neutral-50 to-white'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock3 className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      {language === 'zh' ? '时间安排' : 'Schedule Time'}
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-neutral-900">
                    {formatFullDate(selectedEvent.startAt, language)}
                  </div>
                  {!selectedEvent.allDay && (
                    <div className="mt-1 text-sm font-bold text-primary">
                      {formatEventTime(selectedEvent.startAt, false, language)}
                    </div>
                  )}
                  {selectedEvent.allDay && (
                    <div className="mt-1 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">
                      {language === 'zh' ? '全天事件' : 'All-day Event'}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { onJumpToNode(selectedEvent.nodeId); handleBackToCalendar(); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
                >
                  <Target className="w-5 h-5" />
                  {language === 'zh' ? '跳转到画布节点' : 'Jump to Canvas Node'}
                </button>

                {(() => {
                  const nodeData = getNodeData(selectedEvent.nodeId);
                  if (!nodeData) return null;

                  return (
                    <div className="space-y-3">
                      {nodeData.description && (
                        <div className="rounded-xl border border-neutral-100 bg-white p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-purple-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                              {language === 'zh' ? '节点描述' : 'Description'}
                            </span>
                          </div>
                          <div className="text-sm text-neutral-600 leading-relaxed">
                            {nodeData.description}
                          </div>
                        </div>
                      )}

                      {nodeData.category && (
                        <div className="rounded-xl border border-neutral-100 bg-white p-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                            {language === 'zh' ? '所属模块' : 'Module'}
                          </div>
                          <div className="text-sm font-bold text-neutral-800">{nodeData.category}</div>
                        </div>
                      )}

                      {(nodeData.tools?.table?.enabled || nodeData.tools?.document?.enabled) && (
                        <div className="rounded-xl border border-neutral-100 bg-white p-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                            {language === 'zh' ? '已启用工具' : 'Active Tools'}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {nodeData.tools?.table?.enabled && (
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600">
                                <Table2 className="w-3.5 h-3.5" />
                                {language === 'zh' ? '表格' : 'Table'}
                              </span>
                            )}
                            {nodeData.tools?.document?.enabled && (
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-600">
                                <FileText className="w-3.5 h-3.5" />
                                {language === 'zh' ? '文档' : 'Document'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
