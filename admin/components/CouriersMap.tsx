'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression } from 'leaflet';
import { getCourierIcon } from '@/lib/courierIcon';

type CourierStatus = 'online' | 'busy';

type CourierMapItem = {
  userId: string;
  lat: number;
  lng: number;
  isOnline: boolean;
  lastSeenAt: string | null;
  activeOrderId?: string | null;
};

type CourierLocationUpdatedEvent = {
  courierId?: string;
  userId?: string;
  lat: number;
  lng: number;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  activeOrderId?: string | null;
};

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

const DEFAULT_CENTER: LatLngExpression = [52.93592, 70.18895];

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('jetkiz_admin_token') ||
    localStorage.getItem('accessToken')
  );
}

function normalizeCourier(item: any): CourierMapItem | null {
  const userId = String(item?.userId ?? item?.courierId ?? item?.id ?? '');
  const lat = Number(item?.lat);
  const lng = Number(item?.lng);

  if (!userId || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  return {
    userId,
    lat,
    lng,
    isOnline: Boolean(item?.isOnline),
    lastSeenAt: item?.lastSeenAt ? String(item.lastSeenAt) : null,
    activeOrderId: item?.activeOrderId ? String(item.activeOrderId) : null,
  };
}

function getCourierStatus(courier: CourierMapItem): CourierStatus {
  if (courier.activeOrderId) return 'busy';
  return 'online';
}

export default function CouriersMap() {
  const [couriers, setCouriers] = useState<CourierMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    setMounted(true);
  }, []);

  const validCouriers = useMemo(() => {
    return couriers.filter(
      (item) =>
        item.isOnline &&
        typeof item.lat === 'number' &&
        !Number.isNaN(item.lat) &&
        typeof item.lng === 'number' &&
        !Number.isNaN(item.lng)
    );
  }, [couriers]);

  useEffect(() => {
    if (!mounted) return;

    if (!apiUrl) {
      setError('NEXT_PUBLIC_API_URL is not set');
      setLoading(false);
      return;
    }

    const token = getAdminToken();
    let cancelled = false;

    const loadCouriers = async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-dev-role': 'ADMIN',
        };

        if (token && token !== 'dev-bypass') {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${apiUrl}/couriers/map`, {
          method: 'GET',
          cache: 'no-store',
          headers,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}${text ? `: ${text}` : ''}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error('Response is not an array');
        }

        const normalized = data
          .map(normalizeCourier)
          .filter((item): item is CourierMapItem => item !== null)
          .filter((item) => item.isOnline);

        if (!cancelled) {
          setCouriers(normalized);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load map data'
          );
          setLoading(false);
        }
      }
    };

    loadCouriers();
    const intervalId = window.setInterval(loadCouriers, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [apiUrl, mounted]);

  useEffect(() => {
    if (!mounted || !apiUrl) return;

    const token = getAdminToken();

    const socket: Socket = io(apiUrl, {
      transports: ['websocket'],
      extraHeaders: {
        'x-dev-role': 'ADMIN',
        ...(token && token !== 'dev-bypass'
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on(
      'courier.location.updated',
      (payload: CourierLocationUpdatedEvent) => {
        console.log('WS courier update:', payload);

        const userId = String(payload.userId ?? payload.courierId ?? '');
        const lat = Number(payload.lat);
        const lng = Number(payload.lng);

        if (!userId || Number.isNaN(lat) || Number.isNaN(lng)) {
          console.warn('WS courier update skipped: invalid payload', payload);
          return;
        }

        setCouriers((prev) => {
          const nextCourier: CourierMapItem = {
            userId,
            lat,
            lng,
            isOnline: payload.isOnline ?? true,
            lastSeenAt: payload.lastSeenAt ?? null,
            activeOrderId: payload.activeOrderId ?? null,
          };

          if (!nextCourier.isOnline) {
            return prev.filter((c) => c.userId !== userId);
          }

          const exists = prev.some((c) => c.userId === userId);

          if (!exists) {
            return [...prev, nextCourier];
          }

          return prev.map((c) => (c.userId === userId ? nextCourier : c));
        });

        setLoading(false);
        setError(null);
      }
    );

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [apiUrl, mounted]);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return <div className="p-5">Загрузка карты...</div>;
  }

  if (error) {
    return <div className="p-5 text-danger">Ошибка загрузки карты: {error}</div>;
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Карта курьеров</h3>
      </div>

      <div className="card-body">
        <div style={{ height: '600px', width: '100%' }}>
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={13}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {validCouriers.map((courier) => {
              const status = getCourierStatus(courier);

              return (
                <Marker
                  key={courier.userId}
                  position={[courier.lat, courier.lng]}
                  icon={getCourierIcon(status)}
                >
                  <Popup>
                    <div>
                      <div>
                        <strong>ID:</strong> {courier.userId}
                      </div>
                      <div>
                        <strong>Статус:</strong>{' '}
                        {status === 'busy' ? 'Занят' : 'Онлайн'}
                      </div>
                      <div>
                        <strong>Последняя активность:</strong>{' '}
                        {courier.lastSeenAt ?? '—'}
                      </div>
                      <div>
                        <strong>Активный заказ:</strong>{' '}
                        {courier.activeOrderId ?? '—'}
                      </div>
                      <div>
                        <strong>Lat:</strong> {courier.lat}
                      </div>
                      <div>
                        <strong>Lng:</strong> {courier.lng}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}