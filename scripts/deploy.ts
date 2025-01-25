import { ethers } from "hardhat";

async function main() {
  // Deploy Forwarder
  const Forwarder = await ethers.getContractFactory("Forwarder");
  const forwarder = await Forwarder.deploy("GaslessForwarder", "1.0");
  await forwarder.deployed();
  console.log("Forwarder deployed to:", forwarder.address);

  // Deploy TestToken
  const TestToken = await ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy();
  await testToken.deployed();
  console.log("TestToken deployed to:", testToken.address);

  // Save addresses to .env files
  console.log("\nAdd these to your .env.local file:");
  console.log(`NEXT_PUBLIC_FORWARDER_ADDRESS=${forwarder.address}`);
  console.log(`NEXT_PUBLIC_TEST_TOKEN_ADDRESS=${testToken.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
