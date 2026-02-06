import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getApiUrl } from '@/lib/query-client';

interface SocketContextType {
    socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (user?.id) {
            const baseUrl = getApiUrl();
            // Connect to socket server
            socketRef.current = io(baseUrl, {
                query: { userId: user.id },
                transports: ['websocket'], // Use websocket directly for speed
            });

            console.log(`[Socket] Connecting for user ${user.id} at ${baseUrl}`);

            socketRef.current.on('connect', () => {
                console.log('[Socket] Connected');
            });

            socketRef.current.on('disconnect', () => {
                console.log('[Socket] Disconnected');
            });

            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }
            };
        }
    }, [user?.id]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current }}>
            {children}
        </SocketContext.Provider>
    );
};
