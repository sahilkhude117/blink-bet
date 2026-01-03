import { config } from "@/config";
import prisma from "@/db";
import { OrderStatus } from "@/generated/prisma/enums";
import { getKalshiMarketService, getKalshiTradeService } from "@/services";
import { ActionError, ActionGetResponse, ActionPostRequest, ActionPostResponse, createActionHeaders, createPostResponse } from "@solana/actions";
import { clusterApiUrl, Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";

const headers = createActionHeaders();

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ ticker: string }> }
) {
    try {
        const { ticker } = await params;

        if (!ticker || typeof ticker !== "string") {
            const error: ActionError = { message: "Ticker is required" };
            return NextResponse.json(error, { 
                status: 400,
                headers
            });
        }

        const marketService = getKalshiMarketService();
        const market = await marketService.getMarket(ticker);

        const requestUrl = new URL(req.url);
        const baseHref = `${requestUrl.origin}/api/blinks/markets/${ticker}`;

        const account = requestUrl.searchParams.get("account");
        let userPositionText = '';

        if (account) {
            try {
                const user = await prisma.user.findUnique({
                    where: { walletAddress: account },
                });

                if (user) {
                    const position = await prisma.position.findFirst({
                        where: {
                            userId: user.id,
                            ticker: ticker,
                            isSettled: false
                        }
                    });

                    if (position) {
                        const side = position.position > 0 ? "YES" : "NO";
                        const shares = Math.abs(position.position);
                        const pnl = position.unrealizedPnl / 100;
                        userPositionText = `\n\nYour Position: ${shares} ${side} @ ${position.feesPaid} (${pnl >= 0 ? "+": ""}${pnl.toFixed(2)})`;
                    }
                }
            } catch (err) {
                console.log("error fetching user position", err);
            }
        }

        const payload: ActionGetResponse = {
            type: 'action',
            title: market.title,
            icon: "https://kalshi.com/favicon.ico",
            description: `${market.subtitle || ""}\n\nYES ${market.yes_bid} | NO ${market.no_bid}\nVolum: $${((market.volume || 0) / 100).toLocaleString()}${userPositionText}`,
            label: "Trade Market",
            links: {
                actions: [
                    {
                        type: "post" as const,
                        label: "Buy YES $10",
                        href: `${baseHref}?action=buy_yes&amount=10`,
                    },
                    {
                        type: "post" as const,
                        label: "Buy YES $25",
                        href: `${baseHref}?action=buy_yes&amount=25`,
                    },
                    {
                        type: "post" as const,
                        label: "Buy NO $10",
                        href: `${baseHref}?action=buy_no&amount=10`,
                    },
                    {
                        type: "post" as const,
                        label: "Buy NO $25",
                        href: `${baseHref}?action=buy_no&amount=25`,
                    },
                    {
                        type: "post" as const,
                        label: "Buy YES with Custom Amount",
                        href: `${baseHref}?action=buy_yes&amount={amount}`,
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
                        href: `${baseHref}?action=buy_no&amount={amount}`,
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
    } catch (e: any) {
        console.error("Error in market blink GET:", e);
        const error: ActionError = {
            message: e.message || 'Failed to load market',
        };
        return NextResponse.json(error, { status: 500, headers });
    }
}

export async function OPTIONS() {
    return NextResponse.json(null, { headers });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ ticker: string }>}
) {
    try {
        const { ticker } = await params;
        const body: ActionPostRequest = await req.json();
        const requestUrl = new URL(req.url);

        const action = requestUrl.searchParams.get('action'); // buy_yes, buy_no
        const amountParam = requestUrl.searchParams.get("amount");
        const account = body.account;

        if (!account) {
            const error: ActionError = { message: "Wallet address is required" };
            return NextResponse.json(error, { status: 400, headers })
        }

        if (!action || !amountParam) {
            const error: ActionError = { message: "Action and amount are required" };
            return NextResponse.json(error, { status: 400, headers });
        }

        const amount = parseFloat(amountParam);
        if (isNaN(amount) || amount <= 0) {
            const error: ActionError = { message: "Invalid amount provided" };
            return NextResponse.json(error, { status: 400, headers });
        }

        let accountPubkey: PublicKey;

        try {
            accountPubkey = new PublicKey(account);
        } catch (err) {
            const error: ActionError = { message: "Invalid account provided" };
            return NextResponse.json(error, { status: 400, headers });
        }

        const user = await prisma.user.upsert({
            where: { walletAddress: account },
            create: {
                externalId: account,
                walletAddress: account,
            },
            update: {},
        });

        const marketService = getKalshiMarketService();
        const market = await marketService.getMarket(ticker);

        const side = action === "buy_yes" ? "yes" : "no";
        const price = side === 'yes' ? market.yes_bid: market.no_bid;
        const quantity = Math.floor((amount * 100) / price!);

        if (quantity <= 0) {
            const error: ActionError = {
                message: "Amount too small to buy any shares",
            };
            return NextResponse.json(error, { status: 400, headers });
        }

        const tradeService = getKalshiTradeService();
        const balance = await tradeService.getBalance();

        if (balance.balance < amount * 100) {
            const error: ActionError = {
                message: `Insufficient balance. You have ${(balance.balance / 100).toFixed(2)}. Deposit at kashi.com`,
            };
            return NextResponse.json(error, { status: 400, headers });
        }

        const order = await prisma.order.create({
            data: {
                userId: user.id,
                ticker: ticker,
                eventTicker: market.event_ticker,
                side: side.toUpperCase() as any,
                action: "BUY",
                type: "MARKET",
                count: quantity,
                yesPrice: side === 'yes' ? price: null,
                noPrice: side === 'no' ? price: null,
                status: OrderStatus.PENDING
            }
        })

        try {
            const kalshiOrder = await tradeService.createOrder({
                ticker: ticker,
                action: 'buy',
                side: side as 'yes' | 'no',
                count: quantity,
                type: 'market',
            });

            await prisma.order.update({
                where: { id: order.id },
                data: {
                    kalshiOrderId: kalshiOrder.order_id,
                    status: kalshiOrder.status.toUpperCase() as any,
                    fillCount: kalshiOrder.fill_count || 0,
                    remainingCount: kalshiOrder.remaining_count,
                    avgPrice: kalshiOrder.yes_price || kalshiOrder.no_price,
                    totalCost: kalshiOrder.taker_fill_cost || 0,
                    takerFees: kalshiOrder.taker_fees || 0,
                },
            });

            const existingPosition = await prisma.position.findFirst({
                where: {
                    userId: user.id,
                    ticker: ticker,
                },
            });

            if (existingPosition) {
                const positionChange = side === 'yes' ? quantity : -quantity;
                const newPosition = existingPosition.position + positionChange;
                const newTotalTraded = existingPosition.totalTraded + quantity;
                const newMarketExposure = existingPosition.marketExposure + (kalshiOrder.taker_fill_cost || 0);
                const newFeesPaid = existingPosition.feesPaid + (kalshiOrder.taker_fees || 0);

                await prisma.position.update({
                    where: { id: existingPosition.id },
                    data: {
                        position: newPosition,
                        totalTraded: newTotalTraded,
                        marketExposure: newMarketExposure,
                        feesPaid: newFeesPaid,
                    }
                });
            } else {
                await prisma.position.create({
                    data: {
                        userId: user.id,
                        ticker: ticker,
                        eventTicker: market.event_ticker,
                        position: side === 'yes' ? quantity : -quantity,
                        totalTraded: quantity,
                        marketExposure: kalshiOrder.taker_fill_cost || 0,
                        feesPaid: kalshiOrder.taker_fees || 0,
                    }
                })
            }

            const connection = new Connection(
                config.solana.rpcUrl || clusterApiUrl('devnet')
            )

            const { blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();
            // memo transaction as proof of trade
            const transaction = new Transaction({
                feePayer: accountPubkey,
                blockhash,
                lastValidBlockHeight
            }).add(
                SystemProgram.transfer({
                    fromPubkey: accountPubkey,
                    toPubkey: accountPubkey,
                    lamports: 0,
                })
            )

            const payload: ActionPostResponse = await createPostResponse({
                fields: {
                    type: "transaction",
                    transaction,
                    message: `✅ Order Executed!\nBought ${quantity} ${side.toUpperCase()} shares @ ${price}¢\nTotal: $${amount.toFixed(2)}`,
                },
            });

        return NextResponse.json(payload, { headers });
    } catch (kalshiError: any) {
         await prisma.order.update({
            where: { id: order.id },
            data: {
            status: OrderStatus.FAILED,
            errorMessage: kalshiError.message,
            },
        });

        const error: ActionError = {
            message: `Order failed: ${kalshiError.message}`,
        };
        return NextResponse.json(error, { status: 400, headers });
        }
    } catch (e: any) {
        console.error('Error in market blink POST:', e);
        const error: ActionError = {
        message: e.message || 'Failed to execute trade',
        };
        return NextResponse.json(error, { status: 500, headers });
  }
}