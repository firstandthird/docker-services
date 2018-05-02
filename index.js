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
    this.waitDelay = 500;
    this.monitorFor = options.monitorFor || 3000;
    this.monitorCount = Math.floor(this.monitorFor / this.waitDelay);
    const waitTime = 1000 * 60; //1 min
    this.maxWaitTimes = Math.floor(waitTime / this.waitDelay);
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
    const service = await this.dockerClient.createService(this.auth, spec);
    if (!detach) {
      await this.waitUntilRunning(spec.Name, true);
    }
    return { service, spec };
  }

  async update(spec, detach = false) {
    const name = spec.Name;
    const [existingTasks, originalSpec] = await Promise.all([
      this.getTasks(name),
      this.get(name)
    ]);

    const service = await this.dockerClient.getService(name);

    spec.version = originalSpec.Version.Index;
    await service.update(spec);

    if (!detach) {
      await this.waitUntilRunning(name, true);
    }
    return { service, spec };
  }

  async adjust(name, options) {
    const [existingTasks, serviceSpec] = await Promise.all([
      this.getTasks(name),
      this.get(name)
    ]);
    const existing = existingTasks.map(t => t.ID);
    const spec = serviceSpec.Spec;
    spec.version = serviceSpec.Version.Index;
    const newSpec = this.adjustSpec(spec, options);

    const service = await this.dockerClient.getService(name);
    await service.update(this.auth, newSpec);
    await this.waitUntilRunning(name, existing);
    return { service, spec: newSpec };
  }

  adjustSpec(spec, options) {
    const validate = Joi.validate(options, {
      image: Joi.string().optional(),
      env: Joi.object(),
      envRemove: Joi.array(),
      labels: Joi.object(),
      labelRemove: Joi.array(),
      replicas: Joi.number(),
      force: Joi.boolean()
    });
    if (validate.error) {
      throw validate.error;
    }

    if (options.image) {
      spec.TaskTemplate.ContainerSpec.Image = options.image;
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

    if (options.replicas) {
      spec.Mode = spec.Mode || {};
      spec.Mode.Replicated = spec.Mode.Replicated || {};
      spec.Mode.Replicated.Replicas = options.replicas;
    }

    if (options.force) {
      const updateCount = spec.TaskTemplate.ForceUpdate || 0;
      spec.TaskTemplate.ForceUpdate = updateCount + 1;
      spec.TaskTemplate.ContainerSpec.Image = spec.TaskTemplate.ContainerSpec.Image.split('@')[0];
    }
    return spec;
  }

  scale(name, replicas) {
     return this.adjust(name, { replicas });
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

  async waitUntilRunning(name, monitor = false) {
    const self = this;
    const existingTasks = await this.getTasks(name);
    const existing = existingTasks.filter(tsk => tsk.Status.State !== 'pending').map(tsk => tsk.ID);
    let taskRunning = false;
    let times = 0;
    let monitoring = monitor;
    let monitorCount = 0;
    const checkTasks = async function() {
      const tasks = await self.getTasks(name);
      let foundTasks = false;
      tasks.forEach(tsk => {
        if (!existing.includes(tsk.ID)) {
          foundTasks = true;
          if (tsk.Status.State === 'failed' || tsk.Status.State === 'rejected') {
            const errMessage = tsk.Status.Err || null;
            throw new Error(`${tsk.ID} returned status ${tsk.Status.State} with ${errMessage}`);
          }
          if (tsk.Status.State === 'running') {
            taskRunning = true;
          }
        }
      });
      if (!foundTasks) {
        // fallback for edge case
        return;
      }
      times++;
      if (times > self.maxWaitTimes) {
        throw new Error('service timed out');
      }

      if (taskRunning && !monitoring) {
        return;
      }

      if (taskRunning && monitoring) {
        monitorCount++;
        if (monitorCount >= self.monitorCount) {
          monitoring = false;
        }
      }

      await wait(self.waitDelay);
      return checkTasks();
    }
    await wait(this.waitDelay);
    return checkTasks();
  }
}

module.exports = DockerServices;
