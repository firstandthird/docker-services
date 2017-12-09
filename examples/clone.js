const serviceUpdate = require('../');
const fromService = process.argv[2];
const serviceName = process.argv[3];

const main = async function() {

  try {
    const out = await serviceUpdate({
      fromService,
      serviceName,
      environment: {
        UPDATE: new Date().getTime(),
        clonedFrom: fromService
      },
      labels:{
        'service-update': new Date().getTime().toString(),
        clonedFrom: fromService
      }
    });
    console.log(out);
  } catch (e) {
    console.error(e);
  }
}
main();
