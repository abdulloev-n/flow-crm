import { CheckSquare2, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData } from '../data';
import { Button, DueLabel, Empty, SelectMenu } from '../components';
import { useUI } from '../App';
import { dateDiff, stageFor, type Task } from '../types';

export function AllTasks() {
  const { data, moveTask } = useData();
  const { openTask, newTask } = useUI();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [status, setStatus] = useState(params.get('stage') === 'waiting' ? 'waiting' : 'open');
  const [due, setDue] = useState(params.get('due') || 'all');
  const [projectId, setProjectId] = useState('all');
  const [priority, setPriority] = useState('all');
  useEffect(() => { if (params.get('due')) setDue(params.get('due')!); if (params.get('stage')) setStatus(params.get('stage')!); }, [params]);
  const tasks = useMemo(() => data.tasks.filter(task => {
    const project = data.projects.find(p => p.id === task.projectId);
    if (!project || project.archived) return false;
    if (query && !(task.title + ' ' + task.description + ' ' + project.name).toLowerCase().includes(query.toLowerCase())) return false;
    if (status === 'open' && task.closed) return false;
    if (status === 'closed' && !task.closed) return false;
    if (status === 'waiting' && (task.closed || stageFor(project, task)?.kind !== 'waiting')) return false;
    if (projectId !== 'all' && task.projectId !== projectId) return false;
    if (priority !== 'all' && task.priority !== priority) return false;
    const d = dateDiff(task.dueDate);
    if (due === 'overdue' && (d === null || d >= 0)) return false;
    if (due === 'soon' && (d === null || d < 0 || d > 7)) return false;
    if (due === 'none' && d !== null) return false;
    return true;
  }).sort((a, b) => !a.dueDate ? 1 : !b.dueDate ? -1 : a.dueDate.localeCompare(b.dueDate)), [data, query, status, due, projectId, priority]);
  const groups = status === 'closed' ? [['Completed', tasks]] as [string, Task[]][] : [
    ['Overdue', tasks.filter(t => (dateDiff(t.dueDate) ?? 0) < 0)],
    ['This week', tasks.filter(t => { const d = dateDiff(t.dueDate); return d !== null && d >= 0 && d <= 7; })],
    ['Later', tasks.filter(t => (dateDiff(t.dueDate) ?? 0) > 7)],
    ['No date', tasks.filter(t => !t.dueDate)],
  ] as [string, Task[]][];
  return <div className="content tasks-page"><div className="page-heading"><div><h1>All Tasks</h1><p>Work across every project</p></div><Button variant="primary" onClick={() => newTask()}><Plus size={17} /> New task</Button></div>
    <div className="filterbar"><div className="filter-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks…" /></div>
      <SelectMenu label="Task status" value={status} options={[{ value: 'open', label: 'Open tasks' }, { value: 'waiting', label: 'Waiting on client' }, { value: 'closed', label: 'Completed' }, { value: 'all', label: 'All tasks' }]} onChange={setStatus} />
      <SelectMenu label="Due date" value={due} options={[{ value: 'all', label: 'Any due date' }, { value: 'overdue', label: 'Overdue' }, { value: 'soon', label: 'Next 7 days' }, { value: 'none', label: 'No date' }]} onChange={setDue} />
      <SelectMenu label="Project" value={projectId} options={[{ value: 'all', label: 'All projects' }, ...data.projects.filter(p => !p.archived).map(p => ({ value: p.id, label: p.name }))]} onChange={setProjectId} />
      <SelectMenu label="Priority" value={priority} options={[{ value: 'all', label: 'Any priority' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }, { value: 'none', label: 'None' }]} onChange={setPriority} />
    </div>
    {tasks.length === 0 && <Empty icon={CheckSquare2} title="No matching tasks" text="Try another filter or create a task." action={<Button onClick={() => newTask()}>New task</Button>} />}
    {groups.filter(([, list]) => list.length).map(([name, list]) => <section className="task-group" key={name}><h2>{name} <span>{list.length}</span></h2>
      <div className="simple-table"><div className="table-head all-task-grid"><span></span><span>Task</span><span>Project</span><span>Stage</span><span>Due</span><span>Priority</span></div>
        {list.map(t => { const p = data.projects.find(p => p.id === t.projectId)!; const done = p.stages.find(s => s.kind === 'done'); const active = p.stages.find(s => s.kind !== 'done'); return <div key={t.id} className="table-row all-task-grid">
          <button className={`row-check ${t.closed ? 'checked' : ''}`} aria-label={`${t.closed ? 'Reopen' : 'Complete'} ${t.title}`} onClick={() => { const dest = t.closed ? active : done; if (dest) moveTask(t.id, dest.id); }}><span /></button>
          <button className={`text-cell task-title ${t.closed ? 'struck' : ''}`} onClick={() => openTask(t.id)}>{t.title}</button>
          <Link className="table-link" to={`/projects/${p.id}`}><i className="project-dot" style={{ background: p.color }} />{p.name}</Link>
          <span className="stage-cell">{stageFor(p, t)?.name || 'Unknown'}</span><DueLabel date={t.dueDate} closed={t.closed} />
          <span className={`priority-label priority-${t.priority}`}>{t.priority === 'none' ? 'None' : t.priority[0].toUpperCase() + t.priority.slice(1)}</span>
        </div>; })}</div></section>)}
    <div className="list-footer">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</div>
  </div>;
}
