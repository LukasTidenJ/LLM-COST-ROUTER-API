# Test Cases for LLM Cost Router

Copy these test queries into your test-client.html to see the smart routing in action!

##  Coding Intent Tests

**Should route to: deepseek-coder**

1. "Write a Python function to reverse a string"
2. "Debug this JavaScript code: function add(a,b) { return a + b }"
3. "Create a REST API endpoint for user authentication"
4. "How do I implement a binary search algorithm?"
5. "Write SQL query to join users and orders tables"
6. "Refactor this React component to use hooks"
7. "Explain how async/await works in JavaScript"

Expected: Intent = coding, Model = deepseek-coder

---

##  Math Intent Tests

**Should route to: deepseek-chat**

1. "Calculate the average of 45, 67, 89, and 23"
2. "What is 15% of 250?"
3. "Solve this equation: 2x + 5 = 15"
4. "Find the probability of rolling two dice and getting a sum of 7"
5. "Calculate compound interest on $1000 at 5% for 3 years"

Expected: Intent = math, Model = deepseek-chat

---

##  Simple Q&A Tests

**Should route to: deepseek-chat**

1. "What is the capital of France?"
2. "Who is the president of the United States?"
3. "Define photosynthesis"
4. "What is the meaning of 'serendipity'?"
5. "When did World War 2 end?"

Expected: Intent = simple-qa, Model = deepseek-chat

---

## 🎨 Creative Writing Tests

**Should route to: qwen-plus (prefer_cost=true) or claude-3-5-sonnet (prefer_cost=false)**

1. "Write a short story about a robot learning to love"
2. "Write a haiku about autumn leaves"
3. "Create a dialogue between a detective and a suspect"
4. "Write a poem about the ocean"
5. "Write song lyrics about heartbreak"

Expected: Intent = creative, Model = qwen-plus or claude-3-5-sonnet

---

##  Translation Tests

**Should route to: qwen-turbo**

1. "Translate 'Hello, how are you?' to Spanish"
2. "What is 'Thank you' in French?"
3. "Translate this sentence to German: The weather is beautiful today"
4. "How do you say 'Good morning' in Japanese?"

Expected: Intent = translation, Model = qwen-turbo

---

##  Analysis Tests

**Should route to: qwen-plus or claude-3-5-sonnet**

1. "Compare the advantages and disadvantages of React vs Vue"
2. "Analyze the pros and cons of remote work"
3. "Evaluate the differences between SQL and NoSQL databases"
4. "Research the impact of AI on job markets"
5. "Examine the benefits of meditation"

Expected: Intent = analysis, Model = qwen-plus or claude-3-5-sonnet

---

##  General Tests

**Should route based on complexity**

Short (simple complexity → deepseek-chat):

1. "Tell me about cats"
2. "Explain gravity"
3. "What is AI?"

Medium (medium complexity → qwen-turbo):

1. "Explain how machine learning works and give examples of real-world applications"
2. "What are the main causes of climate change and what can we do about it?"

Long (complex complexity → qwen-plus):

1. "Write a comprehensive guide to starting a small business including legal requirements, funding options, marketing strategies, and common pitfalls to avoid. Also include case studies and actionable tips."

Expected: Intent = general, Model varies by complexity

---

##  Edge Cases

**Multi-word intent triggers:**

1. "write a story about a detective" → creative
2. "what is the difference between Java and JavaScript?" → analysis
3. "debug my python code that calculates fibonacci" → coding

**Mixed intents (should pick strongest signal):**

1. "Write Python code to calculate the Fibonacci sequence" → coding (code overrides math)
2. "Translate this code comment to Spanish: # Calculate sum" → coding (code overrides translation)

**Case insensitive:**

1. "WRITE A FUNCTION TO SORT AN ARRAY" → coding
2. "Calculate THE AVERAGE" → math

---

##  Quality Score Tests

Try these to see different quality scores:

**Should score high (8-10):**

- Clear, specific questions with good answers
- "Explain how photosynthesis works"
- "Write a function to sort an array in Python"

**Might score lower (6-7):**

- Vague questions
- "Tell me stuff"
- "What do you think?"

**Should fail quality check (<7):**

- Nonsense questions
- "asdfghjkl"
- "123 456 789"

---

##  Streaming Test

Enable streaming in the UI and try:

1. "Count from 1 to 100"
2. "Write a story about a journey"
3. "Explain quantum physics in detail"

You should see tokens appearing in real-time!

---

##  Cost Optimization Tests

**Compare prefer_cost=true vs false:**

Toggle "Prefer Cost Savings" on/off and ask the same question:

- "Write a creative story about space exploration"
  - ON: Should use qwen-plus (~$0.80/1M)
  - OFF: Should use claude-3-5-sonnet (~$9/1M)

---

##  Test Strategy:

1. Run unit tests: `node test.js`
2. Start API: `npm start`
3. Run integration tests: `node integration-test.js`
4. Manual testing: Open `test-client.html` and try examples above
5. Check the "Intent" and "Model Used" stats to verify routing
6. Monitor "Quality Score" to see evaluation in action
7. Compare costs to verify savings

Expected behavior:

- ✅ Intent correctly detected
- ✅ Cheapest appropriate model selected
- ✅ Quality score 7+ (passed)
- ✅ Significant cost savings shown
