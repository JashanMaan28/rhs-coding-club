'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  getCountFromServer,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Post } from '@/lib/firebase-collections';

export interface HomepageStats {
  memberCount: number;
  eventCount: number;
  projectCount: number;
}

export interface FeaturedProject {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  github?: string;
  demo?: string;
  contributors: number;
  authorName: string;
}

export interface FeaturedPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  readTime: string;
  category: string;
  slug: string;
}

export function useHomepageData() {
  const [stats, setStats] = useState<HomepageStats>({
    memberCount: 0,
    eventCount: 0,
    projectCount: 0,
  });
  const [featuredProjects, setFeaturedProjects] = useState<FeaturedProject[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<FeaturedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHomepageData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch stats concurrently
        const [membersSnapshot, eventsSnapshot, projectsSnapshot] = await Promise.all([
          // Count all users with role 'member' or higher
          getCountFromServer(
            query(
              collection(db, 'users'),
              where('role', 'in', ['member', 'officer', 'admin'])
            )
          ),
          // Count upcoming and recent events (this semester)
          getCountFromServer(
            query(
              collection(db, 'events'),
              where('date', '>=', getStartOfSemester())
            )
          ),
          // Count approved projects
          getCountFromServer(
            query(
              collection(db, 'projects'),
              where('approved', '==', true)
            )
          ),
        ]);

        setStats({
          memberCount: membersSnapshot.data().count,
          eventCount: eventsSnapshot.data().count,
          projectCount: projectsSnapshot.data().count,
        });

        // Fetch featured projects
        await fetchFeaturedProjects();

        // Fetch featured posts
        await fetchFeaturedPosts();

      } catch (err) {
        console.error('Error fetching homepage data:', err);
        setError('Failed to load homepage data');
      } finally {
        setLoading(false);
      }
    };

    fetchHomepageData();
  }, []);

  const fetchFeaturedProjects = async () => {
    try {
      let projectsSnapshot = await getDocs(
        query(
          collection(db, 'projects'),
          where('approved', '==', true),
          where('featured', '==', true),
          orderBy('createdAt', 'desc'),
          limit(6)
        )
      );

      // If no featured projects, fall back to any approved projects
      if (projectsSnapshot.empty) {
        projectsSnapshot = await getDocs(
          query(
            collection(db, 'projects'),
            where('approved', '==', true),
            orderBy('createdAt', 'desc'),
            limit(6)
          )
        );
      }

      const projectDocs = projectsSnapshot.docs.map(d => ({
        id: d.id,
        data: d.data() as Project,
      }));

      // Batch-fetch unique authors with getDoc instead of N+1 queries
      const uniqueAuthorIds = [...new Set(projectDocs.map(p => p.data.authorId))];
      const authorDocs = await Promise.all(
        uniqueAuthorIds.map(id => getDoc(doc(collection(db, 'users'), id)))
      );
      const authorMap = new Map<string, string>();
      for (const authorDoc of authorDocs) {
        if (authorDoc.exists()) {
          authorMap.set(authorDoc.id, authorDoc.data()?.displayName || 'Anonymous');
        }
      }

      const projects: FeaturedProject[] = projectDocs.map(p => ({
        id: p.id,
        title: p.data.title,
        description: p.data.description,
        technologies: p.data.tech || [],
        github: p.data.repoUrl,
        demo: p.data.demoUrl,
        contributors: 1,
        authorName: authorMap.get(p.data.authorId) || 'Anonymous',
      }));

      setFeaturedProjects(projects);
    } catch (err) {
      console.error('Error fetching featured projects:', err);
    }
  };

  const fetchFeaturedPosts = async () => {
    try {
      const postsQuery = query(
        collection(db, 'posts'),
        where('published', '==', true),
        orderBy('createdAt', 'desc'),
        limit(3)
      );

      const postsSnapshot = await getDocs(postsQuery);
      const posts: FeaturedPost[] = [];

      for (const doc of postsSnapshot.docs) {
        const postData = doc.data() as Post;
        
        // Calculate read time (rough estimate: 200 words per minute)
        const wordCount = postData.content.split(' ').length;
        const readTimeMinutes = Math.ceil(wordCount / 200);

        // Extract category from tags or use default
        const category = postData.tags && postData.tags.length > 0 
          ? postData.tags[0] 
          : 'General';

        posts.push({
          id: doc.id,
          title: postData.title,
          excerpt: postData.summary,
          author: postData.author,
          readTime: `${readTimeMinutes} min read`,
          category,
          slug: postData.slug || doc.id,
        });
      }

      setFeaturedPosts(posts);
    } catch (err) {
      console.error('Error fetching featured posts:', err);
    }
  };

  return {
    stats,
    featuredProjects,
    featuredPosts,
    loading,
    error,
  };
}

// Helper function to get the start of the current semester
function getStartOfSemester(): Timestamp {
  const now = new Date();
  const year = now.getFullYear();
  
  // Assume fall semester starts September 1, spring semester starts January 1
  let semesterStart: Date;
  
  if (now.getMonth() >= 8) { // September or later = Fall semester
    semesterStart = new Date(year, 8, 1); // September 1
  } else if (now.getMonth() >= 0) { // January to August = Spring semester
    semesterStart = new Date(year, 0, 1); // January 1
  } else {
    semesterStart = new Date(year - 1, 8, 1); // Previous fall
  }
  
  return Timestamp.fromDate(semesterStart);
}
