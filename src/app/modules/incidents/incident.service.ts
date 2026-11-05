import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import {
	type IncidentCategory,
	IncidentStatus,
} from "../../../../generated/prisma/enums";
import { cloudinary, deleteCloudinaryImage } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getPagination } from "../../utils/pagination";
import type {
	ICreateIncidentPayload,
	IIncidentListQuery,
	IReviewIncidentPayload,
} from "./incident.interface";

const publicIncidentSelect = {
	id: true,
	title: true,
	description: true,
	category: true,
	status: true,
	area: true,
	location: true,
	latitude: true,
	longitude: true,
	incidentDate: true,
	imageUrl: true,
	reviewedAt: true,
	createdAt: true,
	updatedAt: true,
} as const satisfies Prisma.IncidentSelect;

const ownIncidentSelect = {
	...publicIncidentSelect,
	reviewNote: true,
	reviewedById: true,
} as const satisfies Prisma.IncidentSelect;

const adminIncidentSelect = {
	...ownIncidentSelect,
	reporter: { select: { id: true, name: true, email: true } },
	reviewedBy: { select: { id: true, name: true, email: true } },
} as const satisfies Prisma.IncidentSelect;

const adminIncidentDetailSelect = {
	...adminIncidentSelect,
	history: {
		orderBy: { createdAt: "asc" },
		select: {
			id: true,
			previousStatus: true,
			newStatus: true,
			note: true,
			createdAt: true,
			changedBy: { select: { id: true, name: true, email: true } },
		},
	},
} as const satisfies Prisma.IncidentSelect;

const uploadIncidentImage = (file: Express.Multer.File) =>
	new Promise<{ imageUrl: string; imagePublicId: string }>(
		(resolve, reject) => {
			const stream = cloudinary.uploader.upload_stream(
				{ folder: "safepath/incidents", resource_type: "image" },
				(error, result) => {
					if (error || !result) {
						reject(
							new AppError(
								httpStatus.INTERNAL_SERVER_ERROR,
								"Failed to upload incident image.",
							),
						);
						return;
					}

					resolve({
						imageUrl: result.secure_url,
						imagePublicId: result.public_id,
					});
				},
			);

			stream.end(file.buffer);
		},
	);

const buildIncidentWhere = (
	query: IIncidentListQuery,
	forcedStatus?: IncidentStatus,
): Prisma.IncidentWhereInput => {
	const where: Prisma.IncidentWhereInput = {
		status: forcedStatus ?? query.status,
	};

	if (query.category) {
		where.category = query.category as IncidentCategory;
	}

	if (query.area) {
		where.area = { contains: query.area, mode: "insensitive" };
	}

	if (query.search) {
		where.OR = [
			{ title: { contains: query.search, mode: "insensitive" } },
			{ description: { contains: query.search, mode: "insensitive" } },
			{ area: { contains: query.search, mode: "insensitive" } },
			{ location: { contains: query.search, mode: "insensitive" } },
		];
	}

	return where;
};

const listPublicIncidents = async (query: IIncidentListQuery) => {
	const { page, limit, skip } = getPagination(query.page, query.limit);
	const where = buildIncidentWhere(query, IncidentStatus.APPROVED);

	const [incidents, totalIncidents] = await Promise.all([
		prisma.incident.findMany({
			where,
			select: publicIncidentSelect,
			orderBy: { incidentDate: "desc" },
			skip,
			take: limit,
		}),
		prisma.incident.count({ where }),
	]);

	return {
		data: incidents,
		meta: {
			page,
			limit,
			total: totalIncidents,
			totalPages: Math.ceil(totalIncidents / limit),
		},
	};
};

const getPublicIncident = async (incidentId: string) => {
	const incident = await prisma.incident.findFirst({
		where: { id: incidentId, status: IncidentStatus.APPROVED },
		select: publicIncidentSelect,
	});

	if (!incident) {
		throw new AppError(httpStatus.NOT_FOUND, "Incident not found.");
	}

	return incident;
};

