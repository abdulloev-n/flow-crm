import { Archive, ArchiveRestore, ArrowRight, Calendar, CheckSquare2, CircleDollarSign, Folder, GripVertical, MoreHorizontal, Pencil, Pin, PinOff, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useData } from '../data';
import { Button, DueLabel, Empty, Field, IconButton, Menu, MenuItem, MenuSeparator, MenuSub, Modal, SelectMenu } from '../components';
import { useUI } from '../App';
import { clientName, colors, dateLabel, makeTask, money, projectTasks, stageFor, sumPaid, timestamp, uid, type Project, type Task } from '../types';

function ProjectMenu({ project, onRename, onArchive, onDelete, onFolder, onTemplate }: { project: Project; onRename: () => void; onArchive: () => void; onDelete: () => void; onFolder: () => void; onTemplate?: () => void }) {
  const { patchProject } = useData();
  return <Menu trigger={<IconButton icon={MoreHorizontal} label="Project actions" />}>
    <MenuItem icon={Pencil} onSelect={onRename}>Rename project</MenuItem>
    <MenuItem icon={project.pinned ? PinOff : Pin} onSelect={() => patchProject(project.id, { pinned: !project.pinned })}>{project.pinned ? 'Unpin project' : 'Pin project'}</MenuItem>
    <MenuItem icon={Folder} onSelect={onFolder}>Move to folder</MenuItem>
    <MenuSub label="Project color"><div className="menu-color-row">{colors.map(c => <button key={c} title={c} onClick={() => patchProject(project.id, { color: c })} style={{ background: c }} />)}</div></MenuSub>
    {onTemplate && <MenuItem icon={Save} onSelect={onTemplate}>Save stages as template</MenuItem>}
    <MenuSeparator /><MenuItem icon={Archive} onSelect={onArchive}>Archive project</MenuItem><MenuItem icon={Trash2} danger onSelect={onDelete}>Delete project</MenuItem>
  </Menu>;
}

export function Projects() {
  const { data, patchProject, setData } = useData();
  const { newProject, toast } = useUI();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ type: 'rename' | 'folder' | 'delete'; project: Project } | null>(null);
  const [value, setValue] = useState('');
  const projects = data.projects.filter(p => !p.archived && (p.name + ' ' + clientName(data, p)).toLowerCase().includes(search.toLowerCase()));
  const openDialog = (type: 'rename' | 'folder' | 'delete', project: Project) => { setDialog({ type, project }); setValue(type === 'rename' ? project.name : project.folder); };
  const confirm = () => {
    if (!dialog) return;
    if (dialog.type === 'rename' && value.trim()) patchProject(dialog.project.id, { name: value.trim() });
    if (dialog.type === 'folder') patchProject(dialog.project.id, { folder: value.trim() });
    if (dialog.type === 'delete') setData(s => ({ ...s, projects: s.projects.filter(p => p.id !== dialog.project.id), tasks: s.tasks.filter(t => t.projectId !== dialog.project.id), payments: s.payments.filter(p => p.projectId !== dialog.project.id) }));
    setDialog(null);
  };
  return <div className="content projects-page"><div className="page-heading"><div><h1>Projects</h1><p>Keep client work in one place</p></div><Button variant="primary" onClick={newProject}><Plus size={17} /> New project</Button></div>
    <div className="filterbar"><div className="filter-search projects-search"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…" /></div></div>
    {projects.length === 0 ? <Empty icon={Folder} title="No projects found" text="Create your first project or change the search." action={<Button variant="primary" onClick={newProject}>New project</Button>} /> :
      <div className="project-list"><div className="project-list-head"><span>Project</span><span>Client</span><span>Open tasks</span><span>Budget</span><span></span></div>
        {projects.map(project => <div className="project-list-row" key={project.id}>
          <Link to={`/projects/${project.id}`} className="project-list-name"><span className="project-icon" style={{ background: project.color }}>{project.name[0]?.toUpperCase()}</span><span><strong>{project.name}</strong>{project.folder && <small>{project.folder}</small>}</span></Link>
          <span>{clientName(data, project)}</span><span>{projectTasks(data, project.id).filter(t => !t.closed).length}</span><span>{money(project.budget, data.settings.defaultCurrency)}</span>
          <ProjectMenu project={project} onRename={() => openDialog('rename', project)} onFolder={() => openDialog('folder', project)} onDelete={() => openDialog('delete', project)} onArchive={() => { patchProject(project.id, { archived: true, archivedAt: timestamp(), pinned: false }); toast('Project moved to Archive'); }} />
        </div>)}</div>}
    <Modal open={!!dialog} onOpenChange={v => !v && setDialog(null)} title={dialog?.type === 'rename' ? 'Rename project' : dialog?.type === 'folder' ? 'Move to folder' : 'Delete project'}>
      {dialog?.type === 'delete' ? <p className="dialog-copy">Delete “{dialog.project.name}” and its {projectTasks(data, dialog.project.id).length} tasks? You can archive the project if you may need it later.</p> : <Field label={dialog?.type === 'rename' ? 'Project name' : 'Folder name'}><input autoFocus value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirm()} placeholder={dialog?.type === 'folder' ? 'Leave empty to remove folder' : ''} /></Field>}
      <div className="form-actions"><Button onClick={() => setDialog(null)}>Cancel</Button><Button variant={dialog?.type === 'delete' ? 'danger' : 'primary'} onClick={confirm}>{dialog?.type === 'delete' ? 'Delete project' : 'Save'}</Button></div>
    </Modal>
  </div>;
}

