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

async function readCollection(uid: string, collectionName: string, limit = 2000) {
  const snapshot = await adminDb
    .collection("users")
    .doc(uid)
    .collection(collectionName)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get()
    .catch(async () => {
      return adminDb.collection("users").doc(uid).collection(collectionName).limit(limit).get();
    });

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const entries = await Promise.all(
      COLLECTIONS.map(async (name) => [name, await readCollection(user.uid, name)] as const)
    );

    const payload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      userId: user.uid,
      collections: Object.fromEntries(entries),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="kalshi-weather-history-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Weather admin export failed:", error);
    const message = error instanceof Error ? error.message : "Unknown admin export error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
