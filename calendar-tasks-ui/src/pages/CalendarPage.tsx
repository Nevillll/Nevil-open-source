import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  isSameDay,
  startOfDay,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import api from "../api/client";
import {
  clampDayDelta,
  isDraggable,
  layoutWeek,
  monthCell,
  monthGridRange,
  moveRange,
  priorityOf,
  resizeRange,
  slotRange,
  statusClass,
  timeLabel,
  weekRange,
  yToMinutes,
} from "../lib/calendar-utils.js";

export type CalendarTask = {
  id: string;
  title: string;
  status: string;
  important?: boolean;
  urgent?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  allDay?: boolean;
  dueAt?: string | null;
};

type Props = { onOpenTask: (task: CalendarTask) => void };
type View = "week" | "month";
type TaskResponse = { data: CalendarTask[]; total: number };
type Slot = {
  dayIndex: number;
  startMin: number;
  endMin: number;
  startAt: string;
  endAt: string;
};
type Drag =
  | {
      mode: "create";
      pointerId: number;
      dayIndex: number;
      startMin: number;
      currentMin: number;
    }
  | {
      mode: "move";
      pointerId: number;
      task: CalendarTask;
      startX: number;
      startY: number;
      colWidth: number;
      startDayIndex: number;
      moved: boolean;
      deltaDays: number;
      deltaMinutes: number;
    }
  | {
      mode: "resize";
      pointerId: number;
      task: CalendarTask;
      dayStart: Date;
      startY: number;
      moved: boolean;
      newEndMin: number;
    };

const HOUR_HEIGHT = 48;
const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function itemClass(task: CalendarTask) {
  return `cal-item cal-${statusClass(task)} cal-priority-${priorityOf(task)}`;
}

function errorDetail(error: unknown) {
  const detail = (
    error as { response?: { data?: { detail?: unknown } } }
  )?.response?.data?.detail;
  return typeof detail === "string" ? detail : "";
}

