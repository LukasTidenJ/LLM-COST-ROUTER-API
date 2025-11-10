# LLM Cost Router API

An intelligent AI routing API that automatically selects the most cost-effective language model based on your request's intent and complexity. Save up to **85-90% on AI API costs** while maintaining quality.

## 🚀 Why This API?

- **Massive Cost Savings**: Automatically route requests to ultra-cheap models like DeepSeek ($0.14/1M tokens)
- **9 AI Models**: Access OpenAI, Anthropic, DeepSeek, and Qwen models through one unified API
- **Intelligent Routing**: Intent detection (coding, math, creative, etc.) + complexity analysis
- **Response Caching**: 1-hour cache eliminates redundant API calls
- **Quality Scoring**: LLM-as-Judge evaluation ensures high-quality responses
- **Real-time Streaming**: Get instant token-by-token responses
- **Subscription Tiers**: From FREE (100 req/month) to ENTERPRISE (50K req/month)

## 📊 Subscription Tiers

| Tier | Monthly Requests | Premium Requests | Rate Limit | Price |
|------|-----------------|------------------|------------|-------|
| **FREE** | 100 | 0 | 20/hour | $0 |
| **BASIC** | 2,000 | 0 | 200/hour | $4.99 |
| **PRO** | 10,000 | 1,000 | 1,000/hour | $14.99 |
| **ENTERPRISE** | 50,000 | 10,000 | 5,000/hour | $49.99 |

## 🤖 Supported Models

### Standard Models (All Tiers)
| Model            | Provider  | Input Cost | Output Cost | Best For                  |
| ---------------- | --------- | ---------- | ----------- | ------------------------- |
| `deepseek-chat`  | DeepSeek  | $0.14/1M   | $0.28/1M    | Ultra-cheap general tasks |
| `deepseek-coder` | DeepSeek  | $0.14/1M   | $0.28/1M    | Code generation           |
| `qwen-turbo`     | Qwen      | $0.30/1M   | $0.60/1M    | Fast, cheap responses     |
| `qwen-plus`      | Qwen      | $0.80/1M   | $2.00/1M    | Balanced quality/cost     |
| `gpt-4o-mini`    | OpenAI    | $0.15/1M   | $0.60/1M    | Simple OpenAI tasks       |
| `gpt-3.5-turbo`  | OpenAI    | $0.50/1M   | $1.50/1M    | Standard ChatGPT          |

### Premium Models (PRO & ENTERPRISE Only)
| Model                       | Provider  | Input Cost | Output Cost | Best For                |
| --------------------------- | --------- | ---------- | ----------- | ----------------------- |
| `claude-3-5-haiku-20241022` | Anthropic | $1.00/1M   | $5.00/1M    | Fast Claude responses   |
| `claude-sonnet-4-20250514`  | Anthropic | $3.00/1M   | $15.00/1M   | High-quality reasoning  |
| `qwen-max`                  | Qwen      | $2.00/1M   | $6.00/1M    | Advanced Chinese/English|

## ⚡ Quick Start

### Installation

```bash
git clone https://github.com/LukasTidenJ/LLM-COST-ROUTER-API.git
cd LLM-COST-ROUTER-API
npm install
```

### Configuration

Create a `.env` file:
```env
PORT=8000
ROUTER_API_KEY=your-secret-key-here

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...
QWEN_API_KEY=sk-...
```

### Start Server

```bash
npm start
```

The API will be available at `http://localhost:8000`

## 📡 API Usage

### Basic Request

```bash
curl -X POST http://localhost:8000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "Explain quantum computing in simple terms"}],
    "stream": false
  }'
```

### With Streaming

```bash
curl -X POST http://localhost:8000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "Write a short story about AI"}],
    "stream": true
  }'
```

## 🔌 API Endpoints

### `POST /api/v1/chat/completions`

Main endpoint for chat completions.

**Request Body:**

```json
{
  "messages": [
    {"role": "user", "content": "Your question here"}
  ],
  "max_tokens": 4000,
  "temperature": 0.7,
  "stream": false
}
```

