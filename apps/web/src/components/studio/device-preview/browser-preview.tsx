"use client"

import React, { useState, useEffect, useRef } from 'react'
import { DeviceSelector, type DeviceType, type Orientation, DEVICES } from './device-selector'
import { DeviceFrame } from './device-frame'
import { BrowserToolbar, useNavigation, usePreviewLinkInterceptor } from '../browser-controls'
import { cn } from '@/lib/utils'

interface BrowserPreviewProps {
  children: React.ReactNode
  className?: string
  defaultDevice?: DeviceType
  defaultZoom?: number
  websiteSlug: string // Slug of the website being edited
  initialPage?: string // Initial page to load
  onPageChange?: (page: string) => void // Callback when page changes
}

export function BrowserPreview({
  children,
  className,
  defaultDevice = 'desktop',
  defaultZoom = 1,
  websiteSlug,
  initialPage = '/',
  onPageChange
}: BrowserPreviewProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>(defaultDevice)
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [zoom, setZoom] = useState(defaultZoom)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  // Navigation state management
  const navigation = useNavigation({
    initialUrl: initialPage,
    baseUrl: `/${websiteSlug}`,
    onNavigate: (url) => {
      onPageChange?.(url)
    }
  })

  // Intercept link clicks in the preview
  usePreviewLinkInterceptor(
    iframeRef,
    navigation.navigate,
    `/${websiteSlug}`
  )

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

      {/* Browser Navigation Toolbar */}
      <BrowserToolbar
        currentUrl={navigation.currentUrl}
        canGoBack={navigation.canGoBack}
        canGoForward={navigation.canGoForward}
        onBack={navigation.goBack}
        onForward={navigation.goForward}
        onRefresh={navigation.refresh}
        onHome={navigation.goHome}
        onNavigate={navigation.navigate}
        isLoading={navigation.isLoading}
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
              {/* Clone children and inject iframe ref */}
              {React.cloneElement(
                children as React.ReactElement<{ ref?: React.Ref<HTMLIFrameElement> }>,
                {
                  ref: iframeRef,
                  key: navigation.currentUrl,
                },
              )}
            </div>
          </DeviceFrame>
        </div>
      </div>

      {/* Status Bar */}
      {navigation.isLoading && (
        <div className="px-4 py-2 bg-muted/50 border-t border-border text-xs text-muted-foreground flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span>Chargement de la page...</span>
        </div>
      )}
    </div>
  )
}
