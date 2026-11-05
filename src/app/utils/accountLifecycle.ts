import { UserStatus } from "../../../generated/prisma/enums";
import config from "../config";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const positiveNumber = (value: string, fallback: number) => {
	const parsed = Number(value);

	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const addDays = (date: Date, days: number) =>
	new Date(date.getTime() + days * DAY_IN_MS);

export const getAccountLifecyclePolicy = () => {
	const graceDays = positiveNumber(config.account_restore_grace_days, 30);
	const retentionDays = Math.max(
		positiveNumber(config.account_deletion_retention_days, 90),
		graceDays,
	);

	return {
		graceDays,
		retentionDays,
		purgeBatchSize: Math.floor(
			positiveNumber(config.account_purge_batch_size, 100),
		),
	};
};

export const getAccountLifecycleDates = (from = new Date()) => {
	const { graceDays, retentionDays } = getAccountLifecyclePolicy();

	return {
		restoreDeadline: addDays(from, graceDays),
		purgeAfter: addDays(from, retentionDays),
	};
};

type LifecycleUser = {
	status: UserStatus;
	isDeleted?: boolean;
	deletedAt?: Date | null;
	restoreDeadline?: Date | null;
	purgeAfter?: Date | null;
};

export const isAccountPurged = (user: LifecycleUser) =>
	user.status === UserStatus.PURGED;

export const isAccountDeleted = (user: LifecycleUser) =>
	Boolean(user.isDeleted) ||
	user.status === UserStatus.DELETED ||
	user.status === UserStatus.PURGED;

export const isAccountUnavailable = (user: LifecycleUser) =>
	isAccountDeleted(user);

export const isAccountActive = (user: LifecycleUser) =>
	!isAccountUnavailable(user) && user.status === UserStatus.ACTIVE;

export const getRestoreDeadline = (user: LifecycleUser) => {
	if (user.restoreDeadline) {
		return user.restoreDeadline;
	}

	if (!user.deletedAt) {
		return null;
	}

	const { graceDays } = getAccountLifecyclePolicy();

	return addDays(user.deletedAt, graceDays);
};

export const getPurgeAfter = (user: LifecycleUser) => {
	if (user.purgeAfter) {
		return user.purgeAfter;
	}

	if (!user.deletedAt) {
		return null;
	}

	const { retentionDays } = getAccountLifecyclePolicy();

	return addDays(user.deletedAt, retentionDays);
};

export const canSelfRestore = (user: LifecycleUser, now = new Date()) => {
	if (user.status !== UserStatus.DELETED) {
		return false;
	}

	const restoreDeadline = getRestoreDeadline(user);

	return Boolean(restoreDeadline && restoreDeadline > now);
};

export const canAdminRestore = (user: LifecycleUser, now = new Date()) => {
	if (user.status !== UserStatus.DELETED) {
		return false;
	}

	const purgeAfter = getPurgeAfter(user);

	return !purgeAfter || purgeAfter > now;
};
