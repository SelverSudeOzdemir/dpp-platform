import { STATUS_CFG, ROLE_CFG } from '../../constants/adminConstants';
import type { PassportStatus } from '../../types/admin';

export function StatusBadge({ status }: { status: PassportStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${ROLE_CFG[role] || 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  );
}
