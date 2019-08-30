/*
 * Smart contract tests
 * In order to run, the following command must be run:
 * $ ganache-cli -m 'festival adjust rotate siren actress write kingdom immune team rate cover guilt'
 */

/* eslint-disable */
const PrivaseeChannelManager = artifacts.require("PrivaseeChannelManager");
const StateChannel = artifacts.require("StateChannel");

/*
 * State Channel Tests
 */
contract("PrivaseeChannelManager", accounts => {
  let manager;
  let hashToSign;
  let signedByCompany;
  let signedByUser;

  beforeEach(async () => {
    manager = await PrivaseeChannelManager.deployed();
    hashToSign = web3.utils.soliditySha3("createChannel");

    signedByCompany = web3.eth.accounts.sign(
      hashToSign,
      "0x258f0f5ab66f80fd9b0ea732e3a70970b3ec3244c4538db4fdb536fbf973798a"
    );
    signedByUser = web3.eth.accounts.sign(
      hashToSign,
      "0x7117dc599883649f6588a36b9774df5a018dbaa694169f74ae941239a5a527d9"
    );
  });

  it("manager contract can create a State Channel", async () => {
    const stateChannel = await manager.createStateChannel.call(
      signedByCompany.signature,
      signedByUser.signature,
      accounts[0],
      accounts[1],
      300000, // 5 mins
      { from: accounts[0] }
    );

    assert.exists(stateChannel);
  });

  it("channelCounter is updated accordingly", async () => {
    // Create State Channel
    await manager.createStateChannel(
      signedByCompany.signature,
      signedByUser.signature,
      accounts[0],
      accounts[1],
      300000, // 5 mins
      { from: accounts[0] }
    );

    // checks channelCounter
    const counter = await manager.channelCounter.call({ from: accounts[0] });
    assert.equal(counter.toNumber(), 1);
  });

  it("should not allow a third party to create a State Channel for others", async () => {
    try {
      await manager.createStateChannel.call(
        signedByCompany.signature,
        signedByUser.signature,
        accounts[0],
        accounts[1],
        300000, // 5 mins
        { from: accounts[6] }
      );
      assert.fail();
    } catch (e) {
      assert(e.toString().includes("revert"), e.toString());
    }
  });

  it("should not let you create a state channel with yourself", async () => {
    try {
      await manager.createStateChannel.call(
        signedByCompany.signature,
        signedByUser.signature,
        accounts[0],
        accounts[0],
        300000, // 5 mins
        { from: accounts[0] }
      );
      assert.fail();
    } catch (e) {
      assert(e.toString().includes("revert"), e.toString());
    }
  });

  it("members of a state channel should be able to get its address", async () => {
    // Create State Channel
    await manager.createStateChannel(
      signedByCompany.signature,
      signedByUser.signature,
      accounts[0],
      accounts[1],
      300000, // 5 mins
      { from: accounts[0] }
    );

    // retrieves key
    let key = await manager.getChannelKey.call(accounts[0], accounts[1]);

    // get State Channel Address
    let address = await manager.channelMapping.call(key);
    assert.exists(address);
  });
});

/*
 * State Channel Tests
 */
