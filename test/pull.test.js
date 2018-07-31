const tap = require('tap');
const Services = require('../');

tap.test('get service', async (t) => {
  const services = new Services();
  await services.pull('hello-world');
  t.ok(true);
  t.end();
});
