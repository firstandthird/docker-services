const tap = require('tap');
const Services = require('../');

tap.test('exists', async (t) => {
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
  const exists = await services.exists(name);
  t.equals(exists, true);
  await services.remove(name);
  t.end();
});

tap.test('doesnt exist', async (t) => {
  const services = new Services();
  const exists = await services.exists('nope');
  t.equals(exists, false);
  t.end();
});
