// Verbum — "순간의 말씀" (moment verse) push notifications.
//
// Everything here is server-side on purpose: a client-side setTimeout/
// setInterval can't fire once the PWA is closed, so this has to live
// somewhere that keeps running without the app open. This project had no
// Cloud Functions (or any other server) before this file, so there is
// nothing pre-existing to reconcile with — this is the first one.
//
// Two scheduled jobs:
//   - generateDailyPlans   — once at 00:00 Asia/Seoul, picks each enabled
//                            user's verses for the day and freezes the plan.
//   - sendDueMomentVerses  — every minute, sends whatever is due *this*
//                            minute and marks it sent.
// …plus one Firestore trigger (onUserNotificationSettingsWritten) so
// enabling the feature, or changing dailyCount, mid-day takes effect the
// same day instead of waiting for tomorrow's midnight run.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

const SEOUL_TZ = "Asia/Seoul";
const MOMENT_VERSES = require("./moment-verses.json"); // [{time:"HH:MM", book, chapter, verse, text}], 51 fixed entries — see project spec.

// notificationDailyPlans docs are write-only scaffolding: once their day has
// passed nothing ever reads them again (sendDueMomentVerses only queries
// date == today, no client touches the collection at all), so they'd just
// pile up one-per-enabled-user-per-day forever. generateDailyPlans sweeps
// out the old ones each midnight — but first rolls each doomed day up into a
// single notificationDailyStats/{date} summary doc (per-user target vs
// scheduled vs sent counts) so the long-term delivery-health record
// survives while the bulky per-verse detail doesn't. Keep this many days
// *before* today live as a buffer so a morning "I didn't get last night's
// verse" report still has full detail to inspect; 0 = keep only today.
const PLAN_RETENTION_DAYS = 1;

// ---------------------------------------------------------------- helpers --

function seoulNow() {
  // en-CA gives YYYY-MM-DD directly; re-parsed pieces below give HH:MM
  // without pulling in a date library for two field reads.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hhmm: `${get("hour")}:${get("minute")}`,
  };
}

// The oldest plan `date` string to keep. Anything strictly less than this
// gets deleted. Subtracting whole days in real ms then reading back the
// Seoul calendar date is exact here — Korea has no DST.
function retentionCutoffDate() {
  const past = new Date(Date.now() - PLAN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(past);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function clampDailyCount(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 3;
  return Math.min(51, Math.max(1, n));
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Picks `count` distinct entries from `available` (already time-sorted),
// spread across it by splitting into `count` contiguous time-segments and
// taking one random pick per segment — see spec §9: not fully uniform, but
// a dailyCount of 3 naturally lands one early/mid/late instead of
// clustering. Segments never overlap, so results are automatically unique.
function pickSpread(available, count) {
  const n = available.length;
  if (count >= n) return shuffle(available);
  const picks = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i * n) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * n) / count));
    const segment = available.slice(start, end);
    picks.push(segment[Math.floor(Math.random() * segment.length)]);
  }
  return picks;
}

function verseKey(v) {
  return `${v.book}|${v.chapter}|${v.verse}`;
}

// ------------------------------------------------------- plan generation --

// Creates or adjusts users/{uid}'s notificationDailyPlans/{uid}_{date} doc
// so its `selected` list ends up matching `dailyCount` — without ever
// touching an entry already marked sent (spec §8/§11: already-sent verses
// are never un-sent, and a mid-day count change only adds/removes from the
// still-pending remainder).
async function ensurePlanForDay(uid, date, dailyCount, nowMinutesFloor) {
  const planRef = db.collection("notificationDailyPlans").doc(`${uid}_${date}`);
  const snap = await planRef.get();
  const existing = snap.exists ? snap.data() : null;
  const existingSelected = existing?.selected || [];

  const sent = existingSelected.filter((v) => v.sent);
  const pendingKept = existingSelected.filter((v) => !v.sent && timeToMinutes(v.time) > nowMinutesFloor);
  const usedKeys = new Set(existingSelected.map(verseKey));

  const targetPendingCount = Math.max(0, dailyCount - sent.length);
  let pending = pendingKept;

  if (pending.length > targetPendingCount) {
    // Count went down — drop the extra pending ones (never touch `sent`).
    pending = shuffle(pending).slice(0, targetPendingCount);
  } else if (pending.length < targetPendingCount) {
    // Count went up (or this is the first-ever generation for the day) —
    // top up from future, not-yet-used candidates only (spec §10).
    const stillAvailable = MOMENT_VERSES.filter(
      (v) => timeToMinutes(v.time) > nowMinutesFloor && !usedKeys.has(verseKey(v))
    ).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    const needed = targetPendingCount - pending.length;
    const additions = pickSpread(stillAvailable, Math.min(needed, stillAvailable.length)).map((v) => ({
      book: v.book,
      chapter: v.chapter,
      verse: v.verse,
      text: v.text,
      time: v.time,
      sent: false,
      sentAt: null,
    }));
    pending = [...pending, ...additions];
  }

  const selected = [...sent, ...pending].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  await planRef.set(
    {
      uid,
      date,
      targetCount: dailyCount,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing ? {} : { createdAt: FieldValue.serverTimestamp() }),
      selected,
    },
    { merge: true }
  );
}

