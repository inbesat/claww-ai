import React from 'react';

const StockCard = ({ symbol, price, change, percentChange, companyName }) => {
  const isPositive = parseFloat(change) >= 0;
  const changeColor = isPositive ? 'text-emerald-400' : 'text-rose-400';
  const arrow = isPositive ? '↑' : '↓';
  const glowClass = isPositive ? 'animate-glow-green' : 'animate-glow-red';

  return (
    <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-md ${isPositive ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'}`}>
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] text-emerald-400 uppercase tracking-wider">Live</span>
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold text-zinc-100">{symbol}</h3>
            <p className="text-xs text-zinc-400">{companyName || 'Stock'}</p>
          </div>
          <div className={`text-right ${glowClass}`}>
            <span className="text-2xl font-bold">${price}</span>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 ${changeColor}`}>
          <span className="text-lg font-semibold">{arrow}</span>
          <span className="font-medium">{change}</span>
          <span className="text-sm opacity-80">({percentChange})</span>
        </div>
      </div>
    </div>
  );
};

export default StockCard;