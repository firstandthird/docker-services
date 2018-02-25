const tap = require('tap');
const Services = require('../');

tap.test('adjust service', async (t) => {
  const services = new Services();
  const name = `dummy-app${Math.floor(Math.random() * 1001)}`;
  await services.create({
    Name: name,
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops',
        Env: [
          'PORT=8080',
          'OLDENV=1'
        ],
        Labels: {
          'existing.label': '1',
          'old.label': '1'
        }
      }
    },
    Mode: {
      Replicated: {
        Replicas: 1
      }
    }
  });
  await services.adjust(name, {
    image: 'firstandthird/ops:0.7.0',
    env: {
      PORT: 8081,
      NEWENV: '2'
    },
    envRemove: [
      'OLDENV'
    ],
    labels: {
      'existing.label': '3',
      'new.label': '2'
    },
    labelRemove: [
      'old.label'
    ]
  });
  const service = await services.get(name);
  await services.remove(name);
  t.deepEquals(service.Spec, {
    Name: name,
    Labels: {},
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops',
        Env: [
          'PORT=8081',
          'NEWENV=2'
        ],
        Labels: {
          'existing.label': '3',
          'new.label': '2'
        }
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

tap.test('adjust service if no env or labels', async (t) => {
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
  await services.adjust(name, {
    image: 'firstandthird/ops:0.7.0',
    env: {
      PORT: 8081
    },
    labels: {
      'new.label': '2'
    },
  });
  const service = await services.get(name);
  await services.remove(name);
  t.deepEquals(service.Spec, {
    Name: name,
    Labels: {},
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops',
        Env: [
          'PORT=8081'
        ],
        Labels: {
          'new.label': '2'
        }
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
