import { afterEach, expect, it, vi } from 'vitest';
import { generateRandomNickname } from '../apps/web/src/lib/random-nickname';
import { ProfileInputSchema } from '../packages/protocol/src';

afterEach(() => vi.restoreAllMocks());

it('生成英文词组合昵称并满足服务器昵称约束', () => {
  const random = vi.spyOn(Math, 'random');
  const names = new Set<string>();
  for (let adjective = 0; adjective < 40; adjective++) {
    for (let theme = 0; theme < 32; theme++) {
      for (let animal = 0; animal < 64; animal++) {
        random.mockReturnValueOnce((adjective + 0.5) / 40)
          .mockReturnValueOnce((theme + 0.5) / 32)
          .mockReturnValueOnce((animal + 0.5) / 64);
        const nickname = generateRandomNickname();
        expect(nickname).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+[A-Z][a-z]+$/);
        expect(ProfileInputSchema.safeParse({ nickname, avatar: '' }).success).toBe(true);
        names.add(nickname);
      }
    }
  }
  expect(names.size).toBe(81920);
});

it('随机源再次选中当前名称时，换一个仍会产生不同名称', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const first = generateRandomNickname();
  expect(first).toBe('BraveAmberFox');
  expect(generateRandomNickname(first)).toBe('BraveAmberCat');
});

it('随机范围上界不产生空词或 undefined', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.999999);
  expect(generateRandomNickname()).toBe('ZestyWinterZebra');
});
