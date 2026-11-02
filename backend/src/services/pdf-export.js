import { appError } from '../middleware/error.js';

export function enforcePdfExportLimit(reports, maxReports) {
  if (reports.length > maxReports) {
    throw appError(
      422,
      `Ekspor seluruh periode dibatasi maksimal ${maxReports} laporan. Unduh laporan per minggu atau hubungi administrator.`,
      'PDF_EXPORT_LIMIT_EXCEEDED'
    );
  }
  return reports;
}

export function assertCompletePdfReports(reports) {
  if (!reports.length) {
    throw appError(422, 'Belum ada laporan bertanda tangan untuk diekspor.', 'NO_SIGNED_REPORTS');
  }
  if (reports.some(report => !report.activities?.length)) {
    throw appError(
      422,
      'Salah satu laporan bertanda tangan tidak memiliki kegiatan. Ekspor dibatalkan agar dokumen tidak terpotong.',
      'INCOMPLETE_SIGNED_REPORT'
    );
  }
  return reports;
}
