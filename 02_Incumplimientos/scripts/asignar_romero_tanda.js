const fs = require('fs');
const TOKEN = fs.readFileSync('C:\\Users\\Usuario\\OneDrive\\Desktop\\HubSpot\\.env','utf8').match(/HUBSPOT_TOKEN=(.+)/)[1].trim();
const API = 'https://api.hubapi.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const registros = [
  {dni:'40141902',exp:'13193'},{dni:'35805315',exp:'12158'},
  {dni:'28266182',exp:'10439'},{dni:'95599558',exp:'13214'},
  {dni:'33910999',exp:'13244'},{dni:'42852067',exp:'9575'},
  {dni:'95906809',exp:'13250'},{dni:'20226754',exp:'11352'}
];

async function main() {
  let ok=0,nf=0;
  for(const {dni,exp} of registros) {
    const r = await fetch(API+'/crm/v3/objects/tickets/search',{method:'POST',headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'},body:JSON.stringify({filterGroups:[{filters:[{propertyName:'dni_inquilino',operator:'EQ',value:dni},{propertyName:'hs_pipeline',operator:'EQ',value:'3353793749'}]}],properties:['subject'],sorts:[{propertyName:'hs_object_id',direction:'ASCENDING'}],limit:1})});
    const t = (await r.json()).results?.[0];
    if(!t){console.log('❌ DNI '+dni+' — no encontrado');nf++;}
    else{
      await fetch(API+'/crm/v3/objects/tickets/'+t.id,{method:'PATCH',headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'},body:JSON.stringify({properties:{nro_expediente:exp,hubspot_owner_id:'29822627',hs_pipeline_stage:'4596051184'}})});
      console.log('✅ DNI '+dni+' — Exp '+exp+' — '+t.properties.subject);ok++;
    }
    await sleep(120);
  }
  console.log('\n'+ok+' OK | '+nf+' no encontrados');
}
main().catch(console.error);
