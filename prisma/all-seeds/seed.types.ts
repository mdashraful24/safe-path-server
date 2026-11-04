import type {
	IncidentCategory,
	IncidentStatus,
	Role,
} from "../../generated/prisma/enums";

export type SeedAccount = {
	label: string;
	name: string;
	email: string;
	password: string;
	role: Role;
	imageUrl: string | null;
};

export type SeedAccountResult = "created" | "existing";

export type SeedResult = {
	created: SeedAccount[];
	existing: SeedAccount[];
};

export type SeedIncident = {
	title: string;
	description: string;
	category: IncidentCategory;
	status: IncidentStatus;
	area: string;
	location?: string;
	latitude?: number;
	longitude?: number;
	incidentDate: Date;
	imageUrl?: string;
	reviewNote?: string;
};

export type SeedIncidentsResult = {
	created: number;
	existing: number;
	skipped: number;
};
