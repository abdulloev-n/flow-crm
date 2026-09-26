import { Archive, ArrowUpRight, CalendarDays, CheckSquare2, Clock3, Copy, FileText, Link2, Maximize2, MessageSquare, Minimize2, MoreHorizontal, Plus, Repeat2, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useData } from '../data';
import { Button, Field, IconButton, Menu, MenuItem, MenuSeparator, Modal, SelectMenu } from '../components';
import { useUI } from '../App';
import { makeTask, stageFor, timestamp, uid, type Task } from '../types';

export function TaskPanel({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { data, setData, patchTask, moveTask } = useData();
  const { toast, openTask } = useUI();
  const task = data.tasks.find(t => t.id === taskId);
  const project = data.projects.find(p => p.id === task?.projectId);
  const [full, setFull] = useState(false);
  const [tab, setTab] = useState<'details' | 'activity'>('details');
  const [dialog, setDialog] = useState<'tag' | 'link' | 'image' | 'time' | 'copy' | 'delete' | null>(null);
  const [text, setText] = useState('');
  const [second, setSecond] = useState('');
  const [copyProjectId, setCopyProjectId] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [newComment, setNewComment] = useState('');
  useEffect(() => { setTab('details'); setFull(false); }, [taskId]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || dialog || document.querySelector('[data-radix-popper-content-wrapper]')) return;
      onClose();
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [dialog, onClose]);
  if (!task || !project) return null;
  const update = (patch: Partial<Task>, history?: string) => patchTask(task.id, patch, history);
  const addChecklist = () => { if (newChecklist.trim()) { update({ checklist: [...task.checklist, { id: uid(), text: newChecklist.trim(), done: false }] }); setNewChecklist(''); } };
  const addComment = () => { if (newComment.trim()) { update({ comments: [...task.comments, { id: uid(), text: newComment.trim(), date: timestamp() }] }, 'Comment added'); setNewComment(''); } };
  const openDialog = (next: typeof dialog) => { setDialog(next); setText(''); setSecond(''); setCopyProjectId(''); };
  const confirmDialog = () => {
    if (dialog === 'tag' && text.trim() && !task.tags.includes(text.trim())) update({ tags: [...task.tags, text.trim()] });
    if (dialog === 'link' && /^https?:\/\//i.test(text.trim())) update({ links: [...task.links, { id: uid(), url: text.trim(), label: second.trim() || text.trim() }] });
    if (dialog === 'image' && /^https?:\/\//i.test(text.trim())) update({ images: [...task.images, { id: uid(), url: text.trim() }] });
    if (dialog === 'time' && Number(text) > 0) update({ timeLogs: [...task.timeLogs, { id: uid(), minutes: Math.floor(Number(text)), date: timestamp() }] });
    if (dialog === 'copy' && copyProjectId) {
      const target = data.projects.find(p => p.id === copyProjectId);
      if (target) { const copy = { ...makeTask(target, task.title), description: task.description, priority: task.priority, tags: [...task.tags], checklist: task.checklist.map(c => ({ ...c, id: uid(), done: false })), links: task.links.map(l => ({ ...l, id: uid() })), images: task.images.map(i => ({ ...i, id: uid() })) }; setData(s => ({ ...s, tasks: [...s.tasks, copy] })); toast(`Task copied to ${target.name}`); }
    }
    if (dialog === 'delete') { setData(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== task.id).map(t => ({ ...t, related: t.related.filter(id => id !== task.id) })) })); onClose(); toast('Task deleted'); }
    setDialog(null);
  };
  const duplicate = () => {
    const copy = { ...makeTask(project, task.title + ' (copy)', task.stageId), description: task.description, priority: task.priority, tags: [...task.tags], checklist: task.checklist.map(c => ({ ...c, id: uid(), done: false })), links: task.links.map(l => ({ ...l, id: uid() })), images: task.images.map(i => ({ ...i, id: uid() })) };
    setData(s => ({ ...s, tasks: [...s.tasks, copy] })); toast('Task duplicated'); openTask(copy.id);
  };
  const totalMins = task.timeLogs.reduce((sum, log) => sum + log.minutes, 0);
  return <div className={`task-panel-wrap ${full ? 'full' : ''}`}><div className="task-backdrop" onClick={onClose} /><aside className="task-panel" role="dialog" aria-modal="true" aria-label={task.title}>
    <div className="task-panel-top"><span>{project.name} / {stageFor(project, task)?.name}</span><div><IconButton icon={full ? Minimize2 : Maximize2} label={full ? 'Exit full screen' : 'Expand task'} onClick={() => setFull(v => !v)} /><IconButton icon={X} label="Close task" onClick={onClose} /></div></div>
    <div className="task-panel-scroll"><input className="task-heading-input" value={task.title} onChange={e => update({ title: e.target.value })} aria-label="Task title" /><p className="task-created">Created {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      <div className="task-properties">
        <div className="property-row"><span>Status</span><SelectMenu label="Task stage" value={task.stageId} options={project.stages.map(s => ({ value: s.id, label: s.name, dot: s.kind === 'done' ? '#5ca987' : s.kind === 'waiting' ? '#dcad54' : '#7468dc' }))} onChange={v => moveTask(task.id, v)} /></div>
        <div className="property-row"><span>Priority</span><SelectMenu label="Task priority" value={task.priority} options={[{ value: 'none', label: 'None', dot: '#8b8b8b' }, { value: 'low', label: 'Low', dot: '#5ca987' }, { value: 'medium', label: 'Medium', dot: '#dcad54' }, { value: 'high', label: 'High', dot: '#ce7e7a' }]} onChange={v => update({ priority: v as Task['priority'] })} /></div>
        <div className="property-row"><span>Due date</span><input className="date-property" aria-label="Due date" type="date" value={task.dueDate} onChange={e => update({ dueDate: e.target.value })} /></div>
        <div className="property-row"><span>Tags</span><div className="property-tags">{task.tags.map(tag => <span key={tag} className="tag-chip">{tag}<button aria-label={`Remove ${tag}`} onClick={() => update({ tags: task.tags.filter(x => x !== tag) })}><X size={12} /></button></span>)}<button className="add-property" onClick={() => openDialog('tag')}><Plus size={14} /> Add tag</button></div></div>
        <div className="property-row"><span>Blocked</span><label className="switch"><input type="checkbox" checked={task.blocked} onChange={e => update({ blocked: e.target.checked, blockedReason: e.target.checked ? task.blockedReason : '' }, e.target.checked ? 'Task blocked' : 'Task unblocked')} /><i /></label></div>
        {task.blocked && <div className="property-row"><span>Reason</span><input value={task.blockedReason} onChange={e => update({ blockedReason: e.target.value })} placeholder="What is blocking this task?" /></div>}
        <div className="property-row"><span>Repeat</span><button className={`repeat-toggle ${task.recurring ? 'active' : ''}`} onClick={() => update({ recurring: task.recurring ? null : { intervalDays: 7, lastCreatedAt: timestamp() } })}><Repeat2 size={15} />{task.recurring ? 'Weekly' : 'Off'}</button></div>
      </div>
      <div className="task-tabs"><button className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}>Task</button><button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Comments & history {task.comments.length ? `(${task.comments.length})` : ''}</button></div>
      {tab === 'details' ? <div className="task-sections">
        <section><h3><FileText size={17} /> Description</h3><textarea value={task.description} onChange={e => update({ description: e.target.value })} rows={5} placeholder="Add a brief, notes or acceptance criteria…" /></section>
        <section><h3><CheckSquare2 size={17} /> Checklist <small>{task.checklist.filter(x => x.done).length}/{task.checklist.length}</small></h3><div className="checklist">{task.checklist.map(item => <div key={item.id} className="checklist-row"><input type="checkbox" checked={item.done} onChange={e => update({ checklist: task.checklist.map(x => x.id === item.id ? { ...x, done: e.target.checked } : x) })} /><span className={item.done ? 'struck' : ''}>{item.text}</span><IconButton icon={X} label="Remove checklist item" onClick={() => update({ checklist: task.checklist.filter(x => x.id !== item.id) })} /></div>)}<div className="inline-input"><Plus size={15} /><input value={newChecklist} onChange={e => setNewChecklist(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklist()} placeholder="Add an item, press Enter" /></div></div></section>
        <section><div className="task-section-heading"><h3><Link2 size={17} /> Links & images</h3><div><button onClick={() => openDialog('link')}>+ Link</button><button onClick={() => openDialog('image')}>+ Image URL</button></div></div>{task.links.map(link => <div className="resource-row" key={link.id}><a href={link.url} target="_blank" rel="noreferrer"><ArrowUpRight size={14} />{link.label}</a><IconButton icon={X} label="Remove link" onClick={() => update({ links: task.links.filter(x => x.id !== link.id) })} /></div>)}<div className="image-grid">{task.images.map(img => <div key={img.id}><img src={img.url} alt="Task reference" /><IconButton icon={X} label="Remove image" onClick={() => update({ images: task.images.filter(x => x.id !== img.id) })} /></div>)}</div>{!task.links.length && !task.images.length && <p className="muted">Add links to Figma, Drive or reference images.</p>}</section>
        <section><div className="task-section-heading"><h3><Clock3 size={17} /> Time <small>{Math.floor(totalMins / 60)}h {totalMins % 60}m</small></h3><button onClick={() => openDialog('time')}>+ Log time</button></div>{task.timeLogs.map(log => <div className="resource-row" key={log.id}><span>{log.minutes} min · {new Date(log.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span><IconButton icon={X} label="Remove time log" onClick={() => update({ timeLogs: task.timeLogs.filter(x => x.id !== log.id) })} /></div>)}</section>
        <section><h3><Link2 size={17} /> Related tasks</h3><SelectMenu label="Link a task" value="" options={[{ value: '', label: 'Link a task…' }, ...data.tasks.filter(x => x.projectId === project.id && x.id !== task.id && !task.related.includes(x.id)).map(x => ({ value: x.id, label: x.title }))]} onChange={v => v && update({ related: [...task.related, v] })} />{task.related.map(id => { const related = data.tasks.find(x => x.id === id); return related ? <div className="resource-row" key={id}><button onClick={() => openTask(id)}>{related.title}</button><IconButton icon={X} label="Unlink task" onClick={() => update({ related: task.related.filter(x => x !== id) })} /></div> : null; })}</section>
      </div> : <div className="task-sections"><section><h3><MessageSquare size={17} /> Comments</h3>{task.comments.map(c => <div key={c.id} className="comment"><p>{c.text}</p><small>{new Date(c.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small><IconButton icon={X} label="Delete comment" onClick={() => update({ comments: task.comments.filter(x => x.id !== c.id) })} /></div>)}<textarea value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addComment(); } }} rows={3} placeholder="Write a comment. Ctrl+Enter to post." /><Button onClick={addComment} disabled={!newComment.trim()}>Post comment</Button></section><section><h3><CalendarDays size={17} /> History</h3>{[...task.history].reverse().map(entry => <div className="history-row" key={entry.id}><small>{new Date(entry.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small><span>{entry.text}</span></div>)}</section></div>}
    </div>
    <div className="task-panel-footer"><Button variant={task.closed ? 'secondary' : 'primary'} onClick={() => { const dest = project.stages.find(s => s.kind === (task.closed ? 'active' : 'done')); if (dest) moveTask(task.id, dest.id); }}>{task.closed ? 'Reopen task' : 'Complete task'}</Button>
      <Menu trigger={<IconButton icon={MoreHorizontal} label="More task actions" />}><MenuItem icon={Copy} onSelect={duplicate}>Duplicate</MenuItem><MenuItem icon={Archive} onSelect={() => openDialog('copy')}>Copy to project</MenuItem><MenuSeparator /><MenuItem icon={Trash2} danger onSelect={() => openDialog('delete')}>Delete task</MenuItem></Menu>
    </div>
    <Modal open={!!dialog} onOpenChange={v => !v && setDialog(null)} title={{ tag: 'Add tag', link: 'Add link', image: 'Add image', time: 'Log time', copy: 'Copy task to project', delete: 'Delete task' }[dialog || 'tag']}>
      {dialog === 'delete' ? <p className="dialog-copy">Delete this task and its comments, time logs and checklist? You can complete it instead if you want to keep the history.</p> : dialog === 'copy' ? <Field label="Destination project"><SelectMenu label="Destination project" value={copyProjectId} options={[{ value: '', label: 'Choose a project' }, ...data.projects.filter(p => p.id !== project.id && !p.archived).map(p => ({ value: p.id, label: p.name }))]} onChange={setCopyProjectId} /></Field> : <div className="form-stack"><Field label={dialog === 'tag' ? 'Tag' : dialog === 'link' ? 'URL' : dialog === 'image' ? 'Image URL' : 'Minutes'}><input autoFocus value={text} onChange={e => setText(e.target.value)} type={dialog === 'time' ? 'number' : 'text'} min={dialog === 'time' ? 1 : undefined} placeholder={dialog === 'time' ? '45' : dialog === 'tag' ? 'e.g. Review' : 'https://…'} onKeyDown={e => e.key === 'Enter' && confirmDialog()} /></Field>{dialog === 'link' && <Field label="Label"><input value={second} onChange={e => setSecond(e.target.value)} placeholder="e.g. Figma design" /></Field>}</div>}
      <div className="form-actions"><Button onClick={() => setDialog(null)}>Cancel</Button><Button variant={dialog === 'delete' ? 'danger' : 'primary'} onClick={confirmDialog}>{dialog === 'delete' ? 'Delete task' : dialog === 'copy' ? 'Copy task' : 'Save'}</Button></div>
    </Modal>
  </aside></div>;
}
