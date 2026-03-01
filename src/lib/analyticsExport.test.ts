import { describe, expect, it } from 'vitest';
import { buildCsv } from './analyticsExport';

describe('buildCsv', () => {
  it('escapa comillas y comas', () => {
    const csv = buildCsv([
      { a: 'hola, mundo', b: 'dijo "yo"' },
      { a: 'linea\n2', b: 123 },
    ]);

    expect(csv).toContain('a,b');
    expect(csv).toContain('"hola, mundo"');
    expect(csv).toContain('"dijo ""yo"""');
    expect(csv).toContain('"linea\n2"');
  });
});

