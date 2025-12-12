/**
 * PAZZA SCHEMAS
 * Defines MongoDB document structure for all Pazza collections:
 * - Posts: Questions and Notes
 * - Answers: Responses to Questions
 * - FollowUpDiscussions: Threaded discussions on Questions
 * - Folders: Categories to organize Posts
 */

import mongoose from "mongoose";

// ============================================================================
// POSTS SCHEMA
// ============================================================================
/**
 * Posts can be of type "QUESTION" or "NOTE"
 * QUESTION: Seeking help/answers (students/instructors post)
 * NOTE: Information sharing (instructors/students post)
 */
const postsSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      required: true,
      index: true, // Frequently filtered by course
    },
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: true, // Store author name at time of post for display
    },
    authorRole: {
      type: String,
      enum: ["STUDENT", "INSTRUCTOR"],
      required: true,
    },
    type: {
      type: String,
      enum: ["QUESTION", "NOTE"],
      required: true,
    },
    summary: {
      type: String,
      required: true,
      maxlength: 100, // One-line summary, max 100 chars
    },
    details: {
      type: String,
      required: true, // HTML content from rich text editor
    },
    folders: {
      type: [String], // Array of folder names (hw1, hw2, project, etc.)
      required: true,
      validate: {
        validator: function (v) {
          return v.length > 0; // At least one folder required
        },
        message: "At least one folder must be selected",
      },
    },
    visibility: {
      type: String,
      enum: ["ENTIRE_CLASS", "SELECTED_STUDENTS"],
      default: "ENTIRE_CLASS",
    },
    visibleToUserIds: {
      type: [String], // List of user IDs who can see this post
      default: [], // Empty if ENTIRE_CLASS
    },
    viewCount: {
      type: Number,
      default: 0, // Increment when user views post
    },
    hasStudentAnswer: {
      type: Boolean,
      default: false, // true if a student has answered
    },
    hasInstructorAnswer: {
      type: Boolean,
      default: false, // true if instructor has answered
    },
    goodQuestionCount: {
      type: Number,
      default: 0, // Count of instructors who marked this as good question
    },
    goodQuestionBy: {
      type: [String], // Array of instructor user IDs who marked as good question
      default: [],
    },
    goodAnswerCount: {
      type: Number,
      default: 0, // Count of users who marked answer as good
    },
    goodAnswerBy: {
      type: [String], // Array of user IDs who marked answer as good
      default: [],
    },
    isDraft: {
      type: Boolean,
      default: false, // true if post is a draft (not published)
    },
  },
  { timestamps: true } // Auto-adds createdAt and updatedAt
);

// ============================================================================
// ANSWERS SCHEMA
// ============================================================================
/**
 * Answers are responses to QUESTION posts
 * Only one Student Answer and one Instructor Answer allowed per Question
 * Tracks role to distinguish between student and instructor responses
 */
const answersSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
      index: true,
    },
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    authorId: {
      type: String,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorRole: {
      type: String,
      enum: ["STUDENT", "INSTRUCTOR"],
      required: true,
    },
    content: {
      type: String,
      required: true, // HTML content from rich text editor
    },
    goodAnswerCount: {
      type: Number,
      default: 0, // Count of users who marked this answer as good
    },
    goodAnswerBy: {
      type: [String], // Array of user IDs who marked answer as good
      default: [],
    },
  },
  { timestamps: true }
);

// Allow multiple answers per role per post (no unique compound index)
// answersSchema.index({ postId: 1, authorRole: 1 }, { unique: true });

// ============================================================================
// FOLLOW UP DISCUSSIONS SCHEMA
// ============================================================================
/**
 * FollowUpDiscussions are threaded comments on QUESTION posts
 * Supports nested replies (replies to replies to replies, etc.)
 * Each discussion/reply is a separate document with parentDiscussionId linking
 */
const followUpDiscussionSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
      index: true,
    },
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    authorId: {
      type: String,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorRole: {
      type: String,
      enum: ["STUDENT", "INSTRUCTOR"],
      required: true,
    },
    content: {
      type: String,
      required: true, // User's message text
    },
    parentDiscussionId: {
      type: String,
      default: null, // null = top-level discussion, otherwise reply to that discussion
    },
    resolved: {
      type: Boolean,
      default: false, // Toggle between Resolved/Unresolved by author/instructor
    },
    helpfulCount: {
      type: Number,
      default: 0, // Count of users who marked this discussion as helpful
    },
    helpfulBy: {
      type: [String], // Array of user IDs who marked as helpful
      default: [],
    },
  },
  { timestamps: true }
);

// ============================================================================
// FOLDERS SCHEMA
// ============================================================================
/**
 * Folders are course-specific categories for organizing posts
 * Default folders: hw1, hw2, hw3, hw4, hw5, hw6, project, exam, logistics, other, office_hours
 * Instructors can create, rename, delete folders
 */
const foldersSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index: unique folder names per course
foldersSchema.index({ courseId: 1, name: 1 }, { unique: true });

export { postsSchema, answersSchema, followUpDiscussionSchema, foldersSchema };
