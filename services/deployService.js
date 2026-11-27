const sleep = require('../utils/sleep');

async function deploy({ name, env }) {
  await sleep(1500);
  const host = env === 'production' ? name : `${name}-${env}`;
  return { url: `https://${host}.example.com` };
}

module.exports = { deploy };