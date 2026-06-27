import { adminAuth } from "@/lib/firebase/admin";

export async function getServerUserFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authorization.replace("Bearer ", "").trim();

  if (!idToken) {
    return null;
  }

  try {
    return await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error("Failed to verify Firebase ID token:", error);
    return null;
  }
}