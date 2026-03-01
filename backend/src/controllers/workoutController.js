import Workout from '../models/Workout.js';

export async function getWorkouts(req, res) {
  try {
    const workouts = await Workout.find().sort({ createdAt: -1 });
    res.status(200).json(workouts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch workouts' });
  }
}

export async function createWorkout(req, res) {
  try {
    const { title, durationMinutes } = req.body;
    const workout = await Workout.create({ title, durationMinutes });
    res.status(201).json(workout);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to create workout' });
  }
}
