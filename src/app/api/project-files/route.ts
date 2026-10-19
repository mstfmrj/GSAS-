







import { NextRequest } from "next/server";
import { getAuthUser } from "@/helpers/server/getAuthUser";
import { errorResponse, successResponse } from "@/lib/server/api-response";
import { addProjectFile, getProjectFiles } from "@/lib/db";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const VIDEO_EXTENSIONS = new Set([
  "mp4", "m4v", "mov", "avi", "mkv", "webm", "wmv", "flv", "3gp", "3g2",
  "ogv", "ts", "mts", "m2ts", "vob", "divx", "f4v"
]);

function isVideoFile(fileName: string, mimeType: string): boolean {
  if (mimeType && mimeType.toLowerCase().startsWith("video/")) {
    return true;
  }
  const ext = fileName.split(".").pop()?.toLowerCase();
  return Boolean(ext && VIDEO_EXTENSIONS.has(ext));
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const projectType = searchParams.get("projectType") || "gsas";

  if (!projectId) {
    return errorResponse("projectId parameter is required", 400);
  }

  try {
    const files = await getProjectFiles(projectId, projectType);
    return successResponse(files);
  } catch (err: any) {
    console.error("Failed to fetch project files:", err);
    return errorResponse("Failed to load project files", 500);
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);

  try {
    const contentType = req.headers.get("content-type") || "";

    let projectId = "";
    let projectType = "gsas";
    let fileName = "";
    let fileSize = 0;
    let mimeType = "";
    let fileData = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      projectId = (formData.get("projectId") as string) || "";
      projectType = (formData.get("projectType") as string) || "gsas";

      if (!file) {
        return errorResponse("No file was uploaded", 400);
      }

      fileName = file.name;
      fileSize = file.size;
      mimeType = file.type || "application/octet-stream";

      if (isVideoFile(fileName, mimeType)) {
        return errorResponse("Video files are not allowed. Please choose another file type.", 400);
      }

      if (fileSize > MAX_FILE_SIZE) {
        return errorResponse("File size exceeds the 10 MB limit.", 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      fileData = `data:${mimeType};base64,${buffer.toString("base64")}`;
    } else {

      const body = await req.json();
      projectId = body.projectId || "";
      projectType = body.projectType || "gsas";
      fileName = body.fileName || "";
      fileSize = body.fileSize || 0;
      mimeType = body.mimeType || "application/octet-stream";
      fileData = body.fileData || "";

      if (!fileData) {
        return errorResponse("File data is required", 400);
      }

      if (isVideoFile(fileName, mimeType)) {
        return errorResponse("Video files are not allowed. Please choose another file type.", 400);
      }

      if (fileSize > MAX_FILE_SIZE) {
        return errorResponse("File size exceeds the 10 MB limit.", 400);
      }
    }

    if (!projectId) {
      return errorResponse("projectId is required", 400);
    }
    if (!fileName) {
      return errorResponse("fileName is required", 400);
    }

    const saved = await addProjectFile({
      projectId,
      projectType,
      fileName,
      fileSize,
      mimeType,
      fileData,
      createdBy: String(user.username || user.userId || "user"),
    });

    return successResponse(saved, 201);
  } catch (err: any) {
    console.error("Failed to upload project file:", err);
    return errorResponse(err?.message || "Failed to upload file", 500);
  }
}
