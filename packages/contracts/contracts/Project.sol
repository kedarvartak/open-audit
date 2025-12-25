// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Project
 * @dev Manages fund release milestones with decentralized verification
 * @notice This contract handles proof submission, voting, and milestone approval
 */
contract Project {
    // ==================== STRUCTS ====================
    
    struct Milestone {
        string title;
        string description;
        uint256 requiredApprovals; // N-of-M threshold
        bool isCompleted;
        bool isApproved;
        uint256 approvalCount;
        uint256 rejectionCount;
        uint256 createdAt;
    }

    struct Proof {
        bytes32 beforeImageHash;    // SHA-256 hash of before image
        bytes32 afterImageHash;     // SHA-256 hash of after image
        string gpsCoordinates;      // "latitude,longitude"
        uint256 timestamp;
        address submitter;
        ProofStatus status;
    }

    enum ProofStatus {
        PENDING,
        UNDER_REVIEW,
        VERIFIED,
        REJECTED
    }

    // ==================== STATE VARIABLES ====================
    
    address public organizer;
    address public admin; // Backend wallet for system operations
    string public title;
    string public description;
    uint256 public fundingGoal; // In INR (stored as wei equivalent for calculation)
    uint256 public createdAt;
    
    Milestone[] public milestones;
    mapping(uint256 => Proof) public milestoneProofs; // milestoneId => Proof
    mapping(uint256 => mapping(address => bool)) public hasVoted; // milestoneId => verifier => voted
    mapping(address => bool) public isVerifier;
    mapping(address => bool) public isDonor;
    
    uint256 public verifierCount;
    uint256 public donorCount;

    // ==================== EVENTS ====================
    
    event MilestoneCreated(
        uint256 indexed milestoneId,
        string title,
        string description,
        uint256 requiredApprovals
    );
    
    event ProofSubmitted(
        uint256 indexed milestoneId,
        bytes32 beforeImageHash,
        bytes32 afterImageHash,
        string gpsCoordinates,
        address submitter
    );
    
    event VoteCast(
        uint256 indexed milestoneId,
        address indexed voter,
        bool approve,
        string comment
    );
    
    event MilestoneApproved(
        uint256 indexed milestoneId,
        uint256 approvalCount,
        uint256 timestamp
    );
    
    event MilestoneRejected(
        uint256 indexed milestoneId,
        uint256 rejectionCount,
        uint256 timestamp
    );
    
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    event DonorAdded(address indexed donor, uint256 amount);

    // ==================== MODIFIERS ====================
    
    modifier onlyOrganizer() {
        require(msg.sender == organizer, "Only organizer can perform this action");
        _;
    }

    modifier onlyVerifier() {
        require(isVerifier[msg.sender], "Only verifiers can perform this action");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier validMilestone(uint256 _milestoneId) {
        require(_milestoneId < milestones.length, "Invalid milestone ID");
        _;
    }

    // ==================== CONSTRUCTOR ====================
    
    constructor(
        address _organizer,
        string memory _title,
        string memory _description,
        uint256 _fundingGoal
    ) {
        organizer = _organizer;
        admin = msg.sender;
        title = _title;
        description = _description;
        fundingGoal = _fundingGoal;
        createdAt = block.timestamp;
    }

    // ==================== VERIFIER MANAGEMENT ====================
    
    function addVerifier(address _verifier) external onlyAdmin {
        require(!isVerifier[_verifier], "Already a verifier");
        isVerifier[_verifier] = true;
        verifierCount++;
        emit VerifierAdded(_verifier);
    }

    function removeVerifier(address _verifier) external onlyAdmin {
        require(isVerifier[_verifier], "Not a verifier");
        isVerifier[_verifier] = false;
        verifierCount--;
        emit VerifierRemoved(_verifier);
    }

    // ==================== DONOR MANAGEMENT ====================
    
    function addDonor(address _donor, uint256 _amount) external onlyAdmin {
        if (!isDonor[_donor]) {
            isDonor[_donor] = true;
            donorCount++;
        }
        emit DonorAdded(_donor, _amount);
    }

    // ==================== MILESTONE MANAGEMENT ====================
    
    function createMilestone(
        string memory _title,
        string memory _description,
        uint256 _requiredApprovals
    ) external onlyOrganizer {
        require(_requiredApprovals > 0, "Required approvals must be > 0");
        
        milestones.push(Milestone({
            title: _title,
            description: _description,
            requiredApprovals: _requiredApprovals,
            isCompleted: false,
            isApproved: false,
            approvalCount: 0,
            rejectionCount: 0,
            createdAt: block.timestamp
        }));
        
        emit MilestoneCreated(
            milestones.length - 1,
            _title,
            _description,
            _requiredApprovals
        );
    }

    // ==================== PROOF SUBMISSION ====================
    
    function submitProof(
        uint256 _milestoneId,
        bytes32 _beforeImageHash,
        bytes32 _afterImageHash,
        string memory _gpsCoordinates
    ) external onlyOrganizer validMilestone(_milestoneId) {
        Milestone storage milestone = milestones[_milestoneId];
        require(!milestone.isCompleted, "Milestone already completed");
        require(milestoneProofs[_milestoneId].timestamp == 0, "Proof already submitted");

        milestoneProofs[_milestoneId] = Proof({
            beforeImageHash: _beforeImageHash,
            afterImageHash: _afterImageHash,
            gpsCoordinates: _gpsCoordinates,
            timestamp: block.timestamp,
            submitter: msg.sender,
            status: ProofStatus.PENDING
        });

        emit ProofSubmitted(
            _milestoneId,
            _beforeImageHash,
            _afterImageHash,
            _gpsCoordinates,
            msg.sender
        );
    }

    // ==================== VERIFICATION & VOTING ====================
    
    function voteOnProof(
        uint256 _milestoneId,
        bool _approve
    ) external onlyVerifier validMilestone(_milestoneId) {
        require(!hasVoted[_milestoneId][msg.sender], "You have already voted");
        require(milestoneProofs[_milestoneId].timestamp > 0, "No proof submitted");
        
        Milestone storage milestone = milestones[_milestoneId];
        require(!milestone.isCompleted, "Milestone already completed");

        hasVoted[_milestoneId][msg.sender] = true;

        if (_approve) {
            milestone.approvalCount++;
        } else {
            milestone.rejectionCount++;
        }

        emit VoteCast(_milestoneId, msg.sender, _approve, "");

        // Check if threshold is met
        _checkApprovalThreshold(_milestoneId);
    }

    function _checkApprovalThreshold(uint256 _milestoneId) internal {
        Milestone storage milestone = milestones[_milestoneId];
        
        // Check if required approvals threshold is met
        if (milestone.approvalCount >= milestone.requiredApprovals) {
            milestone.isApproved = true;
            milestone.isCompleted = true;
            milestoneProofs[_milestoneId].status = ProofStatus.VERIFIED;
            
            emit MilestoneApproved(
                _milestoneId,
                milestone.approvalCount,
                block.timestamp
            );
        }
        // Optional: Auto-reject if rejections exceed a threshold
        else if (milestone.rejectionCount >= milestone.requiredApprovals) {
            milestone.isCompleted = true;
            milestoneProofs[_milestoneId].status = ProofStatus.REJECTED;
            
            emit MilestoneRejected(
                _milestoneId,
                milestone.rejectionCount,
                block.timestamp
            );
        }
    }

    // ==================== VIEW FUNCTIONS ====================
    
    function getMilestone(uint256 _milestoneId) external view validMilestone(_milestoneId) 
        returns (
            string memory _title,
            string memory _description,
            uint256 _requiredApprovals,
            bool _isCompleted,
            bool _isApproved,
            uint256 _approvalCount,
            uint256 _rejectionCount
        ) 
    {
        Milestone memory m = milestones[_milestoneId];
        return (
            m.title,
            m.description,
            m.requiredApprovals,
            m.isCompleted,
            m.isApproved,
            m.approvalCount,
            m.rejectionCount
        );
    }

    function getProof(uint256 _milestoneId) external view validMilestone(_milestoneId)
        returns (
            bytes32 _beforeImageHash,
            bytes32 _afterImageHash,
            string memory _gpsCoordinates,
            uint256 _timestamp,
            address _submitter,
            ProofStatus _status
        )
    {
        Proof memory p = milestoneProofs[_milestoneId];
        return (
            p.beforeImageHash,
            p.afterImageHash,
            p.gpsCoordinates,
            p.timestamp,
            p.submitter,
            p.status
        );
    }

    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    function hasUserVoted(uint256 _milestoneId, address _user) external view returns (bool) {
        return hasVoted[_milestoneId][_user];
    }
}
