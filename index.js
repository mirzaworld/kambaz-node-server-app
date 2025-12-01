import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from 'cors';
import session from 'express-session';
import Hello from './Hello.js';
import Lab5 from './Lab5/index.js';
import db from './Kambaz/Database/index.js';
import UsersRoutes from './Kambaz/Users/routes.js';
import CourseRoutes from './Kambaz/Courses/routes.js';
import ModulesRoutes from './Kambaz/Modules/routes.js';
import AssignmentsRoutes from './Kambaz/Assignments/routes.js';
import EnrollmentsRoutes from './Kambaz/Enrollments/routes.js';

const CONNECTION_STRING = process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/kambaz";
const app = express();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SESSION_SECRET = process.env.SESSION_SECRET || 'keyboard_cat_change_me';

const allowedOrigins = CLIENT_URL.split(',').map(s => s.trim()).filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS policy: origin not allowed'), false);
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

const sessionOptions = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
};

if (process.env.SERVER_ENV !== 'development') {
  sessionOptions.proxy = true;
  sessionOptions.cookie = {
    sameSite: 'none',
    secure: true,
    domain: process.env.SERVER_URL,
  };
}

app.use( session( sessionOptions ) );
app.use( express.json() );



async function start() {
  try {
    await mongoose.connect(CONNECTION_STRING, { serverSelectionTimeoutMS: 15000 });
    console.log("MongoDB connected");

    // Mount route modules only after successful DB connection
    UsersRoutes( app, db );
    CourseRoutes( app, db );
    ModulesRoutes( app, db );
    AssignmentsRoutes( app, db );
    EnrollmentsRoutes( app, db );
    Lab5( app );
    Hello( app );

    const port = process.env.PORT || 4000;
    app.listen( port, () => {
      console.log(`Server listening on port ${ port }`);
    } );
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    // Exit so Render restarts and logs are visible
    process.exit(1);
  }
}

start();
