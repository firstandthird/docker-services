const serviceUpdate = require('../');
const serviceName = process.argv[2];

const main = async function() {

  const out = await serviceUpdate({
    serviceName,
    environment: {
      UPDATE: new Date().getTime()
    },
    labels:{
      'blergh': 'blagh',
      'service-update': new Date().getTime().toString()
    },
    detach: true
  });
  console.log('DONE!');
  // console.log('OUT! ', out);
}
main();
