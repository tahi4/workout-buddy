import Users from '../models/Users.js';
import BuddyPair from '../models/BuddyPair.js';
import BuddyWorkout from '../models/BuddyWorkout.js';
import Challenge from '../models/Challenge.js';
import BuddyChallenge from '../models/BuddyChallenge.js';
import {
  deleteProofFromGridFS,
  getProofDownloadStream,
  uploadProofToGridFS,
} from '../config/gridfs.js';
import mongoose from 'mongoose';

const ALLOWED_STAKES = [
  '1 Dinner',
  '$10',
  '1 Chore',
  'Romantic Favor 😉',
];

const PAIRING_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function createRandomPairingCode() {
  let code = '';

  for (let index = 0; index < 5; index += 1) {
    const randomIndex = Math.floor(Math.random() * PAIRING_CODE_ALPHABET.length);
    code += PAIRING_CODE_ALPHABET[randomIndex];
  }

  return code;
}

async function generateUniquePairingCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = createRandomPairingCode();
    const existingUser = await Users.exists({ pairingCode: code });

    if (!existingUser) {
      return code;
    }
  }

  throw new Error('Unable to generate unique pairing code');
}

function buildMemberScores(memberIds) {
  return memberIds.map((memberId) => ({
    userId: memberId,
    points: 0,
    penalties: 0,
  }));
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

    user.pairingCode = await generateUniquePairingCode();
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

    await Users.updateOne(
      { _id: buddyUser._id },
      { $unset: { pairingCode: 1 } }
    );

    const existingPair = await BuddyPair.findOne({
      members: { $all: [user._id, buddyUser._id], $size: 2 },
    });

    if (existingPair) {
      if (!existingPair.memberScores || existingPair.memberScores.length === 0) {
        existingPair.memberScores = buildMemberScores(existingPair.members);
        await existingPair.save();
      }

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
      memberScores: buildMemberScores([user._id, buddyUser._id]),
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

export async function createBuddyChallenge(req, res) {
  try {
    const { id } = req.params;
    const { targetId, workoutType, points, deadline } = req.body;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'Invalid challenger id or target id' });
    }

    if (String(id) === String(targetId)) {
      return res.status(400).json({ message: 'Cannot challenge yourself' });
    }

    if (typeof workoutType !== 'string' || !workoutType.trim()) {
      return res.status(400).json({ message: 'workoutType is required' });
    }

    const parsedPoints = Number(points);
    if (!Number.isInteger(parsedPoints) || parsedPoints < 1) {
      return res.status(400).json({ message: 'points must be a positive integer' });
    }

    const parsedDeadline = deadline ? new Date(deadline) : null;
    if (!parsedDeadline || Number.isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({ message: 'Valid deadline is required' });
    }

    const [challengerUser, targetUser] = await Promise.all([
      Users.findById(id).select('_id'),
      Users.findById(targetId).select('_id'),
    ]);

    if (!challengerUser || !targetUser) {
      return res.status(404).json({ message: 'Challenger or target user not found' });
    }

    const buddyPair = await BuddyPair.findOne({
      members: { $all: [challengerUser._id, targetUser._id], $size: 2 },
      status: 'active',
    });

    if (!buddyPair) {
      return res.status(400).json({ message: 'Only active buddies can challenge each other' });
    }

    if (!buddyPair.memberScores || buddyPair.memberScores.length === 0) {
      buddyPair.memberScores = buildMemberScores(buddyPair.members);
      await buddyPair.save();
    }

    const challenge = await BuddyChallenge.create({
      buddyPairId: buddyPair._id,
      challenger: challengerUser._id,
      target: targetUser._id,
      workoutType: workoutType.trim(),
      points: parsedPoints,
      status: 'pending',
      createdAt: new Date(),
      deadline: parsedDeadline,
      proof: {
        fileId: null,
        filename: null,
        contentType: null,
        size: null,
        bucket: null,
        submittedAt: null,
        submittedBy: null,
        verifiedAt: null,
        verifiedBy: null,
        verificationNote: null,
      },
    });

    return res.status(201).json(challenge);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create challenge' });
  }
}

