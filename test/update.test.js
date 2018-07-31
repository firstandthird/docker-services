const tap = require('tap');
const Services = require('../');
//tap.runOnly = true;

tap.test('update service', async (t) => {
  const services = new Services();
  const name = `dummy-app${Math.floor(Math.random() * 1001)}`;
  const result = await services.create({
    Name: name,
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops'
      }
    },
    Mode: {
      Replicated: {
        Replicas: 3
      }
    }
  });
  await services.update({
    Name: name,
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops',
        Env: [
          'PORT=8080'
        ]
      }
    }
  });
  const service = await services.get(name);
  await services.remove(name);
  t.equals(typeof result.service, 'object');
  t.equals(typeof result.spec, 'object');
  t.deepEquals(service.Spec, {
    Name: name,
    Labels: {},
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops',
        Isolation: 'default',
        Env: [
          'PORT=8080'
        ]
      },
      ForceUpdate: 0,
      Runtime: 'container'
    },
    Mode: {
      Replicated: {
        Replicas: 1
      }
    }
  });
  t.end();
});

tap.test('update to invalid image', async (t) => {
  let err = false;
  const services = new Services();
  const name = `dummy-app${Math.floor(Math.random() * 1001)}`;
  await services.create({
    Name: name,
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops'
      }
    },
    Mode: {
      Replicated: {
        Replicas: 3
      }
    }
  });
  try {
    await services.update({
      Name: name,
      TaskTemplate: {
        ContainerSpec: {
          Image: 'firstandthird/ops2',
          Env: [
            'PORT=8080'
          ]
        }
      }
    });
  } catch (e) {
    err = true;
    t.notEquals(e, null);
  } finally {
    await services.remove(name);
    t.equals(err, true);
    t.end();
  }
});
