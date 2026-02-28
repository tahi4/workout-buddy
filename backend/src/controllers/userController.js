import Users from '../models/Users.js';

const getUsers = async (req, res) => {
  try {
    const users = await Users.find().sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};



export {
  getUsers
};