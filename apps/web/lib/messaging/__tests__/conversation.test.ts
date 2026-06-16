import { describe, it, expect } from 'vitest';
import type { Conversation } from '@/lib/api/messaging';
import { otherParticipant, formatConversationPreview } from '../conversation';

function makeConv(over: Partial<Conversation>): Conversation {
  return {
    id: 'c1',
    participants: [
      { userId: 'me', firstName: 'Moi', lastName: 'X' },
      { userId: 'u2', firstName: 'Sara', lastName: 'Ben' },
    ],
    unreadCount: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastMessage: null,
    ...over,
  } as unknown as Conversation;
}

describe('otherParticipant', () => {
  it('returns the participant that is not the current user', () => {
    expect(otherParticipant(makeConv({}), 'me')?.userId).toBe('u2');
  });
});

describe('formatConversationPreview', () => {
  it('returns an opener when there is no last message', () => {
    expect(formatConversationPreview(makeConv({}), 'me')).toContain('Aucun message');
  });
  it('prefixes "Vous : " when the last message is mine', () => {
    const c = makeConv({ lastMessage: { id: 'm', senderId: 'me', body: 'Bonjour' } as never });
    expect(formatConversationPreview(c, 'me')).toBe('Vous : Bonjour');
  });
  it('truncates long messages to 77 chars + ellipsis', () => {
    const c = makeConv({ lastMessage: { id: 'm', senderId: 'u2', body: 'x'.repeat(100) } as never });
    const out = formatConversationPreview(c, 'me');
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBe(78);
  });
});
