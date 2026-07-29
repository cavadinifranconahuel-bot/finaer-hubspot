// Google Apps Script — Reporte Inscripciones Capacitación Humand
// Pegarlo en: Extensiones → Apps Script → reemplazar todo el contenido → Guardar → Ejecutar "actualizarReporte"

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const FORM_ID       = 'afcadf5d-3a40-4844-b3a4-4df144c9bebb';

const TURNOS = {
  miercoles_1_julio: 'Miércoles 1 de Julio',
  jueves_2_julio:    'Jueves 2 de Julio',
  lunes_6_julio:     'Lunes 6 de Julio',
  martes_7_julio:    'Martes 7 de Julio'
};

// Mapa email → nombre (generado desde la nómina)
const EMAIL_A_NOMBRE = {
  'aramos@finaersa.com.ar': 'Agustin Ignacio Ramos Forastiere',
  'amoreira@finaersa.com.ar': 'Ailen Moreira Speranza',
  'afernandez@finaersa.com.ar': 'Alejandra Antonia Fernandez',
  'alorellana@finaersa.com.ar': 'Alejandro Luis Lopez Orellana',
  'aveira@finaersa.com.ar': 'Alejandro Veira Tassara',
  'anemina@finaersa.com.ar': 'Aldana Belén Nemiña Rozencwaig',
  'arodriguez@finaersa.com.ar': 'Alicia Beatriz Rodriguez',
  'azangarini@finaersa.com.ar': 'Ambar Nerea Zangarini',
  'asamokec@finaersa.com.ar': 'Ana Laura Samokec',
  'atarrio@finaersa.com.ar': 'Anabella Ayelen Tarrio Godoy',
  'aquisbert@finaersa.com.ar': 'Anahi Wayra Quisbert Catari',
  'alopez@finaersa.com.ar': 'Anairis Alicia Lopez Benitez',
  'acurutchet@finaersa.com.ar': 'Analia Curutchet',
  'asilva@finaersa.com.ar': 'Analía Silva',
  'adelcolmenarez@finaersa.com.ar': 'Andreina Del Colmenarez Navas',
  'aschettino@finaersa.com.ar': 'Antonella Paola Schettino',
  'bmerayo@finaersa.com.ar': 'Baltazar Merayo',
  'bbarranco@finaersa.com.ar': 'Barbara Beatriz Barranco',
  'bmonardez@finaersa.com.ar': 'Belén Monardez',
  'bavendano@finaersa.com.ar': 'Bernardo Luis Avendaño',
  'cinsua@finaersa.com.ar': 'Camila Insua',
  'cgarcia@finaersa.com.ar': 'Carina Elizabeth Garcia',
  'cramos@finaersa.com.ar': 'Carla Johanna Ramos Landolfi',
  'caguirre@finaersa.com.ar': 'Carla Nerea Aguirre',
  'cbenitez@finaersa.com.ar': 'Cardozo Rocio Cecilia Benitez',
  'cperrone@finaersa.com.ar': 'Carolina Andrea Perrone',
  'crodriguez@finaersa.com.ar': 'Cecilia Roxana Rodriguez',
  'cbronzi@finaersa.com.ar': 'Cecilia Vanesa Bronzi',
  'cpardo@finaersa.com.ar': 'Cesar Alejandro Pardo',
  'cadorna@finaersa.com.ar': 'Claudio Norberto Adorna',
  'cvillegas@finaersa.com.ar': 'Clidia Natalia Villegas',
  'csciscivo@finaersa.com.ar': 'Constanza Sciscivo',
  'dgallardo@finaersa.com.ar': 'Daphne Amanda Gallardo García',
  'dromero@finaersa.com.ar': 'Debora Belen Romero',
  'diannino@finaersa.com.ar': 'Demian Andre Iannino',
  'dobregon@finaersa.com.ar': 'Diego Andres Obregón',
  'dgiani@finaersa.com.ar': 'Diego Fernando Giani',
  'dapolo@finaersa.com.ar': 'Diego Gabriel Apolo',
  'ddiaz@finaersa.com.ar': 'Diego Martin Diaz',
  'ecano@finaersa.com.ar': 'Edward Antonio Cano Triana',
  'eklein@finaersa.com.ar': 'Elizabeth Cristina Klein',
  'emorales@finaersa.com.ar': 'Emanuel Alberto Morales',
  'eduarte@finaersa.com.ar': 'Emiliano Martin Duarte',
  'erusso@finaersa.com.ar': 'Emiliano Russo',
  'eloyola@finaersa.com.ar': 'Enrique Edgardo Loyola',
  'ediaz@finaersa.com.ar': 'Esteban Fabian Diaz',
  'etaboada@finaersa.com.ar': 'Eugenia Taboada',
  'fraimondo@finaersa.com.ar': 'Fabrizio Alejandro Raimondo',
  'fgalati@finaersa.com.ar': 'Florencia Pilar Galati',
  'fvelasco@finaersa.com.ar': 'Florencia Soledad Velasco',
  'fwehner@finaersa.com.ar': 'Florencia Solange Wehner',
  'falvarez@finaersa.com.ar': 'Franco Alvarez Marinelarena',
  'fcavadini@finaersa.com.ar': 'Franco Nahuel Cavadini',
  'fkazazian@finaersa.com.ar': 'Franco Nicolas Kazazian',
  'fvasile@finaersa.com.ar': 'Franco Nicolas Vasile',
  'fvidigt@finaersa.com.ar': 'Franco Vidigt',
  'grodriguez@finaersa.com.ar': 'Gabriela Rodriguez Avila',
  'gguanipa@finaersa.com.ar': 'Gerardo Andrés Guanipa Negrete',
  'gmateo@finaersa.com.ar': 'Gisela Lorena Mateo',
  'gsoliz@finaersa.com.ar': 'Giselle Karina Soliz',
  'gpereyra@finaersa.com.ar': 'Gonzalo Pereyra Moine',
  'gtorres@finaersa.com.ar': 'Guadalupe Aldana Torres',
  'gmartinelli@finaersa.com.ar': 'Guido Martinelli',
  'gandrada@finaersa.com.ar': 'Gustavo Gabriel Andrada',
  'gzarate@finaersa.com.ar': 'Gustavo Zarate Ruiz Diaz',
  'hblanco@finaersa.com.ar': 'Hernan Blanco',
  'hfernandez@finaersa.com.ar': 'Horacio Alejandro Fernandez',
  'hcapitani@finaersa.com.ar': 'Horacio Capitani Apiolazza',
  'imonasterio@finaersa.com.ar': 'Iara Belén Monasterio',
  'iheredia@finaersa.com.ar': 'Ignacio Heredia',
  'itesti@finaersa.com.ar': 'Ignacio Martin Testi',
  'icasco@finaersa.com.ar': 'Isidro Vicente Casco',
  'jmandiola@finaersa.com.ar': 'Jaqueline Margot Mandiola',
  'jvara@finaersa.com.ar': 'Jeagnina Marly Vara Marcano',
  'jparrado@finaersa.com.ar': 'Jesica Gabriela Parrado',
  'jalfonzo@finaersa.com.ar': 'Jessica Carolina Alfonzo Colmenares',
  'jcorrea@finaersa.com.ar': 'Jineet Karina Correa Pereira',
  'jperez@finaersa.com.ar': 'Johanna Elizabeth Perez',
  'jgalvan@finaersa.com.ar': 'Johanna Nadia Galvan',
  'jcammisa@finaersa.com.ar': 'Jorge Julio Cammisa Silva',
  'jreyes@finaersa.com.ar': 'Josefina Reyes',
  'jagopian@finaersa.com.ar': 'Juan Ignacio Agopian',
  'jfuentes@finaersa.com.ar': 'Juan Ignacio Fuentes',
  'jlandeira@finaersa.com.ar': 'Juan Ignacio Landeira',
  'jnovas@finaersa.com.ar': 'Juan Ignacio Novas Brignone',
  'jbejar@finaersa.com.ar': 'Juan Manuel Bejar',
  'jvittori@finaersa.com.ar': 'Juan Pablo Vittori',
  'jreartes@finaersa.com.ar': 'Julián Reartes',
  'jzahor@finaersa.com.ar': 'Julian David Zahor',
  'jgorga@finaersa.com.ar': 'Julieta Gorga',
  'kmadia@finaersa.com.ar': 'Karina Lorena Madia',
  'ltaboas@finaersa.com.ar': 'Laura Andrea Bettina Taboas',
  'lrinaldi@finaersa.com.ar': 'Leandro Rinaldi',
  'lbarbosa@finaersa.com.ar': 'Leonel Angel Barbosa',
  'lgonzalez@finaersa.com.ar': 'Liliana Beatriz Gonzalez',
  'lsagardia@finaersa.com.ar': 'Liliana Beatriz Sagardia',
  'llarzen@finaersa.com.ar': 'Lorena Veronica Larzen',
  'lmartinez@finaersa.com.ar': 'Lucas Emanuel Martinez',
  'lreynaga@finaersa.com.ar': 'Lucas Nahuel Antonio Reynaga',
  'laraujo@finaersa.com.ar': 'Lucia Araujo Fernandez',
  'llopez@finaersa.com.ar': 'Lucia Eliana Lopez',
  'lfrias@finaersa.com.ar': 'Lucia Julieta Frias',
  'lcingolani@finaersa.com.ar': 'Luciana Aylén Cingolani',
  'lgentile@finaersa.com.ar': 'Luciano Raniero Gentile',
  'lurbina@finaersa.com.ar': 'Luis Antonio Urbina Zerpa',
  'mkalpin@finaersa.com.ar': 'Marcelo Ignacio Kalpin',
  'mcuello@finaersa.com.ar': 'Maria Belen Cuello',
  'msoto@finaersa.com.ar': 'Maria Ines Soto',
  'molivera@finaersa.com.ar': 'Maria Jose Olivera Herbas',
  'mdasso@finaersa.com.ar': 'Mariano Augusto Dasso',
  'mperin@finaersa.com.ar': 'Mariano Ezequiel Perin',
  'mstoroni@finaersa.com.ar': 'Mariano Hernán Storoni',
  'mcastro@finaersa.com.ar': 'Marina Castro Lawor',
  'mmino@finaersa.com.ar': 'Marina Elizabeth Miño',
  'mmagurno@finaersa.com.ar': 'Martin Eduardo Magurno',
  'mfogliacco@finaersa.com.ar': 'Martin Esteban Fogliacco',
  'mpinto@finaersa.com.ar': 'Mauricio Pinto',
  'mrivarola@finaersa.com.ar': 'Melina Aylen Rivarola',
  'mgonzalez@finaersa.com.ar': 'Mercedes Gonzalez',
  'mmazza@finaersa.com.ar': 'Mercedes Mazza',
  'mkulevicius@finaersa.com.ar': 'Micaela Alejandra Kulevicius Pedemonte',
  'mmassironi@finaersa.com.ar': 'Micaela Massironi',
  'mradicci@finaersa.com.ar': 'Myriam Soledad Radicci',
  'nbazillo@finaersa.com.ar': 'Nahuel Ignacio Bazillo',
  'ngallegos@finaersa.com.ar': 'Nariela Maria Elizabeth Gallegos',
  'nscalia@finaersa.com.ar': 'Natalia Concepción Scalia',
  'nmartinez@finaersa.com.ar': 'Natalia Micaela Martinez Olivera',
  'nfanara@finaersa.com.ar': 'Natalia Sol Fanara',
  'ngrimoldi@finaersa.com.ar': 'Nazarena Grimoldi',
  'nottate@finaersa.com.ar': 'Nicolas Ariel Ottate Carcabelo',
  'ncapone@finaersa.com.ar': 'Nicolas Capone',
  'nferre@finaersa.com.ar': 'Nicolás Alejandro Ferré',
  'nchalupowicz@finaersa.com.ar': 'Nicole Jazmin Chalupowicz',
  'nguzman@finaersa.com.ar': 'Noelia Guzman Jimenez',
  'ncabral@finaersa.com.ar': 'Noelia Lujan Cabral',
  'opatrone@finaersa.com.ar': 'Olga Beatriz Patrone',
  'ovargas@finaersa.com.ar': 'Oscar Vargas',
  'pfagundez@finaersa.com.ar': 'Pablo Martin Fagundez',
  'psanhueza@finaersa.com.ar': 'Pablo Nicolas Sanhueza Jasem',
  'pvillalba@finaersa.com.ar': 'Patricia Edith Villalba Avalos',
  'palegre@finaersa.com.ar': 'Patricio Emmanuel Alegre',
  'pwoyzechowsky@finaersa.com.ar': 'Peter Alejandro Woyzechowsky Muratowa',
  'ppineda@finaersa.com.ar': 'Pierina Salomé Pineda Maldonado',
  'rborrego@finaersa.com.ar': 'Rada Kheiber Javier Borrego',
  'rmino@finaersa.com.ar': 'Ramiro Miño',
  'rrahal@finaersa.com.ar': 'Raul Eduardo Rahal',
  'rwildman@finaersa.com.ar': 'Rita Carlota Wildman Machado',
  'rvera@finaersa.com.ar': 'Rodrigo Vera Montero',
  'rmanzato@finaersa.com.ar': 'Romina Carla Manzato',
  'rbobadilla@finaersa.com.ar': 'Romina Ivana Bobadilla',
  'rdeantonio@finaersa.com.ar': 'Romina Judith De Antonio',
  'rcirer@finaersa.com.ar': 'Romina Mariela Cirer',
  'sflores@finaersa.com.ar': 'Sabrina Anahi Flores',
  'smorgante@finaersa.com.ar': 'Salvador Ezequiel Morgante',
  'sfernandez@finaersa.com.ar': 'Santiago Alejandro Fernandez Furnari',
  'sbagnera@finaersa.com.ar': 'Santiago Eduardo Bagnera',
  'saranguez@finaersa.com.ar': 'Sofia Aranguez',
  'smemme@finaersa.com.ar': 'Sofia Belen Memme',
  'scolque@finaersa.com.ar': 'Soledad Silvana Colque',
  'tabud@finaersa.com.ar': 'Tais Nair Abud',
  'trolaiser@finaersa.com.ar': 'Tamara Daiana Rolaiser',
  'tvillavicencio@finaersa.com.ar': 'Thiago Villavicencio',
  'tembon@finaersa.com.ar': 'Tomas Embon',
  'vcamba@finaersa.com.ar': 'Valeria Camba',
  'vsalinas@finaersa.com.ar': 'Valeria Carolina Salinas',
  'vgallardo@finaersa.com.ar': 'Valeria Fabiola Gallardo',
  'valmiron@finaersa.com.ar': 'Valeria Fernanda Almiron',
  'valonso@finaersa.com.ar': 'Valeria Roxana Alonso',
  'vpugliese@finaersa.com.ar': 'Vanesa Elizabeth Pugliese',
  'vnunez@finaersa.com.ar': 'Vanesa Soledad Nuñez',
  'vmoldes@finaersa.com.ar': 'Vanesa Yanina Moldes',
  'vvazquez@finaersa.com.ar': 'Vanina Vazquez Zalinkevicius',
  'vrojas@finaersa.com.ar': 'Veronica Lorena Rojas',
  'vrodriguez@finaersa.com.ar': 'Veronica Mariana Rodriguez',
  'vthompson@finaersa.com.ar': 'Vyleta Maria Candela Thompson',
  'ypacheco@finaersa.com.ar': 'Yamila Aldana Pacheco Demarchi',
  'ygalati@finaersa.com.ar': 'Yamila Mariel Galati',
  'aorellana@finaersa.com.ar': 'Alejandro Luis Lopez Orellana'
};

