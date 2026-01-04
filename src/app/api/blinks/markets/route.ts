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

        const payload: ActionGetResponse = {
            type: "action",
            title: "🔥 Top Trending Prediction Markets",
            icon: "https://kalshi.com/favicon.ico",
            description: "Explore the hottest prediction markets on Kalshi. Click any market to view details and place trades.\n\nMarkets are ranked by trading volume.",
            label: "View Markets",
            links: {
                actions: trendingMarkets.map((market) => ({
                    type: "external-link" as const,
                    label: `${market.title.slice(0, 40)}${market.title.length > 40 ? "..." : ""} - YES ${market.yes_bid}¢`,
                    href: `${requestUrl.origin}/api/blinks/markets/${market.ticker}`,
                })),
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