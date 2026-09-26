import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyRecurrences, demoData, timestamp, uid, type AppData, type Client, type Payment, type Project, type SaveStatus, type Task } from './types';

type DataContextValue = {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  status: SaveStatus;
  addClient: (client: Client) => void;
  patchClient: (id: string, patch: Partial<Client>) => void;
  addProject: (project: Project) => void;
  patchProject: (id: string, patch: Partial<Project>) => void;
  addTask: (task: Task) => void;
  patchTask: (id: string, patch: Partial<Task>, history?: string) => void;
  moveTask: (id: string, stageId: string) => void;
  addPayment: (payment: Payment) => void;
};
const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState<SaveStatus>('saved');
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const loaded = window.flow ? await window.flow.load() : null;
        if (live) setData(applyRecurrences(loaded || demoData()));
      } catch (error) { if (live) setLoadError(error instanceof Error ? error.message : String(error)); }
    })();
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!data || !window.flow) return;
    setStatus('saving');
    window.flow.save(data).catch(() => setStatus('error'));
  }, [data]);
  useEffect(() => window.flow?.onSaveStatus(setStatus), []);
  const value = useMemo<DataContextValue | null>(() => data ? ({
    data, setData: setData as React.Dispatch<React.SetStateAction<AppData>>, status,
    addClient: client => setData(s => s && ({ ...s, clients: [...s.clients, client] })),
    patchClient: (id, patch) => setData(s => s && ({ ...s, clients: s.clients.map(c => c.id === id ? { ...c, ...patch } : c) })),
    addProject: project => setData(s => s && ({ ...s, projects: [...s.projects, project] })),
    patchProject: (id, patch) => setData(s => s && ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, ...patch } : p) })),
    addTask: task => setData(s => s && ({ ...s, tasks: [...s.tasks, task] })),
    patchTask: (id, patch, history) => setData(s => s && ({ ...s, tasks: s.tasks.map(t => t.id === id ? {
      ...t, ...patch, updatedAt: timestamp(),
      history: history ? [...t.history, { id: uid(), text: history, date: timestamp() }] : t.history,
    } : t) })),
    moveTask: (id, stageId) => setData(s => {
      if (!s) return s;
      const task = s.tasks.find(t => t.id === id);
      if (!task) return s;
      const project = s.projects.find(p => p.id === task.projectId);
      const from = project?.stages.find(st => st.id === task.stageId);
      const to = project?.stages.find(st => st.id === stageId);
      if (!to || task.stageId === stageId) return s;
      return { ...s, tasks: s.tasks.map(t => t.id === id ? {
        ...t, stageId, closed: to.kind === 'done', updatedAt: timestamp(),
        history: [...t.history, { id: uid(), text: `Moved from ${from?.name || 'stage'} to ${to.name}`, date: timestamp() }],
      } : t) };
    }),
    addPayment: payment => setData(s => s && ({ ...s, payments: [...s.payments, payment] })),
  }) : null, [data, status]);
  if (loadError) return <div className="boot-error"><h1>Could not open your data</h1><p>{loadError}</p><p>Your files have not been replaced. Check the storage folder and restart flow.crm.</p></div>;
  if (!value) return <div className="boot-loading">Opening flow.crm…</div>;
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('DataProvider is missing');
  return value;
}
