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

  if (!obj.serviceName) {
    throw new Error('serviceName required');
  }

  const service = await client.getService(obj.fromService || obj.serviceName);

  const serviceDetails = await service.inspect();

  const newSpec = {
    version: serviceDetails.Version.Index,
    TaskTemplate: {
      ForceUpdate: 1
    }
  }
  if (obj.labels) {
    newSpec.Labels = obj.labels
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

  const res = await service.update(obj.auth, newService);

  return res;

}

