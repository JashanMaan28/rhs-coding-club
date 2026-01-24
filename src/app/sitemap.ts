import { MetadataRoute } from 'next'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore'

export const revalidate = 3600 // revalidate once per hour

const baseUrl = 'https://rhscoding.club'
const staticLastModified = new Date('2025-12-15')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: staticLastModified },
    { url: `${baseUrl}/about`, lastModified: staticLastModified },
    { url: `${baseUrl}/join`, lastModified: staticLastModified },
    { url: `${baseUrl}/challenges`, lastModified: staticLastModified },
    { url: `${baseUrl}/projects`, lastModified: staticLastModified },
    { url: `${baseUrl}/events`, lastModified: staticLastModified },
    { url: `${baseUrl}/blog`, lastModified: staticLastModified },
    { url: `${baseUrl}/resources`, lastModified: staticLastModified },
    { url: `${baseUrl}/leaderboard`, lastModified: staticLastModified },
    { url: `${baseUrl}/hall-of-fame`, lastModified: staticLastModified },
    { url: `${baseUrl}/members`, lastModified: staticLastModified },
    { url: `${baseUrl}/contact`, lastModified: staticLastModified },
    { url: `${baseUrl}/newsletter`, lastModified: staticLastModified },
    { url: `${baseUrl}/privacy`, lastModified: staticLastModified },
    { url: `${baseUrl}/terms`, lastModified: staticLastModified },
  ]

  let dynamicRoutes: MetadataRoute.Sitemap = []

  try {
    const { adminDb } = await import('@/lib/firebase-admin')

    const blogSnapshot = await adminDb.collection('posts').get()
    const blogRoutes = blogSnapshot.docs.map(
      (doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data()
        return {
          url: `${baseUrl}/blog/${doc.id}`,
          lastModified: data.updatedAt?.toDate() ?? data.createdAt?.toDate(),
        }
      }
    )

    const challengesSnapshot = await adminDb.collection('challenges').get()
    const challengeRoutes = challengesSnapshot.docs.map(
      (doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data()
        return {
          url: `${baseUrl}/challenges/${doc.id}`,
          lastModified: data.updatedAt?.toDate() ?? data.createdAt?.toDate(),
        }
      }
    )

    const eventsSnapshot = await adminDb.collection('events').get()
    const eventRoutes = eventsSnapshot.docs.map(
      (doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data()
        return {
          url: `${baseUrl}/events/${doc.id}`,
          lastModified: data.updatedAt?.toDate() ?? data.createdAt?.toDate(),
        }
      }
    )

    dynamicRoutes = [...blogRoutes, ...challengeRoutes, ...eventRoutes]
  } catch (error) {
    console.error('Sitemap generation failed:', error)
  }

  return [...staticRoutes, ...dynamicRoutes]
}
