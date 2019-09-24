pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

import "../Salary.sol";

contract SalaryRegistry is Ownable {
    address[] internal _salaryList;
    mapping(address => uint256) internal _salaryIndex;
    mapping(address => address) internal _salaryOfEmployee;
    mapping(address => address[]) internal _closedSalaryList;

    function register(address salary, address employee)
        public
        onlyOwner
        returns (bool)
    {
        if (_salaryOfEmployee[employee] == address(0)) {
            _salaryOfEmployee[employee] = salary;

            _salaryIndex[salary] = _salaryList.length;
            _salaryList.push(salary);
        } else {
            address previousSalary = _salaryOfEmployee[employee];

            require(previousSalary != salary, "already registered");
            require(
                Salary(previousSalary).isClosed(),
                "previous salary contract not closed"
            );

            _closedSalaryList[employee].push(previousSalary);
            _salaryOfEmployee[employee] = salary;

            _salaryList[_salaryIndex[previousSalary]] = salary;
            _salaryIndex[salary] = _salaryIndex[previousSalary];
            _salaryIndex[previousSalary] = 0;
        }
        return true;
    }

    function contractOf(address employee) public view returns (address) {
        return _salaryOfEmployee[employee];
    }

    function closedContractsOf(address employee)
        public
        view
        returns (address[] memory)
    {
        return _closedSalaryList[employee];
    }
}
