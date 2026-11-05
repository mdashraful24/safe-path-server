export interface IUpdateUserStatusPayload {
	status: "ACTIVE" | "BLOCKED";
}

export interface IUpdateUserRolePayload {
	role: "USER" | "ADMIN" | "SUPER_ADMIN";
}

export interface IRejectPayload {
	reason: string;
}

export interface IUpdateEmailPayload {
	email: string;
}

export interface IUpdatePasswordPayload {
	newPassword: string;
}
