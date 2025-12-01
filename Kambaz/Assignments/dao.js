import model from "./model.js";
import { v4 as uuidv4 } from "uuid";
export default function AssignmentsDao( db ) {
  function findAssignmentsForCourse( courseId ) {
    return model.find( { course: courseId } );
  }
  function findAssignmentById( assignmentId ) {
    return model.findById( assignmentId );
  }
  function createAssignment( courseId, assignment ) {
    const newAssignment = { ...assignment, _id: uuidv4(), course: courseId };
    return model.create( newAssignment );
  }
  function updateAssignment( assignmentId, assignmentUpdates ) {
    return model.updateOne( { _id: assignmentId }, { $set: assignmentUpdates } );
  }
  function deleteAssignment( assignmentId ) {
    return model.deleteOne( { _id: assignmentId } );
  }
  return { findAssignmentsForCourse, findAssignmentById, createAssignment, updateAssignment, deleteAssignment };
}