contract("StateChannel", accounts => {
  let manager;
  let stateChannel;
  let hashToSign;

  beforeEach(async () => {
    manager = await PrivaseeChannelManager.deployed();
    hashToSign = web3.utils.soliditySha3("createChannel");
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
  });

  it("initially agreed state can be set", async () => {
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
        { from: accounts[0] }
      );
      assert.isOk(true);
    } catch (e) {
      console.log(e);
      assert.fail();
    }
  });

  it("dispute can be triggered", async () => {
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
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    try {
      await stateChannel.triggerDispute();
    } catch (e) {
      console.log(e);
      assert.fail();
    }
    assert.isOk(true);
  });

  it("state assertion can be made", async () => {
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

    await stateChannel.triggerDispute();

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
    assert.isOk(true);
  });

  it("second state assertion can be made by other member of state channel (negotiation can continue on-chain)", async () => {
    const hashOfNewState = web3.utils.soliditySha3(
      "name, location, credit card",
      "We require this data to send you a car and will only keep it for up to one day after you have completed your booked travel",
      "No data will be kept or processed after 24h from the end of the trip",
      false,
      false,
      accounts[0]
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
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    await stateChannel.triggerDispute();

    try {
      await stateChannel.assertState(
        web3.utils.fromUtf8(""),
        web3.utils.soliditySha3(
          "Name, Location",
          "I need your name and location to send a car to pick you up",
          "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
          true,
          false,
          accounts[1]
        ),
        "",
        1,
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    try {
      await stateChannel.assertState(
        web3.utils.soliditySha3(
          "Name, Location",
          "I need your name and location to send a car to pick you up",
          "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
          true,
          false,
          accounts[1]
        ),
        web3.utils.soliditySha3(
          "Name, Location",
          "I need your name and location to send a car to pick you up",
          "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car, None of the data will be sent nor sold during the time in which they have access to it",
          false,
          true,
          accounts[0]
        ),
        "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car, None of the data will be sent nor sold during the time in which they have access to it",
        5,
        { from: accounts[1] }
      );
      assert.isOk(true);
    } catch (e) {
      console.log(e);
      assert.fail();
    }
  });

  // Company tries to cheat and accept for the user
  it("no party can submit two state assertions in a row", async () => {
    const hashOfNewState = web3.utils.soliditySha3(
      "name, location, credit card",
      "We require this data to send you a car and will only keep it for up to one day after you have completed your booked travel",
      "No data will be kept or processed after 24h from the end of the trip",
      false,
      false,
      accounts[0]
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
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    await stateChannel.triggerDispute();

    try {
      await stateChannel.assertState(
        web3.utils.fromUtf8(""),
        web3.utils.soliditySha3(
          "Name, Location",
          "I need your name and location to send a car to pick you up",
          "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
          true,
          false,
          accounts[1]
        ),
        "",
        1,
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    try {
      await stateChannel.assertState(
        web3.utils.soliditySha3(
          "Name, Location",
          "I need your name and location to send a car to pick you up",
          "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
          true,
          false,
          accounts[1]
        ),
        web3.utils.soliditySha3(
          "Name, Location",
          "I need your name and location to send a car to pick you up",
          "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
          true,
          true,
          accounts[0]
        ),
        "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car, None of the data will be sent nor sold during the time in which they have access to it",
        5,
        { from: accounts[0] }
      );
      assert.fail();
    } catch (e) {
      assert(e.toString().includes("revert"), e.toString());
    }
  });

  it("state assertion can be challenged", async () => {
    const hashOfNewState2 = web3.utils.soliditySha3(
      "name, location, credit card",
      "We require this data to send you a car and will only keep it for up to one day after you have completed your booked travel",
      "No data will be kept or processed after 24h from the end of the trip",
      true,
      false,
      accounts[1]
    );

    const hashOfNewState = web3.utils.soliditySha3(
      "Name, location",
      "I need your name and location to send a car to pick you up",
      "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
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

    await stateChannel.triggerDispute();

    try {
      await stateChannel.assertState(
        web3.utils.fromUtf8(""),
        web3.utils.soliditySha3(
          "Name, location, credit card",
          "I need your name and location to send a car to pick you up",
          "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
          true,
          true,
          accounts[0]
        ),
        "",
        2,
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    let challenge;

    try {
      challenge = await stateChannel.challengeAssertion(
        "Name, location",
        "I need your name and location to send a car to pick you up",
        "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
        true,
        false,
        accounts[1],
        { from: accounts[1] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    assert.equal("EventFalseAssertionFound", challenge.logs[0].event);
  });

  it("false challenges are caught", async () => {
    const hashOfNewState = web3.utils.soliditySha3(
      "Name, location, credit card",
      "I need your name and location to send a car to pick you up",
      "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
      false,
      false,
      accounts[0]
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
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    await stateChannel.triggerDispute();

    // He also tries to get user's credit card info
    try {
      await stateChannel.assertState(
        web3.utils.fromUtf8(""),
        web3.utils.soliditySha3(
          "Name, location, credit card",
          "I need your name and location to send a car to pick you up",
          "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
          true,
          false,
          accounts[1]
        ),
        "",
        3,
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    let challenge;
    try {
      challenge = await stateChannel.challengeAssertion(
        "Name, location, credit card",
        "I need your name and location to send a car to pick you up",
        "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
        false,
        false,
        accounts[0],
        { from: accounts[1] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    assert.equal("EventFalseChallengeMade", challenge.logs[0].event);
  });

  it("dispute can be settled by setting new agreed state", async () => {
    const hashOfNewState = web3.utils.soliditySha3(
      "name, location, credit card",
      "We require this data to send you a car and will only keep it for up to one day after you have completed your booked travel",
      "No data will be kept or processed after 24h from the end of the trip",
      false,
      false,
      accounts[0]
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
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    await stateChannel.triggerDispute();

    try {
      await stateChannel.assertState(
        web3.utils.fromUtf8(""),
        web3.utils.soliditySha3(
          "Name, Location",
          "I need your name and location to send a car to pick you up",
          "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
          true,
          false,
          accounts[1]
        ),
        "",
        1,
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    const hashOfFinalState = web3.utils.soliditySha3(
      "Name, Location",
      "I need your name and location to send a car to pick you up",
      "The data will only be kept as long as the car is either on its way to pick you up or while you are in the car",
      true,
      false,
      accounts[1]
    );

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
        2,
        { from: accounts[0] }
      );
    } catch (e) {
      console.log(e);
      assert.fail();
    }

    const status = await stateChannel.status.call();

    assert.equal(status, 0);
  });
});
