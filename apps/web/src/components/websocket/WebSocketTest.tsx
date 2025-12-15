import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Send, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * WebSocket Test Component
 * 
 * Demonstrates Phase 1 implementation:
 * - Backend WebSocket connection
 * - React useWebSocket hook
 * - Authentication flow
 * - Connection/reconnection handling
 */
export function WebSocketTest() {
  const [messages, setMessages] = useState<Array<{ type: string; data: any; timestamp: number }>>([]);
  const [testMessage, setTestMessage] = useState('');

  // Get WebSocket URL from environment or default to localhost
  const wsUrl = import.meta.env.PUBLIC_WS_URL || 'ws://localhost:3000/ws';

  const ws = useWebSocket({
    url: wsUrl,
    autoConnect: true,
    onOpen: () => {
      toast.success('WebSocket connected', {
        description: 'Real-time connection established'
      });
    },
    onClose: () => {
      toast.info('WebSocket disconnected', {
        description: 'Connection closed'
      });
    },
    onError: (error) => {
      toast.error('WebSocket error', {
        description: 'Connection error occurred'
      });
    }
  });

  useEffect(() => {
    // Listen for authentication success
    const handleAuthSuccess = (data: any) => {
      toast.success('Authenticated', {
        description: `Client ID: ${data.client_id}`
      });
      addMessage('auth-success', data);
    };

    // Listen for authentication failure
    const handleAuthFailed = (data: any) => {
      toast.error('Authentication failed', {
        description: data.error
      });
      addMessage('auth-failed', data);
    };

    // Listen for pong responses
    const handlePong = (data: any) => {
      const latency = Date.now() - data.timestamp;
      addMessage('pong', { ...data, latency });
    };

    // Listen for action messages
    const handleAction = (data: any) => {
      toast.info('Action received', {
        description: JSON.stringify(data)
      });
      addMessage('action', data);
    };

    ws.on('auth-success', handleAuthSuccess);
    ws.on('auth-failed', handleAuthFailed);
    ws.on('pong', handlePong);
    ws.on('action', handleAction);

    return () => {
      ws.off('auth-success', handleAuthSuccess);
      ws.off('auth-failed', handleAuthFailed);
      ws.off('pong', handlePong);
      ws.off('action', handleAction);
    };
  }, [ws]);

  const addMessage = (type: string, data: any) => {
    setMessages(prev => [...prev, {
      type,
      data,
      timestamp: Date.now()
    }].slice(-10)); // Keep last 10 messages
  };

  const handleSendPing = () => {
    if (ws.isConnected) {
      ws.send('ping', { timestamp: Date.now() });
      toast.info('Ping sent');
    } else {
      toast.error('Not connected');
    }
  };

  const handleSendTest = () => {
    if (ws.isConnected && testMessage.trim()) {
      ws.send('action', { 
        message: testMessage,
        timestamp: Date.now()
      });
      toast.success('Message sent');
      setTestMessage('');
    } else {
      toast.error('Enter a message or check connection');
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              WebSocket Test - Phase 1
              {ws.isConnected ? (
                <Badge variant="default" className="gap-1">
                  <Wifi className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <WifiOff className="h-3 w-3" />
                  Disconnected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Testing real-time WebSocket connection
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground">
            {ws.reconnectAttempts > 0 && (
              <span>Reconnect attempts: {ws.reconnectAttempts}</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Info */}
        <div className="rounded-lg border p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">WebSocket URL:</span>
            <span className="font-mono text-xs">{wsUrl}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <span className={ws.isConnected ? 'text-green-500' : 'text-red-500'}>
              {ws.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={handleSendPing}
            disabled={!ws.isConnected}
            variant="outline"
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Ping
          </Button>
          
          <Button
            onClick={ws.isConnected ? ws.disconnect : ws.connect}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {ws.isConnected ? 'Disconnect' : 'Connect'}
          </Button>
        </div>

        {/* Test Message */}
        <div className="flex gap-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
            placeholder="Enter test message..."
            className="flex-1 px-3 py-2 text-sm border rounded-md"
            disabled={!ws.isConnected}
          />
          <Button
            onClick={handleSendTest}
            disabled={!ws.isConnected || !testMessage.trim()}
            size="sm"
          >
            Send
          </Button>
        </div>

        {/* Message Log */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Message Log</h4>
          <div className="rounded-lg border p-3 h-64 overflow-y-auto space-y-2 bg-muted/20">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No messages yet. Send a ping or connect to see activity.
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className="text-xs font-mono p-2 rounded bg-background border"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {msg.type}
                    </Badge>
                    <span className="text-muted-foreground">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <pre className="text-[10px] overflow-x-auto">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950/20 text-sm space-y-2">
          <h4 className="font-medium">✅ Phase 1 Complete</h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            <li>Backend WebSocket server (Rust/Axum)</li>
            <li>React useWebSocket hook</li>
            <li>Authentication flow</li>
            <li>Auto-reconnection with exponential backoff</li>
            <li>Ping/pong heartbeat</li>
            <li>Event-based messaging</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
