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
        const ticker = requestUrl.searchParams.get("ticker");
        
        // If ticker is provided, redirect to that market's detail page
        if (ticker) {
            const redirectUrl = `${requestUrl.origin}/api/blinks/markets/${ticker}`;
            const payload: ActionGetResponse = {
                type: "action",
                title: "Redirecting to Market...",
                icon: "https://kalshi.com/favicon.ico",
                description: `Loading market details for ${ticker}`,
                label: "View Market",
                links: {
                    actions: [
                        {
                            type: "external-link" as const,
                            label: "View Market Details",
                            href: redirectUrl,
                        }
                    ]
                }
            };
            return NextResponse.json(payload, { headers });
        }
        
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

        // Build market descriptions
        const marketList = trendingMarkets.map((m, idx) => 
            `${idx + 1}. **${m.title.slice(0, 50)}${m.title.length > 50 ? '...' : ''}**\n   YES ${m.yes_bid}¢ | Volume: $${((m.volume || 0) / 100).toLocaleString()}`
        ).join('\n\n');

        const payload: ActionGetResponse = {
            type: "action",
            title: "🔥 Top Trending Prediction Markets",
            icon: "https://kalshi.com/favicon.ico",
            description: `Explore the hottest prediction markets on Kalshi.\nSelect a market to view details and place trades.\n\n${marketList}`,
            label: "View Market",
            links: {
                actions: [
                    {
                        type: "external-link" as const,
                        label: "Select Market",
                        href: `${requestUrl.origin}/api/blinks/markets?ticker={ticker}`,
                        parameters: [
                            {
                                type: "select",
                                name: "ticker",
                                label: "Choose a market",
                                required: true,
                                options: trendingMarkets.map(m => ({
                                    label: `${m.title.slice(0, 45)}${m.title.length > 45 ? '...' : ''} - YES ${m.yes_bid}¢`,
                                    value: m.ticker
                                }))
                            }
                        ]
                    }
                ],
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