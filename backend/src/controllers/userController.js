import Users from '../models/Users.js';
import BuddyPair from '../models/BuddyPair.js';
import BuddyWorkout from '../models/BuddyWorkout.js';
import Challenge from '../models/Challenge.js';
import mongoose from 'mongoose';

const ALLOWED_STAKES = [
  '1 Dinner',
  '$10',
  '1 Chore',
  'Romantic Favor 😉',
];

function safeSegment(source, start, length) {
  const value = (source || '').replace(/[^a-zA-Z0-9]/g, '');
  const segment = value.slice(start, start + length);

  if (segment.length === length) {
    return segment;
  }

  const fallback = `${value}${'X'.repeat(length)}`;
  return `${segment}${fallback.slice(0, length - segment.length)}`;
}

function safeTailSegment(source, length) {
  const value = (source || '').replace(/[^a-zA-Z0-9]/g, '');
  const segment = value.slice(-length);

  if (segment.length === length) {
    return segment;
  }

  return `${'X'.repeat(length - segment.length)}${segment}`;
}

function generatePairingCode(user) {
  const namePart = safeSegment(user.name, 0, 5);
  const userId = String(user._id);
  const userIdFirst = safeSegment(userId, 0, 5);
  const emailPart = safeSegment(user.email, 0, 7);
  const nameTail = safeTailSegment(user.name, 3);

  return `${namePart}${userIdFirst}${emailPart}${nameTail}`.toUpperCase();
}

export async function getUsers(req, res) {
  try {
    const users = await Users.find().sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
}


export async function fetchPairingCode(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await Users.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.pairingCode) {
      return res.status(200).json({ pairingCode: user.pairingCode });
    }

    user.pairingCode = generatePairingCode(user);
    await user.save();

    return res.status(200).json({ pairingCode: user.pairingCode });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get pairing code' });
  }
}


export async function buddyUp(req, res) {
  try {
    const { id, pairingCode } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const normalizedCode = pairingCode?.trim().toUpperCase();

    if (!normalizedCode) {
      return res.status(400).json({ message: 'Pairing code is required' });
    }

    const [user, buddyUser] = await Promise.all([
      Users.findById(id),
      Users.findOne({ pairingCode: normalizedCode }),
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!buddyUser) {
      return res.status(404).json({ message: 'Buddy not found for pairing code' });
    }

    if (String(user._id) === String(buddyUser._id)) {
      return res.status(400).json({ message: 'Cannot buddy up with yourself' });
    }

    const existingPair = await BuddyPair.findOne({
      members: { $all: [user._id, buddyUser._id], $size: 2 },
    });

    if (existingPair) {
      await BuddyWorkout.findOneAndUpdate(
        { buddyPairId: existingPair._id },
        {
          $setOnInsert: {
            workouts: [],
            weeklyHistory: [],
          },
        },
        { upsert: true, new: true }
      );

      return res.status(200).json(existingPair);
    }

    const buddyPair = await BuddyPair.create({
      members: [user._id, buddyUser._id],
      status: 'active',
      combinedStreak: {
        current: 0,
        lastWorkoutDate: null,
      },
      totalWorkoutsCompleted: 0,
    });

    await BuddyWorkout.create({
      buddyPairId: buddyPair._id,
      workouts: [],
      weeklyHistory: [],
    });

    return res.status(201).json(buddyPair);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to buddy up users' });
  }
}

export async function getWeeklyWorkoutRoutine(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await Users.findById(id).select('_id');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const buddyPairs = await BuddyPair.find({
      members: user._id,
      status: 'active',
    }).select('_id members status createdAt');

    if (buddyPairs.length === 0) {
      return res.status(200).json({ userId: id, routine: [] });
    }

    const buddyPairIds = buddyPairs.map((pair) => pair._id);
    const workoutDocs = await BuddyWorkout.find({
      buddyPairId: { $in: buddyPairIds },
    }).select('buddyPairId workouts weeklyHistory');

    const workoutByPairId = new Map(
      workoutDocs.map((doc) => [String(doc.buddyPairId), doc])
    );

    const routine = buddyPairs.map((pair) => {
      const workoutDoc = workoutByPairId.get(String(pair._id));

      return {
        buddyPairId: pair._id,
        members: pair.members,
        status: pair.status,
        createdAt: pair.createdAt,
        workouts: workoutDoc?.workouts || [],
        weeklyHistory: workoutDoc?.weeklyHistory || [],
      };
    });

    return res.status(200).json({ userId: id, routine });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch weekly workout routine' });
  }
}

export async function getAllowedStakes(req, res) {
  return res.status(200).json({ allowedStakes: ALLOWED_STAKES });
}

export async function createWeeklyBet(req, res) {
  try {
    const { id } = req.params;
    const { buddyId, weeklyWorkoutGoal, stake, startDate, status } = req.body;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(buddyId)) {
      return res.status(400).json({ message: 'Invalid user id or buddy id' });
    }

    if (String(id) === String(buddyId)) {
      return res.status(400).json({ message: 'User and buddy cannot be the same' });
    }

    const [user, buddyUser] = await Promise.all([
      Users.findById(id).select('_id'),
      Users.findById(buddyId).select('_id'),
    ]);

    if (!user || !buddyUser) {
      return res.status(404).json({ message: 'User or buddy not found' });
    }

    const buddyPair = await BuddyPair.findOne({
      members: { $all: [user._id, buddyUser._id], $size: 2 },
      status: 'active',
    }).select('_id');

    if (!buddyPair) {
      return res.status(400).json({ message: 'Users are not an active buddy pair' });
    }

    const parsedGoal = Number(weeklyWorkoutGoal);
    if (!Number.isInteger(parsedGoal) || parsedGoal < 1) {
      return res.status(400).json({ message: 'weeklyWorkoutGoal must be a positive integer' });
    }

    if (typeof stake !== 'string') {
      return res.status(400).json({ message: 'Stake must be a string' });
    }

    const normalizedStake = stake.trim();

    if (!normalizedStake) {
      return res.status(400).json({ message: 'Stake cannot be empty' });
    }

    const isAllowedStake = ALLOWED_STAKES.includes(normalizedStake);

    const normalizedStartDate = startDate ? new Date(startDate) : new Date();
    if (Number.isNaN(normalizedStartDate.getTime())) {
      return res.status(400).json({ message: 'Invalid startDate' });
    }

    const normalizedEndDate = new Date(normalizedStartDate);
    normalizedEndDate.setDate(normalizedEndDate.getDate() + 7);

    const challenge = await Challenge.create({
      participants: [user._id, buddyUser._id],
      weeklyWorkoutGoal: parsedGoal,
      stake: normalizedStake,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      status: status || 'active',
    });

    return res.status(201).json({
      challenge,
      allowedStake: isAllowedStake,
      message: isAllowedStake
        ? 'Weekly bet created'
        : 'Weekly bet created with a custom stake',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create weekly bet' });
  }
}