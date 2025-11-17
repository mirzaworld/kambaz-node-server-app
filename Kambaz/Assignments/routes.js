import AssignmentsDao from "./dao.js";

export default function AssignmentsRoutes(app, db) {
  const dao = AssignmentsDao(db);

  const getAssignments = (req, res) => {
    res.json(dao.findAllAssignments());
  };

  const getAssignmentById = (req, res) => {
    const { aid } = req.params;
    const assignment = dao.findAssignmentById(aid);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    res.json(assignment);
  };

  const getAssignmentsForCourse = (req, res) => {
    const { courseId } = req.params;
    const assignments = dao.findAssignmentsForCourse(courseId) || [];
    // Ensure each returned assignment has a `course` property so the client
    // can reliably filter by course without needing to dereference modules.
    const mapped = assignments.map((a) => ({ ...(a || {}), course: a.course || courseId }));
    res.json(mapped);
  };

  const createAssignmentForCourse = (req, res) => {
    const { courseId } = req.params;
    const assignment = { ...req.body, course: courseId };
    const created = dao.createAssignment(assignment);
    res.json(created);
  };

  const updateAssignment = (req, res) => {
    const { aid } = req.params;
    const updated = dao.updateAssignment(aid, req.body);
    if (!updated) return res.status(404).json({ message: "Assignment not found" });
    res.json(updated);
  };

  const deleteAssignment = (req, res) => {
    const { aid } = req.params;
    dao.deleteAssignment(aid);
    res.sendStatus(200);
  };

  app.get("/api/assignments", getAssignments);
  app.get("/api/assignments/:aid", getAssignmentById);
  app.get("/api/courses/:courseId/assignments", getAssignmentsForCourse);
  app.post("/api/courses/:courseId/assignments", createAssignmentForCourse);
  app.put("/api/assignments/:aid", updateAssignment);
  app.delete("/api/assignments/:aid", deleteAssignment);
}
