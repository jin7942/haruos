import { useState } from 'react';
import { useSyncProjects } from '../hooks/useProjects';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Input } from '../components/ui/Input';
import { getTasks, createTask } from '../api/project.api';

/** 프로젝트 관리 페이지. ClickUp 동기화 + 태스크 목록/생성. */
export function ProjectsPage() {
  const syncProjects = useSyncProjects();
  const [listId, setListId] = useState('');
  const [tasks, setTasks] = useState<Array<{ id: string; name: string; status: { status: string } }>>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  async function handleLoadTasks() {
    if (!listId.trim()) return;
    setIsLoadingTasks(true);
    try {
      const result = await getTasks(listId.trim());
      setTasks(result as typeof tasks);
    } catch {
      setTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }

  async function handleCreateTask() {
    if (!listId.trim() || !newTaskName.trim()) return;
    setIsCreating(true);
    try {
      await createTask({ listId: listId.trim(), name: newTaskName.trim() });
      setNewTaskName('');
      await handleLoadTasks();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">프로젝트</h2>
        <Button
          onClick={() => syncProjects.mutate()}
          disabled={syncProjects.isPending}
          size="sm"
        >
          {syncProjects.isPending ? '동기화 중...' : 'ClickUp 동기화'}
        </Button>
      </div>

      {/* 동기화 결과 */}
      {syncProjects.data && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-700">동기화된 프로젝트</h3>
          </CardHeader>
          <CardContent>
            {syncProjects.data.length === 0 ? (
              <p className="text-sm text-gray-400">동기화된 프로젝트가 없습니다</p>
            ) : (
              <ul className="space-y-2">
                {syncProjects.data.map((project) => (
                  <li key={project.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{project.name}</p>
                      <p className="text-xs text-gray-400">Space: {project.clickupSpaceId}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      project.status === 'SYNCED' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {project.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* 태스크 조회 */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-700">태스크 조회</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="ClickUp List ID"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
            />
            <Button onClick={handleLoadTasks} disabled={isLoadingTasks || !listId.trim()} size="sm">
              {isLoadingTasks ? '조회 중...' : '조회'}
            </Button>
          </div>

          {/* 새 태스크 생성 */}
          {listId.trim() && (
            <div className="flex gap-2">
              <Input
                placeholder="새 태스크 이름"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              />
              <Button
                onClick={handleCreateTask}
                disabled={isCreating || !newTaskName.trim()}
                size="sm"
                variant="secondary"
              >
                {isCreating ? '생성 중...' : '생성'}
              </Button>
            </div>
          )}

          {/* 태스크 목록 */}
          {isLoadingTasks ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : tasks.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <li key={task.id} className="py-2 flex items-center justify-between">
                  <span className="text-sm text-gray-900">{task.name}</span>
                  <span className="text-xs text-gray-400">{task.status?.status}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
