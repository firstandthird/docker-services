const Joi = require('joi');
const Docker = require('dockerode');
const auth = require('./lib/auth');
const util = require('util');
const wait = util.promisify(setTimeout);
const utils = require('./lib/utils');
const aug = require('aug');

class DockerServices {
  constructor(options = {}) {
    this.dockerClient = options.dockerClient || new Docker();
    this.auth = options.auth || auth();
  }

  async get(name) {
    const service = await this.dockerClient.getService(name);
    return service.inspect();
  }

  async exists(name) {
    try {
      await this.get(name);
      return true;
    } catch (e) {
      return false;
    }
  }

  async create(spec, detach = false) {
    await this.dockerClient.createService(this.auth, spec);
    if (!detach) {
      await this.waitUntilRunning(spec.Name, []);
    }
  }

  async update(spec) {
    const name = spec.Name;
    const [existingTasks, originalSpec] = await Promise.all([
      this.getTasks(name),
      this.get(name)
    ]);
    const existing = existingTasks.map(t => t.ID);
    const service = await this.dockerClient.getService(name);
    spec.version = originalSpec.Version.Index;
    await service.update(spec);
    return this.waitUntilRunning(name, existing);
  }

  async adjust(name, options) {
    const validate = Joi.validate(options, {
      image: Joi.string().optional(),
      env: Joi.object(),
      envRemove: Joi.array(),
      labels: Joi.object(),
      labelRemove: Joi.array(),
      force: Joi.boolean()
    });
    if (validate.error) {
      throw validate.error;
    }
    const [existingTasks, serviceSpec] = await Promise.all([
      this.getTasks(name),
      this.get(name)
    ]);
    const existing = existingTasks.map(t => t.ID);
    const spec = serviceSpec.Spec;
    spec.version = serviceSpec.Version.Index;

    if (options.image) {
      spec.TaskTemplate.Image = options.image;
    }

    if (options.env || options.envRemove) {
      const env = utils.arrToObj(spec.TaskTemplate.ContainerSpec.Env || []);
      const merged = aug(env, options.env);
      if (options.envRemove) {
        options.envRemove.forEach((e) => delete merged[e]);
      }
      spec.TaskTemplate.ContainerSpec.Env = utils.objToArr(merged);
    }

    if (options.labels || options.labelRemove) {
      const merged = aug(spec.TaskTemplate.ContainerSpec.Labels, options.labels || {});
      if (options.labelRemove) {
        options.labelRemove.forEach((l) => delete merged[l]);
      }
      spec.TaskTemplate.ContainerSpec.Labels = merged;
    }

    if (options.force) {
      const updateCount = serviceSpec.Spec.TaskTemplate.ForceUpdate || 0;
      spec.TaskTemplate.ForceUpdate = updateCount + 1;
    }

    const service = await this.dockerClient.getService(name);
    await service.update(this.auth, spec);
    return this.waitUntilRunning(name, existing);
  }

  async remove(name) {
    const service = await this.dockerClient.getService(name);
    return service.remove();
  }

  getTasks(name) {
    const opts = {
      filters: `{"service": [ "${name}" ] }`
    };
    return this.dockerClient.listTasks(opts);
  }

  async waitUntilRunning(name, existing) {
    const tasks = await this.getTasks(name);
    let finished = true;
    tasks.forEach(tsk => {
      if (!existing.includes(tsk.ID)) {
        if (tsk.Status.State === 'failed' || tsk.Status.State === 'rejected') {
          throw new Error(`${tsk.ID} returned status ${tsk.Status.State}`);
        }
        if (tsk.Status.State !== 'running') {
          finished = false;
        }
      }
    });

    if (finished) {
      return;
    }

    await wait(200);
    return this.waitUntilRunning(name, existing);
  }
}

module.exports = DockerServices;
