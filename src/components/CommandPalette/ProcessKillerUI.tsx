import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useResourceStore } from '../../stores/useResourceStore';
import './ProcessKillerUI.css';

interface ProcessInfo {
  pid: number;
  name: string;
  cpu_usage: number;
  memory: number;
}

interface ProcessKillerUIProps {
  initialTarget: string;
  onQueryChange: (q: string) => void;
}

export const ProcessKillerUI: React.FC<ProcessKillerUIProps> = ({ initialTarget }) => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminatingId, setTerminatingId] = useState<number | null>(null);

  const fetchProcesses = async () => {
    try {
      const all: ProcessInfo[] = await invoke('list_processes');
      const filtered = all.filter(p => 
        p.name.toLowerCase().includes(initialTarget.toLowerCase())
      ).slice(0, 5);
      setProcesses(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, [initialTarget]);

  const handleKill = async (pid: number, name: string, isTree: boolean = false) => {
    setTerminatingId(pid);
    try {
      if (isTree) {
        await invoke('kill_process_tree', { pid });
        useResourceStore.getState().speak(`Terminated ${name} and its child processes`);
      } else {
        await invoke('kill_process_by_pid', { pid });
        useResourceStore.getState().speak(`Terminated ${name}`);
      }
      // Refresh list
      setProcesses(prev => prev.filter(p => p.pid !== pid));
    } catch (err) {
      console.error(err);
    } finally {
      setTerminatingId(null);
    }
  };

  if (loading) return <div className="process-killer-loading">Searching for processes...</div>;
  if (processes.length === 0) return <div className="process-killer-empty">No running processes matching "{initialTarget}"</div>;

  return (
    <div className="process-killer-ui">
      <div className="process-list">
        {processes.map(p => (
          <div key={p.pid} className="process-item">
            <div className="process-info">
              <span className="process-name">{p.name}</span>
              <span className="process-stats">
                {p.cpu_usage.toFixed(1)}% CPU • {(p.memory / 1024 / 1024).toFixed(0)}MB (PID: {p.pid})
              </span>
            </div>
            <div className="process-actions">
              <button 
                className={`kill-action-btn ${terminatingId === p.pid ? 'killing' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleKill(p.pid, p.name, false); }}
                disabled={terminatingId !== null}
              >
                {terminatingId === p.pid ? '...' : 'Kill'}
              </button>
              <button 
                className={`kill-tree-btn ${terminatingId === p.pid ? 'killing' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleKill(p.pid, p.name, true); }}
                disabled={terminatingId !== null}
                title="Kill process and all descendants"
              >
                Tree
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="process-footer">
        Found {processes.length} matching processes
      </div>
    </div>
  );
};