// Rolls each notificationDailyPlans doc whose day is behind the retention
// window up into a compact notificationDailyStats/{date} summary, then
// deletes the originals. BulkWriter (not a single db.batch()) for the
// delete because the first run after this ships could face far more than
// the 500-write batch cap.
async function archiveAndDeleteStalePlans() {
  const cutoff = retentionCutoffDate();
  const staleSnap = await db.collection("notificationDailyPlans").where("date", "<", cutoff).get();
  if (staleSnap.empty) {
    logger.info(`archiveAndDeleteStalePlans: nothing older than ${cutoff}`);
    return;
  }

  // Group the doomed plan docs by their own `date` so each day collapses
  // into exactly one summary doc.
  const byDate = new Map();
  for (const doc of staleSnap.docs) {
    const d = doc.data();
    if (!d.date) continue;
    if (!byDate.has(d.date)) byDate.set(d.date, []);
    byDate.get(d.date).push(d);
  }

  for (const [date, plans] of byDate) {
    const summaryRef = db.collection("notificationDailyStats").doc(date);
    if ((await summaryRef.get()).exists) continue; // already rolled up (safe re-run)

    const users = [];
    for (const plan of plans) {
      const selected = plan.selected || [];
      let name = "";
      let nickname = "";
      try {
        const u = await db.collection("users").doc(plan.uid).get();
        if (u.exists) {
          name = u.data().name || "";
          nickname = u.data().nickname || "";
        }
      } catch (err) {
        logger.warn(`archiveAndDeleteStalePlans: could not read user ${plan.uid}`, err);
      }
      // Tally why the unsent ones didn't go out, e.g. { no_device: 2 }.
      const failReasons = {};
      for (const v of selected) {
        if (v.sent || !v.failReason) continue;
        failReasons[v.failReason] = (failReasons[v.failReason] || 0) + 1;
      }
      const row = {
        uid: plan.uid,
        name,
        nickname,
        target: plan.targetCount ?? null, // 신청한 수
        scheduled: selected.length, // 실제 계획에 잡힌 수 (밤늦게 켜면 target보다 적을 수 있음)
        sent: selected.filter((v) => v.sent).length, // 실제로 나간 수
      };
      if (Object.keys(failReasons).length) row.failReasons = failReasons;
      users.push(row);
    }
    // Biggest shortfall first, so a scan lands on the problem rows.
    users.sort((a, b) => b.scheduled - b.sent - (a.scheduled - a.sent));

    await summaryRef.set({
      date,
      generatedAt: FieldValue.serverTimestamp(),
      userCount: users.length,
      totalTarget: users.reduce((s, u) => s + (u.target || 0), 0),
      totalScheduled: users.reduce((s, u) => s + u.scheduled, 0),
      totalSent: users.reduce((s, u) => s + u.sent, 0),
      users,
    });
    logger.info(`archiveAndDeleteStalePlans: rolled up ${date} (${users.length} user(s))`);
  }

  const writer = db.bulkWriter();
  staleSnap.docs.forEach((doc) => writer.delete(doc.ref));
  await writer.close();
  logger.info(`archiveAndDeleteStalePlans: removed ${staleSnap.size} plan doc(s) older than ${cutoff}`);
}

// --------------------------------------------------------- scheduled jobs --

// 00:00 Asia/Seoul — the normal case. Only touches users who currently have
// the feature enabled; a disabled user simply gets no plan doc for today
// (cheaper than writing one nobody will use).
exports.generateDailyPlans = onSchedule(
  { schedule: "0 0 * * *", timeZone: SEOUL_TZ, region: "asia-northeast3" },
  async () => {
    const { date, hhmm } = seoulNow();
    const nowMinutesFloor = timeToMinutes(hhmm);
    const usersSnap = await db
      .collection("users")
      .where("notificationSettings.momentVerseEnabled", "==", true)
      .get();

    logger.info(`generateDailyPlans: ${usersSnap.size} enabled user(s) for ${date}`);
    await Promise.all(
      usersSnap.docs.map((doc) => {
        const dailyCount = clampDailyCount(doc.data()?.notificationSettings?.momentVerseDailyCount);
        return ensurePlanForDay(doc.id, date, dailyCount, nowMinutesFloor).catch((err) =>
          logger.error(`generateDailyPlans failed for ${doc.id}`, err)
        );
      })
    );

    // Own catch: archiving/sweeping stale plans must not fail today's
    // generation, and a generation error above must not skip the sweep.
    await archiveAndDeleteStalePlans().catch((err) =>
      logger.error("archiveAndDeleteStalePlans failed", err)
    );
  }
);

