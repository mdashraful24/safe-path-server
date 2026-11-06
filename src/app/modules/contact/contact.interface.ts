export type ContactTopic =
	| "GENERAL"
	| "REPORT_ISSUE"
	| "ACCOUNT"
	| "SAFETY"
	| "PARTNERSHIP"
	| "OTHER";

export type ContactMessageStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";

export interface ICreateContactPayload {
	name: string;
	email: string;
	topic: ContactTopic;
	subject: string;
	message: string;
}

export interface IContactListQuery {
	page?: number;
	limit?: number;
	searchTerm?: string;
	status?: ContactMessageStatus;
	topic?: ContactTopic;
	sortOrder?: "asc" | "desc";
}

export interface IReplyContactPayload {
	message: string;
}
