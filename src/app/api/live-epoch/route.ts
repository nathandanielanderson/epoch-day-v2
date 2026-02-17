import { NextResponse } from "next/server";
import { getLiveEpochInfo } from "@/lib/solana";

export async function GET() {
    try {
        const info = await getLiveEpochInfo();
        return NextResponse.json(info);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch live epoch" }, { status: 500 });
    }
}
