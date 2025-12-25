import { expect } from "chai";
import { ethers } from "hardhat";
import { Project, ProjectFactory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Project Contract", function () {
    let project: Project;
    let admin: SignerWithAddress;
    let organizer: SignerWithAddress;
    let verifier1: SignerWithAddress;
    let verifier2: SignerWithAddress;
    let verifier3: SignerWithAddress;
    let donor: SignerWithAddress;

    const projectTitle = "Solar Panel Installation";
    const projectDescription = "Install 100 solar panels in rural school";
    const fundingGoal = ethers.parseEther("500000"); // 500000 INR equivalent

    beforeEach(async function () {
        [admin, organizer, verifier1, verifier2, verifier3, donor] = await ethers.getSigners();

        const ProjectFactory = await ethers.getContractFactory("Project");
        project = await ProjectFactory.deploy(
            organizer.address,
            projectTitle,
            projectDescription,
            fundingGoal
        );
        await project.waitForDeployment();

        // Add verifiers
        await project.connect(admin).addVerifier(verifier1.address);
        await project.connect(admin).addVerifier(verifier2.address);
        await project.connect(admin).addVerifier(verifier3.address);

        // Add donor
        await project.connect(admin).addDonor(donor.address, ethers.parseEther("100000"));
    });

    describe("Deployment", function () {
        it("Should set the correct organizer", async function () {
            expect(await project.organizer()).to.equal(organizer.address);
        });

        it("Should set the correct admin", async function () {
            expect(await project.admin()).to.equal(admin.address);
        });

        it("Should set the correct title and description", async function () {
            expect(await project.title()).to.equal(projectTitle);
            expect(await project.description()).to.equal(projectDescription);
        });

        it("Should have 3 verifiers", async function () {
            expect(await project.verifierCount()).to.equal(3);
        });
    });

    describe("Milestone Creation", function () {
        it("Should allow organizer to create milestone", async function () {
            await expect(
                project.connect(organizer).createMilestone(
                    "Phase 1: Installation",
                    "Install panels on rooftop",
                    2 // Requires 2 approvals
                )
            ).to.emit(project, "MilestoneCreated");

            expect(await project.getMilestoneCount()).to.equal(1);
        });

        it("Should not allow non-organizer to create milestone", async function () {
            await expect(
                project.connect(verifier1).createMilestone(
                    "Invalid Milestone",
                    "Should fail",
                    2
                )
            ).to.be.revertedWith("Only organizer can perform this action");
        });
    });

    describe("Proof Submission", function () {
        const beforeHash = ethers.keccak256(ethers.toUtf8Bytes("before-image-data"));
        const afterHash = ethers.keccak256(ethers.toUtf8Bytes("after-image-data"));
        const gps = "28.6139,77.2090";

        beforeEach(async function () {
            await project.connect(organizer).createMilestone(
                "Phase 1",
                "Installation complete",
                2
            );
        });

        it("Should allow organizer to submit proof", async function () {
            await expect(
                project.connect(organizer).submitProof(0, beforeHash, afterHash, gps)
            ).to.emit(project, "ProofSubmitted");

            const proof = await project.getProof(0);
            expect(proof._beforeImageHash).to.equal(beforeHash);
            expect(proof._afterImageHash).to.equal(afterHash);
            expect(proof._gpsCoordinates).to.equal(gps);
        });

        it("Should not allow submitting proof for completed milestone", async function () {
            await project.connect(organizer).submitProof(0, beforeHash, afterHash, gps);

            // Get milestone approved
            await project.connect(verifier1).voteOnProof(0, true);
            await project.connect(verifier2).voteOnProof(0, true);

            // Try to submit another proof
            await expect(
                project.connect(organizer).submitProof(0, beforeHash, afterHash, gps)
            ).to.be.revertedWith("Milestone already completed");
        });
    });

    describe("Voting & Approval", function () {
        const beforeHash = ethers.keccak256(ethers.toUtf8Bytes("before-image-data"));
        const afterHash = ethers.keccak256(ethers.toUtf8Bytes("after-image-data"));
        const gps = "28.6139,77.2090";

        beforeEach(async function () {
            await project.connect(organizer).createMilestone(
                "Phase 1",
                "Installation complete",
                2 // Requires 2 approvals
            );
            await project.connect(organizer).submitProof(0, beforeHash, afterHash, gps);
        });

        it("Should allow verifiers to vote", async function () {
            await expect(
                project.connect(verifier1).voteOnProof(0, true)
            ).to.emit(project, "VoteCast");

            const milestone = await project.getMilestone(0);
            expect(milestone._approvalCount).to.equal(1);
        });

        it("Should not allow double voting", async function () {
            await project.connect(verifier1).voteOnProof(0, true);

            await expect(
                project.connect(verifier1).voteOnProof(0, true)
            ).to.be.revertedWith("You have already voted");
        });

        it("Should approve milestone when threshold is met", async function () {
            await project.connect(verifier1).voteOnProof(0, true);

            await expect(
                project.connect(verifier2).voteOnProof(0, true)
            ).to.emit(project, "MilestoneApproved");

            const milestone = await project.getMilestone(0);
            expect(milestone._isApproved).to.be.true;
            expect(milestone._isCompleted).to.be.true;
        });

        it("Should reject milestone when rejection threshold is met", async function () {
            await project.connect(verifier1).voteOnProof(0, false);

            await expect(
                project.connect(verifier2).voteOnProof(0, false)
            ).to.emit(project, "MilestoneRejected");

            const milestone = await project.getMilestone(0);
            expect(milestone._isApproved).to.be.false;
            expect(milestone._isCompleted).to.be.true;
        });

        it("Should not allow voting after milestone completion", async function () {
            await project.connect(verifier1).voteOnProof(0, true);
            await project.connect(verifier2).voteOnProof(0, true);

            await expect(
                project.connect(verifier3).voteOnProof(0, true)
            ).to.be.revertedWith("Milestone already completed");
        });
    });

    describe("Access Control", function () {
        it("Should only allow admin to add verifiers", async function () {
            const newVerifier = donor.address;

            await expect(
                project.connect(organizer).addVerifier(newVerifier)
            ).to.be.revertedWith("Only admin can perform this action");

            await expect(
                project.connect(admin).addVerifier(newVerifier)
            ).to.emit(project, "VerifierAdded");
        });

        it("Should only allow admin to remove verifiers", async function () {
            await expect(
                project.connect(organizer).removeVerifier(verifier1.address)
            ).to.be.revertedWith("Only admin can perform this action");

            await expect(
                project.connect(admin).removeVerifier(verifier1.address)
            ).to.emit(project, "VerifierRemoved");
        });
    });
});
