/**
 * HeroMockup — CSS-built Klasso dashboard preview for the landing hero.
 *
 * 100% JSX/CSS — no external images. Replaces the generic Unsplash stock photo.
 * Uses `animate-float` (Tailwind keyframe added in tailwind.config.ts) for the
 * gentle levitation effect and `animate-pulse-dot` for the live indicator.
 */

const KPIS = [
  { value: '312', label: 'Élèves',   color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.20)'  },
  { value: '94%', label: 'Présence', color: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.20)'  },
  { value: '17',  label: 'Classes',  color: '#fbb13c', bg: 'rgba(251,177,60,0.10)',   border: 'rgba(251,177,60,0.20)'  },
  { value: '3',   label: 'Alertes',  color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.20)' },
] as const;

const ACTIVITY = [
  { text: 'Inscription confirmée · Ali M.',   dot: '#fbb13c', time: '09:14' },
  { text: 'Bulletins 2e trim. générés × 54',  dot: '#34d399', time: '08:50' },
  { text: 'Absence signalée · Classe 3B',      dot: '#f87171', time: '08:32' },
  { text: 'Message · Parent Trabelsi',         dot: '#60a5fa', time: '08:15' },
] as const;

const ATTENDANCE_BARS = [92, 96, 91, 97, 94] as const;
const DAYS = ['L', 'M', 'M', 'J', 'V'] as const;

export function HeroMockup() {
  return (
    <div className="relative mx-auto max-w-[540px]" aria-hidden>
      {/* Ambre ambient glow */}
      <div
        className="animate-glow-pulse pointer-events-none absolute -inset-8 rounded-3xl blur-3xl"
        style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(251,177,60,0.32) 0%, transparent 65%)' }}
      />
      {/* Secondary blue glow */}
      <div
        className="pointer-events-none absolute -inset-8 rounded-3xl blur-3xl opacity-15"
        style={{ background: 'radial-gradient(ellipse at 30% 70%, rgba(96,165,250,0.4) 0%, transparent 60%)' }}
      />

      {/* ── Browser window card — floats gently ── */}
      <div
        className="animate-float relative overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(170deg, #0d1828 0%, #080f1a 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow:
            '0 40px 80px -16px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Browser chrome */}
        <div
          className="flex items-center gap-1.5 px-4 py-3"
          style={{ background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#febc2e' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#28c840' }} />
          <div
            className="ml-3 flex flex-1 items-center gap-2 rounded-md px-3 py-1"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <span
              className="animate-pulse-dot h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: '#34d399' }}
            />
            <span className="truncate font-mono text-[10px] text-white/30">
              klasso.tn · École Primaire Sidi Bou Saïd 🇹🇳
            </span>
          </div>
        </div>

        {/* App layout */}
        <div className="flex" style={{ height: 384 }}>
          {/* Sidebar */}
          <div
            className="flex flex-col items-center gap-3 px-3 py-5"
            style={{
              width: 56,
              background: 'rgba(0,0,0,0.22)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: '#fbb13c', color: '#0f1419' }}
            >
              K
            </div>
            {[true, false, false, false, false].map((active, i) => (
              <div
                key={i}
                className="h-8 w-8 flex-shrink-0 rounded-lg"
                style={{
                  background: active ? 'rgba(251,177,60,0.14)' : 'rgba(255,255,255,0.04)',
                  border: active ? '1px solid rgba(251,177,60,0.22)' : '1px solid transparent',
                }}
              />
            ))}
            <div
              className="mt-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white/60"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            >
              S
            </div>
          </div>

          {/* Main */}
          <div className="flex flex-1 flex-col gap-3.5 overflow-hidden p-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/25">
                  Mardi 27 mai 2026
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-white">Bonjour, Sonia 👋</p>
              </div>
              <div
                className="flex items-center gap-1.5 rounded-full px-2 py-1"
                style={{ background: 'rgba(52,211,153,0.09)', border: '1px solid rgba(52,211,153,0.16)' }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#34d399' }} />
                <span className="font-mono text-[9px] font-medium" style={{ color: '#34d399' }}>En ligne</span>
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-4 gap-2">
              {KPIS.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl p-2.5"
                  style={{ background: kpi.bg, border: `1px solid ${kpi.border}` }}
                >
                  <p className="font-mono text-[15px] font-bold leading-none" style={{ color: kpi.color }}>
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-[9px] leading-none text-white/40">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Attendance chart */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-white/25">
                  Présence · semaine
                </span>
                <span className="font-mono text-[9px] font-semibold" style={{ color: '#34d399' }}>
                  moy. 94%
                </span>
              </div>
              <div className="flex items-end gap-1" style={{ height: 42 }}>
                {ATTENDANCE_BARS.map((v, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-[3px]"
                      style={{
                        height: `${Math.round(((v - 88) / 10) * 28 + 8)}px`,
                        background: `rgba(52,211,153,${0.18 + (v - 88) / 35})`,
                        border: '1px solid rgba(52,211,153,0.10)',
                      }}
                    />
                    <span className="font-mono text-[7px] text-white/18">{DAYS[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="flex-1">
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-white/25">
                Activité récente
              </p>
              <div className="space-y-1.5">
                {ACTIVITY.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: item.dot }} />
                    <span className="flex-1 truncate text-[11px] text-white/48">{item.text}</span>
                    <span className="flex-shrink-0 font-mono text-[9px] text-white/20">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
