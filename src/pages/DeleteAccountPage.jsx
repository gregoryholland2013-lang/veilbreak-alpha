import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  Trash2,
} from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const normalizedEmail = useMemo(
    () => email.trim().toLowerCase(),
    [email]
  );

  const canSubmit =
    isValidEmail(normalizedEmail) &&
    confirmText.trim().toUpperCase() === 'DELETE' &&
    !submitting;

  const submitDeletionRequest = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('Please enter a valid account email address.');
      return;
    }

    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setErrorMessage('Type DELETE to confirm your request.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: null,
          email: normalizedEmail,
          display_name: displayName.trim() || null,
          reason: reason.trim() || null,
          source: 'public_web',
          status: 'pending',
        });

      if (error) {
        throw error;
      }

      setSubmitted(true);
      setEmail('');
      setDisplayName('');
      setReason('');
      setConfirmText('');
    } catch (error) {
      console.error(error);

      if (error?.code === '23505') {
        setErrorMessage(
          'A pending deletion request already exists for this email.'
        );
      } else {
        setErrorMessage(
          error.message || 'Could not submit your deletion request.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <p className="font-display text-3xl font-black text-primary">
            Veilbreak
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Account and Data Deletion Request
          </p>
        </div>

        <section className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-2xl">
          <div className="border-b border-border p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-400/40 bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-300" />
              </div>

              <div>
                <h1 className="font-display text-xl font-black text-primary">
                  Request Account Deletion
                </h1>

                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Use this form to request deletion of your Veilbreak account
                  and associated gameplay data.
                </p>
              </div>
            </div>
          </div>

          {submitted ? (
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />

                  <div>
                    <p className="font-bold text-emerald-200">
                      Request submitted
                    </p>

                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Your account deletion request has been received. We will
                      review the request and process deletion of the matching
                      Veilbreak account and associated game data.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setSubmitted(false)}
                className="w-full"
              >
                Submit Another Request
              </Button>
            </div>
          ) : (
            <form onSubmit={submitDeletionRequest} className="space-y-5 p-5">
              <div className="rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />

                  <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                    <p>
                      Deleting your account will remove your Veilbreak account
                      access and associated game progress, including profile
                      data, cards, inventory, quest progress, event progress,
                      and account-linked gameplay data.
                    </p>

                    <p>
                      Some records may be retained only when required for
                      security, fraud prevention, payment verification, legal,
                      or operational reasons.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">
                  Account email address
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    disabled={submitting}
                    required
                    className="w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-3 text-sm outline-none focus:border-primary/60"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Use the email address connected to your Veilbreak account.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">
                  Display name, optional
                </label>

                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your in-game name"
                  disabled={submitting}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-3 text-sm outline-none focus:border-primary/60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">
                  Reason, optional
                </label>

                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Tell us why you are deleting your account..."
                  disabled={submitting}
                  className="min-h-[110px] w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-3 text-sm outline-none focus:border-primary/60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">
                  Type DELETE to confirm
                </label>

                <input
                  type="text"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder="DELETE"
                  disabled={submitting}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-3 text-sm outline-none focus:border-red-400/70"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                disabled={!canSubmit}
                variant="destructive"
                className="w-full gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Submit Deletion Request
                  </>
                )}
              </Button>

              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                This form creates a deletion request. Account deletion is
                processed after the request is reviewed and matched to a
                Veilbreak account.
              </p>
            </form>
          )}
        </section>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm font-bold text-primary hover:underline"
          >
            Return to Veilbreak
          </Link>
        </div>
      </div>
    </main>
  );
}