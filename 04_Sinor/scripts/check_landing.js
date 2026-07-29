const https = require('https');
const TOKEN = process.env.HUBSPOT_TOKEN;

https.get({
  hostname: 'api.hubapi.com',
  path: '/cms/v3/pages/landing-pages/392770971849',
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}, res => {
  const c = [];
  res.on('data', d => c.push(d));
  res.on('end', () => {
    const p = JSON.parse(Buffer.concat(c).toString('utf8'));
    const raw = JSON.stringify(p.layoutSections);

    // Check key content presence
    console.log('Logo presente:', raw.includes('Logo%20Tag%20Line'));
    console.log('Banner presente:', raw.includes('Banner%201200'));
    console.log('SINOR en HTML:', raw.includes('SINOR'));
    console.log('form_id SINOR:', raw.includes('90322fde'));
    console.log('richTextContentHTML vacios:', (raw.match(/richTextContentHTML":"&nbsp;"/g) || []).length);
    console.log('richTextContentHTML con contenido:', (raw.match(/richTextContentHTML":"<div/g) || []).length);
    console.log('Total chars:', raw.length);

    // Print each widget name and first 100 chars of content
    const sections = p.layoutSections || {};
    function walk(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (obj.name && obj.params && obj.params.richTextContentHTML !== undefined) {
        const content = obj.params.richTextContentHTML;
        const preview = content.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,80);
        console.log('[' + obj.name + ']', preview || '(VACIO - &nbsp; o blank)');
      }
      for (const v of Object.values(obj)) {
        if (Array.isArray(v)) v.forEach(i => walk(i));
        else if (typeof v === 'object') walk(v);
      }
    }
    walk(sections);
  });
}).on('error', e => console.log(e.message));
