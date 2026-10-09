import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/useRoomStore';

export const GameResultPage: React.FC = () => {
  const navigate = useNavigate();
  const room = useRoomStore((s) => s.room);

  // Compatibility redirect: route is restored by GameRouteCoordinator or redirected directly to room
  useEffect(() => {
    if (room?.roomId) {
      navigate(`/room/${room.roomId}`, { replace: true });
    }
  }, [room?.roomId, navigate]);

  return null;
};
