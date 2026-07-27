import { createApp } from './app';
import { createAdminRouter } from './adminRouter';
import { prisma } from './prisma';

const PORT = process.env['PORT'] ? Number(process.env['PORT']) : 3001;
const jwtSecret = process.env['SUPABASE_JWT_SECRET'] ?? '';

const app = createApp(prisma);
app.use(createAdminRouter(prisma, jwtSecret));

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
