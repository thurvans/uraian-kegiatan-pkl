import { ChevronLeft, ChevronRight } from './icons.jsx';

export const PAGE_SIZE = 5;

export function Pagination({ page, totalItems, onPageChange, pageSize = PAGE_SIZE }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs text-slate-500">Menampilkan <b className="text-slate-700">{firstItem}-{lastItem}</b> dari <b className="text-slate-700">{totalItems}</b> data</p>
    <nav className="flex items-center gap-2" aria-label="Navigasi halaman tabel">
      <button type="button" className="icon-btn h-9 w-9" disabled={page === 1} onClick={() => onPageChange(page - 1)} aria-label="Halaman sebelumnya"><ChevronLeft size={16}/></button>
      <span className="min-w-28 text-center text-xs font-semibold text-slate-600">Halaman {page} dari {totalPages}</span>
      <button type="button" className="icon-btn h-9 w-9" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} aria-label="Halaman berikutnya"><ChevronRight size={16}/></button>
    </nav>
  </div>;
}
