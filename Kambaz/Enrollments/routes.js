export default function EnrollmentsRoutes(app, db) {
  const getEnrollments = (req, res) => {
    res.json(db.enrollments || []);
  };

  app.get("/api/enrollments", getEnrollments);
}
