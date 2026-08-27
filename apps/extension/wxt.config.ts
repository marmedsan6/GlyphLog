import { defineConfig } from 'wxt';

const ADAPTER_HOSTS = [
  'https://www.crunchyroll.com/*',
  'https://animeflv.net/*',
  'https://*.animeflv.net/*',
  'https://mangadex.org/*',
];

const EXTENSION_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxmeUVp9qJmGT1dijntqql+ShiwDJVJ7W0MQSl7gRLPccxWbZxjbZAZL32uMFBsGC4wBsLdCTg/VQhL9L4HD2ejpCMhK/DMkB49kwxwQaBedjMKWrbe6QYLvsRzGA6l8TPXAeyiK1vXNQk20PgnVwd0aFDDH4zNuQVJCpDEcenMcpkNUnm92fCJ0MF1Ma94rrS/8euQU/6k88dN2zR9h+OfYxWkRIMnY/wOFAaLAGa11w6RRVn3LT34kbnHVLRJgKyZSAS+JBA8c3cZzSd/gqL3mLniY0ZBqY7I8yjgyb+UYjBRQIn49Wn8lYpjTa0aQzTOK85StarL/d4Q1vywX8MwIDAQAB';

export default defineConfig({
  srcDir: 'src',
  manifest: ({ mode }) => ({
    name: 'GlyphLog Companion',
    description:
      'Actualiza el progreso de anime y manga en GlyphLog desde Crunchyroll, AnimeFLV y MangaDex.',
    key: EXTENSION_PUBLIC_KEY,
    permissions: ['storage'],
    host_permissions: [
      ...(mode === 'production' ? [] : ['http://localhost:8000/*']),
      'https://glyphlog.qzz.io/*',
      ...ADAPTER_HOSTS,
    ],
    externally_connectable: {
      matches: ['http://localhost:5173/*', 'https://glyphlog.qzz.io/*'],
    },
  }),
});
