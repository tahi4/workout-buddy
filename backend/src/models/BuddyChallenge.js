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
  proof: {
    fileId: { type: String, default: null },
    filename: { type: String, default: null },
    contentType: { type: String, default: null },
    size: { type: Number, default: null },
    bucket: { type: String, default: null },
    submittedAt: { type: Date, default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verificationNote: { type: String, default: null },
  },
});

const BuddyChallenge = mongoose.model('BuddyChallenge', buddyChallengeSchema, 'challenges');

export default BuddyChallenge;