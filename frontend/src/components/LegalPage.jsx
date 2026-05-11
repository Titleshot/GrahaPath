import { motion } from 'framer-motion';
import { useEffect } from 'react';

const LAST_UPDATED = 'May 11, 2026';
const CONTACT_EMAIL = 'radheradhe742@proton.me';

const DOCS = {
  terms: {
    title: 'Terms & Conditions',
    sections: [
      {
        heading: 'Acceptance of Terms',
        body:
          'By using GrahaPath, you agree to these Terms & Conditions. If you do not agree, please discontinue use of the service.'
      },
      {
        heading: 'Service Description',
        body:
          'GrahaPath provides AI-powered astrology features including birth chart calculations, interpretation, timing guidance, and conversational insights.'
      },
      {
        heading: 'Access Rules',
        body:
          'You must provide accurate details for chart generation. You are responsible for your use of the platform and for maintaining appropriate use of your account/session access.'
      },
      {
        heading: 'Free and Paid Access',
        body:
          'GrahaPath offers a free demo experience and paid premium access. Paid plans may include expanded analysis and up to 50 Premium AI Insights.'
      },
      {
        heading: 'Payments and Digital Product Nature',
        body:
          'Payments are processed through Ko-fi. GrahaPath does not directly process card details. Digital access is provided after successful payment flow.'
      },
      {
        heading: 'Refunds',
        body:
          `Refund requests can be made within 7 days of purchase by contacting ${CONTACT_EMAIL}. Digital access that has already been substantially used may not be eligible for a full refund.`
      },
      {
        heading: 'No Guaranteed Outcomes',
        body:
          'Astrology and AI outputs are interpretive guidance. GrahaPath does not guarantee exact life outcomes, dates, or events.'
      },
      {
        heading: 'Prohibited Misuse',
        body:
          'You may not abuse, reverse engineer, overload, scrape, or attempt to misuse the service for unlawful or harmful purposes.'
      },
      {
        heading: 'Age Requirement',
        body: 'GrahaPath is not intended for children under 13 years of age.'
      },
      {
        heading: 'Limitation of Liability',
        body:
          'To the fullest extent permitted by law, GrahaPath is provided as-is and we are not liable for indirect or consequential losses arising from use of the service.'
      },
      {
        heading: 'Changes to Service',
        body:
          'We may update features, pricing, limits, or policies. Continued use after updates indicates acceptance of revised terms.'
      },
      {
        heading: 'Contact',
        body: `For legal or support queries, contact: ${CONTACT_EMAIL}.`
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'Data We Collect',
        body:
          'Depending on usage, GrahaPath may collect email address, chart nickname, birth chart inputs (date, time, place/location), premium plan status, purchase timestamp, and remaining insight balance.'
      },
      {
        heading: 'Why We Collect Data',
        body:
          'Data is used for chart calculation, personalized responses, premium access restore by email, support, security, and abuse prevention.'
      },
      {
        heading: 'Payments',
        body:
          'Payment processing is handled by Ko-fi. GrahaPath does not store full payment card details directly.'
      },
      {
        heading: 'AI Processing Disclosure',
        body:
          'Chat prompts and relevant chart context may be sent to configured AI providers to generate responses and guidance.'
      },
      {
        heading: 'Cookies and Local Storage',
        body:
          'GrahaPath may use local storage/cookies for session continuity and user experience, but premium ownership is stored server-side against your email for restore access across devices.'
      },
      {
        heading: 'Retention',
        body:
          'We retain your data for as long as your account is active or as needed to provide the service. You may request deletion at any time by contacting us.'
      },
      {
        heading: 'User Rights',
        body:
          'You may request data correction, deletion, or export where applicable by contacting our support/legal channel.'
      },
      {
        heading: 'Children Privacy',
        body: 'GrahaPath is not intended for users under 13 years of age.'
      },
      {
        heading: 'Third-Party Services',
        body:
          'GrahaPath may rely on third-party providers such as Ko-fi, AI providers, analytics/hosting providers, and related infrastructure services.'
      },
      {
        heading: 'Security',
        body:
          'We implement reasonable safeguards, but no internet-based system can guarantee absolute security.'
      },
      {
        heading: 'Contact',
        body: `For privacy requests, contact: ${CONTACT_EMAIL}.`
      }
    ]
  },
  disclaimer: {
    title: 'Disclaimer',
    sections: [
      {
        heading: 'Purpose of Content',
        body:
          'GrahaPath astrology and AI responses are provided for reflection, self-understanding, and entertainment/spiritual exploration.'
      },
      {
        heading: 'Not Professional Advice',
        body:
          'Content is not medical, legal, financial, psychological, or other licensed professional advice.'
      },
      {
        heading: 'No Guaranteed Predictions',
        body:
          'GrahaPath does not guarantee exact outcomes for marriage, career, wealth, health, or life events.'
      },
      {
        heading: 'User Responsibility',
        body: 'Users are responsible for their own decisions and actions.'
      },
      {
        heading: 'Remedies and Mantras',
        body:
          'Remedies/mantras are spiritual suggestions and are not guaranteed interventions or outcomes.'
      },
      {
        heading: 'Health and Crisis Notice',
        body:
          'Health-related responses are not diagnosis. In emergencies or crisis situations, seek immediate qualified professional help.'
      },
      {
        heading: 'Finance and Career Notice',
        body:
          'Career and financial responses are informational only and do not constitute financial advice or investment recommendations.'
      },
      {
        heading: 'AI Limitations',
        body:
          'AI-generated interpretations may contain errors. Always apply discretion and verify critical details.'
      },
      {
        heading: 'Panchanga and Ritual Verification',
        body:
          'For ritual-critical timing, verify Panchanga/date/transit details against trusted deterministic references before use.'
      },
      {
        heading: 'Use at Your Discretion',
        body: 'By using GrahaPath, you acknowledge use at your own discretion and risk.'
      }
    ]
  }
};

