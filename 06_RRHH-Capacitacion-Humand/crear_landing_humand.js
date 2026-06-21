const https = require('https');
const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';

function api(method, path, body) {
  return new Promise((resolve) => {
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };
    const req = https.request({ hostname: 'api.hubapi.com', path, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(c).toString('utf8')) }));
    });
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const NOMINA = [
  { label: 'Agustin Ignacio Ramos Forastiere',    value: 'agustin_ignacio_ramos_forastiere' },
  { label: 'Ailen Moreira Speranza',               value: 'ailen_moreira_speranza' },
  { label: 'Alejandra Antonia Fernandez',           value: 'alejandra_antonia_fernandez' },
  { label: 'Alejandro Luis Lopez Orellana',         value: 'alejandro_luis_lopez_orellana' },
  { label: 'Alejandro Veira Tassara',               value: 'alejandro_veira_tassara' },
  { label: 'Aldana Belén Nemiña Rozencwaig',        value: 'aldana_belen_nemina_rozencwaig' },
  { label: 'Alicia Beatriz Rodriguez',              value: 'alicia_beatriz_rodriguez' },
  { label: 'Ambar Nerea Zangarini',                 value: 'ambar_nerea_zangarini' },
  { label: 'Ana Laura Samokec',                     value: 'ana_laura_samokec' },
  { label: 'Anabella Ayelen Tarrio Godoy',          value: 'anabella_ayelen_tarrio_godoy' },
  { label: 'Anahi Wayra Quisbert Catari',           value: 'anahi_wayra_quisbert_catari' },
  { label: 'Anairis Alicia Lopez Benitez',          value: 'anairis_alicia_lopez_benitez' },
  { label: 'Analia Curutchet',                      value: 'analia_curutchet' },
  { label: 'Analía Silva',                          value: 'analia_silva' },
  { label: 'Andreina Del Colmenarez Navas',         value: 'andreina_del_colmenarez_navas' },
  { label: 'Antonella Paola Schettino',             value: 'antonella_paola_schettino' },
  { label: 'Baltazar Merayo',                       value: 'baltazar_merayo' },
  { label: 'Barbara Beatriz Barranco',              value: 'barbara_beatriz_barranco' },
  { label: 'Belén Monardez',                        value: 'belen_monardez' },
  { label: 'Bernardo Luis Avendaño',                value: 'bernardo_luis_avendano' },
  { label: 'Camila Insua',                          value: 'camila_insua' },
  { label: 'Carina Elizabeth Garcia',               value: 'carina_elizabeth_garcia' },
  { label: 'Carla Johanna Ramos Landolfi',          value: 'carla_johanna_ramos_landolfi' },
  { label: 'Carla Nerea Aguirre',                   value: 'carla_nerea_aguirre' },
  { label: 'Cardozo Rocio Cecilia Benitez',         value: 'cardozo_rocio_cecilia_benitez' },
  { label: 'Carolina Andrea Perrone',               value: 'carolina_andrea_perrone' },
  { label: 'Cecilia Roxana Rodriguez',              value: 'cecilia_roxana_rodriguez' },
  { label: 'Cecilia Vanesa Bronzi',                 value: 'cecilia_vanesa_bronzi' },
  { label: 'Cesar Alejandro Pardo',                 value: 'cesar_alejandro_pardo' },
  { label: 'Claudio Norberto Adorna',               value: 'claudio_norberto_adorna' },
  { label: 'Clidia Natalia Villegas',               value: 'clidia_natalia_villegas' },
  { label: 'Constanza Sciscivo',                    value: 'constanza_sciscivo' },
  { label: 'Daphne Amanda Gallardo García',         value: 'daphne_amanda_gallardo_garcia' },
  { label: 'Debora Belen Romero',                   value: 'debora_belen_romero' },
  { label: 'Demian Andre Iannino',                  value: 'demian_andre_iannino' },
  { label: 'Diego Andres Obregón',                  value: 'diego_andres_obregon' },
  { label: 'Diego Fernando Giani',                  value: 'diego_fernando_giani' },
  { label: 'Diego Gabriel Apolo',                   value: 'diego_gabriel_apolo' },
  { label: 'Diego Martin Diaz',                     value: 'diego_martin_diaz' },
  { label: 'Edward Antonio Cano Triana',            value: 'edward_antonio_cano_triana' },
  { label: 'Elizabeth Cristina Klein',              value: 'elizabeth_cristina_klein' },
  { label: 'Emanuel Alberto Morales',               value: 'emanuel_alberto_morales' },
  { label: 'Emiliano Martin Duarte',                value: 'emiliano_martin_duarte' },
  { label: 'Emiliano Russo',                        value: 'emiliano_russo' },
  { label: 'Enrique Edgardo Loyola',                value: 'enrique_edgardo_loyola' },
  { label: 'Esteban Fabian Diaz',                   value: 'esteban_fabian_diaz' },
  { label: 'Eugenia Taboada',                       value: 'eugenia_taboada' },
  { label: 'Fabrizio Alejandro Raimondo',           value: 'fabrizio_alejandro_raimondo' },
  { label: 'Florencia Pilar Galati',                value: 'florencia_pilar_galati' },
  { label: 'Florencia Soledad Velasco',             value: 'florencia_soledad_velasco' },
  { label: 'Florencia Solange Wehner',              value: 'florencia_solange_wehner' },
  { label: 'Franco Alvarez Marinelarena',           value: 'franco_alvarez_marinelarena' },
  { label: 'Franco Nahuel Cavadini',                value: 'franco_nahuel_cavadini' },
  { label: 'Franco Nicolas Kazazian',               value: 'franco_nicolas_kazazian' },
  { label: 'Franco Nicolas Vasile',                 value: 'franco_nicolas_vasile' },
  { label: 'Franco Vidigt',                         value: 'franco_vidigt' },
  { label: 'Gabriela Rodriguez Avila',              value: 'gabriela_rodriguez_avila' },
  { label: 'Gerardo Andrés Guanipa Negrete',        value: 'gerardo_andres_guanipa_negrete' },
  { label: 'Gisela Lorena Mateo',                   value: 'gisela_lorena_mateo' },
  { label: 'Giselle Karina Soliz',                  value: 'giselle_karina_soliz' },
  { label: 'Gonzalo Pereyra Moine',                 value: 'gonzalo_pereyra_moine' },
  { label: 'Guadalupe Aldana Torres',               value: 'guadalupe_aldana_torres' },
  { label: 'Guido Martinelli',                      value: 'guido_martinelli' },
  { label: 'Gustavo Gabriel Andrada',               value: 'gustavo_gabriel_andrada' },
  { label: 'Gustavo Zarate Ruiz Diaz',              value: 'gustavo_zarate_ruiz_diaz' },
  { label: 'Hernan Blanco',                         value: 'hernan_blanco' },
  { label: 'Horacio Alejandro Fernandez',           value: 'horacio_alejandro_fernandez' },
  { label: 'Horacio Capitani Apiolazza',            value: 'horacio_capitani_apiolazza' },
  { label: 'Iara Belén Monasterio',                 value: 'iara_belen_monasterio' },
  { label: 'Ignacio Heredia',                       value: 'ignacio_heredia' },
  { label: 'Ignacio Martin Testi',                  value: 'ignacio_martin_testi' },
  { label: 'Isidro Vicente Casco',                  value: 'isidro_vicente_casco' },
  { label: 'Jaqueline Margot Mandiola',             value: 'jaqueline_margot_mandiola' },
  { label: 'Jeagnina Marly Vara Marcano',           value: 'jeagnina_marly_vara_marcano' },
  { label: 'Jesica Gabriela Parrado',               value: 'jesica_gabriela_parrado' },
  { label: 'Jessica Carolina Alfonzo Colmenares',   value: 'jessica_carolina_alfonzo_colmenares' },
  { label: 'Jineet Karina Correa Pereira',          value: 'jineet_karina_correa_pereira' },
  { label: 'Johanna Elizabeth Perez',               value: 'johanna_elizabeth_perez' },
  { label: 'Johanna Nadia Galvan',                  value: 'johanna_nadia_galvan' },
  { label: 'Jorge Julio Cammisa Silva',             value: 'jorge_julio_cammisa_silva' },
  { label: 'Josefina Reyes',                        value: 'josefina_reyes' },
  { label: 'Juan Ignacio Agopian',                  value: 'juan_ignacio_agopian' },
  { label: 'Juan Ignacio Fuentes',                  value: 'juan_ignacio_fuentes' },
  { label: 'Juan Ignacio Landeira',                 value: 'juan_ignacio_landeira' },
  { label: 'Juan Ignacio Novas Brignone',           value: 'juan_ignacio_novas_brignone' },
  { label: 'Juan Manuel Bejar',                     value: 'juan_manuel_bejar' },
  { label: 'Juan Pablo Vittori',                    value: 'juan_pablo_vittori' },
  { label: 'Julián Reartes',                        value: 'julian_reartes' },
  { label: 'Julian David Zahor',                    value: 'julian_david_zahor' },
  { label: 'Julieta Gorga',                         value: 'julieta_gorga' },
  { label: 'Karina Lorena Madia',                   value: 'karina_lorena_madia' },
  { label: 'Laura Andrea Bettina Taboas',           value: 'laura_andrea_bettina_taboas' },
  { label: 'Leandro Rinaldi',                       value: 'leandro_rinaldi' },
  { label: 'Leonel Angel Barbosa',                  value: 'leonel_angel_barbosa' },
  { label: 'Liliana Beatriz Gonzalez',              value: 'liliana_beatriz_gonzalez' },
  { label: 'Liliana Beatriz Sagardia',              value: 'liliana_beatriz_sagardia' },
  { label: 'Lorena Veronica Larzen',                value: 'lorena_veronica_larzen' },
  { label: 'Lucas Emanuel Martinez',                value: 'lucas_emanuel_martinez' },
  { label: 'Lucas Nahuel Antonio Reynaga',          value: 'lucas_nahuel_antonio_reynaga' },
  { label: 'Lucia Araujo Fernandez',                value: 'lucia_araujo_fernandez' },
  { label: 'Lucia Eliana Lopez',                    value: 'lucia_eliana_lopez' },
  { label: 'Lucia Julieta Frias',                   value: 'lucia_julieta_frias' },
  { label: 'Luciana Aylén Cingolani',               value: 'luciana_aylen_cingolani' },
  { label: 'Luciano Raniero Gentile',               value: 'luciano_raniero_gentile' },
  { label: 'Luis Antonio Urbina Zerpa',             value: 'luis_antonio_urbina_zerpa' },
  { label: 'Marcelo Ignacio Kalpin',                value: 'marcelo_ignacio_kalpin' },
  { label: 'Maria Belen Cuello',                    value: 'maria_belen_cuello' },
  { label: 'Maria Ines Soto',                       value: 'maria_ines_soto' },
  { label: 'Maria Jose Olivera Herbas',             value: 'maria_jose_olivera_herbas' },
  { label: 'Mariano Augusto Dasso',                 value: 'mariano_augusto_dasso' },
  { label: 'Mariano Ezequiel Perin',                value: 'mariano_ezequiel_perin' },
  { label: 'Mariano Hernán Storoni',                value: 'mariano_hernan_storoni' },
  { label: 'Marina Castro Lawor',                   value: 'marina_castro_lawor' },
  { label: 'Marina Elizabeth Miño',                 value: 'marina_elizabeth_mino' },
  { label: 'Martin Eduardo Magurno',                value: 'martin_eduardo_magurno' },
  { label: 'Martin Esteban Fogliacco',              value: 'martin_esteban_fogliacco' },
  { label: 'Mauricio Pinto',                        value: 'mauricio_pinto' },
  { label: 'Melina Aylen Rivarola',                 value: 'melina_aylen_rivarola' },
  { label: 'Mercedes Gonzalez',                     value: 'mercedes_gonzalez' },
  { label: 'Mercedes Mazza',                        value: 'mercedes_mazza' },
  { label: 'Micaela Alejandra Kulevicius Pedemonte',value: 'micaela_alejandra_kulevicius_pedemonte' },
  { label: 'Micaela Massironi',                     value: 'micaela_massironi' },
  { label: 'Myriam Soledad Radicci',                value: 'myriam_soledad_radicci' },
  { label: 'Nahuel Ignacio Bazillo',                value: 'nahuel_ignacio_bazillo' },
  { label: 'Nariela Maria Elizabeth Gallegos',      value: 'nariela_maria_elizabeth_gallegos' },
  { label: 'Natalia Concepción Scalia',             value: 'natalia_concepcion_scalia' },
  { label: 'Natalia Micaela Martinez Olivera',      value: 'natalia_micaela_martinez_olivera' },
  { label: 'Natalia Sol Fanara',                    value: 'natalia_sol_fanara' },
  { label: 'Nazarena Grimoldi',                     value: 'nazarena_grimoldi' },
  { label: 'Nicolas Ariel Ottate Carcabelo',        value: 'nicolas_ariel_ottate_carcabelo' },
  { label: 'Nicolas Capone',                        value: 'nicolas_capone' },
  { label: 'Nicolás Alejandro Ferré',               value: 'nicolas_alejandro_ferre' },
  { label: 'Nicole Jazmin Chalupowicz',             value: 'nicole_jazmin_chalupowicz' },
  { label: 'Noelia Guzman Jimenez',                 value: 'noelia_guzman_jimenez' },
  { label: 'Noelia Lujan Cabral',                   value: 'noelia_lujan_cabral' },
  { label: 'Olga Beatriz Patrone',                  value: 'olga_beatriz_patrone' },
  { label: 'Oscar Vargas',                          value: 'oscar_vargas' },
  { label: 'Pablo Martin Fagundez',                 value: 'pablo_martin_fagundez' },
  { label: 'Pablo Nicolas Sanhueza Jasem',          value: 'pablo_nicolas_sanhueza_jasem' },
  { label: 'Patricia Edith Villalba Avalos',        value: 'patricia_edith_villalba_avalos' },
  { label: 'Patricio Emmanuel Alegre',              value: 'patricio_emmanuel_alegre' },
  { label: 'Peter Alejandro Woyzechowsky Muratowa', value: 'peter_alejandro_woyzechowsky_muratowa' },
  { label: 'Pierina Salomé Pineda Maldonado',       value: 'pierina_salome_pineda_maldonado' },
  { label: 'Rada Kheiber Javier Borrego',           value: 'rada_kheiber_javier_borrego' },
  { label: 'Ramiro Miño',                           value: 'ramiro_mino' },
  { label: 'Raul Eduardo Rahal',                    value: 'raul_eduardo_rahal' },
  { label: 'Rita Carlota Wildman Machado',          value: 'rita_carlota_wildman_machado' },
  { label: 'Rodrigo Vera Montero',                  value: 'rodrigo_vera_montero' },
  { label: 'Romina Carla Manzato',                  value: 'romina_carla_manzato' },
  { label: 'Romina Ivana Bobadilla',                value: 'romina_ivana_bobadilla' },
  { label: 'Romina Judith De Antonio',              value: 'romina_judith_de_antonio' },
  { label: 'Romina Mariela Cirer',                  value: 'romina_mariela_cirer' },
  { label: 'Sabrina Anahi Flores',                  value: 'sabrina_anahi_flores' },
  { label: 'Salvador Ezequiel Morgante',            value: 'salvador_ezequiel_morgante' },
  { label: 'Santiago Alejandro Fernandez Furnari',  value: 'santiago_alejandro_fernandez_furnari' },
  { label: 'Santiago Eduardo Bagnera',              value: 'santiago_eduardo_bagnera' },
  { label: 'Sofia Aranguez',                        value: 'sofia_aranguez' },
  { label: 'Sofia Belen Memme',                     value: 'sofia_belen_memme' },
  { label: 'Soledad Silvana Colque',                value: 'soledad_silvana_colque' },
  { label: 'Tais Nair Abud',                        value: 'tais_nair_abud' },
  { label: 'Tamara Daiana Rolaiser',                value: 'tamara_daiana_rolaiser' },
  { label: 'Thiago Villavicencio',                  value: 'thiago_villavicencio' },
  { label: 'Tomas Embon',                           value: 'tomas_embon' },
  { label: 'Valeria Camba',                         value: 'valeria_camba' },
  { label: 'Valeria Carolina Salinas',              value: 'valeria_carolina_salinas' },
  { label: 'Valeria Fabiola Gallardo',              value: 'valeria_fabiola_gallardo' },
  { label: 'Valeria Fernanda Almiron',              value: 'valeria_fernanda_almiron' },
  { label: 'Valeria Roxana Alonso',                 value: 'valeria_roxana_alonso' },
  { label: 'Vanesa Elizabeth Pugliese',             value: 'vanesa_elizabeth_pugliese' },
  { label: 'Vanesa Soledad Nuñez',                  value: 'vanesa_soledad_nunez' },
  { label: 'Vanesa Yanina Moldes',                  value: 'vanesa_yanina_moldes' },
  { label: 'Vanina Vazquez Zalinkevicius',          value: 'vanina_vazquez_zalinkevicius' },
  { label: 'Veronica Lorena Rojas',                 value: 'veronica_lorena_rojas' },
  { label: 'Veronica Mariana Rodriguez',            value: 'veronica_mariana_rodriguez' },
  { label: 'Vyleta Maria Candela Thompson',         value: 'vyleta_maria_candela_thompson' },
  { label: 'Yamila Aldana Pacheco Demarchi',        value: 'yamila_aldana_pacheco_demarchi' },
  { label: 'Yamila Mariel Galati',                  value: 'yamila_mariel_galati' }
];

