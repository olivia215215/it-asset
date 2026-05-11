import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, AuthError } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    return NextResponse.json({ user: authUser });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
