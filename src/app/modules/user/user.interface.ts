export interface IUpdateProfilePayload {
	name?: string;
	email?: string;
	currentPassword?: string;
	newPassword?: string;
}

export interface IRequestAccountDeletionPayload {
	reason?: string;
}
