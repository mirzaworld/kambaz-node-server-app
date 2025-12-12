/**
 * PAZZA DATA ACCESS OBJECT (DAO)
 * Encapsulates all database operations for Pazza:
 * - Posts CRUD
 * - Answers CRUD
 * - FollowUp Discussions CRUD
 * - Folders CRUD
 */

import {
  postsModel,
  answersModel,
  followUpDiscussionModel,
  foldersModel,
} from "./model.js";

// ============================================================================
// POSTS DAO
// ============================================================================

/**
 * Create a new post (Question or Note)
 * @param {Object} post - { courseId, authorId, authorName, authorRole, type, summary, details, folders, visibility, visibleToUserIds }
 * @returns {Promise<Object>} Created post document
 */
export async function createPost(post) {
  const newPost = new postsModel(post);
  return newPost.save();
}

/**
 * Get all posts for a course
 * @param {String} courseId - Course ID
 * @returns {Promise<Array>} Array of posts
 */
export async function findAllPosts(courseId) {
  return postsModel.find({ courseId }).sort({ createdAt: -1 }); // Newest first
}

/**
 * Get posts filtered by folder
 * @param {String} courseId - Course ID
 * @param {String} folder - Folder name (hw1, hw2, project, etc.)
 * @returns {Promise<Array>} Array of posts in that folder
 */
export async function findPostsByFolder(courseId, folder) {
  return postsModel
    .find({ courseId, folders: folder })
    .sort({ createdAt: -1 });
}

/**
 * Get drafts for a specific author (private to user)
 * @param {String} courseId - Course ID
 * @param {String} authorId - Author user ID
 * @returns {Promise<Array>} Array of draft posts by this author
 */
export async function findDraftsByAuthor(courseId, authorId) {
  return postsModel
    .find({ courseId, authorId, isDraft: true })
    .sort({ createdAt: -1 });
}

/**
 * Get a specific post by ID
 * @param {String} postId - Post ID
 * @returns {Promise<Object>} Post document
 */
export async function findPostById(postId) {
  return postsModel.findById(postId);
}

/**
 * Search posts by summary and details (contains keyword)
 * @param {String} courseId - Course ID
 * @param {String} keyword - Search term
 * @returns {Promise<Array>} Matching posts
 */
export async function searchPosts(courseId, keyword) {
  return postsModel.find({
    courseId,
    $or: [
      { summary: { $regex: keyword, $options: "i" } }, // Case-insensitive
      { details: { $regex: keyword, $options: "i" } },
    ],
  });
}

/**
 * Update a post (edit)
 * @param {String} postId - Post ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated post
 */
export async function updatePost(postId, updates) {
  return postsModel.findByIdAndUpdate(postId, updates, { new: true });
}

/**
 * Delete a post (and cascade delete answers and discussions)
 * @param {String} postId - Post ID
 * @returns {Promise<void>}
 */
export async function deletePost(postId) {
  // Delete post
  await postsModel.findByIdAndDelete(postId);
  // Delete associated answers
  await answersModel.deleteMany({ postId });
  // Delete associated discussions
  await followUpDiscussionModel.deleteMany({ postId });
}

/**
 * Increment view count when user views post
 * @param {String} postId - Post ID
 * @returns {Promise<Object>} Updated post
 */
export async function incrementViewCount(postId) {
  return postsModel.findByIdAndUpdate(
    postId,
    { $inc: { viewCount: 1 } },
    { new: true }
  );
}

/**
 * Update post when student answer is posted
 * @param {String} postId - Post ID
 * @returns {Promise<Object>} Updated post
 */
export async function markHasStudentAnswer(postId) {
  return postsModel.findByIdAndUpdate(
    postId,
    { hasStudentAnswer: true },
    { new: true }
  );
}

/**
 * Update post when instructor answer is posted
 * @param {String} postId - Post ID
 * @returns {Promise<Object>} Updated post
 */
export async function markHasInstructorAnswer(postId) {
  return postsModel.findByIdAndUpdate(
    postId,
    { hasInstructorAnswer: true },
    { new: true }
  );
}

