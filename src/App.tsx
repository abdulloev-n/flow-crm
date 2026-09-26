import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Archive, BarChart3, CheckSquare2, ChevronDown, CircleHelp, Folder, Home, Menu as MenuIcon, Moon, Plus, Search, Settings as SettingsIcon, Sun, Users, X } from 'lucide-react';
import { useData } from './data';
import { Button, Field, IconButton, Modal, SelectMenu } from './components';
import { clientName, colors, dateDiff, makeProject, makeTask, stageFor, todayISO, type AppData, type Project } from './types';
import { Today } from './screens/Today';
import { AllTasks } from './screens/AllTasks';
import { Projects, ProjectDetail, ArchivePage } from './screens/Projects';
import { Clients } from './screens/Clients';
import { Finances } from './screens/Finances';
import { Settings } from './screens/Settings';
import { TaskPanel } from './screens/TaskPanel';

type UIContextValue = { toast: (text: string) => void; openTask: (id: string) => void; closeTask: () => void; newTask: (projectId?: string) => void; newProject: () => void };
const UIContext = createContext<UIContextValue | null>(null);
export function useUI() { const value = useContext(UIContext); if (!value) throw new Error('UI context missing'); return value; }

function Sidebar({ data, onNewProject }: { data: AppData; onNewProject: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [closedFolders, setClosedFolders] = useState<string[]>([]);
  const active = data.projects.filter(p => !p.archived);
  const pinned = active.filter(p => p.pinned);
  const unpinned = active.filter(p => !p.pinned);
  const unfiled = unpinned.filter(p => !p.folder);
  const folders = [...new Set(unpinned.map(p => p.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const links = [
    { to: '/today', text: 'Today', icon: Home }, { to: '/tasks', text: 'All Tasks', icon: CheckSquare2 },
    { to: '/projects', text: 'Projects', icon: Folder }, { to: '/clients', text: 'Clients', icon: Users },
    { to: '/finances', text: 'Finances', icon: BarChart3 },
  ];
  return <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <div className="sidebar-brand"><span className="brand">flow<span>.</span>crm</span><IconButton icon={MenuIcon} label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(x => !x)} /></div>
    <nav className="sidebar-main" aria-label="Main navigation">
      {links.map(({ to, text, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title={text}><Icon size={18} strokeWidth={1.8} />{!collapsed && <span>{text}</span>}</NavLink>)}
    </nav>
    <div className="sidebar-projects">
      {!collapsed && <div className="sidebar-section-title"><span>Pinned projects</span><button title="New project" onClick={onNewProject}><Plus size={15} /></button></div>}
      {pinned.map(p => <ProjectNav key={p.id} project={p} data={data} collapsed={collapsed} />)}
      {collapsed ? unpinned.map(p => <ProjectNav key={p.id} project={p} data={data} collapsed />) : <>
        {unfiled.length > 0 && <><div className="sidebar-section-title other-title">Projects</div>{unfiled.map(p => <ProjectNav key={p.id} project={p} data={data} />)}</>}
        {folders.map(folder => <div key={folder}><button className="sidebar-folder" onClick={() => setClosedFolders(items => items.includes(folder) ? items.filter(x => x !== folder) : [...items, folder])}><ChevronDown size={13} className={closedFolders.includes(folder) ? 'closed' : ''} /><span>{folder}</span><small>{unpinned.filter(p => p.folder === folder).length}</small></button>{!closedFolders.includes(folder) && unpinned.filter(p => p.folder === folder).map(p => <ProjectNav key={p.id} project={p} data={data} />)}</div>)}
      </>}
    </div>
    <div className="sidebar-bottom"><NavLink to="/archive" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Archive"><Archive size={18} />{!collapsed && <><span>Archive</span><small className="archive-count">{data.projects.filter(p => p.archived).length}</small></>}</NavLink><NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Settings"><SettingsIcon size={18} />{!collapsed && <span>Settings</span>}</NavLink></div>
  </aside>;
}
function ProjectNav({ project, data, collapsed = false }: { project: Project; data: AppData; collapsed?: boolean }) {
  return <NavLink to={`/projects/${project.id}`} className={({ isActive }) => `project-nav ${isActive ? 'active' : ''}`} title={`${project.name} · ${clientName(data, project)}`}>
    {collapsed ? <span className="collapsed-project-icon" style={{ background: project.color }}>{project.name[0]?.toUpperCase()}</span> : <><span className="project-dot" style={{ background: project.color }} /><span className="truncate">{project.name}</span></>}
  </NavLink>;
}

function NewProjectModal({ open, close }: { open: boolean; close: () => void }) {
  const { data, addProject } = useData();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [color, setColor] = useState(colors[0]);
  const [templateId, setTemplateId] = useState('');
  const submit = () => {
    if (!name.trim()) return;
    const project = makeProject(name.trim(), clientId || null, color, data.templates.find(t => t.id === templateId));
    addProject(project); setName(''); setClientId(''); close(); navigate(`/projects/${project.id}`);
  };
  return <Modal open={open} onOpenChange={v => !v && close()} title="New project">
    <div className="form-stack"><Field label="Project name"><input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="e.g. Studio North Website" /></Field>
      <Field label="Client"><SelectMenu label="Client" value={clientId} options={[{ value: '', label: 'Choose later' }, ...data.clients.map(c => ({ value: c.id, label: c.company }))]} onChange={setClientId} /></Field>
      <Field label="Project color"><div className="color-picker">{colors.map(c => <button key={c} type="button" aria-label={`Select ${c}`} onClick={() => setColor(c)} className={color === c ? 'selected' : ''} style={{ background: c }} />)}</div></Field>
      {data.templates.length > 0 && <Field label="Stage template"><SelectMenu label="Stage template" value={templateId} options={[{ value: '', label: 'Default stages' }, ...data.templates.map(t => ({ value: t.id, label: t.name }))]} onChange={setTemplateId} /></Field>}
      <div className="form-actions"><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={submit} disabled={!name.trim()}>Create project</Button></div></div>
  </Modal>;
}

function NewTaskModal({ open, close, initialProjectId }: { open: boolean; close: () => void; initialProjectId?: string }) {
  const { data, addTask } = useData();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(initialProjectId || '');
  useEffect(() => { if (open) setProjectId(initialProjectId || ''); }, [initialProjectId, open]);
  const project = data.projects.find(p => p.id === projectId && !p.archived);
  const submit = () => {
    if (!project || !title.trim()) return;
    const task = makeTask(project, title.trim());
    addTask(task); setTitle(''); close();
    navigate(`/projects/${project.id}?task=${task.id}`);
  };
  return <Modal open={open} onOpenChange={v => !v && close()} title="New task">
    <div className="form-stack"><Field label="Task name"><input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="What needs to be done?" /></Field>
      <Field label="Project"><SelectMenu label="Project" value={projectId} options={[{ value: '', label: 'Choose a project' }, ...data.projects.filter(p => !p.archived).map(p => ({ value: p.id, label: p.name }))]} onChange={setProjectId} /></Field>
      <div className="form-actions"><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!project || !title.trim()} onClick={submit}>Create task</Button></div></div>
  </Modal>;
}

function GlobalSearch({ open, close }: { open: boolean; close: () => void }) {
  const { data } = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) setQuery(''); }, [open]);
  const q = query.trim().toLowerCase();
  const tasks = q ? data.tasks.filter(t => (t.title + ' ' + t.description).toLowerCase().includes(q)).slice(0, 6) : [];
  const projects = q ? data.projects.filter(p => p.name.toLowerCase().includes(q)).slice(0, 4) : [];
  const clients = q ? data.clients.filter(c => (c.company + ' ' + c.name).toLowerCase().includes(q)).slice(0, 4) : [];
  return <Modal open={open} onOpenChange={v => !v && close()} title="Search flow.crm" width={600}>
    <div className="search-modal"><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks, projects and clients" />
      {!q && <p className="muted search-tip">Type a name or a word from a task description.</p>}
      {q && !tasks.length && !projects.length && !clients.length && <p className="muted search-tip">No results found.</p>}
      {projects.length > 0 && <div className="search-group"><div>Projects</div>{projects.map(p => <button key={p.id} onClick={() => { close(); navigate(`/projects/${p.id}`); }}><Folder size={15} />{p.name}</button>)}</div>}
      {tasks.length > 0 && <div className="search-group"><div>Tasks</div>{tasks.map(t => <button key={t.id} onClick={() => { close(); navigate(`/projects/${t.projectId}?task=${t.id}`); }}><CheckSquare2 size={15} />{t.title}</button>)}</div>}
      {clients.length > 0 && <div className="search-group"><div>Clients</div>{clients.map(c => <button key={c.id} onClick={() => { close(); navigate(`/clients?client=${c.id}`); }}><Users size={15} />{c.company}</button>)}</div>}
    </div>
  </Modal>;
}

export default function App() {
  const { data, setData, status } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [toastText, setToastText] = useState('');
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskProjectId, setTaskProjectId] = useState<string | undefined>();
  const [searchOpen, setSearchOpen] = useState(false);
  const taskId = new URLSearchParams(location.search).get('task');
  const openTask = (id: string) => { const params = new URLSearchParams(location.search); params.set('task', id); navigate(`${location.pathname}?${params}`); };
  const closeTask = () => { const params = new URLSearchParams(location.search); params.delete('task'); navigate(`${location.pathname}${params.size ? '?' + params : ''}`, { replace: true }); };
  const ui = useMemo<UIContextValue>(() => ({
    toast: text => { setToastText(text); window.setTimeout(() => setToastText(''), 4500); },
    openTask, closeTask,
    newTask: projectId => { setTaskProjectId(projectId); setNewTaskOpen(true); },
    newProject: () => setNewProjectOpen(true),
  }), [location.pathname, location.search]);
  useEffect(() => {
    const apply = () => { document.documentElement.dataset.theme = data.settings.theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : data.settings.theme; document.documentElement.dataset.density = data.settings.density; };
    apply(); const media = matchMedia('(prefers-color-scheme: dark)'); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply);
  }, [data.settings.theme, data.settings.density]);
  useEffect(() => {
    if (!data.settings.reminders.windows || !window.flow) return;
    const today = todayISO();
    const key = `flow.crm-alert-${today}`;
    if (sessionStorage.getItem(key)) return;
    const open = data.tasks.filter(t => !t.closed && !data.projects.find(p => p.id === t.projectId)?.archived);
    const due = data.settings.reminders.tasks ? open.filter(t => t.dueDate && (dateDiff(t.dueDate) ?? 99) <= 7).length : 0;
    const waiting = data.settings.reminders.clients ? open.filter(t => { const p = data.projects.find(p => p.id === t.projectId); return p && stageFor(p, t)?.kind === 'waiting'; }).length : 0;
    const payments = data.settings.reminders.payments ? data.payments.filter(p => !p.paidAt && p.dueDate && (dateDiff(p.dueDate) ?? 99) <= 7).length : 0;
    const parts = [due && `${due} due task${due === 1 ? '' : 's'}`, waiting && `${waiting} task${waiting === 1 ? '' : 's'} waiting on clients`, payments && `${payments} expected payment${payments === 1 ? '' : 's'}`].filter(Boolean);
    if (parts.length) { sessionStorage.setItem(key, '1'); window.flow.notify('Your work needs attention', parts.join(' · ')); }
  }, [data]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName) || (document.activeElement as HTMLElement)?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (!typing && !taskId && !newTaskOpen && !newProjectOpen && e.key.toLowerCase() === 'n') { e.preventDefault(); ui.newTask(); }
      if (!typing && !taskId && !newTaskOpen && !newProjectOpen && e.key === '/') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [taskId, newTaskOpen, newProjectOpen, ui]);
  const toggleTheme = () => setData(s => ({ ...s, settings: { ...s.settings, theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' } }));
  return <UIContext.Provider value={ui}>
    <div className="app-shell"><Sidebar data={data} onNewProject={() => setNewProjectOpen(true)} />
      <div className="app-main"><header className="topbar"><button className="global-search" onClick={() => setSearchOpen(true)}><Search size={17} /><span>Search tasks, projects, clients…</span><kbd>Ctrl K</kbd></button>
        <div className="topbar-right"><span className={`save-indicator ${status}`}>{status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Save failed'}</span><IconButton icon={document.documentElement.dataset.theme === 'dark' ? Sun : Moon} label="Toggle theme" onClick={toggleTheme} /><span className="avatar" title="Local workspace">F</span></div></header>
        <main className="page"><Routes>
          <Route path="/" element={<Navigate to={data.settings.homePage === 'today' ? '/today' : '/projects'} replace />} />
          <Route path="/today" element={<Today />} /><Route path="/tasks" element={<AllTasks />} />
          <Route path="/projects" element={<Projects />} /><Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/clients" element={<Clients />} /><Route path="/finances" element={<Finances />} />
          <Route path="/archive" element={<ArchivePage />} /><Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes></main>
      </div></div>
    {taskId && data.tasks.some(t => t.id === taskId) && <TaskPanel taskId={taskId} onClose={closeTask} />}
    <NewProjectModal open={newProjectOpen} close={() => setNewProjectOpen(false)} />
    <NewTaskModal open={newTaskOpen} close={() => setNewTaskOpen(false)} initialProjectId={taskProjectId} />
    <GlobalSearch open={searchOpen} close={() => setSearchOpen(false)} />
    {toastText && <div className="toast" role="status"><CircleHelp size={16} />{toastText}<button aria-label="Dismiss" onClick={() => setToastText('')}><X size={14} /></button></div>}
  </UIContext.Provider>;
}
