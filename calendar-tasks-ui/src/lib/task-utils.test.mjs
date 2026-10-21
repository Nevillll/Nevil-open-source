import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTaskPatch,
  buildTaskView,
  dueLabel,
  filterByProject,
  groupProjectsByArea,
  isTaskOverdue,
  priorityFlags,
  priorityLabel,
  projectOptionsFor,
  segmentCounts,
  sortTasks,
  startOfDay,
  taskCheckState,
  taskSegment,
} from "./task-utils.js";

process.env.TZ = "Asia/Shanghai";

const NOW = new Date("2026-10-16T12:00:00+08:00");
// 2026-10-20 是周二：今天 0 点 = 10/20，明天 0 点 = 10/21，下周一 0 点 = 10/26
const SEGMENT_NOW = new Date(2026, 9, 20, 10, 0);
const iso = (...args) => new Date(...args).toISOString();

test("dueLabel formats due time in Chinese and handles missing due", () => {
  assert.equal(dueLabel("2026-10-18T18:00:00+08:00"), "截止 10月18日 18:00");
  assert.equal(dueLabel("2026-10-01T09:05:00+08:00"), "截止 10月1日 09:05");
  assert.equal(dueLabel(null), "无截止时间");
  assert.equal(dueLabel(""), "无截止时间");
});

test("isTaskOverdue uses the given now instead of the current clock", () => {
  assert.equal(
    isTaskOverdue({ status: "未完成", dueAt: "2026-10-15T18:00:00+08:00" }, NOW),
    true,
  );
  assert.equal(
    isTaskOverdue({ status: "进行中", dueAt: "2026-10-16T11:59:59+08:00" }, NOW),
    true,
  );
  assert.equal(
    isTaskOverdue({ status: "进行中", dueAt: "2026-10-16T12:00:00+08:00" }, NOW),
    false,
  );
  assert.equal(
    isTaskOverdue({ status: "未完成", dueAt: "2026-10-17T18:00:00+08:00" }, NOW),
    false,
  );
  assert.equal(
    isTaskOverdue({ status: "已完成", dueAt: "2026-10-15T18:00:00+08:00" }, NOW),
    false,
  );
  assert.equal(
    isTaskOverdue({ status: "已废弃", dueAt: "2026-10-15T18:00:00+08:00" }, NOW),
    false,
  );
  assert.equal(isTaskOverdue({ status: "未完成", dueAt: null }, NOW), false);
  assert.equal(isTaskOverdue({ status: "未完成" }, NOW), false);
});

test("sortTasks puts open tasks first ordered by due time", () => {
  const tasks = [
    { id: 1, title: "没截止", status: "未完成", dueAt: null },
    { id: 2, title: "已完成", status: "已完成", dueAt: "2026-10-01T10:00:00+08:00" },
    { id: 3, title: "远期", status: "未完成", dueAt: "2026-10-20T10:00:00+08:00" },
    { id: 4, title: "已逾期", status: "进行中", dueAt: "2026-10-10T10:00:00+08:00" },
    { id: 5, title: "已废弃", status: "已废弃", dueAt: null },
  ];
  assert.deepEqual(
    sortTasks(tasks).map((t) => t.id),
    [4, 3, 1, 2, 5],
  );
});

test("sortTasks keeps the input order inside each group", () => {
  const tasks = [
    { id: 1, status: "已废弃", dueAt: null },
    { id: 2, status: "已完成", dueAt: "2026-10-02T10:00:00+08:00" },
    { id: 3, status: "未完成", dueAt: "2026-10-02T10:00:00+08:00" },
    { id: 4, status: "未完成", dueAt: "2026-10-02T10:00:00+08:00" },
    { id: 5, status: "已完成", dueAt: null },
  ];
  assert.deepEqual(
    sortTasks(tasks).map((t) => t.id),
    [3, 4, 1, 2, 5],
  );
});

