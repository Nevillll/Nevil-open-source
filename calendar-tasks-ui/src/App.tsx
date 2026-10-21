import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Check, ListTodo, CalendarDays, Plus, RefreshCw, X } from "lucide-react";
import api from "./api/client";
import CalendarPage from "./pages/CalendarPage";
import type { CalendarTask } from "./pages/CalendarPage";
import {
  buildTaskPatch,
  buildTaskView,
  dueLabel,
  filterByProject,
  groupProjectsByArea,
  isTaskOverdue,
  priorityLabel,
  projectOptionsFor,
  segmentCounts,
  taskCheckState,
} from "./lib/task-utils.js";
import "./hub.css";

type Task = {
  id: string;
  title: string;
  status: string;
  dueAt?: string | null;
  completedAt?: string | null;
  important?: boolean;
  urgent?: boolean;
  notes?: string | null;
  tags?: string[];
  projectId?: number | null;
  projectName?: string | null;
  updatedAt?: string | null;
};
type Project = {
  id: number;
  name: string;
  area?: string | null;
  status?: string;
};
const TASK_STATUSES = ["未完成", "进行中", "已完成", "已废弃"];
const TASK_SEGMENTS = [
  ["current", "当前"],
  ["week", "本周"],
  ["later", "以后"],
  ["none", "无日期"],
] as const;
type SegmentKey = (typeof TASK_SEGMENTS)[number][0];
const PRIORITY_LABELS = ["高", "中", "低"];
function parseTags(text: string) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of text.split(/[,，、]/)) {
    const tag = part.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags;
}
const DISCARD_CONFIRM = "有未保存的修改，确定放弃吗？";
// 编辑表单把「保存中？有没有未保存修改」挂到父组件的 ref 上，
// 让 Esc / ✕ / 取消 三条关闭路径共用同一套放弃确认。
type EditGuard = {
  isPending: () => boolean;
  isDirty: () => boolean;
};
function readTaskFormValues(form: HTMLFormElement, projectFieldAvailable: boolean) {
  const f = new FormData(form);
  return {
    title: String(f.get("title") ?? ""),
    status: String(f.get("status") ?? ""),
    priority: String(f.get("priority") ?? ""),
    dueLocal: String(f.get("dueAt") ?? ""),
    projectId: projectFieldAvailable ? String(f.get("projectId") ?? "") : undefined,
    tags: parseTags(String(f.get("tags") ?? "")),
    notes: String(f.get("notes") ?? ""),
  };
}
type TaskListPack = { data: Task[]; total: number };
// PATCH 返回的是最新任务，先写回 ["tasks"] 缓存让编辑栏/勾选框立刻跟上，再 invalidate 拉服务器数据。
function withUpdatedTask(
  pack: TaskListPack | undefined,
  updated: Task,
): TaskListPack | undefined {
  if (!pack || !Array.isArray(pack.data)) return pack;
  return {
    ...pack,
    data: pack.data.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
  };
}
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 0 } },
});
function errorText(error: unknown) {
  const e = error as {
    response?: { data?: { error?: string; detail?: unknown } };
  };
  const data = e.response?.data;
  if (data?.error) return data.error;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail))
    return "填写内容未通过验证，请检查金额、账户和分类。";
  return "操作未成功，请检查连接后重试。";
}
function ErrorBox({ error }: { error: unknown }) {
  return error ? (
    <p className="error" role="alert">
      {errorText(error)}
    </p>
  ) : null;
}
function Loading() {
  return (
    <div className="empty" role="status">
      正在读取…
    </div>
  );
}


function Layout() {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <ListTodo size={19} />
          </span>
          日程 & 任务
        </div>
        <nav aria-label="主导航">
          <NavLink to="/work">
            <ListTodo size={17} />
            任务
          </NavLink>
          <NavLink to="/calendar">
            <CalendarDays size={17} />
            日程
          </NavLink>
        </nav>
        <span className="private-label">演示数据 · Demo</span>
      </header>
      <Routes>
        <Route path="/work" element={<Tasks />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="*" element={<Navigate to="/work" replace />} />
      </Routes>
    </>
  );
}

