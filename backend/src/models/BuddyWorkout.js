import mongoose from 'mongoose';

const buddyWorkoutSchema = new mongoose.Schema({
  buddyPairId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BuddyPair',
    required: true,
    unique: true,
  },
  workouts: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  weeklyHistory: {
    type: [
      {
        date: { type: Date, required: true },
        workouts: { type: [mongoose.Schema.Types.Mixed], default: [] },
      },
    ],
    default: [],
  },
});

const BuddyWorkout = mongoose.model('BuddyWorkout', buddyWorkoutSchema, 'buddyWorkout');

export default BuddyWorkout;