test("taskCheckState: 勾选、取消勾选、已废弃不能点", () => {
  assert.deepEqual(taskCheckState("未完成"), {
    checked: false,
    disabled: false,
    nextStatus: "已完成",
    title: "标记为已完成",
  });
  assert.deepEqual(taskCheckState("进行中"), taskCheckState("未完成"));
  assert.deepEqual(taskCheckState("已完成"), {
    checked: true,
    disabled: false,
    nextStatus: "未完成",
    title: "取消完成",
  });
  const abandoned = taskCheckState("已废弃");
  assert.equal(abandoned.disabled, true);
  assert.equal(abandoned.checked, false);
  assert.equal(abandoned.nextStatus, null);
  assert.equal(abandoned.title, "已废弃的任务不能勾选完成");
});

test("startOfDay 返回当天 0 点", () => {
  const day = startOfDay(new Date(2026, 9, 20, 10, 30, 45));
  assert.equal(day.getFullYear(), 2026);
  assert.equal(day.getMonth(), 9);
  assert.equal(day.getDate(), 20);
  assert.equal(day.getHours(), 0);
  assert.equal(day.getMinutes(), 0);
  assert.equal(day.getSeconds(), 0);
});

test("taskSegment 未关闭：逾期/今天归当前，周日 23:59 归本周，下周一 0 点算以后", () => {
  const open = (dueAt, status = "未完成") => ({ status, dueAt });
  assert.equal(taskSegment(open(iso(2026, 9, 19, 18)), SEGMENT_NOW), "current");
  assert.equal(taskSegment(open(iso(2026, 9, 20, 0)), SEGMENT_NOW), "current");
  assert.equal(taskSegment(open(iso(2026, 9, 20, 18)), SEGMENT_NOW), "current");
  assert.equal(taskSegment(open(iso(2026, 9, 23, 12)), SEGMENT_NOW), "week");
  assert.equal(taskSegment(open(iso(2026, 9, 25, 23, 59)), SEGMENT_NOW), "week");
  assert.equal(taskSegment(open(iso(2026, 9, 26, 0)), SEGMENT_NOW), "later");
  assert.equal(taskSegment(open(iso(2026, 9, 30, 9)), SEGMENT_NOW), "later");
  assert.equal(taskSegment(open(null), SEGMENT_NOW), "none");
  assert.equal(taskSegment(open("无效日期"), SEGMENT_NOW), "none");
  assert.equal(taskSegment(open(iso(2026, 9, 19, 18), "进行中"), SEGMENT_NOW), "current");
});

test("taskSegment 已关闭：今天完成/今天截止归当前，上周完成不进任何分段", () => {
  const closed = (dueAt, completedAt, status = "已完成") => ({
    status,
    dueAt,
    completedAt,
  });
  assert.equal(
    taskSegment(closed(iso(2026, 9, 10, 12), iso(2026, 9, 20, 9)), SEGMENT_NOW),
    "current",
  );
  assert.equal(
    taskSegment(closed(iso(2026, 9, 20, 18), iso(2026, 9, 19, 9)), SEGMENT_NOW),
    "current",
  );
  assert.equal(
    taskSegment(closed(iso(2026, 9, 14, 12), iso(2026, 9, 14, 12)), SEGMENT_NOW),
    null,
  );
  assert.equal(
    taskSegment(closed(null, iso(2026, 9, 14, 12)), SEGMENT_NOW),
    "none",
  );
  assert.equal(
    taskSegment(closed(iso(2026, 9, 23, 9), iso(2026, 9, 14, 12)), SEGMENT_NOW),
    "week",
  );
  assert.equal(
    taskSegment(closed(iso(2026, 9, 28, 9), iso(2026, 9, 14, 12)), SEGMENT_NOW),
    "later",
  );
  assert.equal(
    taskSegment(closed(null, iso(2026, 9, 20, 8), "已废弃"), SEGMENT_NOW),
    "current",
  );
});

test("filterByProject：all 返回全部，否则只留同 projectId 的任务", () => {
  const tasks = [
    { id: 1, projectId: 3, status: "未完成", dueAt: null },
    { id: 2, projectId: 5, status: "未完成", dueAt: null },
    { id: 3, projectId: null, status: "未完成", dueAt: null },
  ];
  assert.deepEqual(filterByProject(tasks, "all").map((t) => t.id), [1, 2, 3]);
  assert.deepEqual(filterByProject(tasks, "5").map((t) => t.id), [2]);
  assert.deepEqual(filterByProject(tasks, 3).map((t) => t.id), [1]);
  assert.deepEqual(filterByProject(tasks, "9"), []);
});

