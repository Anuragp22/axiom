'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface TokenAvatarProps {
  symbol: string;
  name?: string;
  size?: number;
  className?: string;
}

// Generate consistent colors based on symbol
function generateAvatarColor(symbol: string): { bg: string; text: string } {
  const colors = [
    { bg: 'bg-red-500', text: 'text-white' },
    { bg: 'bg-blue-500', text: 'text-white' },
    { bg: 'bg-green-500', text: 'text-white' },
    { bg: 'bg-purple-500', text: 'text-white' },
    { bg: 'bg-yellow-500', text: 'text-black' },
    { bg: 'bg-pink-500', text: 'text-white' },
    { bg: 'bg-indigo-500', text: 'text-white' },
    { bg: 'bg-orange-500', text: 'text-white' },
    { bg: 'bg-teal-500', text: 'text-white' },
    { bg: 'bg-cyan-500', text: 'text-black' },
  ];
  
  const index = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

function generateTokenImageUrl(symbol: string, size = 64): string {
  const colors = [
    'FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 
    'DDA0DD', 'FFB347', '87CEEB', 'F0E68C', 'FF69B4'
  ];
  
  const colorIndex = symbol.length % colors.length;
  const bgColor = colors[colorIndex];
  const textColor = 'FFFFFF';
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(symbol)}&size=${size}&background=${bgColor}&color=${textColor}&bold=true&format=png`;
}

export const TokenAvatar: React.FC<TokenAvatarProps> = ({
  symbol,
  name,
  size = 64,
  className,
}) => {
  const [imageError, setImageError] = useState(false);
  const colors = generateAvatarColor(symbol);
  
  // Get first 1-3 characters for the fallback
  const initials = symbol.length <= 3 ? symbol : symbol.substring(0, 3);
  
  const sizeClass = size <= 32 ? 'text-xs' : size <= 48 ? 'text-sm' : 'text-base';

  // CSS-based fallback avatar
  const FallbackAvatar = () => (
    <div 
      className={cn(
        "flex items-center justify-center rounded-lg font-bold",
        colors.bg,
        colors.text,
        sizeClass,
        className
      )}
      style={{ width: size, height: size }}
      title={name || symbol}
    >
      {initials}
    </div>
  );

  // If image failed to load or we want to skip external images, show fallback
  if (imageError) {
    return <FallbackAvatar />;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)} style={{ width: size, height: size }}>
      <Image
        src={generateTokenImageUrl(symbol, size)}
        alt={`${symbol} token`}
        width={size}
        height={size}
        className="object-cover"
        onError={() => setImageError(true)}
        onLoadingComplete={() => setImageError(false)}
        title={name || symbol}
        // Add priority for above-the-fold images
        priority={size > 48}
      />
    </div>
  );
};

// Simple CSS-only version for maximum reliability
export const SimpleTokenAvatar: React.FC<TokenAvatarProps> = ({
  symbol,
  name,
  size = 64,
  className,
}) => {
  const colors = generateAvatarColor(symbol);
  const initials = symbol.length <= 3 ? symbol : symbol.substring(0, 3);
  const sizeClass = size <= 32 ? 'text-xs' : size <= 48 ? 'text-sm' : 'text-base';

  return (
    <div 
      className={cn(
        "flex items-center justify-center rounded-lg font-bold shrink-0 relative",
        colors.bg,
        colors.text,
        sizeClass,
        className
      )}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`
      }}
      title={name || symbol}
    >
      {initials}
    </div>
  );
}; 