const tap = require('tap');
const Services = require('../');

tap.test('adjust service', async (t) => {
  const services = new Services();
  const name = `dummy-app${Math.floor(Math.random() * 1001)}`;
  const spec = {
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
      },
      ForceUpdate: 1
    },
    Mode: {
      Replicated: {
        Replicas: 1
      }
    }
  };
  const newSpec = services.adjustSpec(spec, {
    image: 'firstandthird/ops:0.7.0',
    env: {
      PORT: 8081,
      NEWENV: '2'
    },
    force: true,
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
  t.deepEquals(newSpec, {
    Name: name,
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops:0.7.0',
        Env: [
          'PORT=8081',
          'NEWENV=2'
        ],
        Labels: {
          'existing.label': '3',
          'new.label': '2'
        }
      },
      ForceUpdate: 2,
    },
    Mode: {
      Replicated: {
        Replicas: 1
      }
    }
  });
  t.end();
});
