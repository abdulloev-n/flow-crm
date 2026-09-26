import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { ChevronRight, X, type LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({ children, variant = 'secondary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button {...props} className={`button button-${variant} ${className}`}>{children}</button>;
}
export function IconButton({ icon: Icon, label, className = '', ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { icon: LucideIcon; label: string }) {
  return <button type="button" title={label} aria-label={label} {...props} className={`icon-button ${className}`}><Icon size={17} strokeWidth={1.8} /></button>;
}
export function Modal({ open, onOpenChange, title, children, width = 460 }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode; width?: number }) {
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className="dialog-content" style={{ width }}>
        <div className="dialog-heading"><DialogPrimitive.Title>{title}</DialogPrimitive.Title><DialogPrimitive.Close asChild><IconButton icon={X} label="Close" /></DialogPrimitive.Close></div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}
export function Menu({ trigger, children, align = 'end' }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'end' }) {
  return <DropdownPrimitive.Root><DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
    <DropdownPrimitive.Portal><DropdownPrimitive.Content className="menu-content" align={align} sideOffset={6}>{children}</DropdownPrimitive.Content></DropdownPrimitive.Portal>
  </DropdownPrimitive.Root>;
}
export function MenuItem({ icon: Icon, children, onSelect, danger = false, shortcut, disabled = false }: { icon?: LucideIcon; children: ReactNode; onSelect?: () => void; danger?: boolean; shortcut?: string; disabled?: boolean }) {
  return <DropdownPrimitive.Item disabled={disabled} className={`menu-item ${danger ? 'menu-danger' : ''}`} onSelect={onSelect}>
    {Icon && <Icon size={16} strokeWidth={1.7} />}<span>{children}</span>{shortcut && <span className="menu-shortcut">{shortcut}</span>}
  </DropdownPrimitive.Item>;
}
export function MenuSub({ icon: Icon, label, children }: { icon?: LucideIcon; label: string; children: ReactNode }) {
  return <DropdownPrimitive.Sub><DropdownPrimitive.SubTrigger className="menu-item">
    {Icon && <Icon size={16} strokeWidth={1.7} />}<span>{label}</span><ChevronRight size={15} className="menu-chevron" />
  </DropdownPrimitive.SubTrigger><DropdownPrimitive.Portal><DropdownPrimitive.SubContent className="menu-content" sideOffset={5}>{children}</DropdownPrimitive.SubContent></DropdownPrimitive.Portal></DropdownPrimitive.Sub>;
}
export const MenuSeparator = () => <DropdownPrimitive.Separator className="menu-separator" />;
export function SelectMenu({ value, options, onChange, label, className = '' }: { value: string; options: { value: string; label: string; dot?: string }[]; onChange: (value: string) => void; label: string; className?: string }) {
  const selected = options.find(option => option.value === value);
  return <DropdownPrimitive.Root><DropdownPrimitive.Trigger className={`select-menu-trigger ${className}`} aria-label={label}>
    <span>{selected?.dot && <i className="select-dot" style={{ background: selected.dot }} />}{selected?.label || label}</span><ChevronRight size={14} className="select-chevron" />
  </DropdownPrimitive.Trigger><DropdownPrimitive.Portal><DropdownPrimitive.Content className="menu-content select-menu-content" align="start" sideOffset={5}>
    {options.map(option => <DropdownPrimitive.Item key={option.value} className={`menu-item ${option.value === value ? 'selected' : ''}`} onSelect={() => onChange(option.value)}>
      {option.dot && <i className="select-dot" style={{ background: option.dot }} />}<span>{option.label}</span>{option.value === value && <span className="selected-check">✓</span>}
    </DropdownPrimitive.Item>)}
  </DropdownPrimitive.Content></DropdownPrimitive.Portal></DropdownPrimitive.Root>;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}
export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return <div className="empty"><Icon size={28} strokeWidth={1.4} /><strong>{title}</strong>{text && <p>{text}</p>}{action}</div>;
}
export function DueLabel({ date, closed = false }: { date: string; closed?: boolean }) {
  if (!date) return <span className="muted">No date</span>;
  const due = new Date(date + 'T12:00:00');
  const now = new Date(); now.setHours(12, 0, 0, 0);
  const days = Math.round((due.getTime() - now.getTime()) / 86400000);
  const label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return <span className={closed ? 'muted' : days < 0 ? 'due-overdue' : days <= 2 ? 'due-soon' : 'muted'}>{label}{!closed && days < 0 ? ' · Overdue' : ''}</span>;
}
