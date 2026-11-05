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

export interface IUpdateIncidentPayload {
	title?: string;
	description?: string;
	category?: IncidentCategory;
	area?: string;
	location?: string;
	latitude?: number;
	longitude?: number;
	incidentDate?: Date;
}

export interface IReviewIncidentPayload {
	status: "APPROVED" | "REJECTED";
	note?: string;
}

export const incidentSortFields = [
	"title",
	"category",
	"status",
	"area",
	"incidentDate",
	"createdAt",
	"updatedAt",
] as const;

export type IncidentSortField = (typeof incidentSortFields)[number];

export interface IIncidentListQuery {
	page?: number;
	limit?: number;
	area?: string;
	category?: IncidentCategory;
	status?: IncidentStatus;
	search?: string;
	searchTerm?: string;
	sortBy?: IncidentSortField;
	sortOrder?: "asc" | "desc";
}
