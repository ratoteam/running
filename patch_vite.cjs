const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');

const target = `export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],`;
    
const replace = `export default defineConfig(({ command }) => {
  return {
    // Configura a base correta para o GitHub Pages quando em build de produção
    base: command === 'build' ? '/running/' : '/',
    plugins: [react(), tailwindcss()],`;

content = content.replace(target, replace);
fs.writeFileSync('vite.config.ts', content);
