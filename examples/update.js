const serviceUpdate = require('../');
const serviceName = process.argv[2];

const main = async function() {

  const out = await serviceUpdate({
    serviceName,
    environment: {
      UPDATE: new Date().getTime()
    },
    labels:{
      'service-update': new Date().getTime().toString()
    }
  });
  console.log(out);
}
main();
