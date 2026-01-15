"use client"

import { Monitor, Laptop, Tablet, Smartphone, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export type DeviceType = 'desktop' | 'laptop' | 'tablet' | 'mobile'
export type Orientation = 'portrait' | 'landscape'

export interface DeviceConfig {
  type: DeviceType
  name: string
  width: number
  height: number
  icon: React.ComponentType<{ className?: string }>
  defaultOrientation: Orientation
}

export const DEVICES: Record<DeviceType, DeviceConfig> = {
  desktop: {
    type: 'desktop',
    name: 'Desktop',
    width: 1920,
    height: 1080,
    icon: Monitor,
    defaultOrientation: 'landscape'
  },
  laptop: {
    type: 'laptop',
    name: 'Laptop',
    width: 1440,
    height: 900,
    icon: Laptop,
    defaultOrientation: 'landscape'
  },
  tablet: {
    type: 'tablet',
    name: 'Tablet',
    width: 768,
    height: 1024,
    icon: Tablet,
    defaultOrientation: 'portrait'
  },
  mobile: {
    type: 'mobile',
    name: 'Mobile',
    width: 375,
    height: 667,
    icon: Smartphone,
    defaultOrientation: 'portrait'
  }
}

interface DeviceSelectorProps {
  selectedDevice: DeviceType
  orientation: Orientation
  onDeviceChange: (device: DeviceType) => void
  onOrientationToggle: () => void
  zoom: number
  onZoomChange: (zoom: number) => void
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

export function DeviceSelector({
  selectedDevice,
  orientation,
  onDeviceChange,
  onOrientationToggle,
  zoom,
  onZoomChange
}: DeviceSelectorProps) {
  const currentDevice = DEVICES[selectedDevice]
  const Icon = currentDevice.icon

  const canRotate = selectedDevice === 'tablet' || selectedDevice === 'mobile'

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-background border-b border-border">
      {/* Device Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Icon className="h-4 w-4" />
            <span>{currentDevice.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.values(DEVICES).map((device) => {
            const DeviceIcon = device.icon
            return (
              <DropdownMenuItem
                key={device.type}
                onClick={() => onDeviceChange(device.type)}
                className="gap-2"
              >
                <DeviceIcon className="h-4 w-4" />
                <span>{device.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {device.width}×{device.height}
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Orientation Toggle */}
      {canRotate && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOrientationToggle}
          className="gap-2"
        >
          <RotateCw className="h-4 w-4" />
          <span className="hidden sm:inline">
            {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
          </span>
        </Button>
      )}

      {/* Zoom Control */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm text-muted-foreground">Zoom:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {Math.round(zoom * 100)}%
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ZOOM_LEVELS.map((level) => (
              <DropdownMenuItem
                key={level}
                onClick={() => onZoomChange(level)}
              >
                {Math.round(level * 100)}%
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onZoomChange(1)}>
              Reset to 100%
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Device Dimensions Display */}
      <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
        <span>
          {orientation === 'portrait' 
            ? `${currentDevice.width}×${currentDevice.height}`
            : `${currentDevice.height}×${currentDevice.width}`
          }
        </span>
      </div>
    </div>
  )
}
