const https = require('https');
const TOKEN = 'pat-eu1-87f3fc69-9f28-409b-9046-db09ef4e6d31';

https.get({
  hostname: 'api.hubapi.com',
  path: '/cms/v3/pages/landing-pages/392770971849',
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}, res => {
  const c = [];
  res.on('data', d => c.push(d));
  res.on('end', () => {
    const p = JSON.parse(Buffer.concat(c).toString('utf8'));

    function walk(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (obj.name && obj.params && obj.params.richTextContentHTML !== undefined) {
        const raw = obj.params.richTextContentHTML;
        console.log('\n[' + obj.name + '] (' + raw.length + ' chars):');
        console.log(raw.slice(0, 200));
      }
      if (obj.name && obj.params && obj.params.form) {
        console.log('\n[FORM WIDGET ' + obj.name + '] form_id:', obj.params.form.form_id);
      }
      for (const v of Object.values(obj)) {
        if (Array.isArray(v)) v.forEach(i => walk(i));
        else if (typeof v === 'object') walk(v);
      }
    }
    walk(p.layoutSections);
  });
}).on('error', e => console.log(e.message));
