import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';

export interface CollisionSafePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  preferredPlacement?: 'top' | 'bottom';
  safeMargin?: number;
  dir?: 'rtl' | 'ltr';
}

export const CollisionSafePopover: React.FC<CollisionSafePopoverProps> = ({
  isOpen,
  onClose,
  triggerRef,
  children,
  className = '',
  preferredPlacement = 'top',
  safeMargin = 12,
  dir = 'rtl',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
    placement: 'top' | 'bottom';
  }>({
    left: safeMargin,
    bottom: 80,
    maxHeight: 400,
    placement: preferredPlacement,
  });

  const updatePosition = () => {
    if (!isOpen || !triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 1. Horizontal Clamping - Guarantee it never exits viewport/container bounds
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const popoverWidth = popoverRect.width || 320;
    
    // Calculate ideal left to center popover on trigger
    const idealLeft = triggerCenter - popoverWidth / 2;
    
    // Clamp within safe margins on all sides
    const minLeft = safeMargin;
    const maxLeft = Math.max(minLeft, vw - safeMargin - popoverWidth);
    const clampedLeft = Math.max(minLeft, Math.min(idealLeft, maxLeft));

    // 2. Vertical Collision Detection & Space Calculation
    // Top header clearance: ~68px from top of screen to prevent colliding with top header
    const topReserved = 68;
    const spaceAbove = triggerRect.top - topReserved;
    const spaceBelow = vh - triggerRect.bottom - safeMargin;

    let placement = preferredPlacement;
    if (preferredPlacement === 'top') {
      // If space above is too tight (< 180px) and there is more room below, flip
      if (spaceAbove < 180 && spaceBelow > spaceAbove) {
        placement = 'bottom';
      }
    } else {
      if (spaceBelow < 180 && spaceAbove > spaceBelow) {
        placement = 'top';
      }
    }

    let calculatedMaxHeight = 400;
    let newCoords: { left: number; top?: number; bottom?: number; maxHeight: number; placement: 'top' | 'bottom' };

    if (placement === 'top') {
      // Position above with 8px clearance so NO button is overlapped
      calculatedMaxHeight = Math.max(140, Math.min(560, spaceAbove - 8));
      const bottom = vh - triggerRect.top + 8;
      newCoords = {
        left: clampedLeft,
        bottom,
        maxHeight: calculatedMaxHeight,
        placement: 'top',
      };
    } else {
      // Position below with 8px clearance
      calculatedMaxHeight = Math.max(140, Math.min(560, spaceBelow - 8));
      const top = triggerRect.bottom + 8;
      newCoords = {
        left: clampedLeft,
        top,
        maxHeight: calculatedMaxHeight,
        placement: 'bottom',
      };
    }

    setCoords(newCoords);
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const timer = setTimeout(updatePosition, 16);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && 
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      dir={dir}
      style={{
        position: 'fixed',
        left: `${coords.left}px`,
        top: coords.top !== undefined ? `${coords.top}px` : undefined,
        bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
        maxHeight: `${coords.maxHeight}px`,
        maxWidth: `calc(100vw - ${safeMargin * 2}px)`,
        zIndex: 60,
      }}
      className={`overflow-y-auto custom-scrollbar shadow-2xl animate-in fade-in zoom-in-95 pointer-events-auto ${className}`}
    >
      {children}
    </div>
  );
};
