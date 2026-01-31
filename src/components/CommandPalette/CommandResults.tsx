import React, { Suspense, useRef, useEffect } from 'react';
import type { Command } from '../../utils/commandRegistry';

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
  return <>{cmd.component && cmd.component({ onQueryChange, data: cmd.interactiveData })}</>;
};

export const CommandResults: React.FC<CommandResultsProps> = ({
  filteredCommands,
  selectedIndex,
  setSelectedIndex,
  executeCommand,
  query,
  setQuery
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedElement = containerRef.current?.querySelector('.selected, .selected-component');
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (filteredCommands.length === 0) {
    return <div className="no-results">No matches for "{query}"</div>;
  }

  return (
    <div className="results-section" ref={containerRef}>
      {filteredCommands.map((cmd, index) => {
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
            className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
            onClick={() => executeCommand(cmd)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="ordinal-badge">{index + 1}</div>
            <span className="command-icon">
              {cmd.iconUrl ? (
                <img 
                  src={cmd.iconUrl} 
                  alt="" 
                  className="command-favicon" 
                  loading="lazy"
                  onError={(e) => (e.currentTarget.style.display = 'none')} 
                />
              ) : cmd.icon}
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
