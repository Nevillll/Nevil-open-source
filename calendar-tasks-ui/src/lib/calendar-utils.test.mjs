import test from "node:test";
import assert from "node:assert/strict";
import {
  weekRange,
  monthGridRange,
  layoutWeek,
  itemsForDay,
  monthCell,
  priorityOf,
  statusClass,
  timeLabel,
  snapMinutes,
  yToMinutes,
  slotRange,
  moveRange,
  resizeRange,
  isDraggable,
  clampDayDelta,
} from "./calendar-utils.js";

process.env.TZ = "Asia/Shanghai";

const WEEK = new Date("2026-10-12T00:00:00+08:00");
const day = (n) => new Date(WEEK.getTime() + n * 86400000);
const at = (dayOffset, hour, minute = 0) => {
  const d = new Date(day(dayOffset));
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const sameTime = (actual, expected) => {
  assert.equal(new Date(actual).getTime(), new Date(expected).getTime());
};

test("weekRange starts on Monday and ends next Monday", () => {
  const range = weekRange(new Date("2026-10-14T15:30:00+08:00"));
  sameTime(range.start, "2026-10-12T00:00:00+08:00");
  sameTime(range.end, "2026-10-19T00:00:00+08:00");
});

test("monthGridRange returns full Monday-start weeks covering the month", () => {
  const grid = monthGridRange(new Date("2026-10-14T12:00:00+08:00"));
  sameTime(grid.start, "2026-09-28T00:00:00+08:00");
  sameTime(grid.end, "2026-11-02T00:00:00+08:00");
  assert.equal(grid.days.length, 35);
  sameTime(grid.days[0], grid.start);
  assert.equal(grid.days[0].getDay(), 1);
  assert.equal(grid.days[34].getDay(), 0);
  sameTime(grid.days[34], "2026-11-01T00:00:00+08:00");
});

test("layoutWeek splits all-day, timed and overdue-style due items", () => {
  const tasks = [
    {
      id: "a",
      title: "出差",
      status: "未完成",
      allDay: true,
      startAt: at(0, 0),
      endAt: at(2, 0),
    },
    {
      id: "b",
      title: "评审",
      status: "进行中",
      startAt: at(1, 9, 30),
      endAt: at(1, 11, 0),
    },
    {
      id: "c",
      title: "夜间发布",
      status: "未完成",
      startAt: at(1, 23),
      endAt: at(2, 1),
    },
    {
      id: "d",
      title: "交材料",
      status: "未完成",
      dueAt: at(3, 18),
    },
    {
      id: "e",
      title: "下周的事",
      status: "未完成",
      startAt: at(7, 10),
      endAt: at(7, 11),
    },
  ];
  const layout = layoutWeek(tasks, WEEK);
  assert.equal(layout.allDay.length, 2);
  assert.equal(layout.allDay[0].task.id, "a");
  assert.equal(layout.allDay[0].dayIndex, 0);
  assert.equal(layout.allDay[0].span, 2);
  assert.equal(layout.allDay[0].kind, "event");
  assert.equal(layout.allDay[1].task.id, "d");
  assert.equal(layout.allDay[1].dayIndex, 3);
  assert.equal(layout.allDay[1].span, 1);
  assert.equal(layout.allDay[1].kind, "due");

  assert.deepEqual(
    layout.timed.map((item) => [
      item.task.id,
      item.dayIndex,
      item.top,
      item.height,
    ]),
    [
      ["b", 1, 570, 90],
      ["c", 1, 1380, 60],
      ["c", 2, 0, 60],
    ],
  );
});

test("layoutWeek clips all-day items to the visible week", () => {
  const layout = layoutWeek(
    [
      {
        id: "a",
        title: "长假",
        status: "未完成",
        allDay: true,
        startAt: at(-1, 0),
        endAt: at(2, 0),
      },
    ],
    WEEK,
  );
  assert.equal(layout.allDay.length, 1);
  assert.equal(layout.allDay[0].dayIndex, 0);
  assert.equal(layout.allDay[0].span, 2);
});

test("layoutWeek assigns non-overlapping rows to same-day all-day and due items", () => {
  const layout = layoutWeek(
    [
      { id: "due", title: "截止", dueAt: at(1, 18) },
      {
        id: "event",
        title: "全天",
        allDay: true,
        startAt: at(1, 0),
        endAt: at(2, 0),
      },
    ],
    WEEK,
  );
  const rows = layout.allDay.map((item) => item.row).sort();
  assert.deepEqual(rows, [0, 1]);
  assert.equal(layout.allDayRows, 2);
});

test("layoutWeek reuses row 0 for non-overlapping all-day ranges", () => {
  const layout = layoutWeek(
    [
      {
        id: "trip",
        title: "出差",
        allDay: true,
        startAt: at(0, 0),
        endAt: at(2, 0),
      },
      {
        id: "later",
        title: "后面的事",
        allDay: true,
        startAt: at(4, 0),
        endAt: at(5, 0),
      },
    ],
    WEEK,
  );
  const byId = Object.fromEntries(
    layout.allDay.map((item) => [item.task.id, item.row]),
  );
  assert.equal(byId.trip, 0);
  assert.equal(byId.later, 0);
  assert.equal(layout.allDayRows, 1);
});

test("layoutWeek assigns columns to overlapping timed items", () => {
  const layout = layoutWeek(
    [
      { id: "a", title: "A", startAt: at(1, 9), endAt: at(1, 10) },
      { id: "b", title: "B", startAt: at(1, 9, 30), endAt: at(1, 10, 30) },
    ],
    WEEK,
  );
  assert.deepEqual(
    layout.timed.map((item) => [item.task.id, item.column, item.columns]),
    [
      ["a", 0, 2],
      ["b", 1, 2],
    ],
  );
});

test("layoutWeek groups transitive overlaps and reuses free columns", () => {
  const layout = layoutWeek(
    [
      { id: "c", title: "C", startAt: at(1, 10, 30), endAt: at(1, 11, 30) },
      { id: "a", title: "A", startAt: at(1, 9), endAt: at(1, 10) },
      { id: "b", title: "B", startAt: at(1, 9, 30), endAt: at(1, 11) },
    ],
    WEEK,
  );
  assert.deepEqual(
    layout.timed.map((item) => [item.task.id, item.column, item.columns]),
    [
      ["a", 0, 2],
      ["b", 1, 2],
      ["c", 0, 2],
    ],
  );
});

test("layoutWeek keeps non-overlapping and cross-day items in column 0", () => {
  const layout = layoutWeek(
    [
      { id: "a", title: "A", startAt: at(1, 9), endAt: at(1, 10) },
      { id: "b", title: "B", startAt: at(2, 9), endAt: at(2, 10) },
      { id: "c", title: "C", startAt: at(1, 11), endAt: at(1, 12) },
    ],
    WEEK,
  );
  assert.deepEqual(
    layout.timed.map((item) => [item.task.id, item.column, item.columns]),
    [
      ["a", 0, 1],
      ["c", 0, 1],
      ["b", 0, 1],
    ],
  );
});

test("itemsForDay includes crossings and marks due-only tasks", () => {
  const tasks = [
    {
      id: "a",
      title: "出差",
      status: "未完成",
      allDay: true,
      startAt: at(0, 0),
      endAt: at(2, 0),
    },
    {
      id: "c",
      title: "夜间发布",
      status: "未完成",
      startAt: at(1, 23),
      endAt: at(2, 1),
    },
    { id: "d", title: "交材料", status: "未完成", dueAt: at(3, 18) },
  ];
  const items = itemsForDay(tasks, day(2));
  assert.deepEqual(
    items.map((item) => [item.task.id, item.kind]),
    [["c", "event"]],
  );
  const previous = itemsForDay(tasks, day(1));
  assert.deepEqual(
    previous.map((item) => [item.task.id, item.kind]),
    [
      ["a", "event"],
      ["c", "event"],
    ],
  );
  const due = itemsForDay(tasks, day(3));
  assert.deepEqual(
    due.map((item) => [item.task.id, item.kind]),
    [["d", "due"]],
  );
});

test("itemsForDay sorts all-day, then due, then timed items by start", () => {
  const tasks = [
    { id: "late", title: "晚", startAt: at(3, 15), endAt: at(3, 16) },
    { id: "due", title: "截止", dueAt: at(3, 18) },
    { id: "early", title: "早", startAt: at(3, 9), endAt: at(3, 10) },
    { id: "allDay", title: "全天", allDay: true, startAt: at(3, 0), endAt: at(4, 0) },
    { id: "mid", title: "中", startAt: at(3, 12), endAt: at(3, 13) },
  ];
  const items = itemsForDay(tasks, day(3));
  assert.deepEqual(
    items.map((item) => item.task.id),
    ["allDay", "due", "early", "mid", "late"],
  );
  const cell = monthCell(tasks, day(3), 3);
  assert.deepEqual(
    cell.visible.map((item) => item.task.id),
    ["allDay", "due", "early"],
  );
  assert.equal(cell.more, 2);
});

test("itemsForDay sorts due-only items by due time", () => {
  const tasks = [
    { id: "late", title: "晚截止", dueAt: at(3, 18) },
    { id: "early", title: "早截止", dueAt: at(3, 9) },
  ];
  const items = itemsForDay(tasks, day(3));
  assert.deepEqual(
    items.map((item) => item.task.id),
    ["early", "late"],
  );
});

test("monthCell limits visible items and reports the remainder", () => {
  const tasks = [1, 2, 3, 4].map((n) => ({
    id: String(n),
    title: `任务 ${n}`,
    status: "未完成",
    startAt: at(3, 9 + n),
    endAt: at(3, 10 + n),
  }));
  const cell = monthCell(tasks, day(3), 3);
  assert.deepEqual(
    cell.visible.map((item) => item.task.id),
    ["1", "2", "3"],
  );
  assert.equal(cell.more, 1);
  assert.equal(monthCell(tasks, day(3)).more, 1);
  assert.equal(monthCell(tasks.slice(0, 2), day(3), 3).more, 0);
});

test("priorityOf maps important/urgent to high, medium and low", () => {
  assert.equal(priorityOf({ important: true, urgent: true }), "high");
  assert.equal(priorityOf({ important: true, urgent: false }), "medium");
  assert.equal(priorityOf({ important: false, urgent: true }), "medium");
  assert.equal(priorityOf({ important: false, urgent: false }), "low");
  assert.equal(priorityOf({}), "low");
});

test("statusClass maps task status to visual state", () => {
  assert.equal(statusClass({ status: "已完成" }), "done");
  assert.equal(statusClass({ status: "已废弃" }), "cancelled");
  assert.equal(statusClass({ status: "未完成" }), "open");
  assert.equal(statusClass({ status: "进行中" }), "open");
});

test("timeLabel shows ranges, all-day and due markers", () => {
  assert.equal(
    timeLabel({ startAt: at(1, 15), endAt: at(1, 16) }),
    "15:00–16:00",
  );
  assert.equal(timeLabel({ allDay: true, startAt: at(1, 0) }), "全天");
  assert.equal(timeLabel({ dueAt: at(3, 18) }), "截止");
  assert.equal(timeLabel({ startAt: at(1, 9, 5) }), "09:05");
  assert.equal(timeLabel({}), "");
});

test("snapMinutes rounds to the step and clamps to one day", () => {
  assert.equal(snapMinutes(7), 0);
  assert.equal(snapMinutes(8), 15);
  assert.equal(snapMinutes(22), 15);
  assert.equal(snapMinutes(37, 30), 30);
  assert.equal(snapMinutes(-40), 0);
  assert.equal(snapMinutes(1500), 1440);
});

test("yToMinutes converts pixel offsets to aligned minutes", () => {
  assert.equal(yToMinutes(0, 48), 0);
  assert.equal(yToMinutes(48, 48), 60);
  assert.equal(yToMinutes(36, 48), 45);
  assert.equal(yToMinutes(10, 48), 15);
  assert.equal(yToMinutes(-10, 48), 0);
});

test("slotRange builds aligned ISO slots with click and min durations", () => {
  const dayStart = new Date("2026-10-12T00:00:00+08:00");
  const range = slotRange(dayStart, 570, 630);
  sameTime(range.startAt, "2026-10-12T09:30:00+08:00");
  sameTime(range.endAt, "2026-10-12T10:30:00+08:00");

  const click = slotRange(dayStart, 600, 600);
  sameTime(click.startAt, "2026-10-12T10:00:00+08:00");
  sameTime(click.endAt, "2026-10-12T10:30:00+08:00");

  const short = slotRange(dayStart, 1430, 1440);
  sameTime(short.startAt, "2026-10-12T23:45:00+08:00");
  sameTime(short.endAt, "2026-10-13T00:00:00+08:00");
});

test("moveRange keeps duration, crosses days and aligns the start", () => {
  const task = {
    startAt: "2026-10-12T09:30:00+08:00",
    endAt: "2026-10-12T11:00:00+08:00",
  };
  const moved = moveRange(task, 1, 20);
  sameTime(moved.startAt, "2026-10-13T09:45:00+08:00");
  sameTime(moved.endAt, "2026-10-13T11:15:00+08:00");

  const late = {
    startAt: "2026-10-12T23:30:00+08:00",
    endAt: "2026-10-13T00:30:00+08:00",
  };
  const rolled = moveRange(late, 0, 60);
  sameTime(rolled.startAt, "2026-10-13T00:30:00+08:00");
  sameTime(rolled.endAt, "2026-10-13T01:30:00+08:00");

  const back = moveRange(task, 0, -30);
  sameTime(back.startAt, "2026-10-12T09:00:00+08:00");
  sameTime(back.endAt, "2026-10-12T10:30:00+08:00");
});

test("resizeRange sets a new end and enforces at least 15 minutes", () => {
  const task = {
    startAt: "2026-10-12T09:00:00+08:00",
    endAt: "2026-10-12T10:00:00+08:00",
  };
  const dayStart = new Date("2026-10-12T00:00:00+08:00");
  sameTime(resizeRange(task, 615, dayStart), "2026-10-12T10:15:00+08:00");
  sameTime(resizeRange(task, 540, dayStart), "2026-10-12T09:15:00+08:00");
  sameTime(resizeRange(task, 547, dayStart), "2026-10-12T09:15:00+08:00");
});

test("isDraggable only allows timed tasks with a start time", () => {
  const startAt = "2026-10-12T09:00:00+08:00";
  assert.equal(isDraggable({ startAt, allDay: false }), true);
  assert.equal(isDraggable({ task: { startAt, allDay: false } }), true);
  assert.equal(isDraggable({ startAt, allDay: true }), false);
  assert.equal(isDraggable({ dueAt: startAt }), false);
  assert.equal(isDraggable({ task: { dueAt: startAt } }), false);
  assert.equal(isDraggable(null), false);
});

test("isDraggable rejects timed tasks crossing Beijing midnight", () => {
  assert.equal(
    isDraggable({ startAt: "2026-10-12T23:00:00+08:00", endAt: "2026-10-13T01:00:00+08:00" }),
    false,
  );
  // 结束正好是次日 00:00 仍算同一天
  assert.equal(
    isDraggable({ startAt: "2026-10-12T23:00:00+08:00", endAt: "2026-10-13T00:00:00+08:00" }),
    true,
  );
  assert.equal(
    isDraggable({ task: { startAt: "2026-10-12T09:00:00+08:00", endAt: "2026-10-12T10:00:00+08:00" } }),
    true,
  );
});

test("clampDayDelta keeps a moved item inside the visible week", () => {
  assert.equal(clampDayDelta(2, 3), 3);
  assert.equal(clampDayDelta(2, 6), 4);
  assert.equal(clampDayDelta(2, -5), -2);
  assert.equal(clampDayDelta(0, 0), 0);
});
