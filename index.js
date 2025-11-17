import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
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

const app = express();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SESSION_SECRET = process.env.SESSION_SECRET || 'keyboard_cat_change_me';

// Support multiple origins by allowing a comma-separated list in CLIENT_URL
const allowedOrigins = CLIENT_URL.split(',').map(s => s.trim()).filter(Boolean);
console.log('KAMBAZ allowedOrigins:', allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser or same-origin requests (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS policy: origin not allowed'), false);
    },
    credentials: true,
  })
);

// Ensure the Access-Control-Allow-Origin header is a single matching origin
// (not a comma-separated list). Some misconfigurations or proxies can lead
// to multiple origins being sent; explicitly set the header here when the
// request origin matches our allowed list.
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

app.use(session(sessionOptions));
app.use(express.json());

// Simple request logger for debugging (removed after issue resolved)


// Mount route modules
UsersRoutes(app, db);
CourseRoutes(app, db);
ModulesRoutes(app, db);
AssignmentsRoutes(app, db);
EnrollmentsRoutes(app, db);
Lab5(app);
Hello(app);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Kambaz node server listening on port ${port}`);
});
