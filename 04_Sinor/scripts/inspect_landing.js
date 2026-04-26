const https = require('https');
const TOKEN = 'pat-eu1-87f3fc69-9f28-409b-9046-db09ef4e6d31';

https.get({
  hostname: 'api.hubapi.com',
  path: '/cms/v3/pages/landing-pages/389482693821',
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}, res => {
  const c = [];
  res.on('data', d => c.push(d));
  res.on('end', () => {
    const p = JSON.parse(Buffer.concat(c).toString('utf8'));
    console.log('Name:', p.name);
    console.log('Slug:', p.slug);
    console.log('htmlTitle:', p.htmlTitle);
    console.log('metaDescription:', p.metaDescription);

    const raw = JSON.stringify(p.layoutSections);

    // form_id
    const formRe = /"form_id":"([^"]+)"/g;
    let fm;
    while ((fm = formRe.exec(raw)) !== null) console.log('form_id:', fm[1]);

    // image src
    const imgRe = /"src":"(https?[^"]+)"/g;
    let im;
    while ((im = imgRe.exec(raw)) !== null) console.log('img:', im[1]);

    // richTextContentHTML - extract key text
    const rtRe = /"richTextContentHTML":"((?:[^"\\]|\\.)*)"/g;
    let rm; let i = 0;
    while ((rm = rtRe.exec(raw)) !== null) {
      const decoded = rm[1].replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\\/g,'\\');
      const text = decoded.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0, 400);
      if (text.length > 5) console.log('richText[' + i + ']:', text);
      i++;
    }

    // redirect_url
    const redRe = /"redirect_url":"([^"]+)"/g;
    let rr;
    while ((rr = redRe.exec(raw)) !== null) console.log('redirect_url:', rr[1]);
  });
}).on('error', e => console.log(e.message));
