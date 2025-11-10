/**
 * Integration Tests for LLM Cost Router API
 *
 * These tests require API keys to be set in .env file
 * Run with: node integration-test.js
 */

const API_URL = 'http://localhost:8000';
const API_KEY = process.env.ROUTER_API_KEY || 'dev-key-123';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
};

const testCases = [
  {
    name: ' Coding Task',
    messages: [{ role: 'user', content: 'Write a Python function to reverse a string' }],
    expectedIntent: 'coding',
    expectedModel: 'deepseek-coder',
  },
  {
    name: ' Math Calculation',
    messages: [{ role: 'user', content: 'Calculate the average of 45, 67, 89, and 23' }],
    expectedIntent: 'math',
    expectedModel: 'deepseek-chat',
  },
  {
    name: ' Simple Q&A',
    messages: [{ role: 'user', content: 'What is the capital of France?' }],
    expectedIntent: 'simple-qa',
    expectedModel: 'deepseek-chat',
  },
  {
    name: '🎨 Creative Writing',
    messages: [{ role: 'user', content: 'Write a short story about a robot learning to love' }],
    expectedIntent: 'creative',
    expectedModel: 'qwen-plus',
  },
  {
    name: ' Translation',
    messages: [{ role: 'user', content: 'Translate "Hello, how are you?" to Spanish' }],
    expectedIntent: 'translation',
    expectedModel: 'qwen-turbo',
  },
  {
    name: ' Analysis',
    messages: [{ role: 'user', content: 'Compare the advantages and disadvantages of React vs Vue' }],
    expectedIntent: 'analysis',
    expectedModel: 'qwen-plus',
  },
  {
    name: ' General Query',
    messages: [{ role: 'user', content: 'Tell me about quantum computing' }],
    expectedIntent: 'general',
    expectedModel: 'deepseek-chat',
  },
  {
    name: ' Complex Coding Task',
    messages: [
      {
        role: 'user',
        content:
          'Create a full REST API with authentication, database integration, error handling, logging, and unit tests. Use Express.js and PostgreSQL.',
      },
    ],
    expectedIntent: 'coding',
    expectedModel: 'deepseek-coder',
  },
];

async function runTest(testCase) {
  console.log(`\n${colors.blue}Testing: ${testCase.name}${colors.reset}`);
  console.log(`Query: "${testCase.messages[0].content.substring(0, 60)}..."`);

  try {
    const response = await fetch(`${API_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        messages: testCase.messages,
        prefer_cost: true,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    // Check intent detection
    const intentMatch = data.intent_detected === testCase.expectedIntent;
    console.log(
      `  Intent: ${data.intent_detected} ${
        intentMatch ? colors.green + '✓' : colors.red + '✗ (expected: ' + testCase.expectedIntent + ')'
      }${colors.reset}`
    );

    // Check model selection
    const modelMatch = data.model_used === testCase.expectedModel;
    console.log(
      `  Model: ${data.model_used} ${
        modelMatch ? colors.green + '✓' : colors.red + '✗ (expected: ' + testCase.expectedModel + ')'
      }${colors.reset}`
    );

    // Check quality score
    const qualityPass = data.quality_passed;
    console.log(
      `  Quality: ${data.quality_score.toFixed(1)}/10 ${
        qualityPass ? colors.green + '✓ PASSED' : colors.yellow + '⚠ FAILED'
      }${colors.reset}`
    );

    // Show cost
    console.log(`  Cost: $${data.estimated_cost.toFixed(6)}`);
    console.log(`  Savings: $${data.savings_vs_gpt4.toFixed(6)} vs GPT-4`);

    // Show response preview
    console.log(`  Response: "${data.response.substring(0, 100)}..."`);

    return {
      success: intentMatch && modelMatch,
      intentMatch,
      modelMatch,
      qualityScore: data.quality_score,
      cost: data.estimated_cost,
    };
  } catch (error) {
    console.log(`  ${colors.red}✗ ERROR: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

async function runStreamingTest() {
  console.log(`\n${colors.blue}Testing:  Streaming Mode${colors.reset}`);

  try {
    const response = await fetch(`${API_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Count from 1 to 10' }],
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let chunks = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      chunks++;
    }

    console.log(`  ${colors.green}✓ Streaming works! Received ${chunks} chunks${colors.reset}`);
    return { success: true, chunks };
  } catch (error) {
    console.log(`  ${colors.red}✗ ERROR: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log(`${colors.yellow}
╔═══════════════════════════════════════════╗
║   LLM Cost Router Integration Tests      ║
╚═══════════════════════════════════════════╝
${colors.reset}`);

  console.log(`API URL: ${API_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 8)}...`);

  // Check if API is running
  try {
    const healthCheck = await fetch(`${API_URL}/health`);
    if (!healthCheck.ok) throw new Error('API not responding');
    console.log(`${colors.green}✓ API is running${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✗ API is not running. Start with: npm start${colors.reset}`);
    process.exit(1);
  }

  const results = [];

  // Run all test cases
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push({ name: testCase.name, ...result });
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limiting
  }

  // Run streaming test
  const streamResult = await runStreamingTest();
  results.push({ name: ' Streaming', ...streamResult });

  // Summary
  console.log(`\n${colors.yellow}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.yellow}SUMMARY${colors.reset}\n`);

  const passed = results.filter((r) => r.success).length;
  const failed = results.length - passed;

  results.forEach((result) => {
    const icon = result.success ? colors.green + '✓' : colors.red + '✗';
    console.log(`${icon} ${result.name}${colors.reset}`);
  });

  console.log(
    `\n${colors.yellow}Total: ${results.length} | Passed: ${colors.green}${passed}${colors.yellow} | Failed: ${colors.red}${failed}${colors.reset}`
  );

  const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
  const avgQuality =
    results.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / results.filter((r) => r.qualityScore).length;

  console.log(`\nTotal Cost: $${totalCost.toFixed(6)}`);
  console.log(`Average Quality Score: ${avgQuality.toFixed(1)}/10`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);
