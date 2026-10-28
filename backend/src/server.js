import { app } from './app.js';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';

const server = app.listen(config.PORT, () => {
  console.info(`API berjalan di http://localhost:${config.PORT}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`${signal} diterima, menghentikan server…`);

  const forceTimer = setTimeout(() => {
    console.error('Shutdown melewati batas waktu.');
    server.closeAllConnections?.();
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  server.close(async error => {
    try {
      await prisma.$disconnect();
      if (error) throw error;
      clearTimeout(forceTimer);
      process.exit(0);
    } catch (shutdownError) {
      console.error('Gagal menghentikan server dengan bersih.', shutdownError);
      process.exit(1);
    }
  });
}

server.on('error', error => {
  console.error('Server gagal dijalankan.', error);
  process.exitCode = 1;
});
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
