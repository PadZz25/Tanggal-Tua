import { Clock, Home, PieChart, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../hooks/useUIStore';

const NAV_ITEMS = [
  { to: '/', label: 'Beranda', icon: Home },
  { to: '/riwayat', label: 'Riwayat', icon: Clock },
  { to: '/ringkasan', label: 'Ringkasan', icon: PieChart },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
] as const;

export function BottomNav() {
  const isQuickInputFocused = useUIStore((s) => s.isQuickInputFocused);

  return (
    <nav
      aria-label="Navigasi utama"
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] transition-transform duration-200 ${
        isQuickInputFocused ? 'max-sm:translate-y-full' : 'translate-y-0'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex h-16 max-w-[480px] items-center justify-around px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] transition-colors ${
                isActive
                  ? 'font-extrabold text-[var(--primary)]'
                  : 'font-bold text-[var(--muted)] hover:text-[var(--ink)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`inline-flex h-[28px] w-[52px] items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-[var(--primary-tint)] text-[var(--primary)]' : ''
                  }`}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.4 : 2.1} aria-hidden="true" />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
