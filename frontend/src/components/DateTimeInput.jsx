import { CalendarDays, Clock3 } from './icons.jsx';
import { displayDateValue } from '../utils/formatters.js';

export function DateInput({ value, onChange, disabled = false }) {
  return <div className="relative"><div className={`field flex items-center justify-between ${disabled ? 'bg-slate-100 text-slate-500' : ''}`} aria-hidden="true"><span className={value ? 'text-slate-900' : 'text-slate-400'}>{value ? displayDateValue(value) : 'dd/mm/yyyy'}</span><CalendarDays size={17} className="text-slate-400"/></div><input className={`absolute inset-0 z-10 h-full w-full opacity-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} type="date" lang="id-ID" required disabled={disabled} value={value || ''} onClick={event => event.currentTarget.showPicker?.()} onChange={event => onChange(event.target.value)} aria-label="Pilih tanggal"/></div>;
}

export function TimeInput({ value, onChange, label }) {
  return <div className="relative"><div className="field flex items-center justify-between" aria-hidden="true"><span className={value ? 'text-slate-900' : 'text-slate-400'}>{value || 'HH:mm'}</span><Clock3 size={17} className="text-slate-400"/></div><input className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" type="time" lang="id-ID" step="60" required value={value || ''} onClick={event => event.currentTarget.showPicker?.()} onChange={event => onChange(event.target.value)} aria-label={label}/></div>;
}
