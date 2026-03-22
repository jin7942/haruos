import { useState } from 'react';
import { useSchedules, useCreateSchedule, useUpdateSchedule, useCancelSchedule } from '../hooks/useSchedules';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { formatDateTime } from '@haruos/shared-utils';

/** 일정 관리 페이지. 리스트 뷰 + 생성/수정/삭제. */
export function SchedulePage() {
  const { data: schedules, isLoading } = useSchedules();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const cancelSchedule = useCancelSchedule();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', startDate: '', endDate: '' });

  function resetForm() {
    setForm({ title: '', description: '', startDate: '', endDate: '' });
    setShowForm(false);
    setEditId(null);
  }

  function handleCreate() {
    if (!form.title.trim() || !form.startDate) return;
    createSchedule.mutate(
      {
        title: form.title.trim(),
        description: form.description || undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      },
      { onSuccess: resetForm },
    );
  }

  function handleUpdate() {
    if (!editId) return;
    updateSchedule.mutate(
      {
        id: editId,
        title: form.title.trim() || undefined,
        description: form.description || undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      },
      { onSuccess: resetForm },
    );
  }

  function startEdit(schedule: { id: string; title: string; description: string | null; startDate: string; endDate: string | null }) {
    setEditId(schedule.id);
    setForm({
      title: schedule.title,
      description: schedule.description ?? '',
      startDate: schedule.startDate ? schedule.startDate.slice(0, 16) : '',
      endDate: schedule.endDate ? schedule.endDate.slice(0, 16) : '',
    });
    setShowForm(true);
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700',
    CONFIRMED: 'bg-green-50 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-400',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">일정</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
          새 일정
        </Button>
      </div>

      {/* 생성/수정 폼 */}
      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-700">{editId ? '일정 수정' : '새 일정'}</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input label="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <Input label="설명" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="시작" type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              <Input label="종료" type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={editId ? handleUpdate : handleCreate}
                disabled={createSchedule.isPending || updateSchedule.isPending || !form.title.trim() || !form.startDate}
                size="sm"
              >
                {editId ? '수정' : '생성'}
              </Button>
              <Button onClick={resetForm} variant="secondary" size="sm">취소</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 일정 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !schedules?.length ? (
        <p className="text-center text-gray-400 py-8">일정이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{schedule.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[schedule.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {schedule.status}
                    </span>
                  </div>
                  {schedule.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{schedule.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDateTime(schedule.startDate)}
                    {schedule.endDate && ` ~ ${formatDateTime(schedule.endDate)}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0 ml-4">
                  <Button onClick={() => startEdit(schedule)} variant="ghost" size="sm">수정</Button>
                  {schedule.status !== 'CANCELLED' && (
                    <Button
                      onClick={() => cancelSchedule.mutate(schedule.id)}
                      variant="ghost"
                      size="sm"
                      disabled={cancelSchedule.isPending}
                    >
                      취소
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
