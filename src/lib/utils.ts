// src/lib/utils.ts
export function pseudoToEmail(pseudo: string): string {
  const clean = pseudo.trim().toLowerCase().replace(/\s+/g, '-');
  return `${clean}@cesi-interne.local`;
}
