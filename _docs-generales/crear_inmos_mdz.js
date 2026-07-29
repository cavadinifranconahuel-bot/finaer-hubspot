// Crea 45 contactos (inmobiliarias MDZ) y los agrega a la lista "Listado de inmobiliarias MDZ"
// Uso: $env:HUBSPOT_TOKEN="pat-eu1-xxx" ; node crear_inmos_mdz.js

const TOKEN = process.env.HUBSPOT_TOKEN;
const BASE  = 'https://api.hubapi.com';

if (!TOKEN) { console.error('Falta HUBSPOT_TOKEN'); process.exit(1); }

const contactos = [
  { name: 'Di Luca Propiedades',                         phone: '2615741988', address: 'Adolfo Calle N° 3561',                  zip: '5519', city: 'Dorrego',         email: 'paogdiluca@gmail.com' },
  { name: 'Llopart Inmobiliaria',                         phone: '2615195022', address: 'Chacras Park - Piso 5 Of. 508',         zip: '5505', city: 'Chacras de Coria', email: 'ricardollopart@llopartinmobiliaria.com.ar' },
  { name: 'Adrián Fernández Desarrollo Inmobiliario',     phone: '2614850500', address: 'B° UJEMBI LAS ORQUIDIAS',               zip: '5521', city: 'Villanueva',       email: 'adrianfernandez723@gmail.com' },
  { name: 'Adriana Lacoste',                              phone: '2614543855', address: 'Chile 1863',                            zip: '5500', city: 'Mendoza',           email: 'adrianalacoste@hotmail.com' },
  { name: 'Alejandro Marotta',                            phone: '2615663519', address: '9 de Julio 1189 of 40',                 zip: '5500', city: 'Mendoza',           email: 'inmomarotta@hotmail.com' },
  { name: 'Astorga y Asociados Estudio Inmobiliario',     phone: '2614234190', address: 'Catamarca 65 1° Of.1',                  zip: '5500', city: 'Mendoza',           email: 'inmobiliariaastorga@gmail.com' },
  { name: 'Baro Vecchio Propiedades',                     phone: '2614725390', address: 'Dorrego 2454',                          zip: '5519', city: 'Dorrego',           email: 'smbarovecchio2011@gmail.com' },
  { name: 'Brovedani & Asoc.',                            phone: '2613693610', address: 'Dorrego 147',                           zip: '5519', city: 'Dorrego',           email: 'brovedaniasoc@hotmail.com.ar' },
  { name: 'CR Inmobiliaria',                              phone: '2622423562', address: 'Juan B. Justo 350',                     zip: '',     city: '',                  email: 'c.r_inmobiliaria@yahoo.com.ar' },
  { name: 'Díaz Guiñazú Inmobiliaria',                   phone: '2614203826', address: 'Pedro Molina 265 Of. 12',               zip: '5500', city: 'Mendoza',           email: 'gdiazguinazu@yahoo.com.ar' },
  { name: 'DM Servicios Profesionales',                   phone: '2615358560', address: 'Colon 695',                             zip: '5500', city: 'Mendoza',           email: 'inmo@dmweb.com.ar' },
  { name: 'Duclos Propiedades',                           phone: '2614246952', address: 'Beltran 902',                           zip: '',     city: '',                  email: 'duclospropiedades9@gmail.com' },
  { name: 'Elizalde Inmuebles S.A.',                      phone: '2614285384', address: 'P.J.Godoy 804',                         zip: '',     city: '',                  email: 'elizalde.inmuebles@gmail.com' },
  { name: 'Fabiana Macoratti',                            phone: '2616521467', address: 'Chacabuco 250 Oficina 21',              zip: '5501', city: 'Godoy Cruz',         email: 'fmacoratti@ciainmobiliaria.com.ar' },
  { name: 'Godoy Negocios Inmobiliarios',                 phone: '2615594828', address: 'Colon 474 - 4° Piso Dto 1',            zip: '5500', city: 'Mendoza',           email: 'info@godoyinmobiliaria.com' },
  { name: 'Inmobiliaria Cosentino',                       phone: '2615570497', address: 'Severo del Castillo 5057',              zip: '',     city: '',                  email: 'cosentino.inmobiliaria@gmail.com' },
  { name: 'Inmobiliaria Ingrassia',                       phone: '2615613180', address: 'Pincolini 2771',                        zip: '5507', city: 'Luján de Cuyo',     email: 'inmoingrassia@gmail.com' },
  { name: 'Inmobiliaria Mendoza',                         phone: '2614234286', address: '25 de Mayo 1363',                       zip: '',     city: '',                  email: 'info@inmobiliariamendoza.net' },
  { name: 'Inmobiliaria Stevanato S.A.',                  phone: '2616531842', address: 'Patricias Argentinas 280',              zip: '5515', city: 'Maipú',             email: 'adrian@stevanato.com.ar' },
  { name: 'Luis Italo Guiñazú Gutiérrez',                phone: '2614523225', address: 'Muñiz 668',                             zip: '',     city: '',                  email: 'luisitalo2001@yahoo.com.ar' },
  { name: 'Membrives Inmobiliaria',                       phone: '2615940269', address: 'Pte. Alvear 291',                       zip: '5501', city: 'Godoy Cruz',         email: 'inmomembrives@gmail.com' },
  { name: 'OUTEDA Bienes Raíces',                         phone: '2612455942', address: 'Pedro Capitani y Alem',                 zip: '5519', city: 'Dorrego',           email: 'outeda.bienesraices@gmail.com' },
  { name: 'Oviedo Inmobiliaria',                          phone: '2615137008', address: 'Granaderos 2022',                       zip: '5500', city: 'Mendoza',           email: 'maureangel@gmail.com' },
  { name: 'Porcel Inmobiliaria',                          phone: '2614453685', address: 'Necochea 802',                          zip: '5521', city: 'Villanueva',         email: 'inmobiliariaporcel@hotmail.com' },
  { name: 'Provivienda Inmobiliaria SRL',                 phone: '2614258900', address: '25 de Mayo 1838',                       zip: '5500', city: 'Mendoza',           email: 'provivienda@speedy.com.ar' },
  { name: 'Rastelli Propiedades',                         phone: '2634423702', address: 'Capdevilla 285',                        zip: '5570', city: 'San Martín',         email: 'rastellipropiedades@hotmail.com' },
  { name: 'Realty Plus',                                  phone: '2615895345', address: 'Carril Rodríguez Peña 2163',            zip: '5515', city: 'Maipú',             email: 'ernesto.ferioli@realty-plus.ar' },
  { name: 'Santiago Debé Propiedades',                    phone: '2614239921', address: 'Julio L. Aguirre 67 5° Piso Dpto 3',   zip: '5500', city: 'Mendoza',           email: 'fabiandebe@sdebe.com.ar' },
  { name: 'Santos Angeles Inmobiliaria',                  phone: '2615739200', address: 'San Martín 900',                        zip: '5500', city: 'Mendoza',           email: 'angievi@outlook.com.ar' },
  { name: 'Scaffidi Propiedades y Turismo',               phone: '2614255879', address: 'Catamarca 170 1° Of. 2',                zip: '',     city: '',                  email: 'scaffidipropiedades@yahoo.com' },
  { name: 'Siclo Inversiones',                            phone: '2604503311', address: 'Av. Los Sauces 788',                    zip: '5560', city: 'San Rafael',         email: 'sicloinversiones@gmail.com' },
  { name: 'San Jorge Propiedades',                        phone: '2622470765', address: 'Tcnl. Sasso 227',                       zip: '5567', city: 'San Carlos',         email: 'ventas@sanjorgepropiedades.com.ar' },
  { name: 'Tito Rivero Negocios Inmobiliarios',           phone: '2622423200', address: 'Pelegrini 128',                         zip: '5570', city: 'San Martín',         email: 'titoriveropropiedades@yahoo.com.ar' },
  { name: 'Verantes Inmobiliaria',                        phone: '2634679743', address: 'W. Nuñez 1270',                         zip: '5570', city: 'San Martín',         email: 'verantespropiedades@gmail.com' },
  { name: 'Tomba Inmobiliaria',                           phone: '2614280968', address: 'Pueyrredon 401',                        zip: '5500', city: 'Mendoza',           email: 'vtomba@tombapropiedades.com' },
  { name: 'EMPRENDER NEGOCIOS INMOBILIARIOS',             phone: '2604439088', address: 'Cnel. Ricardo Day N° 434',              zip: '5560', city: 'San Rafael',         email: 'info@emprendersr.com.ar' },
  { name: 'Avanti Propiedades',                           phone: '2604056779', address: 'Pelegrini 123 3° B',                    zip: '5560', city: 'San Rafael',         email: 'iavantiprop@gmail.com' },
  { name: 'Inmobiliaria Arana',                           phone: '2604422464', address: 'Bombal 137',                            zip: '5560', city: 'San Rafael',         email: 'inmobiliariaarana@gmail.com' },
  { name: 'Jorge Altamirano Admin. y Vta. Inmuebles',     phone: '2604406793', address: '25 de Mayo 801',                        zip: '5560', city: 'San Rafael',         email: 'jeabienesraices@yahoo.com.ar' },
  { name: 'M&T Bienes Raices',                            phone: '2604436344', address: 'Av. Rivadavia 556',                     zip: '5560', city: 'San Rafael',         email: 'bienesraicesmyt@gmail.com' },
  { name: 'REGENTINO PROPIEDADES',                        phone: '2614706861', address: 'Alberdi 1092 - Dto 6',                  zip: '5519', city: 'San José',           email: 'regentinoprodiedade8@gmail.com' },
  { name: 'LANDART PROPIEDADES',                          phone: '2613392815', address: '9 de Julio 2823',                       zip: '5500', city: 'Mendoza',           email: 'landartinmobiliaria@gmail.com' },
  { name: 'EUGENIA ESCAYOL PROPIEDADES',                  phone: '2615180506', address: 'Berutti 2556 - Complejo Las Palmeras',  zip: '5519', city: 'Dorrego',           email: 'marieuge03@gmail.com' },
  { name: 'EDUARDO ROSTA INMOBILIARIA',                   phone: '2613142590', address: 'San Martín 924 - Ofi 3 PB',             zip: '5500', city: 'Mendoza',           email: 'rostaeduardo@gmail.com' },
  { name: 'LILIANA CANTON',                               phone: '2612541836', address: 'San Lorenzo',                           zip: '5505', city: 'Carrodilla',         email: null },
];

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function main() {
  // 1. Batch create contacts
  const inputs = contactos.map(c => {
    const props = {
      firstname: c.name,
      phone:     c.phone,
      address:   c.address,
      city:      c.city,
      zip:       c.zip,
      country:   'Argentina',
      state:     'Mendoza'
    };
    if (c.email) props.email = c.email;
    return { properties: props };
  });

  console.log(`Creando ${inputs.length} contactos...`);
  const batchRes = await post('/crm/v3/objects/contacts/batch/create', { inputs });

  if (!batchRes.results) {
    console.error('Error en batch create:', JSON.stringify(batchRes, null, 2));
    process.exit(1);
  }

  const ids = batchRes.results.map(r => r.id);
  console.log(`✅ ${ids.length} contactos creados`);

  // 2. Crear lista estática
  console.log('Creando lista...');
  const listRes = await post('/crm/v3/lists', {
    name: 'Listado de inmobiliarias MDZ',
    objectTypeId: '0-1',
    listType: 'STATIC'
  });

  if (!listRes.listId) {
    console.error('Error creando lista:', JSON.stringify(listRes, null, 2));
    process.exit(1);
  }

  const listId = listRes.listId;
  console.log(`✅ Lista creada. ID: ${listId}`);

  // 3. Agregar contactos a la lista
  console.log('Agregando contactos a la lista...');
  const addRes = await post(`/crm/v3/lists/${listId}/memberships/add-all`, {
    recordIdsToAdd: ids
  });

  console.log('✅ Listo. Lista "Listado de inmobiliarias MDZ" con', ids.length, 'contactos.');
  console.log('List ID:', listId);
}

main().catch(console.error);
