import { expect } from "chai";
import { ethers } from "hardhat";
import { TaskEscrow } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TaskEscrow", function () {
    let taskEscrow: TaskEscrow;
    let backend: SignerWithAddress;
    let client: SignerWithAddress;
    let worker: SignerWithAddress;
    let unauthorized: SignerWithAddress;

    const taskId = ethers.keccak256(ethers.toUtf8Bytes("task-123"));
    const amountINR = 500;
    const stripePaymentIntentId = "pi_test_123";
    const beforeImageHash = "QmBeforeHash123";
    const afterImageHash = "QmAfterHash456";
    const aiConfidence = 95;

    beforeEach(async function () {
        [backend, client, worker, unauthorized] = await ethers.getSigners();

        const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
        taskEscrow = await TaskEscrow.deploy(backend.address);
        await taskEscrow.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the correct backend address", async function () {
            expect(await taskEscrow.backend()).to.equal(backend.address);
        });
    });

    describe("Task Creation", function () {
        it("Should record task creation", async function () {
            await expect(
                taskEscrow.connect(backend).recordTaskCreation(
                    taskId,
                    client.address,
                    amountINR,
                    stripePaymentIntentId
                )
            )
                .to.emit(taskEscrow, "TaskCreated")
                .withArgs(taskId, client.address, amountINR, stripePaymentIntentId, await ethers.provider.getBlockNumber() + 1);

            const task = await taskEscrow.tasks(taskId);
            expect(task.client).to.equal(client.address);
            expect(task.amountINR).to.equal(amountINR);
            expect(task.status).to.equal(0); // CREATED
        });

        it("Should reject task creation from unauthorized address", async function () {
            await expect(
                taskEscrow.connect(unauthorized).recordTaskCreation(
                    taskId,
                    client.address,
                    amountINR,
                    stripePaymentIntentId
                )
            ).to.be.revertedWith("Only backend can record");
        });

        it("Should reject duplicate task creation", async function () {
            await taskEscrow.connect(backend).recordTaskCreation(
                taskId,
                client.address,
                amountINR,
                stripePaymentIntentId
            );

            await expect(
                taskEscrow.connect(backend).recordTaskCreation(
                    taskId,
                    client.address,
                    amountINR,
                    stripePaymentIntentId
                )
            ).to.be.revertedWith("Task already exists");
        });
    });

    describe("Task Acceptance", function () {
        beforeEach(async function () {
            await taskEscrow.connect(backend).recordTaskCreation(
                taskId,
                client.address,
                amountINR,
                stripePaymentIntentId
            );
        });

        it("Should record task acceptance", async function () {
            await expect(
                taskEscrow.connect(backend).recordTaskAcceptance(taskId, worker.address)
            )
                .to.emit(taskEscrow, "TaskAccepted")
                .withArgs(taskId, worker.address, await ethers.provider.getBlockNumber() + 1);

            const task = await taskEscrow.tasks(taskId);
            expect(task.worker).to.equal(worker.address);
            expect(task.status).to.equal(1); // ACCEPTED
        });

        it("Should reject acceptance from wrong status", async function () {
            await taskEscrow.connect(backend).recordTaskAcceptance(taskId, worker.address);

            await expect(
                taskEscrow.connect(backend).recordTaskAcceptance(taskId, worker.address)
            ).to.be.revertedWith("Invalid status");
        });
    });

    describe("Work Submission", function () {
        beforeEach(async function () {
            await taskEscrow.connect(backend).recordTaskCreation(
                taskId,
                client.address,
                amountINR,
                stripePaymentIntentId
            );
            await taskEscrow.connect(backend).recordTaskAcceptance(taskId, worker.address);
        });

        it("Should record work submission", async function () {
            await expect(
                taskEscrow.connect(backend).recordWorkSubmission(
                    taskId,
                    beforeImageHash,
                    afterImageHash
                )
            )
                .to.emit(taskEscrow, "WorkSubmitted")
                .withArgs(taskId, beforeImageHash, afterImageHash, await ethers.provider.getBlockNumber() + 1);

            const task = await taskEscrow.tasks(taskId);
            expect(task.beforeImageHash).to.equal(beforeImageHash);
            expect(task.afterImageHash).to.equal(afterImageHash);
            expect(task.status).to.equal(2); // WORK_SUBMITTED
        });
    });

    describe("AI Verification", function () {
        beforeEach(async function () {
            await taskEscrow.connect(backend).recordTaskCreation(
                taskId,
                client.address,
                amountINR,
                stripePaymentIntentId
            );
            await taskEscrow.connect(backend).recordTaskAcceptance(taskId, worker.address);
            await taskEscrow.connect(backend).recordWorkSubmission(
                taskId,
                beforeImageHash,
                afterImageHash
            );
        });

        it("Should record AI verification", async function () {
            await expect(
                taskEscrow.connect(backend).recordAIVerification(taskId, aiConfidence, true)
            )
                .to.emit(taskEscrow, "AIVerified")
                .withArgs(taskId, aiConfidence, true, await ethers.provider.getBlockNumber() + 1);

            const task = await taskEscrow.tasks(taskId);
            expect(task.aiConfidence).to.equal(aiConfidence);
            expect(task.status).to.equal(3); // AI_VERIFIED
        });
    });

    describe("Payment Release", function () {
        const stripeTransferId = "tr_test_789";

        beforeEach(async function () {
            await taskEscrow.connect(backend).recordTaskCreation(
                taskId,
                client.address,
                amountINR,
                stripePaymentIntentId
            );
            await taskEscrow.connect(backend).recordTaskAcceptance(taskId, worker.address);
            await taskEscrow.connect(backend).recordWorkSubmission(
                taskId,
                beforeImageHash,
                afterImageHash
            );
            await taskEscrow.connect(backend).recordAIVerification(taskId, aiConfidence, true);
        });

        it("Should record payment release", async function () {
            await expect(
                taskEscrow.connect(backend).recordPaymentRelease(taskId, stripeTransferId)
            )
                .to.emit(taskEscrow, "PaymentReleased")
                .withArgs(taskId, worker.address, amountINR, stripeTransferId, await ethers.provider.getBlockNumber() + 1);

            const task = await taskEscrow.tasks(taskId);
            expect(task.stripeTransferId).to.equal(stripeTransferId);
            expect(task.status).to.equal(4); // PAYMENT_RELEASED
        });
    });

    describe("Dispute", function () {
        const disputeReason = "Work not satisfactory";

        beforeEach(async function () {
            await taskEscrow.connect(backend).recordTaskCreation(
                taskId,
                client.address,
                amountINR,
                stripePaymentIntentId
            );
            await taskEscrow.connect(backend).recordTaskAcceptance(taskId, worker.address);
            await taskEscrow.connect(backend).recordWorkSubmission(
                taskId,
                beforeImageHash,
                afterImageHash
            );
            await taskEscrow.connect(backend).recordAIVerification(taskId, aiConfidence, true);
        });

        it("Should record dispute", async function () {
            await expect(
                taskEscrow.connect(backend).recordDispute(taskId, disputeReason)
            )
                .to.emit(taskEscrow, "TaskDisputed")
                .withArgs(taskId, disputeReason, await ethers.provider.getBlockNumber() + 1);

            const task = await taskEscrow.tasks(taskId);
            expect(task.status).to.equal(5); // DISPUTED
        });
    });

    describe("Public Audit", function () {
        beforeEach(async function () {
            await taskEscrow.connect(backend).recordTaskCreation(
                taskId,
                client.address,
                amountINR,
                stripePaymentIntentId
            );
            await taskEscrow.connect(backend).recordTaskAcceptance(taskId, worker.address);
        });

        it("Should allow anyone to view task audit", async function () {
            const audit = await taskEscrow.connect(unauthorized).getTaskAudit(taskId);

            expect(audit.client).to.equal(client.address);
            expect(audit.worker).to.equal(worker.address);
            expect(audit.amountINR).to.equal(amountINR);
            expect(audit.status).to.equal(1); // ACCEPTED
        });

        it("Should verify image hash", async function () {
            await taskEscrow.connect(backend).recordWorkSubmission(
                taskId,
                beforeImageHash,
                afterImageHash
            );

            const isValidBefore = await taskEscrow.verifyImageHash(taskId, beforeImageHash, true);
            const isValidAfter = await taskEscrow.verifyImageHash(taskId, afterImageHash, false);
            const isInvalid = await taskEscrow.verifyImageHash(taskId, "WrongHash", true);

            expect(isValidBefore).to.be.true;
            expect(isValidAfter).to.be.true;
            expect(isInvalid).to.be.false;
        });
    });
});
