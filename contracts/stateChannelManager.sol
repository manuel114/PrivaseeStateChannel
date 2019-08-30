pragma solidity ^0.5.0;

/*
 * PrivaseeChannelManager
 * Contract that manages overall state (history of all transactions), opens and closes channels
 */
contract PrivaseeChannelManager {
  PrivaseeAC public ac;

  mapping (bytes32 => address) public channelMapping;
  uint public channelCounter;

  constructor(address _PrivaseeACAddress) public {
    // Deploys PrivaseeAC Contract
    if (_PrivaseeACAddress == address(0)) {
      ac = new PrivaseeAC();

    } else {
      ac = PrivaseeAC(_PrivaseeACAddress);
    }
  }

  // Creates a state channel between members of plist
  function createStateChannel(bytes memory _sigCompany, bytes memory _sigUser, address _company, address _user, uint256 _disputePeriod) public returns(address){
    require(_company != _user);
    require(msg.sender == _user || msg.sender == _company);

    // commitment to create new channel
      bytes32 agreedMessage = keccak256(abi.encodePacked("createChannel"));
      bytes32 h = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", agreedMessage));

    //Check all parties in channel have signed it
    checkSignature(_company, h, _sigCompany);
    checkSignature(_user, h, _sigUser);

    // gets channel key
    bytes32 key = keccak256(abi.encodePacked(_company, _user));

    // Create channel
    StateChannel channel = new StateChannel([_company, _user], _disputePeriod, address(ac));
    channelMapping[key] = address(channel);
    channelCounter = channelCounter + 1;

    return address(channel);
  }

  function checkSignature(address _address, bytes32 _h, bytes memory _sig) public pure {
    bytes32 r;
    bytes32 s;
    uint8 v;

    assembly {
      r := mload(add(_sig, 0x20))
      s := mload(add(_sig, 0x40))
      v := byte(0, mload(add(_sig, 0x60)))
    }
    // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
    if (v < 27) {
      v += 27;
    }
    require(_address == ecrecover(_h, v, r, s));
  }

  function getChannelKey(address _company, address _user) public pure returns(bytes32) {
    return keccak256(abi.encodePacked(_company, _user));
  }
}

/*
 * StateChannel
 * Contract that manages off-chain interactions, it stores the latest agreed State
 * as proof consensensus til that point
 */
