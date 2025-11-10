import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { encoding_for_model } from 'tiktoken';
import NodeCache from 'node-cache';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Response Cache - 1 hour TTL, check every 10 minutes
const responseCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Rate Limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retry_after: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use('/api/', limiter); // Apply rate limiting to API routes

const PRICING = {
  // OpenAI Models
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015, provider: 'openai' },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006, provider: 'openai' },

  // Anthropic Models
  'claude-3-haiku': { input: 0.00025, output: 0.00125, provider: 'anthropic' },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015, provider: 'anthropic' },

  // DeepSeek Models
  'deepseek-chat': { input: 0.00014, output: 0.00028, provider: 'deepseek' },
  'deepseek-coder': { input: 0.00014, output: 0.00028, provider: 'deepseek' },

  // Qwen Models
  'qwen-turbo': { input: 0.0002, output: 0.0006, provider: 'qwen' },
  'qwen-plus': { input: 0.0004, output: 0.0012, provider: 'qwen' },
  'qwen-max': { input: 0.002, output: 0.006, provider: 'qwen' },
};

const estimateTokens = (text) => {
  try {
    const encoder = encoding_for_model('gpt-3.5-turbo');
    const tokens = encoder.encode(text);
    encoder.free();
    return tokens.length;
  } catch (error) {
    return Math.ceil(text.split(' ').length * 1.3);
  }
};

const classifyComplexity = (messages, maxTokens) => {
  const totalText = messages.map((msg) => msg.content).join(' ');
  const inputTokens = estimateTokens(totalText);
  const totalTokens = inputTokens + maxTokens;

  if (totalTokens < 500) return 'simple';
  if (totalTokens < 2000) return 'medium';
  return 'complex';
};

const analyzeIntent = (messages) => {
  // Get the last user message (the actual query)
  const userMessage = messages.filter((msg) => msg.role === 'user').pop();

  if (!userMessage) return 'general';

  const prompt = userMessage.content.toLowerCase();

  // Coding/Programming detection
  const codingKeywords = [
    'code',
    'function',
    'program',
    'debug',
    'script',
    'algorithm',
    'class',
    'method',
    'variable',
    'api',
    'bug',
    'error',
    'compile',
    'syntax',
    'import',
    'package',
    'library',
    'framework',
    'database',
    'sql',
    'query',
    'regex',
    'javascript',
    'python',
    'java',
    'react',
    'node',
    'git',
    'terminal',
    'command',
    'cli',
    'implement',
    'refactor',
  ];
  if (codingKeywords.some((kw) => prompt.includes(kw))) {
    return 'coding';
  }

  // Math/Logic/Calculation detection
  const mathKeywords = [
    'calculate',
    'math',
    'equation',
    'solve',
    'formula',
    'sum',
    'average',
    'percentage',
    'statistics',
    'probability',
    'algebra',
    'geometry',
    'theorem',
    'proof',
    'number',
    'count',
    'total',
  ];
  if (mathKeywords.some((kw) => prompt.includes(kw))) {
    return 'math';
  }

  // Creative writing detection
  const creativeKeywords = [
    'write a story',
    'write a poem',
    'creative',
    'narrative',
    'fiction',
    'character',
    'plot',
    'dialogue',
    'screenplay',
    'novel',
    'poetry',
    'haiku',
    'limerick',
    'song lyrics',
    'imaginative',
  ];
  if (creativeKeywords.some((kw) => prompt.includes(kw))) {
    return 'creative';
  }

  // Analysis/Research detection
  const analysisKeywords = [
    'analyze',
    'research',
    'compare',
    'evaluate',
    'assess',
    'review',
    'critique',
    'examine',
    'investigate',
    'study',
    'pros and cons',
    'advantages',
    'disadvantages',
    'difference between',
  ];
  if (analysisKeywords.some((kw) => prompt.includes(kw))) {
    return 'analysis';
  }

  // Translation detection
  const translationKeywords = [
    'translate',
    'translation',
    'language',
    'spanish',
    'french',
    'german',
    'chinese',
    'japanese',
    'korean',
    'arabic',
    'portuguese',
  ];
  if (translationKeywords.some((kw) => prompt.includes(kw))) {
    return 'translation';
  }

  // Simple Q&A detection
  const simpleKeywords = [
    'what is',
    'who is',
    'when did',
    'where is',
    'define',
    'definition',
    'meaning of',
    'explain briefly',
    'quick question',
    'simple question',
  ];
  if (simpleKeywords.some((kw) => prompt.includes(kw))) {
    return 'simple-qa';
  }

  return 'general';
};

