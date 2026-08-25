import { NextRequest, NextResponse } from "next/server";
import { disconnect } from "@/lib/spotify";

export async function POST(request: NextRequest) {
  await disconnect();
  return NextResponse.redirect(new URL("/", request.url));
}
