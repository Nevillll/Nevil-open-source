const OPEN_STATUSES = ["未完成", "进行中"];
const CLOSED_STATUSES = ["已完成", "已废弃"];
const SEGMENT_LABELS = { week: "本周", later: "以后", none: "无日期" };
const PROJECT_AREAS = [
  { area: "work", label: "工作" },
  { area: "personal", label: "生活" },
];

export function isOpenTask(task) {
  return OPEN_STATUSES.includes(task?.status);
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function timeOf(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function dayStartOf(value) {
  const t = timeOf(value);
  return t === null ? null : startOfDay(t).getTime();
}

function weekBounds(now) {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextMonday = new Date(today);
  nextMonday.setDate(nextMonday.getDate() + (((8 - today.getDay()) % 7) || 7));
  return {
    today: today.getTime(),
    tomorrow: tomorrow.getTime(),
    nextMonday: nextMonday.getTime(),
  };
}

export function taskSegment(task, now) {
  const { today, tomorrow, nextMonday } = weekBounds(now);
  const due = timeOf(task?.dueAt);
  const completed = dayStartOf(task?.completedAt);
  if (CLOSED_STATUSES.includes(task?.status)) {
    if (dayStartOf(task?.dueAt) === today || completed === today) return "current";
    if (due === null) return "none";
    if (due < today) return null;
    if (due < nextMonday) return "week";
    return "later";
  }
  if (due === null) return "none";
  if (due < tomorrow) return "current";
  if (due < nextMonday) return "week";
  return "later";
}

export function filterByProject(tasks, projectId) {
  const list = tasks || [];
  if (projectId === "all") return [...list];
  const wanted = Number(projectId);
  return list.filter((task) => task?.projectId === wanted);
}

export function segmentCounts(tasks, now) {
  const counts = { current: 0, week: 0, later: 0, none: 0 };
  for (const task of tasks || []) {
    if (!isOpenTask(task)) continue;
    const segment = taskSegment(task, now);
    if (segment) counts[segment] += 1;
  }
  return counts;
}

function closedTime(task) {
  return timeOf(task?.completedAt) ?? timeOf(task?.dueAt);
}

function sortClosed(tasks) {
  return [...tasks].sort((a, b) => {
    const timeA = closedTime(a);
    const timeB = closedTime(b);
    if (timeA === null && timeB === null) return 0;
    if (timeA === null) return 1;
    if (timeB === null) return -1;
    return timeB - timeA;
  });
}

export function buildTaskView(tasks, { projectId = "all", segment = "current", now = new Date() } = {}) {
  const picked = filterByProject(tasks, projectId).filter(
    (task) => taskSegment(task, now) === segment,
  );
  const open = picked.filter(isOpenTask);
  const groups = [];
  if (segment === "current") {
    const dayStart = startOfDay(now);
    const overdue = open.filter((task) => isTaskOverdue(task, dayStart));
    const today = open.filter((task) => !isTaskOverdue(task, dayStart));
    if (overdue.length) {
      groups.push({ key: "overdue", label: "逾期", overdue: true, tasks: sortTasks(overdue) });
    }
    if (today.length) {
      groups.push({ key: "today", label: "今天", tasks: sortTasks(today) });
    }
  } else if (open.length) {
    groups.push({ key: segment, label: SEGMENT_LABELS[segment], tasks: sortTasks(open) });
  }
  return {
    groups,
    done: sortClosed(picked.filter((task) => task?.status === "已完成")),
    abandoned: sortClosed(picked.filter((task) => task?.status === "已废弃")),
  };
}

export function groupProjectsByArea(projects) {
  const list = projects || [];
  return PROJECT_AREAS.map(({ area, label }) => ({
    area,
    label,
    projects: list
      .filter((project) => project?.area === area)
      .sort((a, b) => String(a?.name ?? "").localeCompare(String(b?.name ?? ""), "zh")),
  })).filter((group) => group.projects.length > 0);
}

// 编辑表单的项目下拉：任务当前项目不在项目列表里（已归档、列表没加载完）时，
// 单独补一组「其他」把当前项目显示出来，免得下拉落到「无项目」、保存时把项目清空。
export function projectOptionsFor(task, projects) {
  const groups = groupProjectsByArea(projects);
  const rawId = task?.projectId;
  const projectId =
    rawId === null || rawId === undefined || rawId === "" ? null : Number(rawId);
  if (projectId === null || !Number.isFinite(projectId)) return groups;
  const list = projects || [];
  const shown = groups.some((group) =>
    group.projects.some((project) => Number(project?.id) === projectId),
  );
  if (shown) return groups;
  const known = list.find((project) => Number(project?.id) === projectId);
  const name =
    task?.projectName || known?.name || "当前项目（已归档）";
  return [
    ...groups,
    { area: "other", label: "其他", projects: [{ id: projectId, name }] },
  ];
}

// 截止时间按分钟比较：只差秒数不算改动（datetime-local 只到分钟）。
function dueMinute(value) {
  const t = timeOf(value);
  return t === null ? null : Math.floor(t / 60000);
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

// 编辑表单保存前的差异计算：base 是服务器最新任务，values 是表单值。
// 只返回真正变化的字段；values.projectId 为 undefined（项目字段不可用/未提供）时绝不返回 projectId。
export function buildTaskPatch(base, values) {
  const task = base || {};
  const form = values || {};
  const patch = {};
  if (form.title !== undefined) {
    const title = String(form.title).trim();
    if (title !== String(task.title ?? "").trim()) patch.title = title;
  }
  if (form.status !== undefined && form.status !== task.status) {
    patch.status = form.status;
  }
  if (form.dueLocal !== undefined) {
    const raw = String(form.dueLocal ?? "");
    const nextTime = raw ? timeOf(raw) : null;
    const unreadable = Boolean(raw) && nextTime === null;
    if (!unreadable && dueMinute(nextTime) !== dueMinute(task.dueAt)) {
      patch.dueAt = nextTime === null ? null : new Date(nextTime).toISOString();
    }
  }
  if (form.projectId !== undefined) {
    const rawProject = form.projectId;
    const nextProjectId =
      rawProject === "" || rawProject === null ? null : Number(rawProject);
    if (nextProjectId === null || Number.isFinite(nextProjectId)) {
      if ((task.projectId ?? null) !== nextProjectId) {
        patch.projectId = nextProjectId;
      }
    }
  }
  if (Array.isArray(form.tags)) {
    const prevTags = task.tags ?? [];
    const nextTags = form.tags;
    if (
      nextTags.length !== prevTags.length ||
      nextTags.some((tag, i) => tag !== prevTags[i])
    ) {
      patch.tags = [...nextTags];
    }
  }
  if (form.notes !== undefined) {
    const nextNotes = cleanText(form.notes);
    if (nextNotes !== cleanText(task.notes)) patch.notes = nextNotes;
  }
  if (form.priority !== undefined) {
    const flags = priorityFlags(form.priority);
    if (
      flags.important !== Boolean(task.important) ||
      flags.urgent !== Boolean(task.urgent)
    ) {
      patch.important = flags.important;
      patch.urgent = flags.urgent;
    }
  }
  return patch;
}

export function priorityLabel(task) {
  if (task?.important && task?.urgent) return "高";
  if (task?.important || task?.urgent) return "中";
  return "低";
}

export function priorityFlags(label) {
  if (label === "高") return { important: true, urgent: true };
  if (label === "中") return { important: true, urgent: false };
  return { important: false, urgent: false };
}

export function isTaskOverdue(task, now) {
  if (!isOpenTask(task) || !task?.dueAt) return false;
  const due = new Date(task.dueAt).getTime();
  if (Number.isNaN(due)) return false;
  return due < now.getTime();
}

export function dueLabel(dueAt) {
  if (!dueAt) return "无截止时间";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return "无截止时间";
  const pad = (n) => String(n).padStart(2, "0");
  return `截止 ${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dueTime(task) {
  const value = task?.dueAt ? new Date(task.dueAt).getTime() : NaN;
  return Number.isNaN(value) ? null : value;
}

export function sortTasks(tasks) {
  // 与后端 list_tasks 的排序一致：未完成在前 → 截止时间近的先、无截止最后；
  // 组内保持稳定（后端同截止时间时已按优先级、id 排好，这里不再重排）。
  return [...tasks].sort((a, b) => {
    const openA = isOpenTask(a) ? 0 : 1;
    const openB = isOpenTask(b) ? 0 : 1;
    if (openA !== openB) return openA - openB;
    if (openA === 1) return 0;
    const dueA = dueTime(a);
    const dueB = dueTime(b);
    if (dueA === null && dueB === null) return 0;
    if (dueA === null) return 1;
    if (dueB === null) return -1;
    return dueA - dueB;
  });
}

// 任务页勾选框：当前是否勾上、能否点、点了改成什么状态、悬停提示。
// 未完成/进行中 → 已完成；已完成 → 未完成（取消完成）；已废弃不能点。
// 注意：后端不记录完成前的状态，所以「进行中」完成后再取消，会回到「未完成」而不是「进行中」。
export function taskCheckState(status) {
  if (status === "已完成") {
    return { checked: true, disabled: false, nextStatus: "未完成", title: "取消完成" };
  }
  if (status === "已废弃") {
    return { checked: false, disabled: true, nextStatus: null, title: "已废弃的任务不能勾选完成" };
  }
  return { checked: false, disabled: false, nextStatus: "已完成", title: "标记为已完成" };
}