test("segmentCounts 只数未关闭任务", () => {
  const tasks = [
    { status: "未完成", dueAt: iso(2026, 9, 20, 9) },
    { status: "进行中", dueAt: iso(2026, 9, 23, 9) },
    { status: "未完成", dueAt: null },
    { status: "未完成", dueAt: iso(2026, 10, 5, 9) },
    { status: "已完成", dueAt: iso(2026, 9, 20, 9), completedAt: iso(2026, 9, 20, 9) },
    { status: "已废弃", dueAt: null, completedAt: iso(2026, 9, 20, 9) },
    { status: "已完成", dueAt: null, completedAt: iso(2026, 9, 14, 9) },
  ];
  assert.deepEqual(segmentCounts(tasks, SEGMENT_NOW), {
    current: 1,
    week: 1,
    later: 1,
    none: 1,
  });
});

test("buildTaskView：current 分逾期/今天两组，逾期在前，组内按 sortTasks 排序", () => {
  const tasks = [
    { id: 1, status: "未完成", dueAt: iso(2026, 9, 20, 18) },
    { id: 2, status: "未完成", dueAt: iso(2026, 9, 19, 18) },
    { id: 3, status: "进行中", dueAt: iso(2026, 9, 18, 9) },
    { id: 4, status: "未完成", dueAt: iso(2026, 9, 20, 9) },
  ];
  const view = buildTaskView(tasks, {
    projectId: "all",
    segment: "current",
    now: SEGMENT_NOW,
  });
  assert.deepEqual(
    view.groups.map((g) => ({ key: g.key, label: g.label, overdue: g.overdue })),
    [
      { key: "overdue", label: "逾期", overdue: true },
      { key: "today", label: "今天", overdue: undefined },
    ],
  );
  assert.deepEqual(view.groups[0].tasks.map((t) => t.id), [3, 2]);
  assert.deepEqual(view.groups[1].tasks.map((t) => t.id), [4, 1]);
  assert.deepEqual(view.done, []);
  assert.deepEqual(view.abandoned, []);
});

test("buildTaskView：空组省略，其他分段各一组", () => {
  const tasks = [
    { id: 1, status: "未完成", dueAt: iso(2026, 9, 20, 9) },
    { id: 2, status: "未完成", dueAt: iso(2026, 9, 23, 9) },
    { id: 3, status: "未完成", dueAt: iso(2026, 10, 5, 9) },
    { id: 4, status: "未完成", dueAt: null },
  ];
  const current = buildTaskView(tasks, {
    segment: "current",
    now: SEGMENT_NOW,
  });
  assert.deepEqual(current.groups.map((g) => g.key), ["today"]);
  const specs = [
    ["week", "本周", [2]],
    ["later", "以后", [3]],
    ["none", "无日期", [4]],
  ];
  for (const [segment, label, ids] of specs) {
    const view = buildTaskView(tasks, { segment, now: SEGMENT_NOW });
    assert.deepEqual(
      view.groups.map((g) => ({ key: g.key, label: g.label, overdue: g.overdue })),
      [{ key: segment, label, overdue: undefined }],
    );
    assert.deepEqual(view.groups[0].tasks.map((t) => t.id), ids);
  }
});

