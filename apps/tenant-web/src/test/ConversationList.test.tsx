import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../hooks/useHaru', () => ({
  useConversations: vi.fn(),
}));

vi.mock('@haruos/shared-utils', () => ({
  formatDateTime: (d: string) => d,
}));

import { ConversationList } from '../components/chat/ConversationList';

// useConversations를 모듈 내에서 mock 해야 함
// 경로 문제 때문에 직접 mock
vi.mock('../hooks/useHaru', () => ({
  useConversations: vi.fn(),
}));

import { useConversations } from '../hooks/useHaru';
const mockedUseConversations = vi.mocked(useConversations);

function renderWithQuery(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('ConversationList', () => {
  it('대화 목록 렌더링', () => {
    mockedUseConversations.mockReturnValue({
      data: [
        { id: '1', title: '첫 번째 대화', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: '2', title: '두 번째 대화', createdAt: '2026-01-02', updatedAt: '2026-01-02' },
      ],
      isLoading: false,
    } as any);

    renderWithQuery(
      <ConversationList onSelect={vi.fn()} onNewChat={vi.fn()} />,
    );

    expect(screen.getByText('첫 번째 대화')).toBeInTheDocument();
    expect(screen.getByText('두 번째 대화')).toBeInTheDocument();
  });

  it('대화 없을 때 빈 상태 메시지', () => {
    mockedUseConversations.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderWithQuery(
      <ConversationList onSelect={vi.fn()} onNewChat={vi.fn()} />,
    );

    expect(screen.getByText('대화가 없습니다')).toBeInTheDocument();
  });

  it('대화 선택 시 onSelect 호출', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    mockedUseConversations.mockReturnValue({
      data: [
        { id: '1', title: '테스트 대화', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      ],
      isLoading: false,
    } as any);

    renderWithQuery(
      <ConversationList onSelect={onSelect} onNewChat={vi.fn()} />,
    );

    await user.click(screen.getByText('테스트 대화'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('로딩 중 스피너 표시', () => {
    mockedUseConversations.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = renderWithQuery(
      <ConversationList onSelect={vi.fn()} onNewChat={vi.fn()} />,
    );

    // Spinner role="status"
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });
});
