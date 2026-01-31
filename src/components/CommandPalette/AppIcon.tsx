import React, { useEffect, useState } from 'react';

interface AppIconProps {
  iconUrl?: string;
  fallback?: React.ReactNode;
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({ iconUrl, fallback, className }) => {
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!iconUrl) {
      setProcessedUrl(null);
      return;
    }

    if (iconUrl.startsWith('icon-bgra:') || iconUrl.startsWith('raw-bgra:')) {
      try {
        const b64 = iconUrl.split(':')[1];
        const binaryString = window.atob(b64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create a canvas to convert BGRA to RGBA and then to a Data URL/Blob
        const SIZE = 48; 
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.createImageData(SIZE, SIZE);
        const data = imageData.data;

        // BGRA to RGBA conversion
        for (let i = 0; i < bytes.length; i += 4) {
          data[i] = bytes[i + 2];     // R
          data[i + 1] = bytes[i + 1]; // G
          data[i + 2] = bytes[i];     // B
          data[i + 3] = bytes[i + 3]; // A
        }

        ctx.putImageData(imageData, 0, 0);
        setProcessedUrl(canvas.toDataURL());
      } catch (e) {
        console.error('[AppIcon] Failed to process BGRA icon:', e);
        setProcessedUrl(null);
      }
    } else {
      setProcessedUrl(iconUrl);
    }
  }, [iconUrl]);

  if (!processedUrl) return <>{fallback}</>;

  return (
    <img 
      src={processedUrl} 
      alt="" 
      className={className} 
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        if (e.currentTarget.parentElement) {
          // Trigger fallback if image completely fails
          // Note: This is a bit hacky but keeps the logic isolated
          const container = e.currentTarget.parentElement;
          const fallbackPlaceholder = document.createElement('span');
          fallbackPlaceholder.innerText = typeof fallback === 'string' ? fallback : '📦';
          container.appendChild(fallbackPlaceholder);
        }
      }} 
    />
  );
};
