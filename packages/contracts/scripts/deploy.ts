import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Starting deployment...\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Deploy ProjectFactory
    console.log("📦 Deploying ProjectFactory...");
    const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
    const factory = await ProjectFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();

    console.log("✅ ProjectFactory deployed to:", factoryAddress);
    console.log("👤 Admin:", await factory.admin(), "\n");

    // Create a test project
    console.log("🏗️  Creating test project...");
    const tx = await factory.createProject(
        deployer.address,
        "Solar Panel Installation - Test",
        "Install 100 solar panels in rural school",
        ethers.parseEther("500000") // 500000 INR equivalent
    );

    const receipt = await tx.wait();

    // Get the created project address from event
    const event = receipt?.logs.find((log: any) => {
        try {
            return factory.interface.parseLog(log)?.name === "ProjectCreated";
        } catch {
            return false;
        }
    });

    let projectAddress = "unknown";
    if (event) {
        const parsedEvent = factory.interface.parseLog(event);
        projectAddress = parsedEvent?.args[0];
    }

    console.log("✅ Test project created at:", projectAddress, "\n");

    // Get deployed Project contract
    const Project = await ethers.getContractFactory("Project");
    const project = Project.attach(projectAddress);

    // Add some verifiers
    console.log("👥 Adding verifiers...");
    const verifierAddresses = [
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat account #1
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Hardhat account #2
        "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Hardhat account #3
    ];

    for (const verifierAddr of verifierAddresses) {
        await project.addVerifier(verifierAddr);
        console.log("  ✓ Added verifier:", verifierAddr);
    }

    console.log("\n📊 Deployment Summary:");
    console.log("=".repeat(50));
    console.log("ProjectFactory:", factoryAddress);
    console.log("Test Project:  ", projectAddress);
    console.log("Verifiers:     ", verifierAddresses.length);
    console.log("=".repeat(50));

    console.log("\n💡 Next Steps:");
    console.log("1. Update backend .env with:");
    console.log(`   BLOCKCHAIN_FACTORY_ADDRESS="${factoryAddress}"`);
    console.log("2. Start backend to sync with blockchain");
    console.log("3. Create milestones via backend API");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });
