import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../components/chat/MessageBubble';
import type { MessageResponse } from '@haruos/shared-types';

function createMessage(overrides: Partial<MessageResponse> = {}): MessageResponse {
  return {
    id: '1',
    role: 'user',
    content: 'Hello',
    metadata: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('MessageBubble', () => {
  it('사용자 메시지: 우측 정렬 + 파란색 배경', () => {
    const { container } = render(
      <MessageBubble message={createMessage({ role: 'user', content: '안녕하세요' })} />,
    );

    expect(screen.getByText('안녕하세요')).toBeInTheDocument();
    // 사용자 메시지는 justify-end
    expect(container.querySelector('.justify-end')).toBeInTheDocument();
  });

  it('어시스턴트 메시지: 좌측 정렬 + 회색 배경', () => {
    const { container } = render(
      <MessageBubble message={createMessage({ role: 'assistant', content: '반갑습니다' })} />,
    );

    expect(screen.getByText('반갑습니다')).toBeInTheDocument();
    expect(container.querySelector('.justify-start')).toBeInTheDocument();
  });

  it('bold 마크다운 렌더링', () => {
    render(
      <MessageBubble message={createMessage({ role: 'assistant', content: '이것은 **굵은 글씨**입니다' })} />,
    );

    const bold = screen.getByText('굵은 글씨');
    expect(bold.tagName).toBe('STRONG');
  });

  it('인라인 코드 렌더링', () => {
    render(
      <MessageBubble message={createMessage({ role: 'assistant', content: '명령어: `npm install`' })} />,
    );

    const code = screen.getByText('npm install');
    expect(code.tagName).toBe('CODE');
  });
});
