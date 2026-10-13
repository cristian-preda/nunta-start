import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataError } from './errors';

let result: { data: unknown; error: null | { message: string }; status: number };
const calls: string[] = [];

vi.mock('../lib/supabase', () => {
  const chain: object = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(result);
        return (...args: unknown[]) => {
          calls.push(`${prop}:${args.map(String).join(',')}`);
          return chain;
        };
      },
    },
  );
  return { getSupabase: () => ({ from: () => chain, rpc: () => chain }) };
});
vi.mock('../lib/session', () => ({ useSession: { getState: () => ({ user: { id: 'u1' } }) } }));
vi.mock('../lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn(), removeQueries: vi.fn() },
}));

import { createMembersClient } from './members';

const client = createMembersClient('w1');

beforeEach(() => {
  calls.length = 0;
  result = { data: [{ id: 'm1' }], error: null, status: 200 };
});

describe('members client enforces what RLS decides', () => {
  it('resolves when the row was changed, removed or left', async () => {
    await expect(client.changeRole('m1', 'viewer')).resolves.toBeUndefined();
    await expect(client.remove('m1')).resolves.toBeUndefined();
    await expect(client.leave()).resolves.toBeUndefined();
  });

  it("leave deletes only the caller's own membership of this wedding", async () => {
    await client.leave();
    expect(calls).toContain('eq:wedding_id,w1');
    expect(calls).toContain('eq:user_id,u1');
  });

  it('a change, removal or leave that RLS filtered out (no rows) is a 403, not a silent success', async () => {
    result = { data: [], error: null, status: 200 };
    for (const attempt of [() => client.changeRole('o1', 'viewer'), () => client.remove('o1'), () => client.leave()]) {
      await expect(attempt()).rejects.toBeInstanceOf(DataError);
      await expect(attempt()).rejects.toMatchObject({ status: 403 });
    }
  });
});
