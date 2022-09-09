// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

struct Stake {
    uint256 amount; // amount of tokens to stake
    uint256 expiry; // expiry of the stake
}

contract Staking is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    using SafeERC20Upgradeable for ERC20Upgradeable;

    mapping(address => Stake) private stakes;
    mapping(address => bool) private staked;

    uint64 constant exportionTime = 15552000; // 180 days，24 * 60 * 60 * 180

    uint256 public totalStaked;
    uint256 public totalClaimed;
    uint256 public startDate;
    address public token;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    function stake(uint256 _amount) public returns (bool) {
        require(startDate > 0, "Staking is not yet started");
        require(_amount > 0, "Amount must be greater than 0");
        require(!paused(), "Contract is paused");
        require(staked[msg.sender], "Already staked");

        ERC20Upgradeable(token).transferFrom(
            msg.sender,
            address(this),
            _amount
        );

        stakes[msg.sender] = Stake(_amount, block.timestamp + exportionTime);
        staked[msg.sender] = true;
        totalStaked += _amount;

        emit Staked(msg.sender, _amount);
        return true;
    }

    function claim() public returns (bool) {
        require(staked[msg.sender], "Not staked");
        require(!paused(), "Contract is paused");
        require(
            block.timestamp < stakes[msg.sender].expiry,
            "Stake has expired"
        );

        uint256 amountToClaim = stakes[msg.sender].amount;
    }

    function setStartDate(uint256 _startDate) external onlyRole(OPERATOR_ROLE) {
        require(
            _startDate > 0 && _startDate > block.timestamp,
            "Start date must be greater than 0"
        );
        startDate = _startDate;
    }

    function setToken(address _token) external onlyRole(OPERATOR_ROLE) {
        require(
            _token != address(0) && _token != token,
            "Token address must be set"
        );
        token = _token;
    }

    function setOperator(address _operator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _grantRole(OPERATOR_ROLE, _operator);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    event Staked(address indexed staker, uint256 amount);
    event Claimed(address indexed staker, uint256 amount);
}