contract StateChannel {
  address[] public plist; // List of participants
  mapping (address => bool) pmap; // Map of participants

  PrivaseeAC public ac;

  enum Status { ON, DISPUTE, OFF }

  uint256 public disputePeriod; // Time to resolve a new state in a dispute
  address public owner; // Address of AC

  Status public status;

  uint256 roundCounter; // Counter of current State
  uint256 public t_start;
  uint256 public deadline;

  bytes32 hstate; // (string data, string description, string conditions, uint approvedBySender, uint approvedByUser, address turn, uint256 roundCounter)
  bytes32 hstateAssertion;
  bool assertion;
  uint command;
  string input;
  address asserter;

  struct Dispute {
    uint256 round;
    uint256 t_start;
    uint256 t_settle;
  }

  Dispute dispute;

  event EventFalseChallengeMade ();
  event EventFalseAssertionFound ();
  event EventDispute (uint256 indexed deadline);
  event EventResolve (uint256 indexed roundCounter);
  event EventEvidence (uint256 indexed roundCounter, bytes32 hstate);

  modifier onlyOwner { if(owner == msg.sender) _; else revert(); }
  modifier onlyParticipants { if(pmap[msg.sender]) _; else revert(); }

  constructor(address[2] memory _plist, uint _disputePeriod, address _acAddress) public {

    for (uint i = 0; i< _plist.length; i++ ) {
      plist.push(_plist[i]);
      pmap[_plist[i]] = true;
    }

    owner = msg.sender;
    disputePeriod = _disputePeriod;
    ac = PrivaseeAC(_acAddress);
    assertion = false;
    status = Status.OFF;
    roundCounter = 0;
  }

  // Party sets State to last agreed state
  // _hstate is a hash of new agreed state
  // (string data, string description, string conditions, uint approvedBySender, uint approvedByUser, address turn, uint256 roundCounter)
  function setState(bytes32 _hstate, bytes memory _sigCompany, bytes memory _sigUser, uint256 _roundCounter) public {
    require(_roundCounter > roundCounter);
    bytes32 h = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _hstate));

    // check if all parties have signed it
    checkSignature(plist[0], h, _sigCompany);
    checkSignature(plist[1], h, _sigUser);

    // Agreed state
    roundCounter = roundCounter + 1;
    hstate = _hstate;
    roundCounter = _roundCounter;
    status = Status.ON;
    assertion = false;

    // Tell everyone about new State
    emit EventEvidence(roundCounter, hstate);
  }

  // Signals there is a dispute and changes the state of the channel
  function triggerDispute() onlyParticipants public {
    require(status == Status.ON);
    t_start = block.timestamp + t_start;
    deadline = block.timestamp + disputePeriod;
    status = Status.DISPUTE;

    emit EventDispute(deadline);
  }

  // Party makes an assertion for a new state
  function assertState(bytes32 _hstate, bytes32 _hstateAssertion, string memory _input, uint _command) onlyParticipants public {
  require(status == Status.DISPUTE);

    if (!assertion) {
      require(_hstate == ''); // First assertion
      assertion = true;
      asserter = msg.sender;
      input = _input;
      command = _command;
      hstateAssertion = _hstateAssertion;
    } else {
      require(msg.sender != asserter); // next player can extend assertion (play on chain)
      require(hstateAssertion == _hstate); // Extending existing assertion

      // Store assertion
      asserter = msg.sender;
      input = _input;
      command = _command;

      // Update hstate and hstateAssertion
      hstate = hstateAssertion;
      hstateAssertion = _hstateAssertion;

      deadline = block.timestamp + disputePeriod; // Reset deadline after assertion
    }
  }

  // Other party challenges the assertion
  function challengeAssertion(
    string memory data,
    string memory description,
    string memory conditions,
    bool approvedBySender,
    bool approvedByUser,
    address turn
    ) onlyParticipants public {

    require(status == Status.DISPUTE && assertion);
    // checks they have given us the correct oldState
    require(hstate == keccak256(abi.encodePacked(data, description, conditions, approvedBySender, approvedByUser, turn)));

    // Computes transition on-chain
    bytes32 check = ac.transition(plist, input, command, data, description, conditions, approvedBySender, approvedByUser, turn);
    if(hstateAssertion != check) {
      // Send coins and bond to non-cheater
      emit EventFalseAssertionFound();
    } else {
      emit EventFalseChallengeMade();
    }
    // TODO: strike system punishes asserter for cheating
  }

  function getDispute() public view returns (uint256, uint256, uint256) {
    require(status == Status.ON);
    return (dispute.round, dispute.t_start, dispute.t_settle);
  }

  // helper function to verfy signatures
  function checkSignature(address _address, bytes32 _h, bytes memory _sig) public pure {
    bytes32 r;
    bytes32 s;
    uint8 v;

    assembly {
      r := mload(add(_sig, 0x20))
      s := mload(add(_sig, 0x40))
      v := byte(0, mload(add(_sig, 0x60)))
    }
    // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
    if (v < 27) {
      v += 27;
    }
    require(_address == ecrecover(_h, v, r, s));
  }

  // Fetch latest state hash, only doable when dispute has concluded
  function getStateHash() public view returns (bytes32) {
    require(status == Status.ON);
    return hstate;
  }
}

/*
 * PrivaseeAC (Application Contract)
 * Privasee Functionality + Transition checkup
 * Necessary to avoid circular reference
 */
contract PrivaseeAC {

  function transition(
    address[] memory plist,
    string memory input,
    uint command,
    string memory data,
    string memory description,
    string memory conditions,
    bool approvedBySender,
    bool approvedByUser,
    address turn
    ) public pure returns (bytes32) {

    // If command is requestApproval
    if (command == 1) {
      if (turn == plist[1]) return keccak256(abi.encodePacked('ERROR')); // checks that its the company's turn
      return keccak256(abi.encodePacked(data, description, conditions, approvedBySender, approvedByUser, plist[1]));
    }

    // If command is userApprove
    if (command == 2) {
      if (turn == plist[0]) return keccak256(abi.encodePacked('ERROR')); // checks that its the user's turn
      return keccak256(abi.encodePacked(data, description, conditions, approvedBySender, true , plist[0]));
    }

    // If command is senderApprove
    if (command == 3) {
      if (turn == plist[1]) return keccak256(abi.encodePacked('ERROR')); // checks that its the company's turn
      return keccak256(abi.encodePacked(data, description, conditions, true, approvedByUser, plist[1]));
    }

    // If command is rejectAndFinalise
    if (command == 4) {
      if (turn == plist[0]) return keccak256(abi.encodePacked('ERROR')); // checks that its the user's turn
      return keccak256(abi.encodePacked(data, description, conditions, approvedBySender, false, plist[0]));
    }

    // If command is disputeConditions
    if (command == 5) {
      if (turn == plist[1]) {
        return keccak256(abi.encodePacked(data, description, input, false, true, plist[0]));
      } else {
        return keccak256(abi.encodePacked(data, description, input, true, false, plist[1]));
      }
    }

    return 0;
  }
}
