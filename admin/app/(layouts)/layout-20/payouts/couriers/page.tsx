'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, API_URL } from '@/lib/api';

type ApiFinancePeriod = 'today' | 'yesterday' | '7d' | '30d' | 'custom';
type Scope = 'pending' | 'assigned' | 'paid' | 'all';

type PaidByAdmin = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string;
} | null;

type CourierPayoutSummary = {
  period: {
    key?: ApiFinancePeriod;
    start: string;
    end: string;
    cutoffHour?: number;
  };
  totals: {
    couriersCount: number;
    deliveredOrdersCount: number;
    courierFeeGrossAmount: number;
    commissionAmount: number;
    accruedPayoutAmount: number;
    alreadyAssignedToPayoutAmount: number;
    pendingPayoutAmount: number;
    paidPayoutAmount: number;
    unpaidButAssignedAmount: number;
  };
  couriers: Array<{
    courier: {
      userId: string;
      firstName: string | null;
      lastName: string | null;
      phone?: string | null;
    };
    deliveredOrdersCount: number;
    courierFeeGrossAmount: number;
    commissionAmount: number;
    accruedPayoutAmount: number;
    alreadyAssignedToPayoutAmount: number;
    pendingPayoutAmount: number;
    paidPayoutAmount: number;
    unpaidButAssignedAmount: number;
    lastDeliveredAt: string | null;
    lastPaidAt: string | null;
    payouts?: Array<{
      id: string;
      periodFrom: string;
      periodTo: string;
      ordersCount: number;
      grossAmount: number;
      commissionAmount: number;
      payoutAmount: number;
      status: string;
      paidAt: string | null;
      note: string | null;
      paymentReference?: string | null;
      paymentComment?: string | null;
      paidByAdminId?: string | null;
      paidByAdmin?: PaidByAdmin;
      createdAt: string;
    }>;
  }>;
};

