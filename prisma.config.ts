import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrate: {
    async development() {
      return {
        url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/tallerai_dev',
      };
    },
  },
});
