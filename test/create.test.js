const tap = require('tap');
const Services = require('../');

tap.test('create service with object', async (t) => {
  const services = new Services();
  const name = `dummy-app${Math.floor(Math.random() * 1001)}`;
  await services.create({
    Name: name,
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops:latest',
        Env: [
          'PORT=8080',
          'NODE_ENV=production'
        ],
        Labels: {
          test: 'true'
        },
        EndpointSpec: {
          Ports: {
            TargetPort: 8080
          }
        },
        Mode: {
          Replicated: {
            Replicas: 3
          }
        }
      }
    }
  });
  const service = await services.get(name);
  t.deepEqual(service.Spec, {
    Name: name,
    Labels: {},
    TaskTemplate: {
      ContainerSpec: {
        Image: 'firstandthird/ops:latest',
        Labels: {
          test: 'true'
        },
        Env: [
          'PORT=8080',
          'NODE_ENV=production'
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
  await services.remove(name);
  t.end();
});

tap.test('throw if takes too long', async (t) => {
  let error = false;
  const services = new Services();
  services.maxWaitTimes = 0;
  const name = `dummy-app${Math.floor(Math.random() * 1001)}`;
  try {
    await services.create({
      Name: name,
      TaskTemplate: {
        ContainerSpec: {
          Image: 'firstandthird/ops:latest',
          Env: [
            'PORT=8080',
            'NODE_ENV=production'
          ],
          Labels: {
            test: 'true'
          },
          EndpointSpec: {
            Ports: {
              TargetPort: 8080
            }
          },
          Mode: {
            Replicated: {
              Replicas: 3
            }
          }
        }
      }
    });
  } catch (e) {
    error = true;
    t.notEqual(e, null);
    await services.remove(name);
  }
  t.equals(error, true);
  t.end();
});


tap.test('throw if failed', async (t) => {
  let error = false;
  const services = new Services();
  const name = `dummy-app${Math.floor(Math.random() * 1001)}`;
  try {
    await services.create({
      Name: name,
      TaskTemplate: {
        ContainerSpec: {
          Image: 'alpine',
          Args: [
            'exit 1'
          ]
        }
      }
    });
  } catch (e) {
    error = true;
    t.notEqual(e, null);
    t.contains(e.message, 'returned status failed');
    await services.remove(name);
  }
  t.equals(error, true);
  t.end();
});

tap.test('throw if invalid image', async (t) => {
  let error = false;
  const services = new Services();
  const name = `dummy-app${Math.floor(Math.random() * 1001)}`;
  try {
    await services.create({
      Name: name,
      TaskTemplate: {
        ContainerSpec: {
          Image: 'alpineasdfasdf'
        }
      }
    });
  } catch (e) {
    error = true;
    t.notEqual(e, null);
    t.contains(e.message, 'returned status rejected');
    await services.remove(name);
  }
  t.equals(error, true);
  t.end();
});

