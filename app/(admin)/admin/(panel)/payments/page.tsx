import { Suspense } from "react";
import { getPaymentStats } from "@/lib/admin/payment-stats";
import { parseStatsPeriod } from "@/lib/admin/stats-periods";
import { PaymentStatsDashboard } from "@/components/admin/payment-stats-dashboard";
import { PeriodFilter } from "@/components/admin/period-filter";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parseStatsPeriod(periodParam);
  const stats = await getPaymentStats(period);

  return (
    <div>
      <PageHeader
        title="Плащания"
        description="Оборот, поръчки, продукти и клиенти — от реалните Stripe плащания."
      >
        <Suspense fallback={null}>
          <PeriodFilter active={period} />
        </Suspense>
      </PageHeader>
      <PaymentStatsDashboard stats={stats} />
    </div>
  );
}
