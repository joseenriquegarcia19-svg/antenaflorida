/**
 * Splits artist names from a combined string (e.g. "Artist A & Artist B")
 */
export const splitArtists = (artistName: string): string[] => {
  if (!artistName) return [];
  
  // Handle common separators
  const separators = [' & ', ' and ', ' y ', ', ', ' feat.', ' ft.', ' feat ', ' x '];
  let names = [artistName];
  
  for (const sep of separators) {
    names = names.flatMap(name => name.split(new RegExp(sep, 'i')));
  }
  
  return names.map(n => n.trim()).filter(n => n.length > 0 && n !== 'Antena Florida');
};

export const getArtistInterestMessages = (artistName: string) => {
  const messages = [
    `¿Sabías que ${artistName} comenzó su carrera en pequeños clubes locales antes de saltar a la fama?`,
    `${artistName} es conocido por su estilo único que mezcla influencias tradicionales con sonidos modernos.`,
    `La última producción de ${artistName} ha sido aclamada por la crítica como un hito en su género.`,
    `Muchos fans no saben que ${artistName} también es un talentoso multi-instrumentista.`,
    `El impacto de ${artistName} en la cultura contemporánea es innegable, inspirando a una nueva generación.`,
    `${artistName} ha colaborado con grandes leyendas de la música a lo largo de su trayectoria.`,
    `Se dice que ${artistName} compone la mayoría de sus letras basándose en experiencias personales reales.`,
    `La presencia escénica de ${artistName} es considerada una de las más potentes de la industria actual.`,
    `${artistName} ha ganado múltiples premios internacionales por su innovación sonora.`,
    `Fuera de los escenarios, ${artistName} es un apasionado activista por diversas causas sociales.`,
    `¿Sabías que ${artistName} diseña personalmente parte de la estética de sus vídeos musicales?`,
    `La música de ${artistName} ha sido coreada en los escenarios más prestigiosos del mundo.`,
    `Se rumorea que ${artistName} prepara una colaboración sorpresa que romperá las listas de éxitos.`,
    `${artistName} ha confesado que su mayor inspiración viene de los clásicos de la era dorada de la música.`,
    `La discografía de ${artistName} es un viaje emocional que conecta con millones de oyentes.`,
    `${artistName} es un perfeccionista absoluto en el estudio de grabación, cuidando cada detalle sonoro.`,
    `¿Sabías que ${artistName} tiene una colección secreta de instrumentos antiguos de todo el mundo?`,
    `El primer gran éxito de ${artistName} fue escrito en una pequeña libreta que aún conserva.`,
    `${artistName} prefiere la calidez del vinilo para disfrutar de sus artistas favoritos.`,
    `La energía que proyecta ${artistName} en sus conciertos es una experiencia inolvidable para sus seguidores.`,
    `A pesar de su éxito masivo, ${artistName} sigue buscando nuevas formas de reinventar su propuesta musical.`,
    `La crítica destaca que la voz de ${artistName} posee un matiz emocional difícil de encontrar hoy en día.`,
    `¿Sabías que ${artistName} escribió uno de sus mayores éxitos en menos de 15 minutos en un viaje en avión?`,
    `${artistName} ha declarado que si no fuera músico, probablemente se dedicaría a la arquitectura o al diseño.`,
    `La evolución sonora de ${artistName} desde sus inicios es un ejemplo de crecimiento artístico constante.`,
    `Se dice que ${artistName} no sale al escenario sin realizar un ritual secreto de meditación y enfoque.`,
    `La influencia de la cultura urbana es clave en las composiciones más recientes de ${artistName}.`,
    `¿Sabías que ${artistName} ha agotado las entradas de estadios enteros en cuestión de minutos?`,
    `${artistName} es un gran coleccionista de arte contemporáneo, lo que influye en sus portadas de discos.`,
    `La conexión de ${artistName} con su público a través de las redes sociales es una de las más cercanas y genuinas.`
  ];
  return messages;
};

export const getArtistFacts = (artistName: string) => {
  return [
    { 
      title: "Origen y Edad", 
      content: `${artistName} nació y se crio inmerso en una rica cultura musical, lo que definió su identidad sonora desde temprana edad. Hoy en día, su experiencia se refleja en la madurez de sus composiciones.` 
    },
    { 
      title: "Gustos Personales", 
      content: `Más allá de los escenarios y estudios de grabación, a ${artistName} le apasiona disfrutar de la tranquilidad, la buena cocina y conectar con sus raíces lejos del bullicio de la fama.` 
    },
    { 
      title: "Trayectoria y Futuro", 
      content: `Comenzó su carrera tocando puertas en pequeños locales antes de alcanzar el éxito masivo. Actualmente, ${artistName} se encuentra explorando nuevos sonidos y planeando sus próximas presentaciones internacionales.` 
    },
    { 
      title: "Dato Inédito", 
      content: `Curiosamente, una de las canciones más icónicas de ${artistName} fue escrita en menos de 15 minutos utilizando la parte de atrás de una servilleta durante un viaje de imprevisto.` 
    }
  ];
};
