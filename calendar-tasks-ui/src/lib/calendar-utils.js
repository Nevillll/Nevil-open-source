import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

const WEEK_OPTIONS = { weekStartsOn: 1 };

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonday(value) {
  return startOfWeek(startOfDay(value), WEEK_OPTIONS);
}

export function weekRange(date) {
  const start = startOfMonday(date);
  return { start, end: addDays(start, 7) };
}

export function monthGridRange(date) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const start = startOfMonday(monthStart);
  const end = addDays(startOfMonday(monthEnd), 7);
  const days = [];
  for (let cursor = start; cursor < end; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return { start, end, days };
}

function eventRange(task) {
  const start = toDate(task?.startAt);
  const end = toDate(task?.endAt);
  if (!start) return null;
  if (task.allDay) {
    const dayStart = startOfDay(start);
    let dayEnd = end ? startOfDay(end) : addDays(dayStart, 1);
    if (dayEnd <= dayStart) dayEnd = addDays(dayStart, 1);
    return { start: dayStart, end: dayEnd, allDay: true };
  }
  const eventEnd = end && end > start ? end : addMinutes(start, 30);
  return { start, end: eventEnd, allDay: false };
}

function timedSegments(task, range, weekStart, weekEnd) {
  const segments = [];
  for (
    let cursor = startOfDay(range.start);
    cursor < range.end;
    cursor = addDays(cursor, 1)
  ) {
    const dayStart = cursor;
    const dayEnd = addDays(cursor, 1);
    const segmentStart = range.start > dayStart ? range.start : dayStart;
    const segmentEnd = range.end < dayEnd ? range.end : dayEnd;
    if (segmentEnd <= segmentStart) continue;
    if (segmentStart < weekStart || segmentStart >= weekEnd) continue;
    const top = (segmentStart.getTime() - dayStart.getTime()) / 60000;
    const height = (segmentEnd.getTime() - segmentStart.getTime()) / 60000;
    segments.push({
      task,
      dayIndex: differenceInCalendarDays(segmentStart, weekStart),
      top,
      height,
    });
  }
  return segments;
}

function assignColumns(items) {
  let group = [];
  let groupEnd = -Infinity;
  const flush = () => {
    if (!group.length) return;
    const columnEnds = [];
    for (const item of group) {
      let index = columnEnds.findIndex((end) => end <= item.top);
      if (index === -1) {
        index = columnEnds.length;
        columnEnds.push(item.top + item.height);
      } else {
        columnEnds[index] = item.top + item.height;
      }
      item.column = index;
    }
    for (const item of group) item.columns = columnEnds.length;
    group = [];
  };
  for (const item of items) {
    if (group.length && item.top >= groupEnd) {
      flush();
      groupEnd = -Infinity;
    }
    group.push(item);
    groupEnd = Math.max(groupEnd, item.top + item.height);
  }
  flush();
}

export function layoutWeek(tasks, weekStartDate) {
  const weekStart = startOfMonday(weekStartDate);
  const weekEnd = addDays(weekStart, 7);
  const allDay = [];
  const timed = [];

  for (const task of tasks || []) {
    const range = eventRange(task);
    if (range) {
      if (range.allDay) {
        const start = range.start > weekStart ? range.start : weekStart;
        const end = range.end < weekEnd ? range.end : weekEnd;
        if (end <= start) continue;
        allDay.push({
          task,
          dayIndex: differenceInCalendarDays(start, weekStart),
          span: differenceInCalendarDays(end, start),
          kind: "event",
        });
      } else {
        timed.push(...timedSegments(task, range, weekStart, weekEnd));
      }
      continue;
    }
    const due = toDate(task?.dueAt);
    if (!due) continue;
    const dueDay = startOfDay(due);
    if (dueDay < weekStart || dueDay >= weekEnd) continue;
    allDay.push({
      task,
      dayIndex: differenceInCalendarDays(dueDay, weekStart),
      span: 1,
      kind: "due",
    });
  }

  allDay.sort((a, b) => a.dayIndex - b.dayIndex || b.span - a.span);
  const allDayRowEnds = [];
  for (const item of allDay) {
    let row = allDayRowEnds.findIndex((end) => end <= item.dayIndex);
    if (row === -1) {
      row = allDayRowEnds.length;
      allDayRowEnds.push(item.dayIndex + item.span);
    } else {
      allDayRowEnds[row] = item.dayIndex + item.span;
    }
    item.row = row;
  }
  timed.sort(
    (a, b) =>
      a.dayIndex - b.dayIndex ||
      a.top - b.top ||
      b.top + b.height - (a.top + a.height),
  );
  let dayStart = 0;
  for (let index = 1; index <= timed.length; index += 1) {
    if (index === timed.length || timed[index].dayIndex !== timed[dayStart].dayIndex) {
      assignColumns(timed.slice(dayStart, index));
      dayStart = index;
    }
  }
  return { allDay, timed, allDayRows: allDayRowEnds.length };
}

