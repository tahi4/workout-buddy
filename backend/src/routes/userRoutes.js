import express from 'express';
import {
  getUsers,
} from '../controllers/userController.js';

const router = express.Router();

router.get('/users', getUsers);
/**
 * router.get('/pairing buddies')
 * router.get('/pairing links')
 * router.put('/add friends')
 * router.get('/weekly tracer')
 * router.put('/weekly challenges)
 * router.put('/weekly bets)
 * router.put('/evidence)
 */
export default router;