import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    permissions: ['storage'],
    host_permissions: [
      'http://localhost:8000/*',
      'https://glyphlog.qzz.io/*',
      'https://www.crunchyroll.com/*',
      // AnimeFLV rota de subdominio (www3, www4, ...): wildcard para sobrevivir rotaciones
      'https://animeflv.net/*',
      'https://*.animeflv.net/*',
      'https://mangadex.org/*',
    ],
  },
});
