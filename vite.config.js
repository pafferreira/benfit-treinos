import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import 'dotenv/config'
import pkg from './package.json'

// Serve as Vercel Functions de /api durante o dev local (produção usa Vercel)
const apiDevPlugin = () => ({
    name: 'api-dev-server',
    configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
            if (!req.url.startsWith('/api/')) return next()
            const route = req.url.split('?')[0].replace('/api/', '')
            try {
                const mod = await server.ssrLoadModule(`./api/${route}.js`)
                const chunks = []
                for await (const c of req) chunks.push(c)
                const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}
                const shimRes = {
                    status(code) { res.statusCode = code; return this },
                    json(data) {
                        res.setHeader('Content-Type', 'application/json')
                        res.end(JSON.stringify(data))
                        return this
                    },
                }
                await mod.default({ method: req.method, body }, shimRes)
            } catch (e) {
                console.error(`[api-dev] ${req.url}:`, e.message)
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Erro interno no dev server' }))
            }
        })
    },
})

let commitHash = '';
try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
    console.warn('Could not determine git commit hash');
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), apiDevPlugin()],
    define: {
        __COMMIT_HASH__: JSON.stringify(commitHash),
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
})
