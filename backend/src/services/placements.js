import { appError } from '../middleware/error.js';

export async function requireDefaultMentor(client) {
  const mentor = await client.user.findFirst({
    where: { role: 'MENTOR', isActive: true },
    orderBy: { createdAt: 'asc' }
  });
  if (!mentor) {
    throw appError(409, 'Mentor belum dikonfigurasi. Hubungi administrator.', 'MENTOR_NOT_CONFIGURED');
  }
  return mentor;
}

const DOCUMENT_FIELDS = ['officeName', 'region', 'division', 'position', 'startDate', 'endDate'];

export function placementDocumentFieldsChanged(current, next) {
  return DOCUMENT_FIELDS.some(field => {
    if (field === 'startDate' || field === 'endDate') return +new Date(current[field]) !== +new Date(next[field]);
    return current[field] !== next[field];
  });
}

export async function assertPlacementDocumentMutable(client, current, next) {
  if (!placementDocumentFieldsChanged(current, next)) return;
  const lockedReport = await client.weeklyReport.findFirst({
    where: { placementId: current.id, status: { in: ['SUBMITTED', 'SIGNED'] } },
    select: { id: true, status: true }
  });
  if (lockedReport) {
    throw appError(
      409,
      lockedReport.status === 'SIGNED'
        ? 'Identitas PKL tidak dapat diubah karena sudah menjadi bagian dari laporan bertanda tangan.'
        : 'Identitas PKL tidak dapat diubah saat laporan sedang ditinjau mentor.',
      'PLACEMENT_DOCUMENT_LOCKED'
    );
  }
}
