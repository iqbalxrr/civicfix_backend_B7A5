import { prisma } from "../../config/prisma";
import { cacheGet, cacheSet } from "../../config/redis";

const CACHE_KEY = "stats:public";

export const getPublicStats = async () => {
  const cached = await cacheGet<Record<string, unknown>>(CACHE_KEY);
  if (cached) return cached;

  const [totalComplaints, resolved, departments, categories, avgRating] = await Promise.all([
    prisma.complaint.count({ where: { deletedAt: null } }),
    prisma.complaint.count({
      where: { deletedAt: null, status: { in: ["RESOLVED", "CLOSED"] } },
    }),
    prisma.department.count({ where: { deletedAt: null, isActive: true } }),
    prisma.category.count({ where: { deletedAt: null, isActive: true } }),
    prisma.feedback.aggregate({ _avg: { rating: true } }),
  ]);

  const stats = {
    totalComplaints,
    resolvedComplaints: resolved,
    resolutionRate:
      totalComplaints > 0 ? Number(((resolved / totalComplaints) * 100).toFixed(2)) : 0,
    activeDepartments: departments,
    activeCategories: categories,
    averageCitizenRating: avgRating._avg.rating,
  };

  await cacheSet(CACHE_KEY, stats, 60);
  return stats;
};
