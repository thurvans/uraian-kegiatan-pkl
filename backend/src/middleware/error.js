import { ZodError } from 'zod';

export function notFound(req, res) { res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan.' }); }
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError) {
    return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', message: 'Data tidak valid.', errors: error.issues });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, code: 'INVALID_JSON', message: 'Format JSON tidak valid.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, code: 'PAYLOAD_TOO_LARGE', message: 'Ukuran data melebihi batas yang diizinkan.' });
  }
  if (error.code === 'P2002') {
    return res.status(409).json({ success: false, code: 'DUPLICATE_RESOURCE', message: 'Data dengan nilai tersebut sudah ada.' });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  const code = error.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  const log = status >= 500 ? req.log?.error.bind(req.log) : req.log?.warn.bind(req.log);
  log?.({ err: error, requestId: req.id }, 'request failed');
  return res.status(status).json({ success: false, code, message: status === 500 ? 'Terjadi kesalahan pada server.' : error.message });
}

export function appError(status, message, code = 'REQUEST_ERROR') {
  return Object.assign(new Error(message), { status, code });
}
