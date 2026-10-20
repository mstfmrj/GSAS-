






import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/helpers/server/getAuthUser";
import { errorResponse, successResponse } from "@/lib/server/api-response";
import { getProjectFileById, deleteProjectFile } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser(req);
    if (!user) return errorResponse("Authentication required", 401);

    const { id } = await context.params;
    const file = await getProjectFileById(id);

    if (!file) {
      return errorResponse("File not found", 404);
    }

    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download") === "1";


    let buffer: Buffer;
    let mimeType = file.mimeType || "application/octet-stream";

    if (file.fileData) {
      if (file.fileData.startsWith("data:")) {
        const commaIdx = file.fileData.indexOf(",");
        if (commaIdx !== -1) {
          const header = file.fileData.slice(0, commaIdx);
          const dataMime = header.split(";")[0]?.replace("data:", "");
          if (dataMime) mimeType = dataMime;
          buffer = Buffer.from(file.fileData.slice(commaIdx + 1), "base64");
        } else {
          buffer = Buffer.from(file.fileData, "base64");
        }
      } else {
        buffer = Buffer.from(file.fileData, "base64");
      }
    } else {
      return errorResponse("File content is empty", 404);
    }

    const disposition = download ? "attachment" : "inline";
    const encodedName = encodeURIComponent(file.fileName);
    const safeAsciiName = file.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodedName}; filename="${safeAsciiName || "file"}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    console.error("Error serving project file:", err);
    return errorResponse(err instanceof Error ? err.message : "Failed to serve file", 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);

  const { id } = await context.params;
  const success = await deleteProjectFile(id);

  if (!success) {
    return errorResponse("File not found or already deleted", 404);
  }

  return successResponse({ success: true, message: "File deleted successfully" });
}
