import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom React hook for managing WebSocket signaling connection.
 * Handles auto-reconnect, heartbeats, and message queues.
 */
export const useWebSocket = (url, onMessageCallback) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const messageQueueRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  const cleanUp = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((type, roomId, payload = {}) => {
    const messageObj = { type, roomId, payload };
    const messageStr = JSON.stringify(messageObj);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(messageStr);
    } else {
      // Queue message if socket is not open yet
      messageQueueRef.current.push(messageStr);
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current) return;

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        console.log('[SignalingWS] Connected to signaling server');

        // Send any queued messages
        while (messageQueueRef.current.length > 0) {
          const msg = messageQueueRef.current.shift();
          socket.send(msg);
        }

        // Start heartbeat ping/pong to keep connection alive
        heartbeatIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'PING' }));
          }
        }, 30000);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PONG') return; // Ignore heartbeat responses
          if (onMessageCallback) {
            onMessageCallback(data);
          }
        } catch (err) {
          console.error('[SignalingWS] Error parsing message:', err);
        }
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        socketRef.current = null;
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        
        console.log(`[SignalingWS] Connection closed: Code=${event.code}, Reason=${event.reason}`);
        
        // Attempt to reconnect if not closed intentionally
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[SignalingWS] Attempting reconnect...');
            connect();
          }, 3000);
        }
      };

      socket.onerror = (error) => {
        console.error('[SignalingWS] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[SignalingWS] Error establishing WebSocket connection:', error);
    }
  }, [url, onMessageCallback]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    cleanUp();
  }, [cleanUp]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { isConnected, connect, disconnect, send };
};
export default useWebSocket;