function BoardCard({ task, project, onOpen, onDragStart, onDragEnd }: { task: Task; project: Project; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const done = task.checklist.filter(x => x.done).length;
  return <button draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onOpen} className={`board-card ${task.closed ? 'completed' : ''}`}>
    <div className="board-card-top"><span>{task.title}</span>{task.recurring && <span title="Recurring task">↻</span>}</div>
    {task.tags.length > 0 && <div className="card-tags">{task.tags.slice(0, 2).map(tag => <span key={tag}>{tag}</span>)}</div>}
    {(task.dueDate || task.checklist.length > 0 || task.blocked) && <div className="board-card-meta">
      {task.dueDate && <span><Calendar size={13} /><DueLabel date={task.dueDate} closed={task.closed} /></span>}
      {task.checklist.length > 0 && <span><CheckSquare2 size={13} />{done}/{task.checklist.length}</span>}
      {task.blocked && <span className="due-overdue">Blocked</span>}
    </div>}
    {stageFor(project, task)?.kind === 'done' && <span className="completed-mark">✓</span>}
  </button>;
}

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, setData, patchProject, addTask, moveTask } = useData();
  const { openTask, newTask, toast } = useUI();
  const project = data.projects.find(p => p.id === id && !p.archived);
  const [dialog, setDialog] = useState<'rename' | 'folder' | 'archive' | 'delete' | 'template' | 'addStage' | 'removeStage' | 'renameStage' | null>(null);
  const [value, setValue] = useState('');
  const [removeStageId, setRemoveStageId] = useState('');
  const [renameStageId, setRenameStageId] = useState('');
  const [replacementId, setReplacementId] = useState('');
  const [dragTaskId, setDragTaskId] = useState('');
  const [dragStageId, setDragStageId] = useState('');
  const [hoverStageId, setHoverStageId] = useState('');
  const [addingStageId, setAddingStageId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('all');
  const tab = params.get('tab') || 'board';
  const tasks = useMemo(() => project ? projectTasks(data, project.id) : [], [data, project]);
  if (!project) return <div className="content"><Empty icon={Folder} title="Project not found" action={<Link to="/projects"><Button>Back to projects</Button></Link>} /></div>;
  const setTab = (next: string) => { const p = new URLSearchParams(params); p.set('tab', next); setParams(p); };
  const visible = (t: Task) => (showClosed || !t.closed) && (!search || (t.title + ' ' + t.description).toLowerCase().includes(search.toLowerCase())) && (priority === 'all' || t.priority === priority);
  const createTask = (stageId: string) => { if (!newTitle.trim()) return; addTask(makeTask(project, newTitle.trim(), stageId)); setNewTitle(''); };
  const openDialog = (type: typeof dialog) => { setDialog(type); setValue(type === 'rename' ? project.name : type === 'folder' ? project.folder : type === 'template' ? project.name : ''); };
  const confirm = () => {
    if (dialog === 'rename' && value.trim()) patchProject(project.id, { name: value.trim() });
    if (dialog === 'folder') patchProject(project.id, { folder: value.trim() });
    if (dialog === 'archive') { patchProject(project.id, { archived: true, archivedAt: timestamp(), pinned: false }); navigate('/projects'); toast('Project moved to Archive'); }
    if (dialog === 'delete') { setData(s => ({ ...s, projects: s.projects.filter(p => p.id !== project.id), tasks: s.tasks.filter(t => t.projectId !== project.id), payments: s.payments.filter(p => p.projectId !== project.id) })); navigate('/projects'); }
    if (dialog === 'template' && value.trim()) { setData(s => ({ ...s, templates: [...s.templates, { id: uid(), name: value.trim(), stages: project.stages.map(st => ({ name: st.name, kind: st.kind })) }] })); toast('Stage template saved'); }
    if (dialog === 'addStage' && value.trim()) patchProject(project.id, { stages: [...project.stages, { id: uid(), name: value.trim(), kind: 'active' }] });
    if (dialog === 'renameStage' && value.trim()) patchProject(project.id, { stages: project.stages.map(st => st.id === renameStageId ? { ...st, name: value.trim() } : st) });
    if (dialog === 'removeStage' && replacementId) {
      setData(s => ({ ...s,
        projects: s.projects.map(p => p.id === project.id ? { ...p, stages: p.stages.filter(st => st.id !== removeStageId) } : p),
        tasks: s.tasks.map(t => t.projectId === project.id && t.stageId === removeStageId ? { ...t, stageId: replacementId, closed: project.stages.find(st => st.id === replacementId)?.kind === 'done' } : t),
      }));
    }
    setDialog(null);
  };
  const drop = (targetId: string) => {
    if (dragTaskId) moveTask(dragTaskId, targetId);
    if (dragStageId && dragStageId !== targetId) {
      const stages = [...project.stages]; const from = stages.findIndex(st => st.id === dragStageId); const to = stages.findIndex(st => st.id === targetId);
      if (from >= 0 && to >= 0) { const [moved] = stages.splice(from, 1); stages.splice(to, 0, moved); patchProject(project.id, { stages }); }
    }
    setDragTaskId(''); setDragStageId(''); setHoverStageId('');
  };
  const setStageKind = (stageId: string, kind: Project['stages'][number]['kind']) => {
    setData(s => ({ ...s,
      projects: s.projects.map(p => p.id === project.id ? { ...p, stages: p.stages.map(st => st.id === stageId ? { ...st, kind } : st) } : p),
      tasks: s.tasks.map(t => t.projectId === project.id && t.stageId === stageId ? { ...t, closed: kind === 'done', updatedAt: timestamp() } : t),
    }));
  };
  return <div className="project-detail"><div className="project-header">
    <div className="breadcrumbs"><Link to="/projects">Projects</Link><ArrowRight size={13} /><span>{project.name}</span></div>
    <div className="project-title-row"><div><div className="project-title-with-menu"><h1>{project.name}</h1><ProjectMenu project={project} onRename={() => openDialog('rename')} onFolder={() => openDialog('folder')} onArchive={() => openDialog('archive')} onDelete={() => openDialog('delete')} onTemplate={() => openDialog('template')} /></div><p>Client · {clientName(data, project)}</p></div><Button variant="primary" onClick={() => newTask(project.id)}><Plus size={17} /> New task</Button></div>
    <div className="project-tabs">{[['board', 'Board'], ['list', 'List'], ['about', 'About']].map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
  </div>
  {tab !== 'about' && <div className="project-tools"><div className="filter-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search this project…" /></div><SelectMenu label="Priority filter" value={priority} options={[{ value: 'all', label: 'Any priority' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }, { value: 'none', label: 'None' }]} onChange={setPriority} /><label className="check-label"><input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} />Show completed</label></div>}
  {tab === 'board' && <div className="board-scroll"><div className="kanban-board">{project.stages.map(stage => {
    const cards = tasks.filter(t => t.stageId === stage.id && visible(t)).sort((a, b) => !a.dueDate ? 1 : !b.dueDate ? -1 : a.dueDate.localeCompare(b.dueDate));
    return <div key={stage.id} className={`kanban-column ${hoverStageId === stage.id ? 'drop-hover' : ''}`} onDragOver={e => { e.preventDefault(); setHoverStageId(stage.id); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHoverStageId(''); }} onDrop={e => { e.preventDefault(); drop(stage.id); }}>
      <div className="column-heading"><button draggable title="Drag stage" className="drag-handle" onDragStart={() => setDragStageId(stage.id)} onDragEnd={() => setDragStageId('')}><GripVertical size={15} /></button><span className={`stage-indicator stage-${stage.kind}`} /><strong>{stage.name}</strong><span className="column-count">{tasks.filter(t => t.stageId === stage.id && !t.closed).length}</span>
        <Menu trigger={<IconButton icon={MoreHorizontal} label={`${stage.name} actions`} />}><MenuItem icon={Pencil} onSelect={() => { setRenameStageId(stage.id); setValue(stage.name); setDialog('renameStage'); }}>Rename stage</MenuItem><MenuSub label="Stage type"><MenuItem onSelect={() => setStageKind(stage.id, 'active')}>Active</MenuItem><MenuItem onSelect={() => setStageKind(stage.id, 'waiting')}>Waiting on client</MenuItem><MenuItem onSelect={() => setStageKind(stage.id, 'done')}>Done</MenuItem></MenuSub><MenuSeparator /><MenuItem icon={Trash2} danger disabled={project.stages.length < 2} onSelect={() => { setRemoveStageId(stage.id); setReplacementId(project.stages.find(s => s.id !== stage.id)?.id || ''); setDialog('removeStage'); }}>Remove stage</MenuItem></Menu>
      </div>
      <div className="column-cards">{cards.map(task => <BoardCard key={task.id} task={task} project={project} onOpen={() => openTask(task.id)} onDragStart={() => setDragTaskId(task.id)} onDragEnd={() => setDragTaskId('')} />)}{!cards.length && <div className="column-empty">Drag a task here or add one below</div>}</div>
      {addingStageId === stage.id ? <input autoFocus className="inline-add" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createTask(stage.id); if (e.key === 'Escape') setAddingStageId(''); }} onBlur={() => { if (!newTitle) setAddingStageId(''); }} placeholder="Task name, Enter to add" /> : <button className="column-add" onClick={() => { setAddingStageId(stage.id); setNewTitle(''); }}><Plus size={15} /> Add a task</button>}
    </div>;
  })}<button className="add-stage-button" onClick={() => openDialog('addStage')}><Plus size={16} /> Add stage</button></div></div>}
  {tab === 'list' && <div className="project-list-tab"><div className="simple-table"><div className="table-head project-task-grid"><span>Task</span><span>Stage</span><span>Due date</span><span>Priority</span></div>{tasks.filter(visible).map(t => <button key={t.id} className="table-row project-task-grid" onClick={() => openTask(t.id)}><span className="task-title">{t.title}</span><span>{stageFor(project, t)?.name}</span><DueLabel date={t.dueDate} closed={t.closed} /><span className={`priority-label priority-${t.priority}`}>{t.priority}</span></button>)}</div>{!tasks.length && <Empty icon={CheckSquare2} title="No tasks yet" text="Add the first task to this project." />}</div>}
  {tab === 'about' && <div className="project-about"><section><h2>Project details</h2><Field label="Description"><textarea value={project.description} onChange={e => patchProject(project.id, { description: e.target.value })} placeholder="Add a project brief or notes" rows={5} /></Field><Field label="Client"><SelectMenu label="Client" value={project.clientId || ''} options={[{ value: '', label: 'No client' }, ...data.clients.map(c => ({ value: c.id, label: c.company }))]} onChange={v => patchProject(project.id, { clientId: v || null })} /></Field><div className="two-fields"><Field label="Budget"><input type="number" min="0" value={project.budget} onChange={e => patchProject(project.id, { budget: Math.max(0, Number(e.target.value)) })} /></Field><Field label="Hourly rate"><input type="number" min="0" value={project.rate} onChange={e => patchProject(project.id, { rate: Math.max(0, Number(e.target.value)) })} /></Field></div></section><section><h2>At a glance</h2><div className="about-stat"><span>Open tasks</span><strong>{tasks.filter(t => !t.closed).length}</strong></div><div className="about-stat"><span>Completed tasks</span><strong>{tasks.filter(t => t.closed).length}</strong></div><div className="about-stat"><span>Paid</span><strong>{money(sumPaid(data, project.id), data.settings.defaultCurrency)}</strong></div><div className="about-stat"><span>Remaining budget</span><strong>{money(Math.max(0, project.budget - sumPaid(data, project.id)), data.settings.defaultCurrency)}</strong></div><Link to="/finances" className="subtle-link"><CircleDollarSign size={16} /> View finances <ArrowRight size={15} /></Link><div className="about-stages"><h3>Stages</h3>{project.stages.map(st => <div key={st.id}><span className={`stage-indicator stage-${st.kind}`} />{st.name}<small>{st.kind}</small></div>)}</div></section></div>}
  <Modal open={!!dialog} onOpenChange={v => !v && setDialog(null)} title={{ rename: 'Rename project', folder: 'Move to folder', archive: 'Archive project', delete: 'Delete project', template: 'Save stage template', addStage: 'Add stage', removeStage: 'Remove stage', renameStage: 'Rename stage' }[dialog || 'rename']}>
    {['rename', 'folder', 'template', 'addStage', 'renameStage'].includes(dialog || '') && <Field label={dialog === 'folder' ? 'Folder name' : dialog === 'template' ? 'Template name' : dialog === 'addStage' || dialog === 'renameStage' ? 'Stage name' : 'Project name'}><input autoFocus value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirm()} /></Field>}
    {dialog === 'archive' && <p className="dialog-copy">Move this project and its tasks to Archive? You can restore it later.</p>}
    {dialog === 'delete' && <p className="dialog-copy">Delete this project, its {tasks.length} tasks and its payments? This cannot be undone.</p>}
    {dialog === 'removeStage' && <div className="form-stack"><p className="dialog-copy">Choose where to move the {tasks.filter(t => t.stageId === removeStageId).length} tasks in this stage.</p><Field label="Move tasks to"><SelectMenu label="Move tasks to" value={replacementId} options={project.stages.filter(s => s.id !== removeStageId).map(s => ({ value: s.id, label: s.name }))} onChange={setReplacementId} /></Field></div>}
    <div className="form-actions"><Button onClick={() => setDialog(null)}>Cancel</Button><Button variant={dialog === 'delete' ? 'danger' : 'primary'} onClick={confirm}>{dialog === 'archive' ? 'Archive' : dialog === 'delete' ? 'Delete project' : dialog === 'removeStage' ? 'Move tasks and remove' : 'Save'}</Button></div>
  </Modal>
  </div>;
}

