import type { FC } from 'react';

export const AboutTab: FC = () => {
  return (
    <div className="tab-content fade-in">
      <div className="about-branding">
         <div className="about-logo">🦊</div>
         <h2>Jarvis Voice Access</h2>
         <p className="version-text">Version 0.1.0-alpha</p>
      </div>
    </div>
  );
};
