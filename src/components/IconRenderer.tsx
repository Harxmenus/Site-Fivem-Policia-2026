import React from 'react';
import * as Icons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
}

export default function IconRenderer({ name, className = '', size = 24 }: IconRendererProps) {
  // Safe lookup in Lucide icons
  const LucideIcon = (Icons as any)[name];

  if (!LucideIcon) {
    // Fallback to a generic shield icon if not found
    return <Icons.Shield className={className} size={size} />;
  }

  return <LucideIcon className={className} size={size} />;
}
