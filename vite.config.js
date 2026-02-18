import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import pkg from './package.json'

let commitHash = '';
try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
    console.warn('Could not determine git commit hash');
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        __COMMIT_HASH__: JSON.stringify(commitHash),
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
})
