import mongoose from "mongoose";

const { Schema, model } = mongoose;
const opts = { timestamps: true, versionKey: false };

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  opts
);

const boardSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  opts
);
boardSchema.index({ members: 1 });

export const STATUSES = ["todo", "doing", "done"];
export const PRIORITIES = ["low", "medium", "high", "urgent"];
export const LABELS = ["bug", "feature", "design", "frontend", "backend", "devops", "docs"];

const taskSchema = new Schema(
  {
    board: { type: Schema.Types.ObjectId, ref: "Board", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    status: { type: String, enum: STATUSES, default: "todo" },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    labels: [{ type: String, enum: LABELS }],
    dueDate: { type: Date, default: null },
    position: { type: Number, default: 0 },
    assignee: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  opts
);
taskSchema.index({ board: 1, status: 1, position: 1 });

export const User = model("User", userSchema);
export const Board = model("Board", boardSchema);
export const Task = model("Task", taskSchema);