export default function CalendarPage({ onOpenTask }: Props) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [today] = useState(() => new Date());
  const [drag, setDrag] = useState<Drag | null>(null);
  const [composer, setComposer] = useState<Slot | null>(null);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerError, setComposerError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLInputElement | null>(null);
  const suppressClick = useRef(false);
  const week = weekRange(cursor);
  const month = monthGridRange(cursor);
  const range = view === "week" ? week : month;

  const tasks = useQuery({
    queryKey: [
      "tasks",
      "calendar",
      range.start.toISOString(),
      range.end.toISOString(),
    ],
    queryFn: async () =>
      (
        await api.get<{ data: CalendarTask[]; total: number }>("/api/tasks", {
          params: {
            view: "all",
            status: "全部",
            from: range.start.toISOString(),
            to: range.end.toISOString(),
            limit: 200,
          },
        })
      ).data,
  });

  useEffect(() => {
    if (view === "week") {
      scrollRef.current?.scrollTo({ top: 7 * HOUR_HEIGHT });
    }
  }, [view, cursor, tasks.isSuccess]);

  const rows = tasks.data?.data || [];
  // 接口一次最多 200 条；超出时提示，避免误以为没有安排
  const truncated = (tasks.data?.total ?? 0) > rows.length;
  // 拖动/改时长时实时预览：按 15 分钟对齐后的新时间重新排版，松手前就能看到落点
  const preview = (() => {
    if (!drag || (drag.mode !== "move" && drag.mode !== "resize") || !drag.moved)
      return null;
    if (drag.mode === "move") {
      return { id: drag.task.id, ...moveRange(drag.task, drag.deltaDays, drag.deltaMinutes) };
    }
    const endAt = resizeRange(drag.task, drag.newEndMin, drag.dayStart);
    return endAt ? { id: drag.task.id, startAt: drag.task.startAt, endAt } : null;
  })();
  // 原块留在原位变淡，另画一个虚影跟随指针（避免重排导致指针捕获丢失）
  const ghosts =
    preview && drag && drag.mode !== "create"
      ? layoutWeek([{ ...drag.task, ...preview }], week.start).timed
      : [];
  const layout = layoutWeek(rows, week.start);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(week.start, index),
  );
  const title =
    view === "week"
      ? `${format(week.start, "yyyy年M月d日")} – ${format(addDays(week.start, 6), "M月d日")}`
      : format(cursor, "yyyy年M月");

  const shift = (direction: 1 | -1) => {
    setCursor((current) =>
      view === "week"
        ? addDays(current, direction * 7)
        : addMonths(current, direction),
    );
  };

  const cacheKey = [
    "tasks",
    "calendar",
    range.start.toISOString(),
    range.end.toISOString(),
  ] as const;

  const patchTask = async (
    task: CalendarTask,
    next: { startAt: string; endAt: string },
  ) => {
    const previous = queryClient.getQueryData<TaskResponse>(cacheKey);
    queryClient.setQueryData<TaskResponse>(cacheKey, (old) =>
      old
        ? {
            ...old,
            data: old.data.map((item) =>
              item.id === task.id ? { ...item, ...next } : item,
            ),
          }
        : old,
    );
    setError("");
    try {
      await api.patch(`/api/tasks/${task.id}`, next);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (err) {
      queryClient.setQueryData(cacheKey, previous);
      setError(errorDetail(err) || "日程更新失败，请重试。");
    }
  };

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!composer) return;
    const title = composerTitle.trim();
    if (!title) {
      setComposerError("标题不能为空");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/api/tasks", {
        title,
        startAt: composer.startAt,
        endAt: composer.endAt,
        allDay: false,
      });
      setComposer(null);
      setComposerTitle("");
      setComposerError("");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (err) {
      setError(errorDetail(err) || "新建日程失败，请重试。");
    } finally {
      setSaving(false);
    }
  };

  const closeComposer = () => {
    setComposer(null);
    setComposerTitle("");
    setComposerError("");
  };

  const openComposer = (slot: Slot) => {
    setComposerTitle("");
    setComposerError("");
    setComposer(slot);
  };

  const startCreate = (
    event: ReactPointerEvent<HTMLDivElement>,
    dayIndex: number,
  ) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest(".cal-item, .cal-composer")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = yToMinutes(event.clientY - rect.top, HOUR_HEIGHT);
    setDrag({
      mode: "create",
      pointerId: event.pointerId,
      dayIndex,
      startMin: minutes,
      currentMin: minutes,
    });
  };

  const moveCreate = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag?.mode !== "create" || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = yToMinutes(event.clientY - rect.top, HOUR_HEIGHT);
    setDrag({ ...drag, currentMin: minutes });
  };

  const endCreate = (
    event: ReactPointerEvent<HTMLDivElement>,
    dayStart: Date,
  ) => {
    if (drag?.mode !== "create" || drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const startMin = Math.min(drag.startMin, drag.currentMin);
    const endMin = Math.max(drag.startMin, drag.currentMin);
    const slot = slotRange(dayStart, startMin, endMin);
    setDrag(null);
    if (slot.startAt) openComposer({ dayIndex: drag.dayIndex, startMin, endMin, ...slot });
  };

  const cancelDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (drag?.pointerId === event.pointerId) setDrag(null);
  };

  const startMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
    task: CalendarTask,
  ) => {
    if (!isDraggable(task) || event.button !== 0) return;
    event.stopPropagation();
    const column = event.currentTarget.closest(
      ".cal-day-col",
    ) as HTMLElement | null;
    if (!column) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      mode: "move",
      pointerId: event.pointerId,
      task,
      startX: event.clientX,
      startY: event.clientY,
      colWidth: column.getBoundingClientRect().width || 1,
      startDayIndex: differenceInCalendarDays(
        startOfDay(new Date(task.startAt ?? 0)),
        week.start,
      ),
      moved: false,
      deltaDays: 0,
      deltaMinutes: 0,
    });
  };

  const moveItem = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag?.mode !== "move" || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setDrag({
      ...drag,
      moved: drag.moved || Math.abs(dx) > 4 || Math.abs(dy) > 4,
      deltaDays: clampDayDelta(
        drag.startDayIndex,
        Math.round(dx / drag.colWidth),
      ),
      deltaMinutes: (dy / HOUR_HEIGHT) * 60,
    });
  };

  const endMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag?.mode !== "move" || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const state = drag;
    setDrag(null);
    if (!state.moved) return;
    suppressClick.current = true;
    const next = moveRange(state.task, state.deltaDays, state.deltaMinutes);
    if (next.startAt !== state.task.startAt) patchTask(state.task, next);
  };

  const startResize = (
    event: ReactPointerEvent<HTMLSpanElement>,
    task: CalendarTask,
    dayStart: Date,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const column = event.currentTarget.closest(
      ".cal-day-col",
    ) as HTMLElement | null;
    if (!column) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = column.getBoundingClientRect();
    setDrag({
      mode: "resize",
      pointerId: event.pointerId,
      task,
      dayStart,
      startY: event.clientY,
      moved: false,
      newEndMin: yToMinutes(event.clientY - rect.top, HOUR_HEIGHT),
    });
  };

  const moveResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (drag?.mode !== "resize" || drag.pointerId !== event.pointerId) return;
    const column = event.currentTarget.closest(
      ".cal-day-col",
    ) as HTMLElement | null;
    if (!column) return;
    const rect = column.getBoundingClientRect();
    setDrag({
      ...drag,
      moved: drag.moved || Math.abs(event.clientY - drag.startY) > 4,
      newEndMin: yToMinutes(event.clientY - rect.top, HOUR_HEIGHT),
    });
  };

  const endResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (drag?.mode !== "resize" || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const state = drag;
    setDrag(null);
    if (!state.moved) return;
    suppressClick.current = true;
    const endAt = resizeRange(state.task, state.newEndMin, state.dayStart);
    if (endAt && endAt !== state.task.endAt) {
      patchTask(state.task, {
        startAt: state.task.startAt ?? "",
        endAt,
      });
    }
  };

  useEffect(() => {
    if (composer) composerRef.current?.focus();
  }, [composer]);

  return (
    <main className="page cal-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">MAKE ROOM FOR WHAT MATTERS</p>
          <h1>日程</h1>
          <p className="muted">按周或按月查看安排，点击事项即可编辑。</p>
        </div>
        <div className="actions cal-actions">
          <div className="segmented cal-view-switch" aria-label="日历视图">
            <button
              className={view === "week" ? "active" : ""}
              onClick={() => setView("week")}
            >
              周
            </button>
            <button
              className={view === "month" ? "active" : ""}
              onClick={() => setView("month")}
            >
              月
            </button>
          </div>
          <button onClick={() => setCursor(new Date())}>今天</button>
          <button
            aria-label={view === "week" ? "上一周" : "上一月"}
            onClick={() => shift(-1)}
          >
            <ChevronLeft size={17} />
          </button>
          <strong className="cal-title">{title}</strong>
          <button
            aria-label={view === "week" ? "下一周" : "下一月"}
            onClick={() => shift(1)}
          >
            <ChevronRight size={17} />
          </button>
          <button
            aria-label="刷新日程"
            onClick={() => tasks.refetch()}
            disabled={tasks.isFetching}
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </section>

      {truncated && (
        <p className="cal-limit-notice" role="status">
          这段时间的事项超过 {rows.length} 条，只显示了前 {rows.length} 条。
        </p>
      )}
      {error && (
        <p className="error cal-error" role="alert">
          {error}
        </p>
      )}

      <section className="panel cal-panel">
        {tasks.isPending ? (
          <div className="empty" role="status">
            正在读取…
          </div>
        ) : tasks.isError ? (
          <p className="error" role="alert">
            日程加载失败，请检查连接后重试。
          </p>
        ) : view === "week" ? (
          <div className="cal-week">
            <div className="cal-week-head">
              <div className="cal-gutter-head" />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={
                    isSameDay(day, today) ? "cal-day-head today" : "cal-day-head"
                  }
                >
                  <small>{WEEKDAY_LABELS[(day.getDay() + 6) % 7]}</small>
                  <span>{format(day, "M月d日")}</span>
                </div>
              ))}
            </div>

            <div className="cal-all-day">
              <div className="cal-all-day-label">全天</div>
              <div className="cal-all-day-grid">
                {layout.allDay.map((item) => (
                  <button
                    key={`${item.task.id}-${item.kind}-${item.dayIndex}`}
                    className={`${itemClass(item.task)} cal-all-day-item`}
                    style={{
                      gridColumn: `${item.dayIndex + 1} / span ${item.span}`,
                      gridRow: item.row + 1,
                    }}
                    onClick={() => onOpenTask(item.task)}
                  >
                    {item.kind === "due" ? (
                      <span className="cal-due-label">
                        截止 {item.task.title}
                      </span>
                    ) : (
                      <span className="cal-item-title">{item.task.title}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="cal-scroll" ref={scrollRef}>
              <div
                className="cal-time-grid"
                style={{ height: 24 * HOUR_HEIGHT }}
              >
                <div className="cal-times">
                  {HOURS.map((hour) => (
                    <div key={hour} className="cal-hour-label">
                      {pad(hour)}:00
                    </div>
                  ))}
                </div>
                <div className="cal-columns">
                  {weekDays.map((day, dayIndex) => {
                    const composerTop =
                      Math.min(composer?.startMin ?? 0, 24 * 60 - 64) *
                      (HOUR_HEIGHT / 60);
                    return (
                      <div
                        key={day.toISOString()}
                        className={
                          isSameDay(day, today)
                            ? "cal-day-col today"
                            : "cal-day-col"
                        }
                        onPointerDown={(event) =>
                          startCreate(event, dayIndex)
                        }
                        onPointerMove={moveCreate}
                        onPointerUp={(event) => endCreate(event, day)}
                        onPointerCancel={cancelDrag}
                      >
                        {drag?.mode === "create" &&
                          drag.dayIndex === dayIndex && (
                            <div
                              className="cal-selection"
                              style={{
                                top:
                                  Math.min(drag.startMin, drag.currentMin) *
                                  (HOUR_HEIGHT / 60),
                                height:
                                  Math.max(
                                    Math.abs(drag.currentMin - drag.startMin),
                                    15,
                                  ) *
                                  (HOUR_HEIGHT / 60),
                              }}
                            />
                          )}
                        {ghosts
                          .filter((ghost) => ghost.dayIndex === dayIndex)
                          .map((ghost, index) => (
                            <div
                              key={`ghost-${index}`}
                              className="cal-drag-ghost"
                              aria-hidden="true"
                              style={{
                                top: ghost.top * (HOUR_HEIGHT / 60),
                                height: Math.max(
                                  ghost.height * (HOUR_HEIGHT / 60),
                                  20,
                                ),
                              }}
                            >
                              <span className="cal-item-title">
                                {ghost.task.title}
                              </span>
                              <small>{timeLabel(ghost.task)}</small>
                            </div>
                          ))}
                        {layout.timed
                          .filter((item) => item.dayIndex === dayIndex)
                          .map((item, index) => (
                            <button
                              key={`${item.task.id}-${index}`}
                              className={`${itemClass(item.task)} cal-timed-item${
                                ghosts.length && preview?.id === item.task.id
                                  ? " cal-dragging"
                                  : ""
                              }`}
                              title={`${timeLabel(item.task)} ${item.task.title}`}
                              style={{
                                top: item.top * (HOUR_HEIGHT / 60),
                                // 重叠事项按列并排
                                left: `calc(3px + (100% - 6px) * ${item.column} / ${item.columns})`,
                                width: `calc((100% - 6px) / ${item.columns} - 2px)`,
                                height: Math.max(
                                  item.height * (HOUR_HEIGHT / 60),
                                  20,
                                ),
                              }}
                              onPointerDown={(event) =>
                                startMove(event, item.task)
                              }
                              onPointerMove={moveItem}
                              onPointerUp={endMove}
                              onPointerCancel={cancelDrag}
                              onClick={() => {
                                if (suppressClick.current) {
                                  suppressClick.current = false;
                                  return;
                                }
                                onOpenTask(item.task);
                              }}
                            >
                              <span className="cal-item-title">
                                {item.task.title}
                              </span>
                              {/* 放不下两行（短于 45 分钟）时只显示单行标题，超出用省略号 */}
                              {item.height * (HOUR_HEIGHT / 60) >= 36 && (
                                <small>{timeLabel(item.task)}</small>
                              )}
                              {isDraggable(item.task) && (
                                <span
                                  className="cal-resize-handle"
                                  aria-hidden="true"
                                  onPointerDown={(event) =>
                                    startResize(event, item.task, day)
                                  }
                                  onPointerMove={moveResize}
                                  onPointerUp={endResize}
                                  onPointerCancel={cancelDrag}
                                />
                              )}
                            </button>
                          ))}
                        {composer?.dayIndex === dayIndex && (
                          <form
                            className="cal-composer"
                            style={{ top: composerTop }}
                            onSubmit={createTask}
                          >
                            <input
                              ref={composerRef}
                              value={composerTitle}
                              placeholder="日程标题"
                              disabled={saving}
                              onChange={(event) =>
                                setComposerTitle(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  closeComposer();
                                }
                              }}
                            />
                            {composerError ? (
                              <small className="cal-composer-error">
                                {composerError}
                              </small>
                            ) : (
                              <small>Enter 保存 · Esc 关闭</small>
                            )}
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="cal-month">
            <div className="cal-month-head">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>
            <div className="cal-month-grid">
              {month.days.map((day) => {
                const cell = monthCell(rows, day);
                const outside = day.getMonth() !== cursor.getMonth();
                return (
                  <div
                    key={day.toISOString()}
                    className={[
                      "cal-month-cell",
                      isSameDay(day, today) ? "today" : "",
                      outside ? "outside" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="cal-month-date">{format(day, "d")}</div>
                    <div className="cal-month-items">
                      {cell.visible.map((item) => (
                        <button
                          key={`${item.task.id}-${item.kind}`}
                          className={itemClass(item.task)}
                          onClick={() => onOpenTask(item.task)}
                        >
                          {item.kind === "due" ? (
                            <span className="cal-due-label">
                              截止 {item.task.title}
                            </span>
                          ) : (
                            <>
                              <span className="cal-item-title">
                                {item.task.title}
                              </span>
                              <small>{timeLabel(item.task)}</small>
                            </>
                          )}
                        </button>
                      ))}
                      {cell.more > 0 && (
                        <span className="cal-more">+{cell.more}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
      {!tasks.isPending && !tasks.isError && rows.length === 0 && (
        <div className="cal-empty">
          <CalendarDays size={28} />
          <p>这段时间还没有安排。</p>
        </div>
      )}
    </main>
  );
}
