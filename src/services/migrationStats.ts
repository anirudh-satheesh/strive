import type { DocumentSnapshot } from 'firebase/firestore';
import type { Workout } from '../types';
import { needsProcessing } from './migrationService';

export interface MigrationStats {
    /** Total number of workout documents. */
    total: number;
    /** Documents that are fully clean v2 — no work needed. */
    clean: number;
    /** Documents still requiring migration or cleanup. */
    pending: number;
    /** Migration + cleanup completion percentage (e.g. "85.3"). */
    percent: string;
    /** `true` when every document is clean v2. */
    complete: boolean;
}

/**
 * Computes migration + cleanup progress from a set of Firestore document snapshots.
 *
 * A document is considered "clean" only if:
 *  - It has `version === 2`
 *  - It has no legacy fields remaining
 *  - All numeric values are actual numbers (not strings)
 *
 * Usage:
 * ```ts
 * const stats = getMigrationStats(snapshot.docs);
 * console.log(`Migration: ${stats.clean}/${stats.total} (${stats.percent}%)`);
 * ```
 */
export function getMigrationStats(docs: DocumentSnapshot[]): MigrationStats {
    const total = docs.length;
    let pending = 0;

    for (const docSnap of docs) {
        const data = docSnap.data() as Workout | undefined;
        if (!data || needsProcessing(data)) {
            pending++;
        }
    }

    const clean = total - pending;
    const percent = total === 0
        ? '100.0'
        : ((clean / total) * 100).toFixed(1);

    return {
        total,
        clean,
        pending,
        percent,
        complete: pending === 0,
    };
}

/**
 * Logs a human-readable migration + cleanup progress line to the console.
 */
export function logMigrationProgress(stats: MigrationStats): void {
    const icon = stats.complete ? '✅' : '🔄';
    console.log(
        `${icon} [Migration] ${stats.clean}/${stats.total} clean (${stats.percent}%) — ${stats.pending} pending`
    );
}
