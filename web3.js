import Web3 from "web3";

let web3;

if (typeof window !== "undefined" && window.ethereum !== "undefined") {
  window.web3 = new Web3(ethereum);
  try {
    // Request account access if needed
    await ethereum.enable();
  } catch (error) {
    // User denied account access...
  }
}
// if we are in the browser and metamsk is running
else if (typeof window !== "undefined" && typeof window.web3 !== "undefined") {
  web3 = new Web3(global.window.web3.currentProvider);
} else {
  // we are in the server or the user is not running metamsk
  const provider = new Web3.providers.HttpProvider(
    "https://rinkeby.infura.io/v3/518a86cbe70446c1bf0e3c25d21de9b8"
  );

  web3 = new Web3(provider);
}

export default web3;
