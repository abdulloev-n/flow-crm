import { Database, ExternalLink, Info, Keyboard, Monitor, RotateCw, SlidersHorizontal, Bell, FolderOpen, Download, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useData } from '../data';
import { Button, Modal, SelectMenu } from '../components';
import { useUI } from '../App';
import type { Settings as SettingsType, StorageInfo } from '../types';

type Section = 'appearance' | 'work' | 'notifications' | 'storage' | 'shortcuts' | 'about';
const sections: { key: Section; label: string; icon: typeof Monitor }[] = [
  { key: 'appearance', label: 'Appearance', icon: Monitor }, { key: 'work', label: 'Work preferences', icon: SlidersHorizontal },
  { key: 'notifications', label: 'Notifications', icon: Bell }, { key: 'storage', label: 'Data & Storage', icon: Database },
  { key: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard }, { key: 'about', label: 'About', icon: Info },
];

export function Settings() {
  const { data, setData, status } = useData();
  const { toast } = useUI();
  const [section, setSection] = useState<Section>('appearance');
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [version, setVersion] = useState('1.0.0');
  const [error, setError] = useState('');
  const [target, setTarget] = useState<{ path: string; hasData: boolean } | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [restartRequired, setRestartRequired] = useState(false);
  useEffect(() => { window.flow?.storageInfo().then(setStorage).catch(e => setError(String(e))); window.flow?.appVersion().then(setVersion).catch(() => {}); }, []);
  const patch = (next: Partial<SettingsType>) => setData(s => ({ ...s, settings: { ...s.settings, ...next } }));
  const chooseStorage = async () => { try { setError(''); const selected = await window.flow.chooseStorage(); if (selected) setTarget(selected); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } };
  const moveStorage = async (useExisting: boolean) => { if (!target) return; try { setError(''); await window.flow.moveStorage(target.path, useExisting); setTarget(null); setRestartRequired(true); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } };
  const exportBackup = async () => { try { setError(''); const path = await window.flow.exportBackup(); if (path) toast('Backup exported'); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } };
  const importBackup = async () => { setImportConfirm(false); try { setError(''); const imported = await window.flow.importBackup(); if (imported) window.location.reload(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } };
  return <div className="content settings-page"><div className="page-heading"><div><h1>Settings</h1><p>Make flow.crm work for you</p></div></div>
    <div className="settings-layout"><nav className="settings-nav" aria-label="Settings sections">{sections.map(({ key, label, icon: Icon }) => <button key={key} className={section === key ? 'active' : ''} onClick={() => setSection(key)}><Icon size={17} />{label}</button>)}</nav>
      <div className="settings-content">
        {section === 'appearance' && <><h2>Appearance</h2><p className="settings-intro">Choose a comfortable view for your workspace.</p>
          <div className="settings-row"><div><strong>Theme</strong><p>Match Windows or choose a theme.</p></div><SelectMenu label="Theme" value={data.settings.theme} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={v => patch({ theme: v as SettingsType['theme'] })} /></div>
          <div className="settings-row"><div><strong>Density</strong><p>Change spacing in tables and cards.</p></div><SelectMenu label="Density" value={data.settings.density} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} onChange={v => patch({ density: v as SettingsType['density'] })} /></div>
        </>}
        {section === 'work' && <><h2>Work preferences</h2><p className="settings-intro">Defaults for new projects and everyday work.</p>
          <div className="settings-row"><div><strong>Start page</strong><p>The first page you see when flow.crm opens.</p></div><SelectMenu label="Start page" value={data.settings.homePage} options={[{ value: 'today', label: 'Today' }, { value: 'projects', label: 'Projects' }]} onChange={v => patch({ homePage: v as SettingsType['homePage'] })} /></div>
          <div className="settings-row"><div><strong>Display currency</strong><p>Used for project budgets and finance totals.</p></div><SelectMenu label="Display currency" value={data.settings.defaultCurrency} options={[{ value: 'USD', label: 'USD · $' }, { value: 'EUR', label: 'EUR · €' }, { value: 'GBP', label: 'GBP · £' }]} onChange={v => patch({ defaultCurrency: v as SettingsType['defaultCurrency'] })} /></div>
        </>}
        {section === 'notifications' && <><h2>Notifications</h2><p className="settings-intro">Choose what appears in Today and Windows alerts.</p>
          {([['tasks', 'Task due dates', 'Show overdue and upcoming tasks.'], ['clients', 'Waiting on clients', 'Show tasks in a waiting stage.'], ['payments', 'Expected payments', 'Show upcoming payments.'], ['windows', 'Windows notifications', 'Show an alert when the app opens and work needs attention.']] as const).map(([key, label, help]) => <div className="settings-row" key={key}><div><strong>{label}</strong><p>{help}</p></div><label className="switch"><input type="checkbox" checked={data.settings.reminders[key]} onChange={e => patch({ reminders: { ...data.settings.reminders, [key]: e.target.checked } })} /><i /></label></div>)}
        </>}
        {section === 'storage' && <><h2>Data & Storage</h2><p className="settings-intro">Your CRM data stays on this computer.</p>
          <div className="storage-card"><div className="storage-card-top"><Database size={19} /><div><strong>{storage?.mode === 'portable' ? 'Portable data' : storage?.mode === 'development' ? 'Development data' : 'Installed app data'}</strong><p>{storage?.sizeBytes !== undefined ? `${(storage.sizeBytes / 1024).toFixed(0)} KB database` : 'Loading…'}</p></div><span className={`storage-status ${status}`}>{status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Save failed'}</span></div><code className="storage-path">{storage?.path || 'Loading…'}</code><div className="storage-actions"><Button onClick={() => window.flow?.openStorage()}><FolderOpen size={16} /> Open data folder</Button>{storage?.mode === 'portable' && <Button onClick={chooseStorage}><ExternalLink size={16} /> Change location</Button>}</div></div>
          {storage?.mode === 'portable' && <p className="settings-note">The default data folder sits beside the portable .exe. A custom location will stay on this computer if you move only the .exe.</p>}
          {storage?.mode === 'installed' && <p className="settings-note">The installed version keeps its data location fixed. Reinstalling the app does not require you to choose it again.</p>}
          <div className="settings-subsection"><h3>Backups</h3><p>Export a copy before changing computers or importing another database.</p><div className="storage-actions"><Button onClick={exportBackup}><Download size={16} /> Export backup</Button><Button onClick={() => setImportConfirm(true)}><Upload size={16} /> Import backup</Button></div></div>
          {error && <div className="error-box" role="alert">{error}</div>}
        </>}
        {section === 'shortcuts' && <><h2>Keyboard shortcuts</h2><p className="settings-intro">Use these shortcuts while you work.</p><div className="shortcut-row"><span>Search</span><kbd>Ctrl K</kbd></div><div className="shortcut-row"><span>New task</span><kbd>N</kbd></div><div className="shortcut-row"><span>Search</span><kbd>/</kbd></div><div className="shortcut-row"><span>Close panel or menu</span><kbd>Esc</kbd></div><div className="shortcut-row"><span>Post comment</span><kbd>Ctrl Enter</kbd></div></>}
        {section === 'about' && <><h2>About flow.crm</h2><p className="settings-intro">A local workspace for freelance client work.</p><div className="about-app"><strong>flow.crm</strong><span>Version {version}</span><span>{storage?.mode === 'portable' ? 'Portable edition' : 'Installed edition'}</span><p>Your projects, clients and payments stay on your computer. flow.crm does not require an account.</p></div></>}
      </div></div>
    <Modal open={!!target} onOpenChange={v => !v && setTarget(null)} title={target?.hasData ? 'Use existing data?' : 'Move portable data'}><p className="dialog-copy">{target?.hasData ? 'This folder contains flow.crm data. Use it when the app restarts?' : 'Copy your current data to this folder? The old copy will remain as a backup.'}</p><code className="storage-path">{target?.path}</code><div className="form-actions"><Button onClick={() => setTarget(null)}>Cancel</Button><Button variant="primary" onClick={() => moveStorage(!!target?.hasData)}>{target?.hasData ? 'Use this data' : 'Move data'}</Button></div></Modal>
    <Modal open={restartRequired} onOpenChange={() => {}} title="Restart flow.crm"><p className="dialog-copy">Your new storage location is ready. Restart the portable app to use it.</p><div className="form-actions"><Button variant="primary" onClick={() => window.flow.restart()}><RotateCw size={16} /> Restart now</Button></div></Modal>
    <Modal open={importConfirm} onOpenChange={setImportConfirm} title="Import backup"><p className="dialog-copy">The import will replace the current CRM data. flow.crm will save a copy of the current database in your data folder first.</p><div className="form-actions"><Button onClick={() => setImportConfirm(false)}>Cancel</Button><Button variant="primary" onClick={importBackup}>Choose backup</Button></div></Modal>
  </div>;
}
