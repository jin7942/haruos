import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { WsNotification, WsConnectionState } from '@haruos/shared-types';
import { getAccessToken } from '../api/client';

/** 지수 백오프 재연결 설정. */
const INITIAL_DELAY = 1000;
const MAX_DELAY = 30000;
const BACKOFF_FACTOR = 2;

interface UseWebSocketOptions {
  /** WebSocket namespace (기본: '/ws/haru') */
  namespace?: string;
  /** 알림 수신 콜백 */
  onNotification?: (notification: WsNotification) => void;
  /** 자동 연결 여부 (기본: true) */
  autoConnect?: boolean;
}

/**
 * WebSocket 커스텀 훅.
 * 자동 재연결 (지수 백오프: 1초 -> 2초 -> 4초, 최대 30초)을 지원한다.
 * JWT 토큰을 query param으로 전달하여 인증한다.
 *
 * @param options - WebSocket 옵션
 * @returns 연결 상태, 수동 연결/해제 함수
 */
export function useWebSocket(options: UseWebSocketOptions = {}): {
  connectionState: WsConnectionState;
  connect: () => void;
  disconnect: () => void;
  socket: Socket | null;
} {
  const {
    namespace = '/ws/haru',
    onNotification,
    autoConnect = true,
  } = options;

  const [connectionState, setConnectionState] = useState<WsConnectionState>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // 기존 연결 정리
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const token = getAccessToken();
    if (!token) {
      setConnectionState('disconnected');
      return;
    }

    const socket = io(namespace, {
      query: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      reconnectAttemptRef.current = 0;
      setConnectionState('connected');
    });

    socket.on('disconnect', () => {
      setConnectionState('disconnected');
      scheduleReconnect();
    });

    socket.on('connect_error', () => {
      setConnectionState('reconnecting');
      scheduleReconnect();
    });

    socket.on('notification', (notification: WsNotification) => {
      onNotificationRef.current?.(notification);
    });

    socketRef.current = socket;
  }, [namespace]);

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimer();

    const delay = Math.min(
      INITIAL_DELAY * Math.pow(BACKOFF_FACTOR, reconnectAttemptRef.current),
      MAX_DELAY,
    );
    reconnectAttemptRef.current++;

    setConnectionState('reconnecting');

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, clearReconnectTimer]);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    reconnectAttemptRef.current = 0;
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionState('disconnected');
  }, [clearReconnectTimer]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connectionState,
    connect,
    disconnect,
    socket: socketRef.current,
  };
}
