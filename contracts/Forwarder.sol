// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Forwarder {
    using ECDSA for bytes32;

    mapping(address => uint256) public nonces;

    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant FORWARD_REQUEST_TYPEHASH = keccak256(
        "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntil)"
    );

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
        uint256 validUntil;
    }

    event TransactionForwarded(address indexed from, address indexed to, uint256 nonce);

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("GaslessForwarder"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(
                    FORWARD_REQUEST_TYPEHASH,
                    req.from,
                    req.to,
                    req.value,
                    req.gas,
                    req.nonce,
                    keccak256(req.data),
                    req.validUntil
                ))
            )
        );
        return digest.recover(signature) == req.from;
    }

    function forward(ForwardRequest calldata req, bytes calldata signature) external returns (bool) {
        require(req.validUntil > block.timestamp, "Request expired");
        require(nonces[req.from] == req.nonce, "Invalid nonce");
        require(verify(req, signature), "Invalid signature");

        nonces[req.from]++;

        (bool success,) = req.to.call{gas: req.gas, value: req.value}(req.data);
        require(success, "Forward failed");

        emit TransactionForwarded(req.from, req.to, req.nonce);
        return true;
    }

    function getNonce(address from) external view returns (uint256) {
        return nonces[from];
    }
}
