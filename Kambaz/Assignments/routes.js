import AssignmentsDao from "./dao.js";
export default function AssignmentsRoutes( app, db ) {
  const dao = AssignmentsDao( db );
  const findAssignmentsForCourse = async ( req, res ) => {
    const { courseId } = req.params;
    const assignments = await dao.findAssignmentsForCourse( courseId );
    res.json( assignments );
  };
  const findAssignmentById = async ( req, res ) => {
    const { assignmentId } = req.params;
    const assignment = await dao.findAssignmentById( assignmentId );
    res.json( assignment );
  };
  const createAssignment = async ( req, res ) => {
    const { courseId } = req.params;
    const assignment = await dao.createAssignment( courseId, req.body );
    res.json( assignment );
  };
  const updateAssignment = async ( req, res ) => {
    const { assignmentId } = req.params;
    const status = await dao.updateAssignment( assignmentId, req.body );
    res.json( status );
  };
  const deleteAssignment = async ( req, res ) => {
    const { assignmentId } = req.params;
    const status = await dao.deleteAssignment( assignmentId );
    res.json( status );
  };
  app.get( "/api/courses/:courseId/assignments", findAssignmentsForCourse );
  app.get( "/api/assignments/:assignmentId", findAssignmentById );
  app.post( "/api/courses/:courseId/assignments", createAssignment );
  app.put( "/api/assignments/:assignmentId", updateAssignment );
  app.delete( "/api/assignments/:assignmentId", deleteAssignment );
}
