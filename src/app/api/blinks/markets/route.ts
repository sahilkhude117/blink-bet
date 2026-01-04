import { getKalshiMarketService } from "@/services";
import { ActionError, ActionGetResponse, createActionHeaders, BLOCKCHAIN_IDS } from "@solana/actions";
import { NextRequest, NextResponse } from "next/server";

const headers = {
    ...createActionHeaders(),
    "X-Blockchain-Ids": BLOCKCHAIN_IDS.mainnet,
    "X-Action-Version": "2.4"
};

export async function GET(req: NextRequest) {
    try {
        const requestUrl = new URL(req.url);
        const marketService = getKalshiMarketService();

        const response = await marketService.getMarkets({
            limit: 5,
            status: 'open'
        });

        // Input validation and user-friendly error messages
        if (!response.markets || response.markets.length === 0) {
            const error: ActionError = {
                message: "No markets are currently available. Please try again later."
            };
            return NextResponse.json(error, {
                status: 404,
                headers
            });
        }

        const trendingMarkets = response.markets.sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 5);

        // Build actions for each market with YES/NO quick trade buttons
        const marketActions = trendingMarkets.flatMap((market) => {
            const truncatedTitle = market.title.length > 40 
                ? `${market.title.slice(0, 40)}...` 
                : market.title;
            
            // Show ask prices (what you'd pay to buy) with fallbacks
            const yesPrice = market.yes_ask || market.last_price || market.yes_bid || 50;
            const noPrice = market.no_ask || market.last_price || market.no_bid || 50;
            
            return [
                {
                    type: "post" as const,
                    label: `${truncatedTitle} - YES ${yesPrice}¢`,
                    href: `${requestUrl.origin}/api/blinks/quick/${market.ticker}/yes?amount=10`,
                },
                {
                    type: "post" as const,
                    label: `${truncatedTitle} - NO ${noPrice}¢`,
                    href: `${requestUrl.origin}/api/blinks/quick/${market.ticker}/no?amount=10`,
                }
            ];
        });

        const payload: ActionGetResponse = {
            type: "action",
            title: "🔥 Top Trending Prediction Markets",
            icon: "https://kalshi.com/favicon.ico",
            description: `Quick trade on the hottest prediction markets!\n\nEach button places a $10 trade instantly.\nDefault amount: $10 per trade\n\n📊 **Top 5 Markets**:\n${trendingMarkets.map((m, i) => {
                const yesPrice = m.yes_ask || m.last_price || m.yes_bid || 50;
                const noPrice = m.no_ask || m.last_price || m.no_bid || 50;
                return `${i+1}. ${m.title.slice(0, 50)}${m.title.length > 50 ? '...' : ''}\n   YES ${yesPrice}¢ | NO ${noPrice}¢ | Volume: $${((m.volume || 0) / 100).toLocaleString()}`;
            }).join('\n\n')}`,
            label: "Quick Trade",
            links: {
                actions: marketActions,
            },
        };

        return NextResponse.json(payload, { headers });
    } catch (error: any) {
        // Server-side logging for debugging
        console.error("[Markets Blink] Error loading markets:", error);
        
        // User-friendly error message in UI
        const errorResponse: ActionError = {
            message: error.message || "Unable to load markets. Please try again."
        };
        return NextResponse.json(errorResponse, {
            status: 500,
            headers
        });
    }
}

export async function OPTIONS() {
    return NextResponse.json(null, { headers });
}