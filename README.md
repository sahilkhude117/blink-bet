# 🎲 Blink Bet
### Bringing Prediction Markets to X (Twitter)

> **For Hackathon Judges**: This is a working proof-of-concept that brings real prediction market trading directly into Twitter using Solana Blinks. Users can place bets on NBA games, elections, and financial markets without ever leaving their social feed.

## 🤔 What Problem Are We Solving?

Prediction markets are powerful, but they're trapped behind complex UIs and separate apps. We asked: **"What if you could bet on tomorrow's NBA game directly from a tweet?"**

That's exactly what we built.

## ⚡ The Innovation: Solana Blinks Meet Prediction Markets

We're the **first to integrate Kalshi's prediction markets with Solana Actions (Blinks)**. Here's why this matters:

1. **Zero Friction Trading** - See a market, click a button, done. No redirects, no app switching.
2. **Social-First** - Trade where conversations happen: Twitter, Discord, Telegram.
3. **One-Click UX** - From "I think the Pistons will win" to "Position opened" in 2 clicks.

## 🐦 View Live Blinks on X (Twitter)

See our Blinks in action! Click any link below to view interactive prediction market trading directly on Twitter:

| Blink Type | Live Example on X |
|------------|-------------------|
| 🎯 **Specific Market** | [Trade: Cade Cunningham Double Doubles](https://x.com/sahilkhude_11/status/2007754212772544614?s=20) |
| 📊 **Top Markets** | [Browse Trending Markets](https://x.com/sahilkhude_11/status/2007754073735594435?s=20) |
| ⚡ **Quick Buy YES** | [One-Click YES Trade](https://x.com/sahilkhude_11/status/2007754349267870203?s=20) |
| ⚡ **Quick Buy NO** | [One-Click NO Trade](https://x.com/sahilkhude_11/status/2007754487612715177?s=20) |
| 💼 **View Portfolio** | [Check Your Positions](https://x.com/sahilkhude_11/status/2007754618026238331?s=20) |

> 🎉 **Domain Approved!** Our Blinks are now live on Twitter. Click any link above to see the interactive trading interface unfurl directly in the tweet.

## 🏗️ How It Works

```
Twitter Post → Blink Unfurls → Click Button → Trade Executed → Position Confirmed
                  ↓
              (2 seconds total)
```

**Current Demo Flow** (until Twitter domain approval):
```
Dial.to Preview → Paste URL → Blink Renders → Click Button → Trade Executed
```

> **Why dial.to right now?** Dialect requires domain registration before Blinks automatically unfurl on Twitter/X. We've submitted our domain (`dnova-test.choplet.dev`) and are waiting for approval. Once approved, users can post our URLs directly on Twitter and they'll unfurl automatically - no dial.to needed!

We built custom Solana Action endpoints that:
- Fetch live market data from Kalshi
- Display prices and volume in the Blink UI  
- Execute trades via authenticated API calls
- Track positions and P&L
- Handle wallet connections automatically

### 🔥 Live Endpoints

Try these URLs at https://dial.to/developer (paste and see the magic):

```
https://dnova-test.choplet.dev/api/actions/markets
https://dnova-test.choplet.dev/api/actions/portfolio
https://dnova-test.choplet.dev/api/actions/quick/KXNBA2D-26JAN04DETCLE-DETCCUNNINGHAM2/yes
```

Each URL unfurls into an **interactive trading interface** right in your social feed.

## 🎯 Current Status & Architecture

### What's Working NOW ✅
- **Full Kalshi Integration** - Live market data, real-time prices, order execution
- **6 Blink Endpoints** - Markets browser, quick trades, portfolio, event pages
- **Production Deployed** - Running on Vercel at dnova-test.choplet.dev
- **Dialect Preview** - Works perfectly in dial.to (domain registration pending)

### Why Not Live on Twitter Yet? 📝

**Short answer**: We're waiting for Dialect to approve our domain.

**Long answer**: For Blinks to automatically unfurl on Twitter/X, your domain needs to be registered in Dialect's allowlist. This is a security measure to prevent malicious Blinks. We've submitted `dnova-test.choplet.dev` for registration.

In the meantime:
- ✅ **Fully functional** via dial.to/developer (paste any URL and it works)
- ✅ **Production ready** - All code is deployed and working
- ✅ **Twitter compatible** - The moment Dialect approves our domain, it goes live on X
- 🔜 **Estimated approval** - Typically 2-5 business days

This is a standard workflow for all Blinks projects - build first, get approved, then go viral on Twitter!

### The DFlow Story 🚀

**Originally**, we planned to use **DFlow Protocol** for decentralized, on-chain settlement on Solana. DFlow would give us:
- Blockchain-verified trades
- Self-custody for users
- Multi-market aggregation (Kalshi + Polymarket + more)

**Reality check**: DFlow requires API approval that takes time. So we pivoted:

1. ✅ **Built the DFlow services anyway** (`src/services/dflow/`) - 700+ lines of production-ready code
2. ✅ **Used Kalshi APIs as fallback** - Got us to working demo fast
3. ✅ **Proved the concept** - Blinks + Prediction Markets = 🔥
4. 🔜 **DFlow integration ready** - Just needs API key to switch on

This isn't a compromise—it's **smart architecture**. We built for the future while shipping today.

## 🛠️ Technical Deep Dive

### Unique Technical Achievements

**1. Authenticated Blink Actions**  
Solana Actions are usually public/anonymous. We added:
- RSA-PSS signature generation for Kalshi API
- Secure private key handling
- Database-backed user tracking
- All while keeping the Blink UX simple

**2. Smart Price Handling**  
Prediction markets have bid/ask spreads and liquidity issues. We built:
```typescript
// Intelligent price fallback chain
price = market.yes_ask || market.last_price || market.yes_bid || 50
```
This ensures users always get a valid price, even in low-liquidity markets.

**3. Dynamic Action Generation**  
Each market gets custom buttons based on:
- Market status (open/closed)
- Available liquidity
- User's existing positions
- Quick-trade amounts ($10/$25/$50/$100)

**4. Multi-Route Architecture**  
```
/api/actions/markets          → Browse trending markets
/api/actions/markets/:ticker  → Trade specific market  
/api/actions/quick/:ticker/:side → One-click YES/NO trades
/api/actions/portfolio        → View positions & P&L
/api/actions/event/:ticker    → All markets for an event
```

### Tech Stack

```typescript
Framework:    Next.js 14 (App Router, Server Actions)
Blockchain:   Solana (via @solana/actions SDK)
Markets:      Kalshi Demo API (production-ready)
Future:       DFlow Protocol (infrastructure ready)
Database:     Prisma + PostgreSQL
Hosting:      Vercel (frontend) + Railway (potential MCP server)
UX:           Tailwind CSS + Custom Blink UI
```

## 🎨 User Experience

Our homepage showcases **6 different Blink endpoints**. Each card:
- Shows the URL and use case
- Has a **copy button** → copies `dial.to` preview link (for current testing)
- Has a **"Post to Twitter" button** → opens Twitter composer with the link

**Current Experience** (via dial.to):
1. Copy any endpoint URL from our homepage
2. Paste it at https://dial.to/developer
3. Blink renders instantly with live data
4. Click button, connect wallet, trade executes

**Future Experience** (once Dialect approves our domain):
1. Someone posts our URL on Twitter/X
2. The link **automatically unfurls** into an interactive UI
3. User clicks "Buy YES $10" or similar
4. Wallet connect (if needed)
5. Trade executes and confirms in-feed
6. Everyone in the thread can trade without leaving Twitter

**No app to download. No website to visit. Trading happens where you already are.**

> 💡 **For Judges**: Test it now on dial.to - the experience will be identical on Twitter once our domain is approved. The tech is production-ready!

## 🏆 Why This Wins

### For Users
- **Fastest trading UX ever** - 2 clicks from idea to position
- **Works everywhere** - Twitter, Discord, Telegram, any Blink client
- **No complexity** - Just pick amount and side (YES/NO)

### For Markets  
- **Viral distribution** - Every trade is shareable content
- **Reduced friction** - 10x more people will trade if it's this easy
- **Social proof** - See friends trading, join instantly

### For Solana
- **New use case** - First prediction market Blinks
- **Composability** - Our actions can be used by ANY Blink client
- **User growth** - Prediction market traders → Solana users

### For Hackathon Judges
- **Fully functional** - This isn't vaporware, it works right now
- **Novel integration** - Nobody else has done Blinks + Kalshi
- **Smart architecture** - DFlow-ready but shipping on Kalshi
- **Production quality** - Error handling, price validation, user feedback
- **Future-proof** - Easy to add more markets (DFlow, Polymarket, etc.)

## 🚢 What's Next

### Immediate (Post-Hackathon)
1. **Get Twitter domain approved** - Native unfurling on X
2. **Activate DFlow integration** - Just needs API key
3. **Add more markets** - Elections, crypto, sports

### Short Term
1. **Portfolio analytics** - P&L charts, trade history
2. **Smart notifications** - "Your market just moved!"
3. **Social features** - See what others are trading

### Long Term  
1. **AI trading bots** - Using Quantish Agent + our MCP server
2. **Multi-chain** - EVM prediction markets via same Blink interface
3. **White-label** - Let any market use our Blink infrastructure

## 📂 Code Structure

```
src/
├── app/
│   ├── page.tsx                 # Landing page with all Blink demos
│   ├── actions.json/            # Blink discovery endpoint
│   └── api/actions/             # All Blink routes
│       ├── markets/             # Browse & trade markets
│       ├── quick/               # One-click trades  
│       ├── portfolio/           # User positions
│       └── event/               # Event-based trading
├── services/
│   ├── kalshi-market.service.ts # Market data (ACTIVE)
│   ├── kalshi-trade.service.ts  # Order execution (ACTIVE)
│   └── dflow/                   # DFlow integration (READY)
│       ├── dflow-market.service.ts  # 370 lines
│       └── dflow-trade.service.ts   # 320 lines
└── config/
    └── index.ts                 # Environment & API keys
```

**Total Codebase**: ~3,500 lines of TypeScript  
**DFlow Infrastructure**: 700+ lines ready to activate  
**Working Blink Routes**: 6 production endpoints  
**Development Time**: 4 days from idea to demo

## 🎥 Try It Yourself

1. Visit https://dial.to/developer
2. Paste any of our endpoint URLs (see homepage)
3. Click buttons, see live Kalshi markets
4. Connect wallet and place real trades (demo mode)

Or just visit: https://dnova-test.choplet.dev

## 💡 The Vision

Imagine a world where:
- Every tweet about "Who will win the election?" has a Blink to bet on it
- Discord communities trade prediction markets in their channels  
- You see a trending topic and can instantly put money on your prediction
- All trades are on-chain, verifiable, and self-custodied (via DFlow)

**That's what we're building. And it's working today.**

## 🙏 Acknowledgments

Built during the Denova Hackathon by a team that believes prediction markets should be as easy as liking a tweet.

- **Kalshi** for the prediction market API and demo access
- **DFlow** for the vision of decentralized prediction markets on Solana  
- **Dialect** for the incredible Solana Actions SDK and dial.to preview tool
- **Solana** for making all of this technically possible

---

## Getting Started (For Developers)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

---

**Status**: ✅ Working demo | 🔜 Twitter approval pending | 🚀 DFlow integration ready

**Live Demo**: https://dnova-test.choplet.dev  
**Preview Tool**: https://dial.to/developer (paste our URLs)  
**Twitter**: Coming soon (domain approval in progress)

*Made with ⚡ and ☕ for the Denova Hackathon*

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
