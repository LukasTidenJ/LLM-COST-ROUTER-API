# LLM Cost Router API

Smart AI routing that saves **40-60% on AI costs** by automatically selecting the most cost-effective model for your queries.

## Why This API?

- **Massive Cost Savings**: Automatically route simple queries to ultra-cheap models like DeepSeek ($0.14/1M tokens)
- **8 Premium Models**: Access OpenAI, Anthropic, DeepSeek, and Qwen models through one API
- **Real-time Streaming**: Get instant token-by-token responses
- **Smart Routing**: Complexity-based model selection ensures quality while minimizing costs
- **Transparent Pricing**: See exactly how much you save vs GPT-4 on every request

## Supported Models

| Model            | Provider  | Cost (per 1M tokens) | Best For                  |
| ---------------- | --------- | -------------------- | ------------------------- |
| `deepseek-chat`  | DeepSeek  | $0.14                | Ultra-cheap general tasks |
| `deepseek-coder` | DeepSeek  | $0.14                | Code generation           |
| `qwen-turbo`     | Alibaba   | $0.40                | Fast, cheap responses     |
| `qwen-plus`      | Alibaba   | $0.80                | Balanced quality/cost     |
| `qwen-max`       | Alibaba   | $4.00                | High quality tasks        |
| `gpt-4o-mini`    | OpenAI    | $0.38                | Simple OpenAI tasks       |
| `gpt-3.5-turbo`  | OpenAI    | $1.00                | Standard ChatGPT          |
| `claude-3-haiku` | Anthropic | $0.69                | Fast Claude responses     |

## Quick Start

### Installation

```bash
npm install
cp .env.example .env
# Add your API keys to .env
npm start
```

### Basic Usage

```bash
curl -X POST http://localhost:8000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "Explain quantum computing"}],
    "prefer_cost": true,
    "stream": false
  }'
```

### With Streaming

```bash
curl -X POST http://localhost:8000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "Write a story"}],
    "stream": true
  }'
```

## API Endpoints

### `POST /api/v1/chat/completions`

Main endpoint for chat completions.

**Request Body:**

```json
{
  "messages": [{ "role": "user", "content": "Your question here" }],
  "max_tokens": 1000,
  "temperature": 0.7,
  "prefer_cost": true,
  "stream": false
}
```

**Response:**

```json
{
  "response": "AI generated response...",
  "model_used": "deepseek-chat",
  "estimated_cost": 0.000042,
  "tokens_used": 150,
  "savings_vs_gpt4": 0.000358
}
```

### `GET /api/v1/models/available`

Get all available models and pricing.

### `GET /api/v1/status`

Health check and API status.

## Smart Routing Logic

The API automatically selects the best model based on:

1. **Task Complexity**: Analyzes token count to classify as simple/medium/complex
2. **Cost Preference**: Routes to cheapest model when `prefer_cost: true`
3. **Quality Requirements**: Uses better models for complex tasks

**Example Routing:**

- Simple query (< 500 tokens) + prefer_cost → `deepseek-chat` ($0.14/1M)
- Medium query (< 2000 tokens) + prefer_cost → `qwen-turbo` ($0.40/1M)
- Complex query (> 2000 tokens) + prefer_cost → `qwen-plus` ($0.80/1M)

## Cost Savings Example

**Your costs WITHOUT this API:**

- 100K requests to GPT-4: ~$300
- 100K requests to GPT-3.5-turbo: ~$100

**With Smart Routing:**

- 70% simple queries → DeepSeek: $1.40
- 20% medium queries → Qwen: $1.60
- 10% complex queries → Claude/Qwen: $8.00
- **Total: ~$11** (89% savings!) 🎉

## 🚀 Deploying to RapidAPI

1. **Get API Keys**: Sign up for DeepSeek and Qwen (both have free tiers)
   - DeepSeek: https://platform.deepseek.com/
   - Qwen: https://dashscope.console.aliyun.com/

2. **Set Environment Variables** in your hosting provider:

   ```
   ROUTER_API_KEY=your-secret-key
   DEEPSEEK_API_KEY=sk-xxx
   QWEN_API_KEY=sk-xxx
   ```

3. **Deploy** to Railway, Render, or any Node.js host

4. **List on RapidAPI**:
   - Category: AI/Machine Learning
   - Highlight: "Save 40-60% on AI costs"
   - Pricing tiers: Basic ($9.99), Pro ($49.99), Ultra ($199)

## 🔧 Environment Variables

```env
PORT=8000
NODE_ENV=production
ROUTER_API_KEY=your-secure-key
DEEPSEEK_API_KEY=sk-xxx
QWEN_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx (optional)
ANTHROPIC_API_KEY=sk-xxx (optional)
```

## 📊 Test Client

Open `test-client.html` in your browser to test the API with a beautiful UI:

- Toggle streaming on/off
- See real-time cost calculations
- Compare model performance
- View savings analytics

## 🎨 Features

✅ 8 AI models from 4 providers  
✅ Real-time streaming responses  
✅ Automatic cost optimization  
✅ Multi-provider fallback  
✅ RapidAPI ready  
✅ Usage analytics  
✅ Beautiful test client

## 📈 Recommended RapidAPI Pricing

**Free Tier**: 100 requests/month (Hook them!)  
**Basic ($9.99/mo)**: 10K requests, DeepSeek + Qwen only  
**Pro ($49.99/mo)**: 100K requests, all models  
**Ultra ($199/mo)**: Unlimited, priority routing

Your profit margin: Charge $0.001/request, your cost: $0.0002 = **80% profit** 💰

## 📝 License

MIT

## 🤝 Support

Questions? Open an issue or reach out!

---

**Pro tip**: With DeepSeek costing only $0.14 per million tokens, even a small markup makes this insanely profitable. Your 40-60% savings vs GPT-4 becomes YOUR profit margin! 🚀
