import type { FC } from 'react';
import { useAppStore } from '../../../stores/useAppStore';
import { ShortcutRecorder } from '../../../components/Settings/ShortcutRecorder';

interface ShortcutsTabProps {
  syncSetting: (key: string, value: any) => void;
}

export const ShortcutsTab: FC<ShortcutsTabProps> = ({ syncSetting }) => {
  const { 
    shortcutSummon, setShortcutSummon,
    shortcutPTT, setShortcutPTT
  } = useAppStore();

  return (
    <div className="tab-content fade-in">
       <div className="settings-group">
         <div className="setting-row">
           <ShortcutRecorder 
              label="Summon Jarvis" 
              value={shortcutSummon} 
              onChange={(val) => { setShortcutSummon(val); syncSetting('shortcutSummon', val); }} 
           />
         </div>
         <div className="setting-row">
           <ShortcutRecorder 
              label="Push to Talk" 
              value={shortcutPTT} 
              onChange={(val) => { setShortcutPTT(val); syncSetting('shortcutPTT', val); }} 
           />
         </div>
      </div>
    </div>
  );
};
