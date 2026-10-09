import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  pathname: '/game/guesser',
  room: { roomId: 'same-room', status: 'settlement' } as { roomId: string; status: string; settings?: { gameId: string } } | null,
  connectionState: 'connected',
  savedRoomId: 'same-room' as string | null,
  retrying: { current: false },
  game: { status: 'game_over', drawerId: 'me' },
  gomoku: null as { status: string } | null,
  navigate: vi.fn(),
  retry: vi.fn(),
}));
vi.mock('../apps/web/node_modules/react', async importOriginal => ({
  ...await importOriginal<typeof import('../apps/web/node_modules/react')>(),
  useEffect: (effect: () => void) => effect(),
  useRef: () => state.retrying,
}));
vi.mock('../apps/web/node_modules/react-router-dom', () => ({
  useLocation: () => ({ pathname: state.pathname }), useNavigate: () => state.navigate,
}));
vi.mock('../apps/web/src/store/useUserStore', () => ({ useUserStore: (selector: (s: unknown) => unknown) => selector({ id: 'me' }) }));
vi.mock('../apps/web/src/store/useRoomStore', () => ({ useRoomStore: (selector: (s: unknown) => unknown) => selector({ room: state.room, connectionState: state.connectionState }) }));
vi.mock('../apps/web/src/store/useGameStore', () => ({ useGameStore: (selector: (s: unknown) => unknown) => selector({ gameState: state.game }) }));
vi.mock('../apps/web/src/store/useGomokuStore', () => ({ useGomokuStore: (selector: (s: unknown) => unknown) => selector({ gameState: state.gomoku }) }));
vi.mock('../apps/web/src/services/room-session', () => ({ retryRoom: state.retry }));
import { GameRouteCoordinator } from '../apps/web/src/components/GameRouteCoordinator';

beforeEach(() => {
  state.pathname = '/game/guesser'; state.room = { roomId: 'same-room', status: 'settlement' }; state.game.status = 'game_over'; state.gomoku = null;
  state.connectionState = 'connected'; state.savedRoomId = 'same-room'; state.retrying.current = false;
  vi.stubGlobal('sessionStorage', { getItem: () => state.savedRoomId });
  vi.clearAllMocks();
});
afterEach(() => { vi.unstubAllGlobals(); });

it.each(['/game/drawer', '/game/guesser', '/game/fullscreen', '/game/result'])('结束时 %s 回到同一房间', path => {
  state.pathname = path;
  GameRouteCoordinator({ children: null });
  expect(state.navigate).toHaveBeenCalledExactlyOnceWith('/room/same-room', { replace: true });
  expect(state.retry).not.toHaveBeenCalled();
});

it('game_over 先于 room settlement 到达也回房间', () => {
  state.room!.status = 'playing';
  GameRouteCoordinator({ children: null });
  expect(state.navigate).toHaveBeenCalledExactlyOnceWith('/room/same-room', { replace: true });
});

it('已经在结算房间时不重复跳转', () => {
  state.pathname = '/room/same-room';
  GameRouteCoordinator({ children: null });
  expect(state.navigate).not.toHaveBeenCalled();
});

it('房主重置为 waiting 时旧 game_over 不把玩家送至结果页', () => {
  state.pathname = '/room/same-room'; state.room!.status = 'waiting';
  GameRouteCoordinator({ children: null });
  expect(state.navigate).not.toHaveBeenCalled();
});

it('恢复旧结果地址时连接过程暂时清空 savedRoomId，不误跳大厅', async () => {
  state.pathname = '/game/result'; state.room = null; state.connectionState = 'disconnected';
  let resolve!: () => void;
  const pending = new Promise<void>(done => { resolve = done; });
  state.retry.mockImplementationOnce(() => { state.savedRoomId = null; return pending; });
  GameRouteCoordinator({ children: null });
  GameRouteCoordinator({ children: null });
  expect(state.retry).toHaveBeenCalledTimes(1);
  expect(state.navigate).not.toHaveBeenCalled();
  resolve(); await pending;
});

it('旧结果地址没有可恢复房间时返回大厅', () => {
  state.pathname = '/game/result'; state.room = null; state.connectionState = 'disconnected'; state.savedRoomId = null;
  GameRouteCoordinator({ children: null });
  expect(state.navigate).toHaveBeenCalledExactlyOnceWith('/lobby', { replace: true });
  expect(state.retry).not.toHaveBeenCalled();
});

it.each(['playing', 'round_over'])('Gomoku %s enters the actual game while ignoring stale drawing state', status => {
  state.room = { roomId: 'same-room', status: 'playing', settings: { gameId: 'gomoku' } };
  state.gomoku = { status }; state.pathname = '/room/same-room';
  GameRouteCoordinator({ children: null });
  expect(state.navigate).toHaveBeenCalledExactlyOnceWith('/game/gomoku', { replace: true });
});

it('Gomoku game_over before room settlement returns to the same room', () => {
  state.room = { roomId: 'same-room', status: 'playing', settings: { gameId: 'gomoku' } };
  state.gomoku = { status: 'game_over' }; state.pathname = '/game/gomoku'; state.game.status = 'drawing';
  GameRouteCoordinator({ children: null });
  expect(state.navigate).toHaveBeenCalledExactlyOnceWith('/room/same-room', { replace: true });
});

it('Gomoku inter-round countdown keeps the game route without unnecessary redirects', () => {
  state.room = { roomId: 'same-room', status: 'playing', settings: { gameId: 'gomoku' } };
  state.gomoku = { status: 'round_over' }; state.pathname = '/game/gomoku';
  GameRouteCoordinator({ children: null });
  expect(state.navigate).not.toHaveBeenCalled();
});
