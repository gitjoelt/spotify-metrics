import { NextRequest, NextResponse } from "next/server";
import { parseExtendedHistoryFile } from "@/lib/importHistory";
import { insertPlays, type PlayInput } from "@/lib/plays";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: "No files uploaded" }, { status: 400 });
    }

    let totalParsed = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    const fileResults: { name: string; parsed: number; error?: string }[] = [];

    for (const file of files) {
      const text = await file.text();
      try {
        const entries: PlayInput[] = parseExtendedHistoryFile(text);
        totalParsed += entries.length;
        const result = await insertPlays(entries);
        totalInserted += result.inserted;
        totalSkipped += result.skipped;
        fileResults.push({ name: file.name, parsed: entries.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        fileResults.push({ name: file.name, parsed: 0, error: message });
      }
    }

    return NextResponse.json({
      ok: true,
      files: fileResults,
      totalParsed,
      totalInserted,
      totalSkipped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
