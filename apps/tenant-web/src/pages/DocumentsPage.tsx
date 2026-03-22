import { useState } from 'react';
import {
  useDocuments,
  useCreateDocument,
  useSummarizeDocument,
  useExtractActionItems,
} from '../hooks/useDocuments';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { formatDateTime } from '@haruos/shared-utils';

const DOC_TYPES = ['MEETING_NOTE', 'SUMMARY', 'ACTION_ITEM'] as const;

/** 문서 관리 페이지. 목록, 생성, AI 요약, Action Item 추출. */
export function DocumentsPage() {
  const [filterType, setFilterType] = useState<string>();
  const { data: documents, isLoading } = useDocuments(filterType);
  const createDocument = useCreateDocument();
  const summarize = useSummarizeDocument();
  const extractActions = useExtractActionItems();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'MEETING_NOTE' as string });
  const [summaryResult, setSummaryResult] = useState<{ id: string; text: string } | null>(null);
  const [actionResult, setActionResult] = useState<{ id: string; items: string[] } | null>(null);

  function handleCreate() {
    if (!form.title.trim()) return;
    createDocument.mutate(
      { title: form.title.trim(), content: form.content || undefined, type: form.type },
      {
        onSuccess: () => {
          setForm({ title: '', content: '', type: 'MEETING_NOTE' });
          setShowForm(false);
        },
      },
    );
  }

  function handleSummarize(id: string) {
    setSummaryResult(null);
    summarize.mutate(id, {
      onSuccess: (data) => setSummaryResult({ id, text: data.summary }),
    });
  }

  function handleExtractActions(id: string) {
    setActionResult(null);
    extractActions.mutate(id, {
      onSuccess: (data) => setActionResult({ id, items: data.actionItems }),
    });
  }

  const typeLabels: Record<string, string> = {
    MEETING_NOTE: '회의록',
    SUMMARY: '요약',
    ACTION_ITEM: '실행항목',
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-yellow-50 text-yellow-700',
    PUBLISHED: 'bg-green-50 text-green-700',
    ARCHIVED: 'bg-gray-100 text-gray-400',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">문서</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          새 문서
        </Button>
      </div>

      {/* 타입 필터 */}
      <div className="flex gap-2">
        <Button
          variant={!filterType ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilterType(undefined)}
        >
          전체
        </Button>
        {DOC_TYPES.map((t) => (
          <Button
            key={t}
            variant={filterType === t ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterType(t)}
          >
            {typeLabels[t]}
          </Button>
        ))}
      </div>

      {/* 생성 폼 */}
      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-700">새 문서</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input label="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">타입</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>{typeLabels[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="마크다운 형식으로 작성"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createDocument.isPending || !form.title.trim()} size="sm">
                생성
              </Button>
              <Button onClick={() => setShowForm(false)} variant="secondary" size="sm">취소</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 문서 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !documents?.length ? (
        <p className="text-center text-gray-400 py-8">문서가 없습니다</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {typeLabels[doc.type] ?? doc.type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[doc.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {doc.status}
                      </span>
                    </div>
                    {doc.content && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.content}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(doc.createdAt)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-4">
                    <Button
                      onClick={() => handleSummarize(doc.id)}
                      variant="ghost"
                      size="sm"
                      disabled={summarize.isPending}
                    >
                      AI 요약
                    </Button>
                    <Button
                      onClick={() => handleExtractActions(doc.id)}
                      variant="ghost"
                      size="sm"
                      disabled={extractActions.isPending}
                    >
                      Action Items
                    </Button>
                  </div>
                </div>

                {/* AI 요약 결과 */}
                {summaryResult?.id === doc.id && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-blue-700 mb-1">AI 요약</p>
                    <p className="text-sm text-gray-700">{summaryResult.text}</p>
                  </div>
                )}

                {/* Action Item 결과 */}
                {actionResult?.id === doc.id && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
                    <p className="text-xs font-medium text-green-700 mb-1">Action Items</p>
                    <ul className="space-y-1">
                      {actionResult.items.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-green-500">{'•'}</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
