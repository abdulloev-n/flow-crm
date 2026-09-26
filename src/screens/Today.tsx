import { ArrowRight, CheckSquare2, Clock3, CreditCard, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../data';
import { Button, DueLabel, Empty } from '../components';
import { useUI } from '../App';
import { clientName, dateDiff, dateLabel, money, stageFor, type Task } from '../types';

export function Today() {
  const { data, moveTask } = useData();
  const { openTask, newTask } = useUI();
  const active = data.tasks.filter(t => !t.closed && !data.projects.find(p => p.id === t.projectId)?.archived);
  const overdue = active.filter(t => t.dueDate && (dateDiff(t.dueDate) ?? 0) < 0);
  const dueSoon = active.filter(t => t.dueDate && (dateDiff(t.dueDate) ?? 99) >= 0 && (dateDiff(t.dueDate) ?? 99) <= 7);
  const waiting = active.filter(t => { const p = data.projects.find(p => p.id === t.projectId); return p && stageFor(p, t)?.kind === 'waiting'; });
  const expected = data.payments.filter(p => !p.paidAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const attention = [...overdue, ...dueSoon].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 8);
  const coming = active.filter(t => t.dueDate && (dateDiff(t.dueDate) ?? 0) > 7).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const currency = data.settings.defaultCurrency;
  const reminders = data.settings.reminders;
  const taskTable = (items: Task[]) => <div className="simple-table">
    <div className="table-head task-grid"><span></span><span>Task</span><span>Project</span><span>Due date</span><span>Status</span></div>
    {items.map(task => { const project = data.projects.find(p => p.id === task.projectId); const doneStage = project?.stages.find(s => s.kind === 'done'); const diff = dateDiff(task.dueDate);
      return <div className="table-row task-grid" key={task.id}>
        <button className="row-check" title="Complete task" aria-label={`Complete ${task.title}`} onClick={() => doneStage && moveTask(task.id, doneStage.id)}><span /></button>
        <button className="text-cell task-title" onClick={() => openTask(task.id)}>{task.title}</button>
        <Link className="table-link" to={`/projects/${project?.id}`}>{project?.name}</Link>
        <DueLabel date={task.dueDate} />
        <span className={`status-pill ${diff !== null && diff < 0 ? 'danger' : 'warm'}`}>{diff !== null && diff < 0 ? 'Overdue' : 'Due soon'}</span>
      </div>; })}
  </div>;
  return <div className="content today-page">
    <div className="page-heading"><div><h1>Today</h1><p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div><Button variant="primary" onClick={() => newTask()}><Plus size={17} /> New task</Button></div>
    <div className="today-layout"><div className="today-primary">
      <div className="metrics-strip">
        {reminders.tasks && <><Link to="/tasks?due=overdue"><span>Overdue</span><strong>{overdue.length}</strong></Link>
        <Link to="/tasks?due=soon"><span>Due soon</span><strong>{dueSoon.length}</strong></Link></>}
        {reminders.clients && <Link to="/tasks?stage=waiting"><span>Waiting on client</span><strong>{waiting.length}</strong></Link>}
        {reminders.payments && <Link to="/finances"><span>Expected payments</span><strong>{money(expected.reduce((n, p) => n + p.amount, 0), currency)}</strong></Link>}
      </div>
      {reminders.tasks && <section className="content-section"><div className="section-heading"><h2>Needs attention</h2><Link to="/tasks">View all <ArrowRight size={15} /></Link></div>{attention.length ? taskTable(attention) : <Empty icon={CheckSquare2} title="You're all caught up" text="Add a task or set a due date to see work here." action={<Button onClick={() => newTask()}>New task</Button>} />}</section>}
      {reminders.tasks && coming.length > 0 && <section className="content-section"><div className="section-heading"><h2>Coming up</h2></div>{taskTable(coming)}</section>}
    </div><aside className="today-aside">
      {reminders.clients && <section className="aside-box"><div className="aside-heading"><h3>Waiting on clients</h3><span>{waiting.length}</span></div>{waiting.slice(0, 4).map(t => { const p = data.projects.find(x => x.id === t.projectId)!; return <button className="aside-item" key={t.id} onClick={() => openTask(t.id)}><Clock3 size={17} /><span><strong>{t.title}</strong><small>{clientName(data, p)} · {p.name}</small></span></button>; })}{!waiting.length && <p className="aside-empty">No tasks are waiting for a client.</p>}</section>}
      {reminders.payments && <section className="aside-box"><div className="aside-heading"><h3>Upcoming payments</h3><span>{expected.length}</span></div>{expected.slice(0, 4).map(payment => { const project = data.projects.find(p => p.id === payment.projectId); return <Link className="aside-item" to="/finances" key={payment.id}><CreditCard size={17} /><span><strong>{project?.name}</strong><small>{payment.dueDate ? `Due ${dateLabel(payment.dueDate)}` : 'No due date'}</small></span><b>{money(payment.amount, currency)}</b></Link>; })}{!expected.length && <p className="aside-empty">No expected payments yet.</p>}</section>}
    </aside></div>
  </div>;
}
