import express from 'express';
import {
  getUsers,
  fetchPairingCode,
  buddyUp,
  getWeeklyWorkoutRoutine,
  getAllowedStakes,
  createWeeklyBet,
  createBuddyChallenge,
  resolveBuddyChallenge,
} from '../controllers/userController.js';

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
router.post('/:id/weekly-bets', createWeeklyBet);
router.post('/:id/challenges', createBuddyChallenge);
router.put('/:id/challenges/:challengeId/resolve', resolveBuddyChallenge);

export default router;