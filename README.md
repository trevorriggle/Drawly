# Drawly (skeleton)

Deploy-ready Next.js + TypeScript app with:
- Minimal raster canvas (brush/pencil/eraser)
- Tool registry + state via context
- Icon Registry Provider to swap custom icon packs
- Panels (Color, Layers)
- Supabase client wiring
- /api/health endpoint

## How this product will work fundamentally

Hey there! Ready to draw? To give the best feedback, please answer these questions!

1. What are you drawing today?
2. What style are you going for?
3. Are you inspired by any artists?
4. What techniques are you planning on implementing?
5. Is there a specific area you want feedback on?
6. Lastly, is there any additional context you'd like me to have?

User fills out field, and completes drawing. User indicates drawing is complete and ready for feedback.

Initiates 2 OpenAI API calls:
1. Visual analysis of drawing.
2. You are Drawly, the friendly drawing coach. Today, the user is drawing __. They're attempting the __ style. They are inspired by __. They will be using __ technique(s). They want feedback on __. The user also wants you to understand __. You'll be providing detailed feedback on their drawing. Focus on specifics, as requested in the prompt. Be encouraging and friendly. Provide the best possible feedback, focusing on improving the individuals artistic skills. Focus on detail, as the quality of the work is the culmination of the many small details. Slip in a small, friendly joke, NEVER at user's expense.

Bam- the drawly icon you move begins giving the feedback, complete with animations, like he's "talking". Click him to expand or contract his feedback. I even could see there being a microphone access that gives him or her a text to speak voice.

## Context: Previous Project - Lynk

### Overview
Lynk is a custom-built AI routing and orchestration system created by Trevor Riggle in 2024–2025. Its primary goal is to act as an intelligent traffic controller for multiple large language models (LLMs), enabling unified and cost-efficient AI experiences. While Drawly is designed to serve artists, Lynk was built to serve developers and power-users managing diverse AI models.

### Core Functionality

**Multi-Model Routing**: Lynk dynamically routes user prompts to OpenAI, Anthropic (Claude), Google Gemini, and xAI, choosing the best model based on context, tier, or token limits.

**Tiered Identity & Quotas**: It enforces tier-based quotas (FREE_GUEST, FREE_VERIFIED, PRO) and injects identity context ("You are Lynk") so each model responds consistently.

**Token-Aware History**: Maintains token-budgeted chat histories per session for efficiency and predictable costs.

**Image + Vision Support**: Handles multi-modal prompts (text and images) with proper routing to models that support vision.

**Live Notes & Suggestions**: Periodically saves snapshots of user sessions to generate "smart suggestions" and better continuity.

### Why It Matters
Lynk represents a real-world testbed for orchestrating multiple AI providers at scale. Its design choices—like minimizing prompt overhead, dynamically swapping models, and exposing a stable API to clients—directly influenced how Drawly is being architected. It's essentially the "infrastructure skeleton" from which Drawly's creative tools are now emerging.

### Key Design Principles

**Model Agnostic**: Lynk treats each model as a "node" in a graph, enabling modular swaps and upgrades.

**Identity Injection**: Keeps the "You are Lynk" system prompt consistent, which became the basis for Drawly's "You are Drawly" personality layer.

**Quota & Cost Control**: Designed to make free tiers sustainable while allowing power users to pay for premium access.

**Minimal Latency**: Balances model choice with speed so users don't feel "lag" switching between providers.

### Relationship to Drawly
Drawly succeeds Lynk as the main active project but inherits its lessons:

**Routing Efficiency**: Drawly can eventually use Lynk-style orchestration for real-time critique and corrections.

**Tier Handling**: Lynk's tier system inspired Drawly's free vs. paid features.

**Session Intelligence**: Lynk's live notes evolved into Drawly's skill tracking and personalized coaching.

### Status
Lynk is currently maintained as a live case study and internal tool. Drawly builds upon it but is focused on the creative market (artists first, AI second). Lynk remains available for experimentation, stress tests, and integration with new LLMs.

### Elevator Pitch
Think of Lynk as the AI equivalent of a traffic exchange and load balancer—but for prompts, responses, and vision data—built to experiment with multi-model orchestration. Drawly is the creative application born out of this infrastructure.

## Dev

```bash
pnpm i
pnpm dev
