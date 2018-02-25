const tap = require('tap');
const Services = require('../');

tap.test('remove service', async (t) => {
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
  await services.remove(name);
  try {
    await services.get(name);
  } catch (e) {
    t.notEqual(e, null);
    t.end();
  }
});