type PayModalState = {
  payoutId: string;
  courierName: string;
  amount: number;
} | null;

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₸`;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ru-RU');
}

function formatDateOnly(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ru-RU');
}

function buildPeriodQuery(
  period: string | null,
  from: string | null,
  to: string | null,
) {
  const params = new URLSearchParams();

  if (period) params.set('period', period);
  if (period === 'custom') {
    if (from) params.set('from', from);
    if (to) params.set('to', to);
  }

  return params;
}

function getRowMainAmount(
  row: CourierPayoutSummary['couriers'][number],
  scope: Scope,
) {
  switch (scope) {
    case 'pending':
      return row.pendingPayoutAmount;
    case 'assigned':
      return row.unpaidButAssignedAmount;
    case 'paid':
      return row.paidPayoutAmount;
    case 'all':
    default:
      return row.accruedPayoutAmount;
  }
}

function getScopeTitle(scope: Scope) {
  switch (scope) {
    case 'pending':
      return 'К выплате сейчас';
    case 'assigned':
      return 'Назначено в payout';
    case 'paid':
      return 'Уже выплачено';
    case 'all':
    default:
      return 'Все начисления';
  }
}

function formatAdminName(admin: PaidByAdmin) {
  if (!admin) return '—';

  const fullName = `${admin.lastName ?? ''} ${admin.firstName ?? ''}`.trim();
  if (fullName) return fullName;
  if (admin.email) return admin.email;
  return admin.phone || admin.id;
}

export default function CourierPayoutsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scope = (searchParams.get('scope') as Scope) || 'all';
  const period = (searchParams.get('period') as ApiFinancePeriod) || 'today';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const [data, setData] = useState<CourierPayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [expandedCourierId, setExpandedCourierId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [payModal, setPayModal] = useState<PayModalState>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentComment, setPaymentComment] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = buildPeriodQuery(period, from, to);
      const summary = await apiFetch(
        `/finance/courier-payouts/summary?${params.toString()}`,
      );

      setData(summary as CourierPayoutSummary);
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки выплат курьеров');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, period, from, to]);

  const rows = useMemo(() => {
    if (!data) return [];

    const base = [...data.couriers];

    if (scope === 'pending') {
      return base.filter((row) => row.pendingPayoutAmount > 0);
    }

    if (scope === 'assigned') {
      return base.filter((row) => row.unpaidButAssignedAmount > 0);
    }

    if (scope === 'paid') {
      return base.filter((row) => row.paidPayoutAmount > 0);
    }

    return base.filter((row) => row.accruedPayoutAmount > 0);
  }, [data, scope]);

  const createPayout = async (
    courierUserId: string,
    courierName: string,
  ) => {
    try {
      const confirmed = window.confirm(
        `Создать payout для курьера "${courierName}" за выбранный период?`,
      );
      if (!confirmed) return;

      setSubmittingId(courierUserId);

      const body = {
        courierUserId,
        periodFrom: data?.period.start,
        periodTo: data?.period.end,
        note: null,
      };

      await apiFetch('/finance/courier-payouts', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      await load();
    } catch (e: any) {
      alert(e?.message || 'Не удалось создать payout');
    } finally {
      setSubmittingId(null);
    }
  };

  const openPayModal = (
    payoutId: string,
    courierName: string,
    amount: number,
  ) => {
    setPayModal({
      payoutId,
      courierName,
      amount,
    });
    setPaymentReference('');
    setPaymentComment('');
  };

  const closePayModal = () => {
    if (submittingId) return;
    setPayModal(null);
    setPaymentReference('');
    setPaymentComment('');
  };

  const submitPayModal = async () => {
    if (!payModal) return;

    const normalizedReference = paymentReference.trim();

    if (!normalizedReference) {
      alert('Укажите reference');
      return;
    }

    try {
      setSubmittingId(payModal.payoutId);

      await apiFetch(`/finance/courier-payouts/${payModal.payoutId}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({
          paymentReference: normalizedReference,
          paymentComment: paymentComment.trim() || null,
        }),
      });

      closePayModal();
      await load();
    } catch (e: any) {
      alert(e?.message || 'Не удалось подтвердить оплату payout');
    } finally {
      setSubmittingId(null);
    }
  };

  const exportExcel = async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('jetkiz_admin_token')
          : null;

      const params = buildPeriodQuery(period, from, to);
      params.set('scope', scope);

      const res = await fetch(
        `${API_URL}/finance/courier-payouts/export?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-dev-user-id': 'dev-admin',
            'x-dev-role': 'ADMIN',
          },
        },
      );

      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `courier-payouts-${scope}-${period}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Не удалось скачать Excel');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[28px] font-bold leading-8 text-gray-900">
              Выплаты курьерам
            </h1>
            <div className="mt-2 text-[14px] leading-6 text-gray-500">
              Здесь видно, какому курьеру сколько нужно выплатить, сколько заказов он
              сделал и какие payout уже созданы.
            </div>

            <div className="mt-3 text-[13px] text-gray-600">
              Период:{' '}
              <span className="font-semibold">
                {formatDateOnly(data?.period.start ?? null)}
              </span>
              {' — '}
              <span className="font-semibold">
                {formatDateOnly(data?.period.end ?? null)}
              </span>
              {data?.period.cutoffHour != null ? (
                <span className="ml-2 text-gray-400">
                  cutoff {data.period.cutoffHour}:00
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push('/layout-20/analytics')}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              Назад в аналитику
            </button>

            <button
              type="button"
              onClick={exportExcel}
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-[14px] font-semibold text-white hover:bg-emerald-700"
            >
              Выгрузить Excel
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
          Загрузка выплат курьеров...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-[13px] font-semibold text-gray-500">
                Курьеров
              </div>
              <div className="mt-2 text-[32px] font-bold text-gray-900">
                {rows.length}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-[13px] font-semibold text-gray-500">
                Заказов
              </div>
              <div className="mt-2 text-[32px] font-bold text-gray-900">
                {rows.reduce((sum, row) => sum + row.deliveredOrdersCount, 0)}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-[13px] font-semibold text-gray-500">
                Courier gross
              </div>
              <div className="mt-2 text-[32px] font-bold text-gray-900">
                {formatMoney(
                  rows.reduce((sum, row) => sum + row.courierFeeGrossAmount, 0),
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-[13px] font-semibold text-gray-500">
                {getScopeTitle(scope)}
              </div>
              <div className="mt-2 text-[32px] font-bold text-orange-600">
                {formatMoney(
                  rows.reduce((sum, row) => sum + getRowMainAmount(row, scope), 0),
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-[13px] font-semibold text-gray-500">
                Уже выплачено
              </div>
              <div className="mt-2 text-[32px] font-bold text-emerald-600">
                {formatMoney(rows.reduce((sum, row) => sum + row.paidPayoutAmount, 0))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="text-[18px] font-bold text-gray-900">
                Список курьеров
              </div>
              <div className="mt-1 text-[13px] text-gray-500">
                Основные колонки: заказы, gross, комиссия, начислено, к выплате, в payout, уже выплачено.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                      Курьер
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                      Заказов
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                      Gross
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                      Комиссия
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-orange-700">
                      К выплате
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-blue-700">
                      В payout
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Выплачено
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                      Последняя доставка
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-10 text-center text-sm text-gray-500"
                      >
                        Нет данных за выбранный период
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => {
                      const courierName =
                        `${row.courier.lastName || ''} ${row.courier.firstName || ''}`.trim() ||
                        row.courier.phone ||
                        row.courier.userId;

                      return (
                        <Fragment key={row.courier.userId}>
                          <tr
                            className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                          >
                            <td className="px-4 py-4 align-top">
                              <div className="text-[15px] font-bold text-gray-900">
                                {courierName}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {row.courier.phone || 'Без телефона'}
                              </div>
                            </td>

                            <td className="px-4 py-4 align-top text-sm font-semibold text-gray-900">
                              {row.deliveredOrdersCount}
                            </td>

                            <td className="px-4 py-4 align-top text-sm font-semibold text-gray-900">
                              {formatMoney(row.courierFeeGrossAmount)}
                            </td>

                            <td className="px-4 py-4 align-top text-sm font-semibold text-violet-700">
                              {formatMoney(row.commissionAmount)}
                            </td>

                            <td className="px-4 py-4 align-top text-sm font-bold text-orange-600">
                              {formatMoney(row.pendingPayoutAmount)}
                            </td>

                            <td className="px-4 py-4 align-top text-sm font-bold text-blue-600">
                              {formatMoney(row.unpaidButAssignedAmount)}
                            </td>

                            <td className="px-4 py-4 align-top text-sm font-bold text-emerald-600">
                              {formatMoney(row.paidPayoutAmount)}
                            </td>

                            <td className="px-4 py-4 align-top text-sm text-gray-700">
                              {formatDateTime(row.lastDeliveredAt)}
                            </td>

                            <td className="px-4 py-4 align-top">
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedCourierId((prev) =>
                                      prev === row.courier.userId ? null : row.courier.userId,
                                    )
                                  }
                                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                  {expandedCourierId === row.courier.userId
                                    ? 'Скрыть payout'
                                    : 'Показать payout'}
                                </button>

                                {row.pendingPayoutAmount > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      createPayout(row.courier.userId, courierName)
                                    }
                                    disabled={submittingId === row.courier.userId}
                                    className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                  >
                                    {submittingId === row.courier.userId
                                      ? 'Создание...'
                                      : 'Создать payout'}
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>

                          {expandedCourierId === row.courier.userId ? (
                            <tr>
                              <td colSpan={9} className="bg-slate-50 px-4 py-4">
                                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                  <div className="mb-3 text-sm font-bold text-gray-900">
                                    История payout
                                  </div>

                                  {!row.payouts || row.payouts.length === 0 ? (
                                    <div className="text-sm text-gray-500">
                                      У этого курьера пока нет payout записей
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full">
                                        <thead>
                                          <tr className="border-b border-gray-200">
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                                              Период
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                                              Заказов
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                                              Gross
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                                              Комиссия
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                                              К выплате
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                                              Статус
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                                              Reference
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                                              Comment
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                                              Paid At
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                                              Кто подтвердил оплату
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                                              Действие
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {row.payouts.map((payout) => (
                                            <tr
                                              key={payout.id}
                                              className="border-b border-gray-100"
                                            >
                                              <td className="px-3 py-2 text-sm text-gray-700">
                                                {formatDateOnly(payout.periodFrom)} —{' '}
                                                {formatDateOnly(payout.periodTo)}
                                              </td>
                                              <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                                                {payout.ordersCount}
                                              </td>
                                              <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                                                {formatMoney(payout.grossAmount)}
                                              </td>
                                              <td className="px-3 py-2 text-sm font-semibold text-violet-700">
                                                {formatMoney(payout.commissionAmount)}
                                              </td>
                                              <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                                                {formatMoney(payout.payoutAmount)}
                                              </td>
                                              <td className="px-3 py-2 text-sm font-semibold">
                                                <span
                                                  className={
                                                    payout.status === 'PAID'
                                                      ? 'text-emerald-600'
                                                      : 'text-amber-600'
                                                  }
                                                >
                                                  {payout.status}
                                                </span>
                                              </td>
                                              <td className="px-3 py-2 text-sm text-gray-700">
                                                {payout.paymentReference || '—'}
                                              </td>
                                              <td className="px-3 py-2 text-sm text-gray-700">
                                                {payout.paymentComment || '—'}
                                              </td>
                                              <td className="px-3 py-2 text-sm text-gray-700">
                                                {formatDateTime(payout.paidAt)}
                                              </td>
                                              <td className="px-3 py-2 text-sm text-gray-700">
                                                {formatAdminName(payout.paidByAdmin ?? null)}
                                              </td>
                                              <td className="px-3 py-2">
                                                {payout.status !== 'PAID' ? (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      openPayModal(
                                                        payout.id,
                                                        courierName,
                                                        payout.payoutAmount,
                                                      )
                                                    }
                                                    disabled={submittingId === payout.id}
                                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                                  >
                                                    {submittingId === payout.id
                                                      ? 'Сохранение...'
                                                      : 'Подтвердить оплату'}
                                                  </button>
                                                ) : (
                                                  <span className="text-xs text-gray-400">
                                                    Уже оплачен
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {payModal ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="text-[20px] font-bold text-gray-900">
                Подтверждение выплаты курьеру
              </div>
              <div className="mt-1 text-sm text-gray-500">
                После подтверждения payout перейдёт в статус PAID и сумма уйдёт из
                блока «В payout» в «Уже выплачено».
              </div>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Курьер</div>
                <div className="mt-1 text-base font-semibold text-gray-900">
                  {payModal.courierName}
                </div>

                <div className="mt-3 text-sm text-gray-500">Сумма payout</div>
                <div className="mt-1 text-lg font-bold text-emerald-700">
                  {formatMoney(payModal.amount)}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Номер платёжки / reference <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Например: HALYK-984522"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500"
                />
                {!paymentReference.trim() ? (
                  <div className="mt-1 text-xs text-red-600">
                    Reference обязателен
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Комментарий
                </label>
                <textarea
                  value={paymentComment}
                  onChange={(e) => setPaymentComment(e.target.value)}
                  placeholder="Например: выплата курьеру за период"
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={closePayModal}
                disabled={!!submittingId}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={submitPayModal}
                disabled={
                  submittingId === payModal.payoutId || !paymentReference.trim()
                }
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submittingId === payModal.payoutId
                  ? 'Сохранение...'
                  : 'Подтвердить оплату'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}