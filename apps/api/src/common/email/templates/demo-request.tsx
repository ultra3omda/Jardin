import { Hr, Section, Text } from '@react-email/components';
import * as React from 'react';

import type { DemoRequestDto } from '../../../demo-requests/dto/demo-request.dto';
import { EmailLayout, bodyTextStyle } from './layout';

interface Props extends DemoRequestDto {
  requestId: string;
}

const labels = {
  fr: {
    intro: 'Nouvelle demande de démo sur Klasso',
    name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    school: 'École',
    students: "Nombre d'élèves",
    message: 'Message',
    id: 'ID de demande',
  },
  ar: {
    intro: 'طلب عرض توضيحي جديد على كلاسو',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    school: 'المؤسسة',
    students: 'عدد الطلاب',
    message: 'رسالة',
    id: 'معرف الطلب',
  },
} as const;

export function DemoRequestEmail(props: Props): React.ReactElement {
  const l = labels[props.locale] ?? labels.fr;

  return (
    <EmailLayout preview={`${l.intro} — ${props.schoolName}`}>
      <Text style={{ ...bodyTextStyle, fontWeight: 600, fontSize: '18px' }}>{l.intro}</Text>
      <Text style={{ ...bodyTextStyle, color: '#64748b', fontSize: '12px' }}>
        {l.id}: <code>{props.requestId}</code>
      </Text>
      <Hr style={{ borderColor: '#e2e8f0', margin: '16px 0' }} />
      <Section>
        <Field label={l.name} value={`${props.firstName} ${props.lastName}`} />
        <Field label={l.email} value={props.email} />
        {props.phone ? <Field label={l.phone} value={props.phone} /> : null}
        <Field label={l.school} value={props.schoolName} />
        <Field label={l.students} value={props.studentsCount} />
        {props.message ? <Field label={l.message} value={props.message} multiline /> : null}
      </Section>
    </EmailLayout>
  );
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <Text
        style={{
          color: '#64748b',
          fontSize: '11px',
          fontWeight: 600,
          margin: '0 0 2px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: '#0F172A',
          fontSize: '14px',
          margin: 0,
          whiteSpace: multiline ? 'pre-wrap' : 'normal',
        }}
      >
        {value}
      </Text>
    </div>
  );
}

export function demoRequestSubject(locale: 'fr' | 'ar', schoolName: string): string {
  return locale === 'ar'
    ? `[كلاسو] طلب عرض توضيحي جديد — ${schoolName}`
    : `[Klasso] Nouvelle demande de démo — ${schoolName}`;
}
