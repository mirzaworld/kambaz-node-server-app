/**
 * PAZZA ROUTES
 * API endpoints for Pazza functionality:
 * - /api/courses/:cid/pazza/posts - Posts CRUD
 * - /api/courses/:cid/pazza/answers - Answers CRUD
 * - /api/courses/:cid/pazza/discussions - Discussions CRUD
 * - /api/courses/:cid/pazza/folders - Folders CRUD
 */

import * as pazzaDao from "./dao.js";

// Helper function to check if user can view a post
function canViewPost(post, currentUser) {
  // If post is public, everyone can view
  if (post.visibility === "ENTIRE_CLASS") return true;
  
  // If not logged in, can't view private
  if (!currentUser) return false;
  
  // Instructors, TA, Faculty, Admin can always view
  if (["INSTRUCTOR", "FACULTY", "TA", "ADMIN"].includes(currentUser.role)) return true;
  
  // Post author can view their own post
  if (post.authorId === currentUser._id) return true;
  
  // Check if user is in visibleToUserIds (for private posts)
  return (post.visibleToUserIds || []).includes(currentUser._id);
}

export default function PazzaRoutes(app) {
  // =========================================================================
  // STATS ROUTES
  // =========================================================================

  /**
   * GET /api/courses/:cid/pazza/stats
   * Get Class at a Glance statistics for the course
   * Returns: { totalPosts, unansweredQuestions, instructorResponses, studentResponses, unresolvedFollowups }
   */
  app.get("/api/courses/:cid/pazza/stats", async (req, res) => {
    const { cid } = req.params;
    try {
      const posts = await pazzaDao.findAllPosts(cid);
      const questions = posts.filter(p => p.type === "QUESTION");
      
      // Count instructor responses (any post with at least one instructor answer)
      let instructorResponsesCount = 0;
      for (const post of posts) {
        const answers = await pazzaDao.findAllAnswersForPost(post._id);
        const hasInstructorAnswer = answers.some(a => 
          a.authorRole === "INSTRUCTOR" || a.authorRole === "FACULTY"
        );
        if (hasInstructorAnswer) {
          instructorResponsesCount++;
        }
      }

      // Count unanswered questions (questions with no instructor answer)
      let unansweredCount = 0;
      for (const question of questions) {
        const answers = await pazzaDao.findAllAnswersForPost(question._id);
        const hasInstructorAnswer = answers.some(a => 
          a.authorRole === "INSTRUCTOR" || a.authorRole === "FACULTY"
        );
        if (!hasInstructorAnswer) {
          unansweredCount++;
        }
      }

      // Count student responses (discussions + replies by students)
      let studentResponsesCount = 0;
      for (const post of posts) {
        const discussions = await pazzaDao.findAllDiscussionsForPost(post._id);
        for (const discussion of discussions) {
          if (discussion.authorRole === "STUDENT") {
            studentResponsesCount++;
          }
          // Count replies
          const replies = await pazzaDao.findRepliesForDiscussion(discussion._id);
          const studentReplies = replies.filter(r => r.authorRole === "STUDENT");
          studentResponsesCount += studentReplies.length;
        }
      }

      // Count unresolved followups
      let unresolvedFollowupsCount = 0;
      for (const post of posts) {
        const discussions = await pazzaDao.findAllDiscussionsForPost(post._id);
        const topLevelDiscussions = discussions.filter(d => !d.parentDiscussionId);
        const hasUnresolved = topLevelDiscussions.some(d => !d.resolved);
        if (hasUnresolved) {
          unresolvedFollowupsCount++;
        }
      }

      res.send({
        totalPosts: posts.length,
        unansweredQuestions: unansweredCount,
        instructorResponses: instructorResponsesCount,
        studentResponses: studentResponsesCount,
        unresolvedFollowups: unresolvedFollowupsCount,
      });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  // =========================================================================
  // POSTS ROUTES
  // =========================================================================

  /**
   * GET /api/courses/:cid/pazza/posts
   * Get all posts for a course (optionally filtered by folder)
   * Query: ?folder=hw1 (optional)
   * Returns: Array of posts sorted by creation date (newest first)
   */
  app.get("/api/courses/:cid/pazza/posts", async (req, res) => {
    const { cid } = req.params;
    const { folder } = req.query;
    const currentUser = req.session?.currentUser;

    try {
      let posts;
      if (folder) {
        // Specific folder filter
        posts = await pazzaDao.findPostsByFolder(cid, folder);
      } else {
        // All posts for course
        posts = await pazzaDao.findAllPosts(cid);
      }
      
      // Filter posts based on visibility and user permissions
      const visiblePosts = posts.filter(post => canViewPost(post, currentUser));
      res.send(visiblePosts);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/courses/:cid/pazza/posts/search
   * Search posts by keyword in summary or details
   * Query: ?keyword=redux
   * Returns: Array of matching posts
   */
  app.get("/api/courses/:cid/pazza/posts/search", async (req, res) => {
    const { cid } = req.params;
    const { keyword } = req.query;
    const currentUser = req.session?.currentUser;

    try {
      const posts = await pazzaDao.searchPosts(cid, keyword);
      // Filter posts based on visibility and user permissions
      const visiblePosts = posts.filter(post => canViewPost(post, currentUser));
      res.send(visiblePosts);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/courses/:cid/pazza/posts/:pid
   * Get a specific post by ID (increment view count)
   * Returns: Post document
   */
  app.get("/api/courses/:cid/pazza/posts/:pid", async (req, res) => {
    const { pid } = req.params;

    try {
      // Increment view count
      const post = await pazzaDao.incrementViewCount(pid);
      res.send(post);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/courses/:cid/pazza/posts
   * Create a new post (Question or Note)
   * Body: { authorId, authorName, authorRole, type, summary, details, folders, visibility, visibleToUserIds }
   * Returns: Created post
   */
  app.post("/api/courses/:cid/pazza/posts", async (req, res) => {
    const { cid } = req.params;
    const { authorId, authorName, authorRole, type, summary, details, folders, visibility, visibleToUserIds } = req.body;

    // Validation
    if (!summary || summary.trim().length === 0) {
      return res.status(400).send({ error: "Summary is required" });
    }
    if (summary.length > 100) {
      return res.status(400).send({ error: "Summary must be 100 characters or less" });
    }
    if (!details || details.trim().length === 0) {
      return res.status(400).send({ error: "Details are required" });
    }
    if (!folders || folders.length === 0) {
      return res.status(400).send({ error: "At least one folder must be selected" });
    }
    if (!type || !["QUESTION", "NOTE"].includes(type)) {
      return res.status(400).send({ error: "Type must be QUESTION or NOTE" });
    }

    try {
      const newPost = await pazzaDao.createPost({
        courseId: cid,
        authorId,
        authorName,
        authorRole,
        type,
        summary,
        details,
        folders,
        visibility: visibility || "ENTIRE_CLASS",
        visibleToUserIds: visibleToUserIds || [],
      });
      res.send(newPost);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * PUT /api/courses/:cid/pazza/posts/:pid
   * Update a post (edit)
   * Body: Fields to update (summary, details, etc.)
   * Returns: Updated post
   */
  app.put("/api/courses/:cid/pazza/posts/:pid", async (req, res) => {
    const { pid } = req.params;
    const updates = req.body;

    try {
      const updatedPost = await pazzaDao.updatePost(pid, updates);
      res.send(updatedPost);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * DELETE /api/courses/:cid/pazza/posts/:pid
   * Delete a post (cascades to delete answers and discussions)
   * Returns: Success message
   */
  app.delete("/api/courses/:cid/pazza/posts/:pid", async (req, res) => {
    const { pid } = req.params;

    try {
      await pazzaDao.deletePost(pid);
      res.send({ message: "Post deleted successfully" });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * PUT /api/courses/:cid/pazza/posts/:pid/visibility
   * Toggle post visibility (make private/public)
   * Body: { visibility: "ENTIRE_CLASS" | "SELECTED_STUDENTS", visibleToUserIds: [authorId] }
   * Only post author or instructors can change visibility
   * Returns: Updated post
   */
  app.put("/api/courses/:cid/pazza/posts/:pid/visibility", async (req, res) => {
    const { pid } = req.params;
    const { visibility, visibleToUserIds } = req.body;
    const currentUser = req.session?.currentUser;

    // Check authorization
    if (!currentUser) {
      return res.status(401).send({ error: "User must be logged in" });
    }

    try {
      // Get the post to check authorization
      const post = await pazzaDao.findPostById(pid);
      if (!post) {
        return res.status(404).send({ error: "Post not found" });
      }

      // Only author or instructors can change visibility
      const isAuthor = post.authorId === currentUser._id;
      const isInstructor = ["INSTRUCTOR", "FACULTY", "TA", "ADMIN"].includes(currentUser.role);
      
      if (!isAuthor && !isInstructor) {
        return res.status(403).send({ error: "You can only change visibility of your own posts" });
      }

      // Validate visibility value
      if (!["ENTIRE_CLASS", "SELECTED_STUDENTS"].includes(visibility)) {
        return res.status(400).send({ error: "Invalid visibility value" });
      }

      // Update post visibility
      const updatedPost = await pazzaDao.setPostVisibility(pid, visibility, visibleToUserIds || []);
      res.send(updatedPost);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/courses/:cid/pazza/posts/:pid/good-question
   * Toggle "good question" vote for a post (instructors only)
   * Only instructors can vote, each instructor can vote once
   * Returns: Updated post with goodQuestionCount and goodQuestionBy
   */
  app.post("/api/courses/:cid/pazza/posts/:pid/good-question", async (req, res) => {
    const { pid } = req.params;
    const currentUser = req.session?.currentUser;

    if (!currentUser) {
      return res.status(401).send({ error: "User must be logged in" });
    }

    // Only instructors can mark as good question
    const isInstructor = ["INSTRUCTOR", "FACULTY", "TA", "ADMIN"].includes(currentUser.role);
    if (!isInstructor) {
      return res.status(403).send({ error: "Only instructors can mark questions as good" });
    }

    try {
      const updatedPost = await pazzaDao.toggleGoodQuestion(pid, currentUser._id);
      res.send(updatedPost);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/courses/:cid/pazza/posts/:pid/good-answer
   * Toggle "good answer" vote for a post (any user)
   * Each user can vote once, clicking again removes vote
   * Returns: Updated post with goodAnswerCount and goodAnswerBy
   */
  app.post("/api/courses/:cid/pazza/posts/:pid/good-answer", async (req, res) => {
    const { pid } = req.params;
    const currentUser = req.session?.currentUser;

    if (!currentUser) {
      return res.status(401).send({ error: "User must be logged in" });
    }

    try {
      const updatedPost = await pazzaDao.toggleGoodAnswer(pid, currentUser._id);
      res.send(updatedPost);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  // =========================================================================
  // ANSWERS ROUTES
  // =========================================================================

  /**
   * GET /api/courses/:cid/pazza/posts/:pid/answers
   * Get all answers for a post
   * Returns: Array of answers
   */
  app.get("/api/courses/:cid/pazza/posts/:pid/answers", async (req, res) => {
    const { pid } = req.params;

    try {
      const answers = await pazzaDao.findAllAnswersForPost(pid);
      res.send(answers);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/courses/:cid/pazza/posts/:pid/answers
   * Post an answer to a question
   * Body: { authorId, authorName, authorRole, content }
   * Returns: Created answer
   */
  app.post("/api/courses/:cid/pazza/posts/:pid/answers", async (req, res) => {
    const { cid, pid } = req.params;
    const { authorId, authorName, authorRole, content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).send({ error: "Answer content is required" });
    }

    try {
      // Allow multiple answers per role; no uniqueness enforcement here
      const newAnswer = await pazzaDao.createAnswer({
        postId: pid,
        courseId: cid,
        authorId,
        authorName,
        authorRole,
        content,
      });

      // Mark post as having this type of answer
      if (authorRole === "STUDENT") {
        await pazzaDao.markHasStudentAnswer(pid);
      } else {
        await pazzaDao.markHasInstructorAnswer(pid);
      }

      res.send(newAnswer);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * PUT /api/courses/:cid/pazza/answers/:aid
   * Update an answer (edit)
   * Body: { content }
   * Returns: Updated answer
   */
  app.put("/api/courses/:cid/pazza/answers/:aid", async (req, res) => {
    const { aid } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).send({ error: "Answer content is required" });
    }

    try {
      const updatedAnswer = await pazzaDao.updateAnswer(aid, { content });
      res.send(updatedAnswer);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * DELETE /api/courses/:cid/pazza/answers/:aid
   * Delete an answer
   * Returns: Success message
   */
  app.delete("/api/courses/:cid/pazza/answers/:aid", async (req, res) => {
    const { aid } = req.params;

    try {
      await pazzaDao.deleteAnswer(aid);
      res.send({ message: "Answer deleted successfully" });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/courses/:cid/pazza/answers/:aid/good-answer
   * Toggle "good answer" vote on an answer (any user can vote)
   * Each user can vote once, clicking again removes vote
   * Returns: Updated answer with goodAnswerCount and goodAnswerBy
   */
  app.post("/api/courses/:cid/pazza/answers/:aid/good-answer", async (req, res) => {
    const { aid } = req.params;
    const currentUser = req.session?.currentUser;

    if (!currentUser) {
      return res.status(401).send({ error: "User must be logged in" });
    }

    try {
      const updatedAnswer = await pazzaDao.toggleGoodAnswerOnAnswer(aid, currentUser._id);
      res.send(updatedAnswer);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/courses/:cid/pazza/fix-answer-flags
   * Utility route to fix hasInstructorAnswer and hasStudentAnswer flags
   * Checks all posts and updates flags based on existing answers
   * Returns: Number of posts updated
   */
  app.post("/api/courses/:cid/pazza/fix-answer-flags", async (req, res) => {
    const { cid } = req.params;
    
    try {
      const posts = await pazzaDao.findAllPosts(cid);
      let updated = 0;
      
      for (const post of posts) {
        const answers = await pazzaDao.findAllAnswersForPost(post._id);
        const hasStudent = answers.some(a => a.authorRole === "STUDENT");
        const hasInstructor = answers.some(a => a.authorRole === "INSTRUCTOR");
        
        if (hasStudent !== post.hasStudentAnswer || hasInstructor !== post.hasInstructorAnswer) {
          await pazzaDao.updatePost(post._id, {
            hasStudentAnswer: hasStudent,
            hasInstructorAnswer: hasInstructor
          });
          updated++;
        }
      }
      
      res.send({ message: `Fixed ${updated} posts`, totalPosts: posts.length, updated });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  // =========================================================================
  // FOLLOW UP DISCUSSIONS ROUTES
  // =========================================================================

  /**
   * GET /api/courses/:cid/pazza/posts/:pid/discussions
   * Get all top-level discussions for a post
   * Returns: Array of discussions (only top-level, replies fetched separately)
   */
  app.get("/api/courses/:cid/pazza/posts/:pid/discussions", async (req, res) => {
    const { pid } = req.params;

    try {
      const discussions = await pazzaDao.findAllDiscussionsForPost(pid);
      res.send(discussions);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/courses/:cid/pazza/discussions/:did/replies
   * Get all replies to a specific discussion
   * Returns: Array of replies (nested replies fetched recursively by client)
   */
  app.get("/api/courses/:cid/pazza/discussions/:did/replies", async (req, res) => {
    const { did } = req.params;

    try {
      const replies = await pazzaDao.findRepliesForDiscussion(did);
      res.send(replies);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/courses/:cid/pazza/posts/:pid/discussions
   * Create a new top-level discussion
   * Body: { authorId, authorName, authorRole, content }
   * Returns: Created discussion
   */
  app.post("/api/courses/:cid/pazza/posts/:pid/discussions", async (req, res) => {
    const { cid, pid } = req.params;
    const { authorId, authorName, authorRole, content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).send({ error: "Discussion content is required" });
    }

    try {
      const newDiscussion = await pazzaDao.createDiscussion({
        postId: pid,
        courseId: cid,
        authorId,
        authorName,
        authorRole,
        content,
        parentDiscussionId: null, // Top-level
        resolved: false,
      });
      res.send(newDiscussion);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/courses/:cid/pazza/discussions/:did/replies
   * Reply to a discussion
   * Body: { authorId, authorName, authorRole, content }
   * Returns: Created reply
   */
  app.post("/api/courses/:cid/pazza/discussions/:did/replies", async (req, res) => {
    const { cid, did } = req.params;
    const { authorId, authorName, authorRole, content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).send({ error: "Reply content is required" });
    }

    try {
      // Find parent discussion to get postId
      const parentDiscussion = await pazzaDao.findAllDiscussionTreeForPost("dummy");
      // Note: In real implementation, should fetch parent to get postId
      // For now, client should provide postId in body

      const newReply = await pazzaDao.createDiscussion({
        postId: req.body.postId,
        courseId: cid,
        authorId,
        authorName,
        authorRole,
        content,
        parentDiscussionId: did,
        resolved: false,
      });
      res.send(newReply);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * PUT /api/courses/:cid/pazza/discussions/:did
   * Update a discussion (edit content or toggle resolved status)
   * Body: { content } or { resolved }
   * Returns: Updated discussion
   */
  app.put("/api/courses/:cid/pazza/discussions/:did", async (req, res) => {
    const { did } = req.params;
    const updates = req.body;

    if (updates.content && updates.content.trim().length === 0) {
      return res.status(400).send({ error: "Discussion content cannot be empty" });
    }

    try {
      const updatedDiscussion = await pazzaDao.updateDiscussion(did, updates);
      res.send(updatedDiscussion);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * DELETE /api/courses/:cid/pazza/discussions/:did
   * Delete a discussion (cascades to delete nested replies)
   * Returns: Success message
   */
  app.delete("/api/courses/:cid/pazza/discussions/:did", async (req, res) => {
    const { did } = req.params;

    try {
      await pazzaDao.deleteDiscussion(did);
      res.send({ message: "Discussion deleted successfully" });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/courses/:cid/pazza/discussions/:did/helpful
   * Toggle "helpful" vote on a discussion (any user can vote)
   * Each user can vote once, clicking again removes vote
   * Returns: Updated discussion with helpfulCount and helpfulBy
   */
  app.post("/api/courses/:cid/pazza/discussions/:did/helpful", async (req, res) => {
    const { did } = req.params;
    const currentUser = req.session?.currentUser;

    if (!currentUser) {
      return res.status(401).send({ error: "User must be logged in" });
    }

    try {
      const updatedDiscussion = await pazzaDao.toggleHelpful(did, currentUser._id);
      res.send(updatedDiscussion);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  // =========================================================================
  // FOLDERS ROUTES
  // =========================================================================

  /**
   * GET /api/courses/:cid/pazza/folders
   * Get all folders for a course
   * Returns: Array of folders
   */
  app.get("/api/courses/:cid/pazza/folders", async (req, res) => {
    const { cid } = req.params;

    try {
      const folders = await pazzaDao.findAllFolders(cid);
      res.send(folders);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/courses/:cid/pazza/folders
   * Create a new folder
   * Body: { name }
   * Returns: Created folder
   */
  app.post("/api/courses/:cid/pazza/folders", async (req, res) => {
    const { cid } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).send({ error: "Folder name is required" });
    }

    try {
      const newFolder = await pazzaDao.createFolder(cid, name);
      res.send(newFolder);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * PUT /api/courses/:cid/pazza/folders/:fid
   * Update (rename) a folder
   * Body: { name }
   * Returns: Updated folder
   */
  app.put("/api/courses/:cid/pazza/folders/:fid", async (req, res) => {
    const { fid } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).send({ error: "Folder name is required" });
    }

    try {
      const updatedFolder = await pazzaDao.updateFolder(fid, name);
      res.send(updatedFolder);
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * DELETE /api/courses/:cid/pazza/folders/:fid
   * Delete a folder
   * Returns: Success message
   */
  app.delete("/api/courses/:cid/pazza/folders/:fid", async (req, res) => {
    const { fid } = req.params;

    try {
      await pazzaDao.deleteFolder(fid);
      res.send({ message: "Folder deleted successfully" });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

  /**
   * DELETE /api/courses/:cid/pazza/folders
   * Delete multiple folders
   * Body: { folderIds: ["id1", "id2", ...] }
   * Returns: Success message
   */
  app.delete("/api/courses/:cid/pazza/folders", async (req, res) => {
    const { folderIds } = req.body;

    if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
      return res.status(400).send({ error: "At least one folder ID is required" });
    }

    try {
      await pazzaDao.deleteFolders(folderIds);
      res.send({ message: "Folders deleted successfully" });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });
}
