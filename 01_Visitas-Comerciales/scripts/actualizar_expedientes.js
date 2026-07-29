const https = require('https');
const fs = require('fs');

const TOKEN = process.env.HUBSPOT_TOKEN;
const PIPELINE_ID = '3353793749';

// Lista limpia y deduplicada. Omitidos: "PIZZA" (nombre incompleto), "Pablo enrique Acosta Pereyra" (nombre incorrecto según usuario)
const LISTA = [
  { nombre: 'Jose Ignacio Vega', expediente: '13146' },
  { nombre: 'Dana Azul Urra Vargas', expediente: '13143' },
  { nombre: 'Romina Mariel Silva', expediente: '10929' },
  { nombre: 'Agustin Cordoba', expediente: '10678' },
  { nombre: 'Martin Pablo Solari', expediente: '11990' },
  { nombre: 'Daniel FERNANDEZ', expediente: '12940' },
  { nombre: 'Alan Matías Ibarra', expediente: '11599' },
  { nombre: 'Erika Yamila ALIANO', expediente: '12965' },
  { nombre: 'Eliana Elizabeth Di Lorenzo', expediente: '12603' },
  { nombre: 'Bruno Daniel Mercado', expediente: '11310' },
  { nombre: 'Raul Alberto Caro', expediente: '12496' },
  { nombre: 'Juan Manuel Pintos', expediente: '13125' },
  { nombre: 'Enrique Jose Fuentes', expediente: '13120' },
  { nombre: 'María Lidia Toro', expediente: '12562' },
  { nombre: 'Claudio Gabriel Villalba', expediente: '10874' },
  { nombre: 'Analia Elda Fernandez Villalba', expediente: '13114' },
  { nombre: 'Valentina Nahiara Chacon', expediente: '13111' },
  { nombre: 'Eduardo Hernán Mason', expediente: '12943' },
  { nombre: 'Héctor Joel Zagaray Spogli', expediente: '12788' },
  { nombre: 'Milagros Micaela Ruiz', expediente: '13104' },
  { nombre: 'Yenelis Del Valle Contreras Pinto', expediente: '12116' },
  { nombre: 'Jaqueline Denise Salazar', expediente: '12017' },
  { nombre: 'Anuark Orlando JIMENEZ VEGA', expediente: '13121' },
  { nombre: 'Tomas Agustin Galleri', expediente: '8609' },
  { nombre: 'Laura Gabriela Muller', expediente: '13140' },
  { nombre: 'Nelida Edisa Castro', expediente: '12339' },
  { nombre: 'Sofía Ailin Loto', expediente: '11717' },
  { nombre: 'Liseth Milagros Colan Barraza', expediente: '9787' },
  { nombre: 'Silvina Lorena Taboada', expediente: '13091' },
  { nombre: 'Blas Ramon Duarte Ojeda', expediente: '11275' },
  { nombre: 'JUAN PABLO DEBIASSI', expediente: '11389' },
  { nombre: 'VIVIAN CELESTE CAMUS', expediente: '10088' },
  { nombre: 'ROMINA ANAHI PONCE', expediente: '10927' },
  { nombre: 'Julio Oscar Benitez', expediente: '12065' },
  { nombre: 'Nadia Soledad Rodriguez', expediente: '13074' },
  { nombre: 'Sebastian adrian chasona santamaria', expediente: '12265' },
  { nombre: 'FLORES SANTANDER AUGUSTO NICOLAS', expediente: '13117' },
  { nombre: 'Nahuel Agustín Enríquez Ceballos', expediente: '10818' },
  { nombre: 'Leandro Daniel Orayen', expediente: '13072' },
  { nombre: 'Alejandro Ismael Guil', expediente: '12170' },
  { nombre: 'Alejandro Fabian Carabelli', expediente: '13066' },
  { nombre: 'Cristian Javier Hinojosa', expediente: '13065' },
  { nombre: 'Florencia Leila García', expediente: '11976' },
  { nombre: 'Leticia Honda Tavares', expediente: '12951' },
  { nombre: 'Ricardo Raúl Esteban Quintana', expediente: '13069' },
  { nombre: 'Susana Beatriz Lopez Gonzalez', expediente: '13064' },
  { nombre: 'Héctor Javier Fresco', expediente: '12628' },
  { nombre: 'Ana ligia Gonzalez Suarez', expediente: '11502' },
  { nombre: 'Loana Marlene Zamora', expediente: '12608' },
  { nombre: 'Florencia Johanna Gadea', expediente: '11116' },
  { nombre: 'LUJAN NOELIA PAREDES', expediente: '13059' },
  { nombre: 'Liliana Edith Falcon', expediente: '10242' },
  { nombre: 'Emily Caroline Cutipa Coruro', expediente: '11141' },
  { nombre: 'Tiziano Baquini', expediente: '10986' },
  { nombre: 'Nahuel Ernesto Woodley', expediente: '9567' },
  { nombre: 'Sebastian Gabriel Cordoba', expediente: '12503' },
  { nombre: 'Araceli Victoria Inés Alegre', expediente: '10686' },
  { nombre: 'Laura Romina Romero Gomez', expediente: '11121' },
  { nombre: 'Luciano Ezequiel Ferreras', expediente: '11633' },
  { nombre: 'Pedro Ignacio Flores Flores', expediente: '12186' },
  { nombre: 'David Maximiliano Ezequiel San Giovanni', expediente: '12186' },
  { nombre: 'Elias Gabriel Piuca', expediente: '11918' },
  { nombre: 'Sebastian Muñoz', expediente: '13057' },
  { nombre: 'Nahuel Maximiliano Olivera', expediente: '12512' },
  { nombre: 'Gerardo Ezequiel Cardozo', expediente: '13056' },
  { nombre: 'Malena Karina Verde Contreras', expediente: '13055' },
  { nombre: 'Argentino Alberto Giménez', expediente: '12756' },
  { nombre: 'Anderson Brayyan Cumari Flores', expediente: '12172' },
  { nombre: 'Yamila Vanesa Cheli', expediente: '13052' },
  { nombre: 'Julian Ariel Urcelay', expediente: '13048' },
  { nombre: 'Micaela Anahi Leiva', expediente: '12670' },
  { nombre: 'Eugenio Omar Acuña', expediente: '12397' },
  { nombre: 'Fernando Matias Paz', expediente: '11680' },
  { nombre: 'Sebastian Iaquinta', expediente: '11883' },
  { nombre: 'Maria Valentina Padron Padra', expediente: '11230' },
  { nombre: 'RUBEN DARIO LEON', expediente: '13098' },
  { nombre: 'Jimena Ailin Couto', expediente: '12123' },
  { nombre: 'PELLEJERO CAROLA EUGENIA', expediente: '11713' },
  { nombre: 'Oscar Guillermo Suarez', expediente: '9009' },
  { nombre: 'Carlos Hector Tojeiro Galvan', expediente: '13043' },
  { nombre: 'Noelia Gisselle Chamorro', expediente: '13040' },
  { nombre: 'Cintia Vanesa Sena', expediente: '9779' },
  { nombre: 'Maria Gabriela Antunez', expediente: '10910' },
  { nombre: 'Jazmin Magdalena Gutierrez', expediente: '9578' },
  { nombre: 'Andrea Cecilia Franco', expediente: '13036' },
  { nombre: 'JESICA ALEJANDRA GARAYALDE', expediente: '11580' },
  { nombre: 'Ezequiel Alejandro Baroni', expediente: '13031' },
  { nombre: 'Leiliz Ariani Villalobos Mejia', expediente: '13030' },
  { nombre: 'Santiago Mauricio Ladino Andrade', expediente: '12558' },
  { nombre: 'Ignacio Sosa', expediente: '12218' },
  { nombre: 'Yanna Alexandra Rodríguez Correa', expediente: '12698' },
  { nombre: 'Hector Bustos Ferreyra', expediente: '10670' },
  { nombre: 'Leiva Matias', expediente: '12504' },
  { nombre: 'Celeste Agustina Silva', expediente: '13024' },
  { nombre: 'Cristian Andres Montes', expediente: '13020' },
  { nombre: 'María Alicia Puppo', expediente: '11017' },
  { nombre: 'Catalina Haydee Goñi', expediente: '11511' },
  { nombre: 'Luis Ignacio Gassmann', expediente: '10376' },
  { nombre: 'Lautaro Zanabria', expediente: '12891' },
  { nombre: 'Lautaro Dabel Zanabria', expediente: '12891' },
  { nombre: 'Íngrid Jaqueline Gomez', expediente: '12838' },
  { nombre: 'ramirez ricardo', expediente: '12360' },
  { nombre: 'Pablo Alejo Guzman', expediente: '12957' },
  { nombre: 'Vanesa Del Carmen Rojas', expediente: '12959' },
  { nombre: 'Rosario Belen Molinas', expediente: '12991' },
  { nombre: 'Franco Jose Parra', expediente: '12987' },
  { nombre: 'Ludmila Paola Baldi', expediente: '12674' },
  { nombre: 'Cristian Emanuel Molina', expediente: '12048' },
  { nombre: 'Fernando Luis Damiani', expediente: '12981' },
  { nombre: 'Rodrigo Daniel Brites', expediente: '12246' },
  { nombre: 'Analia Azucena Lopez', expediente: '11797' },
  { nombre: 'Ezequiel Galeano', expediente: '12414' },
  { nombre: 'Belén Cinthia Sandoval', expediente: '13000' },
  { nombre: 'Amado Carlos Jorge', expediente: '11841' },
  { nombre: 'Cesar Luis Orellano', expediente: '11601' },
  { nombre: 'Yamila Teresa Rey', expediente: '11211' },
  { nombre: 'María Belen Enriquez', expediente: '12995' },
  { nombre: 'Cristian Edgardo Blanco', expediente: '10955' },
  { nombre: 'Matías Sebastián Alvarez', expediente: '11232' },
  { nombre: 'Favio Rodolfo Tapia', expediente: '10965' },
  { nombre: 'Facundo Leandro Barros', expediente: '12419' },
  { nombre: 'Rolando Sarmiento', expediente: '12751' },
  { nombre: 'Paula Patricia Hanriquez', expediente: '10815' },
  { nombre: 'Santiago Gabriel Martin', expediente: '12986' },
  { nombre: 'Gisela Romina Cerdan', expediente: '12982' },
  { nombre: 'Diego Oscar Fernandez', expediente: '13010' },
  { nombre: 'Camila Evelyn Gonzalez', expediente: '11968' },
  { nombre: 'Melany Celeste Viggiani', expediente: '12673' },
  { nombre: 'Gonzalo Agustin Giammarino', expediente: '11817' },
  { nombre: 'Bruno Pinelli', expediente: '12016' },
  { nombre: 'Eduardo Ticlla Chacchi', expediente: '12994' },
  { nombre: 'Agustin Raul Ramirez', expediente: '13018' },
  { nombre: 'Amanda Sophia Bautista Casanova', expediente: '13028' },
  { nombre: 'Sandra Lorena Gonzalez', expediente: '11905' },
  { nombre: 'Miguel Ángel Escalona Torrealba', expediente: '12975' },
  { nombre: 'WILLIAM ALONSO ALARCON MEJIA', expediente: '12372' },
  { nombre: 'ESTHER MATILDE DOMINGUEZ', expediente: '11346' },
  { nombre: 'Adriana Mariela Alvarez', expediente: '11058' },
  { nombre: 'Guido Marcelo Paz', expediente: '10522' },
  { nombre: 'Analía Friosso', expediente: '12946' },
  { nombre: 'Dardo Daniel Alves', expediente: '12952' },
  { nombre: 'Maximiliano Ezequiel Diaz', expediente: '12953' },
  { nombre: 'Rosa Noemi Del Valle Bielik', expediente: '12443' },
  { nombre: 'Guillermo Ariel Benítez', expediente: '12948' },
  { nombre: 'Ruth Noemi Elizabeth Moreno', expediente: '12362' },
  { nombre: 'Mercedes Victoria Seculitch', expediente: '12966' },
  { nombre: 'Fernando Damian Manrique', expediente: '9840' },
  { nombre: 'Ayelen Katia Camacho', expediente: '12142' },
  { nombre: 'Nicolas Esquivel', expediente: '11259' },
  { nombre: 'Myrian Laura Vargas', expediente: '11162' },
  { nombre: 'Daiana Giselle Ayala', expediente: '12373' },
  { nombre: 'Angel Sebastian Pucheta', expediente: '12933' },
  { nombre: 'Juan Manuel Castro', expediente: '12932' },
  { nombre: 'Sabrina Perez Noemi', expediente: '13027' },
  { nombre: 'Yesica Romina CABRERA', expediente: '12968' },
  { nombre: 'GABRIEL EDUARDO MARTINEZ', expediente: '12682' },
  { nombre: 'Roberto Sebastian Carrizo Nicolau', expediente: '11938' },
  { nombre: 'Rey Analia', expediente: '12927' },
  { nombre: 'Ivana Noemi Velazquez Rosales', expediente: '12925' },
  { nombre: 'Ignacio Gabriel Pachu', expediente: '11850' },
  { nombre: 'Esteban Ariel Ruggirello', expediente: '11100' },
  { nombre: 'Cesar Andres Gomez', expediente: '12871' },
  { nombre: 'Adrian Alejandro Nieva', expediente: '12922' },
  { nombre: 'pablo jose Antognazza', expediente: '12936' },
  { nombre: 'Gonzalo Nicolas Origuela', expediente: '12453' },
  { nombre: 'Pablo Javier Martinez Olivera', expediente: '12912' },
  { nombre: 'Ángel Javier López Fuentes', expediente: '12869' },
  { nombre: 'Benjamin Nicolás Hernán Acosta', expediente: '12100' },
  { nombre: 'Diego Jose Garcia', expediente: '10317' },
  { nombre: 'Aurora Raquel Ifran', expediente: '11095' },
  { nombre: 'ALEXIS EMANUEL CASTILLO', expediente: '12945' },
  { nombre: 'Damaris Ailen Sotelo Cabrera', expediente: '12907' },
  { nombre: 'Barbara Gisele Pizza', expediente: '12839' },
  { nombre: 'Javier Sebastián Brailovsky', expediente: '12902' },
  { nombre: 'Nicolas Dario Landriel', expediente: '10150' },
  { nombre: 'Sergio Ciro Daniel Callier', expediente: '12892' },
  { nombre: 'Juan Tomas Bravo', expediente: '12433' },
  { nombre: 'Camus Viviana', expediente: '10088' },
  { nombre: 'JUAN PABLO SANCHEZ', expediente: '12920' },
  { nombre: 'Ricardo Javier Facundo Toffoletti', expediente: '10958' },
  { nombre: 'Carmela Coro Julian', expediente: '12974' },
  { nombre: 'Lia Mariana Arce', expediente: '12899' },
  { nombre: 'Valentina Almeyra', expediente: '12847' },
  { nombre: 'Ivan Federico Esterman', expediente: '9568' },
  { nombre: 'Mauro Manuel Miguel Martinez', expediente: '12834' },
  { nombre: 'Anyarit Fedora Peralta Garcia', expediente: '12652' },
  { nombre: 'Malcolm Ariel Gularte', expediente: '12851' },
  { nombre: 'Elías Leonel Guzman', expediente: '12830' },
];

