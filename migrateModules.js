import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONNECTION_STRING = process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/kambaz";

mongoose.connect(CONNECTION_STRING);

const moduleSchema = new mongoose.Schema({
  _id: String,
  name: String,
  description: String,
  lessons: [{ _id: String, name: String, description: String }],
});

const courseSchema = new mongoose.Schema(
  {
    _id: String,
    name: String,
    number: String,
    credits: Number,
    description: String,
    modules: [moduleSchema]
  },
  { collection: "courses" }
);

const Course = mongoose.model("Course", courseSchema);

async function migrateModules() {
  try {
    // Read modules from the JSON file
    const modulesPath = join(__dirname, '../kambaz-next-js/app/(kambaz)/database/modules.json');
    const modulesData = JSON.parse(fs.readFileSync(modulesPath, 'utf8'));
    
    console.log(`Found ${modulesData.length} modules to migrate`);
    
    // Group modules by course
    const modulesByCourse = {};
    modulesData.forEach(module => {
      if (!modulesByCourse[module.course]) {
        modulesByCourse[module.course] = [];
      }
      modulesByCourse[module.course].push({
        _id: module._id,
        name: module.name,
        description: module.description,
        lessons: module.lessons || []
      });
    });
    
    // Update each course with its modules
    for (const [courseId, modules] of Object.entries(modulesByCourse)) {
      const result = await Course.updateOne(
        { _id: courseId },
        { $set: { modules: modules } }
      );
      console.log(`Updated course ${courseId} with ${modules.length} modules`);
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateModules();
