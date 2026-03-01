import mongoose from 'mongoose';

const buddyChallengeSchema = new mongoose.Schema({
  buddyPairId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuddyPair', required: true },
  challenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workoutType: { type: String, required: true, trim: true },
  points: { type: Number, required: true, min: 1 },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  deadline: { type: Date, required: true },
  proof: { type: mongoose.Schema.Types.Mixed, default: null },
});

const BuddyChallenge = mongoose.model('BuddyChallenge', buddyChallengeSchema, 'challenges');

export default BuddyChallenge;