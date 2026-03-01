'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

type CreateRestaurantDto = {
  nameRu: string;
  nameKk: string;
  phone: string;
  address: string;
  workingHours: string;
  status: string;
};

export default function NewRestaurantPage() {
  const router = useRouter();

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('23:00');

  const [form, setForm] = useState<CreateRestaurantDto>({
    nameRu: '',
    nameKk: '',
    phone: '',
    address: '',
    workingHours: '',
    status: 'OPEN',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: keyof CreateRestaurantDto, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!form.nameRu.trim()) {
        setError('Название (RU) обязательно');
        return;
      }

      const workingHours = `${startTime} - ${endTime}`;

      await apiFetch('/restaurants', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          workingHours,
        }),
      });

      router.push('/layout-20/restaurants');
    } catch (e: any) {
      setError(e?.message || 'Ошибка создания ресторана');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold">Добавить ресторан</h1>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">

        <div className="space-y-2">
          <label className="text-sm font-semibold">Название (RU)</label>
          <input
            className="w-full px-3 py-2 border rounded-md font-medium"
            value={form.nameRu}
            onChange={(e) => handleChange('nameRu', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Название (KZ)</label>
          <input
            className="w-full px-3 py-2 border rounded-md font-medium"
            value={form.nameKk}
            onChange={(e) => handleChange('nameKk', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Телефон</label>
          <input
            className="w-full px-3 py-2 border rounded-md font-medium"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
        </div>

        {/* ================= TIME PICKER ================= */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Время работы</label>

          <div className="flex items-center gap-3">
            <input
              type="time"
              className="px-3 py-2 border rounded-md font-semibold"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />

            <span className="font-bold text-gray-700">—</span>

            <input
              type="time"
              className="px-3 py-2 border rounded-md font-semibold"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        {/* =============================================== */}

        <div className="col-span-2 space-y-2">
          <label className="text-sm font-semibold">Адрес</label>
          <input
            className="w-full px-3 py-2 border rounded-md font-medium"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Статус</label>
          <select
            className="w-full px-3 py-2 border rounded-md font-semibold"
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="OPEN">OPEN</option>
            <option value="CLOSED">CLOSED</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Создание...' : 'Создать ресторан'}
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push('/layout-20/restaurants')}
        >
          Отмена
        </Button>
      </div>
    </div>
  );
}