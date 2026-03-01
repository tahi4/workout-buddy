import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  weeklyWorkoutGoal: { type: Number, required: true, min: 1 },
  stake: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, default: 'active' },
}, {
  timestamps: true,
});

const Challenge = mongoose.model('Challenge', challengeSchema, 'bets');

export default Challenge;