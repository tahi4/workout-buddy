import express from 'express';
import {
  getUsers,
  fetchPairingCode,
  buddyUp,
  getWeeklyWorkoutRoutine,
  getUserHistory,
  getChallengePhotos,
  getCurrentStakes,
  getAllowedStakes,
  createWeeklyBet,
  createBuddyChallenge,
  getChallengeProof,
  submitChallengeProof,
  resolveBuddyChallenge,
} from '../controllers/userController.js';
import proofUpload from '../middleware/proofUpload.js';

const router = express.Router();

router.get('/users', getUsers);
router.get('/weekly-bets/allowed-stakes', getAllowedStakes);
/**
 * router.put('/weekly challenges)
 * router.put('/evidence)
 */

router.get('/:id/pairing-code', fetchPairingCode);
router.put('/:id/buddy/:pairingCode', buddyUp);
router.get('/:id/weekly-workout-routine', getWeeklyWorkoutRoutine);
router.get('/:id/history', getUserHistory);
router.get('/:id/challenge-photos', getChallengePhotos);
router.get('/:id/current-stakes', getCurrentStakes);
router.post('/:id/weekly-bets', createWeeklyBet);
router.post('/:id/challenges', createBuddyChallenge);
router.get('/:id/challenges/:challengeId/proof', getChallengeProof);
router.post('/:id/challenges/:challengeId/proof', proofUpload.single('proof'), submitChallengeProof);
router.put('/:id/challenges/:challengeId/resolve', resolveBuddyChallenge);

export default router;