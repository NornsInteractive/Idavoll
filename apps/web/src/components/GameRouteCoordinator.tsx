import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';
import { retryRoom } from '../services/room-session';

export const GameRouteCoordinator: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = useUserStore((s) => s.id);
  const room = useRoomStore((s) => s.room);
  const connectionState = useRoomStore((s) => s.connectionState);
  const gameState = useGameStore((s) => s.gameState);
  const isRetryingRef = useRef(false);

  const pathname = location.pathname;
  const isGameRoute = pathname.startsWith('/game/');
  const isGameOrRoomRoute = isGameRoute || pathname.startsWith('/room/');

  // Auto restore room if page refreshed while directly on an in-game page
  useEffect(() => {
    if (!isGameRoute || isRetryingRef.current) return;

    if (!room && connectionState === 'disconnected') {
      const savedRoomId = sessionStorage.getItem('idavoll-room-id');
      if (savedRoomId && !isRetryingRef.current) {
        isRetryingRef.current = true;
        retryRoom()
          .catch(() => {
            navigate('/lobby', { replace: true });
          })
          .finally(() => {
            isRetryingRef.current = false;
          });
      } else if (!savedRoomId) {
        // Direct visit to in-game page without any session -> return to lobby
        navigate('/lobby', { replace: true });
      }
    }
  }, [isGameRoute, room, connectionState, navigate]);

  // Synchronize route with server room and game turn state ONLY when inside game or room routes
  useEffect(() => {
    if (!room) return;
    if (!isGameOrRoomRoute) return;

    if (room.status === 'waiting') {
      if (pathname.startsWith('/game/')) {
        navigate(`/room/${room.roomId}`, { replace: true });
      }
    } else if (room.status === 'playing') {
      if (gameState?.status === 'game_over') {
        if (pathname !== `/room/${room.roomId}`) {
          navigate(`/room/${room.roomId}`, { replace: true });
        }
      } else if ((room.settings?.gameId as string) === 'gomoku') {
        if (pathname !== '/game/gomoku') {
          navigate('/game/gomoku', { replace: true });
        }
      } else if (gameState?.drawerId) {
        const isMeDrawer = gameState.drawerId === userId;
        if (isMeDrawer) {
          if (pathname !== '/game/drawer' && pathname !== '/game/fullscreen') {
            navigate('/game/drawer', { replace: true });
          }
        } else {
          if (pathname !== '/game/guesser' && pathname !== '/game/fullscreen') {
            navigate('/game/guesser', { replace: true });
          }
        }
      }
    } else if (room.status === 'settlement') {
      if (pathname !== `/room/${room.roomId}`) {
        navigate(`/room/${room.roomId}`, { replace: true });
      }
    }
  }, [room?.status, room?.roomId, room?.settings?.gameId, gameState?.status, gameState?.drawerId, userId, isGameOrRoomRoute, pathname, navigate]);

  return <>{children}</>;
};
