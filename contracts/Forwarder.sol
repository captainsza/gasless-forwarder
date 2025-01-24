// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Forwarder is ReentrancyGuard, Pausable, Ownable {
    using ECDSA for bytes32;

    mapping(address => uint256) public nonces;
    mapping(address => bool) public blacklistedAddresses;
    uint256 public maxGasLimit = 500000;

    bytes32 public constant EIP712_DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public constant FORWARD_REQUEST_TYPEHASH = keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntil)");

    bytes32 public domainSeparator;

    event TransactionForwarded(address indexed signer, address indexed to, uint256 nonce, bytes data);
    event AddressBlacklisted(address indexed account);
    event MaxGasLimitUpdated(uint256 newLimit);

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
        uint256 validUntil;
    }

    constructor(string memory _name, string memory _version) {
        domainSeparator = keccak256(abi.encode(
            EIP712_DOMAIN_TYPEHASH,
            keccak256(bytes(_name)),
            keccak256(bytes(_version)),
            block.chainid,
            address(this)
        ));
    }

    function verify(
        ForwardRequest memory req,
        bytes calldata signature
    ) public view returns (bool) {
        require(req.validUntil > block.timestamp, "Forwarder: request expired");
        require(req.gas <= maxGasLimit, "Forwarder: gas limit too high");
        require(!blacklistedAddresses[req.from], "Forwarder: sender blacklisted");
        require(!blacklistedAddresses[req.to], "Forwarder: recipient blacklisted");

        bytes32 hash = keccak256(abi.encode(
            FORWARD_REQUEST_TYPEHASH,
            req.from,
            req.to,
            req.value,
            req.gas,
            req.nonce,
            keccak256(req.data),
            req.validUntil
        ));

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, hash)
        );

        address signer = digest.recover(signature);
        return signer == req.from;
    }

    function forward(
        ForwardRequest memory req,
        bytes calldata signature
    ) public payable nonReentrant whenNotPaused {
        require(verify(req, signature), "Forwarder: signature does not match request");
        require(req.nonce == nonces[req.from], "Forwarder: nonce mismatch");

        nonces[req.from]++;

        (bool success, ) = req.to.call{gas: req.gas, value: req.value}(req.data);
        require(success, "Forwarder: call failed");

        emit TransactionForwarded(req.from, req.to, req.nonce, req.data);
    }

    function blacklistAddress(address account) external onlyOwner {
        blacklistedAddresses[account] = true;
        emit AddressBlacklisted(account);
    }

    function setMaxGasLimit(uint256 newLimit) external onlyOwner {
        maxGasLimit = newLimit;
        emit MaxGasLimitUpdated(newLimit);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