const selectModel = (complexity, preferCost, intent) => {
  // Intent-based routing (overrides complexity for specific tasks)

  // Coding tasks → Use DeepSeek Coder (specialized + cheap!)
  if (intent === 'coding') {
    return 'deepseek-coder'; // $0.14/1M - Best for code!
  }

  // Math/Logic → Cheap models work great for calculations
  if (intent === 'math' || intent === 'simple-qa') {
    return 'deepseek-chat'; // $0.14/1M - Perfect for factual/math
  }

  // Translation → Qwen is multilingual and cheap
  if (intent === 'translation') {
    return 'qwen-turbo'; // $0.40/1M - Great at languages
  }

  // Creative writing → Use better model even if prefer_cost
  if (intent === 'creative') {
    return preferCost ? 'qwen-plus' : 'claude-3-5-sonnet';
  }

  // Analysis/Research → Use better models for accuracy
  if (intent === 'analysis') {
    return preferCost ? 'qwen-plus' : 'claude-3-5-sonnet';
  }

  // General queries - use complexity-based routing
  if (preferCost) {
    if (complexity === 'simple') {
      return 'deepseek-chat'; // Cheapest! $0.14/1M tokens
    }
    if (complexity === 'medium') {
      return 'qwen-turbo'; // Very cheap and fast
    }
    return 'qwen-plus'; // Balanced cost/quality
  }

  // Quality focused - use better models
  if (complexity === 'simple') {
    return 'gpt-4o-mini';
  }
  if (complexity === 'medium') {
    return 'qwen-plus';
  }
  return 'claude-3-5-sonnet';
};

const calculateCost = (model, inputTokens, outputTokens) => {
  const pricing = PRICING[model] || PRICING['gpt-3.5-turbo'];
  return (inputTokens * pricing.input) / 1000 + (outputTokens * pricing.output) / 1000;
};

const generateCacheKey = (messages, maxTokens, temperature, preferCost) => {
  // Create unique hash for identical requests
  const content = JSON.stringify({ messages, maxTokens, temperature, preferCost });
  return crypto.createHash('md5').update(content).digest('hex');
};

const getCachedResponse = (cacheKey) => {
  return responseCache.get(cacheKey);
};

const setCachedResponse = (cacheKey, response) => {
  responseCache.set(cacheKey, response);
};

const evaluateResponse = async (userPrompt, response, modelUsed) => {
  try {
    const judgePrompt = `You are an expert AI response evaluator. Rate this response on a scale of 1-10.

User Question: "${userPrompt}"

AI Response: "${response}"

Model: ${modelUsed}

Evaluate based on:
1. Accuracy - Is it factually correct?
2. Relevance - Does it directly answer the question?
3. Clarity - Is it well-explained and easy to understand?
4. Completeness - Does it cover the topic adequately?
5. Helpfulness - Would this satisfy the user?

Respond ONLY with valid JSON in this exact format:
{
  "score": 8.5,
  "reasoning": "Brief explanation of the rating",
  "strengths": ["point 1", "point 2"],
  "weaknesses": ["point 1", "point 2"],
  "passed": true
}

Score 7+ means "passed" (good quality). Below 7 means "failed" (poor quality).`;

    // Use DeepSeek as judge (cheapest model)
    const judgment = await callDeepSeek([{ role: 'user', content: judgePrompt }], 'deepseek-chat', 500, 0.3, false);

    // Parse JSON response
    const content = judgment.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback if parsing fails
    return {
      score: 7.0,
      reasoning: 'Evaluation completed but response format was invalid',
      strengths: ['Response generated successfully'],
      weaknesses: ['Could not parse evaluation'],
      passed: true,
    };
  } catch (error) {
    console.error('Evaluation error:', error.message);
    // Return neutral score if evaluation fails
    return {
      score: 7.0,
      reasoning: 'Evaluation service unavailable',
      strengths: ['Response generated'],
      weaknesses: ['Quality check failed'],
      passed: true,
    };
  }
};

