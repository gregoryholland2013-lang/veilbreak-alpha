import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const effectiveDate = 'July 20, 2026';

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 text-center">
          <p className="font-display text-3xl font-black text-primary">
            Veilbreak
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Privacy Policy
          </p>
        </div>

        <section className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-2xl">
          <div className="border-b border-border p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>

              <div>
                <h1 className="font-display text-xl font-black text-primary">
                  Privacy Policy
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  Effective Date: {effectiveDate}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-2">
              <h2 className="font-display text-lg font-black text-foreground">
                1. Overview
              </h2>

              <p>
                This Privacy Policy explains how Veilbreak: Into the Singularity
                collects, uses, stores, and protects information when you use
                the Veilbreak game, website, and related services.
              </p>

              <p>
                By using Veilbreak, you agree to the collection and use of
                information described in this Privacy Policy.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-black text-foreground">
                2. Information We Collect
              </h2>

              <p>
                Veilbreak may collect the following types of information:
              </p>

              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="font-bold text-foreground">
                    Account information:
                  </span>{' '}
                  email address, user ID, display name, login/authentication
                  information, and account creation date.
                </li>

                <li>
                  <span className="font-bold text-foreground">
                    Game profile information:
                  </span>{' '}
                  faction choice, level, experience, gold, gems, stamina,
                  attack energy, defense energy, wins, losses, and other
                  account progression values.
                </li>

                <li>
                  <span className="font-bold text-foreground">
                    Gameplay information:
                  </span>{' '}
                  cards, deck data, inventory, quests, event progress, raid
                  progress, summon history, mailbox items, rewards, social
                  features, guild-related data, and other game activity.
                </li>

                <li>
                  <span className="font-bold text-foreground">
                    Support and deletion request information:
                  </span>{' '}
                  information you submit through support, account deletion, or
                  feedback forms, including email address, display name, reason
                  for request, and request status.
                </li>

                <li>
                  <span className="font-bold text-foreground">
                    Purchase and transaction records:
                  </span>{' '}
                  if purchases are available, Veilbreak may store limited
                  purchase fulfillment records such as purchased item, purchase
                  status, transaction reference, and reward delivery status.
                  Full payment details are processed by the relevant payment
                  provider and are not stored directly by Veilbreak.
                </li>

                <li>
                  <span className="font-bold text-foreground">
                    Technical information:
                  </span>{' '}
                  basic device, browser, app, diagnostic, and log information
                  may be processed to maintain security, troubleshoot issues,
                  prevent abuse, and improve the game.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-black text-foreground">
                3. How We Use Information
              </h2>

              <p>
                We use collected information to:
              </p>

              <ul className="list-disc space-y-2 pl-5">
                <li>Create and manage player accounts.</li>
                <li>Save game progress, collections, decks, rewards, and inventory.</li>
                <li>Operate quests, events, battles, social features, and other gameplay systems.</li>
                <li>Process account deletion requests and support requests.</li>
                <li>Prevent fraud, abuse, cheating, unauthorized access, and security issues.</li>
                <li>Debug errors, improve performance, and maintain the game.</li>
                <li>Comply with legal, platform, payment, and policy requirements.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-black text-foreground">
                4. How We Share Information
              </h2>

              <p>
                Veilbreak does not sell player personal information. We may
                share or process information with service providers that help us
                operate the game, including hosting, database, authentication,
                analytics, crash reporting, payment processing, and app store
                services.
              </p>

              <p>
                These services may include platforms such as Supabase, Vercel,
                Google Play, and payment providers where applicable. Information
                may also be disclosed if required to comply with law, enforce
                policies, protect users, investigate abuse, or secure the game.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-black text-foreground">
                5. Data Retention
              </h2>

              <p>
                We keep account and gameplay data for as long as needed to
                operate Veilbreak, provide game features, maintain account
                history, resolve disputes, prevent abuse, comply with legal or
                platform requirements, and support security.
              </p>

              <p>
                If you request account deletion, we will review and process the
                request. Some records may be retained only when necessary for
                security, fraud prevention, payment verification, legal,
                compliance, or operational reasons.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-black text-foreground">
                6. Account Deletion
              </h2>

              <p>
                You can request deletion of your Veilbreak account and
                associated gameplay data from inside the app by opening:
              </p>

              <div className="rounded-xl border border-border bg-background/50 p-3 text-foreground">
                Player Profile → Request Account Deletion
              </div>

              <p>
                You can also request account deletion from the public deletion
                request page:
              </p>

              <div className="rounded-xl border border-border bg-background/50 p-3">
                <Link
                  to="/delete-account"
                  className="font-bold text-primary hover:underline"
                >
                  Open Account Deletion Request Page
                </Link>
              </div>

              <p>
                Account deletion requests are reviewed and matched to the
                relevant Veilbreak account before deletion is completed.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-black text-foreground">
                7. Security
              </h2>

              <p>
                We use reasonable technical and organizational measures to help
                protect account and gameplay data. However, no method of
                transmission or storage is completely secure, and we cannot
                guarantee absolute security.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-black text-foreground">
                8. Children and Age Targeting
              </h2>

              <p>
                Veilbreak is intended for teen and adult players. It is not
                intended for children under 13. If we learn that information has
                been collected from a child under 13 without appropriate
                consent, we will take appropriate steps to delete that
                information.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-black text-foreground">
                9. Your Choices
              </h2>

              <p>
                You may stop using Veilbreak at any time. You may also request
                account deletion using the in-app deletion request feature or
                the public deletion request page.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-black text-foreground">
                10. Changes to This Privacy Policy
              </h2>

              <p>
                We may update this Privacy Policy as Veilbreak changes. If we
                make material changes, we will update the effective date above
                and may provide additional notice where appropriate.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-black text-foreground">
                11. Contact
              </h2>

              <p>
                For privacy questions, support, or account deletion requests,
                contact us at:
              </p>

              <div className="rounded-xl border border-yellow-400/25 bg-yellow-500/10 p-3 text-yellow-100">
                gregoryholland2013@gmail.com
              </div>
            </section>
          </div>
        </section>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
          <Link
            to="/"
            className="text-sm font-bold text-primary hover:underline"
          >
            Return to Veilbreak
          </Link>

          <span className="hidden text-muted-foreground sm:inline">•</span>

          <Link
            to="/delete-account"
            className="text-sm font-bold text-primary hover:underline"
          >
            Request Account Deletion
          </Link>
        </div>
      </div>
    </main>
  );
}