const serviceUpdate = require('../');
const serviceName = process.argv[2];
const scale = parseInt(process.argv[3]);

const main = async function() {

  const out = await serviceUpdate({
    serviceName,
    scale,
    detach: true
  });
  console.log(out);
}
main();
