import express from 'express';
import {
  getUsers,
  fetchPairingCode,
  buddyUp,
  getWeeklyWorkoutRoutine,
  getAllowedStakes,
  createWeeklyBet,
} from '../controllers/userController.js';

const router = express.Router();

router.get('/users', getUsers);
router.get('/weekly-bets/allowed-stakes', getAllowedStakes);
/**
 * router.get('/weekly tracer')
 * router.put('/weekly challenges)
 * router.put('/weekly bets)
 * router.put('/evidence)
 */

router.get('/:id/pairing-code', fetchPairingCode);
router.put('/:id/buddy/:pairingCode', buddyUp);
router.get('/:id/weekly-workout-routine', getWeeklyWorkoutRoutine);
router.post('/:id/weekly-bets', createWeeklyBet);

export default router;