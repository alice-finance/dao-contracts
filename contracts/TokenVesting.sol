pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract TokenVesting is Ownable {
    using SafeMath for uint256;

    bool internal _initialized;

    uint256 internal _closedAt;
    uint256 internal _lastClaimedTimestamp;

    uint256 internal _totalSupply;
    uint256 internal _totalClaimed;

    uint256 internal _initialReleaseAmount;
    uint256 internal _releaseStartAt;
    uint256 internal _releaseInterval;
    uint256 internal _releaseCount;
    uint256 internal _releaseAmount;
    uint256 internal _claimAmount;

    address internal _token;
    address internal _beneficiary;

    mapping(uint256 => string) internal _reports;

    event LogUint(string tag, uint256 value);
    event Initialized(uint256 timestamp);
    event Claimed(uint256 amount, uint256 timestamp);
    event Closed(uint256 timestamp);

    modifier onlyBeneficiary() {
        require(msg.sender == _beneficiary, "caller is not beneficiary");
        _;
    }

    modifier onlyOpened() {
        require(!isClosed(), "contract closed");
        _;
    }

    constructor(
        address tokenAddress,
        address beneficiaryAddress,
        uint256 totalSupply,
        uint256 releaseStartAt,
        uint256 releaseInterval,
        uint256 releaseCount,
        uint256 initialReleaseAmount,
        uint256 releaseAmount,
        uint256 claimAmount
    ) public {
        _token = tokenAddress;
        _beneficiary = beneficiaryAddress;

        _totalSupply = totalSupply;

        _releaseStartAt = releaseStartAt;
        _releaseInterval = releaseInterval;
        _releaseCount = releaseCount;
        _initialReleaseAmount = initialReleaseAmount;
        _releaseAmount = releaseAmount;
        _claimAmount = claimAmount;
    }

    function initialized() public view returns (bool) {
        return _initialized;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function totalClaimed() public view returns (uint256) {
        return _totalClaimed;
    }

    function initialReleaseAmount() public view returns (uint256) {
        return _initialReleaseAmount;
    }

    function releaseStartAt() public view returns (uint256) {
        return _releaseStartAt;
    }

    function releaseInterval() public view returns (uint256) {
        return _releaseInterval;
    }

    function releaseCount() public view returns (uint256) {
        return _releaseCount;
    }

    function releaseAmount() public view returns (uint256) {
        return _releaseAmount;
    }

    function claimAmount() public view returns (uint256) {
        return _claimAmount;
    }

    function lastClaimedTimestamp() public view returns (uint256) {
        return _lastClaimedTimestamp;
    }

    function token() public view returns (address) {
        return _token;
    }

    function beneficiary() public view returns (address) {
        return _beneficiary;
    }

    function balance() public view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    /**
    * @dev Initialize contract
    */
    function initialize() public onlyOwner {
        require(_initialized == false, "already initialized");
        _initialized = true;

        IERC20(_token).transferFrom(owner(), address(this), _totalSupply);

        emit Initialized(block.timestamp);
    }

    /**
    * @dev Calculate total locked token amount
    */
    function totalLocked() public view returns (uint256) {
        return _totalSupply.sub(totalReleased());
    }

    /**
    * @dev Calculate total released token amount
    */
    function totalReleased() public view returns (uint256) {
        uint256 amount = 0;
        uint256 lastTimestamp = _closedAt > 0 ? _closedAt : block.timestamp;
        uint256 finalTimestamp = _releaseStartAt.add(
            _releaseCount.mul(_releaseInterval)
        );

        if (_releaseStartAt <= lastTimestamp) {
            if (lastTimestamp >= finalTimestamp) {
                amount = _totalSupply;
            } else {
                amount = amount.add(_initialReleaseAmount);

                uint256 period = lastTimestamp.sub(_releaseStartAt).div(
                    _releaseInterval
                );

                // Guard. this code will not be executed in normal circumstance.
                if (period >= _releaseCount) {
                    period = _releaseCount - 1;
                }

                amount = amount.add(_releaseAmount.mul(period));
            }
        }

        // Guard. this code will not be executed in normal circumstance.
        if (amount > _totalSupply) {
            amount = _totalSupply;
        }

        return amount;
    }

    /**
    * @dev Calculate current claimable token amount
    */
    function currentClaimable() public view returns (uint256) {
        uint256 amount = 0;
        uint256 released = totalReleased();
        uint256 lastTimestamp = block.timestamp;
        uint256 finalTimestamp = _releaseStartAt.add(
            _releaseCount.mul(_releaseInterval)
        );

        if (_releaseStartAt <= lastTimestamp) {
            if (_closedAt > 0 || lastTimestamp >= finalTimestamp) {
                amount = released;
            } else {
                uint256 period = lastTimestamp
                    .sub(_releaseStartAt)
                    .div(_releaseInterval)
                    .add(1);

                // Guard. this code will not be executed in normal circumstance.
                if (period > _releaseCount) {
                    period = _releaseCount;
                }

                amount = amount.add(_claimAmount.mul(period));
            }
        }

        // Guard. this code will not be executed in normal circumstance.
        if (amount > released) {
            amount = released;
        }

        return amount.sub(_totalClaimed);
    }

    /**
    * @dev Claim token
    */
    function claim(uint256 amount) public onlyBeneficiary returns (bool) {
        require(amount <= currentClaimable(), "invalid amount");

        _totalClaimed = _totalClaimed.add(amount);

        IERC20(_token).transfer(_beneficiary, amount);

        emit Claimed(amount, block.timestamp);

        return true;
    }

    function isClosed() public view returns (bool) {
        return _closedAt > 0;
    }

    /**
    * @dev terminate contract
    */
    function close() public onlyOwner onlyOpened returns (bool) {
        _closedAt = block.timestamp;

        IERC20(_token).transfer(owner(), totalLocked());

        emit Closed(block.timestamp);

        return true;
    }

    /**
    * @dev Submit weekly report
    */
    function submitReport(string memory content, uint256 timestamp)
        public
        onlyBeneficiary
    {
        _reports[_getWeekStartTimestamp(timestamp)] = content;
    }

    /**
    * @dev returns weekly report of given timestamp
    */
    function getReportAt(uint256 timestamp)
        public
        view
        returns (string memory)
    {
        return _reports[_getWeekStartTimestamp(timestamp)];
    }

    function _getWeekStartTimestamp(uint256 timestamp)
        internal
        view
        returns (uint256)
    {
        return timestamp.sub(timestamp.mod(7 days));
    }
}