const OPCIONES_JS = JSON.stringify(NOMINA);

const htmlBody = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inscripción Capacitación Humand</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f8fa; display: flex; justify-content: center; padding: 40px 16px; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.1); padding: 40px; max-width: 620px; width: 100%; }
    h1 { font-size: 22px; color: #1a1a2e; margin-bottom: 6px; }
    .subtitulo { color: #666; font-size: 14px; margin-bottom: 32px; }
    .campo { margin-bottom: 24px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 8px; }
    input[type=email], select { width: 100%; padding: 10px 14px; border: 1px solid #d0d7de; border-radius: 6px; font-size: 14px; color: #333; background: #fafafa; }
    input[type=email]:focus, select:focus { outline: none; border-color: #0057b7; background: #fff; }
    .choices { font-size: 14px; }
    .aviso { background: #fff8e1; border: 1px solid #ffe082; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #5d4037; margin-bottom: 24px; }
    button[type=submit] { width: 100%; padding: 12px; background: #0057b7; color: #fff; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; }
    button[type=submit]:hover { background: #004099; }
    button[type=submit]:disabled { background: #aaa; cursor: not-allowed; }
    .mensaje { display: none; text-align: center; padding: 24px; }
    .mensaje.ok { color: #2e7d32; }
    .mensaje.err { color: #c62828; }
  </style>
</head>
<body>
<div class="card">
  <h1>Inscripción Capacitación Humand</h1>
  <p class="subtitulo">Inscribí a tu equipo en el turno de capacitación del nuevo sistema de gestión de RR.HH.</p>

  <div class="aviso">Cupo máximo por turno: <strong>30 personas</strong>. Distribuí tu equipo considerando la operación.</div>

  <form id="form-humand">
    <div class="campo">
      <label for="email">Tu email corporativo *</label>
      <input type="email" id="email" name="email" placeholder="nombre@finaersa.com.ar" required>
    </div>

    <div class="campo">
      <label for="turno">Turno de capacitación *</label>
      <select id="turno" name="turno_capacitacion_humand" required>
        <option value="">Seleccioná un turno</option>
        <option value="jueves_2_julio">Jueves 2 de Julio</option>
        <option value="viernes_3_julio">Viernes 3 de Julio</option>
        <option value="lunes_6_julio">Lunes 6 de Julio</option>
        <option value="martes_7_julio">Martes 7 de Julio</option>
      </select>
    </div>

    <div class="campo">
      <label for="recursos">Recursos a inscribir * <span style="font-weight:400;color:#888">(buscá por nombre)</span></label>
      <select id="recursos" name="recursos_inscribir_humand" multiple required>
        ${NOMINA.map(p => `<option value="${p.value}">${p.label}</option>`).join('\n        ')}
      </select>
    </div>

    <button type="submit" id="btn-enviar">Inscribir equipo</button>
    <div class="mensaje ok" id="msg-ok">✅ ¡Inscripción enviada correctamente! Ya podés cerrar esta página.</div>
    <div class="mensaje err" id="msg-err">❌ Hubo un error al enviar. Intentá de nuevo o contactá a Franco.</div>
  </form>
</div>

<script src="https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js"></script>
<script>
  const choices = new Choices('#recursos', {
    removeItemButton: true,
    searchEnabled: true,
    searchPlaceholderValue: 'Escribí para buscar...',
    placeholder: true,
    placeholderValue: 'Seleccioná personas...',
    noResultsText: 'No se encontraron resultados',
    noChoicesText: 'No hay más opciones',
    itemSelectText: '',
    shouldSort: false,
    maxItemCount: -1
  });

  document.getElementById('form-humand').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-enviar');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const email   = document.getElementById('email').value.trim();
    const turno   = document.getElementById('turno').value;
    const selected = choices.getValue(true);

    if (!email || !turno || selected.length === 0) {
      btn.disabled = false;
      btn.textContent = 'Inscribir equipo';
      alert('Completá todos los campos antes de enviar.');
      return;
    }

    const payload = {
      fields: [
        { name: 'email',                      value: email },
        { name: 'turno_capacitacion_humand',  value: turno },
        { name: 'recursos_inscribir_humand',   value: selected.join(';') }
      ],
      context: { pageUri: window.location.href, pageName: 'Inscripción Capacitación Humand' }
    };

    try {
      const res = await fetch(
        'https://api.hsforms.com/submissions/v3/integration/submit/145725856/afcadf5d-3a40-4844-b3a4-4df144c9bebb',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      if (res.ok) {
        document.getElementById('form-humand').style.display = 'none';
        document.getElementById('msg-ok').style.display = 'block';
      } else {
        throw new Error('status ' + res.status);
      }
    } catch(err) {
      document.getElementById('msg-err').style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Inscribir equipo';
    }
  });
</script>
</body>
</html>`;

(async () => {
  // Obtener dominio del portal para el slug
  const domain = 'landing.finaersa.com.ar';

  console.log('Creando landing page...');
  const r = await api('POST', '/cms/v3/pages/landing-pages', {
    name: 'Inscripcion Capacitacion Humand',
    slug: 'capacitacion-humand',
    templatePath: '@hubspot/growth/templates/blank.html',
    useFeaturedImage: false,
    htmlTitle: 'Inscripción Capacitación Humand',
    metaDescription: 'Inscribí a tu equipo en la capacitación del nuevo sistema Humand.',
    language: 'es',
    domain: domain,
    layoutSections: {},
    widgets: {},
    headHtml: '',
    footerHtml: '',
    customHead: '',
    includeDefaultCustomCss: false,
    enableDomainStylesheets: false,
    enableLayoutStylesheets: false,
    rawHtmlHead: '',
    rawHtmlBody: htmlBody,
    isCaptchaRequired: false
  });

  if (r.status === 201 || r.status === 200) {
    console.log('✅ Landing creada');
    console.log('   ID:', r.body.id);
    console.log('   Editor: https://app-eu1.hubspot.com/pages/145725856/editor/' + r.body.id);
    console.log('   URL preview: https://app-eu1.hubspot.com/pages/145725856/preview/' + r.body.id);
  } else {
    console.log('❌ Error:', JSON.stringify(r.body, null, 2).slice(0, 600));
  }
})();