function getNombre(email) {
  return EMAIL_A_NOMBRE[email.toLowerCase()] || email;
}

function fetchSubmissions() {
  const submissions = [];
  let url = `https://api.hubapi.com/form-integrations/v1/submissions/forms/${FORM_ID}?limit=50`;
  const options = { headers: { 'Authorization': `Bearer ${HUBSPOT_TOKEN}` }, muteHttpExceptions: true };
  do {
    const res  = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(res.getContentText());
    (data.results || []).forEach(s => submissions.push(s));
    url = data.paging && data.paging.next ? data.paging.next.link : null;
  } while (url);
  return submissions;
}

function actualizarReporte() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();

  // Leer envíos
  const submissions = fetchSubmissions();

  // Agrupar por turno, deduplicando por email
  const porTurno = {};
  Object.keys(TURNOS).forEach(k => porTurno[k] = new Map());

  submissions.forEach(s => {
    const fields = { recursos: [] };
    (s.values || []).forEach(v => {
      if (v.name === 'recursos_inscribir_humand') fields.recursos.push(v.value);
      else fields[v.name] = v.value;
    });
    const turno = fields['turno_capacitacion_humand'];
    const lider = fields['email'] || '';
    if (!turno || !porTurno[turno]) return;
    fields.recursos.forEach(raw => {
      const email = raw.includes('@') ? raw.toLowerCase() : raw; // fallback slug
      if (!porTurno[turno].has(email)) {
        porTurno[turno].set(email, { nombre: getNombre(email), email, lider });
      }
    });
  });

  // Armar filas
  const rows = [['Turno', 'Nombre', 'Email', 'Email Líder']];
  let totalInscriptos = 0;

  Object.entries(TURNOS).forEach(([key, label]) => {
    const personas = [...porTurno[key].values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (personas.length === 0) {
      rows.push([label, 'Sin inscriptos', '', '']);
    } else {
      personas.forEach(p => rows.push([label, p.nombre, p.email, p.lider]));
      totalInscriptos += personas.length;
    }
  });

  rows.push(['', '', '', '']);
  rows.push([`Total inscriptos: ${totalInscriptos} / 120`, '', '', '']);

  // Escribir en la hoja
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 4).setValues(rows);

  // Formato encabezado
  const header = sheet.getRange(1, 1, 1, 4);
  header.setBackground('#1a1a2e');
  header.setFontColor('#ffffff');
  header.setFontWeight('bold');

  // Ajustar ancho de columnas
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 280);
  sheet.setColumnWidth(3, 230);
  sheet.setColumnWidth(4, 230);

  SpreadsheetApp.getUi().alert(`✅ Reporte actualizado. ${totalInscriptos} inscriptos de 120 cupos.\n${submissions.length} envíos procesados.`);
}
