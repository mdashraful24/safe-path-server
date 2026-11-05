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
