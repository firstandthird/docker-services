const tap = require('tap');
const Services = require('../');
const Docker = require('dockerode');

tap.test('can create new', (t) => {
  new Services();
  t.end();
});

tap.test('default to creating new docker instance', (t) => {
  const services = new Services();
  t.equals(typeof services.dockerClient, 'object');
  t.end();
});

tap.test('can pass in docker instance', (t) => {
  const d = new Docker();
  const services = new Services({ dockerClient: d });
  t.equal(services.dockerClient, d);
  t.end();
});

tap.test('sets auth automatically', (t) => {
  const services = new Services();
  t.equal(typeof services.auth, 'object');
  t.end();
});

tap.test('can pass in auth', (t) => {
  const services = new Services({ auth: { test: 1 } });
  t.deepEqual(services.auth, { test: 1 });
  t.end();
});
