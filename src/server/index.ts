import { createApp } from './app';
import { prisma } from './prisma';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = createApp(prisma);

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
