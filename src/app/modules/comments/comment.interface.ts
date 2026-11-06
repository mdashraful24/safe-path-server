export interface ICreateCommentPayload {
	content: string;
}

export interface IUpdateCommentPayload {
	content: string;
}

export interface ICommentListQuery {
	page?: number;
	limit?: number;
	sortOrder?: "asc" | "desc";
}
