const tap = require('tap');
const Services = require('../');

tap.test('getTasks', async (t) => {
  const services = new Services();
  const name = `dummy-app${Math.floor(Math.random() * 1001)}`;
  await services.create({
    Name: name,
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops',
      },
    },
    Mode: {
      Replicated: {
        Replicas: 3
      }
    }
  });
  const tasks = await services.getTasks(name);
  await services.remove(name);
  t.equals(tasks.length, 3);
  t.end();
});

