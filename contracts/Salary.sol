pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract Salary is Ownable {
    using SafeMath for uint256;

    uint256 internal _openedAt;
    uint256 internal _closedAt;
    uint256 internal _interval;
    uint256 internal _wage;
    uint256 internal _totalClaimed;
    uint256 internal _lastClaimedTimestamp;

    address internal _token;
    address internal _employee;
    address internal _fund;

    event Claimed(uint256 amount, uint256 timestamp);
    event Closed(uint256 timestamp);

    modifier onlyEmployee() {
        require(msg.sender == _employee, "caller is not employee");
        _;
    }

    modifier onlyOpened() {
        require(!isClosed(), "contract closed");
        _;
    }

    constructor(
        address tokenAddress,
        address employeeAddress,
        address fundAddress,
        uint256 wageInterval,
        uint256 wageAmount
    ) public {
        _token = tokenAddress;
        _employee = employeeAddress;
        _fund = fundAddress;
        _interval = wageInterval;
        _wage = wageAmount;
        _openedAt = block.timestamp;
    }

    function interval() public view returns (uint256) {
        return _interval;
    }

    function wage() public view returns (uint256) {
        return _wage;
    }

    function totalClaimed() public view returns (uint256) {
        return _totalClaimed;
    }

    function lastClaimedTimestamp() public view returns (uint256) {
        return _lastClaimedTimestamp;
    }

    function token() public view returns (address) {
        return _token;
    }

    function employee() public view returns (address) {
        return _employee;
    }

    function fund() public view returns (address) {
        return _fund;
    }

    function isClosed() public view returns (bool) {
        return _closedAt > 0;
    }

    /**
    * @dev Employee can claim their wages
    */
    function claim() public onlyEmployee returns (bool) {
        uint256 amount = currentClaimable();

        require(amount > 0, "no claimable amount");

        _totalClaimed = _totalClaimed.add(amount);

        IERC20(_token).transferFrom(_fund, _employee, amount);

        emit Claimed(amount, block.timestamp);

        return true;
    }

    /**
    * @dev Calculate claimable amount
    * @return claimable amount
    */
    function currentClaimable() public view returns (uint256) {
        uint256 lastTimestamp = _closedAt > 0 ? _closedAt : block.timestamp;
        uint256 amount = lastTimestamp.sub(_openedAt).div(_interval).mul(_wage);

        amount = amount.sub(_totalClaimed);

        return amount;
    }

    /**
    * @dev Close this salary contract. Employee can claim their wage amount calculated before contract closed
    */
    function close() public onlyOwner onlyOpened returns (bool) {
        _closedAt = block.timestamp;

        return true;
    }
}
