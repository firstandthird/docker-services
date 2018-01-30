const Docker = require('dockerode');
const aug = require('aug');

const arrToObj = function(arr) {
  const obj = {};
  arr.forEach(kvp => {
    const kvArr = kvp.split('=');
    const kvar = kvArr.shift();
    obj[kvar] = kvArr.join('=');
  });

  return obj;
}

const objToArr = function(obj) {
  const arr = [];
  Object.keys(obj).forEach(key => {
    const str = `${key}=${obj[key]}`;
    arr.push(str);
  });

  return arr;
}

module.exports = async function(obj) {

  const client = obj.docker || new Docker();

  const serviceCache = { exists: [], new: [] };

  if (!obj.serviceName) {
    throw new Error('serviceName required');
  }

  const listTasks = async function(serviceName) {
    const opts = {
      filters: `{"service": [ "${serviceName}" ] }`
    }
    const tasks = await client.listTasks(opts);

    return tasks.reduce((result, task) => {
      result.push(task.ID)
      return result;
    }, []);
  }

  const queryTasks = function(serviceName) {
    const doQuery = async function(nm, resolution) {
      const opts = {
        filters: `{"service": [ "${nm}" ] }`
      }

      const tasks = await client.listTasks(opts);
      let finished = true;
      tasks.forEach(tsk => {
        if (!serviceCache.exists.includes(tsk.ID)) {
          if (tsk.Status.State === 'failed' || tsk.Status.State === 'rejected') {
            throw new Error(`${tsk.ID} returned status ${tsk.Status.State}`);
          }
          if (tsk.Status.State !== 'running') {
            finished = false;
          }
        }
      });

      if (finished) {
        resolution('Tasks Complete');
        return;
      }

      setTimeout(() => {
        doQuery(nm, resolution);
      }, 500);
    };

    return new Promise(async (resolve) => {
      setTimeout(() => {
        doQuery(serviceName, resolve);
      }, 500);
    });
  }

  const now = new Date();
  console.log(`Starting [${now}]`);
  const tag = Math.random().toString(36).substring(7);

  const service = await client.getService(obj.serviceName);

  //see if the main service already exists, if it doesn't, check the fromService to clone from another service
  let update = true;
  let serviceDetails;
  try {
    serviceDetails = await service.inspect();
  } catch (e) {
    //service doesn't exist, see if fromService set to clone from that task
    if (!obj.fromService) {
      throw e;
    }
    update = false;
    const cloneService = await client.getService(obj.fromService);
    serviceDetails = await cloneService.inspect();
  }

  const newSpec = {
    version: serviceDetails.Version.Index,
    TaskTemplate: {
      ContainerSpec: {},
      ForceUpdate: 1
    }
  }

  if (obj.image) {
    newSpec.TaskTemplate.ContainerSpec.Image = obj.image;
  }

  if (obj.labels) {
    newSpec.Labels = obj.labels;
  }
  
  if (obj.scale) {
    newSpec.Mode = {
      Replicated: {
        Replicas: obj.scale
      }
    }
  }

  if (obj.scaleOffset) {
    newSpec.Mode = {
      Replicated: {
        Replicas: serviceDetails.Spec.Mode.Replicated.Replicas += obj.scaleOffset
      }
    }
  }

  const newService = aug(serviceDetails.Spec, newSpec);
    
  let specEnv = {};
  if (newService.TaskTemplate.ContainerSpec.Env) {
    specEnv = arrToObj(newService.TaskTemplate.ContainerSpec.Env);
  }

  if (obj.environment) {
    specEnv = aug(specEnv, obj.environment);
  }

  newService.TaskTemplate.ContainerSpec.Env = objToArr(specEnv);

  // Detach -- start
  if (obj.detach && update) {
    serviceCache.exists  = await listTasks(obj.serviceName);
    // Check if we are scaling down.
    if (newSpec.Mode && newSpec.Mode.Replicated && newSpec.Mode.Replicated.Replicas) {
      const newScale = newSpec.Mode.Replicated.Replicas;
      let oldScale = 0;
      if (serviceDetails.Spec.Mode.Replicated && serviceDetails.Spec.Mode.Replicated.Replicas) {
        oldScale = serviceDetails.Spec.Mode.Replicated.Replicas;
      }

      if (newScale < oldScale) {
        // Need to track tasks as they shutdown.
        delete obj.detach;
      }
    }
  }

  let res;
  if (update) {
    res = await service.update(obj.auth, newService);
  } else {
    delete newService.version;
    newService.Name = obj.serviceName;
    res = await client.createService(obj.auth, newService);
  }

  if (obj.detach) {
    result = await queryTasks(obj.serviceName);
  }

  return { serviceSpec: newService, response: res };
}

