import { v4 as uuidv4 } from "uuid";

export default function AssignmentsDao(db) {
  function findAllAssignments() {
    return db.assignments || [];
  }

  function findAssignmentById(assignmentId) {
    return (db.assignments || []).find((a) => a._id === assignmentId) || null;
  }

  function findAssignmentsForCourse(courseId) {
    const assignments = db.assignments || [];
    // assignments may reference either a `course` field or a `module` field
    return assignments.filter((a) => {
      if (String(a.course || "").toLowerCase() === String(courseId).toLowerCase()) return true;
      if (a.module) {
        const module = (db.modules || []).find((m) => m._id === a.module);
        if (module && String(module.course || "").toLowerCase() === String(courseId).toLowerCase()) return true;
      }
      return false;
    });
  }

  function createAssignment(assignment) {
    const newAssignment = { ...assignment, _id: uuidv4() };
    db.assignments = [...(db.assignments || []), newAssignment];
    return newAssignment;
  }

  function updateAssignment(assignmentId, assignmentUpdates) {
    const assignments = db.assignments || [];
    const assignment = assignments.find((a) => a._id === assignmentId);
    if (!assignment) return null;
    Object.assign(assignment, assignmentUpdates);
    return assignment;
  }

  function deleteAssignment(assignmentId) {
    db.assignments = (db.assignments || []).filter((a) => a._id !== assignmentId);
    return true;
  }

  return {
    findAllAssignments,
    findAssignmentById,
    findAssignmentsForCourse,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  };
}
