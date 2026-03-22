import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    title: '대화형 AI 비서',
    description: '자연어로 업무를 지시하세요. "내일 회의 일정 잡아줘"처럼 말하면 알아서 처리합니다.',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    title: '프로젝트 관리',
    description: '할 일, 마일스톤, 진행 현황을 한곳에서 관리합니다. 복잡한 도구 없이 대화로 충분합니다.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    color: 'bg-green-50 text-green-600',
  },
  {
    title: '자동 일정 관리',
    description: '반복 업무를 자동 배치로 설정하세요. 스케줄만 정하면 나머지는 HaruOS가 합니다.',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    title: '문서 자동화',
    description: 'AI가 회의록을 요약하고, 보고서를 작성하고, 문서를 관리합니다.',
    icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    title: '파일 관리',
    description: '팀 파일을 안전하게 저장하고 공유합니다. 테넌트별 완전 격리로 보안 걱정이 없습니다.',
    icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    title: '실시간 모니터링',
    description: 'CPU, 메모리, 비용을 실시간으로 추적합니다. 이상 징후 발생 시 즉시 알림을 받으세요.',
    icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5',
    color: 'bg-cyan-50 text-cyan-600',
  },
];

const STEPS = [
  {
    step: '1',
    title: '가입하기',
    description: '이메일과 비밀번호만으로 30초 만에 가입하세요.',
  },
  {
    step: '2',
    title: 'AWS 연동',
    description: 'CloudFormation 링크 한 번 클릭으로 AWS 계정을 연결합니다.',
  },
  {
    step: '3',
    title: '바로 시작',
    description: '인프라가 자동으로 배포됩니다. 설정 완료 후 바로 사용하세요.',
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'HaruOS는 어떤 서비스인가요?',
    a: '자연어 대화로 업무를 지시하고, AI가 자동으로 처리하는 업무 비서 SaaS입니다. 프로젝트 관리, 일정, 문서, 파일 관리를 대화 한 번으로 해결합니다.',
  },
  {
    q: 'AWS 계정이 필요한가요?',
    a: '네, HaruOS는 고객의 AWS 계정에 격리된 인프라를 배포합니다. CloudFormation 1클릭으로 안전하게 연동되며, 별도의 키 저장 없이 IAM Role 기반으로 동작합니다.',
  },
  {
    q: '데이터 보안은 어떻게 보장되나요?',
    a: '테넌트별 독립 RDS와 VPC로 데이터가 완전히 격리됩니다. 다른 사용자의 데이터와 물리적으로 분리되어 있어 높은 수준의 보안을 보장합니다.',
  },
  {
    q: '무료 체험은 어떻게 되나요?',
    a: '14일 무료 체험이 제공됩니다. 신용카드 없이 시작할 수 있으며, 체험 기간 동안 모든 기능을 제한 없이 사용할 수 있습니다.',
  },
  {
    q: '해약은 언제든 가능한가요?',
    a: '네, 언제든 해약할 수 있습니다. 해약 시 현재 결제 주기가 끝날 때까지 서비스를 이용할 수 있으며, 추가 비용은 발생하지 않습니다.',
  },
  {
    q: '기술 지원은 어떻게 받나요?',
    a: 'HaruOS 내에서 직접 대화로 문의할 수 있습니다. 이메일(support@haruos.io)과 Discord 커뮤니티를 통해서도 지원을 받으실 수 있습니다.',
  },
];

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200">
      <button
        type="button"
        className="flex w-full items-center justify-between py-5 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-base font-medium text-gray-900">{q}</span>
        <svg
          className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-gray-600">{a}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 네비게이션 */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">HaruOS</h1>
          <nav className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
            <a href="#features" className="hover:text-gray-900">기능</a>
            <a href="#how-it-works" className="hover:text-gray-900">작동 방식</a>
            <a href="#pricing" className="hover:text-gray-900">가격</a>
            <a href="#faq" className="hover:text-gray-900">FAQ</a>
          </nav>
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24 text-center sm:pb-28 sm:pt-32">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
            14일 무료 체험 / 신용카드 불필요
          </div>
          <h2 className="mt-8 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            던져놓으면 알아서 하는
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              업무 비서
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            자연어 대화로 업무를 지시하고, AI가 자동으로 처리합니다.
            <br className="hidden sm:block" />
            프로젝트 관리부터 문서 작성까지, 말 한마디면 충분합니다.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/signup">
              <Button size="lg" className="px-8 shadow-lg shadow-blue-600/25">
                무료로 시작하기
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg" className="px-8">
                로그인
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <h3 className="text-3xl font-bold text-gray-900">
            말 한마디로 끝내는 업무 자동화
          </h3>
          <p className="mt-4 text-gray-600">
            복잡한 도구 없이 대화만으로 모든 업무를 관리하세요.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="flex flex-col gap-4 transition-shadow hover:shadow-md">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${feature.color}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900">{feature.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 작동 방식 */}
      <section id="how-it-works" className="bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-gray-900">3단계면 끝</h3>
            <p className="mt-4 text-gray-600">
              복잡한 설정 없이 빠르게 시작할 수 있습니다.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {STEPS.map((item, i) => (
              <div key={item.step} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-1/2 top-8 hidden h-0.5 w-full bg-gradient-to-r from-blue-300 to-blue-100 md:block" />
                )}
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-600/25">
                  {item.step}
                </div>
                <h4 className="mt-6 text-lg font-semibold text-gray-900">{item.title}</h4>
                <p className="mt-2 text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 가격 */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-gray-900">심플한 가격</h3>
            <p className="mt-4 text-gray-600">
              숨겨진 비용 없이 모든 기능을 사용하세요.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-lg">
            <Card className="relative overflow-hidden border-2 border-blue-600 p-8 text-center shadow-xl">
              <div className="absolute right-0 top-0 rounded-bl-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                전 기능 개방
              </div>
              <h4 className="text-lg font-semibold text-gray-900">HaruOS Pro</h4>
              <div className="mt-6 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-gray-900">$19</span>
                <span className="text-gray-500">/월 /테넌트</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                연간 결제 시 <span className="font-semibold text-blue-600">$190/년</span> (17% 할인)
              </p>
              <ul className="mt-8 space-y-3 text-left text-sm text-gray-700">
                {[
                  '대화형 AI 비서 무제한 사용',
                  '자동 배치 실행',
                  '테넌트별 독립 인프라 (RDS, VPC)',
                  '실시간 모니터링 + 알림',
                  '문서/파일 관리',
                  '14일 무료 체험',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="mt-8 block">
                <Button size="lg" className="w-full shadow-lg shadow-blue-600/25">
                  14일 무료 체험 시작
                </Button>
              </Link>
              <p className="mt-3 text-xs text-gray-400">신용카드 불필요. 언제든 해약 가능.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-gray-50 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h3 className="text-center text-3xl font-bold text-gray-900">
            자주 묻는 질문
          </h3>
          <div className="mt-12">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h3 className="text-3xl font-bold text-gray-900">
            지금 바로 시작하세요
          </h3>
          <p className="mx-auto mt-4 max-w-xl text-gray-600">
            복잡한 설정 없이 14일 무료 체험으로 HaruOS의 모든 기능을 경험해보세요.
          </p>
          <Link to="/signup" className="mt-8 inline-block">
            <Button size="lg" className="px-10 shadow-lg shadow-blue-600/25">
              무료 체험 시작하기
            </Button>
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm font-semibold text-gray-900">HaruOS</span>
            <p className="text-sm text-gray-400">
              &copy; 2026 HaruOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
