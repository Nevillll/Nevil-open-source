// 本地 Mock 数据层：拦截 /api/* 请求，数据存在内存（刷新即重置），不需要后端。
// Mock data layer: serves /api/* from memory so the UI runs without a backend.
import axios from "axios";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { projects, seedTasks } from "./mockData";

type Row = Record<string, unknown> & { id: string };
let tasks: Row[] = seedTasks();
let seq = 1000;

function withProject(t: Row) {
  const p = projects.find((x) => x.id === t.projectId);
  return { ...t, projectName: p?.name ?? null };
}

const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const url = new URL(config.url || "", "http://mock.local");
  const method = (config.method || "get").toLowerCase();
  const body = typeof config.data === "string" ? JSON.parse(config.data || "{}") : config.data || {};
  const ok = (data: unknown, status = 200) => ({
    data, status, statusText: "OK", headers: {}, config, request: {},
  });
  await new Promise((r) => setTimeout(r, 120));
  const path = url.pathname;
  if (path === "/api/projects") return ok({ data: projects });
  if (path === "/api/tasks" && method === "get") {
    const params = { ...Object.fromEntries(url.searchParams), ...(config.params || {}) };
    let list = tasks;
    if (params.from && params.to) {
      const from = Date.parse(params.from), to = Date.parse(params.to);
      list = list.filter((t) => {
        const s = (t.startAt || t.dueAt) as string | null;
        if (!s) return false;
        const v = Date.parse(s);
        return v >= from && v < to;
      });
    }
    return ok({ data: list.map(withProject), total: list.length });
  }
  if (path === "/api/tasks" && method === "post") {
    const t: Row = {
      id: String(++seq), status: "未完成", important: false, urgent: false,
      notes: null, tags: [], projectId: null, dueAt: null,
      ...body, updatedAt: new Date().toISOString(),
    };
    tasks = [...tasks, t];
    return ok(withProject(t), 201);
  }
  const m = path.match(/^\/api\/tasks\/([^/]+)$/);
  if (m) {
    const i = tasks.findIndex((t) => t.id === m[1]);
    if (i < 0) return Promise.reject({ response: { status: 404, data: { error: "任务不存在" } } });
    if (method === "delete") {
      tasks = tasks.filter((t) => t.id !== m[1]);
      return ok({ ok: true });
    }
    const next: Row = { ...tasks[i], ...body, updatedAt: new Date().toISOString() };
    if (body.status === "已完成" && !next.completedAt) next.completedAt = new Date().toISOString();
    if (body.status && body.status !== "已完成") next.completedAt = null;
    tasks = tasks.map((t, j) => (j === i ? next : t));
    return ok(withProject(next));
  }
  return Promise.reject({ response: { status: 404, data: { error: "Mock 未实现该接口" } } });
};

const apiClient = axios.create({ adapter: mockAdapter });
export default apiClient;
