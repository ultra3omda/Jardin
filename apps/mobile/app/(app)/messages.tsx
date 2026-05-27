import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';

/* ── Demo thread data per role ─────────────────────────────────── */

interface Thread {
  id: number;
  name: string;
  role: string;
  preview: string;
  time: string;
  unread: number;
  avatarColor: string;
  initial: string;
}

const THREADS_ADMIN: Thread[] = [
  { id: 1, name: 'Mme Fatima Ben Ali',   role: 'Parent',       preview: "Bonjour, j'ai une question sur les frais de scolarité du 3ème trimestre.", time: '09:15', unread: 2, avatarColor: '#fbb13c', initial: 'F' },
  { id: 2, name: 'M. Karim Haddad',      role: 'Enseignant',   preview: 'Les notes du 2e trimestre sont disponibles pour validation.',              time: '08:47', unread: 0, avatarColor: '#60a5fa', initial: 'K' },
  { id: 3, name: 'Direction Régionale',  role: 'Administration', preview: 'Rappel : réunion des directeurs jeudi 29 mai à 10h.',                    time: '08:20', unread: 1, avatarColor: '#34d399', initial: 'D' },
  { id: 4, name: 'Mme Leila Trabelsi',  role: 'Parent',        preview: 'Mon fils Ahmed sera absent vendredi pour raison médicale.',               time: 'Hier',  unread: 0, avatarColor: '#f87171', initial: 'L' },
  { id: 5, name: 'M. Sami Ghariani',    role: 'Enseignant',    preview: 'Demande de congé pour le 3 juin, merci de valider.',                      time: 'Hier',  unread: 0, avatarColor: '#a78bfa', initial: 'S' },
];

const THREADS_TEACHER: Thread[] = [
  { id: 1, name: 'Mme Fatima Ben Ali',  role: 'Parent · Ahmed 5A',    preview: "Comment se passe Ahmed en classe ? Je suis inquiète.",              time: '09:30', unread: 1, avatarColor: '#fbb13c', initial: 'F' },
  { id: 2, name: 'Direction',           role: 'Administration',        preview: 'Merci de remettre les appréciations avant vendredi 17h.',           time: '08:55', unread: 0, avatarColor: '#34d399', initial: 'D' },
  { id: 3, name: 'Mme Salma Jlassi',   role: 'Parent · Yasmine 5A',  preview: 'Yasmine a oublié son cahier de maths hier.',                        time: '08:10', unread: 0, avatarColor: '#60a5fa', initial: 'S' },
  { id: 4, name: 'M. Walid Mansour',   role: 'Parent · Omar 5B',     preview: 'Omar se plaint de maux de tête réguliers en cours.',                time: 'Hier',  unread: 2, avatarColor: '#f87171', initial: 'W' },
];

const THREADS_PARENT: Thread[] = [
  { id: 1, name: 'M. Karim Haddad',   role: 'Enseignant · 5A Maths',    preview: 'Ahmed a eu 16/20 au dernier contrôle. Très bon résultat.',        time: '09:00', unread: 1, avatarColor: '#60a5fa', initial: 'K' },
  { id: 2, name: 'Mme Samira Dridi',  role: 'Enseignante · 5A Français', preview: 'Rappel : dictée vendredi. Ahmed doit réviser le chapitre 8.',    time: '08:30', unread: 0, avatarColor: '#a78bfa', initial: 'S' },
  { id: 3, name: 'Direction École',   role: 'Administration',             preview: 'Réunion parents–enseignants : 5 juin de 16h à 18h.',              time: 'Hier',  unread: 1, avatarColor: '#34d399', initial: 'D' },
];

function getThreads(role: string | undefined, isKG: boolean): Thread[] {
  if (role === 'PARENT')       return THREADS_PARENT;
  if (role === 'TEACHER')      return THREADS_TEACHER;
  if (role === 'SCHOOL_ADMIN') return THREADS_ADMIN;
  if (isKG)                    return THREADS_PARENT;
  return THREADS_ADMIN;
}

/* ── Component ─────────────────────────────────────────────────── */

export default function MessagesScreen() {
  const user   = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  const isKG        = tenant?.type === 'KINDERGARTEN';
  const threads     = getThreads(user?.role, isKG);
  const totalUnread = threads.reduce((acc, t) => acc + t.unread, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* Header */}
      <View style={{ padding: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink[900] }}>
            Messages
          </Text>
          {totalUnread > 0 && (
            <View style={{ backgroundColor: '#fbb13c', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: '#0f1419', fontSize: 11, fontWeight: '700' }}>
                {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 2 }}>
          {threads.length} conversation{threads.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Thread list */}
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        {threads.map((thread) => (
          <TouchableOpacity
            key={thread.id}
            activeOpacity={0.7}
            style={{
              backgroundColor: colors.white,
              borderRadius: radius.lg,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: thread.unread > 0 ? 'rgba(251,177,60,0.25)' : colors.paper[100],
            }}
          >
            {/* Avatar */}
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: thread.avatarColor + '1a',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              borderWidth: 1.5, borderColor: thread.avatarColor + '40',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: thread.avatarColor }}>
                {thread.initial}
              </Text>
            </View>

            {/* Content */}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: thread.unread > 0 ? '700' : '600', color: colors.ink[900], flex: 1, marginRight: 8 }}
                  numberOfLines={1}
                >
                  {thread.name}
                </Text>
                <Text style={{ fontSize: 11, color: colors.ink[300], flexShrink: 0 }}>{thread.time}</Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.ink[500], marginBottom: 3 }}>{thread.role}</Text>
              <Text
                style={{ fontSize: 12, color: thread.unread > 0 ? colors.ink[700] : colors.ink[300] }}
                numberOfLines={1}
              >
                {thread.preview}
              </Text>
            </View>

            {/* Unread badge */}
            {thread.unread > 0 && (
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fbb13c', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#0f1419' }}>{thread.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Coming soon */}
      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <View style={{ backgroundColor: 'rgba(251,177,60,0.07)', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: 'rgba(251,177,60,0.16)' }}>
          <Text style={{ fontSize: 12, color: colors.ink[500], textAlign: 'center' }}>
            ✉️ Composition et envoi de messages disponibles prochainement
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
