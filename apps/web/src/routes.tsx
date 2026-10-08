import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SplashLoginPage } from './pages/SplashLoginPage';
import { LobbyHomePage } from './pages/LobbyHomePage';
import { GameLibraryPage } from './pages/GameLibraryPage';
import { GameDetailPage } from './pages/GameDetailPage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { RoomWaitingPage } from './pages/RoomWaitingPage';
import { InGameDrawerPage } from './pages/InGameDrawerPage';
import { InGameGuesserPage } from './pages/InGameGuesserPage';
import { InGameFullscreenPage } from './pages/InGameFullscreenPage';
import { GameResultPage } from './pages/GameResultPage';
import { ProfilePage } from './pages/ProfilePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/lobby" replace /> },
      { path: 'login', element: <SplashLoginPage /> },
      { path: 'lobby', element: <LobbyHomePage /> },
      { path: 'games', element: <GameLibraryPage /> },
      { path: 'games/draw-and-guess', element: <GameDetailPage /> },
      { path: 'create-room', element: <CreateRoomPage /> },
      { path: 'room/:roomId', element: <RoomWaitingPage /> },
      { path: 'game/drawer', element: <InGameDrawerPage /> },
      { path: 'game/guesser', element: <InGameGuesserPage /> },
      { path: 'game/result', element: <GameResultPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  // Fullscreen view outside standard layout
  {
    path: 'game/fullscreen',
    element: <InGameFullscreenPage />,
  },
]);
