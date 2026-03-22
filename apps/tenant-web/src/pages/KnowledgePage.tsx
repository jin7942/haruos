import { useState, type FormEvent } from 'react';
import { useKnowledgeSearch, useAskKnowledge } from '../hooks/useKnowledge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import type { KnowledgeAskResponse } from '@haruos/shared-types';

/** 지식 검색 + RAG 질의응답 페이지. */
export function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [askResult, setAskResult] = useState<KnowledgeAskResponse | null>(null);

  const { data: searchResults, isLoading: isSearching } = useKnowledgeSearch(activeQuery);
  const askKnowledge = useAskKnowledge();

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setAskResult(null);
    setActiveQuery(searchQuery.trim());
  }

  function handleAsk() {
    if (!searchQuery.trim()) return;
    askKnowledge.mutate(searchQuery.trim(), {
      onSuccess: (data) => setAskResult(data),
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-900">지식 검색</h2>

      {/* 검색 폼 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="문서에서 검색하거나 질문하세요..."
          className="flex-1"
        />
        <Button type="submit" size="md" disabled={!searchQuery.trim()}>
          검색
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleAsk}
          disabled={!searchQuery.trim() || askKnowledge.isPending}
        >
          {askKnowledge.isPending ? 'AI 답변 중...' : 'AI에게 질문'}
        </Button>
      </form>

      {/* AI 답변 */}
      {askKnowledge.isPending && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size="sm" />
          AI가 답변을 생성하고 있습니다...
        </div>
      )}

      {askResult && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-1">AI 답변</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{askResult.answer}</p>
            </div>
            {askResult.sources.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">출처</p>
                <div className="space-y-2">
                  {askResult.sources.map((source) => (
                    <div
                      key={source.chunkId}
                      className="p-2 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">
                          문서 {source.documentId.slice(0, 8)}...
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                          {(source.score * 100).toFixed(0)}% 일치
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-3">{source.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {askKnowledge.isError && (
        <p className="text-sm text-red-600">
          AI 답변 생성에 실패했습니다: {(askKnowledge.error as Error).message}
        </p>
      )}

      {/* 검색 결과 */}
      {isSearching && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {activeQuery && !isSearching && (
        <>
          <p className="text-sm text-gray-500">
            "{activeQuery}" 검색 결과 {searchResults?.length ?? 0}건
          </p>
          {searchResults && searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((result) => (
                <Card key={result.chunkId}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">
                        문서 {result.documentId.slice(0, 8)}...
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600">
                        {(result.score * 100).toFixed(0)}% 일치
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{result.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">검색 결과가 없습니다</p>
          )}
        </>
      )}

      {!activeQuery && !askResult && (
        <p className="text-center text-gray-400 py-12">
          인덱싱된 문서에서 검색하거나, AI에게 질문할 수 있습니다
        </p>
      )}
    </div>
  );
}
