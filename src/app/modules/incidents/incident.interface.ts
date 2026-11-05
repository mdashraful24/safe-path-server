import type {
	IncidentCategory,
	IncidentStatus,
} from "../../../../generated/prisma/enums";

export interface ICreateIncidentPayload {
	title: string;
	description: string;
	category: IncidentCategory;
	area: string;
	location?: string;
	latitude?: number;
	longitude?: number;
	incidentDate: Date;
}

export interface IReviewIncidentPayload {
	status: "APPROVED" | "REJECTED";
	note?: string;
}

export interface IIncidentListQuery {
	page?: number;
	limit?: number;
	area?: string;
	category?: IncidentCategory;
	status?: IncidentStatus;
	search?: string;
}
