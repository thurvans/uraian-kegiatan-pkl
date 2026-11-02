import { appError } from '../middleware/error.js';

const SERIALIZATION_FAILURE = 'P2034';

export async function serializableTransaction(client, operation, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await client.$transaction(operation, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error?.code !== SERIALIZATION_FAILURE) throw error;
      if (attempt === maxAttempts) {
        throw appError(409, 'Data berubah secara bersamaan. Silakan muat ulang dan coba lagi.', 'CONCURRENT_MODIFICATION');
      }
    }
  }
  throw appError(409, 'Data berubah secara bersamaan. Silakan coba lagi.', 'CONCURRENT_MODIFICATION');
}
