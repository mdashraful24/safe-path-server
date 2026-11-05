export const adminUserSortFields = [
	"name",
	"email",
	"role",
	"status",
	"createdAt",
	"updatedAt",
	"lastLoginAt",
] as const;

export type AdminUserSortField = (typeof adminUserSortFields)[number];

export const deletionRequestSortFields = [
	"name",
	"email",
	"role",
	"deletionRequestedAt",
	"createdAt",
] as const;

export type DeletionRequestSortField =
	(typeof deletionRequestSortFields)[number];

export interface IAdminUserListQuery {
	page?: number;
	limit?: number;
	searchTerm?: string;
	role?: "USER" | "ADMIN" | "SUPER_ADMIN";
	status?: "ACTIVE" | "BLOCKED" | "PENDING_DELETION" | "DELETED" | "PURGED";
	sortBy?: AdminUserSortField;
	sortOrder?: "asc" | "desc";
}

export interface IDeletionRequestListQuery {
	page?: number;
	limit?: number;
	searchTerm?: string;
	role?: "USER" | "ADMIN" | "SUPER_ADMIN";
	sortBy?: DeletionRequestSortField;
	sortOrder?: "asc" | "desc";
}

export interface IUpdateUserStatusPayload {
	status: "ACTIVE" | "BLOCKED";
}

export type IAdminChangeRequestPayload =
	| {
			type: "EMAIL";
			reason: string;
			requestedEmail: string;
	  }
	| {
			type: "PASSWORD";
			reason: string;
			newPassword: string;
	  };

export interface IRejectPayload {
	reason: string;
}
