/**
 * Test del proceso completo de Incumplimientos
 * 
 * Flujo: Ticket → Deal (cuando Ticket llega a "Pago en proceso")
 * 
 * Pipeline Tickets: 3353793749
 * Pipeline Deals: 3403406575
 * WF4 (Ticket → Deal): 3654117624
 * WF2 (copia propiedades): 3962960072
 */

const https = require('https');

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';
const TEST_DRY_RUN = process.argv.includes('--dry-run');

// ── API Helper ─────────────────────────────────────────────────────────────
function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = { 
      'Authorization': 'Bearer ' + TOKEN, 
      'Content-Type': 'application/json; charset=utf-8' 
    };
    if (data) headers['Content-Length'] = data.length;
    
    const req = https.request({ 
      hostname: 'api.hubapi.com', 
      path: apiPath, 
      method, 
      headers 
    }, res => {
      const c = []; 
      res.on('data', d => c.push(d));
      res.on('end', () => {
        const text = Buffer.concat(c).toString('utf8');
        try { resolve(text ? JSON.parse(text) : {}); } catch(e) { resolve({ _raw: text }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Test Principal ─────────────────────────────────────────────────────────
async function testIncumplimientosProcess() {
  console.log('='.repeat(60));
  console.log('TEST: Proceso Completo de Incumplimientos');
  console.log('='.repeat(60));
  console.log(`Modo: ${TEST_DRY_RUN ? 'DRY RUN (sin crear datos)' : 'REAL (creará datos de prueba)'}`);
  console.log('');

  const results = {
    pipelines: {},
    workflows: {},
    properties: {},
    testTicket: null,
    testDeal: null,
    errors: []
  };

  try {
    // ============================================================
    // 1. VERIFICAR PIPELINES DE TICKETS
    // ============================================================
    console.log('📋 1. Verificando Pipeline de Tickets...');
    
    const ticketPipelines = await apiRequest('GET', '/crm/v3/pipelines/tickets?limit=100');
    
    const ticketPipeline = ticketPipelines.results?.find(p => p.id === '3353793749');
    if (ticketPipeline) {
      console.log(`   ✅ Pipeline Tickets "Incumplimientos": ${ticketPipeline.label}`);
      results.pipelines.tickets = ticketPipeline;
      
      // Verificar etapa "Pago en proceso"
      const etapaPagoEnProceso = ticketPipeline.stages?.find(e => e.id === '4596051185');
      if (etapaPagoEnProceso) {
        console.log(`   ✅ Etapa "Pago en proceso": ${etapaPagoEnProceso.label}`);
      } else {
        results.errors.push('Etapa "Pago en proceso" (4596051185) no encontrada');
      }
    } else {
      results.errors.push('Pipeline Tickets 3353793749 no encontrado');
    }

    // ============================================================
    // 2. VERIFICAR PIPELINE DE DEALS
    // ============================================================
    console.log('\n📋 2. Verificando Pipeline de Deals...');
    
    const dealPipelines = await apiRequest('GET', '/crm/v3/pipelines/deals?limit=100');
    
    const dealPipeline = dealPipelines.results?.find(p => p.id === '3403406575');
    if (dealPipeline) {
      console.log(`   ✅ Pipeline Deals "Seguimiento de Deuda": ${dealPipeline.label}`);
      results.pipelines.deals = dealPipeline;
    } else {
      results.errors.push('Pipeline Deals 3403406575 no encontrado');
    }

    // ============================================================
    // 3. VERIFICAR WF4 (crea Deal desde Ticket)
    // ============================================================
    console.log('\n⚙️  3. Verificando WF4 (crea Deal)...');
    
    try {
      const wf4 = await apiRequest('GET', '/automation/v4/flows/3654117624');
      console.log(`   ✅ WF4: ${wf4.name}`);
      console.log(`      Habilitado: ${wf4.isEnabled}`);
      console.log(`      Tipo: ${wf4.type}`);
      results.workflows.wf4 = wf4;
    } catch (e) {
      results.errors.push('WF4 (3654117624) no encontrado o inaccesible');
    }

    // ============================================================
    // 4. VERIFICAR WF2 (copia propiedades)
    // ============================================================
    console.log('\n⚙️  4. Verificando WF2 (copia propiedades)...');
    
    try {
      const wf2 = await apiRequest('GET', '/automation/v4/flows/3962960072');
      console.log(`   ✅ WF2: ${wf2.name}`);
      console.log(`      Habilitado: ${wf2.isEnabled}`);
      console.log(`      Tipo: ${wf2.type}`);
      
      // Analizar acciones
      if (wf2.actions?.length) {
        console.log(`      Acciones: ${wf2.actions.length}`);
        
        const copyActions = wf2.actions.filter(a => a.type === 'OBJECT_PROPERTY');
        console.log(`      Acciones de copia: ${copyActions.length}`);
        
        for (const action of copyActions.slice(0, 5)) {
          console.log(`         ${action.propertyName} → ${action.targetProperty || action.parameter?.propertyName || '?'}`);
        }
        if (copyActions.length > 5) {
          console.log(`         ... y ${copyActions.length - 5} más`);
        }
      }
      
      results.workflows.wf2 = wf2;
    } catch (e) {
      results.errors.push('WF2 (3962960072) no encontrado o inaccesible');
    }

    // ============================================================
    // 5. VERIFICAR PROPIEDADES EN TICKET
    // ============================================================
    console.log('\n📝 5. Verificando propiedades en Ticket...');
    
    const ticketProps = await apiRequest('GET', '/crm/v3/properties/tickets?limit=200');
    
    const requiredTicketProps = [
      'nro_expediente',
      'codigo_de_garantia',
      'monto_total_de_la_deuda_acumulada',
      'deuda_alquiler',
      'deuda_expensas',
      'deuda_gas',
      'deuda_luz',
      'deuda_abl',
      'tipo_de_incumplimiento',
      'id_de_deuda',
      'fecha_desde_que_adeuda',
      'alias_cbu_impagos',
      'banco',
      'nombre_y_apellido_del_inquilino',
      'dni_inquilino'
    ];
    
    for (const prop of requiredTicketProps) {
      const found = ticketProps.results?.find(p => p.name === prop);
      if (found) {
        console.log(`   ✅ ${prop}: ${found.label}`);
        results.properties[prop] = found;
      } else {
        results.errors.push(`Propiedad Ticket faltante: ${prop}`);
      }
    }

    // ============================================================
    // 6. VERIFICAR PROPIEDADES EN DEAL
    // ============================================================
    console.log('\n💼 6. Verificando propiedades en Deal...');
    
    const dealProps = await apiRequest('GET', '/crm/v3/properties/deals?limit=200');
    
    const requiredDealProps = [
      'nro_expediente',
      'codigo_de_garantia__clonada_',
      'monto_total_de_la_deuda',
      'alquiler',
      'expensas',
      'gas',
      'luz',
      'abl',
      'tipo_de_incumplimiento',
      'id_de_deuda',
      'fecha_desde_que_adeuda',
      'alias',
      'banco',
      'nombre_y_apellido_del_inquilino',
      'dni_inquilino',
      'fecha_de_creacion_del_ticket'
    ];
    
    for (const prop of requiredDealProps) {
      const found = dealProps.results?.find(p => p.name === prop);
      if (found) {
        console.log(`   ✅ ${prop}: ${found.label}`);
        results.properties[prop] = found;
      } else {
        results.errors.push(`Propiedad Deal faltante: ${prop}`);
      }
    }

    // ============================================================
    // 7. TEST REAL (solo si no es dry-run)
    // ============================================================
    if (!TEST_DRY_RUN) {
      console.log('\n🎯 7. Ejecutando test real...');
      console.log('   ⚠️  Creando Ticket de prueba...');
      
      // Crear Ticket de prueba YA en etapa "Pago en proceso"
      const testTicketInput = {
        properties: {
          hs_pipeline: '3353793749',
          hs_pipeline_stage: '4596051185', // Pago en proceso - desde el inicio
          nro_expediente: 20260428, // Debe ser número
          codigo_de_garantia: 'GAR-TEST-001',
          // monto_total_de_la_deuda_acumulada es propiedad calculada - no incluir
          deuda_alquiler: 100000,
          deuda_expensas: 25000,
          deuda_gas: 10000,
          deuda_luz: 10000,
          deuda_abl: 5000,
          tipo_de_incumplimiento: 'Alquiler', // Debe ser opción válida (con mayúscula)
          id_de_deuda: 'INC-TEST-001',
          fecha_desde_que_adeuda: '2026-03-01',
          alias_cbu_impagos: 'test.alias.cbu',
          banco: 'BANCO DE GALICIA Y BUENOS AIRES S.A.',
          nombre_y_apellido_del_inquilino: 'Test Usuario Incumplimiento',
          dni_inquilino: 35000001
        }
      };
      
      const createdTicket = await apiRequest('POST', '/crm/v3/objects/tickets', testTicketInput);
      
      if (createdTicket.id) {
        results.testTicket = createdTicket;
        console.log(`   ✅ Ticket creado: ID ${createdTicket.id}`);
        
        // ============================================================
        // 8. AVANZAR TICKET A "PAGO EN PROCESO"
        // ============================================================
        console.log('   ⚠️  Avanzando Ticket a etapa "Pago en proceso"...');
        
        const updatedTicket = await apiRequest('PATCH', `/crm/v3/objects/tickets/${createdTicket.id}`, {
          properties: {
            hs_pipeline_stage: '4596051185'
          }
        });
        
        console.log(`   ✅ Ticket avanzado a etapa 4596051185`);
        
        // ============================================================
        // 9. VERIFICAR DEAL CREADO
        // ============================================================
        console.log('   ⏳ Esperando 10 segundos para que se ejecute WF4 (tiene delay de 2 min)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Buscar Deal asociado al Ticket usando la API de asociaciones
        const associationsReq = await apiRequest('GET', `/crm/v3/objects/tickets/${createdTicket.id}/associations/deals`);
        
        let deal = null;
        if (associationsReq.results?.length > 0) {
          const dealId = associationsReq.results[0].id;
          // Obtener datos del Deal
          const dealData = await apiRequest('GET', `/crm/v3/objects/deals/${dealId}?properties=nro_expediente,monto_total_de_la_deuda,alquiler,expensas,gas,luz,abl,tipo_de_incumplimiento,id_de_deuda`);
          deal = { id: dealId, properties: dealData.properties };
        }
        
        if (deal) {
          results.testDeal = deal;
          console.log(`   ✅ Deal creado: ID ${deal.id}`);
          
          // Verificar propiedades copiadas
          console.log('\n   📊 Propiedades copiadas al Deal:');
          console.log(`      alquiler: ${deal.properties.alquiler}`);
          console.log(`      expensas: ${deal.properties.expensas}`);
          console.log(`      gas: ${deal.properties.gas}`);
          console.log(`      luz: ${deal.properties.luz}`);
          console.log(`      abl: ${deal.properties.abl}`);
        } else {
          results.errors.push('Deal no creado automáticamente');
        }
        
        // ============================================================
        // 10. LIMPIEZA
        // ============================================================
        console.log('\n🧹 10. Limpiando datos de prueba...');
        
        if (results.testDeal) {
          await apiRequest('DELETE', `/crm/v3/objects/deals/${results.testDeal.id}`);
          console.log(`   ✅ Deal ${results.testDeal.id} eliminado`);
        }
        
        if (results.testTicket) {
          await apiRequest('DELETE', `/crm/v3/objects/tickets/${results.testTicket.id}`);
          console.log(`   ✅ Ticket ${results.testTicket.id} eliminado`);
        }
      } else {
        results.errors.push('No se pudo crear el Ticket de prueba');
      }
    }

  } catch (error) {
    results.errors.push(`Error general: ${error.message}`);
    console.error('\n❌ Error durante el test:', error.message);
  }

  // ============================================================
  // RESUMEN
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN DEL TEST');
  console.log('='.repeat(60));
  
  if (results.errors.length === 0) {
    console.log('✅ TODAS LAS VERIFICACIONES PASARON');
    console.log('\nEl proceso está operativo.');
  } else {
    console.log('❌ ERRORES ENCONTRADOS:');
    for (const err of results.errors) {
      console.log(`   - ${err}`);
    }
  }
  
  console.log('\n📋 Pipeline Tickets: ' + (results.pipelines.tickets ? '✅' : '❌'));
  console.log('📋 Pipeline Deals: ' + (results.pipelines.deals ? '✅' : '❌'));
  console.log('⚙️  WF4 (crea Deal): ' + (results.workflows.wf4 ? '✅' : '❌'));
  console.log('⚙️  WF2 (copia props): ' + (results.workflows.wf2 ? '✅' : '❌'));
  console.log('🎯 Test real: ' + (TEST_DRY_RUN ? 'DRY RUN' : 'EJECUTADO'));
  
  return results;
}

// Ejecutar
testIncumplimientosProcess()
  .then(results => {
    process.exit(results.errors.length > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });