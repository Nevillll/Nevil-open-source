export type CalendarTaskLike = {
  id?: string | number;
  title?: string;
  status?: string;
  important?: boolean;
  urgent?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  allDay?: boolean;
  dueAt?: string | null;
};

export type CalendarRange = { start: Date; end: Date };
export type CalendarGridRange = CalendarRange & { days: Date[] };
export type CalendarItemKind = "event" | "due";
export type CalendarItem<T extends CalendarTaskLike = CalendarTaskLike> = {
  task: T;
  kind: CalendarItemKind;
};
export type AllDayLayoutItem<T extends CalendarTaskLike = CalendarTaskLike> =
  CalendarItem<T> & {
    dayIndex: number;
    span: number;
    row: number;
  };
export type TimedLayoutItem<T extends CalendarTaskLike = CalendarTaskLike> = {
  task: T;
  dayIndex: number;
  top: number;
  height: number;
  column: number;
  columns: number;
};
export type WeekLayout<T extends CalendarTaskLike = CalendarTaskLike> = {
  allDay: AllDayLayoutItem<T>[];
  timed: TimedLayoutItem<T>[];
  allDayRows: number;
};
export type MonthCell<T extends CalendarTaskLike = CalendarTaskLike> = {
  visible: CalendarItem<T>[];
  more: number;
};
export type Priority = "high" | "medium" | "low";
export type StatusClass = "done" | "cancelled" | "open";
export type CalendarSlot = { startAt: string; endAt: string };

export function weekRange(date: Date): CalendarRange;
export function monthGridRange(date: Date): CalendarGridRange;
export function layoutWeek<T extends CalendarTaskLike>(
  tasks: T[],
  weekStart: Date,
): WeekLayout<T>;
export function itemsForDay<T extends CalendarTaskLike>(
  tasks: T[],
  date: Date,
): CalendarItem<T>[];
export function monthCell<T extends CalendarTaskLike>(
  tasks: T[],
  date: Date,
  max?: number,
): MonthCell<T>;
export function priorityOf(task: CalendarTaskLike): Priority;
export function statusClass(task: CalendarTaskLike): StatusClass;
export function timeLabel(task: CalendarTaskLike): string;
export function snapMinutes(minutes: number, step?: number): number;
export function yToMinutes(offsetY: number, hourHeight: number): number;
export function slotRange(
  dayStart: Date,
  startMin: number,
  endMin: number,
): CalendarSlot;
export function moveRange(
  task: CalendarTaskLike,
  deltaDays?: number,
  deltaMinutes?: number,
): CalendarSlot;
export function resizeRange(
  task: CalendarTaskLike,
  newEndMinutesOfDay: number,
  dayStart: Date,
): string;
export function isDraggable(
  item: CalendarTaskLike | { task?: CalendarTaskLike } | null | undefined,
): boolean;
export function clampDayDelta(startDayIndex: number, deltaDays: number): number;
