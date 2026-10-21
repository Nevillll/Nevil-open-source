// 示例数据（全部虚构）/ Fake demo data. Dates are relative to "now".
export const projects = [
  { id: 1, name: "示例项目 A", area: "work", status: "active" },
  { id: 2, name: "示例项目 B", area: "work", status: "active" },
  { id: 3, name: "健身计划", area: "personal", status: "active" },
  { id: 4, name: "读书清单", area: "personal", status: "active" },
];

function at(dayOffset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function seedTasks() {
  const base = { status: "未完成", important: false, urgent: false, notes: null, tags: [] as string[], updatedAt: at(0, 8) };
  return [
    { ...base, id: "1", title: "整理周报草稿", projectId: 1, dueAt: at(0, 18), important: true, tags: ["写作"] },
    { ...base, id: "2", title: "回复示例客户的邮件", projectId: 2, dueAt: at(-1, 17), urgent: true },
    { ...base, id: "3", title: "需求评审会", projectId: 1, startAt: at(1, 15), endAt: at(1, 16), dueAt: at(1, 16) },
    { ...base, id: "4", title: "夜跑 5 公里", projectId: 3, startAt: at(2, 20), endAt: at(2, 21), dueAt: at(2, 21) },
    { ...base, id: "5", title: "读完《示例之书》第三章", projectId: 4, dueAt: at(10, 22) },
    { ...base, id: "6", title: "想一想下季度目标", projectId: null, notes: "没有截止日期的任务示例" },
    { ...base, id: "7", title: "预约体检", projectId: 3, status: "进行中", dueAt: at(4, 10) },
    { ...base, id: "8", title: "更新 UI 规范截图", projectId: 2, status: "已完成", dueAt: at(-2, 12), completedAt: at(-2, 11) },
    { ...base, id: "9", title: "设计评审", projectId: 1, startAt: at(0, 10), endAt: at(0, 11, 30), dueAt: at(0, 11, 30) },
  ];
}
