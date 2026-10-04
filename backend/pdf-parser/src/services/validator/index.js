'use strict';

/**
 * src/services/validator/index.js
 * Entry point for the Unity / Database Checking Module.
 * Conforms to Interface Contract #3 and Requirements §R3, §R4.
 */

const {
  verifyUnity,
  evaluateCandidateEligibility,
  formatUnityReport,
  printUnityReport
} = require('./unity-checker');

const rules = require('./rules');

module.exports = {
  verifyUnity,
  evaluateCandidateEligibility,
  formatUnityReport,
  printUnityReport,
  rules
};
