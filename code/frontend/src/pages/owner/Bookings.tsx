import { useState, useEffect, useMemo } from 'react';
import { auth } from '../../config/firebase';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCreatedAt } from '../../utils/date';
import { STATUS_CONFIG } from '../../constants';

const getWeekDays = (startDate: Date) => {
  const days = [];
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push({
      day: dayNames[d.getDay()],
      date: d.getDate().toString(),
      fullDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    });
  }
  return days;
};

export interface Booking {
  id: string;
  bookingCode?: string;
  time: string;
  date: string;
  customerName: string;
  phone: string;
  fieldName: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  reference?: string;
  note?: string;
  createdAt?: string;
}

interface Field {
  id: string;
  name: string;
  owner?: string;
}

type ViewTab = 'week' | 'all';

export function OwnerBookings() {
  const [weekStart, setWeekStart] = useState(() => new Date());
  const DAYS = getWeekDays(weekStart);
  
  // Tab chế độ xem: Tuần này / Tất cả
  const [viewTab, setViewTab] = useState<ViewTab>('week');

  // Chế độ xem theo ngày
  const [selectedDay, setSelectedDay] = useState(DAYS[0].fullDate);
  const [dailyFieldFilter, setDailyFieldFilter] = useState('Tất cả sân');

  // Chế độ xem tất cả lịch đặt sân
  const [allSearchQuery, setAllSearchQuery] = useState('');
  const [allFieldFilter, setAllFieldFilter] = useState('all');
  const [allStatusFilter, setAllStatusFilter] = useState('all');
  const [allDateFilter, setAllDateFilter] = useState('');
  const [allSortOrder, setAllSortOrder] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'created-desc'>('date-desc');
  const [allPage, setAllPage] = useState(1);
  const allPageSize = 10;

  // Chi tiết booking được chọn
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [currentUid, setCurrentUid] = useState<string>('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) setCurrentUid(user.uid);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const [bookingsRes, fieldsRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/api/fields`)
        ]);
        if (bookingsRes.ok) setBookings(await bookingsRes.json());
        if (fieldsRes.ok) setFields(await fieldsRes.json());
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const confirmBooking = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'confirmed' })
      });
      if (res.ok) {
        setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status: 'confirmed' } : booking));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cancelBooking = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn đặt sân này không?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (res.ok) {
        setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status: 'cancelled' } : booking));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const myFields = fields.filter(f => f.owner === currentUid);

  // --- Dữ liệu cho phần xem theo ngày ---
  const visible = bookings.filter(b => b.date === selectedDay && (dailyFieldFilter === 'Tất cả sân' || b.fieldName === dailyFieldFilter));
  const dailyTotalBookings = visible.length;
  const dailyPendingBookings = visible.filter(b => b.status === 'pending').length;
  const dailyTotalRevenue = visible.filter(b => b.status !== 'pending' && b.status !== 'cancelled').reduce((sum, b) => sum + Number(b.amount || 0), 0);

  // --- Dữ liệu cho phần xem tất cả lịch đặt ---
  const filteredAllBookings = useMemo(() => {
    return bookings.filter(b => {
      // Tìm kiếm từ khóa
      if (allSearchQuery.trim()) {
        const query = allSearchQuery.toLowerCase().trim();
        const matchesName = (b.customerName || '').toLowerCase().includes(query);
        const matchesPhone = (b.phone || '').toLowerCase().includes(query);
        const matchesField = (b.fieldName || '').toLowerCase().includes(query);
        const matchesRef = (b.reference || '').toLowerCase().includes(query);
        const matchesCode = (b.bookingCode || '').toLowerCase().includes(query);
        const matchesId = (b.id || '').toLowerCase().includes(query);
        const matchesNote = (b.note || '').toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesField && !matchesRef && !matchesCode && !matchesId && !matchesNote) {
          return false;
        }
      }

      // Lọc theo sân
      if (allFieldFilter !== 'all' && b.fieldName !== allFieldFilter) {
        return false;
      }

      // Lọc theo trạng thái
      if (allStatusFilter !== 'all' && b.status !== allStatusFilter) {
        return false;
      }

      // Lọc theo ngày
      if (allDateFilter && b.date !== allDateFilter) {
        return false;
      }

      return true;
    });
  }, [bookings, allSearchQuery, allFieldFilter, allStatusFilter, allDateFilter]);

  // Sắp xếp danh sách tất cả
  const sortedAllBookings = useMemo(() => {
    return [...filteredAllBookings].sort((a, b) => {
      if (allSortOrder === 'date-desc') {
        const comp = (b.date || '').localeCompare(a.date || '');
        if (comp !== 0) return comp;
        return (b.time || '').localeCompare(a.time || '');
      } else if (allSortOrder === 'date-asc') {
        const comp = (a.date || '').localeCompare(b.date || '');
        if (comp !== 0) return comp;
        return (a.time || '').localeCompare(b.time || '');
      } else if (allSortOrder === 'amount-desc') {
        return Number(b.amount || 0) - Number(a.amount || 0);
      } else if (allSortOrder === 'created-desc') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return 0;
    });
  }, [filteredAllBookings, allSortOrder]);

  // Phân trang
  const totalPages = Math.ceil(sortedAllBookings.length / allPageSize) || 1;
  const paginatedAllBookings = useMemo(() => {
    const start = (allPage - 1) * allPageSize;
    return sortedAllBookings.slice(start, start + allPageSize);
  }, [sortedAllBookings, allPage, allPageSize]);

  // Thống kê tổng hợp toàn bộ lịch đặt
  const allStats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'paid' || b.status === 'completed').length;
    const revenue = bookings
      .filter(b => b.status !== 'pending' && b.status !== 'cancelled')
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);
    return { total, pending, confirmed, revenue };
  }, [bookings]);

  // Xuất file CSV
  const exportAllBookingsCsv = () => {
    const headers = ['Mã đơn', 'Khách hàng', 'SĐT', 'Sân', 'Ngày', 'Khung giờ', 'Tổng tiền (VND)', 'Trạng thái', 'Phương thức thanh toán', 'Ghi chú', 'Thời gian đặt'];
    const rows = sortedAllBookings.map(b => [
      b.reference || b.bookingCode || b.id,
      b.customerName,
      b.phone,
      b.fieldName,
      b.date,
      b.time,
      b.amount,
      STATUS_CONFIG[b.status]?.label || b.status,
      b.paymentMethod || 'Chưa xác định',
      b.note || '',
      b.createdAt ? formatCreatedAt(b.createdAt) : ''
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_tat_ca_dat_san_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = allSearchQuery || allFieldFilter !== 'all' || allStatusFilter !== 'all' || allDateFilter;

  const resetAllFilters = () => {
    setAllSearchQuery('');
    setAllFieldFilter('all');
    setAllStatusFilter('all');
    setAllDateFilter('');
    setAllSortOrder('date-desc');
    setAllPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-slate-900 tracking-tight">
            Lịch vận hành & Quản lý đặt sân
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Theo dõi theo ngày và quản lý toàn bộ danh sách đơn đặt trên tất cả sân của bạn.
          </p>
        </div>

        {/* Chuyển đổi chế độ hiển thị: Tuần này / Tất cả */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setViewTab('week')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewTab === 'week'
                ? 'bg-white text-green-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Tuần này ({visible.length})
          </button>
          <button
            onClick={() => setViewTab('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewTab === 'all'
                ? 'bg-white text-green-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Tất cả ({bookings.length})
          </button>
        </div>
      </div>

      {/* ========================================================
          PHẦN 1: LỊCH VẬN HÀNH THEO NGÀY (7-DAY CALENDAR)
         ======================================================== */}
      {viewTab === 'week' && (
        <div className="space-y-4">
          {/* Lịch 7 ngày */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 px-2">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Lịch 7 ngày
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Chuyển đến ngày:</span>
                <input 
                  type="date"
                  className="text-sm border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:ring-1 focus:ring-green-500 focus:outline-none bg-slate-50/50"
                  onChange={(e) => {
                    if (e.target.value) {
                      const d = new Date(e.target.value);
                      setWeekStart(d);
                      setSelectedDay(e.target.value);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex overflow-x-auto pb-2 gap-2 sm:grid sm:grid-cols-7 snap-x">
              {DAYS.map((item) => {
                const dayPending = bookings.filter(b => b.date === item.fullDate && b.status === 'pending').length;
                return (
                  <button
                    key={item.fullDate}
                    onClick={() => setSelectedDay(item.fullDate)}
                    className={`relative shrink-0 min-w-[4.2rem] sm:min-w-0 snap-center rounded-xl py-3 text-center transition-all ${
                      selectedDay === item.fullDate
                        ? 'bg-green-600 text-white shadow-md shadow-green-700/20'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {dayPending > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 shadow-sm ring-1 ring-white animate-pulse" />
                    )}
                    <span className="block text-xs font-medium">{item.day}</span>
                    <span className="mt-1 block font-display text-2xl font-bold">{item.date}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Thẻ thống kê trong ngày đang chọn */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [dailyTotalBookings.toString(), 'Lịch ngày này'], 
              [dailyPendingBookings.toString(), 'Chờ xác nhận'], 
              ['78%', 'Tỷ lệ lấp đầy'], 
              [(dailyTotalRevenue / 1000000).toFixed(1) + 'tr', 'Doanh thu ngày này']
            ].map(([value, label], idx) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="font-display text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
                {idx === 1 && dailyPendingBookings > 0 && (
                  <span className="text-[11px] font-semibold text-amber-600 mt-1">Cần xử lý</span>
                )}
              </div>
            ))}
          </div>

          {/* Danh sách lịch theo ngày được chọn */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-display text-xl font-bold uppercase text-slate-900">
                  {new Date(selectedDay).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-xs text-slate-500">{visible.length} lịch đang hiển thị trong ngày này</p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  onClick={() => setDailyFieldFilter('Tất cả sân')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    dailyFieldFilter === 'Tất cả sân'
                      ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Tất cả sân
                </button>
                {myFields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => setDailyFieldFilter(field.name)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      dailyFieldFilter === field.name
                        ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {field.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {visible.map((booking) => (
                <div key={booking.id} className="grid gap-4 p-5 hover:bg-slate-50/70 sm:grid-cols-[130px_1fr_auto] sm:items-center transition-colors">
                  <div className="border-l-4 border-green-500 pl-3">
                    <p className="font-mono text-base font-bold text-slate-900">{booking.time}</p>
                    <p className="font-mono text-xs text-slate-500">{booking.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800">
                      {(booking.customerName || 'U').split(' ').pop()?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{booking.customerName}</p>
                      <p className="text-xs text-slate-500">{booking.phone} · <span className="font-medium text-slate-700">{booking.fieldName}</span></p>
                      {booking.paymentMethod && (
                        <p className="mt-1 text-xs font-medium text-blue-600">
                          {booking.paymentMethod} {booking.reference ? `· #${booking.reference}` : ''}
                        </p>
                      )}
                      {booking.note && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50/90 px-2.5 py-1 rounded-lg border border-amber-200/70 max-w-sm">
                          <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span className="truncate">
                            <strong className="font-semibold text-amber-900">Ghi chú:</strong> {booking.note}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="font-semibold text-slate-900">{(booking.amount || 0).toLocaleString('vi-VN')}đ</p>
                      <StatusBadge status={booking.status} size="sm" />
                    </div>
                    {booking.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmBooking(booking.id)}
                          className="rounded-xl bg-green-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-green-700 transition-colors shadow-xs"
                        >
                          Xác nhận
                        </button>
                        <button
                          onClick={() => cancelBooking(booking.id)}
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Hủy đơn
                        </button>
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 transition-colors"
                          title="Xem chi tiết"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 transition-colors"
                        title="Xem chi tiết"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {visible.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Chưa có lịch đặt nào trong ngày {selectedDay}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PHẦN 2: DANH SÁCH TẤT CẢ LỊCH ĐẶT SÂN (ALL BOOKINGS)
         ======================================================== */}
      {viewTab === 'all' && (
        <div className="space-y-4">
          {/* Thống kê nhanh toàn bộ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Tổng toàn bộ đơn</span>
              <p className="font-display text-2xl font-bold text-slate-900 mt-1">{allStats.total}</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm bg-amber-50/30">
              <span className="text-xs text-amber-700 font-medium">Tổng chờ xác nhận</span>
              <p className="font-display text-2xl font-bold text-amber-700 mt-1">{allStats.pending}</p>
            </div>
            <div className="bg-white rounded-2xl border border-green-200 p-4 shadow-sm bg-green-50/30">
              <span className="text-xs text-green-700 font-medium">Đã duyệt / Hoàn tất</span>
              <p className="font-display text-2xl font-bold text-green-700 mt-1">{allStats.confirmed}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Doanh thu tích lũy</span>
              <p className="font-display text-2xl font-bold text-green-600 mt-1">{(allStats.revenue / 1000000).toFixed(1)}tr</p>
            </div>
          </div>

          {/* Bảng & Bộ lọc Tất cả lịch đặt */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Header của bảng tất cả */}
            <div className="border-b border-slate-100 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-bold uppercase text-slate-900">
                      Danh sách tất cả lịch đặt sân
                    </h2>
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                      {filteredAllBookings.length} / {bookings.length} đơn
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tra cứu, lọc trạng thái, tìm kiếm khách hàng và quản lý toàn bộ các lịch đặt sân.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {hasActiveFilters && (
                    <button
                      onClick={resetAllFilters}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      Đặt lại bộ lọc
                    </button>
                  )}
                  <button
                    onClick={exportAllBookingsCsv}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-xs"
                    title="Xuất danh sách ra file Excel (CSV)"
                  >
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Xuất Excel (CSV)
                  </button>
                </div>
              </div>

              {/* Thanh tìm kiếm & Bộ lọc nâng cao */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
                {/* Search */}
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text"
                    value={allSearchQuery}
                    onChange={(e) => { setAllSearchQuery(e.target.value); setAllPage(1); }}
                    placeholder="Tìm tên, SĐT, mã đơn..."
                    className="w-full pl-9 pr-7 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50/50"
                  />
                  {allSearchQuery && (
                    <button onClick={() => { setAllSearchQuery(''); setAllPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
                  )}
                </div>

                {/* Sân */}
                <div>
                  <select
                    value={allFieldFilter}
                    onChange={(e) => { setAllFieldFilter(e.target.value); setAllPage(1); }}
                    className="w-full py-2 px-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50/50"
                  >
                    <option value="all">Tất cả sân ({myFields.length || fields.length})</option>
                    {(myFields.length ? myFields : fields).map(f => (
                      <option key={f.id} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Trạng thái */}
                <div>
                  <select
                    value={allStatusFilter}
                    onChange={(e) => { setAllStatusFilter(e.target.value); setAllPage(1); }}
                    className="w-full py-2 px-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50/50"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="paid">Đã thanh toán</option>
                    <option value="completed">Đã hoàn tất</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>

                {/* Chọn ngày thi đấu cụ thể */}
                <div>
                  <input
                    type="date"
                    value={allDateFilter}
                    onChange={(e) => { setAllDateFilter(e.target.value); setAllPage(1); }}
                    className="w-full py-1.5 px-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50/50 text-slate-700"
                    title="Lọc theo ngày thi đấu cụ thể"
                  />
                </div>

                {/* Sắp xếp */}
                <div>
                  <select
                    value={allSortOrder}
                    onChange={(e) => setAllSortOrder(e.target.value as any)}
                    className="w-full py-2 px-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50/50"
                  >
                    <option value="date-desc">Ngày đá: Mới nhất</option>
                    <option value="date-asc">Ngày đá: Cũ nhất</option>
                    <option value="amount-desc">Số tiền: Cao → Thấp</option>
                    <option value="created-desc">Ngày đặt: Mới nhất</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Danh sách các đơn */}
            <div className="divide-y divide-slate-100">
              {paginatedAllBookings.map((booking) => (
                <div key={booking.id} className="grid gap-4 p-5 hover:bg-slate-50/70 sm:grid-cols-[140px_1fr_auto] sm:items-center transition-colors">
                  {/* Cột 1: Ngày giờ */}
                  <div className="border-l-4 border-green-500 pl-3">
                    <p className="font-mono text-base font-bold text-slate-900 leading-tight">{booking.time}</p>
                    <p className="font-mono text-xs font-semibold text-green-700 mt-0.5">{booking.date}</p>
                    {booking.createdAt && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Đặt: {formatCreatedAt(booking.createdAt)}
                      </p>
                    )}
                  </div>

                  {/* Cột 2: Khách hàng & Sân */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                      {(booking.customerName || 'U').split(' ').pop()?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">{booking.customerName}</p>
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          #{booking.reference || booking.bookingCode || booking.id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-mono">{booking.phone}</span> · <span className="font-medium text-slate-800">{booking.fieldName}</span>
                      </p>
                      {booking.paymentMethod && (
                        <p className="mt-1 text-xs font-medium text-blue-600 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                          {booking.paymentMethod}
                        </p>
                      )}
                      {booking.note && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/70 max-w-md">
                          <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span className="truncate">
                            <strong className="font-semibold text-amber-900">Ghi chú:</strong> {booking.note}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cột 3: Giá & Thao tác */}
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="font-semibold text-slate-900 text-base">{(booking.amount || 0).toLocaleString('vi-VN')}đ</p>
                      <StatusBadge status={booking.status} size="sm" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {booking.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => confirmBooking(booking.id)}
                            className="rounded-xl bg-green-600 hover:bg-green-700 px-3.5 py-2 text-xs font-bold text-white transition-colors shadow-xs"
                          >
                            Xác nhận
                          </button>
                          <button
                            onClick={() => cancelBooking(booking.id)}
                            className="rounded-xl bg-red-50 hover:bg-red-100 px-3 py-2 text-xs font-bold text-red-600 transition-colors"
                          >
                            Hủy đơn
                          </button>
                        </>
                      ) : null}
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 transition-colors"
                        title="Xem chi tiết đơn"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Trạng thái trống */}
              {paginatedAllBookings.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </div>
                  <p className="text-sm font-bold text-slate-700">Không tìm thấy lịch đặt nào</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {hasActiveFilters
                      ? 'Không có đơn nào khớp với các tiêu chí tìm kiếm hoặc bộ lọc hiện tại.'
                      : 'Hệ thống chưa ghi nhận đơn đặt sân nào.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={resetAllFilters}
                      className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors"
                    >
                      Xóa bộ lọc & Hiển thị tất cả
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-600">
                <span>
                  Hiển thị <strong>{(allPage - 1) * allPageSize + 1}</strong> - <strong>{Math.min(allPage * allPageSize, sortedAllBookings.length)}</strong> trong số <strong>{sortedAllBookings.length}</strong> đơn
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={allPage === 1}
                    onClick={() => setAllPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Trước
                  </button>
                  <span className="px-2 font-semibold text-slate-800">
                    Trang {allPage} / {totalPages}
                  </span>
                  <button
                    disabled={allPage === totalPages}
                    onClick={() => setAllPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* ========================================================
          MODAL CHI TIẾT ĐƠN ĐẶT SÂN (DÙNG CHUNG)
         ======================================================== */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Chi tiết đặt sân</h3>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 flex gap-4 items-center">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                  {(selectedBooking.customerName || 'U').charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedBooking.customerName}</p>
                  <p className="text-sm text-slate-500 font-mono">{selectedBooking.phone}</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Sân:</span>
                  <span className="font-semibold text-slate-900 text-sm">{selectedBooking.fieldName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Thời gian:</span>
                  <span className="font-semibold text-slate-900 text-sm">{selectedBooking.time} · {selectedBooking.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Thời gian đặt:</span>
                  <span className="font-semibold text-blue-600 text-sm">{formatCreatedAt(selectedBooking.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Thanh toán:</span>
                  <span className="font-medium text-slate-900 text-sm">{selectedBooking.paymentMethod || 'Chưa xác định'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Mã đơn:</span>
                  <span className="font-mono text-slate-900 text-sm font-bold">
                    #{selectedBooking.reference || selectedBooking.bookingCode || selectedBooking.id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Trạng thái:</span>
                  <StatusBadge status={selectedBooking.status} size="sm" />
                </div>
              </div>

              {/* Customer Note Section */}
              {selectedBooking.note ? (
                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5">
                    <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <span>Ghi chú từ khách hàng:</span>
                  </div>
                  <p className="text-slate-800 font-medium bg-white/90 p-2.5 rounded-lg border border-amber-100 whitespace-pre-wrap leading-relaxed shadow-xs">
                    {selectedBooking.note}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-400 italic flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span>Không có ghi chú từ khách hàng</span>
                </div>
              )}
              
              <div className="border-t border-dashed border-slate-200 pt-4 mt-4 flex justify-between items-center">
                <span className="font-semibold text-slate-700">Tổng tiền</span>
                <span className="font-bold text-xl text-green-600">{(selectedBooking.amount || 0).toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setSelectedBooking(null)} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                Đóng
              </button>
              {selectedBooking.status === 'pending' && (
                <button 
                  onClick={() => {
                    confirmBooking(selectedBooking.id);
                    setSelectedBooking(null);
                  }} 
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                >
                  Xác nhận đơn
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
