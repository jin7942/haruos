import { useCallback, useState, type DragEvent } from 'react';
import { useFiles, useUploadFile, useDeleteFile, useOrganizeFiles, useFileCategorySummary } from '../hooks/useFiles';
import { getFileUrl } from '../api/file.api';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { formatDateTime } from '@haruos/shared-utils';

const categoryLabels: Record<string, string> = {
  DOCUMENT: '문서',
  SPREADSHEET: '스프레드시트',
  PRESENTATION: '프레젠테이션',
  IMAGE: '이미지',
  VIDEO: '동영상',
  AUDIO: '오디오',
  ARCHIVE: '압축',
  TEXT: '텍스트',
  OTHER: '기타',
  UNCATEGORIZED: '미분류',
};

/** 파일 관리 페이지. 드래그앤드롭 업로드 + 카테고리 요약 + 자동 정리 + 목록. */
export function FilesPage() {
  const { data: files, isLoading } = useFiles();
  const { data: categorySummary } = useFileCategorySummary();
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();
  const organizeFiles = useOrganizeFiles();
  const [isDragging, setIsDragging] = useState(false);
  const [organizeResult, setOrganizeResult] = useState<{ organized: number; extracted: number } | null>(null);

  const handleUpload = useCallback(
    (fileList: FileList) => {
      Array.from(fileList).forEach((file) => {
        uploadFile.mutate(file);
      });
    },
    [uploadFile],
  );

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  async function handleDownload(id: string, fileName: string) {
    try {
      const { url } = await getFileUrl(id);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // 다운로드 실패 시 조용히 무시
    }
  }

  function handleOrganize() {
    setOrganizeResult(null);
    organizeFiles.mutate(undefined, {
      onSuccess: (data) => setOrganizeResult({ organized: data.organized, extracted: data.extracted }),
    });
  }

  function formatSize(bytes: string): string {
    const n = parseInt(bytes, 10);
    if (isNaN(n)) return bytes;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">파일</h2>
        <Button
          onClick={handleOrganize}
          variant="secondary"
          size="sm"
          disabled={organizeFiles.isPending}
        >
          {organizeFiles.isPending ? '정리 중...' : '자동 정리'}
        </Button>
      </div>

      {/* 정리 결과 */}
      {organizeResult && (
        <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
          파일 정리 완료: {organizeResult.organized}개 분류, {organizeResult.extracted}개 ZIP 해제
        </div>
      )}

      {/* 카테고리 요약 */}
      {categorySummary && Object.keys(categorySummary).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(categorySummary).map(([category, count]) => (
            <span
              key={category}
              className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
            >
              {categoryLabels[category] ?? category} {count}
            </span>
          ))}
        </div>
      )}

      {/* 드래그앤드롭 업로드 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <svg className="w-10 h-10 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
        </svg>
        <p className="mt-2 text-sm text-gray-500">
          파일을 드래그하거나{' '}
          <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
            클릭하여 선택
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
            />
          </label>
        </p>
        {uploadFile.isPending && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <Spinner size="sm" />
            <span className="text-sm text-gray-500">업로드 중...</span>
          </div>
        )}
      </div>

      {/* 파일 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !files?.length ? (
        <p className="text-center text-gray-400 py-8">파일이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatSize(file.size)} / {file.mimeType} / {formatDateTime(file.uploadedAt)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0 ml-4">
                  <Button
                    onClick={() => handleDownload(file.id, file.fileName)}
                    variant="ghost"
                    size="sm"
                  >
                    다운로드
                  </Button>
                  <Button
                    onClick={() => deleteFile.mutate(file.id)}
                    variant="ghost"
                    size="sm"
                    disabled={deleteFile.isPending}
                  >
                    삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
