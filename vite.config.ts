import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { staticDataPlugin } from './scripts/buildRecordPartitions';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'taipei-1999-map';
const base = process.env.GITHUB_PAGES === 'true' ? `/${repositoryName}/` : '/';
const staticData = staticDataPlugin(process.cwd());

export default defineConfig({
  base,
  plugins: [react(), staticData.plugin],
  define: { __DATA_VERSION__: JSON.stringify(staticData.version) },
  server: {
    host: '127.0.0.1',
    port: 5173
  }
});
