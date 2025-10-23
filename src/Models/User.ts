import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  fullname?: string;
  username: string;
  userID?: number; // optional now
  email: string;
  password?: string; // optional now
  profileImg?: string;
  companyID?: Types.ObjectId | null;
  googleId?: string; // added for Google OAuth
  provider?: string; // "local" | "google" | "github"
  oneSignalPlayerId?: Types.ObjectId | null;       
}

const UserSchema: Schema = new Schema(
  {
    fullname: { type: String },
    username: { type: String, required: true },
    userID: { type: Number }, // no longer required
    email: { type: String, required: true, unique: true },
    password: { type: String }, // no longer required
    profileImg: { type: String },
    companyID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    googleId: { type: String, unique: true, sparse: true },
    provider: { type: String, default: "local" },
    oneSignalPlayerId: {type:String, default: null}
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
