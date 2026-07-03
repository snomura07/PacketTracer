import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        origin: 'http://localhost:5173',
        cors: {
            origin: ['http://localhost:8000'],
        },
        hmr: {
            host: 'localhost',
        },
    },
    plugins: [
        react(),
        laravel({
            input: ['resources/js/app.tsx'],
            refresh: true,
        }),
    ],
});
