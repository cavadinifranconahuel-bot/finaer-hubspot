const https = require('https');
const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json'
    };
    const req = https.request({ hostname: 'api.hubapi.com', path, method, headers }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(c).toString('utf8')) }); }
        catch (e) { resolve({ status: res.statusCode, body: Buffer.concat(c).toString('utf8') }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const NOMINA = [
  'Agustin Ignacio Ramos Forastiere', 'Ailen Moreira Speranza', 'Alejandra Antonia Fernandez',
  'Alejandro Luis Lopez Orellana', 'Alejandro Veira Tassara', 'Aldana Belén Nemiña Rozencwaig',
  'Alicia Beatriz Rodriguez', 'Ambar Nerea Zangarini', 'Ana Laura Samokec',
  'Anabella Ayelen Tarrio Godoy', 'Anahi Wayra Quisbert Catari', 'Anairis Alicia Lopez Benitez',
  'Analia Curutchet', 'Analía Silva', 'Andreina Del Colmenarez Navas',
  'Antonella Paola Schettino', 'Baltazar Merayo', 'Barbara Beatriz Barranco',
  'Belén Monardez', 'Bernardo Luis Avendaño', 'Camila Insua',
  'Carina Elizabeth Garcia', 'Carla Johanna Ramos Landolfi', 'Carla Nerea Aguirre',
  'Cardozo Rocio Cecilia Benitez', 'Carolina Andrea Perrone', 'Cecilia Roxana Rodriguez',
  'Cecilia Vanesa Bronzi', 'Cesar Alejandro Pardo', 'Claudio Norberto Adorna',
  'Clidia Natalia Villegas', 'Constanza Sciscivo', 'Daphne Amanda Gallardo García',
  'Debora Belen Romero', 'Demian Andre Iannino', 'Diego Andres Obregón',
  'Diego Fernando Giani', 'Diego Gabriel Apolo', 'Diego Martin Diaz',
  'Edward Antonio Cano Triana', 'Elizabeth Cristina Klein', 'Emanuel Alberto Morales',
  'Emiliano Martin Duarte', 'Emiliano Russo', 'Enrique Edgardo Loyola',
  'Esteban Fabian Diaz', 'Eugenia Taboada', 'Fabrizio Alejandro Raimondo',
  'Florencia Pilar Galati', 'Florencia Soledad Velasco', 'Florencia Solange Wehner',
  'Franco Alvarez Marinelarena', 'Franco Nahuel Cavadini', 'Franco Nicolas Kazazian',
  'Franco Nicolas Vasile', 'Franco Vidigt', 'Gabriela Rodriguez Avila',
  'Gerardo Andrés Guanipa Negrete', 'Gisela Lorena Mateo', 'Giselle Karina Soliz',
  'Gonzalo Pereyra Moine', 'Guadalupe Aldana Torres', 'Guido Martinelli',
  'Gustavo Gabriel Andrada', 'Gustavo Zarate Ruiz Diaz', 'Hernan Blanco',
  'Horacio Alejandro Fernandez', 'Horacio Capitani Apiolazza', 'Iara Belén Monasterio',
  'Ignacio Heredia', 'Ignacio Martin Testi', 'Isidro Vicente Casco',
  'Jaqueline Margot Mandiola', 'Jeagnina Marly Vara Marcano', 'Jesica Gabriela Parrado',
  'Jessica Carolina Alfonzo Colmenares', 'Jineet Karina Correa Pereira', 'Johanna Elizabeth Perez',
  'Johanna Nadia Galvan', 'Jorge Julio Cammisa Silva', 'Josefina Reyes',
  'Juan Ignacio Agopian', 'Juan Ignacio Fuentes', 'Juan Ignacio Landeira',
  'Juan Ignacio Novas Brignone', 'Juan Manuel Bejar', 'Juan Pablo Vittori',
  'Julián Reartes', 'Julian David Zahor', 'Julieta Gorga',
  'Karina Lorena Madia', 'Laura Andrea Bettina Taboas', 'Leandro Rinaldi',
  'Leonel Angel Barbosa', 'Liliana Beatriz Gonzalez', 'Liliana Beatriz Sagardia',
  'Lorena Veronica Larzen', 'Lucas Emanuel Martinez', 'Lucas Nahuel Antonio Reynaga',
  'Lucia Araujo Fernandez', 'Lucia Eliana Lopez', 'Lucia Julieta Frias',
  'Luciana Aylén Cingolani', 'Luciano Raniero Gentile', 'Luis Antonio Urbina Zerpa',
  'Marcelo Ignacio Kalpin', 'Maria Belen Cuello', 'Maria Ines Soto',
  'Maria Jose Olivera Herbas', 'Mariano Augusto Dasso', 'Mariano Ezequiel Perin',
  'Mariano Hernán Storoni', 'Marina Castro Lawor', 'Marina Elizabeth Miño',
  'Martin Eduardo Magurno', 'Martin Esteban Fogliacco', 'Mauricio Pinto',
  'Melina Aylen Rivarola', 'Mercedes Gonzalez', 'Mercedes Mazza',
  'Micaela Alejandra Kulevicius Pedemonte', 'Micaela Massironi', 'Myriam Soledad Radicci',
  'Nahuel Ignacio Bazillo', 'Nariela Maria Elizabeth Gallegos', 'Natalia Concepción Scalia',
  'Natalia Micaela Martinez Olivera', 'Natalia Sol Fanara', 'Nazarena Grimoldi',
  'Nicolas Ariel Ottate Carcabelo', 'Nicolas Capone', 'Nicolás Alejandro Ferré',
  'Nicole Jazmin Chalupowicz', 'Noelia Guzman Jimenez', 'Noelia Lujan Cabral',
  'Olga Beatriz Patrone', 'Oscar Vargas', 'Pablo Martin Fagundez',
  'Pablo Nicolas Sanhueza Jasem', 'Patricia Edith Villalba Avalos', 'Patricio Emmanuel Alegre',
  'Peter Alejandro Woyzechowsky Muratowa', 'Pierina Salomé Pineda Maldonado',
  'Rada Kheiber Javier Borrego', 'Ramiro Miño', 'Raul Eduardo Rahal',
  'Rita Carlota Wildman Machado', 'Rodrigo Vera Montero', 'Romina Carla Manzato',
  'Romina Ivana Bobadilla', 'Romina Judith De Antonio', 'Romina Mariela Cirer',
  'Sabrina Anahi Flores', 'Salvador Ezequiel Morgante', 'Santiago Alejandro Fernandez Furnari',
  'Santiago Eduardo Bagnera', 'Sofia Aranguez', 'Sofia Belen Memme',
  'Soledad Silvana Colque', 'Tais Nair Abud', 'Tamara Daiana Rolaiser',
  'Thiago Villavicencio', 'Tomas Embon', 'Valeria Camba',
  'Valeria Carolina Salinas', 'Valeria Fabiola Gallardo', 'Valeria Fernanda Almiron',
  'Valeria Roxana Alonso', 'Vanesa Elizabeth Pugliese', 'Vanesa Soledad Nuñez',
  'Vanesa Yanina Moldes', 'Vanina Vazquez Zalinkevicius', 'Veronica Lorena Rojas',
  'Veronica Mariana Rodriguez', 'Vyleta Maria Candela Thompson',
  'Yamila Aldana Pacheco Demarchi', 'Yamila Mariel Galati'
];

function toValue(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

(async () => {
  // 1. Propiedad turno_capacitacion_humand (dropdown, single)
  console.log('Creando propiedad turno_capacitacion_humand...');
  const r1 = await api('POST', '/crm/v3/properties/contacts', {
    name: 'turno_capacitacion_humand',
    label: 'Turno Capacitación Humand',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    options: [
      { label: 'Jueves 2 de Julio',  value: 'jueves_2_julio',  displayOrder: 1, hidden: false },
      { label: 'Viernes 3 de Julio', value: 'viernes_3_julio', displayOrder: 2, hidden: false },
      { label: 'Lunes 6 de Julio',   value: 'lunes_6_julio',   displayOrder: 3, hidden: false },
      { label: 'Martes 7 de Julio',  value: 'martes_7_julio',  displayOrder: 4, hidden: false }
    ]
  });
  if (r1.status === 201) console.log('✅ turno_capacitacion_humand creada');
  else if (r1.body?.category === 'PROPERTY_EXISTS') console.log('⚠️  turno_capacitacion_humand ya existe');
  else console.log('❌ Error turno:', JSON.stringify(r1.body).slice(0, 300));

  // 2. Propiedad recursos_inscribir_humand (checkbox, multi-select)
  console.log('Creando propiedad recursos_inscribir_humand (177 opciones)...');
  const r2 = await api('POST', '/crm/v3/properties/contacts', {
    name: 'recursos_inscribir_humand',
    label: 'Recursos a Inscribir - Humand',
    type: 'enumeration',
    fieldType: 'checkbox',
    groupName: 'contactinformation',
    options: NOMINA.map((name, i) => ({
      label: name,
      value: toValue(name),
      displayOrder: i + 1,
      hidden: false
    }))
  });
  if (r2.status === 201) console.log('✅ recursos_inscribir_humand creada con', NOMINA.length, 'opciones');
  else if (r2.body?.category === 'PROPERTY_EXISTS') console.log('⚠️  recursos_inscribir_humand ya existe');
  else console.log('❌ Error recursos:', JSON.stringify(r2.body).slice(0, 300));

  // 3. Formulario HubSpot
  console.log('Creando formulario...');
  const r3 = await api('POST', '/marketing/v3/forms', {
    name: 'Inscripción Capacitación Humand',
    formType: 'hubspot',
    configuration: {
      language: 'es',
      cloneable: false,
      editable: true,
      archivable: true,
      recaptchaEnabled: false,
      notifyContactOwner: false,
      notifyRecipients: [],
      createNewContactForNewEmail: false,
      prePopulateKnownValues: false,
      allowLinkToResetKnownValues: false,
      lifecycleStageOptions: 'FORCE_LIFECYCLE_STAGE',
      shouldNotifyOwner: false
    },
    displayOptions: {
      renderRawHtml: false,
      theme: 'default_style',
      submitButtonText: 'Inscribir'
    },
    legalConsentOptions: { type: 'none' },
    fieldGroups: [
      {
        groupType: 'default_group',
        richTextType: 'text',
        fields: [{
          fieldType: 'single_line_text',
          name: 'email',
          label: 'Email del líder',
          required: true,
          hidden: false,
          objectTypeId: '0-1'
        }]
      },
      {
        groupType: 'default_group',
        richTextType: 'text',
        fields: [{
          fieldType: 'select',
          name: 'turno_capacitacion_humand',
          label: 'Turno de capacitación',
          required: true,
          hidden: false,
          objectTypeId: '0-1'
        }]
      },
      {
        groupType: 'default_group',
        richTextType: 'text',
        fields: [{
          fieldType: 'checkbox',
          name: 'recursos_inscribir_humand',
          label: 'Recursos a inscribir',
          required: true,
          hidden: false,
          objectTypeId: '0-1'
        }]
      }
    ]
  });

  if (r3.status === 201 || r3.status === 200) {
    console.log('✅ Formulario creado');
    console.log('   ID:', r3.body.id);
    console.log('   Embed URL: https://app-eu1.hubspot.com/forms/145725856/' + r3.body.id + '/editor');
  } else {
    console.log('❌ Error formulario:', JSON.stringify(r3.body).slice(0, 500));
  }
})();
