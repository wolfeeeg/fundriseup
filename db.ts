import mongoose, { ConnectOptions } from "mongoose";
import "dotenv/config";

export async function connectDB(
  readPreference: ConnectOptions["readPreference"] = "primary"
) {
  const uri = process.env.DB_URI;
  if (!uri) {
    throw new Error("DB_URI environment variable is not defined");
  }

  try {
    return mongoose.connect(uri, { readPreference });
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
}
