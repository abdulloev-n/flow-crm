import { ArrowRight, Building2, Plus, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData } from '../data';
import { Button, Empty, Field, IconButton, Modal } from '../components';
import { useUI } from '../App';
import { money, sumPaid, timestamp, uid, type Client } from '../types';

export function Clients() {
  const { data, addClient, patchClient, setData } = useData();
  const { toast } = useUI();
  const [params, setParams] = useSearchParams();
  const selected = data.clients.find(c => c.id === params.get('client'));
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [deleteId, setDeleteId] = useState('');
  const clients = data.clients.filter(c => (c.company + ' ' + c.name + ' ' + c.email).toLowerCase().includes(query.toLowerCase()));
  const choose = (id: string | null) => { const p = new URLSearchParams(params); if (id) p.set('client', id); else p.delete('client'); setParams(p); };
  const create = () => {
    if (!company.trim()) return;
    const c: Client = { id: uid(), company: company.trim(), name: name.trim(), email: email.trim(), phone: '', messenger: '', notes: '', contacts: [], createdAt: timestamp() };
    addClient(c); setCompany(''); setName(''); setEmail(''); setFormOpen(false); choose(c.id);
  };
  const clientProjects = (id: string) => data.projects.filter(p => p.clientId === id && !p.archived);
  const outstanding = (id: string) => clientProjects(id).reduce((sum, p) => sum + Math.max(0, p.budget - sumPaid(data, p.id)), 0);
  return <div className="clients-page"><div className="clients-main content"><div className="page-heading"><div><h1>Clients</h1><p>People and companies you work with</p></div><Button variant="primary" onClick={() => setFormOpen(true)}><Plus size={17} /> New client</Button></div>
    <div className="filterbar"><div className="filter-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search clients…" /></div></div>
    {!clients.length ? <Empty icon={Building2} title="No clients found" text="Add a client or change the search." action={<Button variant="primary" onClick={() => setFormOpen(true)}>New client</Button>} /> : <div className="client-table"><div className="table-head client-grid"><span>Company</span><span>Contact</span><span>Email</span><span>Projects</span><span>Outstanding</span></div>
      {clients.map(c => <button key={c.id} className={`table-row client-grid ${selected?.id === c.id ? 'selected' : ''}`} onClick={() => choose(c.id)}><span className="client-name"><i>{c.company.slice(0, 2).toUpperCase()}</i><strong>{c.company}</strong></span><span>{c.name || '—'}</span><span>{c.email || '—'}</span><span>{clientProjects(c.id).length}</span><span>{money(outstanding(c.id), data.settings.defaultCurrency)}</span></button>)}</div>}
  </div>
  {selected && <aside className="client-panel"><div className="client-panel-top"><IconButton icon={X} label="Close client" onClick={() => choose(null)} /></div><div className="client-monogram">{selected.company.slice(0, 2).toUpperCase()}</div><h2>{selected.company}</h2><p className="muted">Client record</p>
    <div className="client-panel-section"><h3>Primary contact</h3><Field label="Name"><input value={selected.name} onChange={e => patchClient(selected.id, { name: e.target.value })} placeholder="Contact name" /></Field><Field label="Email"><input type="email" value={selected.email} onChange={e => patchClient(selected.id, { email: e.target.value })} placeholder="name@company.com" /></Field><Field label="Phone"><input value={selected.phone} onChange={e => patchClient(selected.id, { phone: e.target.value })} placeholder="Phone" /></Field><Field label="Messenger"><input value={selected.messenger} onChange={e => patchClient(selected.id, { messenger: e.target.value })} placeholder="Telegram or other" /></Field></div>
    <div className="client-panel-section"><div className="panel-section-heading"><h3>Other contacts</h3><button onClick={() => patchClient(selected.id, { contacts: [...(selected.contacts || []), { id: uid(), name: '', email: '', messenger: '' }] })}><Plus size={15} /> Add</button></div>{(selected.contacts || []).map(contact => <div className="extra-contact" key={contact.id}><input value={contact.name} placeholder="Name" onChange={e => patchClient(selected.id, { contacts: selected.contacts.map(x => x.id === contact.id ? { ...x, name: e.target.value } : x) })} /><input value={contact.email} placeholder="Email" onChange={e => patchClient(selected.id, { contacts: selected.contacts.map(x => x.id === contact.id ? { ...x, email: e.target.value } : x) })} /><input value={contact.messenger} placeholder="Messenger" onChange={e => patchClient(selected.id, { contacts: selected.contacts.map(x => x.id === contact.id ? { ...x, messenger: e.target.value } : x) })} /><IconButton icon={X} label="Remove contact" onClick={() => patchClient(selected.id, { contacts: selected.contacts.filter(x => x.id !== contact.id) })} /></div>)}</div>
    <div className="client-panel-section"><h3>Projects</h3>{clientProjects(selected.id).map(p => <Link className="client-project-link" key={p.id} to={`/projects/${p.id}`}><i className="project-dot" style={{ background: p.color }} />{p.name}<ArrowRight size={15} /></Link>)}{clientProjects(selected.id).length === 0 && <p className="muted">No active projects.</p>}</div>
    <div className="client-panel-section"><h3>Notes</h3><textarea value={selected.notes} onChange={e => patchClient(selected.id, { notes: e.target.value })} placeholder="Private notes about this client" rows={4} /></div>
    <button className="danger-link" onClick={() => setDeleteId(selected.id)}><Trash2 size={15} /> Delete client</button>
  </aside>}
  <Modal open={formOpen} onOpenChange={setFormOpen} title="New client"><div className="form-stack"><Field label="Company or client name"><input autoFocus value={company} onChange={e => setCompany(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} placeholder="e.g. Studio North" /></Field><Field label="Contact name"><input value={name} onChange={e => setName(e.target.value)} placeholder="Optional" /></Field><Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional" /></Field><div className="form-actions"><Button onClick={() => setFormOpen(false)}>Cancel</Button><Button variant="primary" onClick={create} disabled={!company.trim()}>Create client</Button></div></div></Modal>
  <Modal open={!!deleteId} onOpenChange={v => !v && setDeleteId('')} title="Delete client"><p className="dialog-copy">Delete this client record? Its projects and tasks will remain, without a linked client.</p><div className="form-actions"><Button onClick={() => setDeleteId('')}>Cancel</Button><Button variant="danger" onClick={() => { setData(s => ({ ...s, clients: s.clients.filter(c => c.id !== deleteId), projects: s.projects.map(p => p.clientId === deleteId ? { ...p, clientId: null } : p) })); choose(null); setDeleteId(''); toast('Client deleted'); }}>Delete client</Button></div></Modal>
  </div>;
}
