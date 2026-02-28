import express from 'express';
import workoutRoutes from './workoutRoutes.js';


const router = express.Router();

router.use('/workouts', workoutRoutes);

export default router;