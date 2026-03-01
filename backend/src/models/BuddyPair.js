import mongoose from 'mongoose';

const buddyPairSchema = new mongoose.Schema({
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: 'active' },
  combinedStreak: {
    current: { type: Number, default: 0 },
    lastWorkoutDate: { type: Date, default: null },
  },
  totalWorkoutsCompleted: { type: Number, default: 0 },
});

const BuddyPair = mongoose.model('BuddyPair', buddyPairSchema, 'buddyPair');

export default BuddyPair;