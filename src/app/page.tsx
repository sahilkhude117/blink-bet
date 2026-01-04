"use client";

import { useState } from "react";

export default function Home() {
  const baseUrl = "https://dnova-test.choplet.dev";
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const endpoints = [
    {
      title: "📊 Browse Markets",
      description: "Explore trending prediction markets",
      url: `${baseUrl}/api/actions/markets`,
      category: "Discovery"
    },
    {
      title: "🎯 Specific Market",
      description: "Trade on Detroit vs Cleveland: Cade Cunningham Double Doubles",
      url: `${baseUrl}/api/actions/markets/KXNBA2D-26JAN04DETCLE-DETCCUNNINGHAM2`,
      category: "Trading"
    },
    {
      title: "⚡ Quick Buy YES",
      description: "Instant YES trade - One click, $10 trade",
      url: `${baseUrl}/api/actions/quick/KXNBA2D-26JAN04DETCLE-DETCCUNNINGHAM2/yes`,
      category: "Quick Trade"
    },
    {
      title: "⚡ Quick Buy NO",
      description: "Instant NO trade - One click, $10 trade",
      url: `${baseUrl}/api/actions/quick/KXNBA2D-26JAN04DETCLE-DETCCUNNINGHAM2/no`,
      category: "Quick Trade"
    },
    {
      title: "💼 Portfolio",
      description: "View your positions and P&L",
      url: `${baseUrl}/api/actions/portfolio`,
      category: "Account"
    },
    {
      title: "🗳️ Event Markets",
      description: "View all markets for an event",
      url: `${baseUrl}/api/actions/event/{event ticker}`,
      category: "Discovery"
    }
  ];

  const copyToClipboard = (url: string, index: number) => {
    const dialToUrl = `https://dial.to/developer?url=${encodeURIComponent(url)}&cluster=mainnet`;
    navigator.clipboard.writeText(dialToUrl);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const shareOnTwitter = (url: string, title: string) => {
    const dialToUrl = `https://dial.to/developer?url=${encodeURIComponent(url)}&cluster=mainnet`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(dialToUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32">
          <div className="text-center space-y-8">
            <div className="inline-block">
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
                BlinkBet
              </h1>
            </div>
            
            <p className="text-2xl sm:text-3xl font-semibold text-gray-300">
              Bringing Prediction Markets Everywhere
            </p>
            
            <div className="max-w-2xl mx-auto space-y-4">
              <p className="text-lg text-gray-400 leading-relaxed">
                We&apos;re integrating <span className="text-purple-400 font-semibold">Kalshi</span> with{" "}
                <span className="text-blue-400 font-semibold">Solana Blinks</span>, enabling seamless 
                prediction market trading directly inside Twitter, Discord, and any platform that supports Blinks.
              </p>
              <p className="text-sm text-gray-500">
                Trade on real-world events with one click. No complex interfaces, no friction.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoints Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Try These Blinks
          </h2>
          <p className="text-gray-400">
            Copy any link below and post it on Twitter to see the magic ✨
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {endpoints.map((endpoint, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-purple-500 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-purple-400 mb-2">
                      {endpoint.category}
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">
                      {endpoint.title}
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      {endpoint.description}
                    </p>
                  </div>
                </div>

                <div className="relative bg-black/50 rounded-lg p-3 border border-gray-700 flex items-center gap-2">
                  <code className="text-xs text-gray-300 break-all flex-1">
                    {endpoint.url}
                  </code>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(endpoint.url, index);
                    }}
                    className="flex-shrink-0 p-2 hover:bg-gray-700 rounded transition-colors group/copy"
                    title="Copy URL"
                  >
                    {copiedIndex === index ? (
                      <svg 
                        className="w-4 h-4 text-green-400" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M5 13l4 4L19 7" 
                        />
                      </svg>
                    ) : (
                      <svg 
                        className="w-4 h-4 text-gray-400 group-hover/copy:text-white transition-colors" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => shareOnTwitter(endpoint.url, endpoint.title)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Post this on Twitter
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-white">Instant Trading</h3>
            <p className="text-gray-400 text-sm">
              One-click trades directly from your social feed. No redirects, no friction.
            </p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-white">Secure & Transparent</h3>
            <p className="text-gray-400 text-sm">
              Powered by Solana blockchain. Every trade is verifiable and secure.
            </p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="text-4xl mb-4">🌐</div>
            <h3 className="text-xl font-bold text-white">Available Everywhere</h3>
            <p className="text-gray-400 text-sm">
              Trade prediction markets on Twitter, Discord, Telegram, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-gray-500 text-sm">
              Powered by <span className="text-purple-400">Kalshi</span> × <span className="text-blue-400">Solana</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors">
                Kalshi
              </a>
              <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                Solana
              </a>
              <a href="https://docs.dialect.to/documentation/actions/how-to-use-actions-blinks" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors">
                Blinks
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