// Casos para revisión manual (se intentan igual, pero quedan marcados)
const REVISAR_MANUALMENTE = [
  {
    razon: 'Dos personas distintas con el mismo expediente 12186 — verificar si es correcto',
    entradas: ['Pedro Ignacio Flores Flores - 12186', 'David Maximiliano Ezequiel San Giovanni - 12186']
  },
  {
    razon: 'Mismo expediente 10088 con dos variantes de nombre — verificar cuál es el nombre real en HubSpot',
    entradas: ['VIVIAN CELESTE CAMUS - 10088', 'Camus Viviana - 10088']
  },
  {
    razon: 'Mismo expediente 12891 con dos variantes del nombre — verificar cuál es el correcto',
    entradas: ['Lautaro Zanabria - 12891', 'Lautaro Dabel Zanabria - 12891']
  },
  {
    razon: 'Nombre incorrecto según usuario — OMITIDO del script, gestionar a mano',
    entradas: ['Pablo enrique Acosta Pereyra - 10958 (el expediente 10958 ya está asignado a Ricardo Javier Facundo Toffoletti)']
  },
  {
    razon: 'Nombre incompleto "PIZZA" — OMITIDO, se usa "Barbara Gisele Pizza - 12839" en su lugar',
    entradas: ['PIZZA - 12839']
  }
];

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.hubapi.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function searchTickets(nombre) {
  return makeRequest('POST', '/crm/v3/objects/tickets/search', {
    filterGroups: [{
      filters: [
        { propertyName: 'nombre_y_apellido_del_inquilino', operator: 'EQ', value: nombre },
        { propertyName: 'hs_pipeline', operator: 'EQ', value: PIPELINE_ID }
      ]
    }],
    properties: ['nombre_y_apellido_del_inquilino', 'nro_expediente', 'subject', 'hs_pipeline_stage'],
    limit: 10
  });
}

