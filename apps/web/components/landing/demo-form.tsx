'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  demoRequestSchema,
  type DemoRequestFormValues,
} from '@/lib/validation/demo-request.schemas';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export function DemoForm() {
  const t = useTranslations('landing.demoForm');
  const locale = useLocale() as 'fr' | 'ar';
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>(
    'idle',
  );
  const [errorKey, setErrorKey] = useState<
    'validation' | 'turnstile' | 'rateLimit' | 'network' | 'generic'
  >('generic');
  const [requestId, setRequestId] = useState<string | null>(null);

  const form = useForm<DemoRequestFormValues>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: { locale, turnstileToken: '', studentsCount: '50-200' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitState('submitting');
    try {
      const res = await fetch('/api/public/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.status === 429) {
        setErrorKey('rateLimit');
        setSubmitState('error');
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        // NestJS wraps BadRequestException(object) inside { message: { code, ... } }
        const msg = body?.message as Record<string, unknown> | undefined;
        const code = msg?.code ?? body?.code;
        setErrorKey(code === 'TURNSTILE_FAILED' ? 'turnstile' : 'generic');
        setSubmitState('error');
        turnstileRef.current?.reset();
        return;
      }
      const successBody = (await res.json().catch(() => ({}))) as { requestId?: string };
      setRequestId(successBody?.requestId ?? null);
      setSubmitState('success');
      form.reset({ locale, turnstileToken: '', studentsCount: '50-200' });
    } catch {
      setErrorKey('network');
      setSubmitState('error');
      turnstileRef.current?.reset();
    }
  });

  if (submitState === 'success') {
    return (
      <section id="demo-form" className="bg-paper py-20 sm:py-24">
        <div className="container mx-auto max-w-md px-4 text-center">
          <svg
            aria-hidden
            viewBox="0 0 80 80"
            className="mx-auto h-20 w-20 text-terracotta"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M10 24 L 40 44 L 70 24" />
            <path d="M10 24 V 60 H 70 V 24" />
            <path d="M10 60 L 40 40 L 70 60" />
            <path d="M52 8 V 24 M 44 14 H 60" strokeLinecap="round" />
          </svg>
          <h2 className="mt-6 font-display text-3xl font-semibold text-ink">{t('success.title')}</h2>
          <p className="mt-4 leading-relaxed text-ink-muted">{t('success.description')}</p>
          {requestId && (
            <p className="mt-6 font-mono text-xs uppercase tracking-wider text-ink-faded">
              ID : <span className="text-ink">{requestId}</span>
            </p>
          )}
        </div>
      </section>
    );
  }

  const fieldError = (name: keyof DemoRequestFormValues) =>
    form.formState.errors[name]?.message?.toString();

  return (
    <section id="demo-form" className="bg-paper py-20 sm:py-24">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-ink-muted">{t('subtitle')}</p>
        </div>

        <form onSubmit={onSubmit} className="mt-10 space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="text-sm font-medium">
                {t('fields.firstName')} *
              </label>
              <input
                id="firstName"
                {...form.register('firstName')}
                className="mt-1 h-11 w-full rounded-md border px-3"
                autoComplete="given-name"
              />
              {fieldError('firstName') && (
                <p className="mt-1 text-xs text-rose-600" role="alert">
                  {fieldError('firstName')}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="text-sm font-medium">
                {t('fields.lastName')} *
              </label>
              <input
                id="lastName"
                {...form.register('lastName')}
                className="mt-1 h-11 w-full rounded-md border px-3"
                autoComplete="family-name"
              />
              {fieldError('lastName') && (
                <p className="mt-1 text-xs text-rose-600" role="alert">
                  {fieldError('lastName')}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium">
              {t('fields.email')} *
            </label>
            <input
              id="email"
              type="email"
              {...form.register('email')}
              className="mt-1 h-11 w-full rounded-md border px-3"
              autoComplete="email"
            />
            {fieldError('email') && (
              <p className="mt-1 text-xs text-rose-600" role="alert">
                {fieldError('email')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium">
              {t('fields.phone')}
            </label>
            <input
              id="phone"
              {...form.register('phone')}
              className="mt-1 h-11 w-full rounded-md border px-3"
              autoComplete="tel"
            />
            {fieldError('phone') && (
              <p className="mt-1 text-xs text-rose-600" role="alert">
                {fieldError('phone')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="schoolName" className="text-sm font-medium">
              {t('fields.schoolName')} *
            </label>
            <input
              id="schoolName"
              {...form.register('schoolName')}
              className="mt-1 h-11 w-full rounded-md border px-3"
              autoComplete="organization"
            />
            {fieldError('schoolName') && (
              <p className="mt-1 text-xs text-rose-600" role="alert">
                {fieldError('schoolName')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="studentsCount" className="text-sm font-medium">
              {t('fields.studentsCount')} *
            </label>
            <select
              id="studentsCount"
              {...form.register('studentsCount')}
              className="bg-background mt-1 h-11 w-full rounded-md border px-3"
            >
              <option value="<50">{t('studentsCountOptions.lt50')}</option>
              <option value="50-200">{t('studentsCountOptions.50to200')}</option>
              <option value="200-500">{t('studentsCountOptions.200to500')}</option>
              <option value="500+">{t('studentsCountOptions.gt500')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="text-sm font-medium">
              {t('fields.message')}
            </label>
            <textarea
              id="message"
              rows={4}
              {...form.register('message')}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>

          {TURNSTILE_SITE_KEY && (
            <div>
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                options={{ size: 'invisible' }}
                onSuccess={(token) =>
                  form.setValue('turnstileToken', token, { shouldValidate: true })
                }
                onError={() => form.setValue('turnstileToken', '', { shouldValidate: true })}
                onExpire={() => form.setValue('turnstileToken', '', { shouldValidate: true })}
              />
              {fieldError('turnstileToken') && (
                <p className="text-xs text-rose-600" role="alert">
                  {t('errors.turnstile')}
                </p>
              )}
            </div>
          )}

          {submitState === 'error' && (
            <p className="text-sm text-rose-600" role="alert">
              {t(`errors.${errorKey}`)}
            </p>
          )}

          <button
            type="submit"
            disabled={submitState === 'submitting'}
            className="h-12 w-full rounded-md bg-terracotta text-base font-medium text-paper transition hover:bg-terracotta-dark disabled:opacity-50"
          >
            {submitState === 'submitting' ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </section>
  );
}
