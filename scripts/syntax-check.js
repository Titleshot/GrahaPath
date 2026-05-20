/**
 * Runs `node --check` on backend entrypoints without shell `&&` chains
 * (avoids "The system cannot find the path specified" on some Windows/npm setups).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  'server.js',
  'controllers/chartController.js',
  'routes/chartRoutes.js',
  'services/dateConversionService.js',
  'services/geocodeService.js',
  'services/timezoneService.js',
  'services/astrologyService.js',
  'services/interpretationService.js',
  'services/lifePhaseService.js',
  'services/paywallService.js',
  'services/predictionQualityService.js',
  'services/remedyMappingService.js',
  'services/timeRectificationService.js',
  'services/feedbackService.js',
  'services/remedyService.js',
  'services/astroBrain/constants.js',
  'services/astroBrain/grahaAnalysisEngine.js',
  'services/astroBrain/housePolicyMatrix.js',
  'services/astroBrain/shadbalaEngine.js',
  'services/astroBrain/panchangaEngine.js',
  'services/astroBrain/ashtakavargaEngine.js',
  'services/astroBrain/charaKarakaEngine.js',
  'services/astroBrain/planetStateEngine.js',
  'services/astroBrain/argalaEngine.js',
  'services/astroBrain/strengthScoringEngine.js',
  'services/astroBrain/hyperAccuracyRefinement.js',
  'services/astroBrain/houseLordEngine.js',
  'services/astroBrain/yogaDetectionEngine.js',
  'services/astroBrain/aspectEngine.js',
  'services/astroBrain/drishtiEngine.js',
  'services/astroBrain/divisionalChartEngine.js',
  'services/astroBrain/transitWindowEngine.js',
  'services/astroBrain/conflictArbitrationEngine.js',
  'services/astroBrain/evidenceWeighting.js',
  'services/astroBrain/interactionPatternEngine.js',
  'services/astroBrain/dashaEngine.js',
  'services/astroBrain/patternSynthesisEngine.js',
  'services/astroBrain/timeCalibrationEngine.js',
  'services/astroBrain/causalInsightEngine.js',
  'services/astroBrain/futureDomainEngine.js',
  'services/astroBrain/claimGuardrailEngine.js',
  'services/astroBrain/impactScoringEngine.js',
  'services/astroBrain/houseNetForceEngine.js',
  'services/astroBrain/astroBrainService.js',
  'controllers/feedbackController.js',
  'routes/feedbackRoutes.js',
  'scripts/nightly-regression.js',
  'scripts/ashtakavarga-regression.js',
  'scripts/feedback-weekly-summary.js',
  'scripts/feedback-tuning-recommendations.js',
  'scripts/validate-brain-numeric.js',
  'services/grahapathGeminiService.js',
  'services/geminiContextBuilder.js',
  'services/dailyGrahaWeatherService.js',
  'services/chat/intentDetector.js',
  'services/chat/responseStyleRules.js',
  'services/chat/contextBuilder.js',
  'services/chat/chatOrchestrator.js',
  'controllers/chatController.js',
  'controllers/chatV2Controller.js',
  'routes/chatRoutes.js',
  'services/grahapathChat/intentDetector.js',
  'services/grahapathChat/contextBuilder.js',
  'services/grahapathChat/promptBuilder.js',
  'services/grahapathChat/responseFormatter.js',
  'services/grahapathChat/chatService.js',
  'services/dasha/dashaCalculator.js',
  'services/dasha/ageTimingService.js'
];

for (const relative of files) {
  const target = path.join(root, relative);
  const result = spawnSync(process.execPath, ['--check', target], {
    stdio: 'inherit',
    cwd: root
  });

  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
  }
}
