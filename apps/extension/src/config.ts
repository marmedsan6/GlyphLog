export const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? 'https://glyphlog.qzz.io'
  : 'http://localhost:8000';

export const GUIDE_URL = import.meta.env.PROD
  ? 'https://glyphlog.qzz.io/profile'
  : 'http://localhost:5173/profile';
