export const adminListSortFields = [
	"name",
	"email",
	"role",
	"status",
	"createdAt",
	"updatedAt",
	"lastLoginAt",
] as const;

export type AdminListSortField = (typeof adminListSortFields)[number];

export const changeRequestSortFields = [
	"type",
	"status",
	"createdAt",
	"updatedAt",
	"reviewedAt",
] as const;

export type ChangeRequestSortField = (typeof changeRequestSortFields)[number];

export interface IAdminListQuery {
	page?: number;
	limit?: number;
	searchTerm?: string;
	role?: "ADMIN" | "SUPER_ADMIN";
	status?: "ACTIVE" | "BLOCKED" | "PENDING_DELETION";
	sortBy?: AdminListSortField;
	sortOrder?: "asc" | "desc";
}

export interface IChangeRequestListQuery {
	page?: number;
	limit?: number;
	searchTerm?: string;
	type?: "EMAIL" | "PASSWORD";
	status?: "PENDING" | "APPROVED" | "REJECTED";
	sortBy?: ChangeRequestSortField;
	sortOrder?: "asc" | "desc";
}

export interface IUpdateUserRolePayload {
	role: "USER" | "ADMIN" | "SUPER_ADMIN";
}

export interface IRejectPayload {
	reason: string;
}
