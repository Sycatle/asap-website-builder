"use client"

import { useState, useEffect } from 'react'
import { DeviceSelector, type DeviceType, type Orientation, DEVICES } from './device-selector'
import { DeviceFrame } from './device-frame'
import { cn } from '@/lib/utils'

interface ResponsivePreviewProps {
  children: React.ReactNode
  className?: string
  defaultDevice?: DeviceType
  defaultZoom?: number
}

export function ResponsivePreview({
  children,
  className,
  defaultDevice = 'desktop',
  defaultZoom = 1
}: ResponsivePreviewProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>(defaultDevice)
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [zoom, setZoom] = useState(defaultZoom)

  // Auto-fit zoom when device changes
  useEffect(() => {
    const device = DEVICES[selectedDevice]
    
    // Reset orientation to default for the device
    setOrientation(device.defaultOrientation)
    
    // Store device preference
    try {
      localStorage.setItem('studio-preview-device', selectedDevice)
      localStorage.setItem('studio-preview-zoom', zoom.toString())
    } catch (e) {
      // Silent fail for localStorage
    }
  }, [selectedDevice, zoom])

  // Load preferences on mount
  useEffect(() => {
    try {
      const savedDevice = localStorage.getItem('studio-preview-device') as DeviceType
      const savedZoom = localStorage.getItem('studio-preview-zoom')
      
      if (savedDevice && DEVICES[savedDevice]) {
        setSelectedDevice(savedDevice)
      }
      if (savedZoom) {
        setZoom(parseFloat(savedZoom))
      }
    } catch (e) {
      // Silent fail for localStorage
    }
  }, [])

  const handleOrientationToggle = () => {
    setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Device Selector Toolbar */}
      <DeviceSelector
        selectedDevice={selectedDevice}
        orientation={orientation}
        onDeviceChange={setSelectedDevice}
        onOrientationToggle={handleOrientationToggle}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      {/* Preview Area with Device Frame */}
      <div className="flex-1 relative overflow-auto bg-muted/30">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <DeviceFrame
            device={selectedDevice}
            orientation={orientation}
            zoom={zoom}
          >
            <div 
              className="w-full h-full overflow-auto"
              style={{
                transform: `scale(${1})`,
                transformOrigin: 'top left'
              }}
            >
              {children}
            </div>
          </DeviceFrame>
        </div>
      </div>
    </div>
  )
}
