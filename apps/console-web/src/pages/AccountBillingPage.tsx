import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

/** 계정 빌링 페이지. 구독 상태 + 구독 이력 (stub). */
export function AccountBillingPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">빌링</h1>
      <div className="space-y-6">
        <SubscriptionStatus />
        <SubscriptionHistory />
      </div>
    </div>
  );
}

/** 현재 구독 상태 표시. */
function SubscriptionStatus() {
  return (
    <Card>
      <CardHeader><CardTitle>구독 상태</CardTitle></CardHeader>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">요금제</span>
          <span className="font-medium text-gray-900">HaruOS Pro</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">상태</span>
          <Badge variant="success">ACTIVE</Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">월 요금</span>
          <span className="font-medium text-gray-900">$19 / 테넌트</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">다음 결제일</span>
          <span className="text-gray-900">-</span>
        </div>
      </div>
    </Card>
  );
}

/** 구독 이력 (stub). */
function SubscriptionHistory() {
  return (
    <Card>
      <CardHeader><CardTitle>결제 이력</CardTitle></CardHeader>
      <p className="text-sm text-gray-400">결제 이력이 없습니다.</p>
    </Card>
  );
}
