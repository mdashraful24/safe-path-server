import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import {
	AdminChangeRequestStatus,
	IncidentStatus,
	Role,
	UserStatus,
} from "../../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../../middlewares/auth";
import { AppError } from "../../utils/AppError";

const RECENT_LIMIT = 5;

const incidentCardSelect = {
	id: true,
	title: true,
	category: true,
	status: true,
	area: true,
	location: true,
	incidentDate: true,
	imageUrl: true,
	reviewedAt: true,
	createdAt: true,
} as const satisfies Prisma.IncidentSelect;

const adminIncidentCardSelect = {
	...incidentCardSelect,
	reporter: { select: { id: true, name: true } },
} as const satisfies Prisma.IncidentSelect;

const deletionRequestSelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	deletionRequestedAt: true,
	deletionRequestReason: true,
} as const satisfies Prisma.UserSelect;

const changeRequestSelect = {
	id: true,
	type: true,
	reason: true,
	requestedEmail: true,
	status: true,
	createdAt: true,
	requester: { select: { id: true, name: true, email: true } },
	targetUser: { select: { id: true, name: true, email: true, role: true } },
} as const satisfies Prisma.AdminChangeRequestSelect;

const getIncidentStats = async (where: Prisma.IncidentWhereInput = {}) => {
	const [total, pending, approved, rejected] = await Promise.all([
		prisma.incident.count({ where }),
		prisma.incident.count({
			where: { ...where, status: IncidentStatus.PENDING },
		}),
		prisma.incident.count({
			where: { ...where, status: IncidentStatus.APPROVED },
		}),
		prisma.incident.count({
			where: { ...where, status: IncidentStatus.REJECTED },
		}),
	]);

	return { total, pending, approved, rejected };
};

const getUserStats = async (where: Prisma.UserWhereInput = {}) => {
	const [total, active, blocked, pendingDeletion, deleted, purged] =
		await Promise.all([
			prisma.user.count({
				where: { ...where, status: { not: UserStatus.PURGED } },
			}),
			prisma.user.count({ where: { ...where, status: UserStatus.ACTIVE } }),
			prisma.user.count({ where: { ...where, status: UserStatus.BLOCKED } }),
			prisma.user.count({
				where: { ...where, status: UserStatus.PENDING_DELETION },
			}),
			prisma.user.count({ where: { ...where, status: UserStatus.DELETED } }),
			prisma.user.count({ where: { ...where, status: UserStatus.PURGED } }),
		]);

	return { total, active, blocked, pendingDeletion, deleted, purged };
};

const getChangeRequestStats = async () => {
	const [total, pending, approved, rejected] = await Promise.all([
		prisma.adminChangeRequest.count(),
		prisma.adminChangeRequest.count({
			where: { status: AdminChangeRequestStatus.PENDING },
		}),
		prisma.adminChangeRequest.count({
			where: { status: AdminChangeRequestStatus.APPROVED },
		}),
		prisma.adminChangeRequest.count({
			where: { status: AdminChangeRequestStatus.REJECTED },
		}),
	]);

	return { total, pending, approved, rejected };
};

const getUserOverview = async (userId: string) => {
	const [incidents, recentIncidents] = await Promise.all([
		getIncidentStats({ reporterId: userId }),
		prisma.incident.findMany({
			where: {
				reporterId: userId,
				status: IncidentStatus.APPROVED,
			},
			select: incidentCardSelect,
			orderBy: { createdAt: "desc" },
			take: RECENT_LIMIT,
		}),
	]);

	return {
		role: Role.USER,
		incidents,
		recentIncidents,
	};
};

const getAdminOverview = async () => {
	const userWhere = { role: Role.USER };

	const [users, incidents, recentPendingIncidents, recentDeletionRequests] =
		await Promise.all([
			getUserStats(userWhere),
			getIncidentStats(),
			prisma.incident.findMany({
				where: { status: IncidentStatus.PENDING },
				select: adminIncidentCardSelect,
				orderBy: { createdAt: "desc" },
				take: RECENT_LIMIT,
			}),
			prisma.user.findMany({
				where: {
					...userWhere,
					status: UserStatus.PENDING_DELETION,
				},
				select: deletionRequestSelect,
				orderBy: { deletionRequestedAt: "desc" },
				take: RECENT_LIMIT,
			}),
		]);

	return {
		role: Role.ADMIN,
		users,
		incidents,
		recentPendingIncidents,
		recentDeletionRequests,
	};
};

const getSuperAdminOverview = async () => {
	const [
		users,
		totalUsers,
		totalAdmins,
		totalSuperAdmins,
		incidents,
		changeRequests,
		recentPendingIncidents,
		recentDeletionRequests,
		recentChangeRequests,
	] = await Promise.all([
		getUserStats(),
		prisma.user.count({
			where: { role: Role.USER, status: { not: UserStatus.PURGED } },
		}),
		prisma.user.count({
			where: { role: Role.ADMIN, status: { not: UserStatus.PURGED } },
		}),
		prisma.user.count({
			where: { role: Role.SUPER_ADMIN, status: { not: UserStatus.PURGED } },
		}),
		getIncidentStats(),
		getChangeRequestStats(),
		prisma.incident.findMany({
			where: { status: IncidentStatus.PENDING },
			select: adminIncidentCardSelect,
			orderBy: { createdAt: "desc" },
			take: RECENT_LIMIT,
		}),
		prisma.user.findMany({
			where: { status: UserStatus.PENDING_DELETION },
			select: deletionRequestSelect,
			orderBy: { deletionRequestedAt: "desc" },
			take: RECENT_LIMIT,
		}),
		prisma.adminChangeRequest.findMany({
			where: { status: AdminChangeRequestStatus.PENDING },
			select: changeRequestSelect,
			orderBy: { createdAt: "desc" },
			take: RECENT_LIMIT,
		}),
	]);

	return {
		role: Role.SUPER_ADMIN,
		users: {
			...users,
			byRole: {
				users: totalUsers,
				admins: totalAdmins,
				superAdmins: totalSuperAdmins,
			},
		},
		incidents,
		changeRequests,
		recentPendingIncidents,
		recentDeletionRequests,
		recentChangeRequests,
	};
};

const getOverview = async (user: AuthUser) => {
	switch (user.role) {
		case Role.USER:
			return getUserOverview(user.id);
		case Role.ADMIN:
			return getAdminOverview();
		case Role.SUPER_ADMIN:
			return getSuperAdminOverview();
		default:
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You do not have access to a dashboard overview.",
			);
	}
};

export const DashboardService = {
	getOverview,
};