/**
 * Set post visibility (make private or public)
 * @param {String} postId - Post ID
 * @param {String} visibility - "ENTIRE_CLASS" or "SELECTED_STUDENTS"
 * @param {Array} visibleToUserIds - User IDs who can see (if SELECTED_STUDENTS)
 * @returns {Promise<Object>} Updated post
 */
export async function setPostVisibility(postId, visibility, visibleToUserIds = []) {
  return postsModel.findByIdAndUpdate(
    postId,
    { 
      visibility,
      visibleToUserIds: visibility === "SELECTED_STUDENTS" ? visibleToUserIds : []
    },
    { new: true }
  );
}

/**
 * Toggle good question vote for a post (instructors only)
 * @param {String} postId - Post ID
 * @param {String} userId - User ID of instructor voting
 * @returns {Promise<Object>} Updated post
 */
export async function toggleGoodQuestion(postId, userId) {
  const post = await postsModel.findById(postId);
  if (!post) throw new Error("Post not found");

  const goodQuestionBy = post.goodQuestionBy || [];
  const index = goodQuestionBy.indexOf(userId);

  if (index > -1) {
    // User already voted, remove vote
    goodQuestionBy.splice(index, 1);
  } else {
    // Add vote
    goodQuestionBy.push(userId);
  }

  return postsModel.findByIdAndUpdate(
    postId,
    { 
      goodQuestionBy,
      goodQuestionCount: goodQuestionBy.length
    },
    { new: true }
  );
}

/**
 * Toggle good answer vote for a post
 * @param {String} postId - Post ID
 * @param {String} userId - User ID voting
 * @returns {Promise<Object>} Updated post
 */
export async function toggleGoodAnswer(postId, userId) {
  const post = await postsModel.findById(postId);
  if (!post) throw new Error("Post not found");

  const goodAnswerBy = post.goodAnswerBy || [];
  const index = goodAnswerBy.indexOf(userId);

  if (index > -1) {
    // User already voted, remove vote
    goodAnswerBy.splice(index, 1);
  } else {
    // Add vote
    goodAnswerBy.push(userId);
  }

  return postsModel.findByIdAndUpdate(
    postId,
    { 
      goodAnswerBy,
      goodAnswerCount: goodAnswerBy.length
    },
    { new: true }
  );
}

// ============================================================================
// ANSWERS DAO
// ============================================================================

/**
 * Create an answer to a question
 * @param {Object} answer - { postId, courseId, authorId, authorName, authorRole, content }
 * @returns {Promise<Object>} Created answer
 */
export async function createAnswer(answer) {
  try {
    const newAnswer = new answersModel(answer);
    return await newAnswer.save();
  } catch (error) {
    // If the legacy unique index (postId_1_authorRole_1) still exists, drop it and retry once
    if (error?.code === 11000) {
      try {
        await answersModel.collection.dropIndex("postId_1_authorRole_1");
        const retryAnswer = new answersModel(answer);
        return await retryAnswer.save();
      } catch (dropErr) {
        // If drop fails or retry fails, bubble original error
        throw error;
      }
    }
    throw error;
  }
}

/**
 * Get answer(s) for a post by role
 * @param {String} postId - Post ID
 * @param {String} authorRole - "STUDENT" or "INSTRUCTOR"
 * @returns {Promise<Object|null>} Answer document or null if not found
 */
export async function findAnswerByPostAndRole(postId, authorRole) {
  return answersModel.findOne({ postId, authorRole });
}

/**
 * Get all answers for a post
 * @param {String} postId - Post ID
 * @returns {Promise<Array>} Array of answers
 */
export async function findAllAnswersForPost(postId) {
  return answersModel.find({ postId }).sort({ createdAt: 1 }); // Oldest first
}

/**
 * Update an answer (edit)
 * @param {String} answerId - Answer ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated answer
 */
export async function updateAnswer(answerId, updates) {
  return answersModel.findByIdAndUpdate(answerId, updates, { new: true });
}

/**
 * Delete an answer
 * @param {String} answerId - Answer ID
 * @returns {Promise<Object>} Deleted answer
 */
export async function deleteAnswer(answerId) {
  return answersModel.findByIdAndDelete(answerId);
}

/**
 * Toggle good answer vote on an answer
 * @param {String} answerId - Answer ID
 * @param {String} userId - User ID voting
 * @returns {Promise<Object>} Updated answer
 */
