import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { encoding_for_model } from 'tiktoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const PRICING = {
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
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

const selectModel = (complexity, preferCost) => {
  if (complexity === 'simple') {
    return preferCost ? 'gpt-4o-mini' : 'gpt-3.5-turbo';
  }
  if (complexity === 'medium') {
    return 'gpt-4o-mini';
  }
  return 'claude-3-5-sonnet';
};

const calculateCost = (model, inputTokens, outputTokens) => {
  const pricing = PRICING[model] || PRICING['gpt-3.5-turbo'];
  return (inputTokens * pricing.input) / 1000 + (outputTokens * pricing.output) / 1000;
};

const callOpenAI = async (messages, model, maxTokens, temperature) => {
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
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens,
    outputTokens: data.usage.completion_tokens,
  };
};

const callAnthropic = async (messages, model, maxTokens, temperature) => {
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

  const data = await response.json();
  return {
    content: data.content[0].text,
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
  };
};

const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.ROUTER_API_KEY || 'dev-key-123';

  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};

app.post('/api/v1/chat/completions', authMiddleware, async (req, res) => {
  try {
    const { messages, max_tokens = 1000, temperature = 0.7, prefer_cost = true } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const complexity = classifyComplexity(messages, max_tokens);
    const selectedModel = selectModel(complexity, prefer_cost);

    let result;
    if (selectedModel.includes('gpt')) {
      result = await callOpenAI(messages, selectedModel, max_tokens, temperature);
    } else {
      result = await callAnthropic(messages, selectedModel, max_tokens, temperature);
    }

    const cost = calculateCost(selectedModel, result.inputTokens, result.outputTokens);
    const gpt4Cost = calculateCost('claude-3-5-sonnet', result.inputTokens, result.outputTokens);
    const savings = Math.max(0, gpt4Cost - cost);

    res.json({
      response: result.content,
      model_used: selectedModel,
      estimated_cost: parseFloat(cost.toFixed(6)),
      tokens_used: result.inputTokens + result.outputTokens,
      savings_vs_gpt4: parseFloat(savings.toFixed(6)),
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/models/available', (req, res) => {
  res.json({
    models: Object.keys(PRICING),
    pricing: PRICING,
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on port ${PORT}`);
  console.log(`health: http://localhost:${PORT}/health`);
  console.log(`set your API keys in .env file`);
});
