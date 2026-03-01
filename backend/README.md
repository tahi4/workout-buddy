# Workout Buddy Backend API

Express + MongoDB backend for buddy pairing, workouts, bets, and challenge proof verification.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- Multer (proof image upload)
- GridFS (proof image storage inside MongoDB)

## Project Structure

```
backend/
	src/
		app.js
		server.js
		config/
			db.js
			gridfs.js
		controllers/
			userController.js
		middleware/
			proofUpload.js
		models/
			Users.js
			Workout.js
			BuddyPair.js
			BuddyWorkout.js
			Challenge.js        // weekly bets collection (bets)
			BuddyChallenge.js   // buddy challenges collection (challenges)
		routes/
			userRoutes.js
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`:

```env
MONGODB_URI=<your mongodb uri>
MONGODB_URI_FALLBACK=<optional fallback uri>
PORT=5000
```

3. Run development server:

```bash
npm run dev
```

The API is mounted at `/user`.

## Base URL

For local development:

```
http://localhost:5000/user
```

## API Documentation

### Health

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/` | Basic app health message |

### Users & Pairing

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/user/users` | Get all users |
| GET | `/user/:id/pairing-code` | Generate and return a new random 5-char pairing code |
| PUT | `/user/:id/buddy/:pairingCode` | Pair user with buddy by pairing code (code is consumed/deleted) |

#### `GET /user/:id/pairing-code`

Response:

```json
{
	"pairingCode": "A1B2C"
}
```

### Weekly Workout Routine

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/user/:id/weekly-workout-routine` | Get routine data from active buddy pairs and buddy workouts |

### Weekly Bets

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/user/weekly-bets/allowed-stakes` | Get preset allowed stake labels |
| POST | `/user/:id/weekly-bets` | Create a weekly bet between active buddies |

#### `POST /user/:id/weekly-bets`

Request body:

```json
{
	"buddyId": "<ObjectId>",
	"weeklyWorkoutGoal": 4,
	"stake": "1 Dinner",
	"startDate": "2026-03-01T00:00:00.000Z",
	"status": "active"
}
```

### Buddy Challenges

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/user/:id/challenges` | Challenger creates challenge for a buddy |
| POST | `/user/:id/challenges/:challengeId/proof` | Target uploads proof image |
| GET | `/user/:id/challenges/:challengeId/proof` | Challenger/target streams proof image |
| PUT | `/user/:id/challenges/:challengeId/resolve` | Challenger accepts/rejects proof |

#### `POST /user/:id/challenges`

Request body:

```json
{
	"targetId": "<ObjectId>",
	"workoutType": "10 Pushups",
	"points": 50,
	"deadline": "2026-03-02T23:59:59.000Z"
}
```

Rules:

- `:id` is the challenger id.
- Only active buddies can challenge each other.
- Challenge starts with `status = "pending"`.

#### `POST /user/:id/challenges/:challengeId/proof`

- `:id` must be the target id.
- Content type: `multipart/form-data`
- File field name: `proof`
- Images only, max size 5MB.
- Proof is stored in Mongo GridFS bucket: `challengeProofs`.

#### `PUT /user/:id/challenges/:challengeId/resolve`

Request body:

```json
{
	"accepted": true,
	"note": "Looks good"
}
```

Rules:

- `:id` must be the challenger id.
- Challenge must be in `proof_submitted` state.
- `accepted: true`
	- target gets challenge points in `buddyPair.memberScores`
	- challenge proof file is deleted from GridFS
	- challenge record is deleted
- `accepted: false`
	- target gets `+1` penalty in `buddyPair.memberScores`
	- challenge proof file is deleted from GridFS
	- challenge record is deleted

## Data Collections Used

- `user`
- `workouts`
- `buddyPair`
- `buddyWorkout`
- `bets`
- `challenges`
- `challengeProofs.files` and `challengeProofs.chunks` (GridFS)

## Notes

- Pairing codes are random uppercase alphanumeric, 5 characters, and single-use.
- Proof image access is restricted to challenge participants only.
- Route base path is `/user`, so endpoints are prefixed with `/user/...`.

