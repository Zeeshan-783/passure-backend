import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICompany extends Document {
  companyName: string;
  companyID: number;
  noOfUsers: number;
  companyUserIDs: Types.ObjectId[];
  companyUserLimit: number;
  creatorID: Types.ObjectId;
  companyLogo?: string;
}

const CompanySchema = new Schema(
  {
    companyName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // taake duplicate name avoid ho jae (case-insensitive)
    },
    companyID: {
      type: Number,
      required: true,
      unique: true,
    },
    noOfUsers: {
      type: Number,
      required: true,
      default: 1,
    },
    companyUserIDs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    companyUserLimit: {
      type: Number,
      default: 10, // fallback agar env se na mile
    },
    creatorID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyLogo: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICompany>("Company", CompanySchema);
