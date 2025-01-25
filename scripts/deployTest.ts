import { ethers } from "hardhat";

async function main() {
  try {
    // Deploy TestToken first
    console.log("Deploying TestToken...");
    const TestToken = await ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy();
    await testToken.deployed();
    console.log("TestToken deployed to:", testToken.address);

    // Verify token functionality
    const symbol = await testToken.symbol();
    const decimals = await testToken.decimals();
    console.log("Token Symbol:", symbol);
    console.log("Token Decimals:", decimals);

    // Deploy Forwarder
    console.log("\nDeploying Forwarder...");
    const Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await Forwarder.deploy("GaslessForwarder", "1.0");
    await forwarder.deployed();
    console.log("Forwarder deployed to:", forwarder.address);

    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("\nDeployer address:", deployer.address);
    
    // Get deployer's token balance
    const balance = await testToken.balanceOf(deployer.address);
    console.log("Deployer TestToken balance:", ethers.utils.formatEther(balance));

    // Print configuration information
    console.log("\n=== Configuration Information ===");
    console.log("Add these to your .env.local file:");
    console.log(`NEXT_PUBLIC_FORWARDER_ADDRESS=${forwarder.address}`);
    console.log(`NEXT_PUBLIC_TEST_TOKEN_ADDRESS=${testToken.address}`);
    console.log("\nAdd these to your .env file:");
    console.log(`FORWARDER_CONTRACT_ADDRESS=${forwarder.address}`);
    console.log(`TEST_TOKEN_ADDRESS=${testToken.address}`);

  } catch (error) {
    console.error("Deployment error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
