import React, { useState, useEffect } from 'react';
import { currencyService } from '../../services/CurrencyService';
import type { ConversionResult } from '../../services/CurrencyService';
import './CurrencyConverterUI.css';

interface CurrencyConverterUIProps {
  initialResult: ConversionResult;
  onQueryChange: (newQuery: string) => void;
}

export const CurrencyConverterUI: React.FC<CurrencyConverterUIProps> = ({ initialResult, onQueryChange }) => {
  const [amount, setAmount] = useState(initialResult.amount);
  const [result, setResult] = useState<ConversionResult>(initialResult);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    const updateConversion = async () => {
      // If amount is same as result, skip unless it's the very first render
      if (amount === result.amount && result.from === initialResult.from) return;
      
      const newResult = await currencyService.convert(`${amount} ${result.from} to ${result.to}`);
      if (newResult) setResult(newResult);
    };

    const timer = setTimeout(updateConversion, 300);
    return () => clearTimeout(timer);
  }, [amount, result.from, result.to]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.result);
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSwap = () => {
    // Correctly swap the 'from' and 'to' fields in the local state
    // and update the query so the service and parent stay in sync
    const newFrom = result.to;
    const newTo = result.from;
    
    // Update local state first for instant feedback (service will catch up in useEffect)
    const swappedQuery = `${amount} ${newFrom} to ${newTo}`;
    onQueryChange(swappedQuery);
    
    // We update the result state manually to show the swap immediately
    setResult(prev => ({
      ...prev,
      from: newFrom,
      to: newTo,
      result: '...', // Temporary loading state
    }));
  };

  return (
    <div className="currency-mini-app">
      <div className="currency-row">
        <div className="currency-input-group">
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            className="currency-amount-input"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            autoFocus
          />
          <span className="currency-code">{result.from}</span>
        </div>
        
        <div className="currency-separator">
          <button className="swap-btn" onClick={(e) => { e.stopPropagation(); handleSwap(); }} title="Swap currencies">
            ⇄
          </button>
        </div>

        <div className="currency-input-group result">
          <span className="currency-value">{result.result}</span>
          <span className="currency-code">{result.to}</span>
        </div>

        <button 
          className={`copy-btn ${isCopying ? 'copied' : ''}`} 
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          title="Copy result"
        >
          {isCopying ? '✓' : '📋'}
        </button>
      </div>
      <div className="currency-footer">
        Rate: 1 {result.from} = {result.rate} {result.to}
      </div>
    </div>
  );
};