export function itemsForDay(tasks, date) {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  const items = [];

  for (const task of tasks || []) {
    const range = eventRange(task);
    if (range) {
      if (range.start < dayEnd && range.end > dayStart) {
        items.push({ task, kind: "event" });
      }
      continue;
    }
    const due = toDate(task?.dueAt);
    if (due && due >= dayStart && due < dayEnd) {
      items.push({ task, kind: "due" });
    }
  }

  const rank = (item) => {
    if (item.task?.allDay) return 0;
    return item.kind === "due" ? 1 : 2;
  };
  const sortTime = (item) =>
    toDate(item.kind === "due" ? item.task?.dueAt : item.task?.startAt)
      ?.getTime() ?? 0;
  items.sort((a, b) => rank(a) - rank(b) || sortTime(a) - sortTime(b));

  return items;
}

export function monthCell(tasks, date, max = 3) {
  const items = itemsForDay(tasks, date);
  return {
    visible: items.slice(0, max),
    more: Math.max(0, items.length - max),
  };
}

export function priorityOf(task) {
  if (task?.important && task?.urgent) return "high";
  if (task?.important || task?.urgent) return "medium";
  return "low";
}

export function statusClass(task) {
  if (task?.status === "已完成") return "done";
  if (task?.status === "已废弃") return "cancelled";
  return "open";
}

export function snapMinutes(minutes, step = 15) {
  const value = Number(minutes);
  const size = Number(step) > 0 ? Number(step) : 15;
  if (!Number.isFinite(value)) return 0;
  const snapped = Math.round(value / size) * size;
  return Math.min(1440, Math.max(0, snapped));
}

export function yToMinutes(offsetY, hourHeight) {
  const height = Number(hourHeight);
  if (!Number.isFinite(height) || height <= 0) return 0;
  return snapMinutes((Number(offsetY) / height) * 60);
}

export function slotRange(dayStart, startMin, endMin) {
  const day = toDate(dayStart);
  if (!day) return { startAt: "", endAt: "" };
  const startAt = addMinutes(day, snapMinutes(startMin));
  let endAt = addMinutes(day, snapMinutes(endMin));
  if (endAt <= startAt) endAt = addMinutes(startAt, 30);
  else if (endAt.getTime() - startAt.getTime() < 15 * 60000) {
    endAt = addMinutes(startAt, 15);
  }
  return { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
}

export function moveRange(task, deltaDays = 0, deltaMinutes = 0) {
  const start = toDate(task?.startAt);
  if (!start) {
    return { startAt: task?.startAt ?? "", endAt: task?.endAt ?? "" };
  }
  const end = toDate(task?.endAt);
  const duration =
    end && end > start ? end.getTime() - start.getTime() : 30 * 60000;
  const moved = addMinutes(
    addDays(start, Number(deltaDays) || 0),
    Number(deltaMinutes) || 0,
  );
  const startAt = addMinutes(
    startOfDay(moved),
    snapMinutes(moved.getHours() * 60 + moved.getMinutes()),
  );
  return {
    startAt: startAt.toISOString(),
    endAt: new Date(startAt.getTime() + duration).toISOString(),
  };
}

export function resizeRange(task, newEndMinutesOfDay, dayStart) {
  const start = toDate(task?.startAt);
  const day = toDate(dayStart) || (start ? startOfDay(start) : null);
  if (!day) return task?.endAt ?? "";
  let endAt = addMinutes(day, snapMinutes(newEndMinutesOfDay));
  if (start) {
    const minEnd = addMinutes(start, 15);
    if (endAt < minEnd) endAt = minEnd;
  }
  return endAt.toISOString();
}

export function isDraggable(item) {
  const task = item?.task ?? item;
  if (!task || task.allDay) return false;
  const start = toDate(task.startAt);
  if (!start) return false;
  const end = toDate(task.endAt);
  // 跨过北京时间零点的事项不能拖（spec 第 7 节）；结束正好是次日 00:00 仍算当天
  return !end || startOfDay(start).getTime() === startOfDay(new Date(end.getTime() - 1)).getTime();
}

// 移动时限制在本周 7 列内：startDayIndex 是事项原来所在列
export function clampDayDelta(startDayIndex, deltaDays) {
  return Math.min(6 - startDayIndex, Math.max(-startDayIndex, deltaDays));
}

function clock(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function timeLabel(task) {
  if (task?.allDay) return "全天";
  const start = toDate(task?.startAt);
  if (start) {
    const end = toDate(task?.endAt);
    return end && end > start ? `${clock(start)}–${clock(end)}` : clock(start);
  }
  if (toDate(task?.dueAt)) return "截止";
  return "";
}
