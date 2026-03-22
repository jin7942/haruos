import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '../components/chat/MessageInput';

describe('MessageInput', () => {
  it('입력 필드와 전송 버튼 렌더링', () => {
    render(<MessageInput onSend={vi.fn()} />);

    expect(screen.getByPlaceholderText('메시지를 입력하세요...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('메시지 입력 후 폼 제출 시 onSend 호출', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
    await user.type(textarea, '테스트 메시지');
    await user.click(screen.getByRole('button'));

    expect(onSend).toHaveBeenCalledWith('테스트 메시지');
  });

  it('빈 메시지는 전송하지 않음', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);

    await user.click(screen.getByRole('button'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disabled 상태에서 입력 비활성화', () => {
    render(<MessageInput onSend={vi.fn()} disabled />);

    const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
    expect(textarea).toBeDisabled();
  });
});
