const tap = require('tap');
const Services = require('../');

tap.test('get service', async (t) => {
  const services = new Services();
  const name = `dummy-app${Math.floor(Math.random() * 1001)}`;
  await services.create({
    Name: name,
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops'
      }
    }
  });
  const ops = await services.get(name);
  t.equals(typeof ops, 'object');
  await services.remove(name);
  t.end();
});

tap.test('throw if service doesnt exist', async (t) => {
  const services = new Services();
  try {
    await services.get('wops');
  } catch (e) {
    t.notEquals(e, null);
    t.end();
  }
});