async function updateTicket(id, expediente) {
  return makeRequest('PATCH', `/crm/v3/objects/tickets/${id}`, {
    properties: { nro_expediente: expediente }
  });
}

async function main() {
  const resultados = [];
  let actualizados = 0, noEncontrados = 0, errores = 0, ticketsTotales = 0;

  console.log(`\nActualizando nro_expediente en ${LISTA.length} entradas...`);
  console.log(`Pipeline: ${PIPELINE_ID} | Siempre sobreescribe\n`);

  for (let i = 0; i < LISTA.length; i++) {
    const { nombre, expediente } = LISTA[i];
    process.stdout.write(`[${i + 1}/${LISTA.length}] ${nombre} → ${expediente} ... `);

    let searchRes;
    try {
      searchRes = await searchTickets(nombre);
    } catch (e) {
      console.log('ERROR DE RED');
      resultados.push({ nombre, expediente, estado: 'ERROR_BUSQUEDA', detalle: e.message, tickets: [] });
      errores++;
      await sleep(500);
      continue;
    }

    if (searchRes.status !== 200 || !searchRes.body.results) {
      console.log(`ERROR HTTP ${searchRes.status}`);
      resultados.push({ nombre, expediente, estado: 'ERROR_BUSQUEDA', detalle: JSON.stringify(searchRes.body), tickets: [] });
      errores++;
      await sleep(500);
      continue;
    }

    const tickets = searchRes.body.results;

    if (tickets.length === 0) {
      console.log('NO ENCONTRADO');
      resultados.push({ nombre, expediente, estado: 'NO_ENCONTRADO', tickets: [] });
      noEncontrados++;
    } else {
      const updates = [];
      for (const ticket of tickets) {
        const expedienteAnterior = ticket.properties.nro_expediente || '(vacío)';
        const updateRes = await updateTicket(ticket.id, expediente);
        updates.push({
          ticketId: ticket.id,
          nombre_en_ticket: ticket.properties.nombre_y_apellido_del_inquilino,
          subject: ticket.properties.subject,
          expedienteAnterior,
          expedienteNuevo: expediente,
          updateOk: updateRes.status === 200
        });
        ticketsTotales++;
        await sleep(150);
      }
      const allOk = updates.every(u => u.updateOk);
      const label = allOk ? 'OK' : 'ERROR_UPDATE';
      console.log(`${label} (${tickets.length} ticket${tickets.length > 1 ? 's' : ''})`);
      resultados.push({ nombre, expediente, estado: label, tickets: updates });
      if (allOk) actualizados++;
      else errores++;
    }

    await sleep(250);
  }

  // Reporte JSON completo
  const reporte = {
    fecha: new Date().toISOString(),
    resumen: {
      entradas_procesadas: LISTA.length,
      actualizados,
      no_encontrados: noEncontrados,
      errores,
      tickets_actualizados_total: ticketsTotales
    },
    revisar_manualmente: REVISAR_MANUALMENTE,
    no_encontrados: resultados.filter(r => r.estado === 'NO_ENCONTRADO').map(r => `${r.nombre} — exp. ${r.expediente}`),
    errores_detalle: resultados.filter(r => r.estado.startsWith('ERROR')),
    detalle_completo: resultados
  };

  const reportePath = 'reporte_expedientes.json';
  fs.writeFileSync(reportePath, JSON.stringify(reporte, null, 2));

  console.log('\n========================================');
  console.log('RESUMEN FINAL');
  console.log('========================================');
  console.log(`Entradas procesadas:     ${LISTA.length}`);
  console.log(`Actualizados:            ${actualizados}`);
  console.log(`No encontrados:          ${noEncontrados}`);
  console.log(`Errores:                 ${errores}`);
  console.log(`Tickets actualizados:    ${ticketsTotales}`);
  console.log(`\nReporte completo: ${reportePath}`);

  if (noEncontrados > 0) {
    console.log('\n--- NO ENCONTRADOS ---');
    resultados.filter(r => r.estado === 'NO_ENCONTRADO').forEach(r => {
      console.log(`  • ${r.nombre} (exp. ${r.expediente})`);
    });
  }

  console.log('\n--- REVISAR MANUALMENTE ---');
  REVISAR_MANUALMENTE.forEach(c => {
    console.log(`\n  ⚠ ${c.razon}`);
    c.entradas.forEach(e => console.log(`    - ${e}`));
  });
}

main().catch(console.error);
