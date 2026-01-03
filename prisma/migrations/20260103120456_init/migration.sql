-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('YES', 'NO');

-- CreateEnum
CREATE TYPE "OrderAction" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'RESTING', 'CANCELED', 'EXECUTED', 'EXPIRED', 'PARTIALLY_FILLED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "walletAddress" TEXT,
    "encryptedSeed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "name" TEXT DEFAULT 'Default Kalshi Account',
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kalshiOrderId" TEXT,
    "ticker" TEXT NOT NULL,
    "eventTicker" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "action" "OrderAction" NOT NULL,
    "type" "OrderType" NOT NULL DEFAULT 'LIMIT',
    "count" INTEGER NOT NULL,
    "yesPrice" INTEGER,
    "noPrice" INTEGER,
    "yesPriceDollars" TEXT,
    "noPriceDollars" TEXT,
    "fillCount" INTEGER NOT NULL DEFAULT 0,
    "remainingCount" INTEGER,
    "avgPrice" DECIMAL(10,4),
    "takerFees" INTEGER NOT NULL DEFAULT 0,
    "makerFees" INTEGER NOT NULL DEFAULT 0,
    "takerFeesDollars" TEXT,
    "makerFeesDollars" TEXT,
    "totalCost" INTEGER,
    "totalCostDollars" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "clientOrderId" TEXT,
    "queuePosition" INTEGER,
    "expirationTime" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedTime" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "eventTicker" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "totalTraded" INTEGER NOT NULL DEFAULT 0,
    "totalTradedDollars" TEXT,
    "marketExposure" INTEGER NOT NULL DEFAULT 0,
    "marketExposureDollars" TEXT,
    "realizedPnl" INTEGER NOT NULL DEFAULT 0,
    "realizedPnlDollars" TEXT,
    "unrealizedPnl" INTEGER NOT NULL DEFAULT 0,
    "feesPaid" INTEGER NOT NULL DEFAULT 0,
    "feesPaidDollars" TEXT,
    "restingOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "marketResult" TEXT,
    "settlementValue" INTEGER,
    "settledTime" TIMESTAMP(3),
    "lastUpdatedTs" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_externalId_key" ON "User"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_externalId_idx" ON "User"("externalId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserApiKey_userId_idx" ON "UserApiKey"("userId");

-- CreateIndex
CREATE INDEX "UserApiKey_accessKey_idx" ON "UserApiKey"("accessKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_kalshiOrderId_key" ON "Order"("kalshiOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_clientOrderId_key" ON "Order"("clientOrderId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_ticker_idx" ON "Order"("ticker");

-- CreateIndex
CREATE INDEX "Order_eventTicker_idx" ON "Order"("eventTicker");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_kalshiOrderId_idx" ON "Order"("kalshiOrderId");

-- CreateIndex
CREATE INDEX "Position_userId_idx" ON "Position"("userId");

-- CreateIndex
CREATE INDEX "Position_ticker_idx" ON "Position"("ticker");

-- CreateIndex
CREATE INDEX "Position_eventTicker_idx" ON "Position"("eventTicker");

-- CreateIndex
CREATE INDEX "Position_isSettled_idx" ON "Position"("isSettled");

-- CreateIndex
CREATE UNIQUE INDEX "Position_userId_ticker_key" ON "Position"("userId", "ticker");

-- AddForeignKey
ALTER TABLE "UserApiKey" ADD CONSTRAINT "UserApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
