import { ethers } from "hardhat";

async function main() {
  // Deploy Forwarder
  console.log("Deploying Forwarder...");
  const Forwarder = await ethers.getContractFactory("Forwarder");
  const forwarder = await Forwarder.deploy();
  await forwarder.deployed(); // Use deployed() instead of waitForDeployment()
  console.log("Forwarder deployed to:", forwarder.address);

  // Verify deployment
  const provider = ethers.provider;
  const code = await provider.getCode(forwarder.address);
  if (code === '0x') {
    throw new Error('Forwarder deployment failed - no code at address');
  }

  // Deploy TestToken
  console.log("\nDeploying TestToken...");
  const TestToken = await ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy();
  await testToken.deployed();
  console.log("TestToken deployed to:", testToken.address);

  // Update .env.local
  console.log("\nAdd these to your .env.local file:");
  console.log(`NEXT_PUBLIC_FORWARDER_ADDRESS=${forwarder.address}`);
  console.log(`NEXT_PUBLIC_TEST_TOKEN_ADDRESS=${testToken.address}`);

  // Additional verification
  console.log("\nVerifying deployments...");
  console.log("Forwarder code length:", (await provider.getCode(forwarder.address)).length);
  console.log("TestToken code length:", (await provider.getCode(testToken.address)).length);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