// Every minute — sends whatever in *today's* plans is scheduled for the
// current HH:MM and not yet sent. Re-checks momentVerseEnabled live (not
// just at plan-generation time) so a same-day OFF toggle takes effect
// immediately even if a plan already exists (spec §11).
exports.sendDueMomentVerses = onSchedule(
  { schedule: "* * * * *", timeZone: SEOUL_TZ, region: "asia-northeast3" },
  async () => {
    const { date, hhmm } = seoulNow();
    const plansSnap = await db.collection("notificationDailyPlans").where("date", "==", date).get();

    for (const planDoc of plansSnap.docs) {
      const plan = planDoc.data();
      const dueIndexes = plan.selected
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => v.time === hhmm && !v.sent);
      if (!dueIndexes.length) continue;

      try {
        await sendPlanEntries(plan.uid, planDoc.ref, plan.selected, dueIndexes.map((d) => d.i));
      } catch (err) {
        logger.error(`sendDueMomentVerses failed for ${plan.uid}`, err);
      }
    }
  }
);

// Stamps a diagnostic reason onto a due-but-unsent entry. `sent` stays
// false; a later successful send overwrites this and clears it. `reason` is
// a short stable code ("disabled", "no_device", or the FCM error code(s)).
function markEntryFailed(entry, reason) {
  return { ...entry, failReason: reason, failedAt: new Date().toISOString() };
}

async function sendPlanEntries(uid, planRef, selected, indexes) {
  const idxSet = new Set(indexes);
  const userSnap = await db.collection("users").doc(uid).get();
  const enabled = userSnap.exists ? userSnap.data()?.notificationSettings?.momentVerseEnabled !== false : false;
  if (!enabled) {
    // Spec §11: OFF means no new sends and no re-planning. Recording *why*
    // an entry didn't go out is just diagnostic metadata, not a plan
    // change, so this one annotation is allowed.
    logger.info(`skip send for ${uid}: momentVerseEnabled is false`);
    const stamped = selected.map((v, idx) => (idxSet.has(idx) ? markEntryFailed(v, "disabled") : v));
    await planRef.update({ selected: stamped, updatedAt: FieldValue.serverTimestamp() });
    return;
  }

  const devicesSnap = await db
    .collection("users")
    .doc(uid)
    .collection("notificationDevices")
    .where("enabled", "==", true)
    .get();
  // Filter docs (not just tokens) and keep the two arrays index-aligned —
  // sendEachForMulticast's response order mirrors `tokens` exactly, and
  // cleanupInvalidTokens needs that same index to map back to a doc ref.
  const deviceDocs = devicesSnap.docs.filter((d) => d.data().token);
  const tokens = deviceDocs.map((d) => d.data().token);

  const updated = [...selected];
  const now = FieldValue.serverTimestamp();

  if (!tokens.length) {
    // No enabled device to send to at all — leave sent:false. Marking it
    // sent here would be a lie: nothing went anywhere, and since this
    // function only ever matches a plan entry's *exact* HH:MM, a false
    // "sent" would permanently bury it with zero chance of ever being
    // retried, even once the user does register a device later.
    logger.info(`sendDueMomentVerses: ${uid} has no enabled device token, skipping ${indexes.length} entr${indexes.length === 1 ? "y" : "ies"}`);
    for (const i of indexes) updated[i] = markEntryFailed(selected[i], "no_device");
    await planRef.update({ selected: updated, updatedAt: now });
    return;
  }

  for (const i of indexes) {
    const entry = selected[i];
    const ref = `${entry.book} ${entry.chapter}:${entry.verse}`;
    // The chapter:verse numbers ARE the displayed "clock face" (that's the
    // whole point of this feature) — not entry.time, which is only the
    // real Asia/Seoul send time used for scheduling (chapter 11 doing
    // double duty for both an 11 AM slot and an 11 PM one is expected and
    // fine here; the display always just reads chapter/verse literally).
    const title = `✨${entry.chapter}시 ${entry.verse}분의 말씀✨`;
    const body = `${entry.text}\n${ref}`;

    const response = await messaging.sendEachForMulticast({
      tokens,
      data: {
        type: "moment_verse",
        title,
        body,
        book: entry.book,
        chapter: String(entry.chapter),
        verse: String(entry.verse),
      },
    });
    await cleanupInvalidTokens(deviceDocs, response);

    // Only record it as sent if it actually reached at least one device —
    // sendEachForMulticast can fail every single token (exactly what
    // happened earlier: the one registered token had already gone stale),
    // and marking it sent regardless would falsely bury it forever with no
    // way to ever retry, same reasoning as the no-token-at-all case above.
    if (response.successCount > 0) {
      // Clear any failReason/failedAt a previous attempt this minute left.
      updated[i] = { ...entry, sent: true, sentAt: new Date().toISOString(), failReason: null, failedAt: null };
    } else {
      // Every token errored — record the distinct FCM error code(s) so the
      // log says *why* ("registration-token-not-registered" = stale device,
      // etc.) rather than just "failed".
      const codes = [...new Set(response.responses.map((r) => r.error?.code).filter(Boolean))];
      updated[i] = markEntryFailed(entry, codes.length ? codes.join(", ") : "send_failed");
      logger.info(
        `sendDueMomentVerses: all ${tokens.length} token(s) failed for ${uid} on ${ref} (${updated[i].failReason}), leaving sent:false`
      );
    }
  }

  await planRef.update({ selected: updated, updatedAt: now });
}

