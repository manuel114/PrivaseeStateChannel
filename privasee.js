// Gets an instance of the contract from the blockchain to interact with fron-end
import web3 from "./web3";
const PrivaseeAC = require("./build/contracts/PrivaseeAC.json");
const PrivaseeChannelManager = require("./build/contracts/PrivaseeChannelManager.json");

import { PCM_ADDRESS } from "./constants";
var contract = require("truffle-contract");

var privaseeInstance = contract({
  abi: PrivaseeChannelManager.abi,
  unlinked_binary: PrivaseeChannelManager.bytecode,
  address: PCM_ADDRESS // optional
  // many more
});
privaseeInstance.setProvider(web3.currentProvider);

export default privaseeInstance;
