const BASE = "/api";

export async function createUser(name: string, city: string) {
  const res = await fetch(`${BASE}/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, city }),
  });
  if (!res.ok) throw new Error("Failed to create user");
  return res.json();
}

export async function getUser(userId: number) {
  const res = await fetch(`${BASE}/user/${userId}`);
  if (!res.ok) throw new Error("User not found");
  return res.json();
}

export async function uploadTransactions(file: File, userId: number) {
  const form = new FormData();
  form.append("file", file);
  form.append("user_id", String(userId));
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function getTransactions(userId: number) {
  const res = await fetch(`${BASE}/transactions/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function getActions(userId: number) {
  const res = await fetch(`${BASE}/actions/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch actions");
  return res.json();
}

export async function getStory(userId: number) {
  const res = await fetch(`${BASE}/story/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch story");
  return res.json();
}

export async function getMapPoints(userId: number, lat: number, lon: number) {
  const res = await fetch(`${BASE}/map/${userId}?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error("Failed to fetch map points");
  return res.json();
}

export async function getCircles(userId: number) {
  const res = await fetch(`${BASE}/circles/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch circles");
  return res.json();
}

export async function joinCircle(userId: number, code: string) {
  const res = await fetch(`${BASE}/circles/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to join circle");
  }
  return res.json();
}

export async function createCircle(userId: number, name: string) {
  const res = await fetch(`${BASE}/circles/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, name }),
  });
  if (!res.ok) throw new Error("Failed to create circle");
  return res.json();
}

export async function getCalendar(userId: number) {
  const res = await fetch(`${BASE}/calendar/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch calendar");
  return res.json();
}

export async function getCityRank(userId: number) {
  const res = await fetch(`${BASE}/city-rank/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch city rank");
  return res.json();
}

export async function getMilestones(userId: number) {
  const res = await fetch(`${BASE}/milestones/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch milestones");
  return res.json();
}

export async function markMilestonesNotified(userId: number, milestoneIds: string[]) {
  const res = await fetch(`${BASE}/milestones/${userId}/mark-notified`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(milestoneIds),
  });
  if (!res.ok) throw new Error("Failed to mark milestones notified");
  return res.json();
}