export async function submitChallengeProof(req, res) {
  try {
    const { id, challengeId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(challengeId)) {
      return res.status(400).json({ message: 'Invalid user id or challenge id' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Proof image file is required' });
    }

    const challenge = await BuddyChallenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (String(challenge.target) !== String(id)) {
      return res.status(403).json({ message: 'Only the target buddy can submit proof' });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({ message: 'Challenge is not accepting proof submissions' });
    }

    if (challenge.deadline && new Date() > challenge.deadline) {
      return res.status(400).json({ message: 'Challenge deadline has passed' });
    }

    const uploadResult = await uploadProofToGridFS({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      metadata: {
        challengeId,
        targetId: id,
      },
    });

    if (challenge.proof?.fileId) {
      await deleteProofFromGridFS(challenge.proof.fileId).catch(() => null);
    }

    challenge.proof = {
      fileId: uploadResult.fileId,
      filename: uploadResult.filename,
      contentType: uploadResult.contentType,
      size: uploadResult.size,
      bucket: uploadResult.bucket,
      submittedAt: new Date(),
      submittedBy: id,
      verifiedAt: null,
      verifiedBy: null,
      verificationNote: null,
    };
    challenge.status = 'proof_submitted';

    await challenge.save();

    return res.status(200).json({
      message: 'Proof uploaded successfully',
      challenge,
    });
  } catch (error) {
    console.error('submitChallengeProof error:', error);
    return res.status(500).json({ message: 'Failed to submit challenge proof' });
  }
}

export async function getChallengeProof(req, res) {
  try {
    const { id, challengeId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(challengeId)) {
      return res.status(400).json({ message: 'Invalid user id or challenge id' });
    }

    const challenge = await BuddyChallenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const isParticipant =
      String(challenge.challenger) === String(id) || String(challenge.target) === String(id);

    if (!isParticipant) {
      return res.status(403).json({ message: 'Only challenge participants can view proof' });
    }

    if (!challenge.proof?.fileId) {
      return res.status(404).json({ message: 'Proof not found' });
    }

    res.setHeader('Content-Type', challenge.proof.contentType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${challenge.proof.filename || 'proof-image'}"`
    );

    const downloadStream = getProofDownloadStream(challenge.proof.fileId);
    downloadStream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({ message: 'Proof file not found' });
      } else {
        res.end();
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('getChallengeProof error:', error);
    return res.status(500).json({ message: 'Failed to fetch challenge proof' });
  }
}

export async function resolveBuddyChallenge(req, res) {
  try {
    const { id, challengeId } = req.params;
    const { accepted, note } = req.body;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(challengeId)) {
      return res.status(400).json({ message: 'Invalid user id or challenge id' });
    }

    if (typeof accepted !== 'boolean') {
      return res.status(400).json({ message: 'accepted must be true or false' });
    }

    const challenge = await BuddyChallenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (challenge.status !== 'proof_submitted') {
      return res.status(400).json({ message: 'Challenge proof has not been submitted for verification' });
    }

    if (String(challenge.challenger) !== String(id)) {
      return res.status(403).json({ message: 'Only the challenger can verify this challenge proof' });
    }

    const buddyPair = await BuddyPair.findById(challenge.buddyPairId);
    if (!buddyPair) {
      return res.status(404).json({ message: 'Buddy pair not found' });
    }

    if (!buddyPair.memberScores || buddyPair.memberScores.length === 0) {
      buddyPair.memberScores = buildMemberScores(buddyPair.members);
    }

    const targetScore = buddyPair.memberScores.find(
      (entry) => String(entry.userId) === String(challenge.target)
    );

    if (!targetScore) {
      buddyPair.memberScores.push({
        userId: challenge.target,
        points: 0,
        penalties: 0,
      });
    }

    const finalTargetScore = buddyPair.memberScores.find(
      (entry) => String(entry.userId) === String(challenge.target)
    );

    challenge.proof.verifiedAt = new Date();
    challenge.proof.verifiedBy = id;
    challenge.proof.verificationNote = typeof note === 'string' ? note.trim() : null;

    if (accepted) {
      finalTargetScore.points += challenge.points;
      challenge.status = 'accepted';
      await Promise.all([buddyPair.save(), challenge.save()]);

      return res.status(200).json({
        message: 'Challenge accepted and points awarded',
        challenge,
        memberScores: buddyPair.memberScores,
      });
    }

    finalTargetScore.penalties += 1;
    challenge.status = 'rejected';
    await Promise.all([buddyPair.save(), challenge.save()]);

    return res.status(200).json({
      message: 'Challenge rejected and penalty issued',
      challenge,
      memberScores: buddyPair.memberScores,
    });
  } catch (error) {
    console.error('resolveBuddyChallenge error:', error);
    return res.status(500).json({ message: 'Failed to resolve challenge' });
  }
}

export async function getUserHistory(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await Users.findById(id).select('_id streak');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const buddyPair = await BuddyPair.findOne({
      members: user._id,
    })
      .sort({ createdAt: -1 })
      .select('_id combinedStreak totalWorkoutsCompleted');

    if (!buddyPair) {
      return res.status(200).json({
        userId: id,
        streak: user.streak?.current || 0,
        totalWorkouts: 0,
        weeks: [],
      });
    }

    const buddyWorkout = await BuddyWorkout.findOne({
      buddyPairId: buddyPair._id,
    }).select('workouts weeklyHistory');

    const weeklyHistory = Array.isArray(buddyWorkout?.weeklyHistory)
      ? buddyWorkout.weeklyHistory
      : [];

    const weeks = weeklyHistory
      .map((entry) => ({
        weekStartDate: entry.date,
        workoutsCompleted: Array.isArray(entry.workouts) ? entry.workouts.length : 0,
      }))
      .sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate));

    const fallbackTotalFromWorkoutDoc = Array.isArray(buddyWorkout?.workouts)
      ? buddyWorkout.workouts.length
      : 0;

    const totalWorkouts =
      Number.isInteger(buddyPair.totalWorkoutsCompleted) && buddyPair.totalWorkoutsCompleted >= 0
        ? buddyPair.totalWorkoutsCompleted
        : fallbackTotalFromWorkoutDoc;

    return res.status(200).json({
      userId: id,
      streak: buddyPair.combinedStreak?.current ?? user.streak?.current ?? 0,
      totalWorkouts,
      weeks,
    });
  } catch (error) {
    console.error('getUserHistory error:', error);
    return res.status(500).json({ message: 'Failed to fetch user history' });
  }
}

