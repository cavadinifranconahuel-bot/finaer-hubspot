const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = 'pat-eu1-1b0bbdd8-54c7-4a36-9201-037d5f401dc8';

function api(method, flowPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const headers = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = data.length;
    const req = https.request({ hostname: 'api.hubapi.com', path: flowPath, method, headers }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => {
        const text = Buffer.concat(c).toString('utf8');
        try { resolve({ status: res.statusCode, body: JSON.parse(text) }); } catch(e) { resolve({ status: res.statusCode, body: { _raw: text } }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function fixFlow(file, oldBlock, newBlock) {
  const flow = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  const action = flow.actions[0];

  if (!action.sourceCode.includes(oldBlock)) {
    console.log(`❌ ${flow.name} (${flow.id}): no se encontró el bloque a reemplazar`);
    return;
  }

  const newSourceCode = action.sourceCode.replace(oldBlock, newBlock);

  flow.actions[0] = { ...action, sourceCode: newSourceCode };

  const res = await api('PUT', `/automation/v4/flows/${flow.id}`, flow);

  if (res.status >= 200 && res.status < 300) {
    console.log(`✅ ${flow.name} (${flow.id}): actualizado`);
  } else {
    console.log(`❌ ${flow.name} (${flow.id}): error [status ${res.status}]`, JSON.stringify(res.body, null, 2));
  }
}

async function main() {
  // WF Deal — 4172304610
  await fixFlow('wf_punitorios_current.json',
`    const punitorioAlquiler  = Math.round(alquiler * 0.005 * daysDiff * 100) / 100;
    const punitorioServicios = Math.round((expensas + gas + luz + abl + aysa) * 0.001 * daysDiff * 100) / 100;
    const totalPunitorios    = Math.round((punitorioAlquiler + punitorioServicios) * 100) / 100;`,
`    const punitorioAlquiler  = Math.ceil(alquiler * 0.005 * daysDiff);
    const punitorioServicios = Math.ceil((expensas + gas + luz + abl + aysa) * 0.001 * daysDiff);
    const totalPunitorios    = punitorioAlquiler + punitorioServicios;`
  );

  // WF Ticket — 4231647440
  await fixFlow('wf_punitorios_ticket_current.json',
`    const punitorioAlquiler  = Math.round(alquiler * 0.005 * daysDiff * 100) / 100;
    const punitorioServicios = Math.round((expensas + gas + luz + abl + aysa + llaves) * 0.001 * daysDiff * 100) / 100;
    const totalPunitorios    = Math.round((punitorioAlquiler + punitorioServicios) * 100) / 100;`,
`    const punitorioAlquiler  = Math.ceil(alquiler * 0.005 * daysDiff);
    const punitorioServicios = Math.ceil((expensas + gas + luz + abl + aysa + llaves) * 0.001 * daysDiff);
    const totalPunitorios    = punitorioAlquiler + punitorioServicios;`
  );
}

main().catch(e => console.error('Error:', e.message));
