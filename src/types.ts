export type Priority = 'none' | 'low' | 'medium' | 'high';
export type Theme = 'system' | 'light' | 'dark';
export type Stage = { id: string; name: string; kind: 'active' | 'waiting' | 'done' };
export type Entry = { id: string; text: string; date: string };
export type Client = { id: string; name: string; company: string; email: string; phone: string; messenger: string; notes: string; contacts: { id: string; name: string; email: string; messenger: string }[]; createdAt: string };
export type Project = { id: string; name: string; clientId: string | null; color: string; folder: string; pinned: boolean; archived: boolean; archivedAt: string | null; budget: number; rate: number; description: string; stages: Stage[]; createdAt: string };
export type Task = { id: string; projectId: string; stageId: string; title: string; description: string; priority: Priority; dueDate: string; blocked: boolean; blockedReason: string; tags: string[]; checklist: { id: string; text: string; done: boolean }[]; comments: Entry[]; history: Entry[]; links: { id: string; label: string; url: string }[]; images: { id: string; url: string }[]; timeLogs: { id: string; minutes: number; date: string }[]; related: string[]; recurring: null | { intervalDays: number; lastCreatedAt: string }; closed: boolean; createdAt: string; updatedAt: string };
export type Payment = { id: string; projectId: string; amount: number; dueDate: string; paidAt: string; note: string; createdAt: string };
export type Settings = { theme: Theme; density: 'comfortable' | 'compact'; homePage: 'today' | 'projects'; dateFormat: 'short' | 'long'; defaultCurrency: 'USD' | 'EUR' | 'GBP'; weekStartsOn: 'monday' | 'sunday'; reminders: { tasks: boolean; clients: boolean; payments: boolean; windows: boolean } };
export type Template = { id: string; name: string; stages: { name: string; kind: Stage['kind'] }[] };
export type AppData = { schemaVersion: 1; clients: Client[]; projects: Project[]; tasks: Task[]; payments: Payment[]; templates: Template[]; settings: Settings };
export type StorageInfo = { mode: 'installed' | 'portable' | 'development'; path: string; sizeBytes: number; portableDefaultPath: string | null };
export type SaveStatus = 'saved' | 'saving' | 'error';

export const uid = () => crypto.randomUUID();
export const timestamp = () => new Date().toISOString();
export const todayISO = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
export const colors = ['#7468dc', '#5f93da', '#5ca987', '#dcad54', '#ce7e7a', '#be83ae'];
export const defaultStages = (): Stage[] => [
  { id: uid(), name: 'In progress', kind: 'active' },
  { id: uid(), name: 'With client', kind: 'waiting' },
  { id: uid(), name: 'Revisions', kind: 'active' },
  { id: uid(), name: 'Done', kind: 'done' },
];
export const makeProject = (name: string, clientId: string | null, color = colors[0], template?: Template): Project => ({
  id: uid(), name, clientId, color, folder: '', pinned: false, archived: false, archivedAt: null,
  budget: 0, rate: 0, description: '', stages: template ? template.stages.map(s => ({ ...s, id: uid() })) : defaultStages(), createdAt: timestamp(),
});
export const makeTask = (project: Project, title: string, stageId?: string): Task => ({
  id: uid(), projectId: project.id, stageId: stageId || project.stages[0]?.id || '', title,
  description: '', priority: 'none', dueDate: '', blocked: false, blockedReason: '', tags: [], checklist: [], comments: [],
  history: [{ id: uid(), text: 'Task created', date: timestamp() }], links: [], images: [], timeLogs: [], related: [], recurring: null,
  closed: false, createdAt: timestamp(), updatedAt: timestamp(),
});
export function demoData(): AppData {
  const client: Client = { id: uid(), name: 'Alex Carter', company: 'Studio North', email: 'alex@studionorth.example', phone: '', messenger: '', notes: '', contacts: [], createdAt: timestamp() };
  const project = makeProject('Studio North Website', client.id);
  project.pinned = true; project.budget = 12000; project.description = 'A website refresh for Studio North.';
  const task = makeTask(project, 'Open this task to explore flow.crm');
  task.description = 'Track the brief, checklist, due date and client feedback here. Add your own project when you are ready.';
  task.priority = 'medium';
  task.checklist = [{ id: uid(), text: 'Explore this task', done: false }, { id: uid(), text: 'Create your first project', done: false }];
  return { schemaVersion: 1, clients: [client], projects: [project], tasks: [task], payments: [], templates: [], settings: {
    theme: 'system', density: 'comfortable', homePage: 'today', dateFormat: 'short', defaultCurrency: 'USD', weekStartsOn: 'monday',
    reminders: { tasks: true, clients: true, payments: true, windows: false },
  } };
}
export const clientName = (data: AppData, project: Project) => data.clients.find(c => c.id === project.clientId)?.company || 'No client';
export const projectTasks = (data: AppData, projectId: string) => data.tasks.filter(t => t.projectId === projectId);
export const stageFor = (project: Project, task: Task) => project.stages.find(s => s.id === task.stageId);
export const dateDiff = (date: string) => date ? Math.round((new Date(date + 'T12:00:00').getTime() - new Date(todayISO() + 'T12:00:00').getTime()) / 86400000) : null;
export const money = (value: number, currency: Settings['defaultCurrency'] = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
export const dateLabel = (date: string) => date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';
export const sumPaid = (data: AppData, projectId: string) => data.payments.filter(p => p.projectId === projectId && p.paidAt).reduce((sum, p) => sum + p.amount, 0);
export function applyRecurrences(data: AppData): AppData {
  const next: Task[] = [];
  const tasks = data.tasks.map(task => {
    if (!task.recurring || task.closed || data.projects.find(p => p.id === task.projectId)?.archived) return task;
    const elapsed = Date.now() - new Date(task.recurring.lastCreatedAt).getTime();
    if (!Number.isFinite(elapsed) || elapsed < task.recurring.intervalDays * 86400000) return task;
    const copy: Task = { ...makeTask(data.projects.find(p => p.id === task.projectId)!, task.title, task.stageId),
      description: task.description, priority: task.priority, tags: [...task.tags],
      checklist: task.checklist.map(item => ({ ...item, id: uid(), done: false })),
      history: [{ id: uid(), text: 'Created from a recurring task', date: timestamp() }],
    };
    next.push(copy);
    return { ...task, recurring: { ...task.recurring, lastCreatedAt: timestamp() } };
  });
  return next.length ? { ...data, tasks: [...tasks, ...next] } : data;
}
