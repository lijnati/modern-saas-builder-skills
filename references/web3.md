# Web3, Smart Contracts & EVM Architecture (Base & Stablecoins)

## 1. Practical Web3 Philosophy: When to Use Blockchain

Use blockchain exclusively when verifiable ownership, permissionless settlement, or censorship-resistant payment coordination is required:

| ✅ Great Web3 SaaS Use Cases | ❌ Terrible Web3 Use Cases (Overkill) |
|---|---|
| Cross-border B2B payouts via USDC on Base (sub-cent fees, 2-second settlement). | Storing user profile avatars or comments on-chain. |
| Autonomous AI agent wallets with programmatic spending budgets. | Replacing a standard Postgres relational database with a blockchain. |
| Programmable escrow, subscription stream contracts, or token-gated API keys. | Generic CRUD apps forcing users to sign MetaMask txs for simple updates. |

---

## 2. EVM Architecture & Base Network

Base (Ethereum Layer 2) is the premier network for modern consumer and B2B crypto applications:
- **Sub-Cent Gas Fees**: Typically < $0.005 per ERC-20 transfer.
- **2-Second Block Times**: Fast user feedback.
- **USDC Native Standard**: Direct fiat on-ramps via Coinbase.

### RPC Failover Configuration (Viem)
Never rely on a single public RPC node in production:

```typescript
import { createPublicClient, fallback, http } from "viem";
import { base } from "viem/chains";

export const publicClient = createPublicClient({
  chain: base,
  transport: fallback([
    http(process.env.ALCHEMY_BASE_RPC_URL),
    http(process.env.QUICKNODE_BASE_RPC_URL),
    http("https://mainnet.base.org"), // Public fallback
  ]),
});
```

---

## 3. Smart Contract Development with Foundry

Foundry is the industry standard for fast, secure, Rust-powered Solidity compilation and fuzz testing.

### Standard ERC-20 Escrow Contract (Solidity 0.8.20)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract SaaSJobEscrow is ReentrancyGuard, Ownable2Step {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdcToken;

    struct EscrowJob {
        address buyer;
        address seller;
        uint256 amount;
        bool isCompleted;
        bool isRefunded;
    }

    mapping(bytes32 => EscrowJob) public jobs;

    event JobDeposited(bytes32 indexed jobId, address indexed buyer, address indexed seller, uint256 amount);
    event JobReleased(bytes32 indexed jobId, address indexed seller, uint256 amount);
    event JobRefunded(bytes32 indexed jobId, address indexed buyer, uint256 amount);

    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid token address");
        usdcToken = IERC20(_usdcToken);
    }

    function deposit(bytes32 jobId, address seller, uint256 amount) external nonReentrant {
        require(jobs[jobId].amount == 0, "Job already exists");
        require(amount > 0, "Amount must be > 0");

        jobs[jobId] = EscrowJob({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            isCompleted: false,
            isRefunded: false
        });

        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        emit JobDeposited(jobId, msg.sender, seller, amount);
    }

    function release(bytes32 jobId) external nonReentrant {
        EscrowJob storage job = jobs[jobId];
        require(msg.sender == job.buyer || msg.sender == owner(), "Unauthorized");
        require(!job.isCompleted && !job.isRefunded, "Job already finalized");

        job.isCompleted = true;
        usdcToken.safeTransfer(job.seller, job.amount);
        emit JobReleased(jobId, job.seller, job.amount);
    }
}
```

### Foundry Test Suite (Fuzzing & Invariants)

```solidity
// test/SaaSJobEscrow.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SaaSJobEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {
        _mint(msg.sender, 1000000 * 1e6);
    }
}

contract SaaSJobEscrowTest is Test {
    SaaSJobEscrow escrow;
    MockUSDC usdc;
    address buyer = address(0x1);
    address seller = address(0x2);

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new SaaSJobEscrow(address(usdc));

        // Fund buyer
        usdc.transfer(buyer, 10000 * 1e6);
        vm.prank(buyer);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function testDepositAndRelease(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 10000 * 1e6);
        bytes32 jobId = keccak256(abi.encodePacked("job-123"));

        vm.prank(buyer);
        escrow.deposit(jobId, seller, amount);

        assertEq(usdc.balanceOf(address(escrow)), amount);

        vm.prank(buyer);
        escrow.release(jobId);

        assertEq(usdc.balanceOf(seller), amount);
    }
}
```

---

## 4. On-Chain Event Indexing & Database Sync

Never poll RPC nodes in client components. Use an event indexer (Envio, Goldsky, or custom webhook listeners) to sync on-chain events to your relational Postgres database:

```
Smart Contract Event (JobDeposited)
   ↓
RPC Provider Webhook / WebSocket Listener
   ↓
API Handler (`/api/webhooks/blockchain`)
   ↓ (Wait for 2-5 block confirmations to prevent reorg invalidation)
Database: Updates Job status to `funded` and notifies user via email/Telegram
```
