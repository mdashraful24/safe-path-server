export interface IUpdateUserRolePayload {
	role: "USER" | "ADMIN" | "SUPER_ADMIN";
}

export interface IRejectPayload {
	reason: string;
}