function Tasks() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("all");
  const [segment, setSegment] = useState<SegmentKey>("current");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [doneOpen, setDoneOpen] = useState(false);
  const [selection, setSelection] = useState<{
    id: string;
    trigger: HTMLElement | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    task: Task;
    trigger: HTMLElement | null;
  } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const createRef = useRef<HTMLButtonElement | null>(null);
  const editGuardRef = useRef<EditGuard | null>(null);
  const setEditGuard = (guard: EditGuard | null) => {
    editGuardRef.current = guard;
  };
  const reload = () => {
    setNow(new Date());
    return qc.invalidateQueries({ queryKey: ["tasks"] });
  };
  const closeDrawerNow = useCallback(() => {
    const trigger = selection?.trigger;
    setSelection(null);
    if (trigger && document.contains(trigger)) trigger.focus();
    else createRef.current?.focus();
  }, [selection]);
  const requestCloseDrawer = useCallback(() => {
    const guard = editGuardRef.current;
    if (guard?.isPending()) return;
    if (guard?.isDirty && guard.isDirty() && !window.confirm(DISCARD_CONFIRM))
      return;
    closeDrawerNow();
  }, [closeDrawerNow]);
  useEffect(() => {
    if (!selection || deleteTarget) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      requestCloseDrawer();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selection, deleteTarget, requestCloseDrawer]);
  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: async () =>
      (
        await api.get<{ data: Task[]; total: number }>(
          "/api/tasks?view=all&status=全部&limit=200",
        )
      ).data,
  });
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () =>
      (await api.get<{ data: Project[] }>("/api/projects")).data,
  });
  const create = useMutation({
    mutationFn: () =>
      api.post("/api/tasks", {
        title: title.trim(),
        dueAt: due ? new Date(due).toISOString() : null,
        projectId: projectId === "all" ? null : Number(projectId),
      }),
    onSuccess: () => {
      setTitle("");
      setDue("");
      reload();
    },
  });
  // 勾选框：未完成 → 已完成；已完成 → 未完成（取消完成）。已废弃的不能点。
  const toggleDone = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/tasks/${id}`, { status }),
    onSuccess: (res) => {
      const updated = res?.data as Task | undefined;
      if (updated && updated.id !== undefined) {
        qc.setQueryData(["tasks"], (old: TaskListPack | undefined) =>
          withUpdatedTask(old, updated),
        );
      }
      reload();
    },
  });
  const toggleDoneFor = (task: Task) => {
    const check = taskCheckState(task.status);
    if (check.nextStatus)
      toggleDone.mutate({ id: task.id, status: check.nextStatus });
  };
  const list = tasks.data?.data || [];
  // 编辑栏只存任务 id，渲染时取最新数据；任务没了（删掉/不在返回里）就不渲染编辑栏。
  const selectedTask = selection
    ? (list.find((t) => t.id === selection.id) ?? null)
    : null;
  const projectGroups = groupProjectsByArea(projects.data?.data || []);
  const counts = segmentCounts(filterByProject(list, projectId), now);
  const view = buildTaskView(list, { projectId, segment, now });
  return (
    <main className="page tasks-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">ONE THING AT A TIME</p>
          <h1>我的任务</h1>
          <p className="muted">把要做的事放在这里，一件件完成。</p>
        </div>
        <button
          aria-label="刷新任务"
          onClick={() => {
            setNow(new Date());
            tasks.refetch();
          }}
        >
          <RefreshCw size={17} />
          刷新
        </button>
      </section>
      <div className="tasks-layout">
        <section className="panel tasks-list-panel">
          <div className="task-toolbar">
            <select
              aria-label="项目"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="all">全部</option>
              {projectGroups.map((group) => (
                <optgroup key={group.area} label={group.label}>
                  {group.projects.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div
              className="segmented task-segments"
              role="tablist"
              aria-label="时间分段"
            >
              {TASK_SEGMENTS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={segment === key}
                  className={segment === key ? "active" : ""}
                  onClick={() => setSegment(key)}
                >
                  {label}
                  <span className="seg-count">{counts[key]}</span>
                </button>
              ))}
            </div>
          </div>
          <form
            className="task-create"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) create.mutate();
            }}
          >
            {/* 和下面任务行同一套列：左边图标占勾选框那一列，输入文字对齐任务标题 */}
            <span className="task-create-title">
              <Plus className="task-create-lead" size={16} aria-hidden="true" />
              <input
                aria-label="任务标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="接下来要做什么？"
                maxLength={200}
                required
              />
            </span>
            <input
              aria-label="截止时间"
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="due-input"
            />
            <button
              className="primary"
              ref={createRef}
              disabled={create.isPending || !title.trim()}
            >
              <Plus size={17} />
              创建任务
            </button>
          </form>
          <ErrorBox error={create.error || toggleDone.error} />
          {tasks.isPending ? (
            <Loading />
          ) : tasks.isError ? (
            <ErrorBox error={tasks.error} />
          ) : (
            <>
              {view.groups.map((group) => (
                <div key={group.key}>
                  <h3
                    className={
                      group.overdue
                        ? "task-group-label overdue"
                        : "task-group-label"
                    }
                  >
                    {group.label}
                  </h3>
                  <ul className="task-list">
                    {group.tasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        now={now}
                        selected={selection?.id === t.id}
                        pending={
                          toggleDone.isPending &&
                          toggleDone.variables?.id === t.id
                        }
                        select={(trigger) => setSelection({ id: t.id, trigger })}
                        toggle={() => toggleDoneFor(t)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
              {!view.groups.length && (
                <div className="empty">
                  <ListTodo size={30} />
                  <h3>这里没有待办的任务</h3>
                  <p>在上面的输入框里新建一个，或切换到其他分段看看。</p>
                </div>
              )}
              {(view.done.length > 0 || view.abandoned.length > 0) && (
                <>
                  <hr className="task-divider" />
                  <div className="task-done-fold">
                    <button
                      type="button"
                      aria-expanded={doneOpen}
                      onClick={() => setDoneOpen((open) => !open)}
                    >
                      已完成 {view.done.length} 条 {doneOpen ? "▾" : "▸"}
                    </button>
                    {view.abandoned.length > 0 && (
                      <small>· 已废弃 {view.abandoned.length} 条</small>
                    )}
                  </div>
                  {doneOpen && (
                    <ul className="task-list">
                      {view.done.concat(view.abandoned).map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          now={now}
                          selected={selection?.id === t.id}
                          pending={
                            toggleDone.isPending &&
                            toggleDone.variables?.id === t.id
                          }
                          select={(trigger) => setSelection({ id: t.id, trigger })}
                          toggle={() => toggleDoneFor(t)}
                        />
                      ))}
                    </ul>
                  )}
                </>
              )}
              {list.length > 0 && (tasks.data?.total ?? 0) > list.length && (
                <p className="task-list-total muted small">
                  已显示 {list.length} / 共 {tasks.data?.total} 项
                </p>
              )}
            </>
          )}
        </section>
        {selection && selectedTask && (
          <TaskDrawer
            task={selectedTask}
            projects={projects.data?.data || []}
            projectsPending={projects.isPending}
            projectsError={projects.isError}
            close={requestCloseDrawer}
            saved={reload}
            requestDelete={(trigger) =>
              setDeleteTarget({ task: selectedTask, trigger })
            }
            onGuard={setEditGuard}
          />
        )}
      </div>
      {deleteTarget && (
        <TaskDeleteModal
          task={deleteTarget.task}
          trigger={deleteTarget.trigger}
          fallbackRef={createRef}
          close={() => setDeleteTarget(null)}
          deleted={async () => {
            await reload();
            setDeleteTarget(null);
            setSelection(null);
          }}
        />
      )}
    </main>
  );
}

function TaskRow({
  task,
  now,
  selected,
  pending,
  select,
  toggle,
}: {
  task: Task;
  now: Date;
  selected: boolean;
  pending: boolean;
  select: (trigger: HTMLElement | null) => void;
  toggle: () => void;
}) {
  const overdue = isTaskOverdue(task, now);
  const check = taskCheckState(task.status);
  return (
    <li
      tabIndex={0}
      aria-current={selected ? "true" : undefined}
      className={[
        task.status === "已完成" ? "done" : task.status === "已废弃" ? "abandoned" : "",
        selected ? "selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => select(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(e.currentTarget);
        }
      }}
    >
      <button
        type="button"
        className="task-check"
        role="checkbox"
        aria-checked={check.checked}
        aria-label={`任务：${task.title}`}
        title={check.title}
        // 只禁用正在提交的这一行，其他行不变淡、不闪
        disabled={check.disabled || pending}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        <span className="task-check-circle" aria-hidden="true">
          <Check size={12} strokeWidth={3} />
        </span>
      </button>
      <span className="task-head">
        <span className="task-title">{task.title}</span>
        <small>
          <span className={overdue ? "task-due overdue" : "task-due"}>
            {dueLabel(task.dueAt)}
          </span>
          {task.projectName ? ` · ${task.projectName}` : ""}
          {priorityLabel(task) === "高" ? " · 优先级 高" : ""}
        </small>
      </span>
      <small className="task-status">{task.status}</small>
    </li>
  );
}

function TaskDrawer({
  task,
  projects,
  projectsPending,
  projectsError,
  close,
  saved,
  requestDelete,
  onGuard,
}: {
  task: Task;
  projects: Project[];
  projectsPending?: boolean;
  projectsError?: boolean;
  close: () => void;
  saved: () => void | Promise<void>;
  requestDelete: (trigger: HTMLElement | null) => void;
  onGuard: (guard: EditGuard | null) => void;
}) {
  return (
    <aside
      className="panel task-drawer"
      role="complementary"
      aria-label="编辑任务"
    >
      <div className="section-title">
        <h2>编辑任务</h2>
        <button type="button" aria-label="关闭" onClick={close}>
          <X size={18} />
        </button>
      </div>
      <TaskEditForm
        key={`${task.id}-${task.updatedAt ?? ""}`}
        task={task}
        projects={projects}
        projectsPending={projectsPending}
        projectsError={projectsError}
        onSaved={saved}
        onCancel={close}
        onDelete={requestDelete}
        onGuard={onGuard}
      />
    </aside>
  );
}

function TaskEditForm({
  task,
  projects,
  projectsPending,
  projectsError,
  onSaved,
  onCancel,
  onDelete,
  autoFocusTitle,
  onGuard,
}: {
  task: Task;
  projects: Project[];
  projectsPending?: boolean;
  projectsError?: boolean;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
  onDelete?: (trigger: HTMLElement | null) => void;
  autoFocusTitle?: boolean;
  onGuard?: (guard: EditGuard | null) => void;
}) {
  const qc = useQueryClient();
  const formRef = useRef<HTMLFormElement | null>(null);
  const savingRef = useRef(false);
  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch(`/api/tasks/${task.id}`, body),
    onSuccess: (res) => {
      const updated = res?.data as Task | undefined;
      if (updated && updated.id !== undefined) {
        qc.setQueryData(["tasks"], (old: TaskListPack | undefined) =>
          withUpdatedTask(old, updated),
        );
      }
      onSaved();
    },
    onSettled: () => {
      savingRef.current = false;
    },
  });
  // 项目列表没加载完/加载失败时项目下拉禁用，保存不带 projectId，绝不清空任务原有项目。
  const projectFieldDisabled = Boolean(projectsPending || projectsError);
  const [tagsText, setTagsText] = useState(() => (task.tags ?? []).join("，"));
  // 项目下拉受控：项目列表从「加载中→有数据」变化时选项会换掉，
  // 不受控的 defaultValue 会被浏览器重置成「无项目」，保存就会清空项目。
  const [projectValue, setProjectValue] = useState(() =>
    task.projectId == null ? "" : String(task.projectId),
  );
  const groups = projectOptionsFor(task, projects);
  const tagList = parseTags(tagsText);
  const currentPatch = () => {
    const form = formRef.current;
    if (!form) return {};
    return buildTaskPatch(task, readTaskFormValues(form, !projectFieldDisabled));
  };
  useEffect(() => {
    if (!onGuard) return;
    onGuard({
      isPending: () => mutation.isPending || savingRef.current,
      isDirty: () => Object.keys(currentPatch()).length > 0,
    });
    return () => onGuard(null);
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const patch = buildTaskPatch(
      task,
      readTaskFormValues(e.currentTarget, !projectFieldDisabled),
    );
    if (!Object.keys(patch).length) {
      onSaved();
      return;
    }
    savingRef.current = true;
    mutation.mutate(patch);
  }
  return (
    <form onSubmit={submit} ref={formRef}>
      <label>
        任务标题
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={task.title}
          autoFocus={autoFocusTitle}
        />
      </label>
      <div className="task-drawer-row2">
        <label>
          状态
          <select
            name="status"
            defaultValue={
              TASK_STATUSES.includes(task.status) ? task.status : "未完成"
            }
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          优先级
          <select name="priority" defaultValue={priorityLabel(task)}>
            {PRIORITY_LABELS.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        截止时间（可留空）
        <input
          name="dueAt"
          type="datetime-local"
          defaultValue={toLocalInputValue(task.dueAt ?? undefined)}
        />
      </label>
      <label>
        项目
        <select
          name="projectId"
          value={projectValue}
          onChange={(e) => setProjectValue(e.target.value)}
          disabled={projectFieldDisabled}
        >
          <option value="">无项目</option>
          {groups.map((group) => (
            <optgroup key={group.area} label={group.label}>
              {group.projects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {projectsError && (
          <small className="task-project-error">
            项目列表加载失败，暂时不能改项目
          </small>
        )}
      </label>
      <label>
        标签
        <input
          name="tags"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="多个标签用逗号分隔"
        />
      </label>
      {tagList.length > 0 && (
        <div className="task-tags">
          {tagList.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>
      )}
      <label>
        备注
        <textarea name="notes" defaultValue={task.notes ?? ""} rows={3} />
      </label>
      <ErrorBox error={mutation.error} />
      <div className="form-actions task-drawer-actions">
        <button type="submit" className="primary" disabled={mutation.isPending}>
          {mutation.isPending ? "正在保存…" : "保存"}
        </button>
        <button type="button" onClick={onCancel} disabled={mutation.isPending}>
          取消
        </button>
        {onDelete && (
          <button
            type="button"
            className="danger-text"
            disabled={mutation.isPending}
            onClick={(e) => onDelete(e.currentTarget)}
          >
            删除
          </button>
        )}
      </div>
    </form>
  );
}
function Calendar() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Task | null>(null);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const fallbackRef = useRef<HTMLElement | null>(null);
  const editGuardRef = useRef<EditGuard | null>(null);
  const setEditGuard = (guard: EditGuard | null) => {
    editGuardRef.current = guard;
  };
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () =>
      (await api.get<{ data: Project[] }>("/api/projects")).data,
  });
  const openTask = (task: CalendarTask) => {
    const active = document.activeElement;
    setTrigger(
      active instanceof HTMLElement && active !== document.body ? active : null,
    );
    setSelected(task);
  };
  const closeEditNow = useCallback(() => {
    const from = trigger;
    setSelected(null);
    if (from && document.contains(from)) from.focus();
    else fallbackRef.current?.focus();
  }, [trigger]);
  const requestCloseEdit = useCallback(() => {
    const guard = editGuardRef.current;
    if (guard?.isPending()) return;
    if (guard?.isDirty && guard.isDirty() && !window.confirm(DISCARD_CONFIRM))
      return;
    closeEditNow();
  }, [closeEditNow]);
  const saved = async () => {
    await qc.invalidateQueries({ queryKey: ["tasks"] });
    closeEditNow();
  };
  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      requestCloseEdit();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selected, requestCloseEdit]);
  return (
    <>
      <CalendarPage onOpenTask={openTask} />
      {selected && (
        <div className="modal-backdrop">
          <section
            className="modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-edit-title"
          >
            <div className="section-title">
              <h2 id="task-edit-title">编辑任务</h2>
              <button type="button" aria-label="关闭" onClick={requestCloseEdit}>
                <X size={18} />
              </button>
            </div>
            <TaskEditForm
              key={`${selected.id}-${selected.updatedAt ?? ""}`}
              task={selected}
              projects={projects.data?.data || []}
              projectsPending={projects.isPending}
              projectsError={projects.isError}
              onSaved={saved}
              onCancel={requestCloseEdit}
              autoFocusTitle
              onGuard={setEditGuard}
            />
          </section>
        </div>
      )}
    </>
  );
}

function TaskDeleteModal({
  task,
  close,
  deleted,
  trigger,
  fallbackRef,
}: {
  task: Task;
  close: () => void;
  deleted: () => void;
  trigger: HTMLElement | null;
  fallbackRef: { current: HTMLElement | null };
}) {
  const mutation = useMutation({
    mutationFn: () => api.delete(`/api/tasks/${task.id}`),
    onSuccess: deleted,
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [close, mutation.isPending]);
  useEffect(
    () => () => {
      if (trigger && document.contains(trigger)) trigger.focus();
      else fallbackRef.current?.focus();
    },
    [trigger, fallbackRef],
  );
  return (
    <div className="modal-backdrop">
      <section
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-delete-title"
      >
        <div className="section-title">
          <h2 id="task-delete-title">删除任务</h2>
          <button
            aria-label="关闭"
            disabled={mutation.isPending}
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        <p>
          将删除这项任务：{task.title}（{dueLabel(task.dueAt)}）。
        </p>
        <ErrorBox error={mutation.error} />
        <div className="form-actions">
          <button
            type="button"
            autoFocus
            onClick={close}
            disabled={mutation.isPending}
          >
            取消
          </button>
          <button
            className="danger"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "正在删除…" : "删除这项任务"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
