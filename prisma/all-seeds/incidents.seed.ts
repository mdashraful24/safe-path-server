import type { Prisma } from "../../generated/prisma/client";
import config from "../../src/app/config";
import { prisma } from "../../src/app/lib/prisma";
import type { SeedIncident, SeedIncidentsResult } from "./seed.types";

const demoIncidents: SeedIncident[] = [
	{
		title: "Harassment near Central Bus Stand",
		description:
			"A group was repeatedly harassing commuters near the main entrance of the bus stand after sunset.",
		category: "HARASSMENT",
		status: "APPROVED",
		area: "Downtown",
		location: "Central Bus Stand, Platform 3",
		latitude: 23.8103,
		longitude: 90.4125,
		incidentDate: new Date("2026-10-28T18:30:00.000Z"),
		imageUrl: "https://picsum.photos/seed/safepath-harassment/800/500",
		reviewNote: "Confirmed by a moderator.",
	},
	{
		title: "Phone snatching on Market Road",
		description:
			"Two people on a motorcycle snatched a phone from a pedestrian and fled toward the main road.",
		category: "THEFT",
		status: "APPROVED",
		area: "Market Road",
		location: "Market Road, near the fruit market",
		latitude: 23.8069,
		longitude: 90.4092,
		incidentDate: new Date("2026-10-30T20:15:00.000Z"),
		reviewNote: "Reviewed and approved for public visibility.",
	},
	{
		title: "Suspicious activity near Riverside Park",
		description:
			"Someone was observed loitering near the park entrance and following visitors for several minutes.",
		category: "SUSPICIOUS_ACTIVITY",
		status: "PENDING",
		area: "Riverside",
		location: "Riverside Park, north gate",
		incidentDate: new Date("2026-11-01T21:00:00.000Z"),
	},
	{
		title: "Poorly lit underpass",
		description:
			"The underpass has several broken lights and is very dark at night, making it unsafe to walk through.",
		category: "UNSAFE_AREA",
		status: "APPROVED",
		area: "North End",
		location: "North End underpass",
		latitude: 23.8201,
		longitude: 90.421,
		incidentDate: new Date("2026-10-25T22:30:00.000Z"),
		reviewNote: "Location verified by a moderator.",
	},
	{
		title: "Broken streetlight at Elm Avenue",
		description:
			"The streetlight at the corner of Elm Avenue has been out for several days.",
		category: "OTHER",
		status: "PENDING",
		area: "Elm Avenue",
		location: "Elm Avenue, corner of 5th Street",
		incidentDate: new Date("2026-11-02T19:45:00.000Z"),
	},
	{
		title: "Duplicate report near the station",
		description:
			"This report was submitted twice for the same location and was rejected as a duplicate.",
		category: "OTHER",
		status: "REJECTED",
		area: "Downtown",
		location: "Central Station",
		incidentDate: new Date("2026-10-20T12:00:00.000Z"),
		reviewNote: "Duplicate of an existing report.",
	},
];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const seedIncidents = async (): Promise<SeedIncidentsResult> => {
	const reporter = await prisma.user.findUnique({
		where: { email: normalizeEmail(config.seed_user_email) },
		select: { id: true },
	});

	const admin = await prisma.user.findUnique({
		where: { email: normalizeEmail(config.seed_admin_email) },
		select: { id: true },
	});

	if (!reporter) {
		return { created: 0, existing: 0, skipped: demoIncidents.length };
	}

	let created = 0;
	let existing = 0;

	for (const incident of demoIncidents) {
		const current = await prisma.incident.findFirst({
			where: { title: incident.title, reporterId: reporter.id },
			select: { id: true },
		});

		if (current) {
			existing += 1;
			continue;
		}

		const reviewedById = incident.status === "PENDING" ? null : admin?.id ?? null;

		const data: Prisma.IncidentUncheckedCreateInput = {
			title: incident.title,
			description: incident.description,
			category: incident.category,
			status: incident.status,
			area: incident.area,
			location: incident.location ?? null,
			latitude: incident.latitude ?? null,
			longitude: incident.longitude ?? null,
			incidentDate: incident.incidentDate,
			imageUrl: incident.imageUrl ?? null,
			reporterId: reporter.id,
			reviewedById,
			reviewedAt: reviewedById ? new Date() : null,
			reviewNote: reviewedById ? (incident.reviewNote ?? null) : null,
		};

		const createdIncident = await prisma.incident.create({ data });

		await prisma.incidentHistory.create({
			data: {
				incidentId: createdIncident.id,
				changedById: reviewedById ?? reporter.id,
				previousStatus: null,
				newStatus: incident.status,
				note: reviewedById
					? (incident.reviewNote ?? "Reviewed by a moderator.")
					: "Submitted by the reporter.",
			},
		});

		created += 1;
	}

	return { created, existing, skipped: 0 };
};
