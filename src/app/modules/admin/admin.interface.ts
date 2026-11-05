export interface IUpdateUserStatusPayload {
	status: "ACTIVE" | "BLOCKED";
}

export type IAdminChangeRequestPayload =
	| {
			targetUserId: string;
			type: "EMAIL";
			reason: string;
			requestedEmail: string;
	  }
	| {
			targetUserId: string;
			type: "PASSWORD";
			reason: string;
			newPassword: string;
	  };

export interface IRejectPayload {
	reason: string;
}
