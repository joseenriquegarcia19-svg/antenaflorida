
type CsvRow = Record<string, string | number | null | undefined>;

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(rows: CsvRow[]) {
  const headers = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );

  const lines = [headers.join(',')];
  for (const row of rows) {
    const line = headers
      .map((h) => {
        const raw = row[h];
        const text = raw === null || raw === undefined ? '' : String(raw);
        return escapeCsv(text);
      })
      .join(',');
    lines.push(line);
  }

  return lines.join('\n');
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const blob = new Blob([`\ufeff${buildCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadPdfReport(args: {
  filename: string;
  title: string;
  periodLabel: string;
  overview: { views: number; unique_visitors: number; countries: number };
  timeseries: Array<{ bucket_start: string; views: number; unique_visitors: number }>;
  byCountry: Array<{ country: string; views: number; unique_visitors: number }>;
  topPages: Array<{ path: string; views: number; unique_visitors: number }>;
  demographics: {
    device: Array<{ key: string; views: number; unique_visitors: number }>;
    browser: Array<{ key: string; views: number; unique_visitors: number }>;
    os: Array<{ key: string; views: number; unique_visitors: number }>;
    language: Array<{ key: string; views: number; unique_visitors: number }>;
  };
}) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  // @ts-ignore
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(16);
  doc.text(args.title, 40, 40);
  doc.setFontSize(10);
  doc.text(args.periodLabel, 40, 60);

  autoTable(doc, {
    startY: 80,
    head: [['Métrica', 'Valor']],
    body: [
      ['Visitas', String(args.overview.views)],
      ['Visitantes únicos', String(args.overview.unique_visitors)],
      ['Países', String(args.overview.countries)],
    ],
  });

  autoTable(doc, {
    // @ts-ignore
    startY: (doc.lastAutoTable?.finalY ?? 80) + 20,
    head: [['Fecha', 'Visitas', 'Únicos']],
    body: args.timeseries.map((r) => [r.bucket_start, String(r.views), String(r.unique_visitors)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 204, 204] },
  });

  autoTable(doc, {
    // @ts-ignore
    startY: (doc.lastAutoTable?.finalY ?? 80) + 20,
    head: [['País', 'Visitas', 'Únicos']],
    body: args.byCountry.map((r) => [r.country, String(r.views), String(r.unique_visitors)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 204, 204] },
  });

  autoTable(doc, {
    // @ts-ignore
    startY: (doc.lastAutoTable?.finalY ?? 80) + 20,
    head: [['Página', 'Visitas', 'Únicos']],
    body: args.topPages.map((r) => [r.path, String(r.views), String(r.unique_visitors)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 204, 204] },
  });

  const sections: Array<[string, Array<{ key: string; views: number; unique_visitors: number }>]> = [
    ['Dispositivo', args.demographics.device],
    ['Navegador', args.demographics.browser],
    ['Sistema', args.demographics.os],
    ['Idioma', args.demographics.language],
  ];

  for (const [label, rows] of sections) {
    autoTable(doc, {
      // @ts-ignore
      startY: (doc.lastAutoTable?.finalY ?? 80) + 20,
      head: [[label, 'Visitas', 'Únicos']],
      body: rows.map((r) => [r.key, String(r.views), String(r.unique_visitors)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 204, 204] },
    });
  }

  doc.save(args.filename);
}