const listMyIncidents = async (
	reporterId: string,
	query: IIncidentListQuery,
) => {
	const { page, limit, skip } = getPagination(query.page, query.limit);
	const where = { ...buildIncidentWhere(query), reporterId };

	const [incidents, totalIncidents] = await Promise.all([
		prisma.incident.findMany({
			where,
			select: ownIncidentSelect,
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
		}),
		prisma.incident.count({ where }),
	]);

	return {
		data: incidents,
		meta: {
			page,
			limit,
			total: totalIncidents,
			totalPages: Math.ceil(totalIncidents / limit),
		},
	};
};

const getMyIncident = async (reporterId: string, incidentId: string) => {
	const incident = await prisma.incident.findFirst({
		where: { id: incidentId, reporterId },
		select: ownIncidentSelect,
	});

	if (!incident) {
		throw new AppError(httpStatus.NOT_FOUND, "Incident not found.");
	}

	return incident;
};

const createIncident = async (
	reporterId: string,
	payload: ICreateIncidentPayload,
	file?: Express.Multer.File,
) => {
	const uploadedImage = file ? await uploadIncidentImage(file) : null;

	try {
		return await prisma.$transaction(async (tx) => {
			const incident = await tx.incident.create({
				data: {
					...payload,
					status: IncidentStatus.PENDING,
					location: payload.location ?? null,
					latitude: payload.latitude ?? null,
					longitude: payload.longitude ?? null,
					imageUrl: uploadedImage?.imageUrl ?? null,
					imagePublicId: uploadedImage?.imagePublicId ?? null,
					reporterId,
				},
				select: ownIncidentSelect,
			});

			await tx.incidentHistory.create({
				data: {
					incidentId: incident.id,
					changedById: reporterId,
					previousStatus: null,
					newStatus: IncidentStatus.PENDING,
					note: "Incident submitted for review.",
				},
			});

			return incident;
		});
	} catch (error) {
		if (uploadedImage) {
			await deleteCloudinaryImage(uploadedImage.imagePublicId);
		}

		throw error;
	}
};

const listIncidentsForAdmin = async (query: IIncidentListQuery) => {
	const { page, limit, skip } = getPagination(query.page, query.limit);
	const where = buildIncidentWhere(query);

	const [incidents, totalIncidents] = await Promise.all([
		prisma.incident.findMany({
			where,
			select: adminIncidentSelect,
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
		}),
		prisma.incident.count({ where }),
	]);

	return {
		data: incidents,
		meta: {
			page,
			limit,
			total: totalIncidents,
			totalPages: Math.ceil(totalIncidents / limit),
		},
	};
};

const getIncidentForAdmin = async (incidentId: string) => {
	const incident = await prisma.incident.findUnique({
		where: { id: incidentId },
		select: adminIncidentDetailSelect,
	});

	if (!incident) {
		throw new AppError(httpStatus.NOT_FOUND, "Incident not found.");
	}

	return incident;
};

const reviewIncident = async (
	reviewerId: string,
	incidentId: string,
	payload: IReviewIncidentPayload,
) => {
	const incident = await prisma.incident.findUnique({
		where: { id: incidentId },
		select: { id: true, status: true },
	});

	if (!incident) {
		throw new AppError(httpStatus.NOT_FOUND, "Incident not found.");
	}

	if (incident.status !== IncidentStatus.PENDING) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Only pending incidents can be reviewed.",
		);
	}

	const note = payload.note?.trim() || null;

	return prisma.$transaction(async (tx) => {
		const updated = await tx.incident.update({
			where: { id: incidentId },
			data: {
				status: payload.status,
				reviewNote: note,
				reviewedById: reviewerId,
				reviewedAt: new Date(),
			},
			select: adminIncidentSelect,
		});

		await tx.incidentHistory.create({
			data: {
				incidentId,
				changedById: reviewerId,
				previousStatus: incident.status,
				newStatus: payload.status,
				note,
			},
		});

		return updated;
	});
};

export const IncidentService = {
	listPublicIncidents,
	getPublicIncident,
	listMyIncidents,
	getMyIncident,
	createIncident,
	listIncidentsForAdmin,
	getIncidentForAdmin,
	reviewIncident,
};
