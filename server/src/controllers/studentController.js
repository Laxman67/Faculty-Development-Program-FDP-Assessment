import mongoose from "mongoose";
import Student from "../models/Student.js";
import { buildStudentQuery, StudentQueryError } from "../utils/studentQuery.js";
import { getStudentWriteError } from "../utils/studentErrors.js";

const studentFields = ["name", "email", "course", "status"];

function getStudentFields(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  return Object.fromEntries(
    studentFields
      .filter((field) => Object.hasOwn(body, field))
      .map((field) => [field, body[field]])
  );
}

function sendWriteError(error, res) {
  const result = getStudentWriteError(error, mongoose);
  return res.status(result.status).json({ success: false, message: result.message });
}

export async function listStudents(req, res) {
  try {
    const { filter, page, pageSize } = buildStudentQuery(req.query);
    const databaseFilter = {};
    if (filter.status) databaseFilter.status = filter.status;
    if (filter.search) {
      const escapedSearch = filter.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchExpression = new RegExp(escapedSearch, "i");
      databaseFilter.$or = [{ name: searchExpression }, { email: searchExpression }];
    }

    const [students, total] = await Promise.all([
      Student.find(databaseFilter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
      Student.countDocuments(databaseFilter),
    ]);
    return res.status(200).json({
      success: true,
      data: students,
      pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    if (error instanceof StudentQueryError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Unable to load students" });
  }
}

export async function createStudent(req, res) {
  try {
    const fields = getStudentFields(req.body);
    if (!fields) {
      return res.status(400).json({ success: false, message: "Request body must be a JSON object" });
    }
    const student = await Student.create(fields);
    return res.status(201).json({ success: true, data: student });
  } catch (error) {
    return sendWriteError(error, res);
  }
}

export async function updateStudent(req, res) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ success: false, message: "Student ID is invalid" });
    }
    const fields = getStudentFields(req.body);
    if (!fields) {
      return res.status(400).json({ success: false, message: "Request body must be a JSON object" });
    }
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: "At least one student field is required" });
    }

    const student = await Student.findByIdAndUpdate(req.params.id, { $set: fields }, {
      new: true,
      runValidators: true,
    });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    return res.status(200).json({ success: true, data: student });
  } catch (error) {
    return sendWriteError(error, res);
  }
}