import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { adminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTIONS = [
  "weatherForecastSnapshots",
  "weatherResolvedResults",
  "trackedWeatherEvents",
] as const;

async function limitedCount(uid: string, collectionName: string, limit = 1000) {
  const snapshot = await adminDb
    .collection("users")
    .doc(uid)
    .collection(collectionName)
    .limit(limit)
    .get();

  return {
    name: collectionName,
    count: snapshot.size,
    limited: snapshot.size >= limit,
    docs: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown>>,
  };
}

function statusCounts(docs: Array<Record<string, unknown>>) {
  const statuses: Record<string, number> = {};
  let needsAttention = 0;

  for (const doc of docs) {
    const status = typeof doc.status === "string" ? doc.status : "unknown";
    statuses[status] = (statuses[status] ?? 0) + 1;
    if (status === "needs_review" || status === "error") needsAttention += 1;
  }

  return { statuses, needsAttention };
}

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const counted = await Promise.all(COLLECTIONS.map((name) => limitedCount(user.uid, name)));
    const tracked = counted.find((item) => item.name === "trackedWeatherEvents");

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      collections: counted.map(({ name, count, limited }) => ({ name, count, limited })),
      tracking: statusCounts(tracked?.docs ?? []),
    });
  } catch (error) {
    console.error("Weather admin summary failed:", error);
    const message = error instanceof Error ? error.message : "Unknown admin summary error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
