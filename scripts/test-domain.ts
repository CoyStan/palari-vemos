/**
 * Domain unit smoke tests against real TypeScript sources.
 * Run: npm run test:domain
 */
import assert from 'node:assert/strict';

import {
  buildInviteText,
  catchUpStatus,
  computePlanStatus,
  rhythmDays,
} from '../src/domain/model';
import type { Friend, PlanFriend } from '../src/domain/types';

const now = new Date('2026-07-21T12:00:00.000Z');

function friend(partial: Partial<Friend> & Pick<Friend, 'id' | 'name'>): Friend {
  return {
    photoUri: null,
    phone: '',
    shareMethod: 'message',
    rhythm: 'weekly',
    customDays: 45,
    lastMetAt: null,
    createdAt: now.toISOString(),
    ...partial,
  };
}

function planFriend(friendId: string, status: PlanFriend['status']): PlanFriend {
  return { friendId, status, invitationText: '' };
}

assert.equal(rhythmDays(friend({ id: '1', name: 'Ana', rhythm: 'none' })), null);
assert.equal(rhythmDays(friend({ id: '1', name: 'Ana', rhythm: 'weekly' })), 7);
assert.equal(rhythmDays(friend({ id: '1', name: 'Ana', rhythm: 'custom', customDays: 10 })), 10);

assert.equal(catchUpStatus(friend({ id: '1', name: 'Ana', lastMetAt: null }), now), 'due');
assert.equal(
  catchUpStatus(friend({ id: '1', name: 'Ana', lastMetAt: '2026-07-20T12:00:00.000Z' }), now),
  'none',
);

assert.equal(computePlanStatus([]), 'draft');
assert.equal(
  computePlanStatus([planFriend('a', 'not_invited'), planFriend('b', 'not_invited')]),
  'draft',
);
assert.equal(computePlanStatus([planFriend('a', 'yes'), planFriend('b', 'yes')]), 'on');
assert.equal(computePlanStatus([planFriend('a', 'waiting'), planFriend('b', 'yes')]), 'on');
assert.equal(computePlanStatus([planFriend('a', 'waiting'), planFriend('b', 'maybe')]), 'waiting');

const invite = buildInviteText({
  name: 'Ana',
  startAt: '2026-07-22T18:00:00.000Z',
  activity: 'coffee',
  place: 'the park',
  timeFormat24h: false,
});
assert.ok(invite.includes('Ana'));
assert.ok(invite.length > 20);

console.log('domain smoke tests: ok');
