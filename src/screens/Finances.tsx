import { CircleDollarSign, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../data';
import { Button, Empty, Field, IconButton, Modal, SelectMenu } from '../components';
import { useUI } from '../App';
import { clientName, dateLabel, money, sumPaid, timestamp, uid } from '../types';

export function Finances() {
  const { data, addPayment, setData } = useData();
  const { toast } = useUI();
  const [formOpen, setFormOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [paid, setPaid] = useState(true);
  const [deleteId, setDeleteId] = useState('');
  const projects = data.projects.filter(p => !p.archived);
  const budget = projects.reduce((sum, p) => sum + p.budget, 0);
  const received = projects.reduce((sum, p) => sum + sumPaid(data, p.id), 0);
  const currency = data.settings.defaultCurrency;
  const payments = [...data.payments].sort((a, b) => (b.paidAt || b.dueDate || b.createdAt).localeCompare(a.paidAt || a.dueDate || a.createdAt));
  const submit = () => {
    const value = Number(amount);
    if (!projectId || !Number.isFinite(value) || value <= 0) return;
    addPayment({ id: uid(), projectId, amount: value, dueDate, paidAt: paid ? timestamp().slice(0, 10) : '', note: note.trim(), createdAt: timestamp() });
    setAmount(''); setNote(''); setDueDate(''); setProjectId(''); setFormOpen(false); toast(paid ? 'Payment recorded' : 'Expected payment added');
  };
  return <div className="content finances-page"><div className="page-heading"><div><h1>Finances</h1><p>Track project budgets and payments</p></div><Button variant="primary" onClick={() => setFormOpen(true)}><Plus size={17} /> Add payment</Button></div>
    <div className="metrics-strip finances-metrics"><div><span>Project budgets</span><strong>{money(budget, currency)}</strong></div><div><span>Received</span><strong>{money(received, currency)}</strong></div><div><span>Remaining budget</span><strong>{money(Math.max(0, budget - received), currency)}</strong></div></div>
    <section className="content-section"><div className="section-heading"><h2>Projects</h2></div>
      {!projects.length ? <Empty icon={CircleDollarSign} title="No active projects" text="Create a project to track its budget and payments." /> : <div className="simple-table"><div className="table-head finance-grid"><span>Project</span><span>Client</span><span>Budget</span><span>Paid</span><span>Remaining</span><span>Next payment</span></div>
        {projects.map(p => { const next = data.payments.filter(pay => pay.projectId === p.id && !pay.paidAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]; return <div key={p.id} className="table-row finance-grid"><Link className="table-link" to={`/projects/${p.id}`}>{p.name}</Link><span>{clientName(data, p)}</span><span>{money(p.budget, currency)}</span><span>{money(sumPaid(data, p.id), currency)}</span><span>{money(Math.max(0, p.budget - sumPaid(data, p.id)), currency)}</span><span>{next ? dateLabel(next.dueDate) : '—'}</span></div>; })}</div>}
    </section>
    <section className="content-section"><div className="section-heading"><h2>Payments</h2></div>{payments.length === 0 ? <p className="section-empty">No payments yet. Add a paid or expected payment to see it here.</p> : <div className="simple-table"><div className="table-head payment-grid"><span>Date</span><span>Project</span><span>Note</span><span>Status</span><span>Amount</span><span></span></div>
      {payments.map(p => { const project = data.projects.find(x => x.id === p.projectId); return <div key={p.id} className="table-row payment-grid"><span>{dateLabel(p.paidAt || p.dueDate || p.createdAt.slice(0, 10))}</span><span>{project?.name || 'Deleted project'}</span><span className="truncate">{p.note || '—'}</span><button className={`status-pill ${p.paidAt ? 'good' : 'warm'}`} onClick={() => { if (!p.paidAt) setData(s => ({ ...s, payments: s.payments.map(x => x.id === p.id ? { ...x, paidAt: timestamp().slice(0, 10) } : x) })); }} title={!p.paidAt ? 'Mark as paid' : 'Paid'}>{p.paidAt ? 'Paid' : 'Expected'}</button><strong>{money(p.amount, currency)}</strong><IconButton icon={Trash2} label="Delete payment" onClick={() => setDeleteId(p.id)} /></div>; })}</div>}
    </section>
    <Modal open={formOpen} onOpenChange={setFormOpen} title="Add payment"><div className="form-stack"><Field label="Project"><SelectMenu label="Project" value={projectId} options={[{ value: '', label: 'Choose a project' }, ...projects.map(p => ({ value: p.id, label: p.name }))]} onChange={setProjectId} /></Field><Field label={`Amount (${currency})`}><input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></Field><Field label="Payment status"><SelectMenu label="Payment status" value={paid ? 'paid' : 'expected'} options={[{ value: 'paid', label: 'Paid' }, { value: 'expected', label: 'Expected' }]} onChange={v => setPaid(v === 'paid')} /></Field>{!paid && <Field label="Expected date"><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></Field>}<Field label="Note"><input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></Field><div className="form-actions"><Button onClick={() => setFormOpen(false)}>Cancel</Button><Button variant="primary" disabled={!projectId || !(Number(amount) > 0)} onClick={submit}>Save payment</Button></div></div></Modal>
    <Modal open={!!deleteId} onOpenChange={v => !v && setDeleteId('')} title="Delete payment"><p className="dialog-copy">Remove this payment from the project ledger?</p><div className="form-actions"><Button onClick={() => setDeleteId('')}>Cancel</Button><Button variant="danger" onClick={() => { setData(s => ({ ...s, payments: s.payments.filter(p => p.id !== deleteId) })); setDeleteId(''); }}>Delete payment</Button></div></Modal>
  </div>;
}
