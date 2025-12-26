// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * TaskEscrow - AUDIT TRAIL ONLY (No Crypto Payments)
 * 
 * This contract provides decentralized, immutable record-keeping for tasks.
 * Actual payments are handled OFF-CHAIN via Stripe in INR.
 * 
 * Purpose: Transparency & Trust without cryptocurrency complexity
 */
contract TaskEscrow {
    address public backend;  // Trusted backend that records events
    
    struct Task {
        address client;          // Client's wallet address (for identity)
        address worker;          // Worker's wallet address (for identity)
        uint256 amountINR;       // Amount in INR (reference only, not actual payment)
        TaskStatus status;
        uint256 createdAt;
        uint256 completedAt;
        string beforeImageHash;  // IPFS/SHA256 hash of before image
        string afterImageHash;   // IPFS/SHA256 hash of after image
        uint8 aiConfidence;      // AI confidence score (0-100)
        string stripePaymentIntentId;  // Link to actual Stripe payment
        string stripeTransferId;       // Link to Stripe transfer to worker
    }
    
    enum TaskStatus { 
        CREATED,          // Task posted
        ACCEPTED,         // Worker accepted
        WORK_SUBMITTED,   // Before/after images uploaded
        AI_VERIFIED,      // AI approved the work
        PAYMENT_RELEASED, // Stripe payment completed
        DISPUTED,         // Client disputed
        CANCELLED         // Task cancelled
    }
    
    // taskId (bytes32 hash) => Task data
    mapping(bytes32 => Task) public tasks;
    
    // Events for transparency
    event TaskCreated(
        bytes32 indexed taskId,
        address indexed client,
        uint256 amountINR,
        string stripePaymentIntentId,
        uint256 timestamp
    );
    
    event TaskAccepted(
        bytes32 indexed taskId,
        address indexed worker,
        uint256 timestamp
    );
    
    event WorkSubmitted(
        bytes32 indexed taskId,
        string beforeImageHash,
        string afterImageHash,
        uint256 timestamp
    );
    
    event AIVerified(
        bytes32 indexed taskId,
        uint8 confidence,
        bool approved,
        uint256 timestamp
    );
    
    event PaymentReleased(
        bytes32 indexed taskId,
        address indexed worker,
        uint256 amountINR,
        string stripeTransferId,
        uint256 timestamp
    );
    
    event TaskDisputed(
        bytes32 indexed taskId,
        string reason,
        uint256 timestamp
    );
    
    modifier onlyBackend() {
        require(msg.sender == backend, "Only backend can record");
        _;
    }
    
    constructor(address _backend) {
        backend = _backend;
    }
    
    // Record task creation (called by backend after Stripe escrow created)
    function recordTaskCreation(
        bytes32 taskId,
        address client,
        uint256 amountINR,
        string memory stripePaymentIntentId
    ) external onlyBackend {
        require(tasks[taskId].client == address(0), "Task already exists");
        
        tasks[taskId] = Task({
            client: client,
            worker: address(0),
            amountINR: amountINR,
            status: TaskStatus.CREATED,
            createdAt: block.timestamp,
            completedAt: 0,
            beforeImageHash: "",
            afterImageHash: "",
            aiConfidence: 0,
            stripePaymentIntentId: stripePaymentIntentId,
            stripeTransferId: ""
        });
        
        emit TaskCreated(taskId, client, amountINR, stripePaymentIntentId, block.timestamp);
    }
    
    // Record worker acceptance
    function recordTaskAcceptance(
        bytes32 taskId,
        address worker
    ) external onlyBackend {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.CREATED, "Invalid status");
        
        task.worker = worker;
        task.status = TaskStatus.ACCEPTED;
        
        emit TaskAccepted(taskId, worker, block.timestamp);
    }
    
    // Record work submission with image hashes
    function recordWorkSubmission(
        bytes32 taskId,
        string memory beforeHash,
        string memory afterHash
    ) external onlyBackend {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.ACCEPTED, "Invalid status");
        
        task.beforeImageHash = beforeHash;
        task.afterImageHash = afterHash;
        task.status = TaskStatus.WORK_SUBMITTED;
        task.completedAt = block.timestamp;
        
        emit WorkSubmitted(taskId, beforeHash, afterHash, block.timestamp);
    }
    
    // Record AI verification result
    function recordAIVerification(
        bytes32 taskId,
        uint8 confidence,
        bool approved
    ) external onlyBackend {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.WORK_SUBMITTED, "Invalid status");
        
        task.aiConfidence = confidence;
        task.status = TaskStatus.AI_VERIFIED;
        
        emit AIVerified(taskId, confidence, approved, block.timestamp);
    }
    
    // Record payment release (called AFTER Stripe completes transfer)
    function recordPaymentRelease(
        bytes32 taskId,
        string memory stripeTransferId
    ) external onlyBackend {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.AI_VERIFIED, "Invalid status");
        
        task.stripeTransferId = stripeTransferId;
        task.status = TaskStatus.PAYMENT_RELEASED;
        
        emit PaymentReleased(
            taskId,
            task.worker,
            task.amountINR,
            stripeTransferId,
            block.timestamp
        );
    }
    
    // Record dispute
    function recordDispute(
        bytes32 taskId,
        string memory reason
    ) external onlyBackend {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.AI_VERIFIED || 
            task.status == TaskStatus.PAYMENT_RELEASED,
            "Invalid status"
        );
        
        task.status = TaskStatus.DISPUTED;
        
        emit TaskDisputed(taskId, reason, block.timestamp);
    }
    
    // Public audit function - ANYONE can verify task history
    function getTaskAudit(bytes32 taskId) external view returns (
        address client,
        address worker,
        uint256 amountINR,
        TaskStatus status,
        uint256 createdAt,
        uint256 completedAt,
        string memory beforeImageHash,
        string memory afterImageHash,
        uint8 aiConfidence,
        string memory stripePaymentIntentId,
        string memory stripeTransferId
    ) {
        Task memory task = tasks[taskId];
        return (
            task.client,
            task.worker,
            task.amountINR,
            task.status,
            task.createdAt,
            task.completedAt,
            task.beforeImageHash,
            task.afterImageHash,
            task.aiConfidence,
            task.stripePaymentIntentId,
            task.stripeTransferId
        );
    }
    
    // Verify image hash (anyone can check if images were tampered)
    function verifyImageHash(
        bytes32 taskId,
        string memory imageHash,
        bool isBefore
    ) external view returns (bool) {
        Task memory task = tasks[taskId];
        if (isBefore) {
            return keccak256(bytes(task.beforeImageHash)) == keccak256(bytes(imageHash));
        } else {
            return keccak256(bytes(task.afterImageHash)) == keccak256(bytes(imageHash));
        }
    }
}
