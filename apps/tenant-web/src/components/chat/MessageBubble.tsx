import type { MessageResponse } from '@haruos/shared-types';

interface MessageBubbleProps {
  message: MessageResponse;
}

/** 개별 메시지 말풍선. user는 우측 파란색, assistant는 좌측 회색. */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          <MarkdownContent content={message.content} isUser={isUser} />
        </div>
      </div>
    </div>
  );
}

/** 기본 마크다운 렌더링. bold, italic, inline code, code block, list 지원. */
function MarkdownContent({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 코드 블록 (```)
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre
          key={elements.length}
          className={`my-2 p-3 rounded-lg text-xs font-mono overflow-x-auto ${
            isUser ? 'bg-blue-700/50' : 'bg-gray-800 text-gray-100'
          }`}
        >
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // 일반 줄: 인라인 마크다운 처리
    elements.push(
      <span key={elements.length}>
        {i > 0 && elements.length > 0 && <br />}
        <InlineMarkdown text={line} isUser={isUser} />
      </span>,
    );
    i++;
  }

  return <>{elements}</>;
}

/** 인라인 마크다운 (bold, italic, inline code). */
function InlineMarkdown({ text, isUser }: { text: string; isUser: boolean }) {
  // 리스트 항목
  const listMatch = text.match(/^(\s*[-*])\s+(.*)/);
  if (listMatch) {
    return (
      <span className="flex gap-1.5">
        <span className="select-none">{'•'}</span>
        <span><InlineMarkdown text={listMatch[2]} isUser={isUser} /></span>
      </span>
    );
  }

  // bold + italic + inline code 처리
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`')) {
      parts.push(
        <code
          key={parts.length}
          className={`px-1 py-0.5 rounded text-xs font-mono ${
            isUser ? 'bg-blue-700/50' : 'bg-gray-200'
          }`}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**')) {
      parts.push(<strong key={parts.length}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      parts.push(<em key={parts.length}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