export async function toggleGoodAnswerOnAnswer(answerId, userId) {
  const answer = await answersModel.findById(answerId);
  if (!answer) throw new Error("Answer not found");

  const goodAnswerBy = answer.goodAnswerBy || [];
  const index = goodAnswerBy.indexOf(userId);

  if (index > -1) {
    // User already voted, remove vote
    goodAnswerBy.splice(index, 1);
  } else {
    // Add vote
    goodAnswerBy.push(userId);
  }

  return answersModel.findByIdAndUpdate(
    answerId,
    { 
      goodAnswerBy,
      goodAnswerCount: goodAnswerBy.length
    },
    { new: true }
  );
}

// ============================================================================
// FOLLOW UP DISCUSSIONS DAO
// ============================================================================

/**
 * Create a new discussion or reply
 * @param {Object} discussion - { postId, courseId, authorId, authorName, authorRole, content, parentDiscussionId, resolved }
 * @returns {Promise<Object>} Created discussion
 */
export async function createDiscussion(discussion) {
  const newDiscussion = new followUpDiscussionModel(discussion);
  return newDiscussion.save();
}

/**
 * Get all top-level discussions for a post (parentDiscussionId is null)
 * @param {String} postId - Post ID
 * @returns {Promise<Array>} Array of discussions
 */
export async function findAllDiscussionsForPost(postId) {
  return followUpDiscussionModel
    .find({ postId, parentDiscussionId: null })
    .sort({ createdAt: -1 }); // Newest first
}

// Fetch a single discussion by id
export async function findDiscussionById(discussionId) {
  return followUpDiscussionModel.findById(discussionId);
}

// Fetch top-level discussions with their first-level replies attached
export async function findDiscussionsWithReplies(postId) {
  const discussions = await followUpDiscussionModel
    .find({ postId, parentDiscussionId: null })
    .sort({ createdAt: -1 });

  const buildReplies = async (discussionId) => {
    const replies = await followUpDiscussionModel
      .find({ parentDiscussionId: discussionId })
      .sort({ createdAt: 1 });

    return Promise.all(
      replies.map(async (reply) => ({
        ...reply.toObject(),
        replies: await buildReplies(reply._id),
      }))
    );
  };

  const withReplies = await Promise.all(
    discussions.map(async (discussion) => ({
      ...discussion.toObject(),
      replies: await buildReplies(discussion._id),
    }))
  );

  return withReplies;
}

/**
 * Get all replies to a specific discussion (parentDiscussionId matches)
 * @param {String} discussionId - Parent discussion ID
 * @returns {Promise<Array>} Array of replies
 */
export async function findRepliesForDiscussion(discussionId) {
  return followUpDiscussionModel
    .find({ parentDiscussionId: discussionId })
    .sort({ createdAt: 1 }); // Oldest first
}

/**
 * Get all discussions and nested replies for a post (full tree)
 * @param {String} postId - Post ID
 * @returns {Promise<Array>} Array of all discussions/replies
 */
export async function findAllDiscussionTreeForPost(postId) {
  return followUpDiscussionModel
    .find({ postId })
    .sort({ createdAt: 1 }); // Process in order for building tree
}

/**
 * Update a discussion (edit content or toggle resolved status)
 * @param {String} discussionId - Discussion ID
 * @param {Object} updates - Fields to update (content, resolved)
 * @returns {Promise<Object>} Updated discussion
 */
export async function updateDiscussion(discussionId, updates) {
  return followUpDiscussionModel.findByIdAndUpdate(discussionId, updates, {
    new: true,
  });
}

/**
 * Delete a discussion and all its nested replies
 * @param {String} discussionId - Discussion ID
 * @returns {Promise<void>}
 */
export async function deleteDiscussion(discussionId) {
  // Find all nested replies recursively
  const getAllNestedReplies = async (id) => {
    const replies = await followUpDiscussionModel.find({ parentDiscussionId: id });
    let allReplies = [...replies];
    for (const reply of replies) {
      const nestedReplies = await getAllNestedReplies(reply._id.toString());
      allReplies = allReplies.concat(nestedReplies);
    }
    return allReplies;
  };

  // Get all nested replies
  const nestedReplies = await getAllNestedReplies(discussionId);
  const replyIds = nestedReplies.map((r) => r._id);

  // Delete discussion and all nested replies
  await followUpDiscussionModel.deleteMany({
    _id: { $in: [discussionId, ...replyIds] },
  });
}