export function ArchivePage() {
  const { data, patchProject, setData } = useData();
  const [deleteId, setDeleteId] = useState('');
  const archived = data.projects.filter(p => p.archived);
  return <div className="content"><div className="page-heading"><div><h1>Archive</h1><p>Keep completed projects for reference</p></div></div>
    {!archived.length && <Empty icon={Archive} title="Archive is empty" text="Archived projects will appear here." />}
    <div className="archive-list">{archived.map(p => <div key={p.id} className="archive-row"><span className="project-icon" style={{ background: p.color }}>{p.name[0]}</span><div><strong>{p.name}</strong><small>{clientName(data, p)} · Archived {p.archivedAt ? dateLabel(p.archivedAt.slice(0, 10)) : ''}</small></div><Button onClick={() => patchProject(p.id, { archived: false, archivedAt: null })}><ArchiveRestore size={15} /> Restore</Button><IconButton icon={Trash2} label="Delete forever" onClick={() => setDeleteId(p.id)} /></div>)}</div>
    <Modal open={!!deleteId} onOpenChange={v => !v && setDeleteId('')} title="Delete archived project"><p className="dialog-copy">Delete this project, its tasks and payments forever?</p><div className="form-actions"><Button onClick={() => setDeleteId('')}>Cancel</Button><Button variant="danger" onClick={() => { setData(s => ({ ...s, projects: s.projects.filter(p => p.id !== deleteId), tasks: s.tasks.filter(t => t.projectId !== deleteId), payments: s.payments.filter(p => p.projectId !== deleteId) })); setDeleteId(''); }}>Delete forever</Button></div></Modal>
  </div>;
}