test("buildTaskView：按项目过滤，已完成/已废弃分开放且按完成时间倒序", () => {
  const tasks = [
    {
      id: 1,
      projectId: 3,
      status: "已完成",
      dueAt: iso(2026, 9, 20, 9),
      completedAt: iso(2026, 9, 20, 8),
    },
    {
      id: 2,
      projectId: 3,
      status: "已完成",
      dueAt: iso(2026, 9, 20, 10),
      completedAt: iso(2026, 9, 20, 9),
    },
    {
      id: 3,
      projectId: 3,
      status: "已废弃",
      dueAt: iso(2026, 9, 20, 9),
      completedAt: iso(2026, 9, 20, 7),
    },
    {
      id: 4,
      projectId: 3,
      status: "已完成",
      dueAt: iso(2026, 9, 14, 9),
      completedAt: iso(2026, 9, 14, 9),
    },
    { id: 5, projectId: 3, status: "未完成", dueAt: iso(2026, 9, 20, 12) },
    {
      id: 6,
      projectId: 9,
      status: "已完成",
      dueAt: iso(2026, 9, 20, 9),
      completedAt: iso(2026, 9, 20, 10),
    },
  ];
  const view = buildTaskView(tasks, {
    projectId: "3",
    segment: "current",
    now: SEGMENT_NOW,
  });
  assert.deepEqual(view.groups.map((g) => g.tasks.map((t) => t.id)), [[5]]);
  assert.deepEqual(view.done.map((t) => t.id), [2, 1]);
  assert.deepEqual(view.abandoned.map((t) => t.id), [3]);
  assert.ok(!view.done.concat(view.abandoned).some((t) => t.id === 4));
});

test("groupProjectsByArea：按工作/生活分组、按名称排序、空 area 不返回", () => {
  const projects = [
    { id: 1, name: "项目 B", area: "work" },
    { id: 2, name: "项目 D", area: "personal" },
    { id: 3, name: "项目 A", area: "work" },
    { id: 4, name: "项目 C", area: "personal" },
    { id: 5, name: "无领域", area: "" },
    { id: 6, name: "没领域" },
    { id: 7, name: "项目 E", area: "work" },
    { id: 8, name: "项目 F", area: "family" },
  ];
  const groups = groupProjectsByArea(projects);
  assert.deepEqual(
    groups.map((g) => ({ area: g.area, label: g.label })),
    [
      { area: "work", label: "工作" },
      { area: "personal", label: "生活" },
    ],
  );
  assert.deepEqual(groups[0].projects.map((p) => p.id), [3, 1, 7]);
  assert.deepEqual(groups[1].projects.map((p) => p.id), [4, 2]);
  assert.deepEqual(groupProjectsByArea([]), []);
});

test("priorityLabel 与 priorityFlags 往返一致", () => {
  assert.equal(priorityLabel({ important: true, urgent: true }), "高");
  assert.equal(priorityLabel({ important: true, urgent: false }), "中");
  assert.equal(priorityLabel({ important: false, urgent: true }), "中");
  assert.equal(priorityLabel({ important: false, urgent: false }), "低");
  assert.equal(priorityLabel({}), "低");
  assert.deepEqual(priorityFlags("高"), { important: true, urgent: true });
  assert.deepEqual(priorityFlags("中"), { important: true, urgent: false });
  assert.deepEqual(priorityFlags("低"), { important: false, urgent: false });
  for (const label of ["高", "中", "低"]) {
    assert.equal(priorityLabel(priorityFlags(label)), label);
  }
});

const patchBase = (over = {}) => ({
  title: "写周报",
  status: "未完成",
  dueAt: null,
  projectId: 77,
  projectName: "归档项目",
  tags: [],
  notes: null,
  important: false,
  urgent: false,
  ...over,
});
const formValues = (over = {}) => ({
  title: "写周报",
  status: "未完成",
  priority: "低",
  dueLocal: "",
  projectId: "77",
  tags: [],
  notes: "",
  ...over,
});

test("buildTaskPatch：项目不在项目列表里时只改标题 → 只返回 title，不动 projectId", () => {
  const patch = buildTaskPatch(patchBase(), formValues({ title: "写月报" }));
  assert.deepEqual(patch, { title: "写月报" });
  assert.ok(!("projectId" in patch));
});

test("buildTaskPatch：values.projectId 为 undefined 时不返回 projectId", () => {
  const patch = buildTaskPatch(
    patchBase({ projectId: 3 }),
    formValues({ title: "写月报", projectId: undefined }),
  );
  assert.deepEqual(patch, { title: "写月报" });
  assert.ok(!("projectId" in patch));
});