/**
 * Toggle helpful vote on a discussion
 * @param {String} discussionId - Discussion ID
 * @param {String} userId - User ID voting
 * @returns {Promise<Object>} Updated discussion
 */
export async function toggleHelpful(discussionId, userId) {
  const discussion = await followUpDiscussionModel.findById(discussionId);
  if (!discussion) throw new Error("Discussion not found");

  const helpfulBy = discussion.helpfulBy || [];
  const index = helpfulBy.indexOf(userId);

  if (index > -1) {
    // User already voted, remove vote
    helpfulBy.splice(index, 1);
  } else {
    // Add vote
    helpfulBy.push(userId);
  }

  return followUpDiscussionModel.findByIdAndUpdate(
    discussionId,
    { 
      helpfulBy,
      helpfulCount: helpfulBy.length
    },
    { new: true }
  );
}

// ============================================================================
// FOLDERS DAO
// ============================================================================

/**
 * Get default folders (called when course first created)
 * @returns {Array} Array of default folder names
 */
export function getDefaultFolders() {
  return [
    "hw1",
    "hw2",
    "hw3",
    "hw4",
    "hw5",
    "hw6",
    "project",
    "exam",
    "logistics",
    "other",
    "office_hours",
  ];
}

/**
 * Create default folders for a new course
 * @param {String} courseId - Course ID
 * @returns {Promise<Array>} Created folder documents
 */
export async function createDefaultFolders(courseId) {
  const defaultFolders = getDefaultFolders();
  const folderDocs = defaultFolders.map((name) => ({
    courseId,
    name,
  }));
  return foldersModel.insertMany(folderDocs);
}

/**
 * Get all folders for a course
 * @param {String} courseId - Course ID
 * @returns {Promise<Array>} Array of folders sorted by creation order
 */
export async function findAllFolders(courseId) {
  return foldersModel
    .find({ courseId })
    .sort({ createdAt: 1 }); // Maintain creation order
}

/**
 * Create a new folder
 * @param {String} courseId - Course ID
 * @param {String} name - Folder name
 * @returns {Promise<Object>} Created folder
 */
export async function createFolder(courseId, name) {
  const folder = new foldersModel({ courseId, name });
  return folder.save();
}

/**
 * Update folder (rename)
 * @param {String} folderId - Folder ID
 * @param {String} newName - New folder name
 * @returns {Promise<Object>} Updated folder
 */
export async function updateFolder(folderId, newName) {
  return foldersModel.findByIdAndUpdate(folderId, { name: newName }, { new: true });
}

/**
 * Delete a folder
 * @param {String} folderId - Folder ID
 * @returns {Promise<Object>} Deleted folder
 */
export async function deleteFolder(folderId) {
  return foldersModel.findByIdAndDelete(folderId);
}

/**
 * Delete multiple folders
 * @param {Array<String>} folderIds - Array of folder IDs
 * @returns {Promise<Object>} Delete result
 */
export async function deleteFolders(folderIds) {
  return foldersModel.deleteMany({ _id: { $in: folderIds } });
}

/**
 * Create folders for any assignments that don't already have a folder
 * @param {String} courseId - Course ID
 * @param {Array<Object>} assignments - Array of assignment objects with `title`
 * @returns {Promise<Array>} Newly created folder documents
 */
export async function syncFoldersWithAssignments(courseId, assignments = []) {
  // Build a case-insensitive set of existing folder names to avoid duplicates
  const existingFolders = await findAllFolders(courseId);
  const existingNames = new Set(
    existingFolders.map((f) => (f.name || "").trim().toLowerCase())
  );

  const foldersToCreate = [];

  assignments.forEach((assignment) => {
    const title = (assignment?.title || "").trim();
    if (!title) return;
    const key = title.toLowerCase();
    if (!existingNames.has(key)) {
      existingNames.add(key);
      foldersToCreate.push({ courseId, name: title });
    }
  });

  if (foldersToCreate.length === 0) {
    return [];
  }

  return foldersModel.insertMany(foldersToCreate);
}
