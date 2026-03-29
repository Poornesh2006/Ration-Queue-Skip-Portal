# Smart Queue Skip Portal

Cleaned MERN boilerplate for a ration-slot booking platform with admin monitoring, seeded datasets, and extensible service layers.

## Updated structure

- `client/src/components`: reusable UI blocks
- `client/src/pages`: route-level pages
- `client/src/services`: centralized API layer
- `client/src/utils`: browser helpers
- `server/src/models`: Mongoose schemas
- `server/src/controllers`: request orchestration
- `server/src/routes`: REST endpoints
- `server/src/middleware`: auth, role, validation, error handling
- `server/src/config`: runtime configuration
- `server/src/services`: business and analytics logic
- `server/data`: canonical seed datasets

## API surface

- `/api/auth`
- `/api/users`
- `/api/shops`
- `/api/slots`
- `/api/bookings`
- `/api/admin`
- `/api/fraud`

## Quick start

### Backend

1. Copy `server/.env.example` to `server/.env`
2. Run `npm install` inside `server`
3. Run `npm run seed`
4. Run `npm run dev`

### Frontend

1. Run `npm install` inside `client`
2. Run `npm run dev`

## Environment variables

### Backend (`server/.env`)

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>
JWT_SECRET=<long-random-secret-with-32-plus-characters>
JWT_EXPIRES_IN=7d
FAST2SMS_API_KEY=<optional-for-live-otp>
CORS_ORIGINS=http://localhost:5173,https://your-frontend-domain.vercel.app
FACE_VERIFICATION_ENABLED=false
FACE_MATCH_THRESHOLD=0.7
SHOW_DEMO_OTP=false
```

### Frontend (`client/.env`)

```
VITE_API_BASE_URL=https://your-backend-domain.onrender.com/api
VITE_FACE_VERIFICATION_ENABLED=false
```

## Deployment notes

### Frontend

- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_BASE_URL` to your deployed backend URL
- Recommended targets: Vercel or Netlify

### Backend

- Start command: `npm start`
- Ensure MongoDB Atlas `MONGO_URI` is set
- Set a strong `JWT_SECRET`
- Set `CORS_ORIGINS` to your deployed frontend domain
- Recommended targets: Render or Railway

### Production checklist

- Disable `SHOW_DEMO_OTP`
- Use a live `FAST2SMS_API_KEY` for OTP delivery
- Keep `server/.env` out of version control
- Seed only non-sensitive demo data
- Do not expose development servers publicly

## Demo accounts

- Admin: `TN-ADM-0001` / `Admin@123`
- User: `TN-CHN-1001` / `Password@123`
