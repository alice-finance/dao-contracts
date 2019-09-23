pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract Salary is Ownable {
    using SafeMath for uint256;

    uint256 internal _openedAt;
    uint256 internal _closedAt;
    uint256 internal _releaseTerm;
    uint256 internal _interval;
    uint256 internal _wage;
    uint256 internal _totalClaimed;

    address internal _token;
    address internal _employee;
    address internal _salaryPool;

    event Claimed(uint256 amount);
    event Closed(uint256 timestamp);

    modifier onlyEmployee() {
        require(msg.sender == _employee);
        _;
    }

    modifier onlyOpened() {
        require(!isClosed());
        _;
    }

    constructor(
        address tokenAddress,
        address employeeAddress,
        address poolAddress,
        uint256 wageInterval,
        uint256 wageAmount
    ) public {
        _token = tokenAddress;
        _employee = employeeAddress;
        _salaryPool = poolAddress;
        _interval = wageInterval;
        _wage = wageAmount;
        _openedAt = block.timestamp;
    }

    function releaseTerm() public view returns (uint256) {
        return _releaseTerm;
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

    function token() public view returns (address) {
        return _token;
    }

    function employee() public view returns (address) {
        return _employee;
    }

    function salaryPool() public view returns (address) {
        return _salaryPool;
    }

    function isClosed() public view returns (bool) {
        return _closedAt > 0;
    }

    /**
    * @dev Employee can claim their wages
    */
    function claim() public onlyEmployee {
        uint256 amount = currentClaimable();

        _totalClaimed = _totalClaimed.add(amount);

        IERC20(_token).transferFrom(_salaryPool, _employee, amount);

        emit Claimed(amount);
    }

    /**
    * @dev Calculate claimable amount
    * @return claimable amount
    */
    function currentClaimable() public view returns (uint256) {
        uint256 lastTimestamp = _closedAt > 0 ? _closedAt : block.timestamp;
        uint256 amount = _openedAt.sub(lastTimestamp).div(_interval).mul(
            _wage
        );

        if (_closedAt > 0) {
            amount = amount.add(
                _wage.div(_interval).mul(
                    _openedAt.sub(_closedAt).mod(_interval)
                )
            );
        }

        amount = amount.sub(_totalClaimed);

        return amount;
    }

    /**
    * @dev Close this salary contract. Employee can claim their wage amount calculated before contract closed
    */
    function close() public onlyOwner onlyOpened {
        _closedAt = block.timestamp;
    }
}
