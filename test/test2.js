/*
 * Test for full functionality of smart contract
 * In order to run, the following command must be run:
 * $ ganache-cli -m 'festival adjust rotate siren actress write kingdom immune team rate cover guilt'
 */

/* eslint-disable */
const PrivaseeChannelManager = artifacts.require("PrivaseeChannelManager");
const StateChannel = artifacts.require("StateChannel");

/*
 * Full use case resembling an average dispute faced by our users
 */
contract("Full Use Case", accounts => {
  let manager;
  let stateChannel;
  let hashToSign;

  it("case works", async () => {
    manager = await PrivaseeChannelManager.deployed();
    hashToSign = web3.utils.soliditySha3("createChannel");

    // Two parties open a state channel with PrivaseeChannelManager’s
    await manager.createStateChannel(
      web3.eth.accounts.sign(
        hashToSign,
        "0x258f0f5ab66f80fd9b0ea732e3a70970b3ec3244c4538db4fdb536fbf973798a"
      ).signature,
      web3.eth.accounts.sign(
        hashToSign,
        "0x7117dc599883649f6588a36b9774df5a018dbaa694169f74ae941239a5a527d9"
      ).signature,
      accounts[0],
      accounts[1],
      300000, // 5 mins
      { from: accounts[0] }
    );

    const key = await manager.getChannelKey.call(accounts[0], accounts[1]);
    const address = await manager.channelMapping.call(key);
    stateChannel = await StateChannel.at(address);

    // There has been misunderstanding in which the user has received a request and is trying to propose a
    // new set of conditions but the company is not acknowledging this, and is saying the user has accepted their conditions.

    // The user starts by setting the state of the state channel to the last point in which they
    // were both in agreement
    const hashOfNewState = web3.utils.soliditySha3(
      "name, location, credit card",
      "We require this data to send you a car and will only keep it for up to one day after you have completed your booked travel",
      "No data will be kept or processed after 24h from the end of the trip",
      true,
      false,
      accounts[1]
    );

    try {
      await stateChannel.setState(
        hashOfNewState,
        web3.eth.accounts.sign(
          hashOfNewState,
          "0x258f0f5ab66f80fd9b0ea732e3a70970b3ec3244c4538db4fdb536fbf973798a"
        ).signature,
        web3.eth.accounts.sign(
          hashOfNewState,
          "0x7117dc599883649f6588a36b9774df5a018dbaa694169f74ae941239a5a527d9"
        ).signature,
        1,
        { from: accounts[1] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    // Then the user sets a dispute with triggerDispute
    await stateChannel.triggerDispute();

    // The user asserts the state resulting from his change of conditions
    try {
      await stateChannel.assertState(
        web3.utils.fromUtf8(""),
        web3.utils.soliditySha3(
          "name, location, credit card",
          "We require this data to send you a car and will only keep it for up to one day after you have completed your booked travel",
          "No data will be kept or processed after 24h from the end of the trip, No data will be sold or sent to third parties during this period",
          false,
          true,
          accounts[0]
        ),
        "No data will be kept or processed after 24h from the end of the trip, No data will be sold or sent to third parties during this period",
        5,
        { from: accounts[1] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    // The company decides to cheat and tries to challenge the assertion knowing the user is not lying.
    let challenge;
    try {
      challenge = await stateChannel.challengeAssertion(
        "name, location, credit card",
        "We require this data to send you a car and will only keep it for up to one day after you have completed your booked travel",
        "No data will be kept or processed after 24h from the end of the trip",
        true,
        false,
        accounts[1],
        { from: accounts[0] }
      );
      assert.equal("EventFalseChallengeMade", challenge.logs[0].event);
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    const hashOfFinalState = web3.utils.soliditySha3(
      "name, location, credit card",
      "We require this data to send you a car and will only keep it for up to one day after you have completed your booked travel",
      "No data will be kept or processed after 24h from the end of the trip, No data will be sold or sent to third parties during this period",
      false,
      true,
      accounts[0]
    );

    // Not wanting any further penalisations, the company decides to settle the dispute and sets the state to the state the user asserted,
    // which means the conditions are changed and future negotiations will happen of-chain
    try {
      await stateChannel.setState(
        hashOfFinalState,
        web3.eth.accounts.sign(
          hashOfFinalState,
          "0x258f0f5ab66f80fd9b0ea732e3a70970b3ec3244c4538db4fdb536fbf973798a"
        ).signature,
        web3.eth.accounts.sign(
          hashOfFinalState,
          "0x7117dc599883649f6588a36b9774df5a018dbaa694169f74ae941239a5a527d9"
        ).signature,
        3,
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    assert.isOk(true);
  });
});
