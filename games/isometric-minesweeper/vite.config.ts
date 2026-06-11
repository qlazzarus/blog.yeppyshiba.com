import { defineConfig } from 'vite';

export default defineConfig({
    base: '/game-assets/isometric-minesweeper/',
    build: {
        emptyOutDir: true,
        outDir: 'dist',
    },
});
