import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  profile: {
    age: Number,
    weight: Number,
    height: Number,
    fitnessLevel: String,
    equipment: [String],
    dietaryPreferences: [String]
  },
  goals: {
    calorieGoal: Number,
    stepGoal: Number,
    targetWeight: Number
  },
  performanceTier: {
    currentTier: String,
    points: Number
  },
  streak: {
    current: Number,
    lastWorkoutDate: Date
  },
  buddies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  habits: [{ name: String, completedDates: [Date] }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema, 'user');

export default User;