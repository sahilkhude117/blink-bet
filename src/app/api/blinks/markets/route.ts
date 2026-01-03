import { getKalshiMarketService } from "@/services";
import { ActionError, ActionGetResponse, createActionHeaders } from "@solana/actions";
import { NextRequest, NextResponse } from "next/server";

const headers = createActionHeaders();

export async function GET(req: NextRequest) {
    try {
        const requestUrl = new URL(req.url);
        const marketService = getKalshiMarketService();

        const response = await marketService.getMarkets({
            limit: 5,
            status: 'open'
        });

        if (!response.markets || response.markets.length === 0) {
            const error: ActionError = {
                message: "No markets available at the moment"
            };
            return NextResponse.json(error, {
                status: 404,
                headers
            })
        }

        const trendingMarkets = response.markets.sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 5);

        const payload: ActionGetResponse = {
            type: "action",
            title: "Top 5 Trending Prediction Markets on Kalshi",
            icon: "https://kalshi.com/favicon.ico",
            description: "Browse and trade on the hottest prediction markets on Kalshi",
            label: "View Trending Markets",
            links: {
                actions: trendingMarkets.map((market) => ({
                    label: `${market.title.slice(0, 40)}${market.title.length > 40 ? "..." : ""} - YES ${market.yes_bid}¢`,
                    href: `${requestUrl.origin}/api/blinks/markets/${market.ticker}`,
                    type: "external-link"
                })),
            },
        };

        return NextResponse.json(payload, { headers });
    } catch (e: any) {
        console.error("Error in market blink:", e);
        const error: ActionError = {
            message: e.message || "Failed to load markets"
        };
        return NextResponse.json(error, {
            status: 500,
            headers
        });
    }
}

export async function OPTIONS() {
    return NextResponse.json(null, { headers });
}