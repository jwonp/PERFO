import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type JsonStoreState = {
    notifications: NotificationRecord[];
    subscriptions: PushSubscriptionRecord[];
    deliveries: NotificationDeliveryRecord[];
    snapshots: TicketStatusSnapshotRecord[];
};

export type NotificationRecord = {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    targetUrl: string;
    sourceType: string;
    sourceId: string;
    dedupeKey: string;
    readAt: string | null;
    createdAt: string;
};

export type PushSubscriptionRecord = {
    id: string;
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
    enabled: boolean;
    lastFailedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type NotificationDeliveryRecord = {
    id: string;
    notificationId: string;
    channel: "WEB_PUSH";
    status: "SENT" | "FAILED" | "SKIPPED";
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: string;
};

export type TicketStatusSnapshotRecord = {
    id: string;
    userId: string;
    scope: "reserved" | "issued";
    ticketId: string;
    statusKey: string;
    statusValue: string;
    ticketName: string;
    targetUrl: string;
    createdAt: string;
    updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "notification-store.json");

const EMPTY_STATE: JsonStoreState = {
    notifications: [],
    subscriptions: [],
    deliveries: [],
    snapshots: [],
};

let writeQueue = Promise.resolve();

const cloneState = (state: JsonStoreState): JsonStoreState => {
    return JSON.parse(JSON.stringify(state)) as JsonStoreState;
};

const ensureStore = async () => {
    await mkdir(DATA_DIR, { recursive: true });
};

export const readStore = async (): Promise<JsonStoreState> => {
    await ensureStore();

    try {
        const raw = await readFile(STORE_PATH, "utf8");
        const parsed = JSON.parse(raw) as Partial<JsonStoreState>;

        return {
            notifications: parsed.notifications ?? [],
            subscriptions: parsed.subscriptions ?? [],
            deliveries: parsed.deliveries ?? [],
            snapshots: parsed.snapshots ?? [],
        };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            await writeFile(STORE_PATH, JSON.stringify(EMPTY_STATE, null, 2), "utf8");
            return cloneState(EMPTY_STATE);
        }

        throw error;
    }
};

export const writeStore = async (state: JsonStoreState) => {
    await ensureStore();
    await writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
};

export const updateStore = async <T>(
    updater: (state: JsonStoreState) => Promise<T> | T,
): Promise<T> => {
    let result: T;

    writeQueue = writeQueue.then(async () => {
        const state = await readStore();
        const workingState = cloneState(state);
        result = await updater(workingState);
        await writeStore(workingState);
    });

    await writeQueue;
    return result!;
};

export const resetStoreForTests = async () => {
    await writeStore(cloneState(EMPTY_STATE));
};