export async function getChallengePhotos(req, res) {
  try {
    const { id } = req.params;
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 10, 50));

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await Users.findById(id).select('_id');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const challenges = await BuddyChallenge.find({
      $or: [{ challenger: user._id }, { target: user._id }],
      'proof.fileId': { $ne: null },
      'proof.submittedAt': { $ne: null },
    })
      .sort({ 'proof.submittedAt': -1 })
      .limit(limit)
      .select('challenger target workoutType status points deadline proof');

    const photos = challenges.map((challenge) => ({
      challengeId: challenge._id,
      submittedAt: challenge.proof.submittedAt,
      workoutType: challenge.workoutType,
      status: challenge.status,
      points: challenge.points,
      deadline: challenge.deadline,
      submittedBy: challenge.proof.submittedBy,
      file: {
        filename: challenge.proof.filename,
        contentType: challenge.proof.contentType,
        size: challenge.proof.size,
      },
      proofUrl: `/user/${id}/challenges/${challenge._id}/proof`,
      challenger: challenge.challenger,
      target: challenge.target,
    }));

    return res.status(200).json({
      userId: id,
      count: photos.length,
      photos,
    });
  } catch (error) {
    console.error('getChallengePhotos error:', error);
    return res.status(500).json({ message: 'Failed to fetch challenge photos' });
  }
}

export async function getCurrentStakes(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await Users.findById(id).select('_id');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();

    let challenge = await Challenge.findOne({
      participants: user._id,
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ startDate: -1 });

    if (!challenge) {
      challenge = await Challenge.findOne({
        participants: user._id,
      }).sort({ startDate: -1 });
    }

    if (!challenge) {
      return res.status(200).json({
        userId: id,
        hasCurrentStake: false,
        stake: null,
      });
    }

    const buddyPair = await BuddyPair.findOne({
      members: user._id,
      status: 'active',
    }).select('memberScores');

    const userScore = buddyPair?.memberScores?.find(
      (entry) => String(entry.userId) === String(user._id)
    );

    return res.status(200).json({
      userId: id,
      hasCurrentStake: true,
      stake: {
        challengeId: challenge._id,
        weeklyWorkoutGoal: challenge.weeklyWorkoutGoal,
        stake: challenge.stake,
        status: challenge.status,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
      },
      score: {
        points: userScore?.points || 0,
        penalties: userScore?.penalties || 0,
      },
    });
  } catch (error) {
    console.error('getCurrentStakes error:', error);
    return res.status(500).json({ message: 'Failed to fetch current stakes' });
  }
}