const PRICING_PLANS = [
  {
    id: 'basic',
    name: 'Basic Unlock',
    price: 99,
    currency: 'INR',
    recommended: false,
    features: ['Future summary', 'Career direction', '3 key insights']
  },
  {
    id: 'full',
    name: 'Full Analysis',
    price: 299,
    currency: 'INR',
    recommended: true,
    features: ['Full future report', 'Career + money + relationships', 'Detailed patterns', 'Core remedy suggestions']
  },
  {
    id: 'premium',
    name: 'Premium Guidance',
    price: 999,
    currency: 'INR',
    recommended: false,
    features: [
      'Everything in Full Analysis',
      'Deep psychological breakdown',
      'Personalized remedies',
      'Daily alignment plan',
      'Priority insights'
    ]
  }
];

const UNLOCK_MODULES = [
  {
    title: 'Future Life Direction',
    description: 'Understand where your life is heading and how clarity unfolds.'
  },
  {
    title: 'Earnings & Career Potential',
    description: 'Discover your natural success pattern, income growth style, and career alignment.'
  },
  {
    title: 'Relationship & Emotional Pattern',
    description: 'Learn how you connect, attach, and build long-term relationships.'
  },
  {
    title: 'Health & Energy Tendencies',
    description: 'Identify areas where your body and mind require attention and balance.'
  },
  {
    title: 'Personalized Remedies',
    description: 'Get specific mantras, behaviors, and actions to align your life path.'
  }
];

function buildPaywallPreview(alignmentScore = null) {
  const hasStrongAlignment = Number.isFinite(alignmentScore) && alignmentScore >= 67;

  return {
    headline: 'Your Chart Is Calculated. Your Future Is Not Yet Revealed.',
    subtext: hasStrongAlignment
      ? 'You have already seen strong alignment with your past patterns. Your future follows the same planetary structure, but requires deeper decoding.'
      : 'You have seen the first layer of your chart. Your future follows the same planetary structure, but requires deeper decoding.',
    features: UNLOCK_MODULES,
    plans: PRICING_PLANS.map((plan) => ({
      ...plan,
      price: `₹${plan.price}`,
      includes: plan.features
    })),
    cta: 'Unlock My Full Analysis',
    trustLine: 'One-time payment. No subscription. Instant access.',
    paymentEnabled: false
  };
}

module.exports = {
  buildPaywallPreview
};
