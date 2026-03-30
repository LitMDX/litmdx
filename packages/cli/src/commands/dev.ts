import { createServer } from 'vite';
import { buildViteConfig } from '../vite/index.js';
import net from 'net';

export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

export async function findFreePort(start = 5173, max = 5200): Promise<number> {
  for (let port = start; port <= max; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found between ${start} and ${max}`);
}

export async function devCommand(root: string): Promise<void> {
  const port = await findFreePort(5173);
  const viteConfig = await buildViteConfig(root, 'dev', port);
  const server = await createServer(viteConfig);
  await server.listen();
  server.printUrls();
  console.log('\n  litmdx dev server running. Press Ctrl+C to stop.\n');
}