// Marks devices whose token FCM reports as gone/invalid, so a stale token
// doesn't get retried forever (spec §15 — "정리할 수 있는 구조"). `deviceDocs`
// must be index-aligned with the `tokens` array the multicast was sent to.
async function cleanupInvalidTokens(deviceDocs, response) {
  const deadCodes = new Set([
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered",
  ]);
  await Promise.all(
    response.responses.map((r, i) => {
      if (r.success || !deadCodes.has(r.error?.code)) return null;
      return deviceDocs[i].ref.set({ enabled: false, invalidatedAt: FieldValue.serverTimestamp() }, { merge: true });
    })
  );
}

// ------------------------------------------------------- settings trigger --

// Fires on every write to users/{uid}. Only acts when notificationSettings
// actually changed, so normal progress-save writes (which touch this same
// document constantly) are a cheap no-op.
exports.onUserNotificationSettingsWritten = onDocumentWritten(
  { document: "users/{uid}", region: "asia-northeast3" },
  async (event) => {
    const before = event.data.before.exists ? event.data.before.data()?.notificationSettings : null;
    const after = event.data.after.exists ? event.data.after.data()?.notificationSettings : null;
    if (!after) return;
    if (
      before &&
      before.momentVerseEnabled === after.momentVerseEnabled &&
      before.momentVerseDailyCount === after.momentVerseDailyCount
    ) {
      return; // unrelated field changed (progress, nickname, ...) — skip.
    }
    if (after.momentVerseEnabled !== true) return; // OFF needs no plan changes; §11.

    const uid = event.params.uid;
    const { date, hhmm } = seoulNow();
    await ensurePlanForDay(uid, date, clampDailyCount(after.momentVerseDailyCount), timeToMinutes(hhmm));
  }
);

// -------------------------------------------------------- social login ----

// Firebase Auth has no built-in Naver provider. The client does a raw OAuth
// redirect to Naver and hands us just the resulting access token — this is
// the one thing that actually verifies it: we call Naver's own profile API
// with that token ourselves (never trusting anything the client claims
// about who they are), then mint a Firebase custom token for a UID derived
// from Naver's numeric user id. One Naver account always maps to the same
// `naver:{id}` Firebase UID, so signing in again just reuses that user.
exports.naverSignIn = onCall({ region: "asia-northeast3" }, async (request) => {
  const accessToken = request.data?.accessToken;
  if (!accessToken || typeof accessToken !== "string") {
    throw new HttpsError("invalid-argument", "accessToken is required");
  }

  let profile;
  try {
    const res = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    profile = await res.json();
  } catch (err) {
    logger.error("naverSignIn: profile fetch failed", err);
    throw new HttpsError("unavailable", "Could not reach Naver");
  }

  if (profile?.resultcode !== "00" || !profile.response?.id) {
    throw new HttpsError("unauthenticated", "Invalid Naver access token");
  }

  const { id: naverId, name, nickname, email } = profile.response;
  const uid = `naver:${naverId}`;
  const auth = getAuth();

  let isNewUser = false;
  try {
    await auth.getUser(uid);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    const newUser = {};
    if (email) newUser.email = email;
    if (name || nickname) newUser.displayName = name || nickname;
    await auth.createUser({ uid, ...newUser });
    isNewUser = true;
  }

  const customToken = await auth.createCustomToken(uid);
  return { customToken, isNewUser, name: name || nickname || "" };
});
