import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const loadingSteps = [
  'Mapping planetary positions...',
  'Reading house placements...',
  'Decoding life patterns...'
];

function LoadingSequence({ isLoading }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setActiveStep(0);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveStep((step) => (step + 1) % loadingSteps.length);
    }, 950);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="glass-panel max-w-sm px-8 py-10 text-center">
            <motion.div
              className="mx-auto mb-6 h-20 w-20 rounded-full border border-gold-300/30"
              animate={{
                boxShadow: [
                  '0 0 14px rgba(247, 202, 107, 0.18)',
                  '0 0 42px rgba(247, 202, 107, 0.5)',
                  '0 0 14px rgba(247, 202, 107, 0.18)'
                ],
                rotate: 360
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
            <motion.p
              key={activeStep}
              className="text-lg font-semibold text-gold-100"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {loadingSteps[activeStep]}
            </motion.p>
            <p className="mt-3 text-sm text-white/55">Swiss Ephemeris calculation in progress</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LoadingSequence;
