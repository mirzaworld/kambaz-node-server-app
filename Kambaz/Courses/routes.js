import CoursesDao from "./dao.js";
import EnrollmentsDao from "../Enrollments/dao.js";
import * as pazzaDao from "../Pazza/dao.js";
export default function CourseRoutes( app, db ) {
  const dao = CoursesDao( db );
  const enrollmentsDao = EnrollmentsDao( db );
  const findAllCourses = async ( req, res ) => {
    const courses = await dao.findAllCourses();
    res.send( courses );
  };
  const findCoursesForEnrolledUser = async ( req, res ) => {
    let { userId } = req.params;
    if ( userId === "current" ) {
      const currentUser = req.session[ "currentUser" ];
      if ( !currentUser ) {
        res.sendStatus( 401 );
        return;
      }
      userId = currentUser._id;
    }
    const courses = await enrollmentsDao.findCoursesForUser( userId );
    res.json( courses );
  };
  const createCourse = async ( req, res ) => {
    const newCourse = await dao.createCourse( req.body );
    const currentUser = req.session[ "currentUser" ];
    await enrollmentsDao.enrollUserInCourse( currentUser._id, newCourse._id );
    // Create default Pazza folders for this course
    await pazzaDao.createDefaultFolders( newCourse._id );
    res.json( newCourse );
  };
  const deleteCourse = async ( req, res ) => {
    const { courseId } = req.params;
    await enrollmentsDao.unenrollAllUsersFromCourse( courseId );
    const status = await dao.deleteCourse( courseId );
    res.send( status );
  };
  const updateCourse = async ( req, res ) => {
    const { courseId } = req.params;
    const courseUpdates = req.body;
    const status = await dao.updateCourse( courseId, courseUpdates );
    res.send( status );
  };
  const enrollUserInCourse = async ( req, res ) => {
    let { uid, cid } = req.params;
    if ( uid === "current" ) {
      const currentUser = req.session[ "currentUser" ];
      uid = currentUser._id;
    }
    const status = await enrollmentsDao.enrollUserInCourse( uid, cid );
    res.send( status );
  };
  const unenrollUserFromCourse = async ( req, res ) => {
    let { uid, cid } = req.params;
    if ( uid === "current" ) {
      const currentUser = req.session[ "currentUser" ];
      uid = currentUser._id;
    }
    const status = await enrollmentsDao.unenrollUserFromCourse( uid, cid );
    res.send( status );
  };
  const findUsersForCourse = async ( req, res ) => {
    const { cid } = req.params;
    const users = await enrollmentsDao.findUsersForCourse( cid );
    res.json( users );
  };
  const findCourseById = async ( req, res ) => {
    const { cid } = req.params;
    const course = await dao.findCourseById( cid );
    if ( !course ) {
      res.status( 404 ).send( { error: "Course not found" } );
      return;
    }
    res.json( course );
  };
  app.get( "/api/courses", findAllCourses );
  app.get( "/api/courses/:cid", findCourseById );
  app.get( "/api/users/:userId/courses", findCoursesForEnrolledUser );
  app.post( "/api/courses", createCourse );
  app.delete( "/api/courses/:courseId", deleteCourse );
  app.put( "/api/courses/:courseId", updateCourse );
  app.post( "/api/users/:uid/courses/:cid", enrollUserInCourse );
  app.delete( "/api/users/:uid/courses/:cid", unenrollUserFromCourse );
  app.get( "/api/courses/:cid/users", findUsersForCourse );
}
