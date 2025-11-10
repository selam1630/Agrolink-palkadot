export function apiPath(path: string) {
  const base = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';
  // ensure leading slash
  if (!path.startsWith('/')) path = `/${path}`;
  return `${base}${path}`;
}
