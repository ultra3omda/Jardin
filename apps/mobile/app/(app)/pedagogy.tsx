import { ScrollView, Text, View } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';

/* ── Shared helpers ─────────────────────────────────────────────── */

function gradeColor(grade: number): string {
  if (grade >= 14) return '#34d399';
  if (grade >= 10) return '#fbb13c';
  return '#f87171';
}

function GradeChip({ value, outOf = 20 }: { value: number; outOf?: number }) {
  const color = gradeColor(value);
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: color + '14', borderWidth: 1, borderColor: color + '30' }}>
      <Text style={{ fontWeight: '700', fontSize: 14, color }}>{value}/{outOf}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.ink[300], marginBottom: 10, marginTop: 4 }}>
      {children}
    </Text>
  );
}

/* ── Views per role ─────────────────────────────────────────────── */

function TeacherView({ isKG }: { isKG: boolean }) {
  const classes = isKG
    ? [
        { name: 'Petite Section',  subject: 'Éveil',     students: 28, done: 28, avg: null },
        { name: 'Moyenne Section', subject: 'Activités', students: 30, done: 25, avg: null },
      ]
    : [
        { name: 'Classe 5A', subject: 'Mathématiques', students: 32, done: 30, avg: 13.8 },
        { name: 'Classe 5B', subject: 'Mathématiques', students: 30, done: 30, avg: 14.2 },
        { name: 'Classe 4A', subject: 'Mathématiques', students: 28, done: 18, avg: null  },
      ];

  return (
    <>
      <SectionTitle>{isKG ? 'Mes groupes' : 'Mes classes'}</SectionTitle>
      <View style={{ gap: 10 }}>
        {classes.map((cls, i) => {
          const pct = Math.round((cls.done / cls.students) * 100);
          return (
            <View key={i} style={{ backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.paper[100] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>{cls.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 1 }}>{cls.subject} · {cls.students} élèves</Text>
                </View>
                {cls.avg !== null && <GradeChip value={cls.avg} />}
              </View>
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, color: colors.ink[300] }}>Notes saisies</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: pct === 100 ? '#34d399' : '#fbb13c' }}>
                    {cls.done}/{cls.students} ({pct}%)
                  </Text>
                </View>
                <View style={{ height: 4, backgroundColor: colors.paper[100], borderRadius: 2 }}>
                  <View style={{ height: 4, borderRadius: 2, width: `${pct}%` as `${number}%`, backgroundColor: pct === 100 ? '#34d399' : '#fbb13c' }} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}

function ParentView({ isKG }: { isKG: boolean }) {
  const children = isKG
    ? [{ name: 'Yasmine', class: 'Moyenne Section', subjects: [
        { name: 'Éveil musical', note: null as number | null, emoji: '🎵' },
        { name: 'Motricité',     note: null as number | null, emoji: '🏃' },
        { name: 'Langage',       note: null as number | null, emoji: '💬' },
      ]}]
    : [
        { name: 'Ahmed', class: '5ème A', subjects: [
          { name: 'Mathématiques', note: 16 as number | null, emoji: null },
          { name: 'Français',      note: 13 as number | null, emoji: null },
          { name: 'Arabe',         note: 17 as number | null, emoji: null },
          { name: 'Sciences',      note: 14 as number | null, emoji: null },
          { name: 'Histoire-Géo',  note: 12 as number | null, emoji: null },
        ]},
        { name: 'Yasmine', class: '4ème B', subjects: [
          { name: 'Mathématiques', note: 11 as number | null, emoji: null },
          { name: 'Français',      note: 15 as number | null, emoji: null },
          { name: 'Arabe',         note: 13 as number | null, emoji: null },
        ]},
      ];

  return (
    <>
      {children.map((child, ci) => (
        <View key={ci} style={{ marginBottom: 20 }}>
          <SectionTitle>{child.name} · {child.class}</SectionTitle>
          <View style={{ gap: 8 }}>
            {child.subjects.map((sub, si) => (
              <View key={si} style={{ backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.paper[100] }}>
                <Text style={{ fontSize: 14, color: colors.ink[700] }}>
                  {sub.emoji ? `${sub.emoji} ` : ''}{sub.name}
                </Text>
                {sub.note !== null ? (
                  <GradeChip value={sub.note} />
                ) : (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.paper[100] }}>
                    <Text style={{ fontSize: 12, color: colors.ink[300] }}>En cours</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

function AdminView() {
  const classStats = [
    { name: '6ème A', avg: 14.1, top: 'Arabe 16.3',    students: 34 },
    { name: '6ème B', avg: 13.5, top: 'Maths 15.1',    students: 32 },
    { name: '5ème A', avg: 13.8, top: 'Maths 15.4',    students: 32 },
    { name: '5ème B', avg: 12.9, top: 'Français 14.7', students: 30 },
  ];

  return (
    <>
      <SectionTitle>Performance par classe — 2e trimestre</SectionTitle>
      <View style={{ gap: 8 }}>
        {classStats.map((cls, i) => (
          <View key={i} style={{ backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.paper[100] }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>{cls.name}</Text>
              <Text style={{ fontSize: 11, color: colors.ink[300], marginTop: 1 }}>
                {cls.students} élèves · Meilleure : {cls.top}
              </Text>
            </View>
            <GradeChip value={cls.avg} />
          </View>
        ))}
      </View>
    </>
  );
}

/* ── Main screen ────────────────────────────────────────────────── */

export default function PedagogyScreen() {
  const user   = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const isKG   = tenant?.type === 'KINDERGARTEN';

  const title = isKG ? 'Vie scolaire' : 'Pédagogie';
  const subtitle =
    user?.role === 'TEACHER'      ? 'Mes classes et notes'     :
    user?.role === 'PARENT'       ? 'Notes de mes enfants'     :
    user?.role === 'SCHOOL_ADMIN' ? "Vue d'ensemble"           :
    'Résultats scolaires';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
    >
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink[900], marginBottom: 4 }}>{title}</Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 20 }}>{subtitle}</Text>

      {user?.role === 'TEACHER'      && <TeacherView isKG={isKG} />}
      {user?.role === 'PARENT'       && <ParentView  isKG={isKG} />}
      {user?.role === 'SCHOOL_ADMIN' && <AdminView />}
      {!user?.role                   && <ParentView  isKG={false} />}
    </ScrollView>
  );
}
