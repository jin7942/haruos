import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// tenantApi mock
vi.mock('../api/tenant.api', () => ({
  tenantApi: {
    findAll: vi.fn(),
  },
}));

// useTenants mock
vi.mock('../hooks/useTenants', () => ({
  useTenants: vi.fn(),
}));

// shared-utils mock
vi.mock('@haruos/shared-utils', () => ({
  formatDate: (d: string) => d,
}));

import { DashboardPage } from '../pages/DashboardPage';
import { useTenants } from '../hooks/useTenants';

const mockedUseTenants = vi.mocked(useTenants);

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  it('로딩 중 스피너 표시', () => {
    mockedUseTenants.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    const { container } = renderWithProviders(<DashboardPage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('테넌트 카드 목록 렌더링', () => {
    mockedUseTenants.mockReturnValue({
      data: [
        {
          id: '1',
          name: 'Project A',
          slug: 'project-a',
          description: 'Test project',
          status: 'ACTIVE',
          plan: 'STARTER',
          region: 'ap-northeast-2',
          trialEndsAt: null,
          createdAt: '2026-01-01',
        },
        {
          id: '2',
          name: 'Project B',
          slug: 'project-b',
          description: null,
          status: 'CREATING',
          plan: 'STARTER',
          region: 'us-east-1',
          trialEndsAt: null,
          createdAt: '2026-01-02',
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<DashboardPage />);

    expect(screen.getByText('Project A')).toBeInTheDocument();
    expect(screen.getByText('Project B')).toBeInTheDocument();
    expect(screen.getByText('활성')).toBeInTheDocument();
    expect(screen.getByText('생성 중')).toBeInTheDocument();
  });

  it('테넌트가 없으면 빈 상태 메시지', () => {
    mockedUseTenants.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('아직 프로젝트가 없습니다.')).toBeInTheDocument();
  });

  it('에러 시 에러 메시지 표시', () => {
    mockedUseTenants.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
    } as any);

    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('프로젝트 목록을 불러오는데 실패했습니다.')).toBeInTheDocument();
  });
});