**Response:**

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "deepseek-chat",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "AI generated response..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 150,
    "total_tokens": 170
  },
  "cost": {
    "input_cost": 0.000002,
    "output_cost": 0.00003,
    "total_cost": 0.000032
  },
  "metadata": {
    "intent": "general",
    "complexity": "medium",
    "selected_model": "deepseek-chat",
    "cached": false,
    "quality_score": 8.5
  }
}
```

### `GET /api/v1/status`

Check API health and your subscription status.

```json
{
  "status": "ok",
  "tier": "PRO",
  "quota_remaining": 9847,
  "premium_remaining": 998,
  "rate_limit": "1000/hour"
}
```

### `GET /api/v1/cache/stats`

View cache hit/miss statistics.

### `GET /api/v1/models/available`

Get all available models and their pricing.

## 🎯 How Intelligent Routing Works

### 1. Intent Detection (7 Categories)

The API analyzes your prompt to determine the task type:

- **Coding** → Routes to `deepseek-coder` (specialized for code)
- **Math/Logic** → Routes to `deepseek-chat` (excellent reasoning)
- **Creative Writing** → Routes to Claude models (best for creativity)
- **Analysis/Reasoning** → Routes to Claude models (superior analysis)
- **Translation** → Routes to `qwen-plus` or `qwen-max` (multilingual)
- **Summarization** → Routes to cost-effective models
- **General** → Routes to most cost-effective model

### 2. Complexity Analysis

- **Low** (<500 tokens) → Cheapest models (DeepSeek, Qwen-Turbo)
- **Medium** (500-2000 tokens) → Balanced models (Qwen-Plus, GPT-4o-mini)
- **High** (>2000 tokens) → Premium models if quota available (Claude, Qwen-Max)

### 3. Quality Assurance

- All responses evaluated by LLM-as-Judge
- Low-quality responses (<7/10) trigger automatic retry with better model
- Ensures you get quality even when using cheap models

## 💰 Cost Savings Example

### Traditional Approach (GPT-4 for Everything)
- 10,000 requests/month
- Average 500 tokens per request
- Cost: **~$150-200/month**

### With LLM Cost Router
- Same 10,000 requests/month
- 60% routed to DeepSeek: $4.20
- 25% routed to Qwen: $5.00
- 15% routed to GPT/Claude: $18.00
- **Total: ~$27/month**

**Savings: 85-90%** 🎉

## 🚀 Features

### Response Caching
- 1-hour TTL for identical requests
- Eliminates redundant API calls
- Dramatically reduces costs for repeated queries

### Quality Scoring
- LLM-as-Judge evaluation (1-10 scale)
- Automatic retry with better model if quality < 7
- Ensures high-quality responses even from cheap models

### Streaming Support
- Real-time token-by-token responses
- Better user experience
- Works with all models

### Rate Limiting
- Tier-based limits prevent abuse
- 15-minute rolling windows
- Automatic 429 responses when exceeded

## 🔧 Deployment

### Prerequisites
- Node.js 16+
- API keys from providers:
  - [OpenAI](https://platform.openai.com/)
  - [Anthropic](https://console.anthropic.com/)
  - [DeepSeek](https://platform.deepseek.com/)
  - [Qwen](https://dashscope.console.aliyun.com/)

### Deploy to Render (Free Tier)

1. Create account at [Render.com](https://render.com)
2. Create new Web Service, connect your GitHub repo
3. Set environment variables in Render dashboard
4. Deploy!

### RapidAPI Integration

This API is available on RapidAPI Marketplace:
- **Marketplace URL**: [Coming Soon]
- **Category**: AI/Machine Learning
- **Highlight**: Save up to 90% on AI API costs

## � Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 8000) | No |
| `ROUTER_API_KEY` | Your API authentication key | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key | Yes |
| `DEEPSEEK_API_KEY` | DeepSeek API key | Yes |
| `QWEN_API_KEY` | Qwen API key | Yes |

## 🎯 Use Cases

- **Chatbots**: Reduce AI costs for customer support bots by 85%+
- **Content Generation**: Smart routing for different content types
- **Code Assistance**: Automatic selection of specialized coding models
- **Research**: Cost-effective analysis and summarization
- **Education**: Affordable AI tutoring and learning assistance
- **Data Analysis**: Handle large datasets with cost-optimized models

## 🔒 Security

- API key authentication on every request
- Rate limiting prevents abuse
- Environment variables keep secrets secure
- No data stored or logged permanently
- All requests are ephemeral

## 📈 Monitoring Your Usage

Check your usage with the `/status` endpoint:

```bash
curl -H "x-api-key: your-key" http://localhost:8000/api/v1/status
```

Response includes:
- Current subscription tier
- Request quota remaining
- Premium request quota
- Rate limit status
- Monthly reset date

## 💬 Support Levels

- **FREE**: Community support via GitHub Issues
- **BASIC**: Email support (24-48h response)
- **PRO**: Priority email support (12-24h response)
- **ENTERPRISE**: Dedicated support channel

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## � License

MIT License - feel free to use this project for personal or commercial purposes.

## 🔗 Links

- **GitHub**: https://github.com/LukasTidenJ/LLM-COST-ROUTER-API
- **RapidAPI**: [Coming Soon]
- **Issues**: https://github.com/LukasTidenJ/LLM-COST-ROUTER-API/issues

---

Built with ❤️ by [LukasTidenJ](https://github.com/LukasTidenJ)

**Made possible by**: OpenAI, Anthropic, DeepSeek, and Qwen 🚀
