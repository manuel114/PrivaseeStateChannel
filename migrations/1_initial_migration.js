const path = require("path");
const fs = require("fs-extra");

var Migrations = artifacts.require("./Migrations.sol");
var PrivaseeAC = artifacts.require("./PrivaseeAC");
var PrivaseeChannelManager = artifacts.require("./PrivaseeChannelManager");

let PAC_ADDRESS;
let PCM_ADDRESS;

module.exports = function(deployer) {
  deployer.deploy(PrivaseeAC).then(() => {
    PAC_ADDRESS = PrivaseeAC.address;
    return deployer
      .deploy(PrivaseeChannelManager, PrivaseeAC.address)
      .then(() => {
        let constants = `
        const PAC_ADDRESS = "${PrivaseeAC.address}";
        const PCM_ADDRESS = "${PrivaseeChannelManager.address}";

        export { PAC_ADDRESS, PCM_ADDRESS }
        `;

        const buildPath = path.resolve(__dirname, "constants.js");
        fs.removeSync(buildPath);
        fs.writeFile("constants.js", constants, err => {
          if (err) throw err;
        });
      });
  });
};
