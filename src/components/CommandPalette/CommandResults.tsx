import React, { Suspense, useRef, useEffect } from 'react';
import type { Command } from '../../utils/commandRegistry';
import { AppIcon } from './AppIcon';

// Lazy load the interactive components
const CurrencyConverterUI = React.lazy(() => import('./CurrencyConverterUI').then(m => ({ default: m.CurrencyConverterUI })));
const ProcessKillerUI = React.lazy(() => import('./ProcessKillerUI').then(m => ({ default: m.ProcessKillerUI })));

interface CommandResultsProps {
  filteredCommands: Command[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  executeCommand: (cmd: Command) => void;
  query: string;
  setQuery: (query: string) => void;
  userNavigated?: boolean; 
  isPrewarming?: boolean;
}

const ComponentLoader: React.FC<{ 
  cmd: Command, 
  onQueryChange: (q: string) => void 
}> = ({ cmd, onQueryChange }) => {
  if (cmd.id === 'currency-mini-app') {
    return (
      <Suspense fallback={<div className="component-skeleton">Loading Converter...</div>}>
         <CurrencyConverterUI 
           initialResult={cmd.interactiveData} 
           onQueryChange={onQueryChange} 
         />
      </Suspense>
    );
  }
  
  if (cmd.id === 'process-killer-app') {
    return (
      <Suspense fallback={<div className="component-skeleton">Scanning Processes...</div>}>
         <ProcessKillerUI 
           initialTarget={cmd.interactiveData.target} 
           onQueryChange={onQueryChange} 
         />
      </Suspense>
    );
  }

  // Fallback for any other custom component functions
  if (cmd.component) {
    const CustomComponent = cmd.component;
    return <CustomComponent onQueryChange={onQueryChange} data={cmd.interactiveData} />;
  }
  return null;
};

export const CommandResults: React.FC<CommandResultsProps> = ({
  filteredCommands,
  selectedIndex,
  setSelectedIndex,
  executeCommand,
  query,
  setQuery,
  userNavigated = false,
  isPrewarming = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Only scroll into view when user navigates with keyboard, not on query change
  useEffect(() => {
    if (!userNavigated) return;
    
    const selectedElement = containerRef.current?.querySelector('.selected, .selected-component');
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, userNavigated]);

  // While prewarming, we render a hidden version of the most complex items 
  // to force the layout engine and lazy-loaders to wake up.
  if (isPrewarming) {
    const prewarmCmds: Command[] = [
      { 
        id: 'currency-mini-app', 
        title: '', 
        description: '', 
        icon: '', 
        keywords: [], 
        action: async () => ({}),
        interactiveData: { amount: '1', from: 'USD', to: 'EUR', result: '0.92', rate: '0.92' }
      },
      { 
        id: 'process-killer-app', 
        title: '', 
        description: '', 
        icon: '', 
        keywords: [], 
        action: async () => ({}), 
        interactiveData: { target: '' } 
      }
    ];

    return (
      <div className="results-section prewarming" style={{ opacity: 0, pointerEvents: 'none', height: 1 }}>
        {prewarmCmds.map(cmd => (
          <ComponentLoader key={cmd.id} cmd={cmd} onQueryChange={() => {}} />
        ))}
      </div>
    );
  }

  if (filteredCommands.length === 0) {

    return <div className="no-results">No matches for "{query}"</div>;
  }

  const limitedCommands = filteredCommands.slice(0, 50);

  return (
    <div className="results-section" ref={containerRef}>
      {limitedCommands.map((cmd, index) => {
        // Recognition of interactive components (either via ID or component fn)
        const isInteractive = cmd.id === 'currency-mini-app' || cmd.id === 'process-killer-app' || cmd.component;
        
        if (isInteractive) {
          return (
            <div key={cmd.id} className={index === selectedIndex ? 'selected-component' : ''}>
               <ComponentLoader cmd={cmd} onQueryChange={setQuery} />
            </div>
          );
        }

        return (
          <div
            key={cmd.id}
            className={`result-item ${index === selectedIndex ? 'selected' : ''} ${cmd.category === 'ai' ? 'ai' : ''}`}
            onClick={() => executeCommand(cmd)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="ordinal-badge">{index + 1}</div>
            <span className="command-icon">
              <AppIcon 
                iconUrl={cmd.iconUrl} 
                fallback={typeof cmd.icon === 'string' ? cmd.icon : '📦'} 
                className="command-favicon" 
              />
            </span>
            <div className="command-details">
              <div className="command-title">{cmd.title}</div>
              <div className="command-desc">{cmd.description}</div>
            </div>
            {index === selectedIndex && <div className="enter-hint">↵ Enter</div>}
          </div>
        );
      })}
    </div>
  );
};
