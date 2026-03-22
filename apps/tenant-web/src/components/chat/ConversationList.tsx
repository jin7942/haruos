import { useConversations } from '../../hooks/useHaru';
import { Spinner } from '../ui/Spinner';
import { formatDateTime } from '@haruos/shared-utils';

interface ConversationListProps {
  selectedId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

/** 좌측 대화 목록 패널. 새 대화 생성 + 기존 대화 선택. */
export function ConversationList({ selectedId, onSelect, onNewChat }: ConversationListProps) {
  const { data: conversations, isLoading } = useConversations();

  return (
    <div className="flex flex-col h-full border-r border-gray-200 bg-white">
      {/* 헤더 + 새 대화 버튼 */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">대화</h2>
        <button
          onClick={onNewChat}
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="새 대화"
          aria-label="새 대화"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </button>
      </div>

      {/* 대화 목록 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : !conversations?.length ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            대화가 없습니다
          </div>
        ) : (
          <ul className="py-1">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelect(conv.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedId === conv.id
                      ? 'bg-blue-50 border-r-2 border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {conv.title || '새 대화'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(conv.updatedAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
