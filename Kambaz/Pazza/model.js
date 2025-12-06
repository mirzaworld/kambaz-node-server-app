/**
 * PAZZA MODELS
 * Mongoose models for Pazza collections
 */

import mongoose from "mongoose";
import {
  postsSchema,
  answersSchema,
  followUpDiscussionSchema,
  foldersSchema,
} from "./schema.js";

// Create models from schemas
const postsModel = mongoose.model("posts", postsSchema);
const answersModel = mongoose.model("answers", answersSchema);
const followUpDiscussionModel = mongoose.model(
  "followUpDiscussions",
  followUpDiscussionSchema
);
const foldersModel = mongoose.model("folders", foldersSchema);

export {
  postsModel,
  answersModel,
  followUpDiscussionModel,
  foldersModel,
};
