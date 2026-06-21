require('dotenv').config({ path: '../.env' });

const TOKEN = process.env.HUBSPOT_TOKEN;
const DEAL_ID = '505650924749';

async function main() {
  const res = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${DEAL_ID}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  if (res.status === 204) {
    console.log(`✅ Deal ${DEAL_ID} eliminado`);
  } else {
    const data = await res.json();
    console.error('❌ Error:', JSON.stringify(data, null, 2));
  }
}

main().catch(e => console.error(e.message));
