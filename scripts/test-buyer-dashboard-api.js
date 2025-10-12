/**
 * Test script to verify the Buyer Dashboard API is returning real data from the database
 */

const testUserId = 'ZB7hHL1HaYfnW0I2hINP0uiRAJF2' // Replace with a real user ID from your database

async function testDashboardAPI() {
  console.log('\n🧪 Testing Buyer Dashboard API')
  console.log('=' .repeat(80))
  
  try {
    const url = `http://localhost:3000/api/dashboard/buyer?userId=${testUserId}`
    console.log(`\n📡 Fetching: ${url}\n`)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    console.log('✅ API Response Successful!\n')
    console.log('=' .repeat(80))
    
    // Display KPIs
    console.log('\n📊 KPIs:')
    console.log('-'.repeat(80))
    console.log(`  Quota Purchased:       ${data.kpis.quotaPurchased.toLocaleString()} calls`)
    console.log(`  Quota Used:            ${data.kpis.quotaUsed.toLocaleString()} calls`)
    console.log(`  Cost Saved (USD):      $${data.kpis.costSavedUsd.toFixed(2)}`)
    console.log(`  Active Subscriptions:  ${data.kpis.activeSubscriptions}`)
    
    // Display Quick Stats
    console.log('\n⚡ Quick Stats:')
    console.log('-'.repeat(80))
    console.log(`  Avg Response Time:     ${data.quickStats.avgResponseTimeMs} ms`)
    console.log(`  Success Rate:          ${(data.quickStats.successRate * 100).toFixed(1)}%`)
    console.log(`  Total Requests:        ${data.quickStats.totalRequests.toLocaleString()}`)
    console.log(`  Cost Per Call:         $${data.quickStats.costPerCall.toFixed(6)}`)
    
    // Display Calls Over Time
    console.log('\n📈 Calls Over Time (Last 14 Days):')
    console.log('-'.repeat(80))
    if (data.callsOverTime.length > 0) {
      console.log(`  Date Range:            ${data.callsOverTime[0].date} to ${data.callsOverTime[data.callsOverTime.length - 1].date}`)
      console.log(`  Data Points:           ${data.callsOverTime.length}`)
      console.log(`  Sample:`)
      data.callsOverTime.slice(0, 3).forEach(day => {
        console.log(`    ${day.date}: ${day.calls} calls, ${(day.successRate * 100).toFixed(1)}% success`)
      })
    } else {
      console.log('  ⚠️  No data (no calls in last 14 days)')
    }
    
    // Display Hourly Pattern
    console.log('\n⏰ Hourly Pattern (Last 24 Hours):')
    console.log('-'.repeat(80))
    const hourlyTotal = data.hourlyPattern.reduce((sum, h) => sum + h.calls, 0)
    console.log(`  Total Calls:           ${hourlyTotal}`)
    const peakHour = data.hourlyPattern.reduce((max, h) => h.calls > max.calls ? h : max, data.hourlyPattern[0])
    if (peakHour.calls > 0) {
      console.log(`  Peak Hour:             ${peakHour.hour}:00 (${peakHour.calls} calls)`)
      console.log(`  Sample:`)
      data.hourlyPattern.filter(h => h.calls > 0).slice(0, 5).forEach(h => {
        console.log(`    ${String(h.hour).padStart(2, '0')}:00 - ${h.calls} calls`)
      })
    } else {
      console.log('  ⚠️  No calls in last 24 hours')
    }
    
    // Display Cost Breakdown
    console.log('\n💰 Cost Breakdown:')
    console.log('-'.repeat(80))
    if (data.costBreakdown.length > 0) {
      const totalCost = data.costBreakdown.reduce((sum, item) => sum + item.value, 0)
      console.log(`  Total Spend:           $${totalCost.toFixed(4)}`)
      data.costBreakdown.forEach(item => {
        const percentage = totalCost > 0 ? (item.value / totalCost * 100).toFixed(1) : 0
        console.log(`    ${item.label.padEnd(20)} $${item.value.toFixed(4)} (${percentage}%)`)
      })
    } else {
      console.log('  ⚠️  No purchase data')
    }
    
    // Display Usage By API
    console.log('\n🔌 Usage By API:')
    console.log('-'.repeat(80))
    if (data.usageByApi.length > 0) {
      console.log(`  Total APIs Used:       ${data.usageByApi.length}`)
      console.log(`  Breakdown:`)
      data.usageByApi.forEach(api => {
        console.log(`    ${api.api.padEnd(20)} ${api.calls} calls, ${(api.success * 100).toFixed(1)}% success, ${api.avgLatencyMs}ms avg, $${api.costUsd.toFixed(4)}`)
      })
    } else {
      console.log('  ⚠️  No API usage data')
    }
    
    // Display Recent Logs
    console.log('\n📝 Recent Logs:')
    console.log('-'.repeat(80))
    if (data.recentLogs.length > 0) {
      console.log(`  Total Recent Logs:     ${data.recentLogs.length}`)
      console.log(`  Sample (first 5):`)
      data.recentLogs.slice(0, 5).forEach(log => {
        const statusIcon = log.status === 'ok' ? '✓' : '✗'
        const time = new Date(log.time).toLocaleTimeString()
        console.log(`    ${statusIcon} [${time}] ${log.api} ${log.method} ${log.path} - ${log.latencyMs}ms - $${log.cost.toFixed(6)}`)
      })
    } else {
      console.log('  ⚠️  No recent logs')
    }
    
    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 DATA QUALITY SUMMARY')
    console.log('='.repeat(80))
    
    const checks = [
      { name: 'KPIs', status: data.kpis.quotaPurchased > 0 || data.kpis.quotaUsed > 0 },
      { name: 'Quick Stats', status: data.quickStats.totalRequests > 0 },
      { name: 'Calls Over Time', status: data.callsOverTime.length > 0 },
      { name: 'Hourly Pattern', status: data.hourlyPattern.some(h => h.calls > 0) },
      { name: 'Cost Breakdown', status: data.costBreakdown.length > 0 },
      { name: 'Usage By API', status: data.usageByApi.length > 0 },
      { name: 'Recent Logs', status: data.recentLogs.length > 0 }
    ]
    
    checks.forEach(check => {
      const icon = check.status ? '✅' : '⚠️ '
      console.log(`${icon} ${check.name.padEnd(20)} ${check.status ? 'HAS DATA' : 'NO DATA'}`)
    })
    
    const passedChecks = checks.filter(c => c.status).length
    const totalChecks = checks.length
    
    console.log('\n' + '='.repeat(80))
    console.log(`✅ Data Quality: ${passedChecks}/${totalChecks} sections have data (${Math.round(passedChecks/totalChecks*100)}%)`)
    console.log('='.repeat(80))
    
    if (passedChecks === totalChecks) {
      console.log('\n🎉 Perfect! All dashboard sections have data!')
    } else if (passedChecks >= totalChecks * 0.7) {
      console.log('\n✅ Good! Most dashboard sections have data.')
    } else {
      console.log('\n⚠️  Warning: Many sections are missing data. Consider making more API calls or purchases.')
    }
    
  } catch (error) {
    console.error('\n❌ Error testing dashboard API:', error.message)
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Make sure the Next.js dev server is running: npm run dev')
    }
  }
}

// Run the test
testDashboardAPI()
