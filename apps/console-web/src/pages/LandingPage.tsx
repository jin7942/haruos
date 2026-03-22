import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const FEATURES = [
  {
    title: '자연어 대화',
    description: '말로 지시하면 알아서 처리합니다. 복잡한 UI 없이 대화만으로 업무를 관리하세요.',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  },
  {
    title: '자동 배치 실행',
    description: '반복 작업을 자동으로 처리합니다. 스케줄 설정만 하면 나머지는 HaruOS가 합니다.',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: '완전 격리 환경',
    description: '테넌트별 독립 인프라로 데이터가 완전히 격리됩니다. 보안 걱정 없이 사용하세요.',
    icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  },
  {
    title: '원클릭 프로비저닝',
    description: 'AWS 인프라를 자동으로 구성합니다. CloudFormation 한 번이면 준비 완료.',
    icon: 'M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z',
  },
];

/** 랜딩 페이지. 히어로 섹션 + 기능 소개 카드 + CTA. */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 네비게이션 */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">HaruOS</h1>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">로그인</Button>
            </Link>
            <Link to="/signup">
              <Button>시작하기</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          던져놓으면 알아서 하는
          <br />
          <span className="text-blue-600">업무 비서</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          자연어 대화로 업무를 지시하고, 자동 배치로 반복 작업을 처리하세요.
          복잡한 도구 없이 말 한마디면 충분합니다.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/signup">
            <Button size="lg">무료로 시작하기</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg">로그인</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">14일 무료 체험 / 신용카드 불필요</p>
      </section>

      {/* 기능 소개 */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h3 className="mb-12 text-center text-2xl font-bold text-gray-900">
          왜 HaruOS인가?
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-gray-50 py-16 text-center">
        <h3 className="text-2xl font-bold text-gray-900">지금 시작하세요</h3>
        <p className="mt-3 text-gray-600">월 $19 / 테넌트. 전 기능 개방.</p>
        <Link to="/signup">
          <Button size="lg" className="mt-6">무료 체험 시작</Button>
        </Link>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        &copy; 2026 HaruOS. All rights reserved.
      </footer>
    </div>
  );
}