test("buildTaskPatch：用户真的改了项目 → 返回 projectId；清空 → null", () => {
  assert.deepEqual(
    buildTaskPatch(patchBase({ projectId: 3 }), formValues({ projectId: "5" })),
    { projectId: 5 },
  );
  assert.deepEqual(
    buildTaskPatch(patchBase({ projectId: 3 }), formValues({ projectId: "" })),
    { projectId: null },
  );
  assert.deepEqual(
    buildTaskPatch(patchBase({ projectId: null }), formValues({ projectId: "" })),
    {},
  );
  assert.deepEqual(
    buildTaskPatch(patchBase({ projectId: 3 }), formValues({ projectId: "3" })),
    {},
  );
});

test("projectOptionsFor：任务的项目不在列表里 → 补「其他」分组", () => {
  const projects = [
    { id: 1, name: "项目 A", area: "work" },
    { id: 2, name: "项目 B", area: "personal" },
  ];
  const plain = groupProjectsByArea(projects);
  const withName = projectOptionsFor(
    { projectId: 77, projectName: "归档项目" },
    projects,
  );
  assert.deepEqual(
    withName.map((g) => ({ area: g.area, label: g.label })),
    [
      { area: "work", label: "工作" },
      { area: "personal", label: "生活" },
      { area: "other", label: "其他" },
    ],
  );
  assert.deepEqual(withName[2].projects, [{ id: 77, name: "归档项目" }]);
  const noName = projectOptionsFor({ projectId: 77 }, projects);
  assert.deepEqual(noName[2].projects, [
    { id: 77, name: "当前项目（已归档）" },
  ]);
  assert.deepEqual(
    projectOptionsFor({ projectId: 2, projectName: "项目 B" }, projects),
    plain,
  );
  assert.deepEqual(projectOptionsFor({ projectId: null }, projects), plain);
  assert.deepEqual(projectOptionsFor({}, projects), plain);
});

test("buildTaskPatch：保存后以新 base 为基准，把标签改回旧值会返回 tags", () => {
  const saved = patchBase({ tags: ["B"] });
  assert.deepEqual(buildTaskPatch(saved, formValues({ tags: ["A"] })), {
    tags: ["A"],
  });
});

test("buildTaskPatch：截止时间只比较到分钟，改了才返回 dueAt", () => {
  const base = patchBase({ dueAt: "2026-10-20T18:00:30+08:00" });
  assert.deepEqual(
    buildTaskPatch(base, formValues({ dueLocal: "2026-10-20T18:00" })),
    {},
  );
  assert.deepEqual(
    buildTaskPatch(base, formValues({ dueLocal: "2026-10-20T18:01" })),
    { dueAt: new Date("2026-10-20T18:01").toISOString() },
  );
  assert.deepEqual(
    buildTaskPatch(
      patchBase({ dueAt: "2026-10-20T18:00:00+08:00" }),
      formValues({ dueLocal: "" }),
    ),
    { dueAt: null },
  );
  assert.deepEqual(buildTaskPatch(patchBase(), formValues()), {});
});

test("buildTaskPatch：notes 空串视为 null，优先级变化时 important/urgent 成对返回", () => {
  assert.deepEqual(buildTaskPatch(patchBase({ notes: "备注" }), formValues()), {
    notes: null,
  });
  assert.deepEqual(buildTaskPatch(patchBase({ notes: "" }), formValues()), {});
  assert.deepEqual(buildTaskPatch(patchBase({ notes: null }), formValues()), {});
  assert.deepEqual(
    buildTaskPatch(patchBase(), formValues({ notes: " 新备注 " })),
    { notes: "新备注" },
  );
  assert.deepEqual(buildTaskPatch(patchBase(), formValues({ priority: "高" })), {
    important: true,
    urgent: true,
  });
  assert.deepEqual(
    buildTaskPatch(
      patchBase({ important: true, urgent: true }),
      formValues({ priority: "中" }),
    ),
    { important: true, urgent: false },
  );
  assert.deepEqual(buildTaskPatch(patchBase(), formValues({ status: "已完成" })), {
    status: "已完成",
  });
});
