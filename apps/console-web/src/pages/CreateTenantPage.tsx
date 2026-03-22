import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateTenant } from '../hooks/useTenants';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';

const REGIONS = [
  { value: 'ap-northeast-2', label: 'Seoul (ap-northeast-2)' },
  { value: 'us-east-1', label: 'N. Virginia (us-east-1)' },
  { value: 'us-west-2', label: 'Oregon (us-west-2)' },
  { value: 'eu-west-1', label: 'Ireland (eu-west-1)' },
];

/** 새 프로젝트 생성 페이지. */
export function CreateTenantPage() {
  const navigate = useNavigate();
  const createTenant = useCreateTenant();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('ap-northeast-2');
  const [error, setError] = useState('');

  /** 이름 입력 시 slug 자동 생성. */
  function handleNameChange(value: string) {
    setName(value);
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(autoSlug);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name || !slug) {
      setError('이름과 슬러그를 입력하세요.');
      return;
    }

    try {
      const tenant = await createTenant.mutateAsync({ name, slug, description, region });
      navigate(`/tenants/${tenant.id}`);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || '프로젝트 생성에 실패했습니다.');
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>새 프로젝트</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          <Input
            label="프로젝트 이름"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Project"
          />
          <Input
            label="슬러그 (URL)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-project"
          />
          <Input
            label="설명"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="프로젝트 설명 (선택)"
          />
          <div>
            <label htmlFor="region" className="mb-1 block text-sm font-medium text-gray-700">
              AWS 리전
            </label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              취소
            </Button>
            <Button type="submit" loading={createTenant.isPending}>
              생성
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