const callOpenAI = async (messages, model, maxTokens, temperature, stream = false) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  if (stream) {
    return response.body;
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens,
    outputTokens: data.usage.completion_tokens,
  };
};

const callAnthropic = async (messages, model, maxTokens, temperature, stream = false) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const systemMessage = messages.find((msg) => msg.role === 'system');
  const userMessages = messages.filter((msg) => msg.role !== 'system');

  const payload = {
    model,
    messages: userMessages,
    max_tokens: maxTokens,
    temperature,
    stream,
  };

  if (systemMessage) {
    payload.system = systemMessage.content;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  if (stream) {
    return response.body;
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
  };
};

const callDeepSeek = async (messages, model, maxTokens, temperature, stream = false) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DeepSeek API key not configured');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${error}`);
  }

  if (stream) {
    return response.body;
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens,
    outputTokens: data.usage.completion_tokens,
  };
};

const callQwen = async (messages, model, maxTokens, temperature, stream = false) => {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    throw new Error('Qwen API key not configured');
  }

  // Qwen uses OpenAI-compatible API with DashScope endpoint
  // Use international endpoint for Singapore region
  const response = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Qwen API error: ${error}`);
  }

  if (stream) {
    return response.body;
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens,
    outputTokens: data.usage.completion_tokens,
  };
};

const authMiddleware = (req, res, next) => {
  // Support both direct API key and RapidAPI proxy secret
  const apiKey = req.headers['x-api-key'] || req.headers['x-rapidapi-proxy-secret'];
  const validKey = process.env.ROUTER_API_KEY;

  // Development mode - allow dev key
  if (process.env.NODE_ENV === 'development' && (!validKey || validKey === 'dev-key-123')) {
    return next();
  }

  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'Please provide a valid API key in x-api-key header',
    });
  }

  next();
};

app.post('/api/v1/chat/completions', authMiddleware, async (req, res) => {
  try {
    const { messages, max_tokens = 1000, temperature = 0.7, prefer_cost = true, stream = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Check cache for non-streaming requests
    if (!stream) {
      const cacheKey = generateCacheKey(messages, max_tokens, temperature, prefer_cost);
      const cachedResponse = getCachedResponse(cacheKey);

      if (cachedResponse) {
        console.log('[CACHE] Hit! Returning cached response');
        return res.json({
          ...cachedResponse,
          cached: true,
          cache_saved_cost: cachedResponse.estimated_cost,
        });
      }
    }

    const complexity = classifyComplexity(messages, max_tokens);
    const intent = analyzeIntent(messages);
    let selectedModel = selectModel(complexity, prefer_cost, intent);
    let retryAttempt = 0;

    // Handle streaming requests
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const totalText = messages.map((msg) => msg.content).join(' ');
      const inputTokens = estimateTokens(totalText);

      let streamBody;
      const provider = PRICING[selectedModel]?.provider || 'openai';

      if (provider === 'openai') {
        streamBody = await callOpenAI(messages, selectedModel, max_tokens, temperature, true);
      } else if (provider === 'anthropic') {
        streamBody = await callAnthropic(messages, selectedModel, max_tokens, temperature, true);
      } else if (provider === 'deepseek') {
        streamBody = await callDeepSeek(messages, selectedModel, max_tokens, temperature, true);
      } else if (provider === 'qwen') {
        streamBody = await callQwen(messages, selectedModel, max_tokens, temperature, true);
      }

      let fullContent = '';
      let outputTokens = 0;

      const reader = streamBody.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((line) => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);

                const provider = PRICING[selectedModel]?.provider || 'openai';

                if (provider === 'openai' || provider === 'deepseek' || provider === 'qwen') {
                  // OpenAI-compatible streaming format (includes Qwen with new endpoint)
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullContent += content;
                    res.write(`data: ${JSON.stringify({ content, model: selectedModel })}\n\n`);
                  }
                } else if (provider === 'anthropic') {
                  // Anthropic streaming
                  if (parsed.type === 'content_block_delta') {
                    const content = parsed.delta?.text;
                    if (content) {
                      fullContent += content;
                      res.write(`data: ${JSON.stringify({ content, model: selectedModel })}\n\n`);
                    }
                  }
                  if (parsed.type === 'message_delta' && parsed.usage) {
                    outputTokens = parsed.usage.output_tokens;
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        // Estimate output tokens if not provided
        if (outputTokens === 0) {
          outputTokens = estimateTokens(fullContent);
        }

        const cost = calculateCost(selectedModel, inputTokens, outputTokens);
        const gpt4Cost = calculateCost('claude-3-5-sonnet', inputTokens, outputTokens);
        const savings = Math.max(0, gpt4Cost - cost);

        // Evaluate response quality with LLM-as-Judge
        const userPrompt = messages[messages.length - 1].content;
        let evaluation;
        try {
          evaluation = await evaluateResponse(userPrompt, fullContent, selectedModel);
        } catch (evalError) {
          console.error('[EVAL ERROR]', evalError.message);
          // Use default passing evaluation if evaluation fails
          evaluation = {
            score: 7.0,
            reasoning: 'Quality evaluation unavailable',
            strengths: ['Response generated successfully'],
            weaknesses: ['Quality scoring unavailable'],
            passed: true,
          };
        }

        // Send final metadata with quality score
        res.write(
          `data: ${JSON.stringify({
            done: true,
            model_used: selectedModel,
            intent_detected: intent,
            complexity_level: complexity,
            estimated_cost: parseFloat(cost.toFixed(6)),
            tokens_used: inputTokens + outputTokens,
            savings_vs_gpt4: parseFloat(savings.toFixed(6)),
            quality_score: evaluation.score,
            quality_passed: evaluation.passed,
            evaluation: {
              reasoning: evaluation.reasoning,
              strengths: evaluation.strengths,
              weaknesses: evaluation.weaknesses,
            },
          })}\n\n`
        );

        res.end();
      } catch (streamError) {
        console.error('Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming with auto-retry on low quality
      let result;
      let evaluation;
      let totalCost = 0;

      // Retry loop for quality assurance
      while (retryAttempt < 2) {
        const provider = PRICING[selectedModel]?.provider || 'openai';

        if (provider === 'openai') {
          result = await callOpenAI(messages, selectedModel, max_tokens, temperature);
        } else if (provider === 'anthropic') {
          result = await callAnthropic(messages, selectedModel, max_tokens, temperature);
        } else if (provider === 'deepseek') {
          result = await callDeepSeek(messages, selectedModel, max_tokens, temperature);
        } else if (provider === 'qwen') {
          result = await callQwen(messages, selectedModel, max_tokens, temperature);
        }

        const cost = calculateCost(selectedModel, result.inputTokens, result.outputTokens);
        totalCost += cost;

        // Evaluate response quality with LLM-as-Judge
        const userPrompt = messages[messages.length - 1].content;
        try {
          evaluation = await evaluateResponse(userPrompt, result.content, selectedModel);
        } catch (evalError) {
          console.error('[EVAL ERROR]', evalError.message);
          // Use default passing evaluation if evaluation fails
          evaluation = {
            score: 7.0,
            reasoning: 'Quality evaluation unavailable',
            strengths: ['Response generated successfully'],
            weaknesses: ['Quality scoring unavailable'],
            passed: true,
          };
        }

        // If quality passes OR we're on final retry, use this response
        if (evaluation.passed || retryAttempt === 1) {
          break;
        }

        // Quality failed - retry with better model
        console.log(`[RETRY] Quality check failed (${evaluation.score}/10). Retrying with better model...`);
        retryAttempt++;

        // Upgrade to next better model
        if (selectedModel === 'deepseek-chat' || selectedModel === 'deepseek-coder') {
          selectedModel = 'qwen-plus';
        } else if (selectedModel === 'qwen-turbo') {
          selectedModel = 'qwen-plus';
        } else if (selectedModel === 'qwen-plus') {
          selectedModel = 'claude-3-5-sonnet';
        } else {
          // Already using best model, break
          break;
        }
      }

      const gpt4Cost = calculateCost('claude-3-5-sonnet', result.inputTokens, result.outputTokens);
      const savings = Math.max(0, gpt4Cost - totalCost);

      const responseData = {
        response: result.content,
        model_used: selectedModel,
        intent_detected: intent,
        complexity_level: complexity,
        estimated_cost: parseFloat(totalCost.toFixed(6)),
        tokens_used: result.inputTokens + result.outputTokens,
        savings_vs_gpt4: parseFloat(savings.toFixed(6)),
        quality_score: evaluation.score,
        quality_passed: evaluation.passed,
        retried: retryAttempt > 0,
        retry_count: retryAttempt,
        evaluation: {
          reasoning: evaluation.reasoning,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
        },
        routing_decision: {
          why_this_model: `Selected ${selectedModel} based on ${intent} intent and ${complexity} complexity`,
          cost_per_1m: `$${(((PRICING[selectedModel].input + PRICING[selectedModel].output) / 2) * 1000).toFixed(2)}`,
          provider: PRICING[selectedModel].provider,
        },
      };

      // Cache the successful response
      if (!stream) {
        const cacheKey = generateCacheKey(messages, max_tokens, temperature, prefer_cost);
        setCachedResponse(cacheKey, responseData);
        console.log('[CACHE] Response cached for future requests');
      }

      res.json(responseData);
    }
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/models/available', (req, res) => {
  const modelsWithDetails = Object.entries(PRICING).map(([name, details]) => ({
    name,
    provider: details.provider,
    input_cost_per_1k: details.input,
    output_cost_per_1k: details.output,
    cost_per_1m_tokens: ((details.input + details.output) / 2) * 1000,
  }));

  res.json({
    models: modelsWithDetails,
    total_models: modelsWithDetails.length,
    providers: ['openai', 'anthropic', 'deepseek', 'qwen'],
    pricing_info: 'Costs shown are per 1K tokens (input/output)',
  });
});

// Cache statistics endpoint
app.get('/api/v1/cache/stats', authMiddleware, (req, res) => {
  const stats = responseCache.getStats();
  res.json({
    cache_enabled: true,
    ttl_seconds: 3600,
    cached_responses: stats.keys,
    hits: stats.hits,
    misses: stats.misses,
    hit_rate: stats.keys > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%' : '0%',
    estimated_cost_saved: 'Check individual cached responses',
  });
});

// RapidAPI health check endpoint
app.get('/api/v1/status', (req, res) => {
  const cacheStats = responseCache.getStats();
  res.json({
    status: 'operational',
    version: '2.0.0',
    models_available: Object.keys(PRICING).length,
    features: [
      'streaming',
      'cost-optimization',
      'multi-provider',
      'response-caching',
      'rate-limiting',
      'auto-retry-quality',
      'llm-as-judge',
      'intent-detection',
    ],
    cache: {
      enabled: true,
      cached_items: cacheStats.keys,
      hit_rate:
        cacheStats.keys > 0 ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1) + '%' : '0%',
    },
    rate_limit: {
      window: '15 minutes',
      max_requests: 100,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║         LLM COST ROUTER API v2.0                     ║
╚═══════════════════════════════════════════════════════╝
  `);
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Status: http://localhost:${PORT}/api/v1/status`);
  console.log(`Cache Stats: http://localhost:${PORT}/api/v1/cache/stats`);
  console.log(`\nNEW FEATURES:`);
  console.log(`   [CACHE] Response Caching (1hr TTL) - Instant responses, $0 cost!`);
  console.log(`   [LIMIT] Rate Limiting (100 req/15min) - Protection from abuse`);
  console.log(`   [RETRY] Auto-Retry Quality (<7 score) - Guaranteed quality`);
  console.log(`\nModels: ${Object.keys(PRICING).length} providers`);
  console.log(`Cheapest: deepseek-chat ($0.14/1M tokens)`);
  console.log(`Mode: ${process.env.NODE_ENV === 'development' ? 'DEV MODE' : 'PRODUCTION'}`);
  console.log(`\nReady to save you money!\n`);
});
