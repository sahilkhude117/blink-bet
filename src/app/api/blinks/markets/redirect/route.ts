import { getKalshiMarketService } from "@/services";
import { ActionError, ActionGetResponse, createActionHeaders, BLOCKCHAIN_IDS } from "@solana/actions";
import { NextRequest, NextResponse } from "next/server";

const headers = {
    ...createActionHeaders(),
    "X-Blockchain-Ids": BLOCKCHAIN_IDS.mainnet,
    "X-Action-Version": "2.4"
};

/**
 * This endpoint handles the redirect from market selection
 * dial.to sends POST requests when parameters are involved, so we handle that here
 */
export async function GET(req: NextRequest) {
    try {
        const requestUrl = new URL(req.url);
        const ticker = requestUrl.searchParams.get("ticker");

        if (!ticker) {
            const error: ActionError = {
                message: "Please select a market to view"
            };
            return NextResponse.json(error, { status: 400, headers });
        }

        // Return a response that links to the actual market detail
        const marketDetailUrl = `${requestUrl.origin}/api/blinks/markets/${ticker}`;
        
        const payload: ActionGetResponse = {
            type: "action",
            title: "📊 View Market Details",
            icon: "https://kalshi.com/favicon.ico",
            description: `Loading details for market: ${ticker}\n\nClick below to view full market information and place trades.`,
            label: "Continue",
            links: {
                actions: [
                    {
                        type: "external-link" as const,
                        label: "View Market Details",
                        href: marketDetailUrl,
                    }
                ]
            }
        };

        return NextResponse.json(payload, { headers });
    } catch (error: any) {
        console.error("[Market Redirect] Error:", error);
        const errorResponse: ActionError = {
            message: error.message || "Unable to redirect to market"
        };
        return NextResponse.json(errorResponse, { status: 500, headers });
    }
}

// Handle POST request (dial.to sends POST when parameters are used)
export async function POST(req: NextRequest) {
    try {
        const requestUrl = new URL(req.url);
        const ticker = requestUrl.searchParams.get("ticker");

        if (!ticker) {
            const error: ActionError = {
                message: "Please select a market to view"
            };
            return NextResponse.json(error, { status: 400, headers });
        }

        // Fetch market data to show in this response
        const marketService = getKalshiMarketService();
        const market = await marketService.getMarket(ticker);

        const marketDetailUrl = `${requestUrl.origin}/api/blinks/markets/${ticker}`;
        
        // Return the full market detail directly
        const payload: ActionGetResponse = {
            type: "action",
            title: market.title,
            icon: "https://kalshi.com/favicon.ico",
            description: `${market.subtitle || ""}

💰 **Current Prices**
YES: ${market.yes_bid}¢ | NO: ${market.no_bid}¢

📊 **Volume**: $${((market.volume || 0) / 100).toLocaleString()}

Select an amount to place your trade:`,
            label: "Trade",
            links: {
                actions: [
                    {
                        type: "post" as const,
                        label: "Buy YES $10",
                        href: `${marketDetailUrl}?action=buy_yes&amount=10`,
                    },
                    {
                        type: "post" as const,
                        label: "Buy YES $25",
                        href: `${marketDetailUrl}?action=buy_yes&amount=25`,
                    },
                    {
                        type: "post" as const,
                        label: "Buy NO $10",
                        href: `${marketDetailUrl}?action=buy_no&amount=10`,
                    },
                    {
                        type: "post" as const,
                        label: "Buy NO $25",
                        href: `${marketDetailUrl}?action=buy_no&amount=25`,
                    },
                    {
                        type: "post" as const,
                        label: "Buy YES with Custom Amount",
                        href: `${marketDetailUrl}?action=buy_yes&amount={amount}`,
                        parameters: [
                            {
                                name: 'amount',
                                label: "Enter amount in USD",
                                required: true
                            }
                        ],
                    },
                    {
                        type: "post" as const,
                        label: "Buy NO with Custom Amount",
                        href: `${marketDetailUrl}?action=buy_no&amount={amount}`,
                        parameters: [
                            {
                                name: 'amount',
                                label: "Enter amount in USD",
                                required: true
                            }
                        ],
                    }
                ]
            }
        };

        return NextResponse.json(payload, { headers });
    } catch (error: any) {
        console.error("[Market Redirect POST] Error:", error);
        
        if (error.response?.status === 404) {
            const errorResponse: ActionError = {
                message: "Market not found. It may have closed or settled."
            };
            return NextResponse.json(errorResponse, { status: 404, headers });
        }
        
        const errorResponse: ActionError = {
            message: error.message || "Unable to load market details"
        };
        return NextResponse.json(errorResponse, { status: 500, headers });
    }
}

export async function OPTIONS() {
    return NextResponse.json(null, { headers });
}
