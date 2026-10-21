export type TaskLike = {
  title?: string;
  status?: string;
  dueAt?: string | null;
  completedAt?: string | null;
  projectId?: number | null;
  tags?: string[];
  notes?: string | null;
  important?: boolean;
  urgent?: boolean;
};
export type ProjectLike = {
  name?: string;
  area?: string | null;
};
export type TaskFormValues = {
  title?: string;
  status?: string;
  priority?: string;
  dueLocal?: string;
  projectId?: string | number | null;
  tags?: string[];
  notes?: string;
};
export type TaskPatch = {
  title?: string;
  status?: string;
  dueAt?: string | null;
  projectId?: number | null;
  tags?: string[];
  notes?: string | null;
  important?: boolean;
  urgent?: boolean;
};
export type ProjectOption = { id: number | string; name: string };
export type ProjectOptionGroup = {
  area: string;
  label: string;
  projects: ProjectOption[];
};
export type TaskSegmentKey = "current" | "week" | "later" | "none";
export type TaskGroup<T = TaskLike> = {
  key: string;
  label: string;
  overdue?: boolean;
  tasks: T[];
};
export function isOpenTask(task: TaskLike): boolean;
export function isTaskOverdue(task: TaskLike, now: Date): boolean;
export function dueLabel(dueAt: string | null | undefined): string;
export function sortTasks<T extends TaskLike>(tasks: T[]): T[];
export function taskCheckState(status: string): {
  checked: boolean;
  disabled: boolean;
  nextStatus: "已完成" | "未完成" | null;
  title: string;
};
export function startOfDay(date: Date | string | number): Date;
export function taskSegment(task: TaskLike, now: Date): TaskSegmentKey | null;
export function filterByProject<T extends TaskLike>(
  tasks: T[],
  projectId: string | number | null | undefined,
): T[];
export function segmentCounts(
  tasks: TaskLike[],
  now: Date,
): { current: number; week: number; later: number; none: number };
export function buildTaskView<T extends TaskLike>(
  tasks: T[],
  options?: { projectId?: string | number | null; segment?: string; now?: Date },
): { groups: TaskGroup<T>[]; done: T[]; abandoned: T[] };
export function groupProjectsByArea<T extends ProjectLike>(
  projects: T[],
): { area: string; label: string; projects: T[] }[];
export function priorityLabel(task: TaskLike): "高" | "中" | "低";
export function priorityFlags(label: string): { important: boolean; urgent: boolean };
export function projectOptionsFor(
  task: { projectId?: number | string | null; projectName?: string | null },
  projects: ProjectLike[],
): ProjectOptionGroup[];
export function buildTaskPatch(
  base: TaskLike,
  values: TaskFormValues,
): TaskPatch;
