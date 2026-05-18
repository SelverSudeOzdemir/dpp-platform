import { useState, useEffect } from 'react';
import { Activity, User, Lock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { LOGS_PER_PAGE, ACCESS_MATRIX } from '../../../constants/adminConstants';
import { RoleBadge } from '../AdminBadges';
import { apiGetAccessLogs } from '../../../lib/api';

export default function AccessTab() {
  const [logPage, setLogPage] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await apiGetAccessLogs();
        if (response && response.data && response.data.length > 0) {
          const mapped = response.data.map((l: any) => ({
            user: l.user_email || 'anonim',
            role: l.role || 'PUBLIC',
            action: l.action || 'Pasaport görüntülendi',
            product: l.target_id ? (l.target_id.length > 8 ? l.target_id.slice(0, 8) + '…' : l.target_id) : '—',
            timestamp: l.date ? new Date(l.date).toLocaleString('tr-TR') : '—',
            ip: l.ip_address || '—'
          }));
          setLogs(mapped);
        }
      } catch (err) {
        console.error('Erişim logları yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-8">

      {/* Erişim Logları */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Activity size={16} className="text-blue-600" />
            Erişim Logları (Son 30 Gün)
          </h2>
          <div className="flex items-center gap-3">
            {loading && <Loader2 size={14} className="text-blue-600 animate-spin" />}
            <span className="text-xs text-gray-400 font-bold">
              {logPage * LOGS_PER_PAGE + 1}–{Math.min((logPage + 1) * LOGS_PER_PAGE, logs.length)} / {logs.length} kayıt
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLogPage(p => p - 1)}
                disabled={logPage === 0}
                className={`px-2.5 py-1 text-xs font-black border rounded-lg transition-colors ${logPage === 0 ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                ← Önceki
              </button>
              <span className="text-[10px] font-bold text-gray-400 px-1">
                {logPage + 1} / {Math.ceil(logs.length / LOGS_PER_PAGE)}
              </span>
              <button
                onClick={() => setLogPage(p => p + 1)}
                disabled={(logPage + 1) * LOGS_PER_PAGE >= logs.length}
                className={`px-2.5 py-1 text-xs font-black border rounded-lg transition-colors ${(logPage + 1) * LOGS_PER_PAGE >= logs.length ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Sonraki →
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Kullanıcı', 'Rol', 'Aksiyon', 'Pasaport', 'Zaman', 'IP Adresi'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.slice(logPage * LOGS_PER_PAGE, (logPage + 1) * LOGS_PER_PAGE).map((log, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <User size={12} className="text-gray-500" />
                      </div>
                      <span className="text-xs font-bold text-gray-800">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3"><RoleBadge role={log.role} /></td>
                  <td className="px-5 py-3"><span className="text-xs text-gray-700 font-medium">{log.action}</span></td>
                  <td className="px-5 py-3"><span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{log.product}</span></td>
                  <td className="px-5 py-3"><span className="text-xs text-gray-500 font-medium">{log.timestamp}</span></td>
                  <td className="px-5 py-3"><span className="text-[10px] font-mono text-gray-400">{log.ip}</span></td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-gray-400 font-medium">Erişim kaydı bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rol & Yetki Matrisi */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Lock size={16} className="text-purple-600" />
          Rol & Yetki Matrisi
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3 pr-6">Özellik</th>
                {['PUBLIC', 'CUSTOMER', 'SUPPLIER', 'ENGINEER', 'AUTHORITY', 'ADMIN'].map(r => (
                  <th key={r} className="text-center pb-3 px-4">
                    <RoleBadge role={r} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ACCESS_MATRIX.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="py-3 pr-6 text-sm font-medium text-gray-700 whitespace-nowrap">{row.feature}</td>
                  {row.access.map((has, j) => (
                    <td key={j} className="py-3 px-4 text-center">
                      {has
                        ? <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                        : <XCircle size={16} className="text-gray-200 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
