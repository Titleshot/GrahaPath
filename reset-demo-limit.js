// Script to reset demo usage limit
console.log('=== RESETTING DEMO USAGE LIMIT ===\n');

// Clear demo usage tracking
localStorage.removeItem('usedDemoCharts');
localStorage.removeItem('storedCharts');

console.log('✅ Demo usage limit reset successfully!');
console.log('✅ You now have 2+ free demo chances available.');
console.log('\nPlease refresh the page and try again.');
