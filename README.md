# Privasee Smart Contract

This is a proof of concept for a smart contract that can verify a number of interactions prior to a data exchange between individuals (data holders) and companies (data requesters).

## Initial Setup

There is a number of dependencies that you will need to install on your computer in order to run the smart contract tests.

First of all, you will need to make sure to have Node >= 6 and npm >= 5.2 on your machine.
You can download the latest version of node from https://nodejs.org/en/download/ and if you need
to update your version of npm you can do so by running the following command:

`$ sudo npm install npm@latest -g`

Additionally, you can check your version of Node by running the following command on your terminal:
`$ node -v`
and the version of npm with
`$ npm -v`

Once you have both Node and npm on your computer you will need to install ganache-cli and truffle
in order to run smart contract tests. You can install ganache with the following command:
`$ npm install -g ganache-cli`
and Truffle with
`$ npm install -g truffle`

## Deployed Contract Address

The current address to which the different contracts are deployed can be found in the root directory at *constants.js*

## Testing Smart Contract

In order to run the smart contract tests, you will need to open a new terminal window and run the
following command:
`$ ganache-cli -m ’festival adjust rotate siren actress write kingdom immune team rate cover guilt’`

This will initialise a test network and obtain an array of private keys that you will use in the tests.
Finally, and without closing the terminal window with the ganache client, you can test the contract by
running this command:
`$ truffle test`
