export const generateUserGuidePDF = async (siteConfig: any) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Title
  doc.setFontSize(22);
  doc.setTextColor(41, 128, 185); // Blue color
  const title = siteConfig?.site_name 
    ? `Guía de Uso y Funciones - ${siteConfig.site_name}`
    : 'Guía de Uso y Funciones del Sistema';
  doc.text(title, pageWidth / 2, 20, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });

  let yPos = 40;

  // 1. Technical Architecture
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('1. Arquitectura Técnica', 14, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  
  const techData = [
    ['Componente', 'Tecnología / Servicio'],
    ['Frontend', 'React + Vite + TypeScript'],
    ['Estilos', 'Tailwind CSS (Responsive Design)'],
    ['Base de Datos', 'Supabase (PostgreSQL)'],
    ['Autenticación', 'Supabase Auth'],
    ['Almacenamiento', 'Supabase Storage (Imágenes, Audio)'],
    ['Hosting', 'Vercel (Recomendado/Configurado)'],
    ['Analíticas', 'Vercel Analytics + Custom Tracking'],
    ['Generación PDF', 'jsPDF Client-side']
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Componente', 'Tecnología / Servicio']],
    body: techData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 5 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // 2. Funcionalidades del Sitio Público
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('2. Funcionalidades del Sitio Público (Usuarios)', 14, yPos);
  yPos += 10;

  const publicFeatures = [
    ['Módulo', 'Descripción'],
    ['Reproductor', 'Reproductor persistente en toda la navegación. Soporta stream de radio y podcasts.'],
    ['Inicio (Home)', 'Visualización de noticias destacadas, programación actual, ticker de noticias.'],
    ['Noticias', 'Listado de noticias categorizadas, búsqueda, detalles, contenido relacionado e interacciones (reacciones con emojis y comentarios).'],
    ['Programación', 'Grilla semanal de programas con horarios y presentadores.'],
    ['Podcasts', 'Biblioteca de episodios bajo demanda con reproductor integrado.'],
    ['Equipo', 'Perfiles de locutores y staff de la radio.'],
    ['Chat en Vivo', 'Chat en tiempo real para interacción con la audiencia.'],
    ['Reacciones', 'Sistema de reacciones con emojis en noticias para usuarios registrados (una única reacción por noticia).'],
    ['Búsqueda', 'Buscador global de contenido (noticias, programas, podcasts).'],
    ['Responsive', 'Adaptado completamente a móviles, tablets y escritorio.'],
    ['Tema', 'Soporte para modo Claro y Oscuro.']
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Módulo', 'Descripción']],
    body: publicFeatures.slice(1),
    theme: 'striped',
    headStyles: { fillColor: [46, 204, 113], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 3 },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // Check page break
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // 3. Panel de Administración (Dashboard)
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('3. Panel de Administración (Gestión)', 14, yPos);
  yPos += 10;

  const adminFeatures = [
    ['Sección', 'Funcionalidad'],
    ['Dashboard', 'Resumen de métricas, visitantes en tiempo real, accesos rápidos.'],
    ['Noticias', 'Crear, editar, borrar noticias. Generación de contenido con IA. Gestión de categorías.'],
    ['Podcasts', 'Gestión de series y episodios. Subida de audio.'],
    ['Videos', 'Gestión de videos y contenido audiovisual.'],
    ['Reels', 'Gestión de videos cortos (Shorts/Reels) y vinculación con programas.'],
    ['Programación', 'Gestor visual de horarios y programas de la semana.'],
    ['Equipo', 'Gestión de perfiles de locutores y staff.'],
    ['Usuarios', 'Gestión de usuarios registrados y roles (Admin/Editor/Usuario).'],
    ['Estaciones', 'Configuración de múltiples emisoras o streams.'],
    ['Promociones', 'Gestión de banners y anuncios rotativos.'],
    ['Galería', 'Gestor de imágenes y multimedia.'],
    ['Configuración', 'Ajustes generales del sitio (Logo, Redes, SEO, Contacto).'],
    ['Analíticas', 'Reportes detallados de tráfico y audiencia.']
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Sección', 'Funcionalidad']],
    body: adminFeatures.slice(1),
    theme: 'striped',
    headStyles: { fillColor: [231, 76, 60], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 3 },
  });

   // @ts-ignore
   yPos = doc.lastAutoTable.finalY + 15;

   if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // 4. Base de Datos y Almacenamiento
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('4. Detalles de Base de Datos y Almacenamiento', 14, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const dbText = `
  El sistema utiliza Supabase, una alternativa Open Source a Firebase, basada en PostgreSQL.
  
  - Base de Datos: PostgreSQL gestionado por Supabase. Relacional y escalable.
  - Autenticación: Gestión de usuarios segura (JWT) integrada con la base de datos (Row Level Security).
  - Storage: Buckets para almacenamiento de imágenes (logos, portadas) y audios (podcasts).
  - Real-time: Suscripciones en tiempo real para chat y actualizaciones en vivo.
  `;
  
  const splitDbText = doc.splitTextToSize(dbText, pageWidth - 28);
  doc.text(splitDbText, 14, yPos);
  
  yPos += 40;

  // Footer
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount} - Generado automáticamente desde el Panel de Control`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  // Save the PDF
  doc.save('Guia_Usuario_y_Funciones_RadioWave.pdf');
};
