"use client"

import { cn } from '@/lib/utils'
import type { DeviceType, Orientation } from './device-selector'
import { DEVICES } from './device-selector'

interface DeviceFrameProps {
  device: DeviceType
  orientation: Orientation
  zoom: number
  children: React.ReactNode
  className?: string
}

export function DeviceFrame({
  device,
  orientation,
  zoom,
  children,
  className
}: DeviceFrameProps) {
  const config = DEVICES[device]
  
  // Calculate dimensions based on orientation
  const width = orientation === 'portrait' ? config.width : config.height
  const height = orientation === 'portrait' ? config.height : config.width

  // Scale dimensions by zoom
  const scaledWidth = width * zoom
  const scaledHeight = height * zoom

  // Device-specific frame styling
  const getFrameStyles = () => {
    switch (device) {
      case 'desktop':
        return {
          padding: '2rem 2rem 3rem',
          borderRadius: '0.75rem',
          background: 'linear-gradient(145deg, hsl(var(--background)), hsl(var(--muted)))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }
      case 'laptop':
        return {
          padding: '1.5rem 1.5rem 2.5rem',
          borderRadius: '0.625rem',
          background: 'linear-gradient(145deg, hsl(var(--background)), hsl(var(--muted)))',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2)'
        }
      case 'tablet':
        return {
          padding: '2.5rem 1rem',
          borderRadius: '1.5rem',
          background: 'linear-gradient(145deg, hsl(var(--background)), hsl(var(--muted)))',
          boxShadow: '0 15px 30px -8px rgba(0, 0, 0, 0.2)',
          border: '1px solid hsl(var(--border))'
        }
      case 'mobile':
        return {
          padding: '3rem 0.75rem 3rem',
          borderRadius: '2rem',
          background: 'linear-gradient(145deg, hsl(var(--background)), hsl(var(--muted)))',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
          border: '1px solid hsl(var(--border))'
        }
    }
  }

  const frameStyles = getFrameStyles()

  return (
    <div
      className={cn(
        "device-frame relative transition-all duration-300",
        className
      )}
      style={{
        width: scaledWidth,
        height: scaledHeight,
        ...frameStyles
      }}
    >
      {/* Device Notch/Camera (Mobile only) */}
      {device === 'mobile' && orientation === 'portrait' && (
        <div 
          className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10"
          style={{ transform: `translateX(-50%) scale(${zoom})` }}
        >
          <div className="absolute inset-1 flex items-center justify-center gap-2">
            <div className="w-12 h-1 bg-gray-800 rounded-full" />
            <div className="w-2 h-2 bg-gray-800 rounded-full" />
          </div>
        </div>
      )}

      {/* Home Indicator (Mobile bottom bar) */}
      {device === 'mobile' && orientation === 'portrait' && (
        <div 
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-300 rounded-full"
          style={{ transform: `translateX(-50%) scale(${zoom})` }}
        />
      )}

      {/* Tablet Home Button */}
      {device === 'tablet' && orientation === 'portrait' && (
        <div 
          className="absolute bottom-3 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-2 border-gray-300"
          style={{ transform: `translateX(-50%) scale(${zoom})` }}
        />
      )}

      {/* Screen Content */}
      <div 
        className={cn(
          "device-screen relative w-full h-full overflow-hidden",
          device === 'mobile' ? 'rounded-[1.75rem]' : 
          device === 'tablet' ? 'rounded-[1.25rem]' : 
          'rounded-[0.5rem]'
        )}
        style={{
          backgroundColor: 'white',
          boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.1)'
        }}
      >
        {children}
      </div>
    </div>
  )
}
