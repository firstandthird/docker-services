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

  let res;
  if (update) {
    res = await service.update(obj.auth, newService);
  } else {
    delete newService.version;
    newService.Name = obj.serviceName;
    res = await client.createService(obj.auth, newService);
  }

  return { serviceSpec: newService, response: res };

}

