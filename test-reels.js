import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "backend", ".env") });

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");
  const Reel = mongoose.model("Reel", new mongoose.Schema({}, { strict: false }));
  const count = await Reel.countDocuments({ status: "approved" });
  console.log("Total approved reels:", count);
  const allCount = await Reel.countDocuments();
  console.log("Total reels (all statuses):", allCount);
  process.exit(0);
}
test();
