pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

import "../TokenVesting.sol";

contract TokenVestingRegistry is Ownable {
    mapping(address => mapping(address => bool)) internal _tokenVestingRegistered;
    mapping(address => address[]) internal _tokenVestingList;

    function register(address beneficiary, address tokenVesting)
        public
        onlyOwner
        returns (bool)
    {
        require(
            !_tokenVestingRegistered[beneficiary][tokenVesting],
            "already registered"
        );

        _tokenVestingRegistered[beneficiary][tokenVesting] = true;
        _tokenVestingList[beneficiary].push(tokenVesting);
        return true;
    }

    function contractsOf(address beneficiary)
        public
        view
        returns (address[] memory)
    {
        return _tokenVestingList[beneficiary];
    }

    function isContractRegistered(address beneficiary, address tokenVesting)
        public
        view
        returns (bool)
    {
        return _tokenVestingRegistered[beneficiary][tokenVesting];
    }
}
