import { fileURLToPath, URL } from 'node:url';

export default {
  plugins: {
    // Explicit config path so the build works no matter which directory it is started from.
    tailwindcss: { config: fileURLToPath(new URL('./tailwind.config.js', import.meta.url)) },
    autoprefixer: {},
  },
};