function FooterLinks({ showBackButton = true, onBack, onNavigate }) {
  if (!showBackButton) {
    return null;
  }

  const handleBackClick = (e) => {
    e.preventDefault();
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    if (window.history.length > 1) window.history.back();
    else window.location.assign('/');
  };

  return (
    <div className="mt-8 border-t border-gold/20 pt-4 text-xs text-ivory/60">
      <div className="mb-4">
        <button
          onClick={handleBackClick}
          className="inline-flex items-center rounded-lg border border-gold/30 bg-black/35 px-3 py-1.5 text-xs text-gold transition hover:border-gold/60 hover:bg-black/55"
        >
          ← Back
        </button>
      </div>
      <a
        className="hover:text-gold"
        href="/terms"
        onClick={(e) => {
          if (typeof onNavigate === 'function') {
            e.preventDefault();
            onNavigate('/terms');
          }
        }}
      >
        Terms
      </a>
      <span className="mx-2">·</span>
      <a
        className="hover:text-gold"
        href="/privacy"
        onClick={(e) => {
          if (typeof onNavigate === 'function') {
            e.preventDefault();
            onNavigate('/privacy');
          }
        }}
      >
        Privacy
      </a>
      <span className="mx-2">·</span>
      <a
        className="hover:text-gold"
        href="/disclaimer"
        onClick={(e) => {
          if (typeof onNavigate === 'function') {
            e.preventDefault();
            onNavigate('/disclaimer');
          }
        }}
      >
        Disclaimer
      </a>
    </div>
  );
}

export default function LegalPage({ type = 'terms', onBack, onNavigate }) {
  const doc = DOCS[type] || DOCS.terms;
  const isEmbedded =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embedded') === '1';

  const handleBackClick = (e) => {
    e.preventDefault();
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    if (window.history.length > 1) window.history.back();
    else window.location.assign('/');
  };

  return (
    <main className="min-h-screen bg-void px-5 py-8 text-ivory sm:px-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-gold/20 bg-black/40 p-6 sm:p-8">
        {!isEmbedded ? (
          <button
            onClick={handleBackClick}
            className="inline-flex items-center rounded-lg border border-gold/30 bg-black/35 px-3 py-1.5 text-xs text-gold transition hover:border-gold/60 hover:bg-black/55"
          >
            ← Back
          </button>
        ) : null}
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-serif text-3xl text-gold">
          {doc.title}
        </motion.h1>
        <p className="mt-2 text-sm text-ivory/65">Last updated: {LAST_UPDATED}</p>
        <div className="mt-6 space-y-5">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-200">{section.heading}</h2>
              <p className="mt-2 text-sm leading-7 text-ivory/80">{section.body}</p>
            </section>
          ))}
        </div>
        <FooterLinks showBackButton={!isEmbedded} onBack={onBack} onNavigate={onNavigate} />
      </div>
    </main>
  );
}
